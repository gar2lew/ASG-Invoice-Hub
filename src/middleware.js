const db = require('./db');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  const user = db.getUserById(req.session.userId);
  if (!user || user.role !== 'admin') {
    req.session.flash = { type: 'error', text: 'You need administrator access for that.' };
    return res.redirect('/');
  }
  next();
}

function currentUser(req, res, next) {
  if (req.session.userId) {
    const user = db.getUserById(req.session.userId);
    if (user) req.user = user;
    else req.session = null;
  }
  res.locals.currentUser = req.user || null;
  next();
}

function flash(req, res, text, type = 'success') {
  req.session.flash = { type, text };
}

module.exports = { requireAuth, requireAdmin, currentUser, flash };
