import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { getRateSettings } from '../services/exchangeRate.js';
import {
  cancelInvoice,
  checkInvoicePayment,
  createInvoice,
  isQpayEnabled,
  isSettled,
  toInvoiceAmount,
} from '../services/qpay.js';

/* QPay checkout.

   1. The shopper places an order as before (status pending, stock held).
   2. The order page asks for an invoice: POST /api/payments/qpay/:orderId.
      The USD total is converted at the current rate and locked into the row.
   3. The shopper pays in their bank app. QPay calls our callback URL, and the
      order page polls GET /api/payments/qpay/:orderId as a second route in —
      either one runs the same check against QPay's /v2/payment/check, so
      nothing is ever marked paid on a callback's word alone.
   4. A full PAID amount moves the payment to paid and the order pending → paid. */

// Namespace for the per-order advisory lock taken while issuing an invoice.
const LOCK_NS = 7710;
const REUSABLE_FOR_MS = 20 * 60 * 1000; // after this, a fresh invoice (and a fresh rate)

function callbackSecret() {
  return process.env.QPAY_CALLBACK_SECRET || process.env.JWT_SECRET || '';
}

// The callback URL carries our reference plus a signature over it, so a
// stranger can't make the server poll QPay for invoices that aren't theirs.
export function signRef(ref) {
  return crypto.createHmac('sha256', callbackSecret()).update(ref).digest('hex').slice(0, 32);
}

function callbackUrl(ref) {
  // QPay must reach it from the internet: the public API origin. On Netlify the
  // site proxies /api/* to Render, so APP_URL works as well as the Render URL.
  const base = (process.env.QPAY_CALLBACK_BASE_URL || process.env.APP_URL || '').replace(/\/+$/, '');
  return `${base}/api/payments/qpay/callback?ref=${encodeURIComponent(ref)}&sig=${signRef(ref)}`;
}

function serializePayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    provider: p.provider,
    status: p.status,
    invoice_id: p.invoice_id,
    amount_mnt: Number(p.amount_mnt),
    amount_usd: Number(p.amount_usd),
    qr_text: p.qr_text,
    qr_image: p.qr_image,
    short_url: p.short_url,
    urls: p.urls || [],
    paid_at: p.paid_at,
    created_at: p.created_at,
  };
}

async function loadOwnedOrder(req, res) {
  const { rows } = await query('SELECT id, user_id, status, total FROM orders WHERE id = $1', [
    req.params.orderId,
  ]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Order not found' });
    return null;
  }
  if (rows[0].user_id !== req.user.id) {
    res.status(403).json({ error: 'Not your order', code: 'FORBIDDEN' });
    return null;
  }
  return rows[0];
}

async function latestPayment(orderId) {
  const { rows } = await query(
    `SELECT * FROM payments WHERE order_id = $1 AND provider = 'qpay'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

/**
 * Ask QPay whether a pending payment has been paid and, if so, record it and
 * move the order to paid. Idempotent: the row is locked and re-read, so the
 * callback and a poll landing together settle it once.
 */
export async function syncPayment(payment) {
  if (!payment || payment.status !== 'pending' || !payment.invoice_id) return payment;

  const check = await checkInvoicePayment(payment.invoice_id);
  const { settled, total, payment: paid } = isSettled(check, payment.amount_mnt);
  if (!settled) return payment;

  return withTransaction(async (q) => {
    const { rows } = await q('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [payment.id]);
    const row = rows[0];
    if (!row || row.status !== 'pending') return row;

    const updated = await q(
      `UPDATE payments
       SET status = 'paid', payment_id = $2, paid_amount = $3, paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [row.id, paid?.payment_id ?? null, total]
    );

    const order = await q('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [row.order_id]);
    const status = order.rows[0]?.status;
    if (status === 'pending') {
      await q("UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1", [row.order_id]);
      await q(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, user_id)
         VALUES ($1, 'pending', 'paid', $2, NULL)`,
        [row.order_id, `QPay · ${paid?.payment_id ?? row.invoice_id}`]
      );
    } else {
      // Paid after the order was cancelled (or moved on by staff). The money
      // is in; a person has to decide whether to refund or reinstate.
      console.warn(
        `[qpay] payment ${paid?.payment_id} landed on order #${row.order_id} in status ${status} — needs review`
      );
    }
    return updated.rows[0];
  });
}

// GET /api/payments/methods — public; checkout reads it to say how payment works.
export function paymentMethods(req, res) {
  res.json({ qpay: isQpayEnabled() });
}

// POST /api/payments/qpay/:orderId — the invoice to pay this order with.
// Reuses the open one while it is fresh, so reloading the page doesn't issue a
// new invoice every time.
export async function startQpay(req, res) {
  if (!isQpayEnabled()) {
    return res.status(503).json({ error: 'QPay is not configured', code: 'PAYMENTS_DISABLED' });
  }
  try {
    const order = await loadOwnedOrder(req, res);
    if (!order) return;

    // One request per order at a time: a page that asks twice at once (React
    // StrictMode, a double tap) must get one invoice, not two payable ones.
    const result = await withTransaction(async (q) => {
      await q('SELECT pg_advisory_xact_lock($1, $2)', [LOCK_NS, order.id]);
      let current = await latestPayment(order.id);
      if (current?.status === 'pending') current = await syncPayment(current);
      if (current?.status === 'paid' || order.status !== 'pending') {
        return { status: 200, body: { enabled: true, order_status: order.status, payment: serializePayment(current) } };
      }

      const fresh =
        current?.status === 'pending' &&
        Date.now() - new Date(current.created_at).getTime() < REUSABLE_FOR_MS &&
        Number(current.amount_usd) === Number(order.total);
      if (fresh) {
        return { status: 200, body: { enabled: true, order_status: order.status, payment: serializePayment(current) } };
      }

      const { mnt_rate: rate } = await getRateSettings();
      if (!Number.isFinite(Number(rate)) || Number(rate) <= 0) {
        return {
          status: 503,
          body: { error: 'No exchange rate available to price the invoice', code: 'RATE_UNAVAILABLE' },
        };
      }

      // Retire the stale invoice so it can't be paid alongside the new one.
      if (current?.status === 'pending') await retirePayment(current);

      const amount = toInvoiceAmount(order.total, rate);
      const ref = `MM${order.id}-${crypto.randomBytes(4).toString('hex')}`;
      const invoice = await createInvoice({
        senderInvoiceNo: ref,
        amount,
        description: `Modern Monkey #${order.id}`,
        callbackUrl: callbackUrl(ref),
      });

      const { rows } = await q(
        `INSERT INTO payments
           (order_id, provider, status, sender_invoice_no, invoice_id, amount_mnt, amount_usd,
            mnt_rate, qr_text, qr_image, short_url, urls)
         VALUES ($1, 'qpay', 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          order.id,
          ref,
          invoice.invoice_id,
          amount,
          order.total,
          rate,
          invoice.qr_text ?? null,
          invoice.qr_image ?? null,
          invoice.qPay_shortUrl ?? null,
          JSON.stringify(invoice.urls || []),
        ]
      );
      return { status: 201, body: { enabled: true, order_status: order.status, payment: serializePayment(rows[0]) } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[qpay] start failed:', err.message);
    res.status(502).json({ error: 'Could not reach QPay', code: 'QPAY_UNAVAILABLE' });
  }
}

// GET /api/payments/qpay/:orderId — where the payment stands; checks QPay
// while it is still pending. The order page polls this.
export async function qpayStatus(req, res) {
  try {
    const order = await loadOwnedOrder(req, res);
    if (!order) return;
    if (!isQpayEnabled()) return res.json({ enabled: false, order_status: order.status, payment: null });

    let payment = await latestPayment(order.id);
    if (payment?.status === 'pending') payment = await syncPayment(payment);
    const { rows } = await query('SELECT status FROM orders WHERE id = $1', [order.id]);
    res.json({ enabled: true, order_status: rows[0].status, payment: serializePayment(payment) });
  } catch (err) {
    console.error('[qpay] status failed:', err.message);
    res.status(502).json({ error: 'Could not reach QPay', code: 'QPAY_UNAVAILABLE' });
  }
}

// GET|POST /api/payments/qpay/callback?ref=…&sig=… — QPay's ping that money
// moved. Trusted only as a prompt to check; always answers 200 so QPay
// doesn't retry an invoice we've already handled.
export async function qpayCallback(req, res) {
  const ref = String(req.query.ref || '');
  const sig = String(req.query.sig || '');
  const expected = ref ? signRef(ref) : '';
  const ok =
    ref &&
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return res.status(400).json({ error: 'Bad callback signature' });

  try {
    const { rows } = await query('SELECT * FROM payments WHERE sender_invoice_no = $1', [ref]);
    if (rows[0]) await syncPayment(rows[0]);
  } catch (err) {
    console.error('[qpay] callback check failed:', err.message);
  }
  res.type('text/plain').send('SUCCESS');
}

async function retirePayment(payment) {
  await query("UPDATE payments SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [payment.id]);
  if (payment.invoice_id && isQpayEnabled()) {
    await cancelInvoice(payment.invoice_id).catch((e) =>
      console.warn(`[qpay] could not cancel invoice ${payment.invoice_id}:`, e.message)
    );
  }
}

/**
 * Called after an order is cancelled: close its open invoices so the shopper
 * can't pay for something that no longer exists. Best-effort, off the
 * response path.
 */
export async function cancelOpenInvoices(orderId) {
  const { rows } = await query(
    "SELECT * FROM payments WHERE order_id = $1 AND status = 'pending'",
    [orderId]
  );
  for (const p of rows) {
    // Settle first: money that already landed must be recorded, not retired.
    const now = await syncPayment(p).catch(() => p);
    if (now?.status === 'pending') await retirePayment(now);
  }
}
