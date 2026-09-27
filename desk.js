/* ─────────────────────────────────────────────────────────────
   The desk at the bottom of the home page.
   - every .item can be dragged around (mouse or finger), but only
     inside the desk: nothing can be pulled up over the page above
   - camera -> photography (with a little flash)
   - letter -> opens into a writable letter, sent via Formspree
   - record player plays The Boxer through Spotify's embed API
   - the date beads always spell today's date
   ───────────────────────────────────────────────────────────── */
(function () {
  var desk = document.getElementById('desk');
  if (!desk) return;

  /* ── today's date as beads ── */
  var dateEl = document.getElementById('date');
  var now = new Date();
  var txt = now.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ' ' + now.getDate();
  dateEl.setAttribute('aria-label', 'Today: ' + now.toDateString());
  txt.split('').forEach(function (ch) {
    var b = document.createElement('span');
    b.className = ch === ' ' ? 'bead gap' : 'bead';
    b.textContent = ch === ' ' ? '' : ch;
    b.setAttribute('aria-hidden', 'true');
    dateEl.appendChild(b);
  });

  /* ── dragging, clamped to the desk ── */
  var topZ = 10, EDGE = 14;   // keep rotated corners fully inside the desk
  var suppressClick = false;
  Array.prototype.forEach.call(desk.querySelectorAll('.item'), function (el) {
    var pid = null, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('[data-nodrag]')) return;
      e.preventDefault();
      // work in desk-relative px from the element's layout box (ignores rotation)
      ox = el.offsetLeft; oy = el.offsetTop; sx = e.clientX; sy = e.clientY;
      pid = e.pointerId; moved = false;
      el.style.zIndex = ++topZ;
      try { el.setPointerCapture(pid); } catch (err) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (pid === null || e.pointerId !== pid) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (!moved) { moved = true; el.classList.add('dragging'); }
      var maxX = desk.clientWidth - el.offsetWidth, maxY = desk.clientHeight - el.offsetHeight;
      var x = Math.max(EDGE, Math.min(maxX - EDGE, ox + dx));
      var y = Math.max(EDGE, Math.min(maxY - EDGE, oy + dy));
      el.style.left = (x / desk.clientWidth * 100) + '%';
      el.style.top = (y / desk.clientHeight * 100) + '%';
    });
    function up(e) {
      if (pid === null || e.pointerId !== pid) return;
      pid = null; el.classList.remove('dragging');
      if (moved) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 0); }
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    // a drag must never count as a click
    el.addEventListener('click', function (e) { if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  });

  /* keep things inside the desk when the window changes size */
  function clampAll() {
    Array.prototype.forEach.call(desk.querySelectorAll('.item'), function (el) {
      if (!el.style.left) return;
      var maxX = desk.clientWidth - el.offsetWidth, maxY = desk.clientHeight - el.offsetHeight;
      var x = Math.max(EDGE, Math.min(maxX - EDGE, el.offsetLeft)), y = Math.max(EDGE, Math.min(maxY - EDGE, el.offsetTop));
      el.style.left = (x / desk.clientWidth * 100) + '%';
      el.style.top = (y / desk.clientHeight * 100) + '%';
    });
  }
  window.addEventListener('resize', clampAll);

  /* ── camera: a quick flash, then off to the photos ── */
  var camera = document.getElementById('camera'), flash = document.getElementById('flash');
  camera.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    setTimeout(function () { location.href = camera.href; }, 320);
  });

  /* ── the letter ── */
  var modal = document.getElementById('ltModal'), form = document.getElementById('ltForm');
  var send = document.getElementById('ltSend'), status = document.getElementById('ltStatus');
  var letterBtn = document.getElementById('letter');
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function openLetter() {
    clearTimers();
    modal.className = 'lt-modal'; modal.hidden = false;
    status.textContent = ''; status.className = 'lt-status';
    void modal.offsetWidth;
    modal.classList.add('in');                              // envelope drops in
    later(function () { modal.classList.add('opened'); }, 450);   // flap opens, letter peeks out
    later(function () { modal.classList.add('away'); }, 1150);    // envelope slides off, letter unfolds
    later(function () { document.getElementById('ltName').focus({ preventScroll: true }); }, 1750);
    document.addEventListener('keydown', onKey);
  }
  function closeLetter() {
    clearTimers();
    modal.classList.remove('in', 'away');
    later(function () { modal.hidden = true; modal.className = 'lt-modal'; }, 300);
    document.removeEventListener('keydown', onKey);
    letterBtn.focus({ preventScroll: true });
  }
  function onKey(e) { if (e.key === 'Escape') closeLetter(); }
  letterBtn.addEventListener('click', openLetter);
  Array.prototype.forEach.call(modal.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', closeLetter); });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    send.disabled = true; send.textContent = 'sealing…';
    status.textContent = ''; status.className = 'lt-status';
    try {
      var res = await fetch('https://formspree.io/f/xpqokanp', {
        method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        var j = null; try { j = await res.json(); } catch (x) {}
        throw new Error(j && j.errors ? j.errors.map(function (x) { return x.message; }).join(', ') : 'something went wrong, try again?');
      }
      form.reset();
      // fold it back in, seal it, and send it flying
      modal.classList.add('sending'); modal.classList.remove('away');
      later(function () { modal.classList.add('sealed'); }, 520);
      later(function () { modal.classList.add('flying'); }, 1250);
      later(function () { modal.classList.add('thanks'); }, 1900);
      later(closeLetter, 3700);
    } catch (err) {
      status.textContent = err.message || 'network error, try again?';
      status.classList.add('err');
    } finally {
      send.disabled = false; send.textContent = 'seal & send';
    }
  });

  /* ── the record player (Spotify embed iFrame API) ── */
  var player = document.getElementById('player');
  var playBtn = player.querySelector('.p-play'), iPlay = player.querySelector('.i-play'), iPause = player.querySelector('.i-pause');
  var bar = document.getElementById('pBar'), note = document.getElementById('pNote'), embedBox = document.getElementById('pEmbed');
  var TRACK = 'spotify:track:76TZCvJ8GitQ2FA1q5dKu0';
  var ctrl = null, ready = false, playing = false, pos = 0, dur = 0, wantPlay = false, fallbackTimer = null, apiLoaded = false;

  function setPlaying(p) {
    playing = p;
    player.classList.toggle('playing', p);
    iPlay.style.display = p ? 'none' : ''; iPause.style.display = p ? '' : 'none';
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
  }
  function loadApi() {
    if (apiLoaded) return; apiLoaded = true;
    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      IFrameAPI.createController(document.getElementById('spEmbed'),
        { uri: TRACK, width: '100%', height: 80 },
        function (c) {
          ctrl = c;
          c.addListener('ready', function () { ready = true; if (wantPlay) { c.play(); armFallback(); } });
          c.addListener('playback_update', function (ev) {
            var d = ev.data || {};
            dur = d.duration || dur; pos = d.position || 0;
            if (dur) bar.style.width = Math.min(100, pos / dur * 100) + '%';
            if (!d.isPaused && !d.isBuffering) { clearTimeout(fallbackTimer); embedBox.classList.remove('show'); note.textContent = 'playing on spotify'; }
            setPlaying(!d.isPaused);
          });
        });
    };
    var s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    document.head.appendChild(s);
  }
  // if the browser won't let us start it remotely, show Spotify's own player
  function armFallback() {
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(function () {
      if (!playing) { embedBox.classList.add('show'); note.textContent = 'tap play on the spotify player below'; }
    }, 3500);
  }
  function toggle() {
    if (!ctrl || !ready) { wantPlay = true; loadApi(); note.textContent = 'loading…'; return; }
    if (playing) ctrl.pause(); else { if (pos > 0) ctrl.resume(); else ctrl.play(); armFallback(); }
  }
  playBtn.addEventListener('click', toggle);
  player.querySelector('.p-back').addEventListener('click', function () { if (ctrl && ready) { ctrl.seek(0); if (!playing) toggle(); } else toggle(); });
  player.querySelector('.p-fwd').addEventListener('click', function () { if (ctrl && ready && dur) ctrl.seek(Math.min(dur / 1000 - 1, pos / 1000 + 15)); });
  // tapping the record itself also plays / pauses (unless it was dragged)
  document.getElementById('vinyl').addEventListener('click', toggle);
  // warm the API up as you get near the bottom of the page
  window.addEventListener('scroll', function onS() {
    if (window.innerHeight + window.scrollY > document.documentElement.scrollHeight - window.innerHeight * 1.5) {
      loadApi(); window.removeEventListener('scroll', onS);
    }
  }, { passive: true });
})();
