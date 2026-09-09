import { sendMail } from './mailer.js';

const fmt = (n) => `$${Number(n).toFixed(2)}`;

// Fire-and-forget order confirmation. No-ops (logs) until SMTP is configured.
export function sendOrderConfirmation({ to, orderId, items, total, shippingAddress }) {
  if (!to) return Promise.resolve({ skipped: true });

  const rows = items.map((i) => ({
    label: `${i.quantity} × ${i.product_name}`,
    price: fmt(i.price),
    was: i.discount_amount > 0 ? fmt(i.original_price) : null,
  }));

  const text =
    `Thank you for your order.\n\n` +
    `Order #${orderId}\n` +
    rows.map((r) => `  ${r.label} — ${r.price}${r.was ? ` (was ${r.was})` : ''}`).join('\n') +
    `\n\nTotal: ${fmt(total)}\n\n` +
    `Shipping to:\n${shippingAddress || '—'}\n\n` +
    `Follow it in your account under Orders.\n\n— Modern Monkey`;

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;color:#17140f;max-width:520px">
    <h2 style="font-weight:400;font-size:22px;margin:0 0 4px">Thank you for your order</h2>
    <p style="color:#8a8378;margin:0 0 16px;font-size:13px;letter-spacing:.08em;text-transform:uppercase">Order #${orderId}</p>
    <table style="border-collapse:collapse;font-size:14px;width:100%">
      ${rows
        .map(
          (r) =>
            `<tr><td style="padding:5px 16px 5px 0">${r.label}</td><td style="padding:5px 0;text-align:right">${r.price}</td></tr>`
        )
        .join('')}
      <tr><td style="padding:10px 16px 0 0;border-top:1px solid #d9d3c7">Total</td><td style="padding:10px 0 0;text-align:right;border-top:1px solid #d9d3c7">${fmt(total)}</td></tr>
    </table>
    <p style="color:#8a8378;white-space:pre-line;font-size:14px;margin-top:16px">Shipping to:
${shippingAddress || '—'}</p>
    <p style="color:#8a8378;font-size:13px">— Modern Monkey</p>
  </div>`;

  return sendMail({ to, subject: `Modern Monkey — order #${orderId}`, text, html });
}
