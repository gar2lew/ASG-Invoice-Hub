const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { flash } = require('../src/middleware');

const router = express.Router();

router.get('/login', async (req, res) => {
  if (req.session.userId) return res.redirect('/');
  const flashMsg = req.session.flash || null;
  req.session.flash = null;
  const reps = await db.getReps();
  res.render('login', { title: 'Sign in', flash: flashMsg, error: null, reps });
});

router.post('/login', async (req, res, next) => {
  try {
    const { login_type, username, password, user_id, pin } = req.body;
    const flashMsg = null;

    if (login_type === 'admin') {
      const user = username ? await db.getUserByUsername(String(username).trim()) : null;
      if (!user || !password || !bcrypt.compareSync(String(password), user.password_hash)) {
        const reps = await db.getReps();
        return res.status(401).render('login', {
          title: 'Sign in', flash: null, error: 'Incorrect username or password.', reps,
        });
      }
      req.session.userId = user.id;
      return res.redirect('/');
    }

    if (login_type === 'rep') {
      const userId = Number(user_id);
      if (!userId || !pin) {
        const reps = await db.getReps();
        return res.status(401).render('login', {
          title: 'Sign in', flash: null, error: 'Select your name and enter your PIN.', reps,
        });
      }
      const user = await db.getUserForAuth(userId);
      if (!user || user.role !== 'rep' || !user.pin_hash || !bcrypt.compareSync(String(pin), user.pin_hash)) {
        const reps = await db.getReps();
        return res.status(401).render('login', {
          title: 'Sign in', flash: null, error: 'Incorrect PIN.', reps,
        });
      }
      req.session.userId = user.id;
      return res.redirect('/');
    }

    const reps = await db.getReps();
    res.status(400).render('login', {
      title: 'Sign in', flash: null, error: 'Please choose how you want to sign in.', reps,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signup', async (req, res) => {
  if (req.session.userId) return res.redirect('/');
  const flashMsg = req.session.flash || null;
  req.session.flash = null;
  res.render('signup', { title: 'Create account', flash: flashMsg, error: null });
});

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, abn, pin, pin_confirm } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanAbn = String(abn || '').trim();
    const cleanPin = String(pin || '').trim();
    const cleanPinConfirm = String(pin_confirm || '').trim();

    if (!cleanName || !cleanPin) {
      return res.status(400).render('signup', {
        title: 'Create account', flash: null, error: 'Name and PIN are required.',
      });
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).render('signup', {
        title: 'Create account', flash: null, error: 'PIN must be exactly 4 digits.',
      });
    }
    if (cleanPin !== cleanPinConfirm) {
      return res.status(400).render('signup', {
        title: 'Create account', flash: null, error: 'PINs do not match.',
      });
    }

    const username = cleanName.toLowerCase().replace(/\s+/g, '.');
    const existing = await db.getUserByUsername(username);
    if (existing) {
      return res.status(400).render('signup', {
        title: 'Create account', flash: null, error: 'An account with that name already exists.',
      });
    }

    await db.createUser({
      username,
      password: cleanPin,
      name: cleanName,
      email: cleanEmail,
      abn: cleanAbn,
      pin: cleanPin,
      role: 'rep',
    });

    req.session.flash = { type: 'success', text: 'Account created! You can now sign in.' };
    res.redirect('/login');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
