// Theme toggle: persists to localStorage, respects system preference, applies immediately
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

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    var theme = getSavedTheme() || getSystemTheme();
    applyTheme(theme);
  }

  // Apply immediately to avoid flash
  initTheme();

  // Toggle button click handler
  function setupToggle() {
    var btn = document.getElementById('theme-toggle');
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
    document.addEventListener('DOMContentLoaded', setupToggle);
  } else {
    setupToggle();
  }
})();
