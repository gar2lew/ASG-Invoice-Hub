// public/js/invoice-form.js - Shared Week State with Half/Full Day Support

var form = document.getElementById('invoice-form');
var lines = document.getElementById('lines');
var gstInput = document.getElementById('gst');
var gstRow = document.getElementById('gst-row');
var tSub = document.getElementById('t-subtotal');
var tGst = document.getElementById('t-gst');
var tTotal = document.getElementById('t-total');
var tSubInline = document.getElementById('t-subtotal-inline');
var tGstInline = document.getElementById('t-gst-inline');
var tTotalInline = document.getElementById('t-total-inline');
var gstRowInline = document.getElementById('gst-row-inline');
var wageDays = document.getElementById('wage-days');
var weekRangeEl = document.getElementById('calc-week-range');
var templateInput = form ? form.querySelector('input[name="template"]') : null;
var tplButtons = form ? Array.prototype.slice.call(form.querySelectorAll('.company-option')) : [];

var editId = form ? form.dataset.editId || null : null;
var isEditing = Boolean(editId);
var apiUrl = editId ? '/api/invoices/' + editId : '/api/invoices';
var apiMethod = editId ? 'PUT' : 'POST';

var tplMeta = {
  asg: {
    name: 'ASG',
    email: 'Natalie@sjssolutionscorp.com.au',
    address: window.asgInvoiceAddress || '4/58 Kishorn Road, Mount Pleasant WA 6153',
    company: 'AMPLIFY SOLUTIONS GROUP PTY LTD',
    abn: '43 663 126 725',
    full_address: window.asgInvoiceAddress || '4/58 Kishorn Road, Mount Pleasant WA 6153',
    phone: '08 6147 7927',
  },
  sjs: {
    name: 'SJS',
    email: 'Natalie@sjssolutionscorp.com.au',
    address: 'PO Box 3330, Beeliar Drive, Success WA 6964',
    company: 'SJS WEALTH SOLUTIONS PTY LTD',
    abn: '89 622 469 845',
    full_address: 'PO Box 3330, Beeliar Drive, Success WA 6964',
    phone: '',
  },
};

function fmt(n) {
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to parse a local date string (YYYY-MM-DD) as a Date object
function parseLocalDate(dateString) {
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;

  return new Date(year, month, day);
}

// Format a date range as "DD/MM/YYYY - DD/MM/YYYY"
function formatWeekRange(startDate, endDate) {
  return fmtDate(startDate) + ' - ' + fmtDate(endDate);
}

function fmtWeekRange(weekStarting) {
  if (!weekStarting) return '';

  const startDate = parseLocalDate(weekStarting);
  if (!startDate) return '';

  const day = startDate.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(startDate);
  monday.setDate(startDate.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return formatWeekRange(monday, saturday);
}

function fmtDate(d) {
  if (!d || !d.getDate) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateForInput(d) {
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Calculate Saturday date from week start
function getSaturdayDate(weekStart) {
  var startDate = parseLocalDate(weekStart);
  if (!startDate) return null;
  var day = startDate.getDay();
  var diff = (day + 6) % 7;
  var monday = new Date(startDate);
  monday.setDate(startDate.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  var saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return saturday;
}

// Get date for a specific day offset from Monday
function getDayDate(weekStart, dayOffset) {
  var startDate = parseLocalDate(weekStart);
  if (!startDate) return null;
  var day = startDate.getDay();
  var diff = (day + 6) % 7;
  var monday = new Date(startDate);
  monday.setDate(startDate.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  var targetDay = new Date(monday);
  targetDay.setDate(monday.getDate() + dayOffset);
  return targetDay;
}

// Get date label in the app's standard DD/MM/YYYY format.
function getShortDate(d) {
  if (!d) return '-';
  return fmtDate(d);
}

var initialInvoiceNumber = '';

function getInvoiceNumberInput() {
  return document.getElementById('invoice_number') || document.querySelector('input[name="invoice_number"]');
}

function isInvoiceNumberManuallyOverridden() {
  var invNumEl = getInvoiceNumberInput();
  if (!invNumEl) return false;
  return invNumEl.value.trim() !== initialInvoiceNumber;
}

function buildPayload() {
  var data = new FormData(form);
  var invoiceNumberInput = getInvoiceNumberInput();
  var items = itemRows().map(function (row) {
    var description = row.querySelector('input[name="item_description"]').value.trim();
    var quantity = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
    var rate = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;

    var details = [];
    if (row.getAttribute('data-line-item-type') === 'wages') {
      var detailsRow = row.nextElementSibling;
      if (detailsRow && detailsRow.classList.contains('wage-details')) {
        var detailElements = detailsRow.querySelectorAll('.wage-details-container > div');
        detailElements.forEach(function(el) {
          var text = el.textContent.trim();
          if (text) details.push(text);
        });
      }
    }

    return {
      description: description,
      quantity: quantity,
      rate: rate,
      details: details,
    };
  }).filter(function (it) { return it.description; });

  return {
    template: templateInput.value,
    invoice_number: (invoiceNumberInput ? invoiceNumberInput.value : '') || (form && form.dataset.nextNumber) || '',
    invoice_number_manual_override: Boolean(invoiceNumberInput && isInvoiceNumberManuallyOverridden()),
    continue_numbering: Boolean(data.get('continue_numbering')),
    customer_name: data.get('customer_name'),
    customer_company: data.get('customer_company'),
    customer_email: data.get('customer_email'),
    customer_address: data.get('customer_address'),
    issue_date: data.get('issue_date'),
    due_date: data.get('due_date'),
    notes: data.get('notes'),
    gst: gstInput ? gstInput.checked : false,
    items: items,
    send_now: false,
  };
}

function showError(msg) {
  var errorEl = document.getElementById('form-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'form-error';
    errorEl.className = 'flash flash-error';
    form.insertBefore(errorEl, form.firstChild);
  }
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  var errorEl = document.getElementById('form-error');
  if (errorEl) errorEl.style.display = 'none';
}

/* ---- Template ---- */
function setTemplate(name) {
  if (!templateInput) return;
  templateInput.value = name;
  weekState.company = name;
  tplButtons.forEach(function (btn) {
    var active = btn.dataset.template === name;
    btn.classList.toggle('tpl-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  var cfg = companyConfigs[name] || companyConfigs.asg;
  var tpl = tplMeta[name];
  if (tpl) {
    var nameInput = document.getElementById('customer_name');
    var emailInput = document.getElementById('customer_email');
    var addressInput = document.getElementById('customer_address');
    if (!isEditing) {
      if (nameInput) {
        nameInput.value = tpl.company || tpl.name;
      }
      if (emailInput) emailInput.value = tpl.email || '';
      if (addressInput) addressInput.value = tpl.full_address || tpl.address || '';
    }
  }

  var notes = document.getElementById('notes');
  if (notes && tpl && !isEditing) {
    notes.value = '';
  }

  updatePreview();
}

var WAGE_RATES = {
  daily: 1000 / 6,
};

var ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var weekState = {
  company: 'asg',
  perDayRate: WAGE_RATES.daily,
  dayStates: {},
  weekStarting: '',
  notes: '',
};

var companyConfigs = {
  asg: {
    perDayRate: WAGE_RATES.daily,
  },
  sjs: {
    perDayRate: WAGE_RATES.daily,
  },
};

function initializeWeekState() {
  ALL_DAYS.forEach(function (d) { weekState.dayStates[d] = 'off'; });
  var weekStart = document.getElementById('week_start');
  if (weekStart && weekStart.value) {
    weekState.weekStarting = weekStart.value;
    updateDateTiles();
    updateWeekRange();
  }
}

function updateWeekRange() {
  if (weekRangeEl) {
    weekRangeEl.textContent = fmtWeekRange(weekState.weekStarting);
  }
  updateDateTiles();
  updatePreview();
  syncWageLine();
}

function updateDateTiles() {
  var weekStart = weekState.weekStarting;
  if (!weekStart) return;

  for (var i = 0; i < 5; i++) {
    var d = getDayDate(weekStart, i);
    var dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i];
    var dateEl = document.getElementById('date-' + dayName);
    if (dateEl) dateEl.textContent = getShortDate(d);
    var dateInput = document.querySelector('input[name="date_' + dayName + '"]');
    if (dateInput) dateInput.value = formatDateForInput(d);
  }
  var sat = getSaturdayDate(weekStart);
  var satEl = document.getElementById('date-Sat');
  if (satEl) satEl.textContent = getShortDate(sat);
  var satInput = document.querySelector('input[name="date_Sat"]');
  if (satInput) satInput.value = formatDateForInput(sat);

  var tiles = document.querySelectorAll('#wage-days .wage-day-tile[data-day]');
  tiles.forEach(function (tile) {
    var day = tile.dataset.day;
    var dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(day);
    if (dayIndex === -1 && day === 'Sat') dayIndex = 5;
    var d = dayIndex < 5 ? getDayDate(weekStart, dayIndex) : getSaturdayDate(weekStart);
    var dateDisplay = tile.querySelector('.wage-date-display');
    if (dateDisplay) dateDisplay.textContent = getShortDate(d);
  });
}

function setDayState(day, state) {
  weekState.dayStates[day] = state;
  updateDayUI(day);
  syncWageLine();
}

function updateDayUI(day) {
  var state = weekState.dayStates[day];
  var isSat = day === 'Sat';

  var weekdayEl = document.querySelector('.weekday[data-day="' + day + '"]');
  if (weekdayEl) {
    var btns = weekdayEl.querySelectorAll('.day-btn');
    btns.forEach(function (btn) {
      btn.classList.toggle('day-btn-active', btn.dataset.state === state);
    });
  }

  var satControls = document.querySelector('.saturday-controls');
  if (isSat && satControls) {
    var satBtns = satControls.querySelectorAll('.day-btn');
    satBtns.forEach(function (btn) {
      btn.classList.toggle('day-btn-active', btn.dataset.state === state);
    });
  }

  var tile = document.querySelector('#wage-days .wage-day-tile[data-day="' + day + '"]');
  if (tile) {
    tile.classList.toggle('wage-day-active', state !== 'off');
    tile.classList.toggle('wage-day-half', state === 'half');
    tile.classList.toggle('wage-day-full', state === 'full');
  }
}

function updateWeekTotal() {
  var total = 0;
  var breakdown = [];

  for (var i = 0; i < 5; i++) {
    var dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i];
    var state = weekState.dayStates[dayName];
    if (state === 'full') {
      total += WAGE_RATES.daily;
      breakdown.push(dayName);
    } else if (state === 'half') {
      total += WAGE_RATES.daily / 2;
      breakdown.push(dayName + ' Half');
    }
  }

  var satState = weekState.dayStates['Sat'];
  if (satState === 'full') {
    total += WAGE_RATES.daily;
    breakdown.push('Sat');
  } else if (satState === 'half') {
    total += WAGE_RATES.daily / 2;
    breakdown.push('Sat Half');
  }

  total = Math.round((total + Number.EPSILON) * 100) / 100;

  var totalEl = document.getElementById('calc-total');
  if (totalEl) totalEl.textContent = fmt(total);

  var breakdownEl = document.getElementById('calc-breakdown');
  if (breakdownEl) {
    breakdownEl.textContent = breakdown.length > 0 ? breakdown.join(' + ') : 'Select days worked to calculate wages.';
  }

  return total;
}

function syncWageLine() {
  var total = updateWeekTotal();
  var existingWageRow = itemRows().find(function (row) {
    return row.getAttribute('data-line-item-type') === 'wages';
  });

  if (total === 0) {
    if (existingWageRow) {
      var emptyDetailsRow = existingWageRow.nextElementSibling;
      existingWageRow.remove();
      if (emptyDetailsRow && emptyDetailsRow.classList.contains('wage-details')) emptyDetailsRow.remove();
      updateTotals();
    }
    return;
  }

  var weekStart = weekState.weekStarting;
  var weekRange = fmtWeekRange(weekStart);

  var details = [];
  for (var i = 0; i < 5; i++) {
    var dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i];
    var state = weekState.dayStates[dayName];
    if (state === 'off') continue;
    var d = getDayDate(weekStart, i);
    var dateStr = fmtDate(d);
    var amount = state === 'full' ? WAGE_RATES.daily : WAGE_RATES.daily / 2;
    var label = state === 'full' ? 'Full day' : 'Half day';
    details.push(dayName + ' - ' + dateStr + ' - ' + label + ' - ' + fmt(amount));
  }
  var satState = weekState.dayStates['Sat'];
  if (satState === 'full' || satState === 'half') {
    var sat = getSaturdayDate(weekStart);
    var satAmount = satState === 'full' ? WAGE_RATES.daily : WAGE_RATES.daily / 2;
    var satLabel = satState === 'full' ? 'Full day' : 'Half day';
    details.push('Sat - ' + fmtDate(sat) + ' - ' + satLabel + ' - ' + fmt(satAmount));
  }

  if (existingWageRow) {
    existingWageRow.querySelector('input[name="item_description"]').value = 'Wages/Retainer - Week of ' + weekRange;
    existingWageRow.querySelector('input[name="item_qty"]').value = 1;
    existingWageRow.querySelector('input[name="item_rate"]').value = total;
    var detailsRow = existingWageRow.nextElementSibling;
    if (detailsRow && detailsRow.classList.contains('wage-details')) {
      detailsRow.querySelector('.wage-details-container').innerHTML = details.map(function (d) { return '<div>' + d + '</div>'; }).join('');
    } else if (details.length) {
      var newDetailsRow = document.createElement('div');
      newDetailsRow.className = 'line-row wage-details';
      var newDetailsContainer = document.createElement('div');
      newDetailsContainer.className = 'wage-details-container';
      details.forEach(function (detail) {
        var detailElement = document.createElement('div');
        detailElement.textContent = detail;
        newDetailsContainer.appendChild(detailElement);
      });
      newDetailsRow.appendChild(newDetailsContainer);
      existingWageRow.after(newDetailsRow);
    }
  } else {
    addLine({
      description: 'Wages/Retainer - Week of ' + weekRange,
      quantity: 1,
      rate: total,
      amount: total,
      wageDetails: details
    });
  }

  updateTotals();
  updatePreview();
}

/* ---- Preview live bindings ---- */
var previewFields = ['invoice_number', 'customer_name', 'customer_company', 'customer_email', 'customer_address', 'issue_date', 'due_date', 'notes'];
previewFields.forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('input', updatePreview);
});

function updatePreview() {
  if (!window.__previewData) window.__previewData = {};
  window.__previewData.repName = window.invoiceRepName || '';
  window.__previewData.repAbn = window.invoiceRepDetails ? window.invoiceRepDetails.abn : '';

  var pvCompany = document.getElementById('pv-company');
  var pvCompanySub = document.getElementById('pv-company-sub');
  var pvInvNum = document.getElementById('pv-inv-num');
  var pvClientName = document.getElementById('pv-client-name');
  var pvClientContact = document.getElementById('pv-client-contact');
  var pvClientEmail = document.getElementById('pv-client-email');
  var pvClientAddress = document.getElementById('pv-client-address');
  var pvWeekRange = document.getElementById('pv-week-range');
  var pvItems = document.getElementById('pv-items');
  var pvSubtotal = document.getElementById('pv-subtotal');
  var pvGstRow = document.getElementById('pv-gst-row');
  var pvGst = document.getElementById('pv-gst');
  var pvTotal = document.getElementById('pv-total');
  var pvNotes = document.getElementById('pv-notes');

  if (pvCompany) pvCompany.textContent = window.__previewData.repName || '';
  if (pvCompanySub) pvCompanySub.textContent = window.__previewData.repAbn ? 'ABN ' + window.__previewData.repAbn : '';
  var repDetailsEl = document.getElementById('pv-rep-details');
  if (repDetailsEl && window.invoiceRepDetails) {
    var rd = window.invoiceRepDetails;
    repDetailsEl.innerHTML = '<strong>FROM</strong><br>' + escHtml(rd.name || '') + '<br>' +
      (rd.abn ? 'ABN: ' + escHtml(rd.abn) + '<br>' : '') +
      (rd.email ? escHtml(rd.email) + '<br>' : '') +
      (rd.bankName ? 'Bank: ' + escHtml(rd.bankName) + '<br>' : '') +
      (rd.bankBsb ? 'BSB: ' + escHtml(rd.bankBsb) + '<br>' : '') +
      (rd.bankAccount ? 'Account: ' + escHtml(rd.bankAccount) : '');
  }

  var invNum = getInvoiceNumberInput();
  if (pvInvNum) pvInvNum.textContent = invNum ? invNum.value : '';

  var cn = document.getElementById('customer_name');
  if (pvClientName) pvClientName.textContent = cn ? cn.value : '';
  var cc = document.getElementById('customer_company');
  if (pvClientContact) pvClientContact.textContent = cc ? cc.value : '';
  var ce = document.getElementById('customer_email');
  if (pvClientEmail) pvClientEmail.textContent = ce && ce.value ? 'Email: ' + ce.value : '';
  var ca = document.getElementById('customer_address');
  if (pvClientAddress) pvClientAddress.textContent = ca ? ca.value : '';

  if (pvWeekRange) pvWeekRange.textContent = fmtWeekRange(weekState.weekStarting);

  var rows = itemRows();
  if (pvItems) {
    if (rows.length === 0) {
      pvItems.innerHTML = '<tr class="summary-empty"><td colspan="5">No items yet</td></tr>';
    } else {
      var html = '';
      rows.forEach(function (row, i) {
        var d = row.querySelector('input[name="item_description"]').value;
        var q = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
        var r = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;
        var a = q * r;
        var isWageLine = row.getAttribute('data-line-item-type') === 'wages';
        html += '<tr' + (isWageLine ? ' class="wage-line-primary"' : '') + '><td>' + (i + 1) + '</td><td>' + escHtml(d) + '</td><td class="num">' + q + '</td><td class="num">' + fmt(r) + '</td><td class="num">' + fmt(a) + '</td></tr>';
        var detailsRow = row.nextElementSibling;
        if (detailsRow && detailsRow.classList && detailsRow.classList.contains('wage-details')) {
          var detailsHtml = '<tr class="wage-detail-row"><td colspan="5">';
          var detailItems = detailsRow.querySelectorAll('.wage-details-container div');
          detailItems.forEach(function(detailEl) {
            detailsHtml += escHtml(detailEl.textContent) + '<br>';
          });
          detailsHtml += '</td></tr>';
          html += detailsHtml;
        }
      });
      pvItems.innerHTML = html;
    }
  }

  var subtotal = 0;
  rows.forEach(function (row) {
    var q = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
    var r = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;
    subtotal += q * r;
  });
  var gst = gstInput.checked ? subtotal * 0.1 : 0;
  if (pvSubtotal) pvSubtotal.textContent = fmt(subtotal);
  if (pvGstRow) pvGstRow.style.display = gstInput.checked ? '' : 'none';
  if (pvGst) pvGst.textContent = fmt(gst);
  if (pvTotal) pvTotal.textContent = fmt(subtotal + gst);

  // Update review section
  var reviewInvNum = document.getElementById('review-inv-num');
  var reviewTotal = document.getElementById('review-total');
  if (reviewInvNum) reviewInvNum.textContent = invNum ? invNum.value : '';
  if (reviewTotal) reviewTotal.textContent = fmt(subtotal + gst);

  var notes = document.getElementById('notes');
  if (pvNotes) {
    if (!notes || !notes.value.trim()) {
      pvNotes.innerHTML = '';
    } else {
      pvNotes.innerHTML = '<span class="kicker">Notes</span>' + escHtml(notes.value).replace(/\n/g, '<br>');
    }
  }
}

function escHtml(s) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(s));
  return div.innerHTML;
}

/* ---- Lines ---- */
function addLine(data) {
  var row = document.createElement('div');
  row.className = 'line-row';
  if (data && data.description && data.description.startsWith('Wages')) {
    row.setAttribute('data-line-item-type', 'wages');
  }

  var desc = document.createElement('input');
  desc.type = 'text';
  desc.className = 'input';
  desc.placeholder = 'Description';
  desc.name = 'item_description';
  if (data && data.description) desc.value = data.description;
  row.appendChild(desc);

  var qty = document.createElement('input');
  qty.type = 'number';
  qty.className = 'input';
  qty.placeholder = 'Qty';
  qty.name = 'item_qty';
  qty.min = '0';
  qty.step = 'any';
  if (data && data.quantity) qty.value = data.quantity;
  qty.addEventListener('input', function () {
    updateTotals();
    updatePreview();
  });
  row.appendChild(qty);

  var rate = document.createElement('input');
  rate.type = 'number';
  rate.className = 'input';
  rate.placeholder = 'Rate';
  rate.name = 'item_rate';
  rate.min = '0';
  rate.step = '0.01';
  if (data && data.rate) rate.value = data.rate;
  rate.addEventListener('input', function () {
    updateTotals();
    updatePreview();
  });
  row.appendChild(rate);

  var amount = document.createElement('span');
  amount.className = 'line-amount';
  var amt = (data && data.quantity || 0) * (data && data.rate || 0);
  amount.textContent = fmt(amt);
  row.appendChild(amount);

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'line-remove';
  removeBtn.setAttribute('aria-label', 'Remove line');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', function () {
    row.remove();
    if (row.nextElementSibling && row.nextElementSibling.classList.contains('wage-details')) {
      row.nextElementSibling.remove();
    }
    updateTotals();
    updatePreview();
  });
  row.appendChild(removeBtn);

  lines.appendChild(row);

  if (data && data.wageDetails && data.wageDetails.length > 0) {
    var detailsRow = document.createElement('div');
    detailsRow.className = 'line-row wage-details';
    detailsRow.style.marginTop = '4px';
    detailsRow.style.paddingLeft = '12px';
    detailsRow.style.borderLeft = '2px solid var(--accent-soft)';
    var container = document.createElement('div');
    container.className = 'wage-details-container';
    container.style.fontSize = '12px';
    container.style.color = 'var(--muted)';
    container.style.lineHeight = '1.8';
    data.wageDetails.forEach(function (d) {
      var div = document.createElement('div');
      div.textContent = d;
      container.appendChild(div);
    });
    detailsRow.appendChild(container);
    lines.insertBefore(detailsRow, row.nextSibling);
  }

  updateTotals();
  updatePreview();
}

function itemRows() {
  return Array.prototype.slice.call(lines.querySelectorAll('.line-row:not(.line-head):not(.wage-details)'));
}

function updateTotals() {
  var subtotal = 0;
  itemRows().forEach(function (row) {
    var qty = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
    var rate = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;
    var amount = qty * rate;
    subtotal += amount;
    row.querySelector('.line-amount').textContent = fmt(amount);
  });
  var gst = gstInput.checked ? subtotal * 0.1 : 0;
  tSub.textContent = fmt(subtotal);
  tGst.textContent = fmt(gst);
  tTotal.textContent = fmt(subtotal + gst);
  gstRow.hidden = !gstInput.checked;
  if (tSubInline) tSubInline.textContent = fmt(subtotal);
  if (tGstInline) tGstInline.textContent = fmt(gst);
  if (tTotalInline) tTotalInline.textContent = fmt(subtotal + gst);
  if (gstRowInline) gstRowInline.hidden = !gstInput.checked;
  updatePreview();
}

/* ---- Event bindings ---- */
if (form) {
  // Company selector buttons
  tplButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTemplate(btn.dataset.template);
    });
  });

  // Weekday buttons
  var weekdayBtns = document.querySelectorAll('.weekday-controls .day-btn');
  weekdayBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var weekday = btn.closest('.weekday');
      var day = weekday.dataset.day;
      setDayState(day, btn.dataset.state);
    });
  });

  // Saturday buttons
  var satBtns = document.querySelectorAll('.saturday-controls .day-btn');
  satBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setDayState('Sat', btn.dataset.state);
    });
  });

  // Quick actions
  var selectMonFri = document.getElementById('select-mon-fri');
  var selectMonSat = document.getElementById('select-mon-sat');
  var clearWeek = document.getElementById('clear-week');

  if (selectMonFri) selectMonFri.addEventListener('click', function () {
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(function (d) { setDayState(d, 'full'); });
    setDayState('Sat', 'off');
  });
  if (selectMonSat) selectMonSat.addEventListener('click', function () {
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(function (d) { setDayState(d, 'full'); });
    setDayState('Sat', 'half');
  });
  if (clearWeek) clearWeek.addEventListener('click', function () {
    ALL_DAYS.forEach(function (d) { setDayState(d, 'off'); });
  });

  // Week start
  var weekStart = document.getElementById('week_start');
  if (weekStart) weekStart.addEventListener('change', function () {
    weekState.weekStarting = weekStart.value;
    updateWeekRange();
    syncWageLine();
  });

  // Add line
  var addLineBtn = document.getElementById('add-line');
  if (addLineBtn) addLineBtn.addEventListener('click', function () {
    addLine();
  });

  // GST toggle
  if (gstInput) gstInput.addEventListener('change', function () {
    updateTotals();
    updatePreview();
  });

}

if (form) form.addEventListener('submit', function (e) {
  e.preventDefault();
  var sendNowEl = document.getElementById('send_now');
  if (sendNowEl) sendNowEl.checked = false;
  var payload = buildPayload();

  if (!payload.items.length) {
    showError('Add at least one line item with a description.');
    return;
  }
  if (!payload.customer_name) {
    showError('Company name is required.');
    return;
  }

  fetch(apiUrl, {
    method: apiMethod,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }) })
  .then(function (result) {
    var res = result.res;
    var body = result.body;
    if (!res.ok) {
      showError(body.error || 'Something went wrong.');
      return;
    }
    window.location.href = '/invoices/' + body.id;
  })
  .catch(function (err) {
    showError('Something went wrong: ' + err.message);
  });
});

// Track initial invoice number for manual override detection
var initialInvoiceNumber = (getInvoiceNumberInput() || {}).value || '';

// Handle existing items when editing an invoice
if (typeof window.existingItems !== 'undefined' && Array.isArray(window.existingItems) && window.existingItems.length > 0) {
  initializeWeekState();
  window.existingItems.forEach(function (item) {
    addLine({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      wageDetails: item.details
    });
  });

  // Attempt to restore day states from existing wage details
  var firstWageItem = window.existingItems.find(function (it) {
    return it.description && it.description.startsWith('Wages');
  });
  if (firstWageItem && firstWageItem.details && firstWageItem.details.length > 0) {
    var restoredStates = {};
    ALL_DAYS.forEach(function (d) { restoredStates[d] = 'off'; });

    firstWageItem.details.forEach(function (detailText) {
      var dayMatch = detailText.match(/^(Mon|Tue|Wed|Thu|Fri|Sat)\s*[—–-]\s*\d+/);
      if (!dayMatch) return;
      var d = dayMatch[1];
      var state = 'full';
      if (detailText.indexOf('Half day') !== -1) {
        state = 'half';
      } else if (detailText.indexOf('Full day') !== -1) {
        state = 'full';
      } else if (d === 'Sat') {
        state = 'half';
      } else {
        state = 'full';
      }
      restoredStates[d] = state;
    });

    weekState.dayStates = restoredStates;

    ALL_DAYS.forEach(function (day) {
      updateDayUI(day);
    });

    updateWeekTotal();
    updatePreview();
    syncWageLine();
  }
} else {
  addLine();
}

if (!isEditing && templateInput) setTemplate(templateInput.value || 'asg');
