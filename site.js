/* Shared behaviour across the site: a night-mode toggle (on the paper
   pages), a few Easter eggs, and small flourishes. Vanilla, no deps. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Night mode ───────────────────────────────────────────────
     Only offered on the standard "paper document" pages, marked
     with body.paper. Bespoke pages keep their own designs. */
  if (document.body.classList.contains('paper')) {
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
      var isDark = root.classList.contains('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
      paint();
      if (isDark && once('dark1')) whisper('easier on the eyes. good call.');
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

  /* ── A little whisper toast, bottom-left ──────────────────── */
  var whisperBusy = false;
  function whisper(msg, dur) {
    if (whisperBusy) return;
    whisperBusy = true;
    var w = document.createElement('div');
    w.className = 'whisper';
    w.textContent = msg;
    document.body.appendChild(w);
    void w.offsetWidth;
    w.classList.add('show');
    setTimeout(function () {
      w.classList.remove('show');
      setTimeout(function () { w.remove(); whisperBusy = false; }, 500);
    }, dur || 5000);
  }

  /* Fire something at most once per browsing session */
  function once(key) {
    try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, '1'); return true; }
    catch (e) { return true; }
  }

  /* A little speech bubble anchored above an element */
  var sharedBubble = null, bubbleTimer = null;
  function bubbleAt(el, text, dur) {
    if (!sharedBubble) { sharedBubble = document.createElement('div'); sharedBubble.className = 'poke-bubble'; document.body.appendChild(sharedBubble); }
    sharedBubble.textContent = text;
    var r = el.getBoundingClientRect();
    sharedBubble.style.left = (r.left + r.width / 2) + 'px';
    sharedBubble.style.top = (r.top - 8) + 'px';
    sharedBubble.style.transform = 'translate(-50%, -100%)';
    void sharedBubble.offsetWidth; sharedBubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { if (sharedBubble) sharedBubble.classList.remove('show'); }, dur || 1900);
  }

  /* ── Per-page flavour, keyed off the file name ────────────── */
  var pageKey = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  var PAGES = {
    index:        { end: 'you read the whole thing. that means a lot.' },
    education:    { end: 'yes, i do actually attend class.' },
    experience:   { end: "and that's just the paper trail." },
    awards:       { end: "ok, that's enough flexing. probably." },
    research:     { end: 'the footnotes are the best part.' },
    aipolicy:     { end: 'peer-reviewed and everything.' },
    goi:          { end: 'policy is more fun than it sounds. sometimes.' },
    lgp:          { end: '3.2% acceptance. still feels unreal.' },
    greatideasseminar: { end: 'turns out nobel laureates are pretty chill.' },
    mathapprenticeship: { end: 'proofs over vibes.' },
    president:    { end: "still can't quite believe that one." },
    edunomix:     { end: 'built this before i could drive.' },
    taxcity:      { end: 'yes. taxes. thrilling, i know.' },
    podcast:      { end: 'give it a listen sometime?' },
    press:        { end: 'hi to any journalists reading this.' },
    bookshelf:    { end: 'found your next read yet?' },
    betweentheworldandme: { end: 'worth the read. genuinely.' },
    gym:          { end: "reading about squats isn't leg day." },
    budget:       { end: 'now go check your real bank balance.' },
    chesstimer:   { end: 'your move.' },
    ladakh:       { end: 'pack warm. so, when do we leave?' },
    top1000:      { end: 'how many could you actually pull off?' },
    yc:           { end: 'startup school was a trip.' },
    dpsrkp:       { end: 'best years, cheesy as that sounds.' },
    policypivot:  { end: 'small policy, big ripple.' },
    pi:           { end: '3.14159 26535... ok i will stop.' },
    '404':        { end: 'lost? happens to the best of us.' }
  };
  function pageBit(name, fallback) { var p = PAGES[pageKey]; return (p && p[name]) || fallback; }

  /* ── The title reacts to the visitor (the "come back :(" vibe) ── */
  var realTitle = document.title;
  var titleTemp = false, awaySpin = null, idleTimer = null;
  function setTitle(m) { document.title = m; titleTemp = true; }
  function restoreTitle() { if (titleTemp) { document.title = realTitle; titleTemp = false; } }

  var awayMsgs = ['come back :(', 'hello? :(', "i'll wait...", 'still here :)'];
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimeout(idleTimer);
      clearInterval(awaySpin);
      var i = 0; setTitle(awayMsgs[0]);
      awaySpin = setInterval(function () { i = (i + 1) % awayMsgs.length; document.title = awayMsgs[i]; }, 2400);
    } else {
      clearInterval(awaySpin); awaySpin = null;
      document.title = 'yay, you came back :)'; titleTemp = true;
      setTimeout(restoreTitle, 1700);
      scheduleIdle();
    }
  });

  /* Nudge the tab if the visitor goes quiet for a while */
  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (!document.hidden) setTitle('still there? :)'); }, 60000);
  }
  ['mousemove', 'scroll', 'keydown', 'click', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      if (titleTemp && !document.hidden && document.title === 'still there? :)') restoreTitle();
      scheduleIdle();
    }, { passive: true });
  });
  scheduleIdle();

  /* Browsing in the small hours? Say hi. */
  var hr = new Date().getHours();
  if (hr >= 0 && hr < 5) setTimeout(function () { whisper('up late? me too.'); }, 3500);

  /* Reward finishing a page, with a line tailored to that page */
  var endMsg = pageBit('end', 'you read the whole thing. that means a lot.');
  var endShown = false;
  function showEnd() { if (!endShown && once('end_' + pageKey)) { endShown = true; whisper(endMsg, 6000); } }
  window.addEventListener('scroll', function () {
    if (endShown) return;
    var scrollable = document.body.scrollHeight - window.innerHeight;
    if (scrollable < 400) return;
    if (window.scrollY >= scrollable - 40) showEnd();
  }, { passive: true });
  // Short pages can't scroll to a bottom, so offer the line after a beat instead
  setTimeout(function () {
    if (!endShown && (document.body.scrollHeight - window.innerHeight) < 400) showEnd();
  }, 4500);

  /* Poke the author photo (homepage) */
  var photo = document.querySelector('.author-photo');
  if (photo) {
    var quips = ['hi!', "that's me", 'hey, stop poking', 'ok that tickles', 'why are we still doing this', 'fine, one more', 'ok bye, for real'];
    var qi = 0;
    photo.style.cursor = 'pointer';
    photo.addEventListener('click', function () {
      photo.classList.remove('poke'); void photo.offsetWidth; photo.classList.add('poke');
      bubbleAt(photo, quips[Math.min(qi, quips.length - 1)]);
      qi++;
    });
  }

  /* Trying to right-click / save a photo? */
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.tagName === 'IMG' && once('rc')) whisper('trying to save that? bold move.');
  });

  /* A quiet nod for sticking around a few minutes */
  setTimeout(function () {
    if (!document.hidden && once('stay')) whisper("you've been here a while. flattered, honestly.");
  }, 180000);

  /* Wink from the footer */
  var footer = document.querySelector('.footer-text');
  if (footer) footer.addEventListener('mouseenter', function () { bubbleAt(footer, 'made with too much care.'); });

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
