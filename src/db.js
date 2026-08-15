const bcrypt = require('bcryptjs');

let pool = null;
let readyPromise = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'rep',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    id SERIAL PRIMARY KEY,
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
    tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    sent_at TEXT DEFAULT '',
    paid_at TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
    rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0
  );
`;

function loadPg() {
  if (process.env.PG_DRIVER) return require(process.env.PG_DRIVER);
  return require('pg');
}

function getPool() {
  if (!pool) {
    const { Pool } = loadPg();
    const opts = {};
    if (!process.env.PG_DRIVER) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error('DATABASE_URL is not set. Create a Postgres database and set DATABASE_URL in the environment.');
      }
      opts.connectionString = url;
      opts.ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
      opts.max = 5;
      opts.connectionTimeoutMillis = 10000;
      opts.idleTimeoutMillis = 30000;
    }
    pool = new Pool(opts);
    pool.on('error', (err) => {
      console.error('pg pool error:', err.message);
    });
  }
  return pool;
}

async function initDb() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const p = getPool();
    await p.query(SCHEMA);
    await p.query("INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
    await ensureAdmin();
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

async function ensureAdmin() {
  const p = getPool();
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  const envEmail = process.env.ADMIN_EMAIL || '';

  const adminExists = await p.query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
  if (Number(adminExists.rows[0].c) === 0) {
    const username = envUser || 'admin';
    const password = envPass || 'changeme';
    const hash = bcrypt.hashSync(password, 10);
    await p.query('INSERT INTO users (username, password_hash, name, email, role) VALUES ($1,$2,$3,$4,$5)',
      [username, hash, 'Administrator', envEmail, 'admin']);
    console.log(`Seeded admin user: ${username}`);
    return;
  }

  if (envUser && envPass) {
    const existing = await p.query('SELECT id FROM users WHERE username = $1', [envUser]);
    const hash = bcrypt.hashSync(envPass, 10);
    if (existing.rows.length) {
      await p.query('UPDATE users SET password_hash = $1, email = $2, role = $3 WHERE id = $4',
        [hash, envEmail, 'admin', existing.rows[0].id]);
      console.log(`Admin credentials applied from environment: ${envUser}`);
    } else {
      await p.query('INSERT INTO users (username, password_hash, name, email, role) VALUES ($1,$2,$3,$4,$5)',
        [envUser, hash, 'Administrator', envEmail, 'admin']);
      console.log(`Admin account created from environment: ${envUser}`);
    }
  }
}

async function ensureReady() {
  await initDb();
}

function sqlArgs(n) {
  return Array.from({ length: n }, (_, i) => `$${i + 1}`);
}

async function getSettings() {
  await ensureReady();
  const r = await getPool().query('SELECT * FROM settings WHERE id = 1');
  return r.rows[0];
}

async function updateSettings(patch) {
  await ensureReady();
  const allowed = [
    'company_name', 'company_abn', 'company_address', 'company_phone', 'company_email',
    'bank_name', 'bank_bsb', 'bank_account', 'accounts_email', 'invoice_prefix',
    'payment_terms', 'footer_note', 'next_invoice_number',
  ];
  const cols = [];
  const values = [];
  for (const k of allowed) {
    if (!(k in patch)) continue;
    let v = String(patch[k] ?? '');
    if (k === 'next_invoice_number') {
      const n = parseInt(v, 10);
      if (Number.isNaN(n) || n < 1) continue;
      v = n;
    }
    cols.push(`${k} = $${cols.length + 1}`);
    values.push(v);
  }
  if (cols.length) {
    await getPool().query(`UPDATE settings SET ${cols.join(', ')} WHERE id = 1`, values);
  }
}

async function getUsers() {
  await ensureReady();
  const r = await getPool().query('SELECT id, username, name, email, role, created_at FROM users ORDER BY name');
  return r.rows;
}

async function getUserByUsername(username) {
  await ensureReady();
  const r = await getPool().query('SELECT * FROM users WHERE username = $1', [username]);
  return r.rows[0];
}

async function getUserById(id) {
  await ensureReady();
  const r = await getPool().query('SELECT id, username, name, email, role, created_at FROM users WHERE id = $1', [id]);
  return r.rows[0];
}

async function createUser({ username, password, name, email, role }) {
  await ensureReady();
  const hash = bcrypt.hashSync(password, 10);
  await getPool().query('INSERT INTO users (username, password_hash, name, email, role) VALUES ($1,$2,$3,$4,$5)',
    [username, hash, name, email, role || 'rep']);
}

async function resetPassword(id, password) {
  await ensureReady();
  const hash = bcrypt.hashSync(password, 10);
  await getPool().query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
}

async function deleteUser(id) {
  await ensureReady();
  await getPool().query('DELETE FROM users WHERE id = $1', [id]);
}

async function createInvoice(tx) {
  await ensureReady();
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const num = await client.query(
      'UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1 RETURNING invoice_prefix, next_invoice_number',
    );
    const { invoice_prefix, next_invoice_number } = num.rows[0];
    const invoice_number = `${invoice_prefix}-${String(Number(next_invoice_number) - 1).padStart(4, '0')}`;

    const ins = await client.query(
      `INSERT INTO invoices
        (invoice_number, user_id, template, customer_name, customer_company, customer_email,
         customer_address, issue_date, due_date, notes, tax_rate, subtotal, tax_amount, total, status)
       VALUES (${sqlArgs(15).join(', ')}) RETURNING id`,
      [
        invoice_number, tx.user_id, tx.template, tx.customer_name, tx.customer_company, tx.customer_email,
        tx.customer_address, tx.issue_date, tx.due_date, tx.notes, tx.tax_rate,
        tx.subtotal, tx.tax_amount, tx.total, tx.status,
      ],
    );
    const invoiceId = Number(ins.rows[0].id);
    for (const item of tx.items) {
      await client.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES ($1,$2,$3,$4,$5)',
        [invoiceId, item.description, item.quantity, item.rate, item.amount],
      );
    }
    await client.query('COMMIT');
    return { id: invoiceId, invoice_number };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getInvoice(id) {
  await ensureReady();
  const r = await getPool().query('SELECT * FROM invoices WHERE id = $1', [id]);
  return r.rows[0];
}

async function getInvoiceByNumber(number) {
  await ensureReady();
  const r = await getPool().query('SELECT * FROM invoices WHERE invoice_number = $1', [number]);
  return r.rows[0];
}

async function getItems(invoiceId) {
  await ensureReady();
  const r = await getPool().query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id', [invoiceId]);
  return r.rows;
}

async function listInvoices({ userId, admin }) {
  await ensureReady();
  const sql = `
    SELECT i.*, u.name AS rep_name
    FROM invoices i
    JOIN users u ON u.id = i.user_id
    ${admin ? '' : 'WHERE i.user_id = $1'}
    ORDER BY i.created_at DESC, i.id DESC
  `;
  const r = admin ? await getPool().query(sql) : await getPool().query(sql, [userId]);
  return r.rows;
}

async function setInvoiceStatus(id, status) {
  await ensureReady();
  const stamp = new Date().toISOString();
  if (status === 'sent') {
    await getPool().query("UPDATE invoices SET status = 'sent', sent_at = $1 WHERE id = $2", [stamp, id]);
  } else if (status === 'paid') {
    await getPool().query("UPDATE invoices SET status = 'paid', paid_at = $1 WHERE id = $2", [stamp, id]);
  }
}

async function deleteInvoice(id) {
  await ensureReady();
  await getPool().query('DELETE FROM invoices WHERE id = $1', [id]);
}

async function statsForUser(userId) {
  await ensureReady();
  const r = await getPool().query(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS drafts,
      COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
      COALESCE(SUM(total), 0) AS total
    FROM invoices
    WHERE user_id = $1
  `, [userId]);
  return r.rows[0];
}

async function statsForUserSince(userId, from, to) {
  await ensureReady();
  const r = await getPool().query(`
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
    FROM invoices
    WHERE user_id = $1 AND issue_date >= $2 AND issue_date <= $3
  `, [userId, from, to]);
  return r.rows[0];
}

async function recentInvoices(userId, limit) {
  await ensureReady();
  const r = await getPool().query(`
    SELECT i.*, u.name AS rep_name FROM invoices i
    JOIN users u ON u.id = i.user_id
    WHERE i.user_id = $1
    ORDER BY i.created_at DESC, i.id DESC LIMIT $2
  `, [userId, limit]);
  return r.rows;
}

async function repTotals() {
  await ensureReady();
  const r = await getPool().query(`
    SELECT u.id, u.name, COUNT(i.id) AS count, COALESCE(SUM(i.total), 0) AS total
    FROM users u LEFT JOIN invoices i ON i.user_id = u.id
    GROUP BY u.id ORDER BY total DESC
  `);
  return r.rows;
}

module.exports = {
  initDb,
  ensureAdmin,
  getSettings,
  updateSettings,
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
