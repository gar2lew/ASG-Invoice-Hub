let PDFDocument = null;

const { getTemplate } = require('./templates');

const INK = '#1B2434';
const GRAY = '#5A6472';
const LIGHT = '#EAE5D9';
const ACCENT = '#1B2434';
const ALT = '#F7F4EC';
const WHITE = '#FFFFFF';

const M = 50;
const W = 495;
const RIGHT = M + W;
const PAGE_H = 841.89;

function money(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function meta(doc, x, y, label, value) {
  doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(label.toUpperCase(), x, y, { continued: true })
    .font('Helvetica-Bold').fontSize(9).fillColor(INK).text('  ' + value);
  return y + 16;
}

function drawItemsTable(doc, items, y0, compact) {
  const cols = compact
    ? [32, 228, 60, 85, 90]
    : [32, 190, 60, 100, 113];
  const headers = ['#', 'DESCRIPTION', 'QTY', 'RATE', 'AMOUNT'];
  const x0 = M;
  const rh = compact ? 20 : 24;

  let y = y0;
  doc.rect(x0, y, W, rh).fill(compact ? LIGHT : INK);
  if (compact) {
    doc.lineWidth(1).strokeColor(LIGHT).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
  } else {
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
  }
  let cx = x0;
  headers.forEach((h, i) => {
    const align = i >= 2 ? 'right' : 'left';
    const w = cols[i];
    doc.text(h, cx + 6, y + rh / 2 - 4, { width: w - 12, align });
    cx += w;
  });

  y += rh;
  items.forEach((item, idx) => {
    const fill = idx % 2 === 0 ? ALT : WHITE;
    doc.rect(x0, y, W, rh).fill(fill);
    doc.lineWidth(0.5).strokeColor(LIGHT)
      .moveTo(x0, y + rh).lineTo(RIGHT, y + rh).stroke();
    doc.fillColor(INK).font('Helvetica').fontSize(9);
    let cx = x0;
    
    // Build description with wage details if present
    const detailText = item.details && item.details.length > 0 ? item.details.join('\n') : '';
    const fullDescription = detailText ? item.description + '\n' + detailText : item.description;
    const descLines = doc.heightOfString(item.description, { width: cols[1] - 12 })
      + (detailText ? doc.heightOfString(detailText, { width: cols[1] - 12, fontSize: compact ? 7 : 7 }) : 0);
    const rowH = Math.max(rh, descLines + 10);
    doc.rect(x0, y, W, rowH).fill(fill);
    doc.text(String(idx + 1), cx + 6, y + 6, { width: cols[0] - 12 });
    cx += cols[0];
    doc.font('Helvetica').fontSize(compact ? 9 : 10).text(item.description, cx + 6, y + 6, { width: cols[1] - 12 });
    if (detailText) {
      doc.font('Helvetica').fontSize(7).fillColor(GRAY).text(detailText, cx + 6, y + 6 + doc.heightOfString(item.description, { width: cols[1] - 12 }) + 2, { width: cols[1] - 12, lineGap: 1 });
    }
    cx += cols[1];
    doc.font('Helvetica').text(String(item.quantity), cx + 6, y + 6, { width: cols[2] - 12, align: 'right' });
    cx += cols[2];
    doc.font('Helvetica').text(money(item.rate), cx + 6, y + 6, { width: cols[3] - 12, align: 'right' });
    cx += cols[3];
    doc.font('Helvetica-Bold').text(money(item.amount), cx + 6, y + 6, { width: cols[4] - 12, align: 'right' });
    doc.lineWidth(0.5).strokeColor(LIGHT)
      .moveTo(x0, y + rowH).lineTo(RIGHT, y + rowH).stroke();
    y += rowH;
  });

  return y;
}

function renderStandard(doc, invoice, items, settings, tplConfig) {
  const co = tplConfig || {};
  const repName = invoice.rep_name || invoice.user_name || 'Contractor';
  const repAbn = invoice.rep_abn || '';
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text(repName, M, 50);
  const repSub = [repAbn && 'ABN ' + repAbn].filter(Boolean).join('   ·   ');
  if (repSub) doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(repSub, M, 78, { width: 320 });

  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(30).text('INVOICE', RIGHT, 44, { align: 'right', width: 0 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(invoice.invoice_number, RIGHT, 80, { align: 'right', width: 0 });

  doc.moveTo(M, 108).lineTo(RIGHT, 108).lineWidth(2).strokeColor(INK).stroke();

  let y = 128;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('FROM', M, y);
  y += 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(repName, M, y); y += 14;
  doc.font('Helvetica').fontSize(8).fillColor(GRAY);
  [repAbn && `ABN: ${repAbn}`, invoice.rep_email && `Email: ${invoice.rep_email}`, (invoice.rep_bank_name || settings.bank_name) && `Bank: ${invoice.rep_bank_name || settings.bank_name}`, (invoice.rep_bank_bsb || settings.bank_bsb) && `BSB: ${invoice.rep_bank_bsb || settings.bank_bsb}`, (invoice.rep_bank_account || settings.bank_account) && `Account: ${invoice.rep_bank_account || settings.bank_account}`].filter(Boolean).forEach((line) => { doc.text(line, M, y); y += 11; });
  y += 8;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('BILL TO', M, y);
  y += 16;
  // Company (ASG/SJS) details from template config
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(tplConfig.company || '', M, y);
  y += 18;
  doc.font('Helvetica').fontSize(10).fillColor(GRAY);
  if (tplConfig.address) { doc.text(tplConfig.address, M, y); y += 14; }
  if (tplConfig.abn) { doc.text('ABN: ' + tplConfig.abn, M, y); y += 14; }
  if (tplConfig.email) { doc.text(tplConfig.email, M, y); y += 14; }
  if (tplConfig.phone) { doc.text('Ph: ' + tplConfig.phone, M, y); y += 14; }

  // Customer details section
  y += 18;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('CUSTOMER', M, y);
  y += 12;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  if (invoice.customer_name) { doc.text(invoice.customer_name, M, y); y += 14; }
  if (invoice.customer_address) { doc.text(invoice.customer_address, M, y); y += 14; }
  if (invoice.customer_email) { doc.text(invoice.customer_email, M, y); y += 14; }
  if (invoice.customer_company) { doc.text(invoice.customer_company, M, y); y += 14; }

  let my = 124;
  my = meta(doc, RIGHT, my, 'Issue date', invoice.issue_date);
  if (invoice.due_date) my = meta(doc, RIGHT, my, 'Due date', invoice.due_date);

  y = Math.max(y + 18, 232);
  const tableBottom = drawItemsTable(doc, items, y);

  let ty = tableBottom + 18;
  doc.moveTo(M + 245, ty - 8).lineTo(RIGHT, ty - 8).lineWidth(0.5).strokeColor(LIGHT).stroke();
  const totals = [
    ['Subtotal', money(invoice.subtotal)],
    ...(invoice.tax_rate > 0 ? [[`GST (${Math.round(invoice.tax_rate * 100)}%)`, money(invoice.tax_amount)]] : []),
  ];
  totals.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(label, M + 245, ty);
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(value, RIGHT, ty, { align: 'right', width: 0 });
    ty += 18;
  });
  doc.moveTo(M + 245, ty + 2).lineTo(RIGHT, ty + 2).lineWidth(2).strokeColor(ACCENT).stroke();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text('TOTAL', M + 245, ty + 12);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT).text(money(invoice.total), RIGHT, ty + 12, { align: 'right', width: 0 });
  ty += 34;

  if (invoice.notes) {
    ty += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('NOTES', M, ty);
    ty += 14;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(invoice.notes, M, ty, { width: W });
    ty += doc.heightOfString(invoice.notes, { width: W }) + 16;
  }

  const bank = { name: invoice.rep_bank_name || settings.bank_name, bsb: invoice.rep_bank_bsb || settings.bank_bsb, account: invoice.rep_bank_account || settings.bank_account };
  if (bank.name || bank.bsb || bank.account || settings.payment_terms) {
    ty += 10;
    doc.rect(M, ty, W, 1).fill(LIGHT);
    ty += 16;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('PAYMENT DETAILS', M, ty);
    ty += 14;
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    if (bank.name) { doc.text(`Bank: ${bank.name}`, M, ty); ty += 13; }
    if (bank.bsb) { doc.text(`BSB: ${bank.bsb}`, M, ty); ty += 13; }
    if (bank.account) { doc.text(`Account: ${bank.account}`, M, ty); ty += 13; }
    if (settings.payment_terms) { doc.text(`Terms: ${settings.payment_terms}`, M, ty); ty += 13; }
  }

  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text(settings.footer_note || '', M, PAGE_H - 60, { width: W, align: 'center' });
  doc.moveTo(M, PAGE_H - 70).lineTo(RIGHT, PAGE_H - 70).lineWidth(0.5).strokeColor(LIGHT).stroke();
}

function renderCompact(doc, invoice, items, settings, tplConfig) {
  const co = tplConfig || {};
  const repName = invoice.rep_name || invoice.user_name || 'Contractor';
  const repAbn = invoice.rep_abn || '';
  doc.rect(0, 0, 595.28, 108).fill(INK);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(24).text(repName, M, 34);
  const repSub = [repAbn && 'ABN ' + repAbn].filter(Boolean).join('  ·  ');
  if (repSub) doc.font('Helvetica').fontSize(8).fillColor('#B8BEC9').text(repSub, M, 70, { width: 340 });

  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22).text('INVOICE', RIGHT, 26, { align: 'right', width: 0 });
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text(invoice.invoice_number, RIGHT, 58, { align: 'right', width: 0 });
  doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(invoice.issue_date, RIGHT, 78, { align: 'right', width: 0 });

  let y = 132;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('FROM', M, y); y += 12;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(repName, M, y); y += 13;
  doc.font('Helvetica').fontSize(7).fillColor(GRAY);
  [repAbn && `ABN: ${repAbn}`, invoice.rep_email && `Email: ${invoice.rep_email}`, (invoice.rep_bank_name || settings.bank_name) && `Bank: ${invoice.rep_bank_name || settings.bank_name}`, (invoice.rep_bank_bsb || settings.bank_bsb) && `BSB: ${invoice.rep_bank_bsb || settings.bank_bsb}`, (invoice.rep_bank_account || settings.bank_account) && `Account: ${invoice.rep_bank_account || settings.bank_account}`].filter(Boolean).forEach((line) => { doc.text(line, M, y); y += 9; });
  y += 7;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('BILL TO', M, y);
  y += 15;
  // Company (ASG/SJS) details from template config
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(tplConfig.company || '', M, y);
  y += 16;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  if (tplConfig.address) { doc.text(tplConfig.address, M, y); y += 13; }
  if (tplConfig.abn) { doc.text('ABN: ' + tplConfig.abn, M, y); y += 13; }
  if (tplConfig.email) { doc.text(tplConfig.email, M, y); y += 13; }
  if (tplConfig.phone) { doc.text('Ph: ' + tplConfig.phone, M, y); y += 13; }

  // Customer details section
  y += 16;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('CUSTOMER', M, y);
  y += 12;
  doc.font('Helvetica').fontSize(9).fillColor(INK);
  if (invoice.customer_name) { doc.text(invoice.customer_name, M, y); y += 13; }
  if (invoice.customer_address) { doc.text(invoice.customer_address, M, y); y += 13; }
  if (invoice.customer_email) { doc.text(invoice.customer_email, M, y); y += 13; }
  if (invoice.customer_company) { doc.text(invoice.customer_company, M, y); y += 13; }

  let my = 132;
  my = meta(doc, RIGHT, my, 'Due date', invoice.due_date || '—');
  my = meta(doc, RIGHT, my, 'Payment terms', settings.payment_terms || '—');

  y = Math.max(y + 16, 220);
  const tableBottom = drawItemsTable(doc, items, y, true);

  let ty = tableBottom + 20;
  const totals = [
    ['Subtotal', money(invoice.subtotal)],
    ...(invoice.tax_rate > 0 ? [[`GST (${Math.round(invoice.tax_rate * 100)}%)`, money(invoice.tax_amount)]] : []),
  ];
  totals.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(label, M + 280, ty);
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(value, RIGHT, ty, { align: 'right', width: 0 });
    ty += 16;
  });
  doc.moveTo(M + 280, ty + 1).lineTo(RIGHT, ty + 1).lineWidth(2).strokeColor(ACCENT).stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('TOTAL', M + 280, ty + 10);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ACCENT).text(money(invoice.total), RIGHT, ty + 10, { align: 'right', width: 0 });
  ty += 30;

  if (invoice.notes) {
    ty += 6;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('NOTES', M, ty);
    ty += 12;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(invoice.notes, M, ty, { width: W });
    ty += doc.heightOfString(invoice.notes, { width: W }) + 12;
  }

  const pageH = 595.28;
  doc.moveTo(M, pageH - 56).lineTo(RIGHT, pageH - 56).lineWidth(0.5).strokeColor(LIGHT).stroke();
  const bank = { name: invoice.rep_bank_name || settings.bank_name, bsb: invoice.rep_bank_bsb || settings.bank_bsb, account: invoice.rep_bank_account || settings.bank_account };
  const foot = [
    bank.name && `Bank: ${bank.name}`,
    bank.bsb && `BSB: ${bank.bsb}`,
    bank.account && `Account: ${bank.account}`,
  ].filter(Boolean).join('    ');
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text([settings.footer_note, foot].filter(Boolean).join('\n'), M, pageH - 46, { width: W, align: 'center', lineGap: 2 });
}

function renderInvoice(invoice, items, settings) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks = [];
    const tplConfig = getTemplate(invoice.template);
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (invoice.template === 'compact') renderCompact(doc, invoice, items, settings, tplConfig);
    else renderStandard(doc, invoice, items, settings, tplConfig);
    doc.end();
  });
}

module.exports = { renderInvoice };
