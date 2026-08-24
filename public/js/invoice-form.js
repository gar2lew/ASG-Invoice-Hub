// public/js/invoice-form.js - Shared Week State Implementation

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
var tplButtons = form ? Array.prototype.slice.call(form.querySelectorAll('.tpl')) : [];
var submitSend = document.getElementById('submit-send');

var tplMeta = {
  asg: {
    name: 'ASG',
    email: 'Natalie@sjssolutionscorp.com.au',
    address: '14C, 1 The Esplanade, Mount pleasant, 6153',
    company: 'AMPLIFY SOLUTIONS GROUP PTY LTD',
    abn: '43 663 126 725',
    full_address: '14C, 1 The Esplanade, Mount pleasant, 6153',
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
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  
  return new Date(year, month, day);
}

// Format a date range as "DD–DD Mon YYYY"
function formatWeekRange(startDate, endDate) {
  const startDay = String(startDate.getDate()).padStart(2, '0');
  const endDay = String(endDate.getDate()).padStart(2, '0');
  const monthYear = endDate.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
  return startDay + '–' + endDay + ' ' + monthYear;
}

// Format week range from YYYY-MM-DD string
function fmtWeekRange(weekStarting) {
  if (!weekStarting) return '';
  
  const startDate = parseLocalDate(weekStarting);
  if (!startDate) return '';
  
  // Normalize to Monday: difference from Sunday (0) to Monday (1)
  const day = startDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Days to subtract to get to Monday
  const diff = (day + 6) % 7;
  const monday = new Date(startDate);
  monday.setDate(startDate.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  
  // Friday is Monday + 4 days
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  return formatWeekRange(monday, friday);
}

function fmtDate(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

// Format date as YYYY-MM-DD in local time (for date inputs)
function formatDateForInput(d) {
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

var weekState = {
  company: 'asg',
  weekStarting: '',
  workedDays: [],
  perDayRate: 181.82,
  notes: '',
};

var companyConfigs = {
  asg: {
    perDayRate: 181.82,
    gstTreatment: 'inclusive',
    wageLineMode: 'aggregated',
    defaultNotes: '',
  },
  sjs: {
    perDayRate: 0,
    gstTreatment: 'inclusive',
    wageLineMode: 'aggregated',
    defaultNotes: '',
  },
};

var dayOffsets = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

function loadPersistedSettings() {
  try {
    var raw = localStorage.getItem('invoice-week-settings');
    if (!raw) return;
    var data = JSON.parse(raw);
    if (data && data.asg) applyPersistedSettings('asg', data.asg);
    if (data && data.sjs) applyPersistedSettings('sjs', data.sjs);
  } catch (e) {
    // ignore invalid stored data
  }
}

function applyPersistedSettings(company, data) {
  var cfg = companyConfigs[company];
  if (!cfg) return;
  if (typeof data.perDayRate === 'number' && !isNaN(data.perDayRate) && data.perDayRate >= 0) cfg.perDayRate = data.perDayRate;
  if (data.gstTreatment === 'inclusive' || data.gstTreatment === 'exclusive' || data.gstTreatment === 'none') cfg.gstTreatment = data.gstTreatment;
  if (data.wageLineMode === 'aggregated' || data.wageLineMode === 'daily') cfg.wageLineMode = data.wageLineMode;
  if (typeof data.address === 'string') tplMeta[company].address = data.address;
  if (typeof data.abn === 'string') tplMeta[company].abn = data.abn;
  if (typeof data.email === 'string') tplMeta[company].email = data.email;
}

function persistSettings() {
  try {
    var data = {
      asg: {
        perDayRate: companyConfigs.asg.perDayRate,
        address: tplMeta.asg.address,
        abn: tplMeta.asg.abn,
        email: tplMeta.asg.email,
        gstTreatment: companyConfigs.asg.gstTreatment,
        wageLineMode: companyConfigs.asg.wageLineMode,
      },
      sjs: {
        perDayRate: companyConfigs.sjs.perDayRate,
        address: tplMeta.sjs.address,
        abn: tplMeta.sjs.abn,
        email: tplMeta.sjs.email,
        gstTreatment: companyConfigs.sjs.gstTreatment,
        wageLineMode: companyConfigs.sjs.wageLineMode,
      },
    };
    localStorage.setItem('invoice-week-settings', JSON.stringify(data));
  } catch (e) {
    // ignore storage errors
  }
}

function updateWeekState() {
  var calcRate = document.getElementById('calc-rate');
  var weekStart = document.getElementById('week_start');
  var notes = document.getElementById('notes');
  var selectedDays = [];
  var calcDays = document.getElementById('calc-days');
  if (calcDays) {
    Array.prototype.slice.call(calcDays.querySelectorAll('input[data-day]:checked')).forEach(function (cb) {
      selectedDays.push(cb.dataset.day);
    });
  }
  selectedDays = selectedDays.filter(function (day) { return dayOffsets[day] !== undefined; });
  selectedDays.sort(function (a, b) { return dayOffsets[a] - dayOffsets[b]; });

  weekState.workedDays = selectedDays;
  weekState.perDayRate = parseFloat(calcRate && calcRate.value) || 0;
  weekState.weekStarting = weekStart ? weekStart.value : '';
  weekState.notes = notes ? notes.value : '';
}

function renderWageCalculator() {
  var header = document.getElementById('calc-week-range');
  if (header) header.textContent = weekState.weekStarting ? 'Week of ' + fmtWeekRange(weekState.weekStarting) : '';

  var totalEl = document.getElementById('calc-total');
  var addBtn = document.getElementById('calc-add');
  var selected = weekState.workedDays;
  var total = Math.round(selected.length * weekState.perDayRate * 100) / 100;
  if (totalEl) totalEl.textContent = fmt(total);

  var breakdownEl = document.getElementById('calc-breakdown');
  if (breakdownEl) {
    if (!selected.length) {
      breakdownEl.innerHTML = '<span class="muted">Select days worked to calculate wages.</span>';
    } else {
      var parts = selected.map(function (day) { return day + ': ' + fmt(weekState.perDayRate); });
      breakdownEl.innerHTML = parts.join(' | ') + ' → ' + fmt(total);
    }
  }

  if (addBtn) addBtn.disabled = !selected.length;
}

function renderDatesNotes() {
  var weekStart = document.getElementById('week_start');
  var startVal = weekStart ? weekStart.value : '';
  if (!startVal) return;
  
  var startDate = parseLocalDate(startVal);
  if (!startDate) return;
  
  // Normalize to Monday: difference from Sunday (0) to Monday (1)
  var day = startDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  var diff = (day + 6) % 7;
  var normalizedStart = new Date(startDate);
  normalizedStart.setDate(startDate.getDate() - diff);
  normalizedStart.setHours(0, 0, 0, 0);
  
  var dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  dayNames.forEach(function (dayName, idx) {
    var d = new Date(normalizedStart);
    d.setDate(normalizedStart.getDate() + idx);
    var iso = formatDateForInput(d);
    var dateInput = document.querySelector('input[name="date_' + dayName + '"]');
    if (dateInput) dateInput.value = iso;
  });
}

function syncDayToggles(sourceContainer, targetContainer) {
  if (!sourceContainer || !targetContainer) return;
  var sourceBoxes = sourceContainer.querySelectorAll('input[data-day]');
  var targetBoxes = targetContainer.querySelectorAll('input[data-day]');
  if (sourceBoxes.length !== targetBoxes.length) {
    var checked = {};
    Array.prototype.slice.call(sourceBoxes).forEach(function (cb) {
      checked[cb.dataset.day] = true;
    });
    Array.prototype.slice.call(targetBoxes).forEach(function (cb) {
      cb.checked = !!checked[cb.dataset.day];
    });
    return;
  }
  sourceBoxes.forEach(function (box, index) {
    targetBoxes[index].checked = box.checked;
  });
}

/* ---- Preview ---- */
function updatePreview() {
  var tpl = tplMeta[templateInput.value] || tplMeta.asg;

  var pvCompany = document.getElementById('pv-company');
  var pvCompanySub = document.getElementById('pv-company-sub');
  var pvInvNum = document.getElementById('pv-inv-num');
  var pvClientName = document.getElementById('pv-client-name');
  var pvClientContact = document.getElementById('pv-client-contact');
  var pvClientEmail = document.getElementById('pv-client-email');
  var pvClientAddress = document.getElementById('pv-client-address');
  var pvIssueDate = document.getElementById('pv-issue-date');
  var pvDueDate = document.getElementById('pv-due-date');
  var pvItems = document.getElementById('pv-items');
  var pvSubtotal = document.getElementById('pv-subtotal');
  var pvGstRow = document.getElementById('pv-gst-row');
  var pvGst = document.getElementById('pv-gst');
  var pvTotal = document.getElementById('pv-total');
  var pvNotes = document.getElementById('pv-notes');

  if (pvCompany) pvCompany.textContent = window.__previewData ? window.__previewData.repName : '';
  if (pvCompanySub) pvCompanySub.textContent = window.__previewData && window.__previewData.repAbn ? 'ABN ' + window.__previewData.repAbn : '';

  var invNum = document.getElementById('invoice_number');
  if (pvInvNum) pvInvNum.textContent = invNum ? invNum.value : '';

  var cn = document.getElementById('customer_name');
  if (pvClientName) pvClientName.textContent = cn ? cn.value : '';
  var cc = document.getElementById('customer_company');
  if (pvClientContact) pvClientContact.textContent = cc ? cc.value : '';
  var ce = document.getElementById('customer_email');
  if (pvClientEmail) pvClientEmail.textContent = ce ? ce.value : '';
  var ca = document.getElementById('customer_address');
  if (pvClientAddress) pvClientAddress.textContent = ca ? ca.value : '';

  var id = document.getElementById('issue_date');
  if (pvIssueDate) pvIssueDate.textContent = id ? id.value : '';
  var dd = document.getElementById('due_date');
  if (pvDueDate) pvDueDate.textContent = dd ? dd.value : '';

  var rows = itemRows();
  if (pvItems) {
    if (rows.length === 0) {
      pvItems.innerHTML = '<tr class="preview-empty"><td colspan="5">No items yet</td></tr>';
    } else {
      var html = '';
      rows.forEach(function (row, i) {
        var d = row.querySelector('input[name="item_description"]').value;
        var q = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
        var r = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;
        var a = q * r;
        html += '<tr><td>' + (i + 1) + '</td><td>' + escHtml(d) + '</td><td class="num">' + q + '</td><td class="num">' + fmt(r) + '</td><td class="num">' + fmt(a) + '</td></tr>';
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

  var desc = document.createElement('input');
  desc.type = 'text';
  desc.className = 'input';
  desc.placeholder = 'Description';
  desc.name = 'item_description';
  desc.value = (data && data.description) || '';

  var qty = document.createElement('input');
  qty.type = 'number';
  qty.className = 'input';
  qty.name = 'item_qty';
  qty.min = '0';
  qty.step = 'any';
  qty.placeholder = 'Qty';
  qty.value = (data && data.quantity) || '1';

  var rate = document.createElement('input');
  rate.type = 'number';
  rate.className = 'input';
  rate.name = 'item_rate';
  rate.min = '0';
  rate.step = '0.01';
  rate.placeholder = 'Rate';
  rate.value = (data && data.rate) || '';

  var amount = document.createElement('span');
  amount.className = 'line-amount';
  amount.textContent = '$0.00';

  var remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'line-remove';
  remove.setAttribute('aria-label', 'Remove line');
  remove.textContent = '×';

  row.appendChild(desc);
  row.appendChild(qty);
  row.appendChild(rate);
  row.appendChild(amount);
  row.appendChild(remove);

  [desc, qty, rate].forEach(function (el) {
    el.addEventListener('input', recalc);
  });
  remove.addEventListener('click', function () {
    row.remove();
    recalc();
  });

  lines.appendChild(row);
  recalc();
  if (desc && typeof desc.focus === 'function') desc.focus();
  return row;
}

function itemRows() {
  return Array.prototype.slice.call(lines.querySelectorAll('.line-row:not(.line-head)'));
}

function recalc() {
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
    var contactInput = document.getElementById('customer_company');
    var emailInput = document.getElementById('customer_email');
    var addressInput = document.getElementById('customer_address');
    if (nameInput) nameInput.value = tpl.company || tpl.name;
    if (contactInput) contactInput.value = tpl.email || '';
    if (emailInput) emailInput.value = tpl.email || '';
    if (addressInput) addressInput.value = tpl.full_address || tpl.address || '';
  }
  var rateInput = document.getElementById('calc-rate');
  if (rateInput && cfg.perDayRate) rateInput.value = cfg.perDayRate;

  var notes = document.getElementById('notes');
  if (notes && tpl) {
    notes.value = '';
  }

  updateWeekState();
  renderWageCalculator();
  renderDatesNotes();
  recalc();
}

tplButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    setTemplate(btn.dataset.template);
  });
});

if (gstInput) gstInput.addEventListener('change', recalc);

var addLineBtn = document.getElementById('add-line');
if (addLineBtn) addLineBtn.addEventListener('click', function () {
  addLine();
});

/* ---- Preview live bindings ---- */
var previewFields = ['invoice_number', 'customer_name', 'customer_company', 'customer_email', 'customer_address', 'issue_date', 'due_date', 'notes'];
previewFields.forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('input', updatePreview);
});

/* ---- Form submit ---- */
var actionField = document.getElementById('action-field');

var submitDraft = document.getElementById('submit-draft');
var submitSendBtn = document.getElementById('submit-send');
var submitDownload = document.getElementById('submit-download');

if (submitDraft) submitDraft.addEventListener('click', function () {
  actionField.value = 'draft';
});
if (submitSendBtn) submitSendBtn.addEventListener('click', function () {
  actionField.value = 'send';
});
if (submitDownload) submitDownload.addEventListener('click', function () {
  actionField.value = 'download';
  if (form) form.submit();
});

function showError(msg) {
  var box = document.getElementById('form-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'form-error';
    box.className = 'flash flash-error';
    if (form) form.insertBefore(box, form.firstChild);
  }
  box.textContent = msg;
}

function clearError() {
  var box = document.getElementById('form-error');
  if (box) box.remove();
}

function buildPayload() {
  var data = new FormData(form);
  var items = itemRows().map(function (row) {
    return {
      description: row.querySelector('input[name="item_description"]').value.trim(),
      quantity: parseFloat(row.querySelector('input[name="item_qty"]').value) || 0,
      rate: parseFloat(row.querySelector('input[name="item_rate"]').value) || 0,
    };
  }).filter(function (it) { return it.description; });

  return {
    template: templateInput.value,
    invoice_number: data.get('invoice_number'),
    customer_name: data.get('customer_name'),
    customer_company: data.get('customer_company'),
    customer_email: data.get('customer_email'),
    customer_address: data.get('customer_address'),
    issue_date: data.get('issue_date'),
    due_date: data.get('due_date'),
    notes: data.get('notes'),
    gst: gstInput.checked,
    items: items,
    send_now: document.getElementById('send_now').checked,
  };
}

if (form) form.addEventListener('submit', function (e) {
  var action = actionField.value || 'draft';
  if (action === 'download') {
    document.getElementById('send_now').checked = false;
    var fd = new FormData(form);
    fd.set('action', 'download');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', form.action || '/api/invoices', true);
    xhr.responseType = 'blob';
    xhr.onload = function () {
      if (xhr.status === 200) {
        var blob = xhr.response;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (document.getElementById('invoice_number').value || 'invoice') + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        showError('Download failed.');
      }
    };
    xhr.onerror = function () { showError('Network error.'); };
    xhr.send(fd);
    return;
  }
  e.preventDefault();
  document.getElementById('send_now').checked = action === 'send';
  var payload = buildPayload();

  if (!payload.items.length) {
    showError('Add at least one line item with a description.');
    return;
  }
  if (!payload.customer_name) {
    showError('Customer name is required.');
    return;
  }

  clearError();
  if (submitSendBtn) {
    submitSendBtn.disabled = true;
    submitSendBtn.textContent = 'Working…';
  }

  fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    })
    .then(function (res) {
      if (!res.ok) {
        showError(res.body.error || 'Something went wrong. Try again.');
        if (submitSendBtn) {
          submitSendBtn.disabled = false;
          submitSendBtn.textContent = 'Save & email';
        }
        return;
      }
      window.location.href = '/invoices/' + res.body.id;
    })
    .catch(function (err) {
      showError(err.message || 'Network error.');
      if (submitSendBtn) {
        submitSendBtn.disabled = false;
        submitSendBtn.textContent = 'Save & email';
      }
    });
});

/* ---- Wage calculator ---- */
var calcRate = document.getElementById('calc-rate');
var calcDays = document.getElementById('calc-days');
var calcAdd = document.getElementById('calc-add');
var weekStart = document.getElementById('week_start');
var notesEl = document.getElementById('notes');

function getSelectedDays() {
  var selected = [];
  if (calcDays) {
    Array.prototype.slice.call(calcDays.querySelectorAll('input[data-day]:checked')).forEach(function (cb) {
      selected.push(cb.dataset.day);
    });
  }
  return selected.filter(function (day) { return dayOffsets[day] !== undefined; }).sort(function (a, b) { return dayOffsets[a] - dayOffsets[b]; });
}

function onWeekStateChanged(source) {
  // When source is wage-days, we need to sync to calc-days BEFORE reading state
  if (source === 'wage-days') {
    syncDayToggles(document.getElementById('wage-days'), document.getElementById('calc-days'));
  }
  
  updateWeekState();
  renderWageCalculator();
  renderDatesNotes();
  
  // After updating state, sync the other direction
  if (source === 'calc-days' || source === 'calc-rate' || source === 'week-start') {
    syncDayToggles(document.getElementById('calc-days'), document.getElementById('wage-days'));
  } else if (source === 'wage-days') {
    // Already synced above, but do it again to ensure consistency
    syncDayToggles(document.getElementById('wage-days'), document.getElementById('calc-days'));
  }
  
  updatePreview();
  recalc();
}

// Set up workers without race conditions using a single source of truth
if (calcRate) calcRate.addEventListener('input', function() {
  onWeekStateChanged('calc-rate');
});

if (calcDays) {
  calcDays.addEventListener('change', function(e) {
    onWeekStateChanged('calc-days');
  });
}

if (weekStart) {
  weekStart.addEventListener('change', function() {
    onWeekStateChanged('week-start');
  });
}

if (wageDays) {
  wageDays.addEventListener('change', function(e) {
    onWeekStateChanged('wage-days');
  });
}

if (notesEl) notesEl.addEventListener('input', updatePreview);

if (calcAdd) calcAdd.addEventListener('click', function () {
  updateWeekState();
  var selected = weekState.workedDays;
  if (!selected.length) return;
  var cfg = companyConfigs[weekState.company] || companyConfigs.asg;
  var mode = cfg.wageLineMode || 'aggregated';
  var amount = Math.round(selected.length * weekState.perDayRate * 100) / 100;
  var rate = weekState.perDayRate;
  var dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  if (mode === 'daily') {
    selected.forEach(function (day) {
      var dateInput = document.querySelector('input[name="date_' + day + '"]');
      var dateText = dateInput && dateInput.value ? ' ' + dateInput.value : '';
      addLine({ description: 'Wages — ' + day + dateText, quantity: 1, rate: rate, amount: rate });
    });
  } else {
    var range = weekState.weekStarting ? 'week of ' + fmtWeekRange(weekState.weekStarting) : '';
    var suffix = selected.length === 1 ? ' (1 day)' : ' (' + selected.length + ' days)';
    addLine({ description: 'Wages — ' + range + suffix, quantity: 1, rate: amount, amount: amount });
  }
});

// Initialize
loadPersistedSettings();

var initialCompany = templateInput ? templateInput.value : 'asg';
weekState.company = initialCompany;
var initCfg = companyConfigs[initialCompany] || companyConfigs.asg;
var initRate = document.getElementById('calc-rate');
if (initRate && initCfg.perDayRate) initRate.value = initCfg.perDayRate;

setTemplate(initialCompany);
onWeekStateChanged();

addLine();