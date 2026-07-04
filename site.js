/* Shared behaviour across the site: a night-mode toggle (on the paper
   pages), a few Easter eggs, and small flourishes. Vanilla, no deps. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Night mode ───────────────────────────────────────────────
     Only offered on the standard "paper document" pages, which are
     the ones that define a --paper custom property. */
  function paperPage() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
    return v !== '';
  }
  if (paperPage()) {
    var root = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) {}
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored === null && prefersDark)) root.classList.add('dark');

    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle night mode');
    var paint = function () { btn.textContent = root.classList.contains('dark') ? '☀' : '☾'; }; // sun / moon
    paint();
    btn.addEventListener('click', function () {
      root.classList.toggle('dark');
      try { localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light'); } catch (e) {}
      paint();
    });
    (document.body || document.documentElement).appendChild(btn);
  }

  /* ── Count up any hero stats present ──────────────────────── */
  function countUp(el) {
    var raw = el.textContent;
    var tokens = raw.match(/\d[\d,]*(?:\.\d+)?/g);
    if (!tokens) return;
    var target = tokens.reduce(function (a, b) {
      return parseFloat(b.replace(/,/g, '')) > parseFloat(a.replace(/,/g, '')) ? b : a;
    });
    var decimals = (target.split('.')[1] || '').length;
    var grouped = target.indexOf(',') !== -1;
    var end = parseFloat(target.replace(/,/g, ''));
    function fmt(n) {
      var v = decimals ? n.toFixed(decimals) : String(Math.round(n));
      if (grouped) {
        var p = v.split('.');
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        v = p.join('.');
      }
      return v;
    }
    var dur = 1400, t0 = performance.now();
    (function frame(t) {
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = raw.replace(target, fmt(end * eased));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = raw;
    })(t0);
    setTimeout(function () { el.textContent = raw; }, dur + 500); // guarantee final value
  }
  var stats = document.querySelectorAll('.hero-stat-num');
  if (stats.length && !reduceMotion) {
    setTimeout(function () { stats.forEach(countUp); }, 250);
  }

  /* ── Gentle 3D tilt on framed photos ──────────────────────── */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.plate-frame, [data-tilt]').forEach(function (el) {
      el.style.transition = 'transform 0.3s ease';
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform 0s';
        el.style.transform = 'perspective(700px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform 0.4s ease';
        el.style.transform = '';
      });
    });
  }

  /* ── Cheeky title when the visitor tabs away ──────────────── */
  var realTitle = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? 'come back :(' : realTitle;
  });

  /* ── A note for anyone who opens the console ──────────────── */
  console.log('%cAkshat Bhaskar', 'font:700 22px Georgia,serif;color:#a04030');
  console.log(
    '%cYou opened the console. Respect.\n' +
    'This whole site is hand-written, no framework. If you poke at the source, you are my kind of person.\n' +
    'Say hi: bhaskarakshat22@gmail.com\n\n' +
    'PS. try the Konami code:  up up down down left right left right B A',
    'font:13px monospace;color:#888;line-height:1.6'
  );

  /* ── Konami code -> an academic ink stamp ─────────────────── */
  var konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var kpos = 0;
  function stamp() {
    var old = document.querySelector('.stamp');
    if (old) old.remove();
    var s = document.createElement('div');
    s.className = 'stamp';
    s.innerHTML = '<span class="stamp-main">Approved</span><span class="stamp-sub">Certified Curious</span>';
    document.body.appendChild(s);
    void s.offsetWidth; // force reflow so the animation plays
    s.classList.add('show');
    setTimeout(function () { s.classList.add('hide'); setTimeout(function () { s.remove(); }, 650); }, 2200);
  }
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === konami[kpos]) {
      kpos++;
      if (kpos === konami.length) { kpos = 0; stamp(); }
    } else {
      kpos = (k === konami[0]) ? 1 : 0;
    }
  });
})();
