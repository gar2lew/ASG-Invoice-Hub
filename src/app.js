require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const { currentUser } = require('./middleware');
const { fmtMoney, fmtDate, fmtDateLong } = require('./helpers');

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Fail fast in production if required secrets are missing
const requiredProdEnv = ['SESSION_SECRET'];
if (process.env.NODE_ENV === 'production') {
  for (const key of requiredProdEnv) {
    if (!process.env[key]) {
      console.error(`FATAL: Required environment variable ${key} is not set`);
      process.exit(1);
    }
  }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
}));

app.locals.fmtMoney = fmtMoney;
app.locals.fmtDate = fmtDate;
app.locals.fmtDateLong = fmtDateLong;

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(currentUser);

app.use(require('../routes/auth'));
app.use(require('../routes/pages'));
app.use(require('../routes/invoices'));
app.use(require('../routes/admin'));

app.use((req, res) => {
  res.status(404).render('notfound', { title: 'Not found', flash: null });
});

app.use((req, res, next) => {
  console.log('ROUTE HIT', req.method, req.originalUrl);
  next();
});

app.use((err, req, res, next) => {
  const ts = new Date().toISOString();
  const safeMessage = err && err.message ? err.message : 'Unknown error';
  const logEntry = {
    ts,
    method: req.method,
    url: req.originalUrl,
    userId: req.session && req.session.userId ? req.session.userId : null,
    error: safeMessage,
    stack: process.env.NODE_ENV === 'production' ? undefined : (err && err.stack ? err.stack : undefined),
  };
  console.error('[ERROR]', JSON.stringify(logEntry));
  if (res.headersSent) return next(err);
  res.status(500).send(`Something went wrong: ${safeMessage}`);
});

module.exports = app;
