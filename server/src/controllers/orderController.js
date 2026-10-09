import { query, pool } from '../config/db.js';
import { ORDER_STATUSES, TRANSITIONS, RESTOCKING, canTransition } from '../utils/orderStatus.js';
import { computeDiscountedPrice, pickBestActiveDiscount } from '../utils/discount.js';
import { sendNewOrderNotice, sendOrderConfirmation } from '../utils/orderEmail.js';
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
    'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1',
    [orderId]
  );
  for (const it of rows) {
    if (it.variant_id) {
      await client.query(
        'UPDATE product_variants SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [it.quantity, it.variant_id]
      );
    } else {
      await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [it.quantity, it.product_id]
      );
    }
    await client.query(
      `INSERT INTO stock_movements (product_id, variant_id, delta, type, reason, order_id, user_id)
       VALUES ($1, $2, $3, 'return', $4, $5, $6)`,
      [it.product_id, it.variant_id, it.quantity, reason, orderId, userId]
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
    `SELECT i.*, COALESCE(i.product_name, p.name) AS product_name, p.sku AS product_sku,
            p.image_url AS product_image
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

  // Customers see when their order moved, not who moved it or the staff note.
  const staff = isStaff(req);
  const statusHistory = history.rows.map(serializeStatusHistory).map((h) =>
    staff ? h : { id: h.id, from_status: h.from_status, to_status: h.to_status, created_at: h.created_at }
  );

  res.json({
    ...serializeOrderRow(order),
    items: items.rows.map(serializeOrderItem),
    status_history: statusHistory,
    allowed_transitions: staff ? TRANSITIONS[order.status] || [] : [],
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

    // The client only sends { product_id, quantity }. The backend is the sole
    // authority on price: it re-reads each product and re-applies the current
    // best active discount. Prices from the client are never trusted.
    const productIds = items.map((i) => i.product_id);
    const discRows = await client.query(
      `SELECT dp.product_id, d.id, d.name, d.type, d.value, d.is_active,
              to_char(d.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(d.end_date, 'YYYY-MM-DD') AS end_date
       FROM discounts d
       JOIN discount_products dp ON dp.discount_id = d.id
       WHERE dp.product_id = ANY($1)
         AND d.is_active = TRUE
         AND CURRENT_DATE BETWEEN d.start_date AND d.end_date`,
      [productIds]
    );
    const discountsByProduct = new Map();
    for (const r of discRows.rows) {
      if (!discountsByProduct.has(r.product_id)) discountsByProduct.set(r.product_id, []);
      discountsByProduct.get(r.product_id).push(r);
    }

    let total = 0;
    const priced = [];
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw Object.assign(new Error('Each item needs a positive integer quantity'), { status: 400 });
      }
      const { rows } = await client.query(
        'SELECT id, name, price, is_active FROM products WHERE id = $1',
        [item.product_id]
      );
      if (rows.length === 0) {
        throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 400 });
      }
      if (!rows[0].is_active) {
        throw Object.assign(new Error(`Product ${item.product_id} is not available`), { status: 400 });
      }

      // Size variants: when a product has them, a valid variant_id is required.
      const vres = await client.query(
        'SELECT id, label FROM product_variants WHERE product_id = $1',
        [item.product_id]
      );
      let variant = null;
      if (vres.rows.length > 0) {
        variant = vres.rows.find((v) => v.id === Number(item.variant_id));
        if (!variant) {
          throw Object.assign(new Error(`Product ${item.product_id} needs a valid size`), { status: 400 });
        }
      }

      const originalPrice = parseFloat(rows[0].price);
      const best = pickBestActiveDiscount(originalPrice, discountsByProduct.get(item.product_id) || []);
      const { finalPrice, discountAmount, discount } = computeDiscountedPrice(originalPrice, best);
      total += finalPrice * item.quantity;
      priced.push({
        product_id: item.product_id,
        variant_id: variant?.id ?? null,
        variant_label: variant?.label ?? null,
        quantity: item.quantity,
        price: finalPrice,
        original_price: originalPrice,
        discount_amount: discountAmount,
        discount_name: discount?.name ?? null,
        product_name: rows[0].name,
      });
    }
    total = Math.round((total + Number.EPSILON) * 100) / 100;

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
        `INSERT INTO order_items
           (order_id, product_id, variant_id, variant_label, quantity, price,
            original_price, discount_amount, discount_name, product_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id,
          item.product_id,
          item.variant_id,
          item.variant_label,
          item.quantity,
          item.price,
          item.original_price,
          item.discount_amount,
          item.discount_name,
          item.product_name,
        ]
      );
      // Atomic guarded decrement — two concurrent orders can't oversell.
      // A variant order draws down the variant's stock; otherwise the product's.
      const upd = item.variant_id
        ? await client.query(
            'UPDATE product_variants SET stock = stock - $1, updated_at = NOW() WHERE id = $2 AND stock >= $1 RETURNING stock',
            [item.quantity, item.variant_id]
          )
        : await client.query(
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
        `INSERT INTO stock_movements (product_id, variant_id, delta, type, order_id, user_id)
         VALUES ($1, $2, $3, 'sale', $4, $5)`,
        [item.product_id, item.variant_id, -item.quantity, order.id, userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(order);

    // fire-and-forget — never delays or fails the order
    sendOrderConfirmation({
      to: req.user.email,
      orderId: order.id,
      items: priced,
      total,
      shippingAddress: shipping_address,
    }).catch((e) => console.warn('[order email]', e.message));

    // And tell the boutique. The token carries no name, so look it up here,
    // off the response path.
    query('SELECT name FROM users WHERE id = $1', [userId])
      .then(({ rows }) =>
        sendNewOrderNotice({
          orderId: order.id,
          customer: { name: rows[0]?.name, email: req.user.email },
          items: priced,
          total,
          shippingAddress: shipping_address,
        })
      )
      .catch((e) => console.warn('[new order notice]', e.message));
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

// The staff order filters (status, customer, date range, name/email search),
// shared by the paged list and the CSV export so both always agree. Expects
// `orders o LEFT JOIN users u`.
function buildOrderFilters(q) {
  const where = [];
  const params = [];

  if (q.status) {
    if (!ORDER_STATUSES.includes(q.status)) return { error: 'Unknown status' };
    params.push(q.status);
    where.push(`o.status = $${params.length}`);
  }
  if (q.user_id) {
    params.push(Number(q.user_id));
    where.push(`o.user_id = $${params.length}`);
  }
  if (q.from) {
    params.push(q.from);
    where.push(`o.created_at >= $${params.length}`);
  }
  if (q.to) {
    params.push(q.to);
    where.push(`o.created_at < ($${params.length}::date + 1)`);
  }
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function listAllOrders(req, res) {
  try {
    const filters = buildOrderFilters(req.query);
    if (filters.error) return res.status(400).json({ error: filters.error, code: 'VALIDATION_ERROR' });
    const { whereSql, params } = filters;
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

// Up to this many rows in one export — years of orders for a boutique, and a
// ceiling so a careless request can't build an enormous response.
const EXPORT_MAX = 5000;

// A field for CSV: quoted when it has to be, and a leading = + - @ neutralised
// so a spreadsheet never runs a customer-typed address as a formula.
function csvField(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// The filtered order list as a CSV download, for bookkeeping. Times are in
// Ulaanbaatar time (created_at is stored in the database's own time zone);
// the BOM makes Excel read the Cyrillic as UTF-8.
export async function exportOrdersCsv(req, res) {
  try {
    const filters = buildOrderFilters(req.query);
    if (filters.error) return res.status(400).json({ error: filters.error, code: 'VALIDATION_ERROR' });
    const { whereSql, params } = filters;

    const { rows } = await query(
      `SELECT o.id, o.status, o.total, o.shipping_address,
              to_char(o.created_at AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'Asia/Ulaanbaatar',
                      'YYYY-MM-DD HH24:MI') AS placed_at,
              u.name AS user_name, u.email AS user_email,
              (SELECT COALESCE(SUM(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ${EXPORT_MAX}`,
      params
    );

    const header = ['Order', 'Placed (Ulaanbaatar)', 'Customer', 'Email', 'Status', 'Items', 'Total (USD)', 'Shipping address'];
    const lines = [
      header,
      ...rows.map((r) => [
        r.id, r.placed_at, r.user_name, r.user_email, r.status, r.item_count,
        Number(r.total).toFixed(2), r.shipping_address,
      ]),
    ].map((cols) => cols.map(csvField).join(','));

    const day = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${day}.csv"`);
    res.send(`﻿${lines.join('\r\n')}\r\n`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export orders' });
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
