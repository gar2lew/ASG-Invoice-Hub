(function () {
  'use strict';

  var form = document.getElementById('invoice-form');
  var lines = document.getElementById('lines');
  var gstInput = document.getElementById('gst');
  var gstRow = document.getElementById('gst-row');
  var tSub = document.getElementById('t-subtotal');
  var tGst = document.getElementById('t-gst');
  var tTotal = document.getElementById('t-total');
  var templateInput = form.querySelector('input[name="template"]');
  var tplButtons = Array.prototype.slice.call(form.querySelectorAll('.tpl'));
  var submitSend = document.getElementById('submit-send');

  var tplMeta = {
    asg: {
      name: 'Amplify Solutions Group',
      abn: '43 663 126 725',
      address: '14C, 1 The Esplanade, Mount pleasant, 6153',
      phone: '08 6147 7927',
      contact: 'Natalie Simich',
      email: 'Natalie@sjssolutionscorp.com.au',
      clientAddress: 'Unit 14C, 1/1 The Esplanade, Mount Pleasant, WA 6053.',
    },
    sjs: {
      name: 'SJS WEALTH SOLUTIONS PTY LTD',
      abn: '89 622 469 845',
      address: '',
      phone: '',
      contact: 'Natalie Simich',
      email: 'Natalie@sjssolutionscorp.com.au',
      clientAddress: 'PO Box 3330, Beeliar Drive, Success WA 6964',
    },
  };

  function fmt(n) {
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    if (pvNotes) pvNotes.textContent = notes ? notes.value : '';
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
    remove.textContent = '\u00D7';

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
    updatePreview();
  }

  /* ---- Template ---- */
  function setTemplate(name) {
    templateInput.value = name;
    tplButtons.forEach(function (btn) {
      var active = btn.dataset.template === name;
      btn.classList.toggle('tpl-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    var tpl = tplMeta[name];
    if (tpl) {
      var nameInput = document.getElementById('customer_name');
      var contactInput = document.getElementById('customer_company');
      var emailInput = document.getElementById('customer_email');
      var addressInput = document.getElementById('customer_address');
      if (nameInput) nameInput.value = tpl.name;
      if (contactInput) contactInput.value = tpl.contact;
      if (emailInput) emailInput.value = tpl.email;
      if (addressInput) addressInput.value = tpl.clientAddress;
    }
    updatePreview();
  }

  tplButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTemplate(btn.dataset.template);
    });
  });

  gstInput.addEventListener('change', recalc);

  document.getElementById('add-line').addEventListener('click', function () {
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
  var submitSend = document.getElementById('submit-send');

  if (submitDraft) submitDraft.addEventListener('click', function () {
    actionField.value = 'draft';
  });
  if (submitSend) submitSend.addEventListener('click', function () {
    actionField.value = 'send';
  });

  function showError(msg) {
    var box = document.getElementById('form-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'form-error';
      box.className = 'flash flash-error';
      form.insertBefore(box, form.firstChild);
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var action = actionField.value || 'draft';
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
    submitSend.disabled = true;
    submitSend.textContent = 'Working\u2026';

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
          submitSend.disabled = false;
          submitSend.textContent = 'Save & email';
          return;
        }
        window.location.href = '/invoices/' + res.body.id;
      })
      .catch(function (err) {
        showError(err.message || 'Network error.');
        submitSend.disabled = false;
        submitSend.textContent = 'Save & email';
      });
  });

  /* ---- Wage calculator ---- */
  function calcRecalc() {
    var rate = parseFloat(document.getElementById('calc-rate').value) || 0;
    var total = 0;
    var days = document.getElementById('calc-days');
    if (!days) return;
    Array.prototype.slice.call(days.querySelectorAll('input[type="checkbox"]:checked')).forEach(function (cb) {
      total += rate * parseFloat(cb.value);
    });
    var el = document.getElementById('calc-total');
    if (el) el.textContent = fmt(total);
  }

  var calcRate = document.getElementById('calc-rate');
  var calcDays = document.getElementById('calc-days');
  var calcAdd = document.getElementById('calc-add');
  if (calcRate) calcRate.addEventListener('input', calcRecalc);
  if (calcDays) calcDays.addEventListener('change', calcRecalc);
  if (calcAdd) calcAdd.addEventListener('click', function () {
    var rate = parseFloat(calcRate.value) || 0;
    var daysCount = 0;
    Array.prototype.slice.call(calcDays.querySelectorAll('input[type="checkbox"]:checked')).forEach(function (cb) {
      daysCount += parseFloat(cb.value);
    });
    if (daysCount === 0) return;
    var amount = Math.round(rate * daysCount * 100) / 100;
    addLine({ description: 'Weekly Wage/Retainer', quantity: 1, rate: amount });
  });

  addLine();
  setTemplate('asg');
})();
