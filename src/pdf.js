let PDFDocument = null;

const { getTemplate } = require('./templates');

const INK = '#142033';
const GRAY = '#6B7280';
const LIGHT = '#EFEBD8';
const ACCENT = '#C79A4A';
const ALT = '#F7F4EC';
const WHITE = '#FFFFFF';

// A4 page geometry - consistent printable content box
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const LM = 48;           // left margin
const RM = 48;           // right margin
const CW = PAGE_W - LM - RM; // content width = 499.28
const RIGHT = LM + CW;   // right edge of content box = 547.28

function money(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d.replace(' ', 'T'));
  if (!dt || Number.isNaN(dt.getTime())) return String(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

function drawItemsTable(doc, items, y0, compact) {
  // Column widths proportional to content width
  const colPct = compact
    ? [5, 57, 8, 15, 15]  // #, Description, Qty, Rate, Amount
    : [5, 55, 8, 15, 17];
  const cols = colPct.map(p => CW * p / 100);
  const headers = ['#', 'DESCRIPTION', 'QTY', 'RATE', 'AMOUNT'];
  const x0 = LM;
  const rh = compact ? 20 : 24;

  let y = y0;
  doc.rect(x0, y, CW, rh).fill(compact ? LIGHT : INK);
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

    // Build description with wage details if present
    const detailText = item.details && item.details.length > 0 ? item.details.join('\n') : '';
    const fullDescription = detailText ? item.description + '\n' + detailText : item.description;
    const descFontSize = compact ? 9 : 11;
    const descLineHeight = descFontSize * 1.3;
    const primaryHeight = doc.heightOfString(item.description, { width: cols[1] - 12, fontSize: descFontSize, lineGap: 2 });
    const detailHeight = detailText ? doc.heightOfString(detailText, { width: cols[1] - 12, fontSize: compact ? 7 : 7, lineGap: 1.5 }) + 6 : 0;
    const rowH = Math.max(rh, primaryHeight + detailHeight + 14);

    doc.rect(x0, y, CW, rowH).fill(fill);
    doc.lineWidth(0.5).strokeColor(LIGHT).moveTo(x0, y + rowH).lineTo(RIGHT, y + rowH).stroke();

    let cx = x0;
    doc.fillColor(INK).font('Helvetica').fontSize(9);
    doc.text(String(idx + 1), cx + 6, y + 7, { width: cols[0] - 12 });
    cx += cols[0];

    // Primary description
    doc.font('Helvetica-Bold').fontSize(descFontSize).fillColor(INK);
    doc.text(item.description, cx + 6, y + 7, { width: cols[1] - 12, lineGap: 2 });

    // Secondary wage details
    if (detailText) {
      doc.font('Helvetica').fontSize(compact ? 7 : 7).fillColor(GRAY);
      doc.text(detailText, cx + 6, y + 7 + primaryHeight + 4, { width: cols[1] - 12, lineGap: 1.5 });
    }
    cx += cols[1];

    doc.fillColor(INK).font('Helvetica').fontSize(compact ? 8 : 9);
    doc.text(String(item.quantity), cx + 6, y + 7, { width: cols[2] - 12, align: 'right' });
    cx += cols[2];
    doc.text(money(item.rate), cx + 6, y + 7, { width: cols[3] - 12, align: 'right' });
    cx += cols[3];
    doc.font('Helvetica-Bold').fontSize(compact ? 9 : 10).text(money(item.amount), cx + 6, y + 7, { width: cols[4] - 12, align: 'right' });

    doc.lineWidth(0.5).strokeColor(LIGHT).moveTo(x0, y + rowH).lineTo(RIGHT, y + rowH).stroke();
    y += rowH;
  });

  return y;
}

function renderStandard(doc, invoice, items, settings, tplConfig) {
  const co = tplConfig || {};
  const repName = invoice.rep_name || invoice.user_name || 'Contractor';
  const repAbn = invoice.rep_abn || '';

  // ===== HEADER =====
  const headerTop = 50;

  // LEFT: Rep name + ABN
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text(repName, LM, headerTop);
  if (repAbn) {
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text('ABN ' + repAbn, LM, headerTop + 26, { width: CW * 0.6 });
  }

  // LEFT: Email + Phone
  const contactParts = [invoice.rep_email, invoice.rep_phone].filter(Boolean);
  if (contactParts.length) {
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(contactParts.join('   ·   '), LM, headerTop + (repAbn ? 40 : 26), { width: CW * 0.6 });
  }

  // RIGHT: INVOICE + number (constrained to right column)
  const rightColX = LM + CW * 0.65;
  const rightColW = CW * 0.35;
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(30).text('INVOICE', rightColX, headerTop - 2, { align: 'right', width: rightColW });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(invoice.invoice_number, rightColX, headerTop + 34, { align: 'right', width: rightColW });

  // Header divider
  const dividerY = headerTop + 58;
  doc.moveTo(LM, dividerY).lineTo(RIGHT, dividerY).lineWidth(2).strokeColor(INK).stroke();

  // ===== METADATA (Issue Date only) =====
  let y = dividerY + 14;
  const issueDateFormatted = fmtDate(invoice.issue_date);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('ISSUE DATE', LM, y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(issueDateFormatted, LM + 80, y);
  y += 22;

  // ===== FROM / BILL TO (two-column) =====
  const labelFont = { font: 'Helvetica-Bold', size: 9, color: GRAY };
  const valueFont = { font: 'Helvetica-Bold', size: 11, color: INK };
  const detailFont = { font: 'Helvetica', size: 9, color: GRAY };

  // FROM column (left ~50%)
  const col1X = LM;
  const col1W = CW * 0.48;
  // BILL TO column (right ~50%)
  const col2X = LM + CW * 0.52;
  const col2W = CW * 0.48;

  doc.font(labelFont.font).fontSize(labelFont.size).fillColor(labelFont.color).text('FROM', col1X, y);
  doc.font(labelFont.font).fontSize(labelFont.size).fillColor(labelFont.color).text('BILL TO', col2X, y);
  y += 16;

  // FROM values
  doc.font(valueFont.font).fontSize(valueFont.size).fillColor(valueFont.color).text(repName, col1X, y);
  y += 16;
  doc.font(detailFont.font).fontSize(detailFont.size).fillColor(detailFont.color);
  const fromLines = [repAbn && `ABN: ${repAbn}`, invoice.rep_email && `Email: ${invoice.rep_email}`, invoice.rep_phone && `Phone: ${invoice.rep_phone}`].filter(Boolean);
  fromLines.forEach(line => { doc.text(line, col1X, y); y += 13; });

  // BILL TO values - reset y for column 2
  let y2 = dividerY + 14 + 22 + 16; // same starting y
  doc.font(valueFont.font).fontSize(valueFont.size).fillColor(valueFont.color).text(tplConfig.company || '', col2X, y2);
  y2 += 18;
  doc.font(detailFont.font).fontSize(detailFont.size).fillColor(detailFont.color);
  if (tplConfig.address) { doc.text(tplConfig.address, col2X, y2); y2 += 14; }
  if (tplConfig.abn) { doc.text('ABN: ' + tplConfig.abn, col2X, y2); y2 += 14; }
  if (tplConfig.email) { doc.text(tplConfig.email, col2X, y2); y2 += 14; }
  if (tplConfig.phone) { doc.text('Ph: ' + tplConfig.phone, col2X, y2); y2 += 14; }

  // Use the taller column
  y = Math.max(y, y2) + 20;

  // ===== ITEMS TABLE =====
  const tableBottom = drawItemsTable(doc, items, y);

  // ===== TOTALS BLOCK =====
  let ty = tableBottom + 18;

  // Totals right-aligned within right portion of content width
  const totalsLabelX = LM + CW * 0.55;
  const totalsValueX = RIGHT;
  const totalsLabelW = CW * 0.4;

  const totals = [
    ['Subtotal', money(invoice.subtotal)],
    ...(invoice.tax_rate > 0 ? [[`GST (${Math.round(invoice.tax_rate * 100)}%)`, money(invoice.tax_amount)]] : []),
  ];
  totals.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(label, totalsLabelX, ty, { width: totalsLabelW, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(value, totalsValueX, ty, { align: 'right', width: 0 });
    ty += 18;
  });

  // Total line
  doc.moveTo(totalsLabelX, ty + 2).lineTo(RIGHT, ty + 2).lineWidth(2).strokeColor(ACCENT).stroke();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text('TOTAL', totalsLabelX, ty + 10, { width: totalsLabelW, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(ACCENT).text(money(invoice.total), totalsValueX, ty + 10, { align: 'right', width: 0 });
  ty += 34;

  // ===== NOTES =====
  if (invoice.notes) {
    ty += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('NOTES', LM, ty);
    ty += 14;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(invoice.notes, LM, ty, { width: CW });
    ty += doc.heightOfString(invoice.notes, { width: CW }) + 16;
  }

  // ===== PAYMENT DETAILS =====
  // Use ONLY rep's individual bank details (no fallback to settings, no payment terms)
  const repBank = {
    name: invoice.rep_bank_name,
    bsb: invoice.rep_bank_bsb,
    account: invoice.rep_bank_account
  };
  const hasRepBank = repBank.name || repBank.bsb || repBank.account;

  if (hasRepBank) {
    ty += 18;
    doc.moveTo(LM, ty).lineTo(RIGHT, ty).lineWidth(1).strokeColor(LIGHT).stroke();
    ty += 16;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('PAYMENT DETAILS', LM, ty);
    ty += 14;
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    if (repBank.name) { doc.text(`Bank: ${repBank.name}`, LM, ty); ty += 13; }
    if (repBank.bsb) { doc.text(`BSB: ${repBank.bsb}`, LM, ty); ty += 13; }
    if (repBank.account) { doc.text(`Account: ${repBank.account}`, LM, ty); ty += 13; }
  }

  // ===== FOOTER =====
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text(settings.footer_note || 'Thank you for your business.', LM, PAGE_H - 60, { width: CW, align: 'center' });
  doc.moveTo(LM, PAGE_H - 70).lineTo(RIGHT, PAGE_H - 70).lineWidth(0.5).strokeColor(LIGHT).stroke();
}

function renderCompact(doc, invoice, items, settings, tplConfig) {
  const co = tplConfig || {};
  const repName = invoice.rep_name || invoice.user_name || 'Contractor';
  const repAbn = invoice.rep_abn || '';

  // Compact uses same page geometry
  const CWc = CW;
  const LM2 = LM;
  const RIGHT2 = RIGHT;

  doc.rect(0, 0, PAGE_W, 108).fill(INK);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(24).text(repName, LM2, 34);
  const repSub = [repAbn && 'ABN ' + repAbn].filter(Boolean).join('  ·  ');
  if (repSub) doc.font('Helvetica').fontSize(8).fillColor('#B8BEC9').text(repSub, LM2, 70, { width: CWc * 0.6 });

  // Right header
  const rightColX = LM2 + CWc * 0.65;
  const rightColW = CWc * 0.35;
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22).text('INVOICE', rightColX, 26, { align: 'right', width: rightColW });
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text(invoice.invoice_number, rightColX, 58, { align: 'right', width: rightColW });

  const issueDateFormatted = fmtDate(invoice.issue_date);
  doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Issue Date: ' + issueDateFormatted, rightColX, 78, { align: 'right', width: rightColW });

  let y = 132;

  // FROM / BILL TO compact (two column)
  const col1X = LM2;
  const col1W = CWc * 0.48;
  const col2X = LM2 + CWc * 0.52;
  const col2W = CWc * 0.48;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('FROM', col1X, y);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('BILL TO', col2X, y);
  y += 12;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(repName, col1X, y); y += 13;
  doc.font('Helvetica').fontSize(7).fillColor(GRAY);
  [repAbn && `ABN: ${repAbn}`, invoice.rep_email && `Email: ${invoice.rep_email}`, invoice.rep_phone && `Phone: ${invoice.rep_phone}`].filter(Boolean).forEach(line => { doc.text(line, col1X, y); y += 9; });

  let y2 = 132 + 12;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(tplConfig.company || '', col2X, y2); y2 += 16;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  if (tplConfig.address) { doc.text(tplConfig.address, col2X, y2); y2 += 13; }
  if (tplConfig.abn) { doc.text('ABN: ' + tplConfig.abn, col2X, y2); y2 += 13; }
  if (tplConfig.email) { doc.text(tplConfig.email, col2X, y2); y2 += 13; }
  if (tplConfig.phone) { doc.text('Ph: ' + tplConfig.phone, col2X, y2); y2 += 13; }

  y = Math.max(y, y2) + 16;

  const tableBottom = drawItemsTable(doc, items, y, true);

  let ty = tableBottom + 20;
  const totals = [
    ['Subtotal', money(invoice.subtotal)],
    ...(invoice.tax_rate > 0 ? [[`GST (${Math.round(invoice.tax_rate * 100)}%)`, money(invoice.tax_amount)]] : []),
  ];
  const totalsLabelX = LM2 + CWc * 0.55;
  const totalsValueX = RIGHT2;
  const totalsLabelW = CWc * 0.4;

  totals.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(label, totalsLabelX, ty, { width: totalsLabelW, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(value, totalsValueX, ty, { align: 'right', width: 0 });
    ty += 16;
  });
  doc.moveTo(totalsLabelX, ty + 1).lineTo(RIGHT2, ty + 1).lineWidth(2).strokeColor(ACCENT).stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('TOTAL', totalsLabelX, ty + 10, { width: totalsLabelW, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ACCENT).text(money(invoice.total), totalsValueX, ty + 10, { align: 'right', width: 0 });
  ty += 30;

  if (invoice.notes) {
    ty += 6;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('NOTES', LM2, ty);
    ty += 12;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(invoice.notes, LM2, ty, { width: CWc });
    ty += doc.heightOfString(invoice.notes, { width: CWc }) + 12;
  }

  // Payment Details (rep's own bank details only)
  const repBank = {
    name: invoice.rep_bank_name,
    bsb: invoice.rep_bank_bsb,
    account: invoice.rep_bank_account
  };
  const hasRepBank = repBank.name || repBank.bsb || repBank.account;

  if (hasRepBank) {
    ty += 14;
    doc.moveTo(LM2, ty).lineTo(RIGHT2, ty).lineWidth(1).strokeColor(LIGHT).stroke();
    ty += 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('PAYMENT DETAILS', LM2, ty);
    ty += 12;
    doc.font('Helvetica').fontSize(8).fillColor(INK);
    if (repBank.name) { doc.text(`Bank: ${repBank.name}`, LM2, ty); ty += 11; }
    if (repBank.bsb) { doc.text(`BSB: ${repBank.bsb}`, LM2, ty); ty += 11; }
    if (repBank.account) { doc.text(`Account: ${repBank.account}`, LM2, ty); ty += 11; }
  }

  // Footer
  const pageH = PAGE_H;
  doc.moveTo(LM2, pageH - 56).lineTo(RIGHT2, pageH - 56).lineWidth(0.5).strokeColor(LIGHT).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text(settings.footer_note || 'Thank you for your business.', LM2, pageH - 46, { width: CWc, align: 'center' });
}

function renderInvoice(invoice, items, settings) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
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

module.exports = { renderInvoice, fmtDate };