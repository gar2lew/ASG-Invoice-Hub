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
  const historyTable = document.querySelector('.card .table');
  select.addEventListener('change', function () {
    const value = select.value;
    if (!historyTable) return;
    historyTable.querySelectorAll('tbody tr[data-status]').forEach(function (row) {
      row.hidden = value !== '' && row.dataset.status !== value;
    });
  });
})();
