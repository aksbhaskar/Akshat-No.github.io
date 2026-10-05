/* Dark mode: follows the device setting until the visitor picks one with the
   corner switch, then remembers that choice. Loaded in <head> so the page
   never flashes the wrong colours. */
(function () {
  var root = document.documentElement, KEY = 'theme';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function system() { return media && media.matches ? 'dark' : 'light'; }
  function apply(t) { root.setAttribute('data-theme', t); }
  apply(saved || system());
  if (media && media.addEventListener) media.addEventListener('change', function () { if (!saved) { apply(system()); paint(); } });

  var MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>';
  var btn;
  function paint() {
    if (!btn) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.innerHTML = dark ? SUN : MOON;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = dark ? 'light mode' : 'dark mode';
  }
  function mount() {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'theme-switch';
    btn.addEventListener('click', function () {
      saved = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(saved); paint();
      try { localStorage.setItem(KEY, saved); } catch (e) {}
    });
    paint();
    document.body.appendChild(btn);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
