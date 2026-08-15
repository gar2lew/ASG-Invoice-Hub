const express = require('express');
const db = require('../src/db');
const { renderInvoice } = require('../src/pdf');
const { sendInvoicePdf } = require('../src/mail');
const { requireAuth, flash } = require('../src/middleware');
const { round2, todayISO, addDaysISO } = require('../src/helpers');

const router = express.Router();

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

function buildRecipients(settings, user) {
  const list = [];
  if (settings.accounts_email) list.push(...String(settings.accounts_email).split(/[,;]/));
  if (user.email) list.push(user.email);
  return [...new Set(list.map((e) => e.trim()).filter(Boolean))];
}

async function loadInvoiceForUser(req) {
  const invoice = await db.getInvoice(req.params.id);
  if (!invoice) return null;
  if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) return null;
  return invoice;
}

async function pdfForInvoice(invoice) {
  const items = await db.getItems(invoice.id);
  const rep = await db.getUserById(invoice.user_id);
  if (rep) invoice.rep_name = rep.name;
  const settings = await db.getSettings();
  return renderInvoice(invoice, items, settings);
}

router.post('/api/invoices', requireAuth, async (req, res, next) => {
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

    const created = await db.createInvoice({
      user_id: req.user.id,
      template: b.template === 'compact' ? 'compact' : 'standard',
      customer_name,
      customer_company: String(b.customer_company || '').trim(),
      customer_email: String(b.customer_email || '').trim(),
      customer_address: String(b.customer_address || '').trim(),
      issue_date: String(b.issue_date || todayISO()),
      due_date: String(b.due_date || addDaysISO(14)),
      notes: String(b.notes || '').trim(),
      tax_rate: taxRate,
      subtotal,
      tax_amount: taxAmount,
      total,
      status: 'draft',
      items: itemsRes.items,
    });

    const invoice = await db.getInvoice(created.id);
    invoice.rep_name = req.user.name;
    const settings = await db.getSettings();
    const pdf = await renderInvoice(invoice, await db.getItems(created.id), settings);

    if (b.send_now) {
      try {
        const recipients = buildRecipients(settings, req.user);
        await sendInvoicePdf(settings, invoice, pdf, recipients);
        await db.setInvoiceStatus(created.id, 'sent');
        return res.json({ id: created.id, invoice_number: created.invoice_number, sent: true });
      } catch (err) {
        await db.setInvoiceStatus(created.id, 'draft');
        flash(req, res, `Invoice ${created.invoice_number} saved, but emailing failed: ${err.message}`, 'error');
        return res.json({ id: created.id, invoice_number: created.invoice_number, sent: false, warning: true });
      }
    }

    res.json({ id: created.id, invoice_number: created.invoice_number, sent: false });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:id/download', requireAuth, async (req, res, next) => {
  try {
    const invoice = await loadInvoiceForUser(req);
    if (!invoice) return res.status(404).send('Not found');
    const pdf = await pdfForInvoice(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.post('/invoices/:id/send', requireAuth, async (req, res, next) => {
  try {
    const invoice = await loadInvoiceForUser(req);
    if (!invoice) {
      flash(req, res, 'Invoice not found.', 'error');
      return res.redirect('/');
    }
    const settings = await db.getSettings();
    const rep = await db.getUserById(invoice.user_id);
    if (rep) invoice.rep_name = rep.name;
    const items = await db.getItems(invoice.id);
    try {
      const pdf = await renderInvoice(invoice, items, settings);
      const recipients = buildRecipients(settings, rep);
      await sendInvoicePdf(settings, invoice, pdf, recipients);
      await db.setInvoiceStatus(invoice.id, 'sent');
      flash(req, res, `Invoice ${invoice.invoice_number} sent to ${recipients.join(', ')}.`);
    } catch (err) {
      flash(req, res, `Email failed: ${err.message}`, 'error');
    }
    res.redirect(`/invoices/${invoice.id}`);
  } catch (err) {
    next(err);
  }
});

router.post('/invoices/:id/paid', requireAuth, async (req, res, next) => {
  try {
    const invoice = await loadInvoiceForUser(req);
    if (!invoice) {
      flash(req, res, 'Invoice not found.', 'error');
      return res.redirect('/');
    }
    await db.setInvoiceStatus(invoice.id, 'paid');
    flash(req, res, `Invoice ${invoice.invoice_number} marked as paid.`);
    res.redirect(`/invoices/${invoice.id}`);
  } catch (err) {
    next(err);
  }
});

router.post('/invoices/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const invoice = await loadInvoiceForUser(req);
    if (!invoice) {
      flash(req, res, 'Invoice not found.', 'error');
      return res.redirect('/');
    }
    await db.deleteInvoice(invoice.id);
    flash(req, res, `Invoice ${invoice.invoice_number} deleted.`);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
