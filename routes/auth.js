const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { flash } = require('../src/middleware');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  const flashMsg = req.session.flash || null;
  req.session.flash = null;
  res.render('login', { title: 'Sign in', flash: flashMsg, error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = username ? db.getUserByUsername(String(username).trim()) : null;
  if (!user || !password || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).render('login', {
      title: 'Sign in',
      flash: null,
      error: 'Incorrect username or password.',
    });
  }
  req.session.userId = user.id;
  req.session.regenerate = true;
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
