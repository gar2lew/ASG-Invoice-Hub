const path = require('path');
const assert = require('assert');
const bcrypt = require('bcryptjs');

process.env.PG_DRIVER = path.join(__dirname, 'pg-mem-driver.js');

const db = require('../src/db');
const mail = require('../src/mail');

function log(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  await db.initDb();

  log(mail.getInvoiceRecipients() === 'natalie@sjssolutionscorp.com.au', 'invoice recipient is Natalie');

  let settings = await db.getSettings();
  log(settings && settings.invoice_prefix === 'INV', 'settings seeded with default prefix');

  const admin = await db.getUserByUsername('admin');
  log(Boolean(admin) && admin.role === 'admin', 'admin user seeded');
  log(bcrypt.compareSync('changeme', admin.password_hash), 'admin password hashes correctly');

  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'override123';
  await db.ensureAdmin();
  const admin2 = await db.getUserByUsername('admin');
  log(bcrypt.compareSync('override123', admin2.password_hash), 'env credentials override existing admin');

  process.env.ADMIN_PASSWORD = '';
  await db.ensureAdmin();
  const admin3 = await db.getUserByUsername('admin');
  log(bcrypt.compareSync('override123', admin3.password_hash), 'empty env leaves admin password untouched');

  process.env.ADMIN_USERNAME = 'newadmin';
  process.env.ADMIN_PASSWORD = 'newpass456';
  await db.ensureAdmin();
  const admin4 = await db.getUserByUsername('newadmin');
  log(Boolean(admin4) && admin4.role === 'admin' && bcrypt.compareSync('newpass456', admin4.password_hash),
    'new admin username from env creates a second admin');
  process.env.ADMIN_USERNAME = '';
  process.env.ADMIN_PASSWORD = '';

  await db.createUser({ username: 'rep1', password: 'secret1', name: 'Rep One', email: 'rep1@co.com', abn: '12 345 678 901', bank_name: 'Test Bank', bank_bsb: '123456', bank_account: '12345678', pin: '1234', role: 'rep' });
  const rep = await db.getUserByUsername('rep1');
  log(Boolean(rep) && rep.name === 'Rep One', 'rep user created');
  log(bcrypt.compareSync('secret1', rep.password_hash), 'rep password verifies');
  log(rep.abn === '12 345 678 901', 'rep ABN stored');
  log(rep.bank_name === 'Test Bank' && rep.bank_bsb === '123456' && rep.bank_account === '12345678', 'rep bank details stored');
  const repAuth = await db.getUserForAuth(rep.id);
  log(Boolean(repAuth.pin_hash) && bcrypt.compareSync('1234', repAuth.pin_hash), 'rep PIN hashes correctly');

  const reps = await db.getReps();
  log(reps.length === 1 && reps[0].name === 'Rep One', 'getReps returns reps only');

  await db.resetPin(rep.id, '5678');
  const repAuth2 = await db.getUserForAuth(rep.id);
  log(bcrypt.compareSync('5678', repAuth2.pin_hash), 'resetPin updates PIN hash');

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

  await db.updateSettings({ company_name: 'ASG Sales Pty Ltd', accounts_email: 'accounts@asg.com.au' });
  settings = await db.getSettings();
  log(settings.company_name === 'ASG Sales Pty Ltd', 'settings update persisted');

  // Per-rep numbering: first invoice for a new rep should auto-generate
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
  // Since rep already has invoices, should continue from their sequence
  log(inv3.invoice_number === 'INV-0003', `continues from rep sequence, got ${inv3.invoice_number}`);
  await db.deleteInvoice(inv3.id);

  // Regression: userSuppliedNumber from form must NOT be trusted unless it's the first invoice
  const inv4 = await db.createInvoice({
    user_id: rep.id,
    template: 'standard',
    userSuppliedNumber: 'INV-0099', // attempt to force a specific number (should be ignored - not first invoice)
    customer_name: 'Trusted Number Co',
    issue_date: '2026-08-16',
    tax_rate: 0,
    subtotal: 100,
    tax_amount: 0,
    total: 100,
    status: 'draft',
    items: [{ description: 'Test', quantity: 1, rate: 100, amount: 100 }],
  });
  log(inv4.invoice_number !== 'INV-0099', 'userSuppliedNumber is ignored when not first invoice');
  log(inv4.invoice_number === 'INV-0004', `allocated from rep counter, got ${inv4.invoice_number}`);

  // Regression: two rapid creates never collide
  const inv5 = await db.createInvoice({
    user_id: rep.id,
    template: 'standard',
    userSuppliedNumber: 'INV-0099',
    customer_name: 'Second Co',
    issue_date: '2026-08-17',
    tax_rate: 0,
    subtotal: 200,
    tax_amount: 0,
    total: 200,
    status: 'draft',
    items: [{ description: 'Test 2', quantity: 1, rate: 200, amount: 200 }],
  });
  log(inv5.invoice_number !== inv4.invoice_number, 'consecutive creates get unique numbers');
  log(inv5.invoice_number === 'INV-0005', `second gets next counter, got ${inv5.invoice_number}`);
  await db.deleteInvoice(inv4.id);
  await db.deleteInvoice(inv5.id);

  // Test first-invoice starting number workflow
  // Create a new rep with no invoices
  await db.createUser({ username: 'rep2', password: 'secret2', name: 'Rep Two', email: 'rep2@co.com', abn: '98 765 432 109', bank_name: 'Bank B', bank_bsb: '654321', bank_account: '87654321', pin: '4321', role: 'rep' });
  const rep2 = await db.getUserByUsername('rep2');
  
  // First invoice with user-supplied starting number
  const firstInv = await db.createInvoice({
    user_id: rep2.id,
    template: 'standard',
    userSuppliedNumber: 'INV-0045',
    customer_name: 'First Customer',
    issue_date: '2026-08-20',
    tax_rate: 0,
    subtotal: 500,
    tax_amount: 0,
    total: 500,
    status: 'draft',
    items: [{ description: 'Service', quantity: 1, rate: 500, amount: 500 }],
  });
  log(firstInv.invoice_number === 'INV-0045', `first invoice uses supplied number ${firstInv.invoice_number}`);
  
  // Second invoice should auto-generate next number
  const secondInv = await db.createInvoice({
    user_id: rep2.id,
    template: 'standard',
    customer_name: 'Second Customer',
    issue_date: '2026-08-21',
    tax_rate: 0,
    subtotal: 300,
    tax_amount: 0,
    total: 300,
    status: 'draft',
    items: [{ description: 'Service', quantity: 1, rate: 300, amount: 300 }],
  });
  log(secondInv.invoice_number === 'INV-0046', `second invoice auto-generates ${secondInv.invoice_number}`);
  
  // Third invoice should continue sequence
  const thirdInv = await db.createInvoice({
    user_id: rep2.id,
    template: 'standard',
    customer_name: 'Third Customer',
    issue_date: '2026-08-22',
    tax_rate: 0,
    subtotal: 200,
    tax_amount: 0,
    total: 200,
    status: 'draft',
    items: [{ description: 'Service', quantity: 1, rate: 200, amount: 200 }],
  });
  log(thirdInv.invoice_number === 'INV-0047', `third invoice continues sequence ${thirdInv.invoice_number}`);
  
  await db.deleteInvoice(firstInv.id);
  await db.deleteInvoice(secondInv.id);
  await db.deleteInvoice(thirdInv.id);
  
  await db.deleteInvoice(firstInv.id);
  await db.deleteInvoice(secondInv.id);
  await db.deleteInvoice(thirdInv.id);
  
  // Duplicate starting number test
  // First invoice with INV-0100 should succeed
  const dupRep = await db.createUser({ username: 'rep3', password: 'secret3', name: 'Rep Three', email: 'rep3@co.com', abn: '11 222 333 444', bank_name: 'Bank C', bank_bsb: '111222', bank_account: '33344455', pin: '5555', role: 'rep' });
  const dupRepUser = await db.getUserByUsername('rep3');
  const firstForDup = await db.createInvoice({
    user_id: dupRepUser.id,
    template: 'standard',
    userSuppliedNumber: 'INV-0100',
    customer_name: 'First',
    issue_date: '2026-08-25',
    tax_rate: 0,
    subtotal: 100,
    tax_amount: 0,
    total: 100,
    status: 'draft',
    items: [{ description: 'Service', quantity: 1, rate: 100, amount: 100 }],
  });
  log(firstForDup.invoice_number === 'INV-0100', 'first invoice with INV-0100 succeeds');
  
  // Second attempt to use INV-0100 should be ignored (not first invoice)
  const secondForDup = await db.createInvoice({
    user_id: dupRepUser.id,
    template: 'standard',
    userSuppliedNumber: 'INV-0100', // should be ignored
    customer_name: 'Second',
    issue_date: '2026-08-26',
    tax_rate: 0,
    subtotal: 100,
    tax_amount: 0,
    total: 100,
    status: 'draft',
    items: [{ description: 'Test', quantity: 1, rate: 100, amount: 100 }],
  });
  log(secondForDup.invoice_number !== 'INV-0100', 'duplicate starting number is ignored for non-first invoice');
  log(secondForDup.invoice_number === 'INV-0101', `second invoice auto-generates ${secondForDup.invoice_number}`);
  
  await db.deleteInvoice(firstForDup.id);
  await db.deleteInvoice(secondForDup.id);
  
  // Malformed starting number should be rejected (need a fresh rep)
  const malRep = await db.createUser({ username: 'rep4', password: 'secret4', name: 'Rep Four', email: 'rep4@co.com', abn: '66 777 888 999', bank_name: 'Bank D', bank_bsb: '666777', bank_account: '88899900', pin: '6666', role: 'rep' });
  const malRepUser = await db.getUserByUsername('rep4');
  let malformedError = null;
  try {
    await db.createInvoice({
      user_id: malRepUser.id,
      template: 'standard',
      userSuppliedNumber: 'INVALID',
      customer_name: 'Malformed',
      issue_date: '2026-08-27',
      tax_rate: 0,
      subtotal: 100,
      tax_amount: 0,
      total: 100,
      status: 'draft',
      items: [{ description: 'Test', quantity: 1, rate: 100, amount: 100 }],
    });
  } catch (e) {
    malformedError = e;
  }
  log(malformedError !== null, 'malformed starting number rejected');
  await db.deleteUser(malRepUser.id);

  await db.deleteUser(dupRepUser.id);
  await db.deleteUser(rep2.id);

  const totals = await db.repTotals();
  log(totals.some((t) => t.id === rep.id && Number(t.total) === 1150), 'rep totals aggregate');

  await db.deleteInvoice(created.id);
  await db.deleteInvoice(inv2.id);
  const afterDelete = await db.listInvoices({ userId: rep.id, admin: false });
  log(afterDelete.length === 0, 'invoices deleted');

  await db.deleteUser(rep.id);
  const gone = await db.getUserByUsername('rep1');
  log(!gone, 'rep user deleted');

  console.log('\nSmoke test finished.');
}

main().catch((err) => {
  console.error('FAIL  exception:', err);
  process.exitCode = 1;
});
