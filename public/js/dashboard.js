(function () {
  'use strict';
  const select = document.querySelector('[data-filter-status]');
  document.querySelectorAll('[data-select-all]').forEach(function (selectAll) {
    selectAll.addEventListener('change', function () {
      var form = selectAll.closest('form');
      if (form) form.querySelectorAll('input[name="delete_ids"]').forEach(function (box) { box.checked = selectAll.checked; });
    });
  });
  if (!select) return;
  const outstandingTable = document.querySelector('.card .table');
  const paidSection = document.querySelector('.card + .card');
  select.addEventListener('change', function () {
    const value = select.value;
    if (!outstandingTable) return;
    outstandingTable.querySelectorAll('tbody tr[data-status]').forEach(function (row) {
      row.hidden = value !== '' && row.dataset.status !== value;
    });
    if (paidSection) paidSection.hidden = value !== '';
  });
})();
