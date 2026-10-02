/* ─────────────────────────────────────────────────────────────
   A little pixel dog companion (black, lean, lavender outline).
   - sleeps after 5s of not being touched
   - opens its eyes when the cursor is over it (desktop)
   - click / tap: wakes up, stretches, says something silly
   - drag it anywhere (mouse or finger, no long-press needed)
   - phone: stays asleep until tapped; naps again 5s after each tap
   Self-contained: injects its own styles and markup.
   ───────────────────────────────────────────────────────────── */
(function () {
  if (window.__dogLoaded) return; window.__dogLoaded = true;

  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* sprites: '#' fur, 'o' lavender detail (eyes, tail line), '.' empty.
     the lavender outline is added automatically around the fur. */
  var FRAMES = {
    sleep: [
      '......................................',
      '......................................',
      '......................................',
      '......................................',
      '..........#...........................',
      '..........#...........................',
      '.........###..........................',
      '.........###..........................',
      '.......######.........................',
      '.....########.........................',
      '....##########........................',
      '....############....##########........',
      '...##############################.....',
      '.####ooo##########################....',
      '###################################...',
      '####################################..',
      '#####################################.',
      '.####################################.',
      '........############################..',
      '.oooooooooo##.######################..',
      '.############.#####o#############oo...',
      '####################ooooooooooooo#....',
      '#################.##############......',
      '......................#####...........',
    ],
    peek: [
      '......................................',
      '......................................',
      '......................................',
      '......................................',
      '..........#...........................',
      '..........#...........................',
      '.........###..........................',
      '.........###..........................',
      '.......######.........................',
      '.....########.........................',
      '....##########........................',
      '....############....##########........',
      '...###o##########################.....',
      '.####o#o##########################....',
      '###################################...',
      '####################################..',
      '#####################################.',
      '.####################################.',
      '........############################..',
      '.oooooooooo##.######################..',
      '.############.#####o#############oo...',
      '####################ooooooooooooo#....',
      '#################.##############......',
      '......................#####...........',
    ],
    stretch: [
      '...................................#..',
      '.........#........................##..',
      '.........##.......................##..',
      '.........##......................##...',
      '........####.....................##...',
      '........####....................##....',
      '......######................##.##.....',
      '....#########.............#######.....',
      '...##########..........#########......',
      '.#####o######........###########......',
      '#####o#o#####......#############......',
      '#############....################.....',
      '#################################.....',
      '....#########################.###.....',
      '.....####################..##..##.....',
      '.......################....##..##.....',
      '.........###########.......##..##.....',
      '.........########..........###.##.....',
      '.........#######...........###.##.....',
      '.........#####.............###.##.....',
      '.......#######.............###.###....',
      '##############.............###.###....',
      '##############.............###.###....',
      '............................#...#.....',
    ],
    stand: [
      '.........#............................',
      '........###...........................',
      '.......#####..........................',
      '.....#######..........................',
      '...####o####........................#.',
      '######o#o###.......................##.',
      '############......................##..',
      '.###########.....................##...',
      '.....#######....................##....',
      '.......##########################.....',
      '........#########################.....',
      '.........########################.....',
      '..........######################......',
      '...........#######.......#######......',
      '............######........#####.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '...........###.##........###.##.......',
    ],
    stand2: [
      '.........#............................',
      '........###...........................',
      '.......#####..........................',
      '.....#######..........................',
      '...####o####..........................',
      '######o#o###..........................',
      '############..........................',
      '.###########........................##',
      '.....#######......................###.',
      '.......############################...',
      '........#########################.....',
      '.........########################.....',
      '..........######################......',
      '...........#######.......#######......',
      '............######........#####.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '............##.##.........##.##.......',
      '...........###.##........###.##.......',
    ]
  };

  var QUIPS = [
    "woof. that's the whole message.",
    "i was NOT sleeping. i was resting my eyes.",
    "who's a good visitor? you are.",
    "404: treat not found",
    "i guard this website. mostly by napping.",
    "bark-driven development",
    "akshat says i'm not allowed on the couch. so i live here now.",
    "is that a squirrel?!",
    "pet me again. i dare you.",
    "i read all of akshat's updates. understood none. loved them all.",
    "five more minutes...",
    "ruff day? me too.",
    "i'd fetch you something but the internet is very big",
    "this is my good side.",
    "there's a letter at the bottom of the home page. i can't write, no thumbs.",
    "i'm technically the ceo of naps here",
    "boop.",
    "sit. stay. read the timeline.",
    "you smell like someone who clicks on dogs",
    "my pixels are hand-reared, thank you"
  ];

  var PAD = 1, CELL = 3;
  var GW = FRAMES.sleep[0].length, GH = FRAMES.sleep.length;
  var VW = GW + PAD * 2, VH = GH + PAD * 2;

  /* turn a sprite into two svg paths: fur + lavender (outline & details) */
  function build(rows) {
    var fur = '', lav = '';
    function at(x, y) { return (y >= 0 && y < GH && x >= 0 && x < GW) ? rows[y][x] : '.'; }
    for (var y = -PAD; y < GH + PAD; y++) {
      for (var x = -PAD; x < GW + PAD; x++) {
        var c = at(x, y), cell = 'M' + (x + PAD) + ' ' + (y + PAD) + 'h1v1h-1z';
        if (c === '#') { fur += cell; continue; }
        if (c === 'o') { lav += cell; continue; }
        var edge = false;
        for (var dy = -1; dy <= 1 && !edge; dy++)
          for (var dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === '#') { edge = true; break; }
        if (edge) lav += cell;
      }
    }
    return { fur: fur, lav: lav };
  }
  var BUILT = {};
  for (var k in FRAMES) BUILT[k] = build(FRAMES[k]);

  /* ── styles ── */
  var css = document.createElement('style');
  css.textContent = `
  #dogCompanion{
    position:fixed; right:20px; bottom:16px; width:${VW * CELL}px; height:${VH * CELL}px;
    z-index:9998; cursor:grab; -webkit-user-select:none; user-select:none;
    touch-action:none; -webkit-tap-highlight-color:transparent; outline:none;
    filter: drop-shadow(0 6px 8px rgba(0,0,0,.35));
  }
  #dogCompanion.dragging{ cursor:grabbing; }
  #dogCompanion svg{ width:100%; height:100%; display:block; shape-rendering:crispEdges; overflow:visible; }
  #dogCompanion .fur{ fill:#0b0b0e; }
  #dogCompanion .lav{ fill:#cbbcf2; }
  #dogCompanion:focus-visible .lav{ fill:#fff; }
  /* slow pixel breathing while asleep */
  #dogCompanion[data-state="sleep"] svg{ transform-origin:50% 100%; animation:dogBreathe 3.2s steps(1) infinite; }
  @keyframes dogBreathe{ 0%,100%{ transform:none; } 50%{ transform:scaleY(.96); } }
  #dogCompanion.hop svg{ animation:dogHop .32s steps(3); }
  @keyframes dogHop{ 0%,100%{ transform:none; } 50%{ transform:translateY(-6px); } }

  #dogZ{ position:absolute; left:22px; top:4px; pointer-events:none; opacity:0; transition:opacity .3s; }
  #dogCompanion[data-state="sleep"] #dogZ{ opacity:1; }
  #dogZ span{ position:absolute; font:700 13px/1 'Courier New',monospace; color:#cbbcf2;
    text-shadow:1px 1px 0 #0b0b0e; opacity:0; }
  #dogCompanion[data-state="sleep"] #dogZ span{ animation:dogZz 3s steps(6) infinite; }
  #dogCompanion[data-state="sleep"] #dogZ span:nth-child(2){ animation-delay:1s; }
  #dogCompanion[data-state="sleep"] #dogZ span:nth-child(3){ animation-delay:2s; }
  @keyframes dogZz{ 0%{ opacity:0; transform:translate(0,0); } 20%{ opacity:1; }
    100%{ opacity:0; transform:translate(-12px,-24px); } }

  #dogSay{
    position:absolute; bottom:calc(100% + 10px); right:6px; width:max-content; max-width:210px;
    background:#fffdf7; color:#1a1612; border:2px solid #0b0b0e; border-radius:3px;
    box-shadow:3px 3px 0 #cbbcf2;
    font:600 13px/1.35 'Courier New',ui-monospace,monospace; padding:7px 10px;
    opacity:0; transform:translateY(6px); transition:opacity .18s, transform .18s steps(3);
    pointer-events:none; white-space:normal; text-align:left;
  }
  #dogSay::after{ content:""; position:absolute; top:100%; right:30px; border:7px solid transparent;
    border-top-color:#0b0b0e; }
  #dogSay.show{ opacity:1; transform:none; }
  #dogCompanion.flip #dogSay{ right:auto; left:6px; }
  #dogCompanion.flip #dogSay::after{ right:auto; left:30px; }
  #dogCompanion.below #dogSay{ bottom:auto; top:calc(100% + 10px); }
  #dogCompanion.below #dogSay::after{ top:auto; bottom:100%; border-top-color:transparent; border-bottom-color:#0b0b0e; }

  @media (prefers-reduced-motion: reduce){ #dogCompanion *, #dogCompanion svg{ animation:none !important; } }`;
  document.head.appendChild(css);

  /* ── markup ── */
  var wrap = document.createElement('div');
  wrap.id = 'dogCompanion';
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');
  wrap.setAttribute('aria-label', 'A little black dog. Click to wake it up. Drag to move it.');
  wrap.innerHTML =
    '<svg viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path class="lav"/><path class="fur"/></svg>' +
    '<div id="dogZ" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></div>' +
    '<div id="dogSay" aria-live="polite"></div>';
  document.body.appendChild(wrap);
  var pFur = wrap.querySelector('.fur'), pLav = wrap.querySelector('.lav'), say = wrap.querySelector('#dogSay');

  function show(frame) { var b = BUILT[frame]; pFur.setAttribute('d', b.fur); pLav.setAttribute('d', b.lav); }

  /* ── state machine ── */
  var state = '', sleepTimer = null, stretchTimer = null, wagTimer = null, sayTimer = null, wagFlip = false;
  function set(s) {
    state = s; wrap.setAttribute('data-state', s);
    clearInterval(wagTimer);
    if (s === 'awake') {
      show('stand');
      wagTimer = setInterval(function () { wagFlip = !wagFlip; show(wagFlip ? 'stand2' : 'stand'); }, 190);
    } else show(s);
  }
  function armSleep() { clearTimeout(sleepTimer); sleepTimer = setTimeout(function () { set('sleep'); hideSay(); }, 5000); }
  function peek() { if (state === 'sleep') set('peek'); armSleep(); }
  function wake() {
    clearTimeout(stretchTimer);
    set('stretch');
    wrap.classList.remove('hop'); void wrap.offsetWidth; wrap.classList.add('hop');
    stretchTimer = setTimeout(function () { if (state === 'stretch') set('awake'); }, 900);
    quip(); armSleep();
  }
  var lastQ = -1;
  function quip() {
    var i; do { i = Math.floor(Math.random() * QUIPS.length); } while (i === lastQ);
    lastQ = i; say.textContent = QUIPS[i];
    var r = wrap.getBoundingClientRect();
    wrap.classList.toggle('flip', r.left < 200);
    wrap.classList.toggle('below', r.top < 100);
    say.classList.add('show');
    clearTimeout(sayTimer); sayTimer = setTimeout(hideSay, 3400);
  }
  function hideSay() { say.classList.remove('show'); }

  /* ── dragging: mouse left-button or a finger, straight away (no long-press) ── */
  var pid = null, moved = false, offX = 0, offY = 0, downX = 0, downY = 0;
  wrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    var r = wrap.getBoundingClientRect();
    offX = e.clientX - r.left; offY = e.clientY - r.top; downX = e.clientX; downY = e.clientY;
    wrap.style.left = r.left + 'px'; wrap.style.top = r.top + 'px';
    wrap.style.right = 'auto'; wrap.style.bottom = 'auto';
    pid = e.pointerId; moved = false;
    try { wrap.setPointerCapture(pid); } catch (err) {}
  });
  wrap.addEventListener('pointermove', function (e) {
    if (pid === null || e.pointerId !== pid) { if (canHover && e.pointerType === 'mouse') armSleep(); return; }
    if (!moved && Math.abs(e.clientX - downX) < 5 && Math.abs(e.clientY - downY) < 5) return;
    if (!moved) { moved = true; wrap.classList.add('dragging'); hideSay(); }
    var x = Math.max(0, Math.min(window.innerWidth - wrap.offsetWidth, e.clientX - offX));
    var y = Math.max(0, Math.min(window.innerHeight - wrap.offsetHeight, e.clientY - offY));
    wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
  });
  function up(e) {
    if (pid === null || e.pointerId !== pid) return;
    pid = null; wrap.classList.remove('dragging');
    if (!moved && e.type === 'pointerup') wake(); else armSleep();
  }
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wake(); } });
  if (canHover) wrap.addEventListener('mouseenter', peek);

  /* keep it on screen if the window shrinks */
  window.addEventListener('resize', function () {
    if (!wrap.style.left) return;
    wrap.style.left = Math.max(0, Math.min(parseFloat(wrap.style.left), window.innerWidth - wrap.offsetWidth)) + 'px';
    wrap.style.top = Math.max(0, Math.min(parseFloat(wrap.style.top), window.innerHeight - wrap.offsetHeight)) + 'px';
  });

  set('sleep');
})();
