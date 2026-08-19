const express = require('express');
const db = require('../src/db');
const { requireAuth } = require('../src/middleware');
const { fmtMoney, fmtDate, weekBounds, todayISO, addDaysISO } = require('../src/helpers');
const { WEEKLY_SEND_TO } = require('../src/templates');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const admin = req.user.role === 'admin';
    const invoices = await db.listInvoices({ userId: req.user.id, admin });
    const week = weekBounds();
    const weekStats = await db.statsForUserSince(req.user.id, week.start, week.end);
    const allStats = await db.statsForUser(req.user.id);
    const recent = invoices.slice(0, 8);
    const flashMsg = req.session.flash || null;
    req.session.flash = null;

    const rows = invoices.map((i) => ({
      ...i,
      totalText: fmtMoney(i.total),
      issueDateText: fmtDate(i.issue_date),
      createdText: fmtDate(i.created_at),
    }));

    const statusCounts = { draft: 0, sent: 0, paid: 0 };
    invoices.forEach((i) => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

    res.render('dashboard', {
      title: 'Dashboard',
      flash: flashMsg,
      invoices: rows,
      recent,
      admin,
      weekStats: { ...weekStats, totalText: fmtMoney(weekStats.total), count: weekStats.count },
      allStats: {
        ...allStats,
        totalText: fmtMoney(allStats.total),
        count: allStats.count,
      },
      statusCounts,
      todayText: new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
      showEmpty: invoices.length === 0,
      weeklySendTo: WEEKLY_SEND_TO,
      draftCount: statusCounts.draft,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/new', requireAuth, async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    const nextNumber = `${settings.invoice_prefix}-${String(settings.next_invoice_number).padStart(4, '0')}`;
    res.render('new-invoice', {
      title: 'New invoice',
      flash: flashMsg,
      settings,
      nextNumber,
      issueDate: todayISO(),
      dueDate: addDaysISO(14),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:id', requireAuth, async (req, res, next) => {
  try {
    const invoice = await db.getInvoice(req.params.id);
    if (!invoice) return res.status(404).render('notfound', { title: 'Not found', flash: null });
    if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) {
      return res.status(404).render('notfound', { title: 'Not found', flash: null });
    }
    const items = await db.getItems(invoice.id);
    const settings = await db.getSettings();
    const rep = await db.getUserById(invoice.user_id);
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('invoice-detail', {
      title: invoice.invoice_number,
      flash: flashMsg,
      invoice: {
        ...invoice,
        totalText: fmtMoney(invoice.total),
        subtotalText: fmtMoney(invoice.subtotal),
        taxText: fmtMoney(invoice.tax_amount),
        issueDateText: fmtDate(invoice.issue_date),
        dueDateText: fmtDate(invoice.due_date),
        repName: rep ? rep.name : '',
        repAbn: rep ? rep.abn : '',
      },
      items: items.map((it) => ({ ...it, amountText: fmtMoney(it.amount), rateText: fmtMoney(it.rate) })),
      settings,
      mailEnabled: require('../src/mail').isMailConfigured(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
