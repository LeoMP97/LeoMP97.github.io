/* Chapter menu for small screens: a button that shows and hides the chapter list. */
(function () {
  var btn = document.getElementById('menu-btn'), nav = document.getElementById('sidebar');
  if (!btn || !nav) return;
  function setOpen(open, returnFocus) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
    else if (returnFocus) btn.focus();
  }
  btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a') && e.target.closest('a').getAttribute('href').charAt(0) === '#') setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false, true);
  });
})();
