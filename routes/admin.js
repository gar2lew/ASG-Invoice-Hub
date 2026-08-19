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
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('users', {
      title: 'Sales reps',
      flash: flashMsg,
      users: users.map((u) => ({
        ...u,
        createdText: fmtDate(u.created_at),
        ...(totalsMap[u.id] || { count: 0, totalText: '$0.00' }),
      })),
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, abn, pin } = req.body || {};
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

module.exports = router;
