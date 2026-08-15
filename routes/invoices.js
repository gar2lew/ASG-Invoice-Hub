const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../src/db');
const { renderInvoice } = require('../src/pdf');
const { sendInvoicePdf } = require('../src/mail');
const { requireAuth, flash } = require('../src/middleware');
const { round2, todayISO, addDaysISO } = require('../src/helpers');

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), 'data');

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { error: 'Add at least one line item.' };
  const clean = [];
  for (const raw of items) {
    const description = String(raw.description || '').trim();
    const quantity = Number(raw.quantity);
    const rate = Number(raw.rate);
    if (!description) continue;
    clean.push({
      description,
      quantity: quantity > 0 ? quantity : 1,
      rate: rate >= 0 ? rate : 0,
      amount: round2(quantity * rate),
    });
  }
  if (!clean.length) return { error: 'Add at least one line item with a description.' };
  return { items: clean };
}

router.post('/api/invoices', requireAuth, async (req, res) => {
  try {
    const b = req.body || {};
    const customer_name = String(b.customer_name || '').trim();
    if (!customer_name) return res.status(400).json({ error: 'Customer name is required.' });

    const itemsRes = validateItems(b.items);
    if (itemsRes.error) return res.status(400).json({ error: itemsRes.error });

    const taxRate = b.gst ? 0.1 : 0;
    const subtotal = round2(itemsRes.items.reduce((s, it) => s + it.amount, 0));
    const taxAmount = round2(subtotal * taxRate);
    const total = round2(subtotal + taxAmount);

    const issue_date = String(b.issue_date || todayISO());
    const created = db.createInvoice({
      user_id: req.user.id,
      template: b.template === 'compact' ? 'compact' : 'standard',
      customer_name,
      customer_company: String(b.customer_company || '').trim(),
      customer_email: String(b.customer_email || '').trim(),
      customer_address: String(b.customer_address || '').trim(),
      issue_date,
      due_date: String(b.due_date || addDaysISO(14)),
      notes: String(b.notes || '').trim(),
      tax_rate: taxRate,
      subtotal,
      tax_amount: taxAmount,
      total,
      status: 'draft',
      items: itemsRes.items,
    });

    const invoice = db.getInvoice(created.id);
    invoice.rep_name = req.user.name;
    const items = db.getItems(created.id);
    const settings = db.getSettings();
    const pdf = await renderInvoice(invoice, items, settings);
    const full = path.join(DATA_DIR, created.pdf_path);
    fs.writeFileSync(full, pdf);

    if (b.send_now) {
      try {
        const recipients = buildRecipients(settings, req.user);
        await sendInvoicePdf(settings, invoice, pdf, recipients);
        db.setInvoiceStatus(created.id, 'sent');
        return res.json({ id: created.id, invoice_number: created.invoice_number, sent: true });
      } catch (err) {
        db.setInvoiceStatus(created.id, 'draft');
        flash(req, res, `Invoice ${created.invoice_number} saved, but emailing failed: ${err.message}`, 'error');
        return res.json({ id: created.id, invoice_number: created.invoice_number, sent: false, warning: true });
      }
    }

    res.json({ id: created.id, invoice_number: created.invoice_number, sent: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildRecipients(settings, user) {
  const list = [];
  if (settings.accounts_email) list.push(...String(settings.accounts_email).split(/[,;]/));
  if (user.email) list.push(user.email);
  return [...new Set(list.map((e) => e.trim()).filter(Boolean))];
}

function loadInvoiceForUser(req, res) {
  const invoice = db.getInvoice(req.params.id);
  if (!invoice) return null;
  if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) return null;
  return invoice;
}

router.get('/invoices/:id/download', requireAuth, (req, res) => {
  const invoice = loadInvoiceForUser(req, res);
  if (!invoice) return res.status(404).send('Not found');
  const full = path.join(DATA_DIR, invoice.pdf_path);
  if (!fs.existsSync(full)) return res.status(404).send('PDF file missing. Re-send the invoice to regenerate it.');
  res.download(full, `${invoice.invoice_number}.pdf`);
});

router.post('/invoices/:id/send', requireAuth, async (req, res) => {
  const invoice = loadInvoiceForUser(req, res);
  if (!invoice) {
    flash(req, res, 'Invoice not found.', 'error');
    return res.redirect('/');
  }
  const settings = db.getSettings();
  const rep = db.getUserById(invoice.user_id);
  invoice.rep_name = rep.name;
  const items = db.getItems(invoice.id);
  try {
    const pdf = fs.existsSync(path.join(DATA_DIR, invoice.pdf_path))
      ? fs.readFileSync(path.join(DATA_DIR, invoice.pdf_path))
      : await renderInvoice(invoice, items, settings);
    const recipients = buildRecipients(settings, rep);
    await sendInvoicePdf(settings, invoice, pdf, recipients);
    db.setInvoiceStatus(invoice.id, 'sent');
    flash(req, res, `Invoice ${invoice.invoice_number} sent to ${recipients.join(', ')}.`);
  } catch (err) {
    flash(req, res, `Email failed: ${err.message}`, 'error');
  }
  res.redirect(`/invoices/${invoice.id}`);
});

router.post('/invoices/:id/paid', requireAuth, (req, res) => {
  const invoice = loadInvoiceForUser(req, res);
  if (!invoice) {
    flash(req, res, 'Invoice not found.', 'error');
    return res.redirect('/');
  }
  db.setInvoiceStatus(invoice.id, 'paid');
  flash(req, res, `Invoice ${invoice.invoice_number} marked as paid.`);
  res.redirect(`/invoices/${invoice.id}`);
});

router.post('/invoices/:id/delete', requireAuth, (req, res) => {
  const invoice = loadInvoiceForUser(req, res);
  if (!invoice) {
    flash(req, res, 'Invoice not found.', 'error');
    return res.redirect('/');
  }
  try {
    fs.unlinkSync(path.join(DATA_DIR, invoice.pdf_path));
  } catch { /* file already gone */ }
  db.deleteInvoice(invoice.id);
  flash(req, res, `Invoice ${invoice.invoice_number} deleted.`);
  res.redirect('/');
});

module.exports = router;
