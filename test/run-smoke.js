const path = require('path');
const assert = require('assert');
const bcrypt = require('bcryptjs');

process.env.PG_DRIVER = path.join(__dirname, 'pg-mem-driver.js');

const db = require('../src/db');

function log(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  await db.initDb();

  let settings = await db.getSettings();
  log(settings && settings.invoice_prefix === 'INV', 'settings seeded with default prefix');

  const admin = await db.getUserByUsername('admin');
  log(Boolean(admin) && admin.role === 'admin', 'admin user seeded');
  log(bcrypt.compareSync('changeme', admin.password_hash), 'admin password hashes correctly');

  await db.createUser({ username: 'rep1', password: 'secret1', name: 'Rep One', email: 'rep1@co.com', role: 'rep' });
  const rep = await db.getUserByUsername('rep1');
  log(Boolean(rep) && rep.name === 'Rep One', 'rep user created');
  log(bcrypt.compareSync('secret1', rep.password_hash), 'rep password verifies');

  const created = await db.createInvoice({
    user_id: rep.id,
    template: 'standard',
    customer_name: 'Acme Pty Ltd',
    customer_company: 'Acme Corp',
    customer_email: 'accounts@acme.com',
    customer_address: '12 Smith St, Sydney',
    issue_date: '2026-08-14',
    due_date: '2026-08-28',
    notes: 'Weekly delivery',
    tax_rate: 0.1,
    subtotal: 1000,
    tax_amount: 100,
    total: 1100,
    status: 'draft',
    items: [
      { description: 'Delivery', quantity: 2, rate: 250, amount: 500 },
      { description: 'Support', quantity: 1, rate: 500, amount: 500 },
    ],
  });
  log(created.invoice_number === 'INV-0001', `first invoice numbered ${created.invoice_number}`);

  const inv2 = await db.createInvoice({
    user_id: rep.id,
    template: 'compact',
    customer_name: 'Beta Co',
    issue_date: '2026-08-14',
    tax_rate: 0,
    subtotal: 50,
    tax_amount: 0,
    total: 50,
    status: 'draft',
    items: [{ description: 'Retainer', quantity: 1, rate: 50, amount: 50 }],
  });
  log(inv2.invoice_number === 'INV-0002', 'invoice numbers are sequential');

  const invoice = await db.getInvoice(created.id);
  log(invoice.customer_name === 'Acme Pty Ltd' && invoice.user_id === rep.id, 'invoice persisted');

  const items = await db.getItems(created.id);
  log(items.length === 2 && items[0].amount === 500, 'line items persisted');

  const repList = await db.listInvoices({ userId: rep.id, admin: false });
  const adminList = await db.listInvoices({ userId: admin.id, admin: true });
  log(repList.length === 2 && adminList.length === 2, 'list scopes correctly');
  log(Boolean(repList[0].rep_name), 'rep name joined onto list rows');

  await db.setInvoiceStatus(created.id, 'sent');
  const sent = await db.getInvoice(created.id);
  log(sent.status === 'sent' && Boolean(sent.sent_at), 'status updates to sent with timestamp');

  await db.setInvoiceStatus(created.id, 'paid');
  const stats = await db.statsForUser(rep.id);
  log(Number(stats.paid) === 1 && Number(stats.total) === 1150, 'stats reflect totals and status');

  const week = await db.statsForUserSince(rep.id, '2026-08-10', '2026-08-16');
  log(Number(week.total) === 1150 && Number(week.count) === 2, 'week window stats');

  await db.updateSettings({ company_name: 'ASG Sales Pty Ltd', accounts_email: 'accounts@asg.com.au', next_invoice_number: 50 });
  settings = await db.getSettings();
  log(settings.company_name === 'ASG Sales Pty Ltd', 'settings update persisted');
  log(Number(settings.next_invoice_number) === 50, 'next invoice number updates');

  const inv3 = await db.createInvoice({
    user_id: rep.id,
    template: 'standard',
    customer_name: 'Numbering Co',
    issue_date: '2026-08-15',
    tax_rate: 0,
    subtotal: 10,
    tax_amount: 0,
    total: 10,
    status: 'draft',
    items: [{ description: 'Item', quantity: 1, rate: 10, amount: 10 }],
  });
  log(inv3.invoice_number === 'INV-0050', 'numbering continues from setting value');
  await db.deleteInvoice(inv3.id);

  const totals = await db.repTotals();
  log(totals.some((t) => t.id === rep.id && Number(t.total) === 1150), 'rep totals aggregate');

  await db.deleteInvoice(created.id);
  await db.deleteInvoice(inv2.id);
  const afterDelete = await db.listInvoices({ userId: rep.id, admin: false });
  log(afterDelete.length === 0, 'invoices deleted');

  await db.resetPassword(rep.id, 'newpass');
  const updated = await db.getUserByUsername('rep1');
  log(bcrypt.compareSync('newpass', updated.password_hash), 'password reset works');

  await db.deleteUser(rep.id);
  const gone = await db.getUserByUsername('rep1');
  log(!gone, 'rep user deleted');

  console.log('\nSmoke test finished.');
}

main().catch((err) => {
  console.error('FAIL  exception:', err);
  process.exitCode = 1;
});
