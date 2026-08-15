const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(process.cwd(), 'data');
const INVOICE_DIR = path.join(DATA_DIR, 'invoices');
const DB_PATH = path.join(DATA_DIR, 'invoices.db');

let db;

function initDb() {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'rep',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT DEFAULT '',
      company_abn TEXT DEFAULT '',
      company_address TEXT DEFAULT '',
      company_phone TEXT DEFAULT '',
      company_email TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_bsb TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      accounts_email TEXT DEFAULT '',
      invoice_prefix TEXT DEFAULT 'INV',
      next_invoice_number INTEGER DEFAULT 1,
      payment_terms TEXT DEFAULT 'Payment due within 14 days',
      footer_note TEXT DEFAULT 'Thank you for your business.'
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      template TEXT NOT NULL DEFAULT 'standard',
      customer_name TEXT NOT NULL,
      customer_company TEXT DEFAULT '',
      customer_email TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      issue_date TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tax_rate REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      pdf_path TEXT NOT NULL,
      sent_at TEXT DEFAULT '',
      paid_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );
  `);
  db.pragma('foreign_keys = ON');
  seed();
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, name, email, role) VALUES (?,?,?,?,?)')
      .run(username, hash, 'Administrator', process.env.ADMIN_EMAIL || '', 'admin');
    console.log(`Seeded admin user: ${username}`);
  }
  const s = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!s) db.prepare('INSERT INTO settings (id) VALUES (1)').run();
}

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function updateSettings(patch) {
  const s = getSettings();
  const allowed = [
    'company_name', 'company_abn', 'company_address', 'company_phone', 'company_email',
    'bank_name', 'bank_bsb', 'bank_account', 'accounts_email', 'invoice_prefix',
    'payment_terms', 'footer_note',
  ];
  const values = allowed.map((k) => (k in patch ? String(patch[k] ?? '') : s[k]));
  db.prepare(`UPDATE settings SET ${allowed.map((k) => `${k} = ?`).join(', ')} WHERE id = 1`).run(...values);
}

function nextInvoiceNumber() {
  const s = getSettings();
  const prefix = s.invoice_prefix || 'INV';
  const num = s.next_invoice_number;
  db.prepare('UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1').run();
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

function getUsers() {
  return db.prepare('SELECT id, username, name, email, role, created_at FROM users ORDER BY name').all();
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, name, email, role, created_at FROM users WHERE id = ?').get(id);
}

function createUser({ username, password, name, email, role }) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash, name, email, role) VALUES (?,?,?,?,?)')
    .run(username, hash, name, email, role || 'rep');
}

function resetPassword(id, password) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function createInvoice(tx) {
  const invoice_number = nextInvoiceNumber();
  const filename = `${invoice_number}-${tx.template}.pdf`;
  const pdf_path = path.join('invoices', filename).split(path.sep).join('/');
  const insert = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO invoices
        (invoice_number, user_id, template, customer_name, customer_company, customer_email,
         customer_address, issue_date, due_date, notes, tax_rate, subtotal, tax_amount, total, status, pdf_path)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      invoice_number, tx.user_id, tx.template, tx.customer_name, tx.customer_company, tx.customer_email,
      tx.customer_address, tx.issue_date, tx.due_date, tx.notes, tx.tax_rate,
      tx.subtotal, tx.tax_amount, tx.total, tx.status, pdf_path,
    );
    const invoiceId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?,?,?,?,?)
    `);
    for (const item of tx.items) {
      insertItem.run(invoiceId, item.description, item.quantity, item.rate, item.amount);
    }
    return invoiceId;
  });
  const id = insert();
  return { id, invoice_number, pdf_path };
}

function getInvoice(id) {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
}

function getInvoiceByNumber(number) {
  return db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(number);
}

function getItems(invoiceId) {
  return db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(invoiceId);
}

function listInvoices({ userId, admin }) {
  const sql = `
    SELECT i.*, u.name AS rep_name
    FROM invoices i
    JOIN users u ON u.id = i.user_id
    ${admin ? '' : 'WHERE i.user_id = ?'}
    ORDER BY i.created_at DESC, i.id DESC
  `;
  return admin ? db.prepare(sql).all() : db.prepare(sql).all(userId);
}

function setInvoiceStatus(id, status) {
  const stamp = new Date().toISOString();
  if (status === 'sent') db.prepare("UPDATE invoices SET status = 'sent', sent_at = ? WHERE id = ?").run(stamp, id);
  else if (status === 'paid') db.prepare("UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ?").run(stamp, id);
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

function statsForUser(userId) {
  return db.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS drafts,
      COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
      COALESCE(SUM(total), 0) AS total
    FROM invoices
    WHERE user_id = ?
  `).get(userId);
}

function statsForUserSince(userId, from, to) {
  return db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
    FROM invoices
    WHERE user_id = ? AND issue_date >= ? AND issue_date <= ?
  `).get(userId, from, to);
}

function recentInvoices(userId, limit) {
  return db.prepare(`
    SELECT i.*, u.name AS rep_name FROM invoices i
    JOIN users u ON u.id = i.user_id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC, i.id DESC LIMIT ?
  `).all(userId, limit);
}

function repTotals() {
  return db.prepare(`
    SELECT u.id, u.name, COUNT(i.id) AS count, COALESCE(SUM(i.total), 0) AS total
    FROM users u LEFT JOIN invoices i ON i.user_id = u.id
    GROUP BY u.id ORDER BY total DESC
  `).all();
}

module.exports = {
  initDb,
  getSettings,
  updateSettings,
  nextInvoiceNumber,
  getUsers,
  getUserByUsername,
  getUserById,
  createUser,
  resetPassword,
  deleteUser,
  createInvoice,
  getInvoice,
  getInvoiceByNumber,
  getItems,
  listInvoices,
  setInvoiceStatus,
  deleteInvoice,
  statsForUser,
  statsForUserSince,
  recentInvoices,
  repTotals,
};
