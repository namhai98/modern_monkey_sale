import { query } from '../config/db.js';
import { ORDER_STATUSES } from '../utils/orderStatus.js';
import { EFFECTIVE_STOCK_SQL } from '../utils/serializeProduct.js';

// created_at is a plain TIMESTAMP written by NOW() in the database's own time
// zone (UTC on Neon, often local on a dev machine). Reading it back through
// that zone and into Ulaanbaatar makes "today" the shop's today everywhere.
const UB_TIME = `(o.created_at AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'Asia/Ulaanbaatar')`;
const UB_TODAY = `(NOW() AT TIME ZONE 'Asia/Ulaanbaatar')::date`;
// Orders that count as sales. Cancelled and refunded ones never do.
const SOLD = `o.status NOT IN ('cancelled', 'refunded')`;

const LOW_STOCK_LIMIT = 8;
const TOP_LIMIT = 5;
const RECENT_LIMIT = 5;

/* One request for the admin landing page: sales for today / 7 / 30 days, how
   many orders sit in each status, the latest orders, the best sellers of the
   last 30 days, and the pieces running low. */
export async function getDashboard(req, res) {
  try {
    const [sales, statuses, recent, top, low] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(o.total) FILTER (WHERE ${UB_TIME}::date = ${UB_TODAY}), 0)::float AS today_revenue,
           COUNT(*) FILTER (WHERE ${UB_TIME}::date = ${UB_TODAY})::int AS today_orders,
           COALESCE(SUM(o.total) FILTER (WHERE ${UB_TIME}::date > ${UB_TODAY} - 7), 0)::float AS week_revenue,
           COUNT(*) FILTER (WHERE ${UB_TIME}::date > ${UB_TODAY} - 7)::int AS week_orders,
           COALESCE(SUM(o.total) FILTER (WHERE ${UB_TIME}::date > ${UB_TODAY} - 30), 0)::float AS month_revenue,
           COUNT(*) FILTER (WHERE ${UB_TIME}::date > ${UB_TODAY} - 30)::int AS month_orders
         FROM orders o
         WHERE ${SOLD}`
      ),
      query(`SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status`),
      query(
        `SELECT o.id, o.status, o.total, o.created_at, u.name AS user_name, u.email AS user_email
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT ${RECENT_LIMIT}`
      ),
      query(
        `SELECT i.product_id AS id, COALESCE(p.name, MAX(i.product_name)) AS name, p.image_url,
                SUM(i.quantity)::int AS units, SUM(i.price * i.quantity)::float AS revenue
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
         LEFT JOIN products p ON p.id = i.product_id
         WHERE ${SOLD} AND ${UB_TIME}::date > ${UB_TODAY} - 30
         GROUP BY i.product_id, p.name, p.image_url
         ORDER BY units DESC, revenue DESC
         LIMIT ${TOP_LIMIT}`
      ),
      query(
        `SELECT p.id, p.name, p.sku, p.image_url, p.low_stock_threshold,
                ${EFFECTIVE_STOCK_SQL}::int AS stock
         FROM products p
         WHERE p.is_active = TRUE AND ${EFFECTIVE_STOCK_SQL} <= p.low_stock_threshold
         ORDER BY ${EFFECTIVE_STOCK_SQL} ASC, p.name
         LIMIT ${LOW_STOCK_LIMIT}`
      ),
    ]);

    const s = sales.rows[0];
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((st) => [st, 0]));
    for (const r of statuses.rows) byStatus[r.status] = r.n;

    res.json({
      sales: {
        today: { revenue: s.today_revenue, orders: s.today_orders },
        week: { revenue: s.week_revenue, orders: s.week_orders },
        month: { revenue: s.month_revenue, orders: s.month_orders },
      },
      status_counts: byStatus,
      recent_orders: recent.rows.map((r) => ({
        id: r.id,
        status: r.status,
        total: Number(r.total),
        created_at: r.created_at,
        user: r.user_name || r.user_email ? { name: r.user_name, email: r.user_email } : null,
      })),
      top_products: top.rows,
      low_stock: low.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}
