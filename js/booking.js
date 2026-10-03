/* ─────────────────────────────────────────────────────────────
   A booking flow made for this site (no third-party widget).
   Reads real availability from Cal.com's public API and books
   the chosen slot; the invite and video link arrive by email.

   Set CAL_USER and CAL_EVENT to your Cal.com username and event
   slug (cal.com/<user>/<event>). Until they are set, the page
   keeps showing the Calendly calendar as before.
   ───────────────────────────────────────────────────────────── */
(function () {
  var CAL_USER = 'aksbhaskar';
  var CAL_EVENT = '30mins';    // cal.com/aksbhaskar/30mins
  var LENGTH = 30;             // minutes, for the heading
  var MONTHS_AHEAD = 6;        // how far forward the calendar can be paged

  var root = document.getElementById('booker');
  if (!root || !CAL_USER) return;            // not configured: leave the Calendly fallback in place

  var API = 'https://api.cal.com/v2';
  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Kolkata';
  var MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
                     'august', 'september', 'october', 'november', 'december'];

  var now = new Date();
  var first = { y: now.getFullYear(), m: now.getMonth() };   // earliest month shown
  var view = first;
  var cache = {};          // 'YYYY-MM' -> { 'YYYY-MM-DD': [slots] }
  var day = null, slot = null;

  // swap the Calendly fallback for the custom booker
  var fallback = document.getElementById('cal-fallback');
  if (fallback) fallback.remove();
  root.hidden = false;
  root.innerHTML =
    '<p class="bk-head">' + LENGTH + ' minutes &middot; video call &middot; ' + tz.split('/').pop().replace(/_/g, ' ').toLowerCase() + ' time</p>' +
    '<div class="bk-cal">' +
      '<div class="bk-month">' +
        '<button type="button" class="bk-nav bk-prev" aria-label="previous month">&larr;</button>' +
        '<span class="bk-title" aria-live="polite"></span>' +
        '<button type="button" class="bk-nav bk-next" aria-label="next month">&rarr;</button>' +
      '</div>' +
      '<div class="bk-week" aria-hidden="true"><span>mo</span><span>tu</span><span>we</span><span>th</span><span>fr</span><span>sa</span><span>su</span></div>' +
      '<div class="bk-grid"></div>' +
      '<p class="bk-status" aria-live="polite"></p>' +
    '</div>' +
    '<div class="bk-slots" hidden>' +
      '<p class="bk-day-label"></p>' +
      '<div class="bk-times" role="listbox" aria-label="time"></div>' +
    '</div>' +
    '<form class="bk-form" hidden>' +
      '<div class="field"><label for="bk-name">name</label><input id="bk-name" name="name" type="text" placeholder="name" autocomplete="name" required></div>' +
      '<div class="field"><label for="bk-email">email</label><input id="bk-email" name="email" type="email" placeholder="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="bk-notes">what is it about?</label><input id="bk-notes" name="notes" type="text" placeholder="what is it about? (optional)"></div>' +
      '<div class="bk-row"><button type="submit" class="bk-go"></button><span class="bk-err" aria-live="polite"></span></div>' +
    '</form>' +
    '<div class="bk-done" hidden aria-live="polite"></div>';

  var $ = function (s) { return root.querySelector(s); };
  var title = $('.bk-title'), grid = $('.bk-grid'), status = $('.bk-status'), prev = $('.bk-prev'), next = $('.bk-next'),
      slotsEl = $('.bk-slots'), dayLabel = $('.bk-day-label'), timesEl = $('.bk-times'),
      form = $('.bk-form'), go = $('.bk-go'), err = $('.bk-err'), done = $('.bk-done'), cal = $('.bk-cal');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(y, m) { return y + '-' + pad(m + 1); }
  function idx(v) { return v.y * 12 + v.m; }
  function step(v, n) { var i = idx(v) + n; return { y: Math.floor(i / 12), m: i % 12 }; }
  function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: tz }); }
  function fmtLong(ymd) {   // "monday, 5 october"
    var p = ymd.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase() + ', ' + (+p[2]) + ' ' + MONTH_NAMES[+p[1] - 1];
  }
  function label(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }) + ', ' + fmtTime(iso);
  }

  function fetchMonth(v) {
    var k = key(v.y, v.m);
    if (cache[k]) return Promise.resolve(cache[k]);
    var start = new Date(v.y, v.m, 1), last = new Date(v.y, v.m + 1, 0).getDate();
    if (start < now) start = now;
    var url = API + '/slots?username=' + encodeURIComponent(CAL_USER) + '&eventTypeSlug=' + encodeURIComponent(CAL_EVENT) +
              '&start=' + start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate()) +
              '&end=' + k + '-' + pad(last) + '&timeZone=' + encodeURIComponent(tz);
    return fetch(url, { headers: { 'cal-api-version': '2024-09-04' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var out = {}, data = (j && j.data) || {};
        Object.keys(data).forEach(function (d) { if (data[d] && data[d].length && d.slice(0, 7) === k) out[d] = data[d]; });
        cache[k] = out; return out;
      });
  }

  function renderMonth(slots) {
    title.textContent = MONTH_NAMES[view.m] + ' ' + view.y;
    prev.disabled = idx(view) <= idx(first);
    next.disabled = idx(view) >= idx(first) + MONTHS_AHEAD;
    grid.innerHTML = '';
    var lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;   // monday first
    var days = new Date(view.y, view.m + 1, 0).getDate();
    for (var i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= days; d++) {
      var k = key(view.y, view.m) + '-' + pad(d), open = !!(slots && slots[k]);
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = d;
      b.className = 'bk-d' + (open ? ' open' : '') + (k === day ? ' on' : '');
      b.disabled = !open;
      if (open) b.setAttribute('aria-label', fmtLong(k) + ', ' + slots[k].length + ' times open');
      (function (k) { b.addEventListener('click', function () { pickDay(k); }); })(k);
      grid.appendChild(b);
    }
  }

  function show(v) {
    view = v;
    renderMonth(cache[key(v.y, v.m)] || null);
    if (!cache[key(v.y, v.m)]) { cal.classList.add('loading'); status.textContent = 'checking my calendar…'; }
    return fetchMonth(v).then(function (slots) {
      if (view !== v) return slots;          // paged on meanwhile
      cal.classList.remove('loading');
      renderMonth(slots);
      status.textContent = Object.keys(slots).length ? '' : 'nothing open in ' + MONTH_NAMES[v.m] + '. try another month, or write to me below.';
      return slots;
    }).catch(function () {
      if (view !== v) return;
      cal.classList.remove('loading');
      status.textContent = 'couldn’t reach my calendar just now. write to me below instead.';
    });
  }

  function pickDay(k) {
    day = k; slot = null; form.hidden = true;
    renderMonth(cache[k.slice(0, 7)]);
    dayLabel.textContent = fmtLong(k);
    renderTimes();
    slotsEl.hidden = false;
  }

  function renderTimes() {
    timesEl.innerHTML = '';
    (cache[day.slice(0, 7)][day] || []).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-t' + (slot === s.start ? ' on' : '');
      b.textContent = fmtTime(s.start);
      b.addEventListener('click', function () {
        slot = s.start; renderTimes();
        form.hidden = false; err.textContent = '';
        go.textContent = 'book ' + label(slot);
        if (!form.name.value) form.name.focus({ preventScroll: true });
      });
      timesEl.appendChild(b);
    });
  }

  prev.addEventListener('click', function () { show(step(view, -1)); });
  next.addEventListener('click', function () { show(step(view, 1)); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!slot) return;
    var name = form.name.value.trim(), email = form.email.value.trim(), notes = form.notes.value.trim();
    go.disabled = true; go.textContent = 'booking…'; err.textContent = '';
    var body = {
      start: new Date(slot).toISOString(),
      eventTypeSlug: CAL_EVENT, username: CAL_USER,
      attendee: { name: name, email: email, timeZone: tz, language: 'en' }
    };
    if (notes) body.bookingFieldsResponses = { notes: notes };
    fetch(API + '/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cal-api-version': '2024-08-13' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || (res.j && res.j.status === 'error')) throw new Error((res.j && res.j.error && res.j.error.message) || 'failed');
        var b = (res.j && res.j.data) || {};
        $('.bk-head').hidden = true; cal.hidden = true; slotsEl.hidden = true; form.hidden = true; done.hidden = false;
        done.innerHTML = '<p class="bk-booked">booked: ' + label(slot) + '.</p>' +
          '<p class="bk-sub">the invite is on its way to ' + email.replace(/</g, '&lt;') + '.' +
          (b.uid ? ' <a href="https://cal.com/booking/' + encodeURIComponent(b.uid) + '" target="_blank" rel="noopener">reschedule or cancel</a>' : '') + '</p>';
      })
      .catch(function () {
        go.disabled = false; go.textContent = 'book ' + label(slot);
        err.textContent = 'that time may have just gone. pick another, or write to me below.';
      });
  });

  // open on this month; if it's already full, step on to the next month with room
  (function open(v, tries) {
    show(v).then(function (slots) {
      if (slots && !Object.keys(slots).length && tries > 0 && view === v) open(step(v, 1), tries - 1);
    });
  })(view, 2);
})();
