(function () {
  'use strict';
  const select = document.querySelector('[data-filter-status]');
  if (!select) return;
  select.addEventListener('change', function () {
    const value = select.value;
    document.querySelectorAll('tbody tr[data-status]').forEach(function (row) {
      row.hidden = value !== '' && row.dataset.status !== value;
    });
  });
})();
