/* Shared behaviour across the site: a night-mode toggle (on the paper
   pages), a few Easter eggs, and small flourishes. Vanilla, no deps. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ── Night mode ───────────────────────────────────────────────
     Only offered on the standard "paper document" pages, marked
     with body.paper. Bespoke pages keep their own designs. */
  if (document.body.classList.contains('paper')) {
    /* Light is the default. The site is a paper document and it should
       open as one, whatever the visitor's OS prefers. Night mode is
       opt-in, and once chosen it sticks across pages and visits. */
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) {}
    if (stored === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    /* Keep the browser chrome in step with the page: the theme-color
       meta names each page's paper, so tint it ink at night. */
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    var dayColor = metaTheme ? metaTheme.getAttribute('content') : null;
    function paintChrome() {
      if (metaTheme) metaTheme.setAttribute('content', root.classList.contains('dark') ? '#16150f' : dayColor);
    }
    paintChrome();

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
      paintChrome();
      if (isDark && once('dark1')) whisper('easier on the eyes. good call.');
      discover('night', true);
    });
    (document.body || document.documentElement).appendChild(btn);
  }

  /* ── Mirror the nav overlay's state onto the body ───────────
     Every page opens the menu with its own inline script. Rather
     than teach all of them a new trick, watch the overlay and copy
     its state up to the body, so the topbar can get out of the way
     (see .nav-open in theme.css). */
  (function () {
    var ov = document.getElementById('nav-overlay');
    if (!ov || !window.MutationObserver) return;
    function sync() {
      var open = ov.classList.contains('open');
      document.body.classList.toggle('nav-open', open);
      /* The closed menu is aria-hidden, but its links stayed in the tab
         order, so keyboard focus disappeared into a menu nobody could
         see. inert takes them out of the tree and the tab order both.
         Set from script rather than markup: if this file fails to load,
         the menu stays usable instead of being permanently inert. */
      if (open) ov.removeAttribute('inert');
      else ov.setAttribute('inert', '');
    }
    new MutationObserver(sync).observe(ov, { attributes: true, attributeFilter: ['class'] });
    sync();
  })();

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
      /* A mosaic is one photograph made of three. Tilting each cell on
         its own would shear the seams apart, so let the whole block
         tilt together (it carries data-tilt) and leave the cells be. */
      if (el.closest('.plate-mosaic') && !el.hasAttribute('data-tilt')) return;
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
  function whisper(msg, dur, onClick) {
    if (whisperBusy) return;
    whisperBusy = true;
    var w = document.createElement('div');
    w.className = 'whisper';
    w.textContent = msg;
    if (onClick) {
      w.style.pointerEvents = 'auto';
      w.style.cursor = 'pointer';
      w.addEventListener('click', function () { onClick(); w.classList.remove('show'); });
    }
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
    now:          { end: 'that was true when i wrote it, anyway.' },
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
    budget:       { end: 'now go check your real bank balance.' },
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
    'PS. try the Konami code:  up up down down left right left right B A\n' +
    'PPS. the credits live at /humans.txt',
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
    discover('konami', true);
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

  /* ══════════════════════════════════════════════════════════════
     Shared helpers for the newer features
  ══════════════════════════════════════════════════════════════ */
  function copyText(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text); } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    } catch (e) {}
  }
  function docTitle() { return document.title.replace(/\s*[|]\s*Akshat Bhaskar\s*$/, '').trim() || 'akshatbhaskar.ninja'; }

  /* Soft page fade on internal navigation */
  if (!reduceMotion) root.classList.add('page-fade');
  function navTo(href) {
    if (!href) return;
    if (/\.pdf($|\?)/i.test(href)) { window.open(href, '_blank'); return; }
    if (reduceMotion) { location.href = href; return; }
    root.classList.add('leaving');
    setTimeout(function () { location.href = href; }, 160);
  }
  if (!reduceMotion) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:|\/\/)/i.test(href)) return;
      e.preventDefault();
      navTo(href);
    });
    window.addEventListener('pageshow', function () { root.classList.remove('leaving'); });
  }

  /* ══ Discovery / completionist stamp ══════════════════════════ */
  var DISCOVERIES = ['konami', 'palette', 'cite', 'night'];
  function discover(key, quiet) {
    var found;
    try { found = JSON.parse(localStorage.getItem('found') || '[]'); } catch (e) { found = []; }
    if (found.indexOf(key) !== -1) return;
    found.push(key);
    try { localStorage.setItem('found', JSON.stringify(found)); } catch (e) {}
    if (found.length >= DISCOVERIES.length) {
      setTimeout(completionStamp, 3000);
    } else if (!quiet) {
      whisper('you found something. ' + found.length + ' of ' + DISCOVERIES.length + '.');
    }
  }
  function completionStamp() {
    try { if (localStorage.getItem('completed')) return; localStorage.setItem('completed', '1'); } catch (e) {}
    var old = document.querySelector('.stamp'); if (old) old.remove();
    var s = document.createElement('div');
    s.className = 'stamp';
    s.innerHTML = '<span class="stamp-main">Nothing Left</span><span class="stamp-sub">to find · explorer, first class</span>';
    document.body.appendChild(s);
    void s.offsetWidth; s.classList.add('show');
    setTimeout(function () { s.classList.add('hide'); setTimeout(function () { s.remove(); }, 650); }, 2800);
  }

  /* ══ Command palette (press "/" or Ctrl/Cmd+K) ════════════════ */
  var PAL = [
    { name: 'Home', note: 'index', href: 'index.html' },
    { name: 'About', note: 'the long version', href: 'about.html' },
    { name: 'Now', note: 'what i am doing this month', href: 'now.html' },
    { name: 'Education', note: "the registrar's file", href: 'education.html' },
    { name: 'Experience', note: "the operator's ledger", href: 'experience.html' },
    { name: 'Awards & Honours', note: 'the honours list', href: 'awards.html' },
    { name: 'Research', note: 'the working index', href: 'research.html' },
    { name: 'Articles', note: 'selected writing', href: 'articles.html' },
    { name: 'Podcast · Decoded', note: 'the control room', href: 'podcast.html' },
    { name: 'Bookshelf', note: 'the reading room', href: 'bookshelf.html' },
    { name: 'Connect', note: 'get in touch, book a call', href: 'connect.html' },
    { name: 'Press', note: 'the clipping file', href: 'press.html' },
    { name: 'Felicitated by the President', note: 'jan 2026', href: 'president.html' },
    { name: 'AI Policy · The Two Faces of Progress', note: 'paper', href: 'aipolicy.html' },
    { name: 'Lodha Genius Programme', note: 'mathematics', href: 'lgp.html' },
    { name: 'Math Apprenticeship', note: 'number theory', href: 'mathapprenticeship.html' },
    { name: 'TaxCity', note: 'CFO', href: 'taxcity.html' },
    { name: 'Edunomix India', note: 'founder', href: 'edunomix.html' },
    { name: 'Ministry of Education', note: 'policy intern', href: 'goi.html' },
    { name: 'Y Combinator, Startup School', note: 'founder', href: 'yc.html' },
    { name: 'Great Ideas Seminars', note: 'nobel laureates', href: 'greatideasseminar.html' },
    { name: 'A Thousand Digits of Pi', note: 'why not', href: 'pi.html' },
    { name: 'Resume (PDF)', note: 'download', href: 'resume.pdf' },
    { name: 'Copy email address', note: 'action', action: 'email' },
    { name: 'Toggle night mode', note: 'action', action: 'theme' }
  ];
  var palVeil, palBox, palInput, palList, palItems = [], palActive = 0, palOpen = false;
  function itemsFor() {
    var paper = document.body.classList.contains('paper');
    return PAL.filter(function (it) { return !(it.action === 'theme' && !paper); });
  }
  function buildPalette() {
    if (palVeil) return;
    palVeil = document.createElement('div'); palVeil.className = 'palette-veil';
    palBox = document.createElement('div'); palBox.className = 'palette';
    palBox.innerHTML =
      '<div class="palette-head"><span>Jump to</span><span>esc to close</span></div>' +
      '<input type="text" placeholder="search the site…" aria-label="Search the site" autocomplete="off" spellcheck="false">' +
      '<div class="palette-list"></div>';
    document.body.appendChild(palVeil);
    document.body.appendChild(palBox);
    palInput = palBox.querySelector('input');
    palList = palBox.querySelector('.palette-list');
    palVeil.addEventListener('click', closePalette);
    palInput.addEventListener('input', renderPalette);
    palInput.addEventListener('keydown', paletteKeys);
  }
  function renderPalette() {
    var q = palInput.value.trim().toLowerCase();
    palItems = itemsFor().filter(function (it) {
      return !q || it.name.toLowerCase().indexOf(q) !== -1 || (it.note || '').toLowerCase().indexOf(q) !== -1;
    });
    palActive = 0; palList.innerHTML = '';
    if (!palItems.length) {
      palList.innerHTML = '<div class="palette-empty">nothing by that name. try "research" or "night".</div>';
      return;
    }
    palItems.forEach(function (it, i) {
      var el = document.createElement('div');
      el.className = 'palette-item' + (i === 0 ? ' active' : '');
      el.innerHTML = '<span class="pi-name"></span><span class="pi-note"></span>';
      el.querySelector('.pi-name').textContent = it.name;
      el.querySelector('.pi-note').textContent = it.note || '';
      el.addEventListener('mouseenter', function () { setActive(i); });
      el.addEventListener('click', function () { runItem(it); });
      palList.appendChild(el);
    });
  }
  function setActive(i) {
    palActive = i;
    var kids = palList.children;
    for (var j = 0; j < kids.length; j++) kids[j].classList.toggle('active', j === i);
    if (kids[i] && kids[i].scrollIntoView) kids[i].scrollIntoView({ block: 'nearest' });
  }
  function paletteKeys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(palActive + 1, palItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(palActive - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (palItems[palActive]) runItem(palItems[palActive]); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  }
  function runItem(it) {
    closePalette();
    if (it.action === 'email') { copyText('bhaskarakshat22@gmail.com'); whisper('email copied. say hi.'); return; }
    if (it.action === 'theme') { var t = document.querySelector('.theme-toggle'); if (t) t.click(); return; }
    navTo(it.href);
  }
  function openPalette() {
    buildPalette();
    discover('palette', true);
    palInput.value = ''; renderPalette();
    palOpen = true;
    palVeil.classList.add('open'); palBox.classList.add('open');
    setTimeout(function () { palInput.focus(); }, 20);
  }
  function closePalette() {
    if (!palOpen) return;
    palOpen = false;
    palVeil.classList.remove('open'); palBox.classList.remove('open');
  }
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); palOpen ? closePalette() : openPalette(); return;
    }
    if (e.key === '/' && !typing && !palOpen) { e.preventDefault(); openPalette(); }
  });

  /* ══ Cite on select ═══════════════════════════════════════════ */
  var chip = null, chipText = '';
  function showCite() {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 12 || sel.rangeCount === 0) { hideCite(); return; }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) { hideCite(); return; }
    if (!chip) {
      chip = document.createElement('div'); chip.className = 'cite-chip'; chip.textContent = 'cite ↗';
      document.body.appendChild(chip);
      chip.addEventListener('mousedown', function (e) { e.preventDefault(); });
      chip.addEventListener('click', doCite);
    }
    chipText = text;
    chip.style.left = Math.max(8, Math.min(r.right - 10, window.innerWidth - 96)) + 'px';
    chip.style.top = Math.max(8, r.top - 34) + 'px';
    chip.classList.add('show');
  }
  function hideCite() { if (chip) chip.classList.remove('show'); }
  function doCite() {
    var quote = chipText.replace(/\s+/g, ' ');
    var citation = '"' + quote + '", Akshat Bhaskar, ' + docTitle() + '. ' + location.href.split('#')[0];
    copyText(citation);
    chip.textContent = 'copied ✓';
    discover('cite');
    setTimeout(function () { chip.textContent = 'cite ↗'; hideCite(); }, 1500);
  }
  document.addEventListener('mouseup', function () { setTimeout(showCite, 10); });
  document.addEventListener('touchend', function () { setTimeout(showCite, 10); }, { passive: true });
  document.addEventListener('selectionchange', function () {
    var s = window.getSelection();
    if (!s || !s.toString().trim()) hideCite();
  });
  window.addEventListener('scroll', hideCite, { passive: true });

  /* ══ Welcome back, resume where you left off ══════════════════ */
  (function () {
    var now = Date.now();
    var lastVisit, lastPath, lastTitle;
    try {
      lastVisit = +(localStorage.getItem('av_last') || 0);
      lastPath = localStorage.getItem('av_path');
      lastTitle = localStorage.getItem('av_title');
    } catch (e) {}
    var SIX_H = 6 * 3600 * 1000;
    if (lastVisit && (now - lastVisit) > SIX_H && lastPath && lastPath !== location.pathname) {
      setTimeout(function () {
        whisper('welcome back. resume ' + (lastTitle || 'where you left off') + '? →', 8000, function () { navTo(lastPath); });
      }, 1600);
    }
    function save() {
      try {
        localStorage.setItem('av_last', String(Date.now()));
        localStorage.setItem('av_path', location.pathname);
        localStorage.setItem('av_title', docTitle());
      } catch (e) {}
    }
    save();
    window.addEventListener('pagehide', save);
  })();
})();
