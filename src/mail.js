let nodemailer = null;
let transporter = null;
const INVOICE_RECIPIENT = 'natalie@sjssolutionscorp.com.au';

function getInvoiceRecipients() {
  return INVOICE_RECIPIENT;
}

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

function initMail() {
  if (!isMailConfigured()) return null;
  if (!nodemailer) nodemailer = require('nodemailer');
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

async function sendInvoicePdf(settings, invoice, pdfBuffer, to, repName, weekRange) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP is not configured. Set SMTP_HOST in .env');
  const recipients = (Array.isArray(to) ? to : [to]).map((e) => String(e).trim()).filter(Boolean);
  if (!recipients.length) throw new Error('No recipients provided');

  const subject = `Invoice ${invoice.invoice_number} - ${repName} - ${weekRange}`;
  const body = `Hi Natalie,\n\nPlease see my invoice attached for ${repName} - ${weekRange}.\n\nKind Regards,\n${repName}`;

  await t.sendMail({
    from: fromAddress(settings),
    to: recipients.join(', '),
    subject: subject,
    text: body,
    attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer }],
  });
}

module.exports = { isMailConfigured, sendInvoicePdf, getInvoiceRecipients };
