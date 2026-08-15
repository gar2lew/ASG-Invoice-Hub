const express = require('express');
const db = require('../src/db');
const { requireAdmin, flash } = require('../src/middleware');
const { fmtMoney, fmtDate } = require('../src/helpers');

const router = express.Router();

router.get('/settings', requireAdmin, (req, res) => {
  const settings = db.getSettings();
  const flashMsg = req.session.flash || null;
  req.session.flash = null;
  res.render('settings', {
    title: 'Settings',
    flash: flashMsg,
    settings,
    mailEnabled: require('../src/mail').isMailConfigured(),
  });
});

router.post('/settings', requireAdmin, (req, res) => {
  db.updateSettings(req.body || {});
  flash(req, res, 'Settings saved. New invoices will use these details.');
  res.redirect('/settings');
});

router.get('/users', requireAdmin, (req, res) => {
  const users = db.getUsers().map((u) => ({ ...u, createdText: fmtDate(u.created_at.slice(0, 10)) }));
  const totals = db.repTotals();
  const totalsMap = {};
  totals.forEach((t) => { totalsMap[t.id] = { count: t.count, totalText: fmtMoney(t.total) }; });
  const flashMsg = req.session.flash || null;
  req.session.flash = null;
  res.render('users', {
    title: 'Sales reps',
    flash: flashMsg,
    users: users.map((u) => ({ ...u, ...(totalsMap[u.id] || { count: 0, totalText: '$0.00' }) })),
    error: null,
  });
});

router.post('/users', requireAdmin, (req, res) => {
  const { username, name, email, password, role } = req.body || {};
  if (!username || !name || !password) {
    flash(req, res, 'Username, name and password are required.', 'error');
    return res.redirect('/users');
  }
  if (db.getUserByUsername(String(username).trim())) {
    flash(req, res, `Username "${username}" is already taken.`, 'error');
    return res.redirect('/users');
  }
  db.createUser({
    username: String(username).trim(),
    password: String(password),
    name: String(name).trim(),
    email: String(email || '').trim(),
    role: role === 'admin' ? 'admin' : 'rep',
  });
  flash(req, res, `Account created for ${name}.`);
  res.redirect('/users');
});

router.post('/users/:id/reset', requireAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    flash(req, res, 'User not found.', 'error');
    return res.redirect('/users');
  }
  const password = String((req.body || {}).password || '');
  if (password.length < 4) {
    flash(req, res, 'New password must be at least 4 characters.', 'error');
    return res.redirect('/users');
  }
  db.resetPassword(user.id, password);
  flash(req, res, `Password reset for ${user.name}.`);
  res.redirect('/users');
});

router.post('/users/:id/delete', requireAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    flash(req, res, 'User not found.', 'error');
    return res.redirect('/users');
  }
  if (user.id === req.user.id) {
    flash(req, res, 'You cannot delete your own account.', 'error');
    return res.redirect('/users');
  }
  const hasInvoices = db.statsForUser(user.id).count > 0;
  if (hasInvoices) {
    flash(req, res, `Cannot delete ${user.name} — they have invoices on record.`, 'error');
    return res.redirect('/users');
  }
  db.deleteUser(user.id);
  flash(req, res, `Removed ${user.name}.`);
  res.redirect('/users');
});

module.exports = router;
