// Theme toggle: persists to localStorage, defaults to light, applies immediately
(function () {
  'use strict';

  var STORAGE_KEY = 'hermes-theme';

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    var theme = getSavedTheme() || 'light';
    applyTheme(theme);
  }

  // Apply immediately to avoid flash
  initTheme();

  // Toggle button click handler
  function setupToggle(buttonId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;

    function updateLabel() {
      var current = document.documentElement.getAttribute('data-theme');
      var label = btn.querySelector('.theme-label');
      if (label) label.textContent = current === 'light' ? 'Light' : 'Dark';
    }

    updateLabel();

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) { /* ignore */ }
      updateLabel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupToggle('theme-toggle');
      setupToggle('theme-toggle-mobile');
      highlightBottomNav();
    });
  } else {
    setupToggle('theme-toggle');
    setupToggle('theme-toggle-mobile');
    highlightBottomNav();
  }

  function highlightBottomNav() {
    var path = window.location.pathname;
    var items = document.querySelectorAll('.bottom-nav-item');
    items.forEach(function (item) {
      var href = item.getAttribute('href');
      if (href === '/' && path === '/') {
        item.classList.add('active');
      } else if (href !== '/' && path.startsWith(href)) {
        item.classList.add('active');
      }
    });
  }
})();
