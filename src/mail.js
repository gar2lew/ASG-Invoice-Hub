const nodemailer = require('nodemailer');

let transporter = null;

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

function initMail() {
  if (!isMailConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

function getTransporter() {
  if (!transporter) return initMail();
  return transporter;
}

function fromAddress(settings) {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  if (settings.company_email) return `"${settings.company_name}" <${settings.company_email}>`;
  return '"Invoice Hub" <no-reply@localhost>';
}

async function sendInvoicePdf(settings, invoice, pdfBuffer, to) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP is not configured. Set SMTP_HOST in .env');
  const recipients = to.map((e) => e.trim()).filter(Boolean);
  if (!recipients.length) throw new Error('No recipients provided');
  const lines = [
    `Please find attached invoice ${invoice.invoice_number}.`,
    '',
    `Customer: ${invoice.customer_name}`,
    `Amount: $${Number(invoice.total || 0).toFixed(2)}`,
    invoice.notes ? `Notes: ${invoice.notes}` : null,
  ].filter(Boolean);
  await t.sendMail({
    from: fromAddress(settings),
    to: recipients.join(', '),
    subject: `Invoice ${invoice.invoice_number} from ${settings.company_name || 'our company'}`,
    text: lines.join('\n'),
    attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer }],
  });
}

module.exports = { isMailConfigured, sendInvoicePdf };
