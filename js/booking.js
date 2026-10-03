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
  var LENGTH = 30;            // minutes, for the heading
  var DAYS_AHEAD = 21;

  var root = document.getElementById('booker');
  if (!root || !CAL_USER) return;            // not configured: leave the Calendly fallback in place

  var API = 'https://api.cal.com/v2';
  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Kolkata';
  var slots = {}, days = [], day = null, slot = null;

  // swap the Calendly fallback for the custom booker
  var fallback = document.getElementById('cal-fallback');
  if (fallback) fallback.remove();
  root.hidden = false;
  root.innerHTML =
    '<p class="bk-head">' + LENGTH + ' minutes, on a video call</p>' +
    '<p class="bk-status" aria-live="polite">checking Akshat&#8217;s calendar<span class="bk-dots"><i>.</i><i>.</i><i>.</i></span></p>' +
    '<div class="bk-pick" hidden>' +
      '<p class="bk-note">pick a time &middot; shown in your time zone (' + tz.replace(/_/g, ' ') + ')</p>' +
      '<div class="bk-days" role="listbox" aria-label="day"></div>' +
      '<div class="bk-times" role="listbox" aria-label="time"></div>' +
    '</div>' +
    '<form class="bk-form" hidden>' +
      '<input name="name" type="text" placeholder="your name" autocomplete="name" required>' +
      '<input name="email" type="email" placeholder="your email (for the invite)" autocomplete="email" required>' +
      '<input name="notes" type="text" placeholder="what&#8217;s it about? (optional)">' +
      '<button type="submit" class="bk-go"></button>' +
      '<p class="bk-err" aria-live="polite"></p>' +
    '</form>' +
    '<div class="bk-done" hidden aria-live="polite"></div>';

  var $ = function (s) { return root.querySelector(s); };
  var status = $('.bk-status'), pick = $('.bk-pick'), daysEl = $('.bk-days'), timesEl = $('.bk-times'),
      form = $('.bk-form'), go = $('.bk-go'), err = $('.bk-err'), done = $('.bk-done');

  function ymd(d) { return d.toISOString().slice(0, 10); }
  function fmtDay(iso) {   // "Mon" + "5 Oct" in the visitor's zone
    var d = new Date(iso);
    return {
      wd: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz }),
      dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: tz })
    };
  }
  function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: tz }); }
  function label(iso) { var f = fmtDay(iso); return f.wd + ' ' + f.dm + ', ' + fmtTime(iso); }

  function renderDays() {
    daysEl.innerHTML = '';
    days.forEach(function (k) {
      var f = fmtDay(slots[k][0].start), b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-pill bk-day' + (k === day ? ' on' : '');
      b.innerHTML = '<span>' + f.wd + '</span><small>' + f.dm + '</small>';
      b.addEventListener('click', function () { day = k; slot = null; renderDays(); renderTimes(); form.hidden = true; });
      daysEl.appendChild(b);
    });
  }
  function renderTimes() {
    timesEl.innerHTML = '';
    (slots[day] || []).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-pill bk-time' + (slot === s.start ? ' on' : '');
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

  function load() {
    var start = new Date(), end = new Date(Date.now() + DAYS_AHEAD * 864e5);
    var url = API + '/slots?username=' + encodeURIComponent(CAL_USER) + '&eventTypeSlug=' + encodeURIComponent(CAL_EVENT) +
              '&start=' + ymd(start) + '&end=' + ymd(end) + '&timeZone=' + encodeURIComponent(tz);
    fetch(url, { headers: { 'cal-api-version': '2024-09-04' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        slots = (j && j.data) || {};
        days = Object.keys(slots).filter(function (k) { return slots[k] && slots[k].length; }).sort();
        if (!days.length) { status.innerHTML = 'no open times in the next few weeks. write to me below instead.'; return; }
        day = days[0]; status.hidden = true; pick.hidden = false;
        renderDays(); renderTimes();
      })
      .catch(function () { status.innerHTML = 'couldn&#8217;t reach my calendar just now. write to me below instead.'; });
  }

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
        pick.hidden = true; form.hidden = true; done.hidden = false;
        done.innerHTML = '<p class="bk-booked">booked ' + label(slot) + '.</p>' +
          '<p class="bk-sub">the invite is on its way to ' + email.replace(/</g, '&lt;') + '.' +
          (b.uid ? ' <a href="https://cal.com/booking/' + encodeURIComponent(b.uid) + '" target="_blank" rel="noopener">reschedule or cancel</a>' : '') + '</p>';
      })
      .catch(function () {
        go.disabled = false; go.textContent = 'book ' + label(slot);
        err.textContent = 'that time may have just gone. pick another, or write to me below.';
      });
  });

  load();
})();
