require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const db = require('./src/db');
const { currentUser } = require('./src/middleware');
const { fmtMoney, fmtDate, fmtDateLong } = require('./src/helpers');

const PORT = Number(process.env.PORT || 3000);

db.initDb();

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
}));

app.locals.fmtMoney = fmtMoney;
app.locals.fmtDate = fmtDate;
app.locals.fmtDateLong = fmtDateLong;

app.use(express.static(path.join(__dirname, 'public')));
app.use(currentUser);

app.use(require('./routes/auth'));
app.use(require('./routes/pages'));
app.use(require('./routes/invoices'));
app.use(require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('notfound', { title: 'Not found', flash: null });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => {
  console.log(`Invoice Hub running at http://localhost:${PORT}`);
});
