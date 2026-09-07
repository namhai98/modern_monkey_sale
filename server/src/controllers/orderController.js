import { query, pool } from '../config/db.js';
import { ORDER_STATUSES, TRANSITIONS, RESTOCKING, canTransition } from '../utils/orderStatus.js';
import {
  serializeOrderRow,
  serializeOrderItem,
  serializeStatusHistory,
} from '../utils/serializeOrder.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STAFF_ROLES = ['staff', 'manager', 'admin'];

function isStaff(req) {
  return STAFF_ROLES.includes(req.user?.role);
}

async function recordStatusChange(client, orderId, from, to, note, userId) {
  await client.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, note, user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, from, to, note || null, userId]
  );
}

async function restockOrder(client, orderId, userId, reason) {
  const { rows } = await client.query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
    [orderId]
  );
  for (const it of rows) {
    await client.query(
      'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
      [it.quantity, it.product_id]
    );
    await client.query(
      `INSERT INTO stock_movements (product_id, delta, type, reason, order_id, user_id)
       VALUES ($1, $2, 'return', $3, $4, $5)`,
      [it.product_id, it.quantity, reason, orderId, userId]
    );
  }
}

// Shared fetch of a full order (row + items + history) for detail responses.
async function loadOrderDetail(orderId, req, res) {
  const { rows } = await query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });

  const order = rows[0];
  if (!isStaff(req) && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your order', code: 'FORBIDDEN' });
  }

  const items = await query(
    `SELECT i.*, p.name AS product_name, p.sku AS product_sku
     FROM order_items i LEFT JOIN products p ON p.id = i.product_id
     WHERE i.order_id = $1 ORDER BY i.id`,
    [orderId]
  );
  const history = await query(
    `SELECT h.*, u.name AS user_name
     FROM order_status_history h LEFT JOIN users u ON u.id = h.user_id
     WHERE h.order_id = $1 ORDER BY h.created_at, h.id`,
    [orderId]
  );

  res.json({
    ...serializeOrderRow(order),
    items: items.rows.map(serializeOrderItem),
    status_history: history.rows.map(serializeStatusHistory),
    allowed_transitions: isStaff(req) ? TRANSITIONS[order.status] || [] : [],
  });
}

export async function createOrder(req, res) {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { items, shipping_address } = req.body; // items: [{ product_id, quantity }]

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    await client.query('BEGIN');

    let total = 0;
    const priced = [];
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw Object.assign(new Error('Each item needs a positive integer quantity'), { status: 400 });
      }
      const { rows } = await client.query(
        'SELECT price, is_active FROM products WHERE id = $1',
        [item.product_id]
      );
      if (rows.length === 0) {
        throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 400 });
      }
      if (!rows[0].is_active) {
        throw Object.assign(new Error(`Product ${item.product_id} is not available`), { status: 400 });
      }
      const price = parseFloat(rows[0].price);
      total += price * item.quantity;
      priced.push({ ...item, price });
    }

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, status, total, shipping_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, 'pending', total, shipping_address]
    );
    const order = orderResult.rows[0];

    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, user_id)
       VALUES ($1, NULL, 'pending', $2)`,
      [order.id, userId]
    );

    for (const item of priced) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      // Atomic guarded decrement — two concurrent orders can't oversell
      const upd = await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2 AND stock >= $1 RETURNING stock',
        [item.quantity, item.product_id]
      );
      if (upd.rowCount === 0) {
        throw Object.assign(new Error(`Insufficient stock for product ${item.product_id}`), {
          status: 409,
          code: 'INSUFFICIENT_STOCK',
        });
      }
      await client.query(
        `INSERT INTO stock_movements (product_id, delta, type, order_id, user_id)
         VALUES ($1, $2, 'sale', $3, $4)`,
        [item.product_id, -item.quantity, order.id, userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
}

export async function listMyOrders(req, res) {
  try {
    const { rows } = await query(
      `SELECT o.*,
              (SELECT COUNT(*)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(serializeOrderRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

export async function listAllOrders(req, res) {
  try {
    const where = [];
    const params = [];

    if (req.query.status) {
      if (!ORDER_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'Unknown status', code: 'VALIDATION_ERROR' });
      }
      params.push(req.query.status);
      where.push(`o.status = $${params.length}`);
    }
    if (req.query.user_id) {
      params.push(Number(req.query.user_id));
      where.push(`o.user_id = $${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`o.created_at >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`o.created_at < ($${params.length}::date + 1)`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM orders o LEFT JOIN users u ON u.id = o.user_id ${whereSql}`,
      params
    );
    const rowsRes = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      items: rowsRes.rows.map(serializeOrderRow),
      total: countRes.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

export async function getOrder(req, res) {
  try {
    await loadOrderDetail(req.params.id, req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

export async function updateOrderStatus(req, res) {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const to = body.status;
    const note = body.note;
    const restock = body.restock !== false; // default true

    if (!ORDER_STATUSES.includes(to)) {
      return res.status(400).json({ error: 'Unknown status', code: 'VALIDATION_ERROR' });
    }
    if (to === 'refunded' && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only a manager can refund an order', code: 'FORBIDDEN' });
    }

    await client.query('BEGIN');
    const cur = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const from = cur.rows[0].status;
    if (!canTransition(from, to)) {
      await client.query('ROLLBACK');
      return res
        .status(409)
        .json({ error: `Cannot move an order from ${from} to ${to}`, code: 'INVALID_TRANSITION' });
    }

    if (RESTOCKING.has(to) && restock) {
      await restockOrder(client, cur.rows[0].id, req.user.id, note || `Order #${cur.rows[0].id} ${to}`);
    }
    await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [
      to,
      req.params.id,
    ]);
    await recordStatusChange(client, cur.rows[0].id, from, to, note, req.user.id);
    await client.query('COMMIT');

    await loadOrderDetail(req.params.id, req, res);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    client.release();
  }
}

export async function cancelMyOrder(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = cur.rows[0];
    if (order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your order', code: 'FORBIDDEN' });
    }
    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return res
        .status(409)
        .json({ error: 'Only a pending order can be cancelled', code: 'INVALID_TRANSITION' });
    }

    await restockOrder(client, order.id, req.user.id, `Order #${order.id} cancelled by customer`);
    await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [
      'cancelled',
      order.id,
    ]);
    await recordStatusChange(
      client,
      order.id,
      'pending',
      'cancelled',
      req.body?.note || 'Cancelled by customer',
      req.user.id
    );
    await client.query('COMMIT');

    await loadOrderDetail(req.params.id, req, res);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
}
