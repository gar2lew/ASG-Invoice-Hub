(function () {
  'use strict';

  const form = document.getElementById('invoice-form');
  const lines = document.getElementById('lines');
  const gstInput = document.getElementById('gst');
  const gstRow = document.getElementById('gst-row');
  const tSub = document.getElementById('t-subtotal');
  const tGst = document.getElementById('t-gst');
  const tTotal = document.getElementById('t-total');
  const templateInput = form.querySelector('input[name="template"]');
  const tplButtons = Array.prototype.slice.call(form.querySelectorAll('.tpl'));
  const submitSend = document.getElementById('submit-send');

  function fmt(n) {
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function addLine(data) {
    const row = document.createElement('div');
    row.className = 'line-row';

    const desc = document.createElement('input');
    desc.type = 'text';
    desc.className = 'input';
    desc.placeholder = 'Description';
    desc.name = 'item_description';
    desc.value = (data && data.description) || '';

    const qty = document.createElement('input');
    qty.type = 'number';
    qty.className = 'input';
    qty.name = 'item_qty';
    qty.min = '0';
    qty.step = 'any';
    qty.placeholder = 'Qty';
    qty.value = (data && data.quantity) || '1';

    const rate = document.createElement('input');
    rate.type = 'number';
    rate.className = 'input';
    rate.name = 'item_rate';
    rate.min = '0';
    rate.step = '0.01';
    rate.placeholder = 'Rate';
    rate.value = (data && data.rate) || '';

    const amount = document.createElement('span');
    amount.className = 'line-amount';
    amount.textContent = '$0.00';

    const remove = document.createElement('button');
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
    let subtotal = 0;
    itemRows().forEach(function (row) {
      const qty = parseFloat(row.querySelector('input[name="item_qty"]').value) || 0;
      const rate = parseFloat(row.querySelector('input[name="item_rate"]').value) || 0;
      const amount = qty * rate;
      subtotal += amount;
      row.querySelector('.line-amount').textContent = fmt(amount);
    });
    const gst = gstInput.checked ? subtotal * 0.1 : 0;
    tSub.textContent = fmt(subtotal);
    tGst.textContent = fmt(gst);
    tTotal.textContent = fmt(subtotal + gst);
    gstRow.hidden = !gstInput.checked;
  }

  function setTemplate(name) {
    templateInput.value = name;
    tplButtons.forEach(function (btn) {
      const active = btn.dataset.template === name;
      btn.classList.toggle('tpl-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
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

  function showError(msg) {
    let box = document.getElementById('form-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'form-error';
      box.className = 'flash flash-error';
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = msg;
  }

  function clearError() {
    const box = document.getElementById('form-error');
    if (box) box.remove();
  }

  function buildPayload() {
    const data = new FormData(form);
    const items = itemRows().map(function (row) {
      return {
        description: row.querySelector('input[name="item_description"]').value.trim(),
        quantity: parseFloat(row.querySelector('input[name="item_qty"]').value) || 0,
        rate: parseFloat(row.querySelector('input[name="item_rate"]').value) || 0,
      };
    }).filter(function (it) { return it.description; });

    return {
      template: templateInput.value,
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
    const action = document.activeElement && document.activeElement.name === 'action'
      ? document.activeElement.value
      : 'draft';
    document.getElementById('send_now').checked = action === 'send';
    const payload = buildPayload();

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
    var labels = [];
    Array.prototype.slice.call(calcDays.querySelectorAll('input[type="checkbox"]:checked')).forEach(function (cb) {
      daysCount += parseFloat(cb.value);
      labels.push(cb.parentElement.querySelector('span').textContent.trim());
    });
    if (daysCount === 0) return;
    var desc = 'Weekly wage (' + labels.join(', ') + ')';
    var amount = Math.round(rate * daysCount * 100) / 100;
    addLine({ description: desc, quantity: 1, rate: amount });
  });

  addLine();
})();
