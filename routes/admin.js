const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { requireAdmin, flash } = require('../src/middleware');
const { fmtMoney, fmtDate } = require('../src/helpers');

const router = express.Router();

router.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('settings', {
      title: 'Settings',
      flash: flashMsg,
      settings,
      mailEnabled: require('../src/mail').isMailConfigured(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    await db.updateSettings(req.body || {});
    flash(req, res, 'Settings saved. New invoices will use these details.');
    res.redirect('/settings');
  } catch (err) {
    next(err);
  }
});

router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const users = await db.getUsers();
    const totals = await db.repTotals();
    const totalsMap = {};
    totals.forEach((t) => { totalsMap[t.id] = { count: t.count, totalText: fmtMoney(t.total) }; });
    const sentDatesMap = {};
    for (const u of users) {
      if (u.role !== 'admin') {
        sentDatesMap[u.id] = await db.sentDatesForUser(u.id);
      }
    }
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('users', {
      title: 'Sales reps',
      flash: flashMsg,
      users: users.map((u) => ({
        ...u,
        createdText: fmtDate(u.created_at),
        ...(totalsMap[u.id] || { count: 0, totalText: '$0.00' }),
        sentDates: sentDatesMap[u.id] || [],
      })),
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, abn, bank_name, bank_bsb, bank_account, pin } = req.body || {};
    if (!name || !pin) {
      flash(req, res, 'Name and PIN are required.', 'error');
      return res.redirect('/users');
    }
    const cleanPin = String(pin).trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      flash(req, res, 'PIN must be exactly 4 digits.', 'error');
      return res.redirect('/users');
    }
    const username = String(name).trim().toLowerCase().replace(/\s+/g, '.');
    const existing = await db.getUserByUsername(username);
    if (existing) {
      flash(req, res, `A rep with that name already exists.`, 'error');
      return res.redirect('/users');
    }
    await db.createUser({
      username,
      password: cleanPin,
      name: String(name).trim(),
      email: String(email || '').trim(),
      abn: String(abn || '').trim(),
      bank_name: String(bank_name || '').trim(),
      bank_bsb: String(bank_bsb || '').trim(),
      bank_account: String(bank_account || '').trim(),
      pin: cleanPin,
      role: 'rep',
    });
    flash(req, res, `Account created for ${name}.`);
    res.redirect('/users');
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/reset-pin', requireAdmin, async (req, res, next) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      flash(req, res, 'User not found.', 'error');
      return res.redirect('/users');
    }
    const pin = String((req.body || {}).pin || '').trim();
    if (!/^\d{4}$/.test(pin)) {
      flash(req, res, 'PIN must be exactly 4 digits.', 'error');
      return res.redirect('/users');
    }
    await db.resetPin(user.id, pin);
    flash(req, res, `PIN reset for ${user.name}.`);
    res.redirect('/users');
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      flash(req, res, 'User not found.', 'error');
      return res.redirect('/users');
    }
    if (user.id === req.user.id) {
      flash(req, res, 'You cannot delete your own account.', 'error');
      return res.redirect('/users');
    }
    const hasInvoices = Number((await db.statsForUser(user.id)).count) > 0;
    if (hasInvoices) {
      flash(req, res, `Cannot delete ${user.name} — they have invoices on record.`, 'error');
      return res.redirect('/users');
    }
    await db.deleteUser(user.id);
    flash(req, res, `Removed ${user.name}.`);
    res.redirect('/users');
  } catch (err) {
    next(err);
  }
});

// ---------- Admin dashboard ----------

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const reps = await db.getReps();
    const allInvoices = await db.listInvoicesForAdmin({});
    const summary = await db.getAdminInvoiceSummary({});
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('admin-dashboard', {
      title: 'Admin dashboard',
      flash: flashMsg,
      reps,
      summary: {
        ...summary,
        totalText: fmtMoney(summary.total),
        draftValueText: fmtMoney(summary.draft_value),
        outstandingValueText: fmtMoney(summary.outstanding_value),
        paidValueText: fmtMoney(summary.paid_value),
      },
      admin: true,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin reports ----------

router.get('/admin/reports', requireAdmin, async (req, res, next) => {
  try {
    const reps = await db.getReps();
    const filters = {
      repId: req.query.rep || '',
      status: req.query.status || '',
      dateFrom: req.query.date_from || '',
      dateTo: req.query.date_to || '',
    };
    const invoices = await db.listInvoicesForAdmin(filters);
    const summary = await db.getAdminInvoiceSummary(filters);
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('admin-reports', {
      title: 'Invoice reports',
      flash: flashMsg,
      reps,
      filters,
      csvQuery: Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'),
      invoices: invoices.map((i) => ({
        ...i,
        totalText: fmtMoney(i.total),
        createdText: fmtDate(i.created_at),
        downloadedText: i.downloaded_at ? fmtDate(i.downloaded_at) : '—',
      })),
      summary: {
        ...summary,
        totalText: fmtMoney(summary.total),
        draftValueText: fmtMoney(summary.draft_value),
        outstandingValueText: fmtMoney(summary.outstanding_value),
        paidValueText: fmtMoney(summary.paid_value),
      },
      admin: true,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/reports/csv', requireAdmin, async (req, res, next) => {
  try {
    const filters = {
      repId: req.query.rep || '',
      status: req.query.status || '',
      dateFrom: req.query.date_from || '',
      dateTo: req.query.date_to || '',
    };
    const invoices = await db.listInvoicesForAdmin(filters);
    const header = ['Invoice number', 'Date created', 'Date downloaded', 'Rep name', 'Customer', 'Amount', 'Status'];
    const rows = invoices.map((i) => [
      i.invoice_number,
      fmtDate(i.created_at),
      i.downloaded_at ? fmtDate(i.downloaded_at) : '',
      i.rep_name,
      i.customer_name,
      fmtMoney(i.total),
      i.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.post('/admin/invoices/delete', requireAdmin, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.delete_ids) ? req.body.delete_ids : [req.body.delete_ids];
    const deleted = await db.deleteInvoices(ids);
    flash(req, res, deleted ? `${deleted} invoice${deleted === 1 ? '' : 's'} deleted.` : 'No invoices selected.', deleted ? 'success' : 'error');
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// ---------- Admin user creation ----------

router.post('/admin/users/create-admin', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, name, email } = req.body || {};
    if (!username || !password || !name) {
      flash(req, res, 'Username, password, and name are required.', 'error');
      return res.redirect('/users');
    }
    const existing = await db.getUserByUsername(String(username).trim());
    if (existing) {
      flash(req, res, 'A user with that username already exists.', 'error');
      return res.redirect('/users');
    }
    await db.createAdminUser({
      username: String(username).trim(),
      password: String(password),
      name: String(name).trim(),
      email: String(email || '').trim(),
      role: 'admin',
    });
    flash(req, res, `Admin account created for ${name}.`);
    res.redirect('/users');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/users/create-rep', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, abn, bank_name, bank_bsb, bank_account, pin } = req.body || {};
    if (!name || !pin) {
      flash(req, res, 'Name and PIN are required.', 'error');
      return res.redirect('/users');
    }
    const cleanPin = String(pin).trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      flash(req, res, 'PIN must be exactly 4 digits.', 'error');
      return res.redirect('/users');
    }
    const username = String(name).trim().toLowerCase().replace(/\s+/g, '.');
    const existing = await db.getUserByUsername(username);
    if (existing) {
      flash(req, res, 'A user with that name already exists.', 'error');
      return res.redirect('/users');
    }
    await db.createRepUser({
      name: String(name).trim(),
      email: String(email || '').trim(),
      abn: String(abn || '').trim(),
      bank_name: String(bank_name || '').trim(),
      bank_bsb: String(bank_bsb || '').trim(),
      bank_account: String(bank_account || '').trim(),
      pin: cleanPin,
    });
    flash(req, res, `Rep account created for ${name}.`);
    res.redirect('/users');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
