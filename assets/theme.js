/* Light / dark theme. Load this in <head> (no defer) so the right colours are set before the page paints.
   - With no saved choice it follows the visitor's system setting, including when the system setting changes.
   - The toggle button (id="theme-toggle") saves an explicit choice in localStorage. */
(function () {
  'use strict';
  var KEY = 'site-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() { try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } }
  function system() { return mq && mq.matches ? 'dark' : 'light'; }
  function apply(theme) { root.setAttribute('data-theme', theme); sync(); }
  function current() { return root.getAttribute('data-theme') || system(); }

  var btn = null;
  function sync() {
    if (!btn) return;
    var dark = current() === 'dark';
    btn.setAttribute('aria-checked', dark ? 'true' : 'false');
  }

  apply(saved() || system());

  if (mq) {
    var onChange = function () { if (!saved()) apply(system()); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  document.addEventListener('DOMContentLoaded', function () {
    btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.hidden = false;      // the toggle only works with JavaScript, so it is hidden until now
    sync();
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) { /* private mode: the choice just lasts for this page */ }
      apply(next);
    });
  });
})();
