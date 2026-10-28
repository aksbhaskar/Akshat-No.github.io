/* ASCII koi pond: a wave simulation, koi, lily pads and a dragonfly, drawn as tiny text on a character grid. */
(function () {
  "use strict";
  var cv = document.getElementById("pond");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");

  var CW = 3, CH = 5, FONT_PX = 7.2, FAMILY = "px Newsreader, Georgia, serif";
  var SIM = 4, NS = 16, STEP = 1 / 60;
  var SCALE = 0.63; // the scene is laid out in world units and drawn at this size, so the pond reads larger than the canvas
  var KOI_RAMP = [":", "+", "*", "o", "O", "8", "%", "#", "@"];
  var STONE_RAMP = [".", ":", "-", "+", "o", "O"];
  var RIPPLE_LIT = ["-", "~", "~", "="];
  var RIPPLE_DIM = [".", ",", ":", ";"];
  var PEBBLES = ["o", ".", "o", "O", ","];
  var VARIETIES = ["kohaku", "ogon", "showa", "sanke", "orenji", "tancho", "asagi"];

  var PALETTES = {
    light: {
      water: "#7fa3b5", waterHi: "#3f7590", waterLo: "#9fbccb", deep: "#5d8396", shadow: "#6f8a98", pebble: "#ad9f86",
      koi: {
        white: ["#86909a", "#a9b1b9", "#c2c9cf"], red: ["#a83226", "#d8452e", "#e76a4f"], orange: ["#c25b1c", "#e9792d", "#f29a55"],
        gold: ["#ae8115", "#d8a62a", "#e8bf52"], black: ["#151515", "#2a2a2a", "#454545"], blue: ["#4c6880", "#6a8aa2", "#8ba7bb"]
      },
      eye: "#161616",
      pad: "#86b176", padRim: "#4c8645", padVein: "#5f9853", lotus: "#de7596", lotusTip: "#efb0c3", lotusCore: "#e0a92a", lotusDeep: "#c95a7e",
      stones: [["#787268", "#a29c91", "#c3bdb2"], ["#857563", "#ab9a84", "#c9b9a3"], ["#6f767c", "#979ea4", "#b8bec3"]], moss: "#7c9c63",
      under: "#7f9f7c", bubble: "#5f8ea5", fly: "#2f7f8f", flyWing: "#9db5c2",
      food: "#b4844a", petal: "#e9a3b8", weed: "#79a95a"
    }
  };

  var W = 0, H = 0, cols = 0, rows = 0, dpr = 1, PX = 1;
  var chars = [], keys = [], GX, GY, cellDist, cellSim, cellX, cellY, pebbles = [];
  var sc = 0, sr = 0, cur, prev, mask;
  var pond = { cx: 0, cy: 0, rx: 1, ry: 1 };
  var stones = [], pads = [], weeds = [], petals = [], koi = [], food = [], strands = [], bubbles = [];
  var fly = { on: false, wait: 4, x: 0, y: 0, a: 0, tx: 0, ty: 0, hover: 0, legs: 0 };
  var time = 0, last = 0, acc = 0, running = false, visible = false, nextDrip = 2;
  var pointer = { x: 0, y: 0, inside: false, wx: -99, wy: -99 };

  function pal() { return PALETTES.light; }
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function dirChar(dx, dy) {
    var a = Math.atan2(dy, dx);
    if (a < 0) a += Math.PI;
    if (a < 0.3927 || a >= 2.7489) return "-";
    if (a < 1.1781) return "\\";
    if (a < 1.9635) return "|";
    return "/";
  }

  /* ---------- glyph atlas: each char/colour/alpha is rasterised once, then blitted ---------- */

  var atlas = document.createElement("canvas"), actx = atlas.getContext("2d"), slots = {}, slotCount = 0, PW = 0, PH = 0, perRow = 0, capacity = 0;
  function resetAtlas() {
    PW = Math.ceil(CW * PX * 2.2); PH = Math.ceil(CH * PX * 1.6);
    atlas.width = 1024; atlas.height = 1024;
    perRow = Math.floor(1024 / PW); capacity = perRow * Math.floor(1024 / PH);
    actx.font = (FONT_PX * PX) + FAMILY; actx.textAlign = "center"; actx.textBaseline = "middle";
    slots = {}; slotCount = 0;
  }
  function slotFor(ch, key) {
    var id = ch + key, s = slots[id];
    if (s) return s;
    if (slotCount >= capacity) { actx.clearRect(0, 0, 1024, 1024); slots = {}; slotCount = 0; }
    var n = slotCount++, bar = key.indexOf("|");
    s = { x: (n % perRow) * PW, y: Math.floor(n / perRow) * PH };
    actx.save();
    actx.beginPath(); actx.rect(s.x, s.y, PW, PH); actx.clip();
    actx.globalAlpha = +key.slice(bar + 1); actx.fillStyle = key.slice(0, bar);
    actx.fillText(ch, s.x + PW / 2, s.y + PH / 2 + 0.4 * PX);
    actx.restore();
    slots[id] = s;
    return s;
  }

  /* ---------- pond geometry ---------- */

  function edge(a) { return 1 + 0.045 * Math.sin(2 * a + 0.7) + 0.035 * Math.sin(3 * a + 2.1) + 0.02 * Math.sin(5 * a + 0.4); }
  function pondDist(x, y) {
    var dx = x - pond.cx, dy = y - pond.cy, nx = dx / pond.rx, ny = dy / pond.ry, q = Math.sqrt(nx * nx + ny * ny);
    if (q < 1e-4) return -Math.min(pond.rx, pond.ry);
    return (q - edge(Math.atan2(ny, nx))) * Math.sqrt(dx * dx + dy * dy) / q;
  }
  function randomInPond(r, margin) {
    for (var k = 0; k < 80; k++) {
      var x = r() * W, y = r() * H;
      if (pondDist(x, y) < -margin) return { x: x, y: y };
    }
    return { x: pond.cx, y: pond.cy };
  }
  function pullInside(o, margin) {
    var d = pondDist(o.x, o.y);
    if (d > -margin) {
      var dx = pond.cx - o.x, dy = pond.cy - o.y, l = Math.hypot(dx, dy) || 1, k = d + margin;
      o.x += dx / l * k; o.y += dy / l * k;
    }
  }

  /* ---------- wave simulation (its own 4px grid, independent of the text grid) ---------- */

  function simStep() {
    var w = sc, c = cur, p = prev, m = mask;
    for (var y = 1; y < sr - 1; y++) {
      for (var x = 1, i = y * w + 1; x < w - 1; x++, i++) {
        if (!m[i]) { p[i] = 0; continue; }
        var lap = c[i - 1] + c[i + 1] + c[i - w] + c[i + w] - 4 * c[i];
        p[i] = (2 * c[i] - p[i] + 0.3 * lap) * 0.982;
      }
    }
    cur = p; prev = c;
  }
  function splash(x, y, amt, rad) {
    var gx = x / SIM, gy = y / SIM;
    for (var yy = Math.floor(gy - rad); yy <= Math.ceil(gy + rad); yy++) {
      for (var xx = Math.floor(gx - rad); xx <= Math.ceil(gx + rad); xx++) {
        if (xx < 1 || yy < 1 || xx >= sc - 1 || yy >= sr - 1) continue;
        var d = Math.hypot(xx + 0.5 - gx, yy + 0.5 - gy), i = yy * sc + xx;
        if (d <= rad && mask[i]) cur[i] += amt * (1 - d / (rad + 0.5));
      }
    }
  }
  function simIndex(x, y) { return clamp(Math.floor(y / SIM), 1, sr - 2) * sc + clamp(Math.floor(x / SIM), 1, sc - 2); }
  function slopeAt(x, y, out) {
    var j = simIndex(x, y);
    out.gx = (cur[j + 1] - cur[j - 1]) * 0.5; out.gy = (cur[j + sc] - cur[j - sc]) * 0.5;
    return out;
  }

  /* ---------- layout ---------- */

  function layout() {
    var rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3); PX = dpr * SCALE;
    W = rect.width / SCALE; H = rect.height / SCALE;
    cv.width = Math.round(rect.width * dpr); cv.height = Math.round(rect.height * dpr);
    resetAtlas();
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    pond.cx = W / 2; pond.cy = H / 2; pond.rx = W / 2 - 26; pond.ry = H / 2 - 22;
    sc = Math.ceil(W / SIM) + 1; sr = Math.ceil(H / SIM) + 1;
    cur = new Float32Array(sc * sr); prev = new Float32Array(sc * sr); mask = new Uint8Array(sc * sr);
    for (var y = 1; y < sr - 1; y++) for (var x = 1; x < sc - 1; x++) {
      if (pondDist((x + 0.5) * SIM, (y + 0.5) * SIM) < -1) mask[y * sc + x] = 1;
    }
    var n = cols * rows;
    chars = new Array(n); keys = new Array(n);
    GX = new Float32Array(n); GY = new Float32Array(n); cellDist = new Float32Array(n);
    cellSim = new Int32Array(n); cellX = new Int32Array(n); cellY = new Int32Array(n);
    for (var i = 0; i < n; i++) {
      var cx = (i % cols) * CW + CW / 2, cy = ((i / cols) | 0) * CH + CH / 2;
      cellDist[i] = pondDist(cx, cy);
      cellSim[i] = simIndex(cx, cy);
      cellX[i] = Math.round(cx * PX - PW / 2); cellY[i] = Math.round(cy * PX - PH / 2);
    }
    var r = rng(7);
    buildStones(r); buildPebbles(r); buildPads(r); buildFloaters(r); buildStrands(r);
    if (!koi.length) spawnKoi();
    else koi.forEach(function (f) { pullInside(f, 30); resetTrail(f); });
  }

  function buildStones(r) {
    stones = [];
    var a = r() * 0.3;
    while (a < Math.PI * 2 - 0.05) {
      var size = 8 + r() * 9, b = edge(a);
      var bx = pond.cx + Math.cos(a) * pond.rx * b, by = pond.cy + Math.sin(a) * pond.ry * b;
      var nx = Math.cos(a) / pond.rx, ny = Math.sin(a) / pond.ry, nl = Math.hypot(nx, ny);
      nx /= nl; ny /= nl;
      stones.push({ x: bx + nx * size * 0.45, y: by + ny * size * 0.3, rx: size, ry: size * (0.6 + r() * 0.2),
        rot: Math.atan2(nx, -ny) + (r() - 0.5) * 0.4, moss: r() < 0.35, tone: (r() * 3) | 0, seed: r() * 100 });
      a += (size * 1.9) / (Math.hypot(pond.rx * Math.sin(a), pond.ry * Math.cos(a)) * b);
    }
    stones.sort(function (p, q) { return p.y - q.y; });
  }

  function buildPebbles(r) {
    pebbles = new Array(cols * rows);
    for (var i = 0; i < pebbles.length; i++) {
      var d = cellDist[i];
      if (d > -2) continue;
      var h = r();
      if ((d > -16 && h < 0.13) || h < 0.006) pebbles[i] = { ch: PEBBLES[(r() * PEBBLES.length) | 0], a: 0.25 + r() * 0.3 };
    }
  }

  function buildPads(r) {
    pads = [];
    var base = Math.min(34, Math.min(W, H * 1.9) * 0.064);
    [[0.24, 0.3, 1, true], [0.76, 0.7, 0.9, true], [0.85, 0.32, 0.58, false], [0.14, 0.66, 0.62, false], [0.6, 0.18, 0.45, false],
     [0.42, 0.8, 0.5, false], [0.9, 0.56, 0.4, false]]
      .forEach(function (s) {
        var p = { x: s[0] * W, y: s[1] * H, r: base * s[2], rot: r() * 6.28, flower: s[3], seed: r() * 100 };
        p.px = p.x; p.py = p.y;
        pullInside(p, p.r * 0.7);
        pads.push(p);
      });
  }

  function buildFloaters(r) {
    weeds = []; petals = [];
    [pads[2], pads[3]].forEach(function (p) {
      for (var k = 0; k < 34; k++) {
        weeds.push({ x: p.x + (r() - 0.5) * 70, y: p.y + (r() - 0.5) * 40, vx: 0, vy: 0, ch: r() < 0.5 ? "o" : r() < 0.5 ? "." : "," });
      }
    });
    for (var k = 0; k < 11; k++) {
      var q = randomInPond(r, 20);
      petals.push({ x: q.x, y: q.y, vx: 0, vy: 0, rot: r() * 6.28, spin: (r() - 0.5) * 1.2 });
    }
    weeds.concat(petals).forEach(function (o) { pullInside(o, 6); });
  }

  function buildStrands(r) {
    strands = [];
    for (var k = 0; k < 22; k++) {
      var a = r() * Math.PI * 2, b = edge(a), inset = 0.86 - r() * 0.06;
      var x = pond.cx + Math.cos(a) * pond.rx * b * inset, y = pond.cy + Math.sin(a) * pond.ry * b * inset;
      strands.push({ x: x, y: y, a: Math.atan2(pond.cy - y, pond.cx - x) + (r() - 0.5) * 0.9, len: 16 + r() * 24, p: r() * 6.28 });
    }
  }

  /* ---------- koi ---------- */

  function makePattern(type, r) {
    var patches = [], base = "white", fin = "white";
    function patch(c, u, v, ru, rv) { patches.push({ c: c, u: u, v: v, ru: ru, rv: rv }); }
    function reds(n, from, to) {
      for (var k = 0; k < n; k++) patch("red", from + (to - from) * (k + 0.2 + r() * 0.6) / n, (r() - 0.5) * 0.7, 0.06 + r() * 0.07, 0.55 + r() * 0.6);
    }
    if (type === "kohaku") reds(3, 0.03, 0.78);
    else if (type === "tancho") patch("red", 0.09, 0, 0.055, 0.5);
    else if (type === "sanke") {
      reds(2, 0.05, 0.7);
      for (var k = 0; k < 6; k++) patch("black", 0.2 + r() * 0.6, (r() - 0.5) * 1.4, 0.022 + r() * 0.025, 0.2 + r() * 0.2);
    } else if (type === "showa") {
      base = "black"; reds(3, 0.04, 0.75);
      for (var j = 0; j < 2; j++) patch("white", 0.25 + r() * 0.5, (r() - 0.5) * 1.2, 0.05, 0.4);
    } else if (type === "ogon") { base = fin = "gold"; }
    else if (type === "orenji") { base = fin = "orange"; }
    else if (type === "asagi") {
      base = "blue"; fin = "red";
      patch("white", 0.06, 0, 0.08, 1.1); patch("red", 0.55, 1, 0.45, 0.32); patch("red", 0.55, -1, 0.45, 0.32);
    }
    return { base: base, fin: fin, patches: patches, metallic: type === "ogon" || type === "orenji", net: type === "asagi" };
  }

  function spawnKoi() {
    koi = [];
    var r = rng(42), count = 4, s = clamp(W / 700, 0.75, 1);
    for (var k = 0; k < count; k++) {
      var th = (k + r() * 0.6) / count * Math.PI * 2, rad = 0.35 + r() * 0.3;
      var p = { x: pond.cx + Math.cos(th) * pond.rx * rad, y: pond.cy + Math.sin(th) * pond.ry * rad };
      var L = (112 + r() * 44) * s, pat = makePattern(VARIETIES[k % VARIETIES.length], r);
      var f = { x: p.x, y: p.y, a: r() * 6.28, L: L, Wd: L * 0.12, spd: 14, slow: 15 + r() * 12, fast: 68 + r() * 20,
        phase: r() * 6.28, z: r(), seed: r() * 100, wx: p.x, wy: p.y, wt: 0, glide: 0, linger: 0, lx: 0, ly: 0, fed: false,
        base: pat.base, fin: pat.fin, patches: pat.patches, metallic: pat.metallic, net: pat.net, pts: [], fins: [], trail: [] };
      for (var n = 0; n < NS; n++) f.pts.push({ x: 0, y: 0, ox: 0, oy: 0, hx: 1, hy: 0, w: 1 });
      for (var q = 0; q < 4; q++) f.fins.push({ x: 0, y: 0, dx: 0, dy: 0, len: 0, wid: 0 });
      resetTrail(f);
      koi.push(f);
    }
    koi.sort(function (a, b) { return a.z - b.z; });
    koi.forEach(buildSpine);
  }

  function resetTrail(f) {
    f.trail = [];
    for (var s = 0; s <= f.L; s += 3) f.trail.push({ x: f.x - Math.cos(f.a) * s, y: f.y - Math.sin(f.a) * s });
  }

  function koiColor(f, t, v) {
    var c = f.base;
    for (var k = 0; k < f.patches.length; k++) {
      var q = f.patches[k], du = (t - q.u) / q.ru, dv = (v - q.v) / q.rv;
      if (du * du + dv * dv < 1 + 0.3 * Math.sin(t * 37 + v * 9 + f.seed)) c = q.c;
    }
    return c;
  }

  function prof(t) {
    return t < 0.3 ? 0.56 + 0.44 * Math.sin(t / 0.3 * Math.PI / 2) : 1 - 0.8 * Math.pow((t - 0.3) / 0.7, 1.35);
  }

  function pickWander(f) {
    var p;
    if (pointer.inside && Math.hypot(pointer.x - f.x, pointer.y - f.y) < 170 && Math.random() < 0.6) {
      p = { x: pointer.x + (Math.random() - 0.5) * 50, y: pointer.y + (Math.random() - 0.5) * 30 };
    } else if (f.linger > 0) {
      p = { x: f.lx + (Math.random() - 0.5) * 80, y: f.ly + (Math.random() - 0.5) * 44 };
    } else {
      p = randomInPond(Math.random, 34);
    }
    if (pondDist(p.x, p.y) > -28) p = randomInPond(Math.random, 34);
    f.wx = p.x; f.wy = p.y; f.wt = 4 + Math.random() * 6;
    f.glide = Math.random() < 0.25 ? 1.5 + Math.random() * 2 : 0;
  }

  function steer(f, dt) {
    var hungry = food.length > 0, tx, ty;
    f.linger = Math.max(0, f.linger - dt); f.glide = Math.max(0, f.glide - dt); f.wt -= dt;
    if (f.fed && !hungry) f.wt = 0;
    f.fed = hungry;
    if (hungry) {
      var best = null, bd = 1e9;
      food.forEach(function (m) { var d = Math.hypot(m.x - f.x, m.y - f.y); if (d < bd) { bd = d; best = m; } });
      tx = best.x; ty = best.y;
      if (bd < 5 + f.Wd * 0.4) {
        food.splice(food.indexOf(best), 1);
        splash(best.x, best.y, -0.8, 1.4);
        f.spd += 14;
        koi.forEach(function (k) { k.linger = 3.5; k.lx = best.x; k.ly = best.y; });
      }
    } else {
      if (f.wt <= 0 || Math.hypot(f.wx - f.x, f.wy - f.y) < 22) pickWander(f);
      tx = f.wx; ty = f.wy;
    }

    var dx = tx - f.x, dy = ty - f.y, dl = Math.hypot(dx, dy) || 1, vx = dx / dl, vy = dy / dl;
    koi.forEach(function (o) {
      if (o === f) return;
      var ox = f.x - o.x, oy = f.y - o.y, d = Math.hypot(ox, oy);
      if (d < 30 && d > 0.01) { var s = (30 - d) / 30 * (hungry ? 0.5 : 1.3); vx += ox / d * s; vy += oy / d * s; }
      var m = o.pts[7], mx = f.x - m.ox, my = f.y - m.oy, md = Math.hypot(mx, my);
      if (md < 20 && md > 0.01) { var s2 = (20 - md) / 20 * 0.8; vx += mx / md * s2; vy += my / md * s2; }
    });
    var ahead = pondDist(f.x + Math.cos(f.a) * 30, f.y + Math.sin(f.a) * 30);
    if (ahead > -24) {
      var cx = pond.cx - f.x, cy = pond.cy - f.y, cl = Math.hypot(cx, cy) || 1, s3 = Math.min(3, (ahead + 24) / 10);
      vx += cx / cl * s3; vy += cy / cl * s3;
    }

    var turn = (hungry ? 3.6 : 1.3) * dt;
    f.a += clamp(angDiff(Math.atan2(vy, vx), f.a), -turn, turn) + Math.sin(time * 0.7 + f.seed) * 0.12 * dt;
    var want = hungry ? f.fast : f.glide > 0 ? f.slow * 0.35 : f.slow;
    if (!hungry && dl < 40) want *= 0.5 + dl / 80;
    f.spd += (want - f.spd) * Math.min(1, dt * (hungry ? 2.2 : 0.9));
    f.x += Math.cos(f.a) * f.spd * dt;
    f.y += Math.sin(f.a) * f.spd * dt;
    pullInside(f, 10);
    f.phase += dt * (2.4 + clamp(f.spd / 80, 0, 1) * 9);
    splash(f.x, f.y, -0.0007 * f.spd * dt * 60, 1.1);

    var tr = f.trail;
    tr[0].x = f.x; tr[0].y = f.y;
    if (Math.hypot(tr[0].x - tr[1].x, tr[0].y - tr[1].y) > 2) tr.splice(1, 0, { x: f.x, y: f.y });
    var len = 0;
    for (var k = 1; k < tr.length; k++) {
      len += Math.hypot(tr[k].x - tr[k - 1].x, tr[k].y - tr[k - 1].y);
      if (len > f.L * 0.8 + 8) { tr.length = k + 1; break; }
    }
  }

  function buildSpine(f) {
    var pts = f.pts, tr = f.trail, step = f.L * 0.76 / (NS - 1), ti = 0, acc0 = 0;
    for (var k = 0; k < NS; k++) {
      var need = k * step;
      while (ti < tr.length - 1) {
        var seg = Math.hypot(tr[ti + 1].x - tr[ti].x, tr[ti + 1].y - tr[ti].y);
        if (acc0 + seg >= need) break;
        acc0 += seg; ti++;
      }
      var a = tr[ti], b = tr[Math.min(ti + 1, tr.length - 1)], sl = Math.hypot(b.x - a.x, b.y - a.y) || 1, u = clamp((need - acc0) / sl, 0, 1);
      pts[k].x = a.x + (b.x - a.x) * u; pts[k].y = a.y + (b.y - a.y) * u;
    }
    var sn = clamp(f.spd / 80, 0, 1), amp = 1.2 + sn * 3.2;
    for (var j = 0; j < NS; j++) {
      var p = pts[j], q = pts[Math.max(0, j - 1)], s = pts[Math.min(NS - 1, j + 1)];
      var hx = q.x - s.x, hy = q.y - s.y, hl = Math.hypot(hx, hy) || 1, t = j / (NS - 1);
      var off = amp * (0.12 + t * t) * Math.sin(f.phase - t * 5.5);
      p.hx = hx / hl; p.hy = hy / hl;
      p.ox = p.x - p.hy * off; p.oy = p.y + p.hx * off;
      p.w = f.Wd * prof(t);
    }
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    pts.forEach(function (p) { minx = Math.min(minx, p.ox); maxx = Math.max(maxx, p.ox); miny = Math.min(miny, p.oy); maxy = Math.max(maxy, p.oy); });
    f.minx = minx; f.maxx = maxx; f.miny = miny; f.maxy = maxy;

    var e = pts[NS - 1], d = pts[NS - 2], tx = e.ox - d.ox, ty = e.oy - d.oy, tl = Math.hypot(tx, ty) || 1;
    var sw = Math.sin(f.phase - 6.4) * (0.22 + sn * 0.3), cs = Math.cos(sw), sn2 = Math.sin(sw);
    tx /= tl; ty /= tl;
    f.tdx = tx * cs - ty * sn2; f.tdy = tx * sn2 + ty * cs;

    var h0 = pts[0], ew = f.Wd * prof(0.04) * 0.6;
    f.e1x = h0.ox - h0.hx * f.Wd * 0.28 - h0.hy * ew; f.e1y = h0.oy - h0.hy * f.Wd * 0.28 + h0.hx * ew;
    f.e2x = h0.ox - h0.hx * f.Wd * 0.28 + h0.hy * ew; f.e2y = h0.oy - h0.hy * f.Wd * 0.28 - h0.hx * ew;

    [[3, 1, 1.0, 0.13, 0.04], [3, -1, 1.0, 0.13, 0.04], [8, 1, 0.75, 0.075, 0.022], [8, -1, 0.75, 0.075, 0.022]].forEach(function (c, i) {
      var p = pts[c[0]], side = c[1], nx = -p.hy * side, ny = p.hx * side, w = p.w * 0.8;
      var th = c[2] + Math.sin(f.phase * 0.55 + side) * 0.3, bx = -p.hx, by = -p.hy, fn = f.fins[i];
      fn.x = p.ox + nx * w; fn.y = p.oy + ny * w;
      fn.dx = bx * Math.cos(th) + nx * Math.sin(th); fn.dy = by * Math.cos(th) + ny * Math.sin(th);
      fn.len = f.L * c[3]; fn.wid = f.L * c[4];
    });
  }

  var hit = { n: 0, t: 0, v: 0, k: 0 }, finHit = { ch: "", a: 0 };
  function bodyAt(f, x, y, out) {
    var p = f.pts, bn = 1e9, bt = 0, bk = 0, side = 1;
    for (var k = 0; k < NS - 1; k++) {
      var a = p[k], b = p[k + 1], ex = b.ox - a.ox, ey = b.oy - a.oy, l2 = ex * ex + ey * ey || 1;
      var u = ((x - a.ox) * ex + (y - a.oy) * ey) / l2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      var qx = x - a.ox - ex * u, qy = y - a.oy - ey * u;
      var n = Math.sqrt(qx * qx + qy * qy) / (a.w + (b.w - a.w) * u);
      if (n < bn) { bn = n; bt = (k + u) / (NS - 1); bk = k; side = ex * qy - ey * qx >= 0 ? 1 : -1; }
    }
    out.n = bn; out.t = bt; out.v = side * bn; out.k = bk;
    return bn < 1;
  }
  function finAt(f, x, y) {
    var e = f.pts[NS - 1], Lt = f.L * 0.22, rx = x - e.ox, ry = y - e.oy, al = rx * f.tdx + ry * f.tdy;
    if (al > -1 && al < Lt) {
      var lat = Math.abs(ry * f.tdx - rx * f.tdy), spread = f.Wd * 0.18 + Math.max(al, 0) * 0.62;
      if (lat < spread && al < Lt * (0.62 + 0.38 * lat / spread)) {
        var edgeFin = lat > spread - 1.4 || al > Lt * (0.62 + 0.38 * lat / spread) - 1.6;
        finHit.ch = dirChar(rx, ry); finHit.a = (edgeFin ? 0.85 : 0.62) - 0.35 * al / Lt; return finHit;
      }
    }
    for (var k = 0; k < 4; k++) {
      var q = f.fins[k], fx = x - q.x, fy = y - q.y, a2 = fx * q.dx + fy * q.dy;
      if (a2 < 0 || a2 > q.len) continue;
      var lim = q.wid * Math.sin(Math.PI * a2 / q.len) + 0.6, l2 = Math.abs(fy * q.dx - fx * q.dy);
      if (l2 < lim) {
        finHit.ch = dirChar(fx, fy); finHit.a = (l2 > lim - 1.2 ? 0.75 : 0.5) - 0.3 * a2 / q.len; return finHit;
      }
    }
    return null;
  }

  /* ---------- floating things & visitors ---------- */

  var slope = { gx: 0, gy: 0 };
  function float(o, dt, push, wind) {
    slopeAt(o.x, o.y, slope);
    o.vx = (o.vx + slope.gx * push * dt + wind * dt) * 0.97;
    o.vy = (o.vy + slope.gy * push * dt) * 0.97;
    o.x += o.vx * dt * 60; o.y += o.vy * dt * 60;
    pullInside(o, 7);
  }

  function feed(x, y) {
    var o = { x: x, y: y };
    pullInside(o, 14);
    splash(o.x, o.y, -1.5, 2);
    var n = 4 + (Math.random() * 3 | 0);
    for (var k = 0; k < n; k++) {
      var m = { x: o.x + (Math.random() - 0.5) * 28, y: o.y + (Math.random() - 0.5) * 16, vx: 0, vy: 0, life: 14 };
      pullInside(m, 10);
      food.push(m);
      splash(m.x, m.y, -0.3, 1.1);
    }
    start();
  }

  function flyTarget() {
    var p = randomInPond(Math.random, 20);
    fly.tx = p.x; fly.ty = p.y;
  }
  function updateFly(dt) {
    if (!fly.on) {
      fly.wait -= dt;
      if (fly.wait > 0) return;
      var side = Math.random() < 0.5;
      fly.on = true; fly.legs = 3 + (Math.random() * 3 | 0);
      fly.x = side ? -20 : W + 20; fly.y = H * (0.2 + Math.random() * 0.6); fly.a = side ? 0 : Math.PI;
      flyTarget();
    }
    if (fly.hover > 0) {
      fly.hover -= dt;
      fly.x += Math.sin(time * 9) * 0.15; fly.y += Math.cos(time * 7) * 0.12;
      if (fly.hover <= 0) {
        if (--fly.legs > 0) flyTarget();
        else { fly.tx = Math.random() < 0.5 ? -40 : W + 40; fly.ty = Math.random() * H; }
      }
      return;
    }
    var dx = fly.tx - fly.x, dy = fly.ty - fly.y, d = Math.hypot(dx, dy);
    fly.a += clamp(angDiff(Math.atan2(dy, dx), fly.a), -5 * dt, 5 * dt);
    var v = Math.min(130, 40 + d * 1.5);
    fly.x += Math.cos(fly.a) * v * dt; fly.y += Math.sin(fly.a) * v * dt;
    if (d < 6) {
      if (fly.legs > 0) {
        fly.hover = 0.8 + Math.random() * 2;
        if (Math.random() < 0.6 && pondDist(fly.x, fly.y) < -8) splash(fly.x, fly.y, -0.45, 1.1);
      } else { fly.on = false; fly.wait = 14 + Math.random() * 22; }
    }
  }

  function update(dt) {
    time += dt;
    acc += dt;
    var steps = 0;
    while (acc >= STEP && steps < 4) { simStep(); acc -= STEP; steps++; }
    if (steps === 4) acc = 0;
    nextDrip -= dt;
    if (nextDrip <= 0) {
      var p = randomInPond(Math.random, 24);
      splash(p.x, p.y, -0.6, 1.2);
      nextDrip = 2.5 + Math.random() * 4.5;
    }
    koi.forEach(function (f) {
      steer(f, dt);
      if (Math.random() < dt * 0.05) {
        splash(f.x, f.y, -0.5, 1.2);
        for (var b = 0; b < 2 + (Math.random() * 3 | 0); b++) {
          bubbles.push({ x: f.x + (Math.random() - 0.5) * 8, y: f.y + (Math.random() - 0.5) * 6, t: -b * 0.25, life: 0.9 + Math.random() * 0.6 });
        }
      }
    });
    koi.forEach(buildSpine);
    bubbles.forEach(function (b) { b.t += dt; if (b.t >= b.life && !b.popped) { b.popped = true; splash(b.x, b.y, -0.25, 1); } });
    bubbles = bubbles.filter(function (b) { return !b.popped; });
    food.forEach(function (m) { float(m, dt, 2.5, 0); m.life -= dt; });
    food = food.filter(function (m) { return m.life > 0; });
    weeds.forEach(function (w) { float(w, dt, 1.2, Math.sin(time * 0.1) * 0.002); });
    petals.forEach(function (p) { float(p, dt, 1.6, 0.004); p.rot += p.spin * dt; });
    pads.forEach(function (p) {
      slopeAt(p.x, p.y, slope);
      p.px = p.x + Math.sin(time * 0.15 + p.seed) * 2.5 + slope.gx * 8;
      p.py = p.y + Math.cos(time * 0.12 + p.seed) * 1.5 + slope.gy * 8;
      p.rot += Math.sin(time * 0.05 + p.seed) * 0.0008;
    });
    updateFly(dt);
  }

  /* ---------- drawing ---------- */

  function set(i, ch, col, a) {
    if (!col) { chars[i] = ""; return; }
    chars[i] = ch; keys[i] = col + "|" + (a >= 0.95 ? 1 : Math.round(a * 10) / 10);
  }
  function box(x0, y0, x1, y1, fn) {
    var c0 = Math.max(0, Math.floor(x0 / CW)), c1 = Math.min(cols - 1, Math.floor(x1 / CW));
    var r0 = Math.max(0, Math.floor(y0 / CH)), r1 = Math.min(rows - 1, Math.floor(y1 / CH));
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) fn(r * cols + c, c * CW + CW / 2, r * CH + CH / 2);
  }
  function cellAt(x, y) {
    var c = Math.floor(x / CW), r = Math.floor(y / CH);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  }
  function blob(x, y, rad, fn) {
    box(x - rad, y - rad, x + rad, y + rad, function (i, cx, cy) {
      var d = Math.hypot(cx - x, cy - y);
      if (d <= rad) fn(i, d / rad, cx - x, cy - y);
    });
  }

  function drawWater(P) {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c, d = cellDist[i];
        GX[i] = 0; GY[i] = 0;
        if (d > -1) continue;
        var j = cellSim[i], gx = (cur[j + 1] - cur[j - 1]) * 0.5, gy = (cur[j + sc] - cur[j - sc]) * 0.5;
        GX[i] = gx; GY[i] = gy;
        var lit = (gx * 0.6 + gy * 0.8) * 8, mag = Math.abs(lit);
        if (mag > 0.22) {
          var lvl = Math.min(3, ((mag - 0.22) / 0.25) | 0);
          if (lit < 0) set(i, RIPPLE_LIT[lvl], lvl > 1 ? P.waterHi : P.water, clamp(0.35 + mag * 0.6, 0, 1));
          else set(i, RIPPLE_DIM[lvl], P.deep, clamp(0.25 + mag * 0.5, 0, 0.85));
          continue;
        }
        var pc = clamp(c + Math.round(gx * 9), 0, cols - 1), pr = clamp(r + Math.round(gy * 5), 0, rows - 1), pb = pebbles[pr * cols + pc];
        if (pb) { set(i, pb.ch, P.pebble, pb.a); continue; }
        var x = c * CW, y = r * CH, depth = clamp(-d / 70, 0, 1);
        var cn = Math.sin(x * 0.045 + time * 0.55 + Math.sin(y * 0.08 + time * 0.35) * 1.6) *
                 Math.sin(y * 0.07 - time * 0.42 + Math.sin(x * 0.025 - time * 0.2) * 1.3);
        if (cn > 0.87) set(i, "~", P.water, 0.26 + depth * 0.2);
        else if (cn > 0.8 && hash(i * 0.37) < 0.5) set(i, "-", P.water, 0.14 + depth * 0.1);
        else if (hash(i) < 0.018 + depth * 0.035) set(i, ".", P.waterLo, 0.5);
      }
    }
  }

  function drawStrands(P) {
    strands.forEach(function (st) {
      var x = st.x, y = st.y;
      for (var s = 0; s < st.len; s += 2) {
        var wave = Math.sin(time * 0.9 + st.p + s * 0.12), a = st.a + wave * 0.45;
        x += Math.cos(a) * 2; y += Math.sin(a) * 2;
        var i = cellAt(x, y);
        if (i < 0 || cellDist[i] > -2) continue;
        var j = cellAt(x - GX[i] * 8, y - GY[i] * 8);
        if (j >= 0 && cellDist[j] < -2) set(j, wave > 0.3 ? ")" : wave < -0.3 ? "(" : "|", P.under, 0.55 - s / st.len * 0.3);
      }
    });
  }

  function drawShadow(f, P) {
    box(f.minx - f.Wd, f.miny - f.Wd, f.maxx + f.Wd + 6, f.maxy + f.Wd + 9, function (i, x, y) {
      if (cellDist[i] > -1 || !bodyAt(f, x - 5, y - 8, hit)) return;
      set(i, hit.n < 0.6 ? ":" : ".", P.shadow, 0.32);
    });
  }

  function drawKoi(f, P) {
    var tones = P.koi, alpha = 0.82 + 0.18 * f.z, fin = tones[f.fin], pad = f.Wd + f.L * 0.24;
    var finCol = P === PALETTES.light && f.fin === "white" ? fin[0] : fin[1];
    var bodyLen = f.L * 0.76, eyeR = Math.max(1.4, f.Wd * 0.14);
    box(f.minx - pad, f.miny - pad, f.maxx + pad, f.maxy + pad, function (i, x, y) {
      var qx = x + GX[i] * 6, qy = y + GY[i] * 6;
      if (bodyAt(f, qx, qy, hit)) {
        var n = hit.n, t = hit.t, v = hit.v, sp = f.pts[hit.k];
        if (Math.hypot(qx - f.e1x, qy - f.e1y) < eyeR || Math.hypot(qx - f.e2x, qy - f.e2y) < eyeR) { set(i, "@", P.eye, 1); return; }
        var tone = tones[koiColor(f, t, v)], sh = Math.sqrt(1 - n * n);
        var light = clamp(Math.pow(sh, 0.55) * 0.9 + 0.1 + (-sp.hy * -0.6 + sp.hx * -0.8) * (v > 0 ? 1 : -1) * 0.12 * (1 - sh), 0, 1);
        var ch = KOI_RAMP[Math.min(KOI_RAMP.length - 1, (light * KOI_RAMP.length) | 0)];
        var col = n < 0.3 ? tone[2] : n > 0.78 ? tone[0] : tone[1];
        var along = t * bodyLen;
        if (Math.abs(along - bodyLen * 0.17) < 1.1 && n < 0.9) { ch = dirChar(-sp.hy, sp.hx); col = tone[0]; }
        else if (n < 0.14 && t > 0.3 && t < 0.66) { ch = dirChar(sp.hx, sp.hy); col = tone[0]; }
        else if (f.net && t > 0.22 && t < 0.86 && n < 0.86) {
          var across = v * sp.w, sa = (along + across) / 4.6, sb = (along - across) / 4.6;
          if (sa - Math.floor(sa) < 0.2 || sb - Math.floor(sb) < 0.2) col = tone[0];
        } else if (f.metallic && n < 0.5 && hash(i + Math.floor(time * 3)) < 0.04) col = tone[2];
        set(i, ch, col, alpha);
        return;
      }
      var fh = finAt(f, qx, qy);
      if (fh) set(i, fh.ch, finCol, fh.a * alpha);
    });
    var h0 = f.pts[0], wc = tones[koiColor(f, 0.02, 0)][0];
    [1, -1].forEach(function (side) {
      for (var s = 0; s < 3; s++) {
        var bx = h0.ox + h0.hx * (f.Wd * 0.45 + s * 1.8) - h0.hy * side * (f.Wd * 0.18 + s * 1.5);
        var by = h0.oy + h0.hy * (f.Wd * 0.45 + s * 1.8) + h0.hx * side * (f.Wd * 0.18 + s * 1.5);
        var i = cellAt(bx, by);
        if (i >= 0 && !bodyAt(f, bx, by, hit)) set(i, dirChar(h0.hx - h0.hy * side * 0.8, h0.hy + h0.hx * side * 0.8), wc, 0.7 * alpha);
      }
    });
  }

  function drawPad(p, P) {
    var R = p.r, x0 = p.px, y0 = p.py, seg = Math.PI * 2 / 11;
    box(x0 - R, y0 - R, x0 + R, y0 + R, function (i, x, y) {
      var dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy);
      if (d > R) return;
      var rel = angDiff(Math.atan2(dy, dx), p.rot);
      if (d > R * 0.08 && Math.abs(rel) < 0.3) return;
      if (d > R * 0.08 && Math.abs(rel) < 0.3 + 1.8 / Math.max(d, 1)) { set(i, dirChar(dx, dy), P.padRim, 1); return; }
      if (d > R - 2) { set(i, dirChar(-dy, dx), P.padRim, 1); return; }
      if (d < 1.8) { set(i, "o", P.padVein, 1); return; }
      var k = Math.round(rel / seg);
      if (d > R * 0.12 && Math.abs(rel - k * seg) * d < 1.1) { set(i, dirChar(dx, dy), P.padVein, 0.95); return; }
      var tex = hash(i + p.seed);
      set(i, tex < 0.62 ? ":" : tex < 0.9 ? "+" : ";", P.pad, d > R - 5 ? 1 : 0.85);
    });
    if (!p.flower) return;
    var Rf = p.r * 0.48, fx = x0 - Math.cos(p.rot) * p.r * 0.15, fy = y0 - Math.sin(p.rot) * p.r * 0.15, rot = p.rot * 0.5 + time * 0.04;
    box(fx - Rf, fy - Rf, fx + Rf, fy + Rf, function (i, x, y) {
      var dx = x - fx, dy = y - fy, d = Math.hypot(dx, dy) / Rf;
      if (d > 1) return;
      var a = Math.atan2(dy, dx);
      var outer = 0.42 + 0.58 * Math.pow(Math.abs(Math.cos(4 * (a - rot))), 0.75);
      var inner = 0.68 * (0.45 + 0.55 * Math.pow(Math.abs(Math.sin(4 * (a - rot))), 0.75));
      if (d < 0.14) set(i, "@", P.lotusCore, 1);
      else if (d < 0.26) set(i, hash(i) < 0.5 ? "*" : ".", P.lotusCore, 1);
      else if (d < inner) set(i, d > inner - 0.1 ? "." : dirChar(dx, dy), d > inner - 0.1 ? P.lotusDeep : P.lotus, 1);
      else if (d < outer) set(i, d > outer - 0.1 ? "'" : dirChar(dx, dy), d > 0.7 ? P.lotusTip : P.lotus, 1);
    });
  }

  function drawStone(s, P) {
    var R = s.rx + 1, cs = Math.cos(s.rot), sn = Math.sin(s.rot), tone = P.stones[s.tone];
    box(s.x - R, s.y - R, s.x + R, s.y + R, function (i, x, y) {
      var dx = x - s.x, dy = y - s.y, lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
      var nx = lx / s.rx, ny = ly / s.ry, n2 = nx * nx + ny * ny;
      if (n2 > 1) return;
      var wx = nx * cs - ny * sn, wy = nx * sn + ny * cs, nz = Math.sqrt(1 - n2);
      var lam = clamp(-0.45 * wx - 0.55 * wy + 0.7 * nz, 0, 1);
      if (s.moss && wy < -0.2 && hash(i + s.seed) < 0.55) { set(i, hash(i) < 0.5 ? "\"" : "'", P.moss, 1); return; }
      var idx = Math.min(STONE_RAMP.length - 1, (lam * (1 - n2 * 0.5) * STONE_RAMP.length) | 0) - (hash(i * 1.7 + s.seed) < 0.2 ? 1 : 0);
      set(i, STONE_RAMP[Math.max(0, idx)], lam > 0.7 ? tone[2] : lam > 0.38 ? tone[1] : tone[0], 0.85);
    });
  }

  function drawFly(P) {
    var hx = Math.cos(fly.a), hy = Math.sin(fly.a), nx = -hy, ny = hx, flap = Math.sin(time * 55) > 0 ? 0.35 : -0.15;
    for (var k = 0; k < 9; k++) {
      var i = cellAt(fly.x - hx * k * 2.2, fly.y - hy * k * 2.2);
      if (i >= 0) set(i, k === 0 ? "@" : k === 8 ? "." : k < 3 ? "#" : dirChar(hx, hy), P.fly, 1);
    }
    [[1.4, 1], [1.4, -1], [2.6, 1], [2.6, -1]].forEach(function (w) {
      var bx = fly.x - hx * w[0] * 2.2, by = fly.y - hy * w[0] * 2.2, sw = (w[0] > 2 ? -0.35 : 0.35) * w[1] + flap * w[1];
      var dx = nx * w[1] * Math.cos(sw) - hx * Math.sin(sw) * w[1], dy = ny * w[1] * Math.cos(sw) - hy * Math.sin(sw) * w[1];
      for (var s = 2; s <= 12; s += 2) {
        var i = cellAt(bx + dx * s, by + dy * s);
        if (i >= 0) set(i, s > 9 ? "." : dirChar(dx, dy), P.flyWing, 0.75);
      }
    });
  }

  function render() {
    if (!cols) return;
    var P = pal();
    chars.fill("");
    drawWater(P);
    drawStrands(P);
    koi.forEach(function (f) { drawShadow(f, P); });
    koi.forEach(function (f) { drawKoi(f, P); });
    weeds.forEach(function (w) { var i = cellAt(w.x, w.y); if (i >= 0 && cellDist[i] < 0) set(i, w.ch, P.weed, 0.9); });
    petals.forEach(function (p) {
      var ca = Math.cos(p.rot), sa = Math.sin(p.rot);
      box(p.x - 4, p.y - 4, p.x + 4, p.y + 4, function (i, x, y) {
        var lx = (x - p.x) * ca + (y - p.y) * sa, ly = -(x - p.x) * sa + (y - p.y) * ca;
        if (cellDist[i] < 0 && (lx * lx) / 12 + (ly * ly) / 3.2 < 1) set(i, lx > 1.5 ? "'" : dirChar(ca, sa), P.petal, 1);
      });
    });
    food.forEach(function (m) { blob(m.x, m.y, 2.3, function (i, k) { set(i, k < 0.5 ? "@" : "o", P.food, Math.min(1, m.life)); }); });
    bubbles.forEach(function (b) {
      if (b.t < 0) return;
      var rad = 1.2 + (b.t / b.life) * 2.6;
      blob(b.x, b.y, rad + 0.8, function (i, k) { if (k * (rad + 0.8) > rad - 1) set(i, "o", P.bubble, 0.8); });
    });
    pads.forEach(function (p) { drawPad(p, P); });
    stones.forEach(function (s) { drawStone(s, P); });
    if (fly.on) drawFly(P);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (!ch) continue;
      var s = slotFor(ch, keys[i]);
      ctx.drawImage(atlas, s.x, s.y, PW, PH, cellX[i], cellY[i], PW, PH);
    }
  }

  /* ---------- loop & input ---------- */

  var cost = 0, skip = false, odd = false;
  function frame(now) {
    if (!running) return;
    update(Math.min(0.05, (now - last) / 1000 || STEP));
    last = now;
    odd = !odd;
    if (!skip || odd) {
      var t0 = performance.now();
      render();
      cost = cost * 0.9 + (performance.now() - t0) * 0.1;
      if (cost > 12) skip = true; else if (cost < 6) skip = false;
    }
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !visible || document.hidden) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }
  function local(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; }

  cv.addEventListener("pointerdown", function (e) { var p = local(e); feed(p.x, p.y); });
  cv.addEventListener("pointermove", function (e) {
    var p = local(e);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = pondDist(p.x, p.y) < -4;
    if (pointer.inside && Math.hypot(p.x - pointer.wx, p.y - pointer.wy) > 7) {
      splash(p.x, p.y, -0.22, 1.2);
      pointer.wx = p.x; pointer.wy = p.y;
    }
  });
  cv.addEventListener("pointerleave", function () { pointer.inside = false; });
  window.addEventListener("resize", function () { layout(); render(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  layout();
  render();
  if (document.fonts && document.fonts.load) document.fonts.load(FONT_PX + FAMILY).then(function () { resetAtlas(); render(); }, function () {});
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(cv);
  } else { visible = true; start(); }
})();
