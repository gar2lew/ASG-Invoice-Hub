const db = require('./db');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const user = await db.getUserById(req.session.userId);
    if (!user || user.role !== 'admin') {
      req.session.flash = { type: 'error', text: 'You need administrator access for that.' };
      return res.redirect('/');
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function currentUser(req, res, next) {
  if (req.session.userId) {
    try {
      const user = await db.getUserById(req.session.userId);
      if (user) req.user = user;
      else req.session = null;
    } catch (err) {
      return next(err);
    }
  }
  res.locals.currentUser = req.user || null;
  next();
}

function flash(req, res, text, type = 'success') {
  req.session.flash = { type, text };
}

module.exports = { requireAuth, requireAdmin, currentUser, flash };
