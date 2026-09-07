import nodemailer from 'nodemailer';

let transporter;
let warned = false;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

// Sends via SMTP when SMTP_HOST/SMTP_PORT are configured. Otherwise logs the
// message (including any link) so local development still works without a server.
export async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    if (!warned) {
      console.warn('[mailer] SMTP_HOST/SMTP_PORT not set — emails will be logged, not sent');
      warned = true;
    }
    console.info(`[mailer] (not sent) to=${to} subject="${subject}"\n${text}`);
    return { skipped: true };
  }

  const from = process.env.MAIL_FROM || 'Modern Monkey Sale <no-reply@example.com>';
  return tx.sendMail({ from, to, subject, text, html });
}
