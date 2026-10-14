// QPay Merchant API v2 — the calls this shop needs: a token, an invoice, a
// payment check, and the clean-up/refund calls around them. Endpoints and
// bodies follow the Postman collections in /qpay_doc (Merchant V2, eBarimt 3.0).
//
// Switched off until QPAY_CLIENT_ID, QPAY_CLIENT_SECRET and QPAY_INVOICE_CODE
// are all set; QPAY_BASE_URL defaults to the sandbox, so production needs
// https://merchant.qpay.mn set explicitly — a missing variable can never send
// real shoppers to a test merchant without someone choosing it.

const SANDBOX_URL = 'https://merchant-sandbox.qpay.mn';
const TIMEOUT_MS = Number(process.env.QPAY_TIMEOUT_MS || 15000);
// Renew a token this long before QPay says it expires, so a request never
// leaves with one that dies in flight.
const EXPIRY_MARGIN_MS = 60 * 1000;

export function qpayConfig() {
  return {
    baseUrl: (process.env.QPAY_BASE_URL || SANDBOX_URL).replace(/\/+$/, ''),
    clientId: process.env.QPAY_CLIENT_ID || '',
    clientSecret: process.env.QPAY_CLIENT_SECRET || '',
    invoiceCode: process.env.QPAY_INVOICE_CODE || '',
    // Who the invoice is addressed to; QPay's own examples use the terminal
    // code "terminal" or a branch code. Defaults to the merchant-wide value.
    receiverCode: process.env.QPAY_RECEIVER_CODE || 'terminal',
  };
}

export function isQpayEnabled() {
  const c = qpayConfig();
  return Boolean(c.clientId && c.clientSecret && c.invoiceCode);
}

export class QpayError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'QpayError';
    this.status = status;
    this.body = body;
  }
}

// QPay reports expiry as a Unix timestamp in seconds; some gateways send a
// lifetime instead. Accept both and hand back an absolute time in ms.
export function expiryToMs(value, now = Date.now()) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return now + 5 * 60 * 1000;
  return n > 1e9 ? n * 1000 : now + n * 1000;
}

let session = null; // { access, accessExp, refresh, refreshExp }
let inflight = null;

export function __resetQpaySession() {
  session = null;
  inflight = null;
}

async function call(method, path, { body, token, basic } = {}) {
  const { baseUrl } = qpayConfig();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (basic) headers.Authorization = `Basic ${Buffer.from(basic).toString('base64')}`;
  else if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const reason = json?.message || json?.error || text.slice(0, 200) || res.statusText;
    throw new QpayError(`QPay ${method} ${path} → ${res.status}: ${reason}`, {
      status: res.status,
      body: json,
    });
  }
  return json;
}

function remember(data) {
  if (!data?.access_token) throw new QpayError('QPay token response had no access_token');
  session = {
    access: data.access_token,
    accessExp: expiryToMs(data.expires_in),
    refresh: data.refresh_token || null,
    refreshExp: data.refresh_expires_in ? expiryToMs(data.refresh_expires_in) : 0,
  };
  return session.access;
}

async function freshToken() {
  const now = Date.now();
  if (session?.refresh && session.refreshExp - EXPIRY_MARGIN_MS > now) {
    try {
      return remember(await call('POST', '/v2/auth/refresh', { token: session.refresh }));
    } catch (err) {
      console.warn('[qpay] refresh failed, signing in again:', err.message);
    }
  }
  const { clientId, clientSecret } = qpayConfig();
  return remember(await call('POST', '/v2/auth/token', { basic: `${clientId}:${clientSecret}` }));
}

// One shared sign-in at a time, so a burst of checkouts can't fan out into a
// burst of token requests.
async function accessToken() {
  if (session && session.accessExp - EXPIRY_MARGIN_MS > Date.now()) return session.access;
  inflight =
    inflight ||
    freshToken().finally(() => {
      inflight = null;
    });
  return inflight;
}

// An authorised call that signs in again once if QPay rejects the token —
// a token revoked on their side looks valid on ours until it is used.
async function authed(method, path, body) {
  try {
    return await call(method, path, { body, token: await accessToken() });
  } catch (err) {
    if (err instanceof QpayError && err.status === 401) {
      session = null;
      return call(method, path, { body, token: await accessToken() });
    }
    throw err;
  }
}

/** Issue an invoice. Returns { invoice_id, qr_text, qr_image, qPay_shortUrl, urls }. */
export function createInvoice({ senderInvoiceNo, amount, description, callbackUrl }) {
  const { invoiceCode, receiverCode } = qpayConfig();
  return authed('POST', '/v2/invoice', {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    invoice_description: description,
    amount,
    callback_url: callbackUrl,
  });
}

/** Payments made against an invoice: { count, paid_amount, rows: [...] }. */
export function checkInvoicePayment(invoiceId) {
  return authed('POST', '/v2/payment/check', {
    object_type: 'INVOICE',
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
}

export function cancelInvoice(invoiceId) {
  return authed('DELETE', `/v2/invoice/${encodeURIComponent(invoiceId)}`);
}

export function getPayment(paymentId) {
  return authed('GET', `/v2/payment/${encodeURIComponent(paymentId)}`);
}

/** Return a settled payment to the payer (card payments: cancel; wallet: refund). */
export function refundPayment(paymentId, { note, callbackUrl } = {}) {
  return authed('DELETE', `/v2/payment/refund/${encodeURIComponent(paymentId)}`, {
    note,
    callback_url: callbackUrl,
  });
}

/**
 * eBarimt 3.0 receipt for a paid payment. receiverType is CITIZEN (receiver =
 * phone or registry number) or COMPANY (receiver = company registry number).
 * Not wired into checkout yet — see DEPLOY.md.
 */
export function createEbarimt(paymentId, { receiverType = 'CITIZEN', receiver } = {}) {
  return authed('POST', '/v2/ebarimt_v3/create', {
    payment_id: paymentId,
    ebarimt_receiver_type: receiverType,
    ebarimt_receiver: receiver,
  });
}

export function cancelEbarimt(paymentId, note) {
  return authed('DELETE', `/v2/ebarimt_v3/${encodeURIComponent(paymentId)}`, note ? { note } : undefined);
}

// What the shopper is asked to pay, in tögrög. The same rule the storefront
// prints with (lib/price.js formatMoney): USD × rate, rounded DOWN to the
// thousand — so the invoice never asks for more than the checkout showed.
export function toInvoiceAmount(usdTotal, rate) {
  const mnt = Math.floor((Number(usdTotal) * Number(rate)) / 1000) * 1000;
  return Math.max(mnt, 1000);
}

// A check counts as settled when QPay reports the full amount in, as PAID.
export function isSettled(check, amount) {
  const paid = (check?.rows || []).filter((r) => String(r.payment_status).toUpperCase() === 'PAID');
  const total = paid.reduce((n, r) => n + Number(r.payment_amount || 0), 0);
  return { settled: paid.length > 0 && total + 0.001 >= Number(amount), total, payment: paid[0] || null };
}
