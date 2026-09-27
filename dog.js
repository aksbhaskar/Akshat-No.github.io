/* ─────────────────────────────────────────────────────────────
   A little dog companion.
   - sleeps after 5s of not being touched
   - opens its eyes when the cursor is over it (desktop)
   - wakes up and stretches when clicked / tapped
   - desktop: move it around with a RIGHT-CLICK drag
   - phone:  stays asleep; tap to wake + stretch; sleeps 5s after a tap;
             long-press then drag to move it around
   Self-contained: injects its own styles and markup.
   ───────────────────────────────────────────────────────────── */
(function () {
  if (window.__dogLoaded) return; window.__dogLoaded = true;

  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── styles ── */
  var css = document.createElement('style');
  css.textContent = `
  #dogCompanion{
    position:fixed; right:22px; bottom:18px; width:124px; height:88px;
    z-index:9998; cursor:pointer; -webkit-user-select:none; user-select:none;
    touch-action:none; -webkit-tap-highlight-color:transparent;
    /* dark drop shadow + faint light rim so the black wolf reads on any bg */
    filter: drop-shadow(0 7px 9px rgba(0,0,0,.45)) drop-shadow(0 0 1.4px rgba(255,255,255,.45));
  }
  #dogCompanion svg{ width:100%; height:100%; overflow:visible; display:block; }
  #dogCompanion.dragging{ cursor:grabbing; }

  /* breathing while asleep */
  #dogRoot{ transform-box:fill-box; transform-origin:50% 92%; }
  #dogCompanion[data-state="sleep"] #dogRoot{ animation:dogBreathe 3.4s ease-in-out infinite; }
  @keyframes dogBreathe{ 0%,100%{ transform:scaleY(1) scaleX(1); } 50%{ transform:scaleY(.965) scaleX(1.02); } }

  /* eyes: open ellipses; squished flat when asleep */
  .dogEye{ transform-box:fill-box; transform-origin:center; transition:transform .25s ease; }
  #dogCompanion[data-state="sleep"] .dogEye{ transform:scaleY(.1); }

  /* ears perk up when awake */
  #earF,#earB{ transform-box:fill-box; transform-origin:70% 15%; transition:transform .3s ease; }
  #dogCompanion[data-state="awake"] #earF,
  #dogCompanion[data-state="stretch"] #earF{ transform:rotate(-16deg); }
  #dogCompanion[data-state="awake"] #earB,
  #dogCompanion[data-state="stretch"] #earB{ transform:rotate(-9deg); }

  /* tail wags when awake */
  #tail{ transform-box:fill-box; transform-origin:8% 92%; }
  #dogCompanion[data-state="awake"] #tail{ animation:dogWag .48s ease-in-out infinite; }
  #dogCompanion[data-state="stretch"] #tail{ animation:dogWag .38s ease-in-out infinite; }
  @keyframes dogWag{ 0%,100%{ transform:rotate(4deg); } 50%{ transform:rotate(-22deg); } }

  /* stretch: whole body leans + elongates, front legs reach, a little yawn */
  #dogCompanion[data-state="stretch"] #dogRoot{ animation:dogStretch .95s ease; }
  @keyframes dogStretch{
    0%{ transform:none; }
    35%{ transform:translateY(3px) scaleX(1.05); }
    60%{ transform:translateY(2px) scaleX(1.13) skewX(-5deg); }
    100%{ transform:none; }
  }
  #frontLegs{ transform-box:fill-box; transform-origin:center; }
  #dogCompanion[data-state="stretch"] #frontLegs{ animation:dogReach .95s ease; }
  @keyframes dogReach{ 0%,100%{ transform:none; } 55%{ transform:translate(17px,5px); } }
  #mouth{ transform-box:fill-box; transform-origin:20% 50%; }
  #dogCompanion[data-state="stretch"] #mouth{ animation:dogYawn .95s ease; }
  @keyframes dogYawn{ 0%,100%{ transform:scaleY(1); } 45%{ transform:scaleY(3.4) translateY(.5px); } }

  /* zzz while asleep */
  #zzz{ opacity:0; transition:opacity .3s ease; }
  #dogCompanion[data-state="sleep"] #zzz{ opacity:1; }
  #zzz text{ font:700 13px 'Inconsolata','Courier New',monospace; fill:#fff;
    stroke:rgba(0,0,0,.35); stroke-width:.4px; paint-order:stroke; }
  #dogCompanion[data-state="sleep"] #z1{ animation:zfloat 3s ease-in-out infinite; }
  #dogCompanion[data-state="sleep"] #z2{ animation:zfloat 3s ease-in-out infinite .9s; }
  #dogCompanion[data-state="sleep"] #z3{ animation:zfloat 3s ease-in-out infinite 1.8s; }
  @keyframes zfloat{ 0%{ opacity:0; transform:translate(0,4px) scale(.6); }
    30%{ opacity:1; } 100%{ opacity:0; transform:translate(6px,-16px) scale(1.1); } }

  @media (prefers-reduced-motion: reduce){
    #dogCompanion *{ animation:none !important; }
  }`;
  document.head.appendChild(css);

  /* ── markup ── a cute side-view dog, facing right ── */
  var wrap = document.createElement('div');
  wrap.id = 'dogCompanion';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'A little wolf. Click to wake it up.');
  wrap.setAttribute('data-state', 'sleep');
  wrap.innerHTML = `
  <svg viewBox="0 0 130 92" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .body{ fill:#1f1f25; } .body2{ fill:#151519; } .patch{ fill:#0e0e12; }
        .ear-in{ fill:#3a3a44; }
        .out{ stroke:#000; stroke-width:3; stroke-linejoin:round; stroke-linecap:round; }
      </style>
    </defs>
    <!-- ground shadow -->
    <ellipse cx="66" cy="86" rx="52" ry="6" fill="rgba(0,0,0,.22)"/>
    <g id="dogRoot">
      <!-- bushy tail -->
      <path id="tail" class="patch out" d="M22 62 C2 60 -2 38 12 34 C7 44 10 52 20 55 C18 47 22 43 27 44 C30 50 30 58 26 60 Z"/>
      <!-- rear haunch -->
      <ellipse class="body2 out" cx="40" cy="60" rx="22" ry="18"/>
      <!-- back leg -->
      <rect class="body2 out" x="30" y="69" width="15" height="15" rx="6"/>
      <!-- body -->
      <ellipse class="body out" cx="66" cy="62" rx="40" ry="17"/>
      <!-- front legs -->
      <g id="frontLegs">
        <rect class="body out" x="84" y="67" width="14" height="17" rx="6"/>
        <rect class="body2 out" x="96" y="67" width="14" height="17" rx="6"/>
      </g>
      <!-- back ear (pointy, behind head) -->
      <path id="earB" class="patch out" d="M103 34 L113 12 L118 35 Z"/>
      <!-- head -->
      <circle class="body out" cx="99" cy="48" r="16"/>
      <!-- long wolf snout -->
      <path class="body2 out" d="M108 43 L129 51 L110 59 Q104 51 108 43 Z"/>
      <!-- nose -->
      <path d="M126 48 L131 51 L126 54 Z" fill="#050508" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <!-- mouth / yawn -->
      <path id="mouth" d="M114 57 q5 3 10 0" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
      <!-- amber eye -->
      <ellipse class="dogEye" cx="100" cy="46" rx="3.2" ry="4" fill="#f0b23a" stroke="#000" stroke-width="1"/>
      <!-- front ear (pointy) with inner -->
      <g id="earF">
        <path class="patch out" d="M92 34 L98 9 L108 32 Z"/>
        <path class="ear-in" d="M96 31 L99 17 L104 30 Z"/>
      </g>
      <!-- zzz -->
      <g id="zzz">
        <text id="z1" x="120" y="26">z</text>
        <text id="z2" x="126" y="18">z</text>
        <text id="z3" x="132" y="10">z</text>
      </g>
    </g>
  </svg>`;
  document.body.appendChild(wrap);

  /* ── state machine ── */
  var state = 'sleep', sleepTimer = null, stretchTimer = null;
  function set(s){ state = s; wrap.setAttribute('data-state', s); }
  function armSleep(){ clearTimeout(sleepTimer); sleepTimer = setTimeout(function(){ set('sleep'); }, 5000); }
  function touch(){ armSleep(); }               // any interaction delays sleep
  function peek(){ if (state === 'sleep') set('awake'); touch(); }  // eyes open on hover
  function wake(){                              // full wake + stretch
    clearTimeout(stretchTimer);
    set('stretch');
    stretchTimer = setTimeout(function(){ if (state === 'stretch') set('awake'); }, 950);
    touch();
  }

  /* ── dragging ── */
  var dragging = false, moved = false, offX = 0, offY = 0, downX = 0, downY = 0;

  function startDrag(clientX, clientY){
    var r = wrap.getBoundingClientRect();
    offX = clientX - r.left; offY = clientY - r.top;
    downX = clientX; downY = clientY;
    // switch to top/left positioning
    wrap.style.left = r.left + 'px'; wrap.style.top = r.top + 'px';
    wrap.style.right = 'auto'; wrap.style.bottom = 'auto';
    dragging = true; moved = false;
  }
  function moveDrag(clientX, clientY){
    if (!dragging) return;
    if (!moved && Math.abs(clientX - downX) < 4 && Math.abs(clientY - downY) < 4) return; // ignore jitter
    moved = true; wrap.classList.add('dragging');
    var w = wrap.offsetWidth, h = wrap.offsetHeight;
    var x = Math.max(0, Math.min(window.innerWidth  - w, clientX - offX));
    var y = Math.max(0, Math.min(window.innerHeight - h, clientY - offY));
    wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
  }
  function endDrag(){ if (!dragging) return; dragging = false; wrap.classList.remove('dragging'); touch(); }

  /* ── desktop mouse ── (LEFT button drags to move) */
  wrap.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  wrap.addEventListener('mousedown', function(e){
    if (e.button === 0){ e.preventDefault(); startDrag(e.clientX, e.clientY); }
  });
  window.addEventListener('mousemove', function(e){ if (dragging) moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function(e){ if (e.button === 0) endDrag(); });

  if (canHover){
    wrap.addEventListener('mouseenter', peek);
    wrap.addEventListener('mousemove', function(){ if (!dragging) touch(); });
  }
  wrap.addEventListener('click', function(){ if (!moved) wake(); }); // left click = wake + stretch

  /* ── touch (phone) ── */
  var lpTimer = null, tStartX = 0, tStartY = 0, tStartT = 0, touchDrag = false;
  wrap.addEventListener('touchstart', function(e){
    var t = e.touches[0]; tStartX = t.clientX; tStartY = t.clientY; tStartT = Date.now();
    touchDrag = false;
    lpTimer = setTimeout(function(){ touchDrag = true; startDrag(tStartX, tStartY); }, 420); // long-press
  }, { passive:true });
  wrap.addEventListener('touchmove', function(e){
    var t = e.touches[0];
    if (touchDrag){ e.preventDefault(); moveDrag(t.clientX, t.clientY); return; }
    if (Math.abs(t.clientX - tStartX) > 12 || Math.abs(t.clientY - tStartY) > 12){
      clearTimeout(lpTimer); // moved before long-press: not a drag, not a tap
    }
  }, { passive:false });
  wrap.addEventListener('touchend', function(){
    clearTimeout(lpTimer);
    if (touchDrag){ endDrag(); touchDrag = false; return; }
    if (Date.now() - tStartT < 420){ wake(); } // quick tap wakes + stretches
  });

  /* start asleep; nothing wakes it until touched */
  set('sleep');
})();
