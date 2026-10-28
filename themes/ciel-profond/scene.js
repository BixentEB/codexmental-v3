/* Thème « Ciel profond » — scène canvas 2D procédurale. */
window.CodexScene = { ok: true };
(function () {
  'use strict';
  var Codex = window.Codex;

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var bgEl = $('bg'), fxEl = $('fx'), gridEl = $('grid');
  var fx = fxEl.getContext('2d'), gctx = gridEl.getContext('2d');

  /* ---------- Réglages ---------- */
  var FILT = {
    visible: { band: [1, 0.92, 0.82], bandOut: [0.5, 0.66, 1], emA: [0.95, 0.2, 0.18], emB: [0.22, 0.72, 0.9], refl: [0.35, 0.52, 1], dust: 'dark', mixStar: null,
      gal: { core: [1, 0.84, 0.58], arm: [0.64, 0.78, 1], hii: [1, 0.42, 0.6] } },
    infrarouge: { band: [1, 0.62, 0.36], bandOut: [0.9, 0.42, 0.26], emA: [1, 0.5, 0.15], emB: [1, 0.78, 0.42], refl: [1, 0.55, 0.3], dust: 'glow', mixStar: [255, 150, 95, 0.55],
      gal: { core: [1, 0.74, 0.4], arm: [1, 0.56, 0.3], hii: [1, 0.84, 0.5] } },
    hubble: { band: [1, 0.86, 0.62], bandOut: [0.3, 0.5, 0.9], emA: [1, 0.68, 0.15], emB: [0.15, 0.6, 1], refl: [0.3, 0.55, 1], dust: 'dark', mixStar: null,
      gal: { core: [1, 0.82, 0.52], arm: [0.55, 0.8, 1], hii: [1, 0.72, 0.22] } }
  };
  var state = { filter: 'visible', speed: 1, comets: true, grid: true };
  try {
    var saved = JSON.parse(localStorage.getItem('codex-mental-3') || 'null');
    if (saved) {
      if (FILT[saved.filter]) state.filter = saved.filter;
      if (typeof saved.speed === 'number' && saved.speed >= 0 && saved.speed <= 3) state.speed = saved.speed;
      if (typeof saved.comets === 'boolean') state.comets = saved.comets;
      if (typeof saved.grid === 'boolean') state.grid = saved.grid;
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem('codex-mental-3', JSON.stringify(state)); } catch (e) {} }

  /* ---------- Bruit ---------- */
  function hash(ix, iy, s) {
    var h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx_ = x - ix, fy = y - iy;
    var u = fx_ * fx_ * (3 - 2 * fx_), v = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) {
    var sum = 0, amp = 0.5, f = 1;
    for (var i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, s + i); f *= 2.03; amp *= 0.5; }
    return sum / (1 - Math.pow(0.5, oct));
  }
  function sstep(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function gauss() { var u = 0; for (var i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 0.577; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* ---------- Étoiles : couleurs spectrales ---------- */
  var SPEC = [[155, 176, 255], [175, 195, 255], [205, 218, 255], [235, 240, 255], [255, 248, 240], [255, 238, 214], [255, 222, 180], [255, 200, 150], [255, 170, 110]];
  var SPEC_W = [0.06, 0.08, 0.1, 0.14, 0.17, 0.17, 0.12, 0.1, 0.06];
  var specCols = [], specStr = [], specSprite = [];
  function pickSpec(bright) {
    if (bright) return Math.random() < 0.55 ? (Math.random() * 3) | 0 : 6 + ((Math.random() * 3) | 0);
    var t = Math.random(), acc = 0;
    for (var i = 0; i < SPEC_W.length; i++) { acc += SPEC_W[i]; if (t < acc) return i; }
    return 4;
  }
  function applyFilterColors() {
    var F = FILT[state.filter], m = F.mixStar;
    specCols = []; specStr = []; specSprite = [];
    for (var i = 0; i < SPEC.length; i++) {
      var c = SPEC[i];
      if (m) c = [c[0] * (1 - m[3]) + m[0] * m[3], c[1] * (1 - m[3]) + m[1] * m[3], c[2] * (1 - m[3]) + m[2] * m[3]];
      c = [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])];
      specCols.push(c); specStr.push('rgb(' + c.join(',') + ')');
      var s = document.createElement('canvas'); s.width = s.height = 64;
      var sc = s.getContext('2d'), g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.1, 'rgba(' + c.join(',') + ',0.6)');
      g.addColorStop(0.3, 'rgba(' + c.join(',') + ',0.16)');
      g.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
      sc.fillStyle = g; sc.fillRect(0, 0, 64, 64);
      specSprite.push(s);
    }
  }

  /* ---------- Dimensions ---------- */
  var W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, small = false, ready = false, firstBake = true, intro = false;
  var PHI = -0.3, TILT = 0.52, cosP = Math.cos(PHI), sinP = Math.sin(PHI);
  var galSprite = null, bloomA = null, bloomB = null, dstars = [], motes = [], shooters = [], regions = [], snSpots = [];
  var counts = { bg: 0, gal: 0, dyn: 0 };
  var softSprite = null;

  function layout() {
    small = W < 760;
    if (small) { cx = W * 0.5; cy = H * 0.66; R = Math.min(W * 0.78, H * 0.44); }
    else { cx = W * 0.57; cy = H * 0.52; R = Math.min(W * 0.42, H * 0.95); }
  }
  function sizeCanvases() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = CodexPx(1.5);
    [bgEl, fxEl, gridEl].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
  }

  /* ---------- Fond figé : ciel profond ---------- */
  var BA = 0.3, BSA = Math.sin(BA), BCA = Math.cos(BA);
  function bandAt(x, y, x0) { var dd = -(x - x0) * BSA + (y - 0.5) * BCA; return Math.exp(-(dd * dd) / (2 * 0.17 * 0.17)); }

  function bakeBackground() {
    var F = FILT[state.filter], c = bgEl.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.fillStyle = '#02030a'; c.fillRect(0, 0, W, H);

    var step = small ? 4 : (W > 2000 ? 3 : 2), gw = Math.ceil(W / step), gh = Math.ceil(H / step);
    var low = document.createElement('canvas'); low.width = gw; low.height = gh;
    var lc = low.getContext('2d'), img = lc.createImageData(gw, gh), d = img.data;
    var x0 = 0.45 * W / H, cells = {}, i, j, k;
    /* deux complexes nébuleux, un à gauche, un en haut à droite */
    var cmps = [{ x: 0.2 * W / H, y: 0.74, s: 0.2 }, { x: 0.9 * W / H, y: 0.2, s: 0.17 }];
    for (j = 0; j < gh; j++) {
      for (i = 0; i < gw; i++) {
        var x = i * step / H, y = j * step / H;
        var dd = -(x - x0) * BSA + (y - 0.5) * BCA + (fbm(x * 1.4, y * 1.4, 11, 4) - 0.5) * 0.45;
        var band = Math.exp(-(dd * dd) / (2 * 0.17 * 0.17));
        var cl = fbm(x * 3.4 + 3, y * 3.4, 21, 7), cstr = sstep(0.4, 0.8, cl);
        var cmp = 0;
        for (k = 0; k < cmps.length; k++) { var ddx = x - cmps[k].x, ddy = y - cmps[k].y; cmp += Math.exp(-(ddx * ddx + ddy * ddy) / (2 * cmps[k].s * cmps[k].s)); }
        var wisp = Math.pow(1 - Math.abs(2 * fbm(x * 6.5 + 4, y * 6.5 - 9, 141, 6) - 1), 3);
        var dn = fbm(x * 5.4 + 9, y * 5.4 - 4, 31, 7), fil = sstep(0.64, 0.93, 1 - Math.abs(2 * dn - 1));
        var big = sstep(0.54, 0.8, fbm(x * 1.7 - 2, y * 1.7 + 5, 41, 5));
        var dustM = Math.min(1, (fil * 0.85 + big * 0.5) * (0.2 + 0.8 * Math.max(band, cmp * 0.7)));
        var em = sstep(0.5, 0.84, fbm(x * 2.6 + 20, y * 2.6 + 7, 51, 7)) * (0.12 + 0.55 * band) + cmp * (0.18 + 0.9 * wisp) * sstep(0.35, 0.7, fbm(x * 3.1 + 2, y * 3.1 + 40, 151, 5));
        var emCol = mix3(F.emA, F.emB, sstep(0.3, 0.7, fbm(x * 1.2 + 30, y * 1.2, 61, 3) + (1 - Math.min(1, cmp)) * 0.2));
        var refl = sstep(0.48, 0.86, fbm(x * 2.1 - 8, y * 2.1 + 14, 71, 5)) * (0.1 + 0.4 * band + 0.3 * cmp);
        var diff = band * (0.04 + 0.34 * cstr * cstr + 0.06 * cl);
        var bc = mix3(F.bandOut, F.band, sstep(0.15, 0.75, band));
        var occl = F.dust === 'dark' ? 1 - 0.94 * dustM : 1;
        var glow = F.dust === 'glow' ? dustM * 0.32 * (0.35 + band + cmp) : 0;
        var o = (j * gw + i) * 4, lum = 0;
        for (k = 0; k < 3; k++) {
          var v = (diff * bc[k] + refl * 0.26 * F.refl[k]) * occl + em * 0.4 * emCol[k] * (F.dust === 'dark' ? 1 - 0.6 * dustM : 1) + glow * [1, 0.5, 0.2][k];
          v = 1 - Math.exp(-Math.pow(v, 1.08) * 1.9);
          var base = [0.004, 0.006, 0.017][k];
          var out = (base + v * 0.92) * 255 + (Math.random() - 0.5) * 1.4;
          d[o + k] = out < 0 ? 0 : out > 255 ? 255 : out;
          lum += v;
        }
        d[o + 3] = 255;
        var gx_ = ((i * step) / W * 6) | 0, gy_ = ((j * step) / H * 4) | 0, key = gx_ + ',' + gy_;
        if (!cells[key]) cells[key] = { x: gx_, y: gy_, s: 0, n: 0 };
        cells[key].s += lum; cells[key].n++;
      }
    }
    lc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(low, 0, 0, W, H);

    /* grain fin */
    var gn = document.createElement('canvas'); gn.width = gn.height = 192;
    var gnc = gn.getContext('2d'), gi = gnc.createImageData(192, 192);
    for (i = 0; i < gi.data.length; i += 4) { var gv = Math.random() * Math.random() * 11; gi.data[i] = gv; gi.data[i + 1] = gv; gi.data[i + 2] = gv * 1.1; gi.data[i + 3] = 255; }
    gnc.putImageData(gi, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = c.createPattern(gn, 'repeat');
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillRect(0, 0, bgEl.width, bgEl.height); c.restore();

    /* galaxies lointaines */
    var nGal = small ? 7 : 18, gcol = [[255, 225, 190], [210, 225, 255], [255, 205, 170]];
    for (i = 0; i < nGal; i++) {
      var gxp = Math.random() * W, gyp = Math.random() * H, gr = 3 + Math.pow(Math.random(), 2) * 12;
      var ge = 0.25 + Math.random() * 0.6, ga = Math.random() * Math.PI, gcc = gcol[(Math.random() * 3) | 0];
      c.save(); c.translate(gxp, gyp); c.rotate(ga); c.scale(1, ge);
      var gg = c.createRadialGradient(0, 0, 0, 0, 0, gr);
      gg.addColorStop(0, 'rgba(' + gcc.join(',') + ',0.75)'); gg.addColorStop(0.2, 'rgba(' + gcc.join(',') + ',0.3)'); gg.addColorStop(1, 'rgba(' + gcc.join(',') + ',0)');
      c.fillStyle = gg; c.fillRect(-gr, -gr, gr * 2, gr * 2);
      c.restore();
    }

    /* étoiles faibles, plus denses dans le plan galactique */
    var nFaint = Math.round(W * H / (small ? 80 : 90)), placed = 0, tries = 0;
    while (placed < nFaint && tries < nFaint * 6) {
      tries++;
      var sx = Math.random() * W, sy = Math.random() * H;
      var bd = bandAt(sx / H, sy / H, x0);
      if (Math.random() > 0.25 + 0.75 * bd) continue;
      var sp = specCols[pickSpec(false)], al = 0.1 + Math.pow(Math.random(), 5) * 0.8, sz = 0.55 + Math.random() * 0.75;
      c.fillStyle = 'rgba(' + sp[0] + ',' + sp[1] + ',' + sp[2] + ',' + al.toFixed(2) + ')';
      c.fillRect(sx, sy, sz, sz);
      placed++;
    }
    /* amas ouverts */
    var nClu = small ? 2 : 4, nStarsClu = 0;
    for (i = 0; i < nClu; i++) {
      var ccx = W * (0.08 + Math.random() * 0.84), ccy = H * (0.1 + Math.random() * 0.8), sg = 10 + Math.random() * 12;
      var hg = c.createRadialGradient(ccx, ccy, 0, ccx, ccy, sg * 2.2);
      hg.addColorStop(0, 'rgba(190,210,255,0.1)'); hg.addColorStop(1, 'rgba(190,210,255,0)');
      c.fillStyle = hg; c.fillRect(ccx - sg * 2.2, ccy - sg * 2.2, sg * 4.4, sg * 4.4);
      for (j = 0; j < 34; j++) {
        var cs = specCols[pickSpec(true)];
        c.fillStyle = 'rgba(' + cs.join(',') + ',' + (0.35 + Math.random() * 0.6).toFixed(2) + ')';
        var csz = 0.7 + Math.random() * 1.1;
        c.fillRect(ccx + gauss() * sg - csz / 2, ccy + gauss() * sg - csz / 2, csz, csz);
        nStarsClu++;
      }
    }
    /* étoiles moyennes avec halo */
    var nMid = small ? 70 : 230;
    for (i = 0; i < nMid; i++) {
      var mxp = Math.random() * W, myp = Math.random() * H, ci = pickSpec(false), col = specCols[ci];
      var hr = 2.5 + Math.random() * 5, a = 0.25 + Math.random() * 0.5;
      c.globalAlpha = a;
      c.drawImage(specSprite[ci], mxp - hr, myp - hr, hr * 2, hr * 2);
      c.globalAlpha = Math.min(1, a + 0.3);
      c.fillStyle = 'rgb(' + col.join(',') + ')';
      c.fillRect(mxp - 0.6, myp - 0.6, 1.2, 1.2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    counts.bg = placed + nMid + nStarsClu;

    var list = Object.keys(cells).map(function (kk) { var o = cells[kk]; o.m = o.s / o.n; return o; }).sort(function (a, b) { return b.m - a.m; });
    regions = [];
    for (i = 0; i < list.length && regions.length < 3; i++) {
      var ok = true;
      for (j = 0; j < regions.length; j++) if (Math.abs(regions[j].x - list[i].x) < 2 && Math.abs(regions[j].y - list[i].y) < 2) ok = false;
      if (ok) regions.push(list[i]);
    }
  }

  /* ---------- Galaxie : sprite vu de face ---------- */
  var gI = 0, gWarm = 0, gD = 0, gHii = 0, gArm = 0, K_SPIRAL = 2.7;
  function gal(nx, ny, r) {
    var th = Math.atan2(ny, nx);
    var warp = (fbm(nx * 2.6 + 9, ny * 2.6 - 4, 111, 3) - 0.5) * 1.2;
    var ph = th - K_SPIRAL * Math.log(Math.max(r, 0.03)) + warp * sstep(0.1, 0.5, r);
    var arms = Math.pow(0.5 + 0.5 * Math.cos(2 * ph), 1.7);
    var sub = 0.5 + 0.5 * Math.cos(3 * ph + 0.7 + warp);
    var armMix = (0.8 * arms + 0.3 * sub * sub * sstep(0.28, 0.6, r)) * sstep(0.07, 0.24, r);
    var clump = 0.62 + 0.75 * fbm(nx * 7 + 3, ny * 7, 81, 4);
    var tex = 0.72 + 0.55 * fbm(nx * 20 + 5, ny * 20, 121, 4);
    var disk = Math.exp(-r / 0.36);
    var bulge = 1.05 * Math.exp(-Math.pow(r / 0.08, 0.75)) + 0.2 * Math.exp(-Math.pow(r / 0.17, 1.2)) + 0.7 * Math.exp(-r / 0.022);
    var halo = 0.1 * Math.exp(-r / 0.6);
    var edge = 1 - sstep(0.8, 1.0, r);
    gI = (disk * (0.12 + 1.15 * armMix * clump * tex) + bulge + halo) * edge * 1.05;
    gWarm = Math.min(1, (bulge + halo * 0.5) / (gI / 1.05 + 1e-4) * 1.1 + (1 - armMix) * 0.3);
    gHii = sstep(0.62, 0.8, fbm(nx * 26 + 7, ny * 26, 91, 3)) * Math.pow(armMix, 1.3) * sstep(0.16, 0.45, r) * edge;
    var dph = 0.5 + 0.5 * Math.cos(2 * (ph - 0.55));
    var lane = Math.pow(dph, 3.4) * sstep(0.1, 0.3, r) * (1 - sstep(0.8, 0.97, r));
    var fil = sstep(0.5, 0.85, 1 - Math.abs(2 * fbm(nx * 16 + 20, ny * 16, 101, 5) - 1));
    var spur = sstep(0.55, 0.8, fbm(nx * 9 + 3, ny * 9 + 8, 131, 4));
    gD = Math.min(1, lane * (0.25 + 0.7 * fil + 0.35 * spur));
    gArm = armMix;
  }

  function smallCopy(src, size) {
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, size, size);
    return cv;
  }

  function genGalaxy() {
    var G = FILT[state.filter].gal, S = small ? 800 : 1600, Sd = small ? 360 : 640, i, j;
    var dc = document.createElement('canvas'); dc.width = dc.height = Sd;
    var dctx = dc.getContext('2d'), img = dctx.createImageData(Sd, Sd), d = img.data;
    for (j = 0; j < Sd; j++) {
      for (i = 0; i < Sd; i++) {
        var nx = (i + 0.5) / Sd * 2 - 1, ny = (j + 0.5) / Sd * 2 - 1, r = Math.sqrt(nx * nx + ny * ny), o = (j * Sd + i) * 4;
        d[o + 3] = 255;
        if (r >= 1) continue;
        gal(nx, ny, r);
        var dm = 1 - 0.7 * gD;
        for (var k = 0; k < 3; k++) {
          var col = G.arm[k] + (G.core[k] - G.arm[k]) * gWarm;
          var v = (gI * col + gHii * G.hii[k] * 0.28) * dm * (k === 2 ? 1 - 0.1 * gD : 1);
          v = 1 - Math.exp(-v * 1.15);
          d[o + k] = Math.min(255, v * 255);
        }
      }
    }
    dctx.putImageData(img, 0, 0);
    var gc = document.createElement('canvas'); gc.width = gc.height = S;
    var g = gc.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(dc, 0, 0, S, S);
    g.globalCompositeOperation = 'lighter';

    var N = small ? 12000 : 62000, placed = 0, tries = 0;
    snSpots = [];
    while (placed < N && tries < N * 8) {
      tries++;
      var sx = Math.random() * 2 - 1, sy = Math.random() * 2 - 1, sr = Math.sqrt(sx * sx + sy * sy);
      if (sr >= 0.98) continue;
      gal(sx, sy, sr);
      if (Math.random() > Math.min(1, gI * 1.1)) continue;
      if (gD > 0.45 && Math.random() < 0.85) continue;
      var cc = mix3(mix3(G.arm, G.core, gWarm), [1, 1, 1], 0.35);
      var size = 0.5 + Math.pow(Math.random(), 3) * 1.7;
      var px_ = (sx + 1) / 2 * S, py_ = (sy + 1) / 2 * S;
      if (gArm > 0.65 && sr > 0.2 && Math.random() < 0.012) {
        var rad = 3 + Math.random() * 5, bg_ = g.createRadialGradient(px_, py_, 0, px_, py_, rad);
        bg_.addColorStop(0, 'rgba(235,242,255,0.9)'); bg_.addColorStop(0.25, 'rgba(170,200,255,0.35)'); bg_.addColorStop(1, 'rgba(150,185,255,0)');
        g.fillStyle = bg_; g.fillRect(px_ - rad, py_ - rad, rad * 2, rad * 2);
        if (snSpots.length < 90) snSpots.push({ nx: sx, ny: sy });
      }
      g.fillStyle = 'rgba(' + ((cc[0] * 255) | 0) + ',' + ((cc[1] * 255) | 0) + ',' + ((cc[2] * 255) | 0) + ',' + (0.25 + Math.random() * 0.7).toFixed(2) + ')';
      g.fillRect(px_ - size / 2, py_ - size / 2, size, size);
      placed++;
    }
    /* régions HII : petits nœuds lumineux */
    var hn = 0; tries = 0;
    while (hn < (small ? 40 : 110) && tries < 40000) {
      tries++;
      var hx = Math.random() * 2 - 1, hy = Math.random() * 2 - 1, hr_ = Math.sqrt(hx * hx + hy * hy);
      if (hr_ > 0.9) continue;
      gal(hx, hy, hr_);
      if (gHii < 0.4) continue;
      var bx = (hx + 1) / 2 * S, by = (hy + 1) / 2 * S, rd = 2.5 + Math.random() * 5.5;
      var hg = g.createRadialGradient(bx, by, 0, bx, by, rd);
      var hc = ((G.hii[0] * 255) | 0) + ',' + ((G.hii[1] * 255) | 0) + ',' + ((G.hii[2] * 255) | 0);
      hg.addColorStop(0, 'rgba(255,240,242,0.55)'); hg.addColorStop(0.3, 'rgba(' + hc + ',0.24)'); hg.addColorStop(1, 'rgba(' + hc + ',0)');
      g.fillStyle = hg; g.fillRect(bx - rd, by - rd, rd * 2, rd * 2);
      hn++;
    }
    galSprite = gc;
    bloomA = smallCopy(gc, 96);
    bloomB = smallCopy(gc, 28);
    counts.gal = placed + hn;
  }

  /* ---------- Couche dynamique ---------- */
  function buildDynamic() {
    var n = small ? 170 : 400, i;
    dstars = [];
    for (i = 0; i < n; i++) {
      var b = 0.12 + Math.pow(Math.random(), 3.4) * 0.88;
      dstars.push({ x: Math.random(), y: Math.random(), b: b, c: pickSpec(b > 0.6), d: 0.2 + Math.random() * 0.8,
        h: 2 + b * 7, s: 0.7 + b * 1.5, f1: 1.2 + Math.random() * 3.2, f2: 2.5 + Math.random() * 4,
        p1: Math.random() * TAU, p2: Math.random() * TAU, amp: 0.1 + b * 0.3, spike: 0, ang: 0 });
    }
    var idx = dstars.map(function (s, k) { return k; }).sort(function (a, b) { return dstars[b].b - dstars[a].b; }).slice(0, small ? 6 : 13);
    idx.forEach(function (k) {
      var s = dstars[k];
      s.b = 0.8 + Math.random() * 0.2; s.h = 9 + Math.random() * 9; s.s = 2.2;
      s.spike = 50 + Math.random() * 120; s.ang = Math.random() * 0.5 - 0.25; s.amp = 0.24;
    });
    counts.dyn = n;

    motes = [];
    for (i = 0; i < (small ? 14 : 34); i++) {
      motes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.1, a: 0.12 + Math.random() * 0.3, d: 1.5 + Math.random() * 2.5, sp: 0.02 + Math.random() * 0.05, p: Math.random() * TAU });
    }
    for (i = 0; i < (small ? 3 : 6); i++) {
      motes.push({ x: Math.random(), y: Math.random(), r: 22 + Math.random() * 40, a: 0.018 + Math.random() * 0.02, d: 3, sp: 0.02, p: Math.random() * TAU, soft: true });
    }
    var bs = document.createElement('canvas'); bs.width = bs.height = 128;
    var b = bs.getContext('2d'), g = b.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.5, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = g; b.fillRect(0, 0, 128, 128);
    softSprite = bs;
  }

  /* ---------- Coordonnées célestes ---------- */
  var RA0 = 0.7122, DEC0 = 41.2689, zoom = 1, zoomT = 1;
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function ppd() { return 0.5625 * R * zoom; }
  function skyAt(x, y) {
    var s = ppd();
    return [RA0 - ((x - cx) / s) / (15 * Math.cos(DEC0 * Math.PI / 180)), DEC0 - (y - cy) / s];
  }
  function fmtRA(h, sec) {
    h = ((h % 24) + 24) % 24;
    var hh = Math.floor(h), m = (h - hh) * 60, mm = Math.floor(m + 1e-6), ss = Math.floor((m - mm) * 60 + 1e-6);
    return p2(hh) + 'h ' + p2(mm) + 'm' + (sec ? ' ' + p2(ss) + 's' : '');
  }
  function fmtDec(dg, sec) {
    var sg = dg < 0 ? '−' : '+'; dg = Math.abs(dg);
    var dd = Math.floor(dg), m = (dg - dd) * 60, mm = Math.floor(m + 1e-6), ss = Math.floor((m - mm) * 60 + 1e-6);
    return sg + p2(dd) + '° ' + p2(mm) + '′' + (sec ? ' ' + p2(ss) + '″' : '');
  }
  function fr(n, dgt) { return n.toFixed(dgt).replace('.', ','); }
  function fmtInt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var nodeEls = Array.prototype.slice.call(document.querySelectorAll('.node'));
  function updateNodes() {
    nodeEls.forEach(function (n) {
      var s = skyAt(n.offsetLeft, n.offsetTop);
      n.querySelector('.co').textContent = 'α ' + fmtRA(s[0], true) + '  δ ' + fmtDec(s[1], false);
      // désignation de relevé à la manière de l'UAI (J hhmm ± dd) : le repère porte son nom de catalogue, la rubrique se lit au survol
      var hr = ((s[0] % 24) + 24) % 24, hh = Math.floor(hr), mn = Math.floor((hr - hh) * 60), dg = Math.abs(s[1]), sy = n.querySelector('.sym');
      if (sy) sy.textContent = 'J' + p2(hh) + p2(mn) + (s[1] < 0 ? '−' : '+') + p2(Math.floor(dg));
    });
  }
  function updateHud() {
    var s = ppd();
    $('sb-line').style.width = Math.round(s * 0.5) + 'px';
    $('rd-fov').textContent = 'FOV ' + fr(W / s, 1) + '° × ' + fr(H / s, 1) + '° · ×' + fr(zoom, 1);
    $('rd-sim').textContent = 'Simulation procédurale · ' + fmtInt(counts.bg + counts.gal + counts.dyn) + ' étoiles';
  }
  function updatePointerSky(x, y) {
    var s = skyAt(x, y);
    $('rd-sky').textContent = 'α ' + fmtRA(s[0], true) + ' · δ ' + fmtDec(s[1], true);
  }

  /* ---------- Grille et règles graduées ---------- */
  function drawGrid() {
    var c = gctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
    if (!state.grid) return;
    var s = ppd(), poleX = W * 0.5, poleY = -H * 0.9, rc = cy - poleY, k, i;
    c.lineWidth = 1;
    for (k = -24; k <= 24; k++) {
      var r = rc - k * 0.25 * s;
      if (r < 10) continue;
      c.strokeStyle = 'rgba(160,185,230,' + (k % 4 === 0 ? 0.13 : 0.05) + ')';
      c.beginPath(); c.arc(poleX, poleY, r, 0, TAU); c.stroke();
    }
    var cosd = Math.cos(DEC0 * Math.PI / 180), dA = (0.04 * 15 * cosd * s) / rc;
    for (i = -30; i <= 30; i++) {
      var a = i * dA, L = H * 5;
      c.strokeStyle = 'rgba(160,185,230,' + (i % 5 === 0 ? 0.13 : 0.05) + ')';
      c.beginPath(); c.moveTo(poleX, poleY); c.lineTo(poleX + Math.sin(a) * L, poleY + Math.cos(a) * L); c.stroke();
    }

    c.font = '9px "IBM Plex Mono", monospace';
    /* règle de déclinaison, bord droit : un trait par minute d'arc */
    var yTop = 62, yBot = H - (small ? 96 : 176);
    var amTop = Math.floor((DEC0 - (yTop - cy) / s) * 60), amBot = Math.ceil((DEC0 - (yBot - cy) / s) * 60);
    var every = small ? 20 : 10, p1 = new Path2D(), p2_ = new Path2D(), p3 = new Path2D(), am, y;
    c.fillStyle = 'rgba(205,222,250,0.8)'; c.textAlign = 'right';
    for (am = amBot; am <= amTop; am++) {
      y = cy - (am / 60 - DEC0) * s;
      var P = am % every === 0 ? p3 : am % 5 === 0 ? p2_ : p1, len = am % every === 0 ? 12 : am % 5 === 0 ? 8 : 4;
      P.moveTo(W, y); P.lineTo(W - len, y);
      if (am % every === 0) c.fillText(fmtDec(am / 60, false), W - 18, y + 3);
    }
    c.strokeStyle = 'rgba(200,218,248,0.28)'; c.stroke(p1);
    c.strokeStyle = 'rgba(200,218,248,0.45)'; c.stroke(p2_);
    c.strokeStyle = 'rgba(200,218,248,0.7)'; c.stroke(p3);
    /* règle d'ascension droite, sous la barre du haut : un trait par 10 secondes */
    var raL = RA0 - (0 - cx) / (15 * cosd * s), raR = RA0 - (W - cx) / (15 * cosd * s);
    var kmin = Math.ceil(raR * 360), kmax = Math.floor(raL * 360), kk, x;
    var q1 = new Path2D(), q2 = new Path2D(), q3 = new Path2D(), everyK = small ? 30 : 6;
    c.textAlign = 'left';
    for (kk = kmin; kk <= kmax; kk++) {
      x = cx - ((kk / 360 - RA0) * 15 * cosd) * s;
      var Q = kk % everyK === 0 ? q3 : kk % 3 === 0 ? q2 : q1, ln = kk % everyK === 0 ? 12 : kk % 3 === 0 ? 8 : 4;
      Q.moveTo(x, 55); Q.lineTo(x, 55 + ln);
      if (kk % everyK === 0) c.fillText(fmtRA(kk / 360, false), x + 4, 55 + 22);
    }
    c.strokeStyle = 'rgba(200,218,248,0.28)'; c.stroke(q1);
    c.strokeStyle = 'rgba(200,218,248,0.45)'; c.stroke(q2);
    c.strokeStyle = 'rgba(200,218,248,0.7)'; c.stroke(q3);
  }

  /* ---------- Vignettes ---------- */
  var REG_NAMES = [['Nébuleuse des Idées', 'Région de formation des concepts'], ['Amas des Hypothèses', 'Là où les questions se regroupent'], ['Ceinture des Paradoxes', 'Zone de turbulences fertiles']];
  var ri = 0;
  function drawThumb() {
    var t = $('nebula-thumb'), c = t.getContext('2d'), r = regions[ri % (regions.length + 1)];
    c.fillStyle = '#03040c'; c.fillRect(0, 0, t.width, t.height);
    if (!r) { c.imageSmoothingQuality = 'high'; c.drawImage(bgEl, 0, 0, bgEl.width, bgEl.height, 0, 0, t.width, t.height); return; }   // dernier pas : le ciel complet
    var sw = bgEl.width / 6, sh = bgEl.height / 4, sx = r.x * sw, sy = r.y * sh;
    var cw = Math.min(sw, sh * 4 / 3), ch = cw * 3 / 4;
    c.imageSmoothingQuality = 'high';
    c.drawImage(bgEl, sx + (sw - cw) / 2, sy + (sh - ch) / 2, cw, ch, 0, 0, t.width, t.height);
  }

  /* ---------- Interaction ---------- */
  var mx = 0, my = 0, px = 0, py = 0, drag = false, lastX = 0, vel = 0, extra = 0;
  var stageEl = $('stage');
  window.addEventListener('pointermove', function (e) {
    mx = (e.clientX / W - 0.5) * 2; my = (e.clientY / H - 0.5) * 2;
    updatePointerSky(e.clientX, e.clientY);
    if (e.target.closest && e.target.closest('.reader')) stageEl.classList.remove('tracking');
    else if (e.pointerType === 'mouse') {
      stageEl.classList.add('tracking');
      $('xh').style.transform = 'translateY(' + e.clientY + 'px)';
      $('xv').style.transform = 'translateX(' + e.clientX + 'px)';
      $('mkx').style.transform = 'translateX(' + e.clientX + 'px)';
      $('mky').style.transform = 'translateY(' + e.clientY + 'px)';
    }
    if (drag) { var dx = e.clientX - lastX; lastX = e.clientX; vel = dx * 0.004; extra += vel; requestDraw(); }
  }, { passive: true });
  document.addEventListener('pointerleave', function () { stageEl.classList.remove('tracking'); });
  window.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, input, label, a, .reader, .pop, .topbar')) return;
    drag = true; lastX = e.clientX; vel = 0;
  });
  window.addEventListener('pointerup', function () { drag = false; });
  window.addEventListener('pointercancel', function () { drag = false; });
  window.addEventListener('wheel', function (e) {
    if (e.target.closest && e.target.closest('.reader')) return;
    intro = false;
    zoomT = Math.max(0.8, Math.min(1.8, zoomT - e.deltaY * 0.0008));
    if (reduce) { zoom = zoomT; afterZoom(); }
    requestDraw();
  }, { passive: true });
  function afterZoom() { drawGrid(); updateHud(); updateNodes(); }

  /* ---------- Dessin ---------- */
  var time = 0, spin = 0, nextShot = 3, nextSN = 7, sn = null, snCount = 0, queued = false, lastHud = 1;
  var evt = $('evt');
  function requestDraw() {
    if (!reduce || queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; drawFx(); });
  }
  function galToScreen(nx, ny) {
    var Rz = R * zoom, a = spin + extra, ca = Math.cos(a), sa = Math.sin(a);
    var lx = nx * Rz, ly = ny * Rz, x1 = lx * ca - ly * sa, y1 = (lx * sa + ly * ca) * TILT;
    return [cx + px * 10 + x1 * cosP - y1 * sinP, cy + py * 6 + x1 * sinP + y1 * cosP];
  }
  function spikes(c, x, y, L, a, rot, rgbs) {
    c.save(); c.translate(x, y); c.rotate(rot);
    for (var q = 0; q < 4; q++) {
      var g = c.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.75 * a).toFixed(3) + ')');
      g.addColorStop(0.25, 'rgba(' + rgbs.join(',') + ',' + (0.22 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgbs.join(',') + ',0)');
      c.fillStyle = g; c.fillRect(0, -0.5, L, 1);
      c.rotate(Math.PI / 2);
    }
    c.restore();
  }

  function drawFx() {
    if (!ready) return;
    var c = fx, i, s;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';

    /* galaxie : halo diffus, puis disque */
    var Rz = R * zoom, gx = cx + px * 10, gy = cy + py * 6;
    c.save();
    c.translate(gx, gy); c.rotate(PHI); c.scale(1, TILT); c.rotate(spin + extra);
    c.imageSmoothingEnabled = true;
    c.globalAlpha = 0.2; c.drawImage(bloomB, -Rz * 1.25, -Rz * 1.25, Rz * 2.5, Rz * 2.5);
    c.globalAlpha = 0.24; c.drawImage(bloomA, -Rz, -Rz, Rz * 2, Rz * 2);
    c.globalAlpha = 0.97 + 0.03 * Math.sin(time * 0.8);
    c.drawImage(galSprite, -Rz, -Rz, Rz * 2, Rz * 2);
    c.restore();
    c.globalAlpha = 1;

    /* poussières proches */
    var zs = 1 + (zoom - 1) * 0.5;
    for (i = 0; i < motes.length; i++) {
      s = motes[i];
      var mxp = ((s.x + Math.sin(time * s.sp + s.p) * 0.02) * 1.2 - 0.1) * W, myp = ((s.y + time * s.sp * 0.01 * (s.soft ? 1 : 2)) % 1.2 - 0.1) * H;
      mxp = cx + (mxp - cx) * zs + px * s.d * 16; myp = cy + (myp - cy) * zs + py * s.d * 10;
      if (s.soft) {
        c.globalAlpha = s.a; c.drawImage(softSprite, mxp - s.r, myp - s.r, s.r * 2, s.r * 2);
      } else {
        c.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(time * 0.9 + s.p)); c.fillStyle = '#dfe8ff';
        c.fillRect(mxp - s.r / 2, myp - s.r / 2, s.r, s.r);
      }
    }
    c.globalAlpha = 1;

    /* étoiles qui scintillent */
    for (i = 0; i < dstars.length; i++) {
      s = dstars[i];
      var tw = reduce ? 1 : 1 + s.amp * (Math.sin(time * s.f1 + s.p1) * 0.6 + Math.sin(time * s.f2 + s.p2) * 0.4);
      var a = Math.min(1, s.b * tw);
      var x = cx + (s.x * W - cx) * zs + px * s.d * 24, y = cy + (s.y * H - cy) * zs + py * s.d * 15;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      var hh = s.h * (0.9 + 0.2 * tw);
      c.globalAlpha = Math.min(1, a * 0.6);
      c.drawImage(specSprite[s.c], x - hh, y - hh, hh * 2, hh * 2);
      c.globalAlpha = Math.min(1, a);
      c.fillStyle = specStr[s.c];
      c.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
      if (s.spike) { c.globalAlpha = 1; spikes(c, x, y, s.spike * (0.85 + 0.15 * tw), a, s.ang, specCols[s.c]); }
    }
    c.globalAlpha = 1;

    /* supernova */
    if (sn) {
      var age = time - sn.t0, bsn = age < 0.6 ? age / 0.6 : Math.exp(-(age - 0.6) / 3.6);
      var pos = galToScreen(sn.nx, sn.ny), rr = 7 + 36 * bsn;
      c.globalAlpha = Math.min(1, bsn * 1.15);
      c.drawImage(specSprite[2], pos[0] - rr, pos[1] - rr, rr * 2, rr * 2);
      c.globalAlpha = 1;
      spikes(c, pos[0], pos[1], 14 + 80 * bsn, Math.min(1, bsn), 0.2, specCols[2]);
      evt.style.transform = 'translate(' + Math.min(pos[0] + 22, W - 100).toFixed(1) + 'px,' + (pos[1] - 16).toFixed(1) + 'px)';
      evt.style.opacity = Math.max(0, Math.min(1, bsn * 3, (13 - age) / 4)).toFixed(2);
    }

    /* météores */
    for (i = shooters.length - 1; i >= 0; i--) {
      var sh = shooters[i], t = sh.age / sh.life;
      if (t >= 1) { shooters.splice(i, 1); continue; }
      var hx = sh.x + Math.cos(sh.a) * sh.v * sh.age, hy = sh.y + Math.sin(sh.a) * sh.v * sh.age;
      var tx = hx - Math.cos(sh.a) * sh.l, ty = hy - Math.sin(sh.a) * sh.l;
      var lg = c.createLinearGradient(tx, ty, hx, hy);
      lg.addColorStop(0, 'rgba(210,225,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,' + (0.85 * Math.sin(Math.PI * t)).toFixed(3) + ')');
      c.strokeStyle = lg; c.lineWidth = 1.2; c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (ready) {
      time += dt; spin += dt * 0.012 * state.speed;
      var tx = mx + Math.sin(time * 0.06) * 0.25, ty = my + Math.cos(time * 0.045) * 0.2;
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      if (intro) { zoom += (zoomT - zoom) * 0.022; if (Math.abs(zoom - zoomT) < 0.004) { zoom = zoomT; intro = false; } }
      else zoom += (zoomT - zoom) * 0.08;
      if (!drag) { extra += vel; vel *= 0.95; }
      bgEl.style.transform = 'translate3d(' + (-px * 6).toFixed(2) + 'px,' + (-py * 4).toFixed(2) + 'px,0) scale(1.04)';
      if (Math.abs(zoom - lastHud) > 0.004) { lastHud = zoom; afterZoom(); }
      if (state.comets) {
        nextShot -= dt;
        if (nextShot <= 0) {
          nextShot = 5 + Math.random() * 9;
          var right = Math.random() < 0.5, a0 = right ? 0.3 + Math.random() * 0.4 : Math.PI - 0.3 - Math.random() * 0.4;
          shooters.push({ x: Math.random() * W, y: Math.random() * H * 0.5, a: a0, v: 600 + Math.random() * 400, l: 90 + Math.random() * 110, age: 0, life: 0.7 + Math.random() * 0.5 });
        }
        if (!sn && time > nextSN && snSpots.length && !intro && !Codex.reader.isOpen) {
          var sp = snSpots[(Math.random() * snSpots.length) | 0];
          sn = { nx: sp.nx, ny: sp.ny, t0: time };
          $('evt-id').textContent = 'SN 2026' + String.fromCharCode(97 + (snCount++ % 26));
          evt.hidden = false;
        }
      }
      if (sn && time - sn.t0 > 13) { sn = null; evt.hidden = true; nextSN = time + 18 + Math.random() * 22; }
      for (var i = 0; i < shooters.length; i++) shooters[i].age += dt;
      drawFx();
    }
    (window.CodexRaf||requestAnimationFrame)(frame);
  }

  /* ---------- Construction complète ----------
     La fabrication du ciel est lourde (bruit procédural pixel par pixel) : on la découpe en étapes,
     on montre le fond dès qu'il est prêt (jamais d'écran noir le temps de fabriquer la galaxie),
     et on ne la refait que si c'est vraiment nécessaire (largeur, filtre), pas pour la barre d'adresse
     d'un téléphone qui apparaît/disparaît ni pour un simple changement de qualité. */
  var bakeTimer = null, bakeRun = 0, galKey = '', bakedW = 0, bakedH = 0;
  function bakeAll() {
    var run = ++bakeRun;
    sizeCanvases(); layout();
    bakedW = W; bakedH = H;
    applyFilterColors();
    bakeBackground();
    document.documentElement.classList.add('ready');   // le fond apparaît tout de suite
    setTimeout(function () {
      if (run !== bakeRun) return;   // une reconstruction plus récente a pris le relais
      var key = state.filter + '|' + small;
      if (key !== galKey || !galSprite) { genGalaxy(); galKey = key; }
      setTimeout(function () {
        if (run !== bakeRun) return;
        buildDynamic();
        if (firstBake && !reduce) { zoom = 1.45; intro = true; lastHud = zoom; } else { zoom = zoomT; }
        firstBake = false;
        drawGrid(); drawThumb(); updateHud(); updateNodes();
        ready = true;
        if (reduce) drawFx();
      }, 0);
    }, 40);
  }
  function scheduleBake(delay) { clearTimeout(bakeTimer); bakeTimer = setTimeout(bakeAll, delay); }
  window.addEventListener('resize', function () {
    var w = window.innerWidth, h = window.innerHeight;
    // téléphone : la barre d'adresse change la hauteur en défilant -> on garde le ciel tel quel
    if (w === bakedW && Math.abs(h - bakedH) < bakedH * 0.25) return;
    scheduleBake(220);
  });
  // changement de qualité : seules les couches redessinées à chaque image changent de définition ;
  // le fond (figé) et la galaxie sont gardés, pas de reconstruction coûteuse
  Codex.on('perf', function () {
    var d = CodexPx(1.5); if (Math.abs(d - DPR) < 0.05) return;
    DPR = d;
    [fxEl, gridEl].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    drawGrid(); if (reduce) drawFx();
  });

  /* ---------- Laboratoire de la galaxie ---------- */
  var pop = $('pop'), lab = $('lab');
  function togglePop(open) { pop.hidden = !open; lab.setAttribute('aria-expanded', String(open)); }
  lab.addEventListener('click', function () { togglePop(pop.hidden); });
  function markFilter() {
    document.querySelectorAll('.fsw').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.f === state.filter)); });
  }
  document.querySelectorAll('.fsw').forEach(function (b) {
    b.addEventListener('click', function () {
      if (state.filter === b.dataset.f) return;
      state.filter = b.dataset.f; markFilter(); persist(); scheduleBake(0);
    });
  });
  var speed = $('speed'), comets = $('comets'), gridchk = $('gridchk');
  speed.value = state.speed; comets.checked = state.comets; gridchk.checked = state.grid; markFilter();
  speed.addEventListener('input', function () { state.speed = parseFloat(speed.value); persist(); });
  comets.addEventListener('change', function () {
    state.comets = comets.checked;
    if (!state.comets) { shooters = []; sn = null; evt.hidden = true; }
    persist(); requestDraw();
  });
  gridchk.addEventListener('change', function () { state.grid = gridchk.checked; persist(); drawGrid(); });


  /* ---------- Liaison avec l'interface commune ---------- */
  var SEC_OF = { codex: 'codex', atelier: 'atelier', laboratoire: 'lab', observatoire: 'dashb', portrait: 'profil', contact: 'contact' };
  var worldEl = $('world'), readerEl = $('reader'), prevZoom = 1;
  function isMobile() { return window.matchMedia('(max-width:760px)').matches; }
  function applyShift() {   // le ciel glisse pour rester visible à côté du lecteur
    var tx = 0;
    if (document.documentElement.classList.contains('reading') && !isMobile()) {
      var vis = W - readerEl.offsetWidth - 32;
      tx = Math.max(-W * 0.5, Math.min(0, vis / 2 - W * 0.57));
    }
    worldEl.style.transform = 'translate3d(' + tx.toFixed(0) + 'px,0,0)';
  }
  Codex.on('reader:open', function () {
    intro = false; prevZoom = zoomT; zoomT = isMobile() ? zoomT : 0.86;
    requestAnimationFrame(applyShift);
    document.querySelectorAll('.node').forEach(function (n) { n.setAttribute('aria-pressed', 'false'); });
  });
  Codex.on('reader:close', function () {
    zoomT = prevZoom; worldEl.style.transform = 'translate3d(0,0,0)';
    if (reduce) { zoom = zoomT; afterZoom(); }
  });
  Codex.on('nav:active', function (id) {
    document.querySelectorAll('.node').forEach(function (n) { n.setAttribute('aria-pressed', String(SEC_OF[n.dataset.open] === id)); });
  });
  window.addEventListener('resize', function () { if (Codex.reader.isOpen) applyShift(); });
  document.querySelectorAll('[data-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = SEC_OF[el.dataset.open];
      if (Codex.reader.isOpen && Codex.reader.section === id) { Codex.reader.close(); return; }
      Codex.sceneOk ? Codex.navigate(id) : Codex.reader.open(id, el);
    });
  });
  // La barre commune demande une rubrique : ce thème l'ouvre sans voyage de caméra.
  Codex.on('navigate', function (e) {
    if (e.direct) return;
    if (e.id) Codex.reader.open(e.id); else Codex.reader.close();
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('pop').hidden) togglePop(false); });

  /* ---------- Démarrage ---------- */
  sizeCanvases(); layout();
  setTimeout(bakeAll, 30);
  (window.CodexRaf||requestAnimationFrame)(frame);
/* Carte « région du ciel » : chaque clic rapproche le fond d'une région dense, puis revient au ciel complet */
(function () {
  var card = document.getElementById('nebula'), bg = document.getElementById('bg'); if (!card || !bg) return;
  var tt = document.getElementById('nebula-t'), ts = document.getElementById('nebula-s');
  function label() {
    var r = regions[ri % (regions.length + 1)], n = REG_NAMES[ri % (regions.length + 1)];
    if (r && n) { tt.textContent = n[0]; ts.textContent = n[1]; card.setAttribute('aria-label', 'Rapprocher la région : ' + n[0]); }
    else { tt.textContent = 'Le ciel complet'; ts.textContent = 'Revenir à la vue d’ensemble'; card.setAttribute('aria-label', 'Revenir à la vue d’ensemble du ciel'); }
    drawThumb();
  }
  card.addEventListener('click', function () {
    var r = regions[ri % (regions.length + 1)];
    if (r) { bg.style.transformOrigin = ((r.x + .5) / 6 * 100) + '% ' + ((r.y + .5) / 4 * 100) + '%'; bg.style.scale = '2.3'; }
    else { bg.style.scale = ''; }
    ri = (ri + 1) % (regions.length + 1); label();
  });
  bg.style.transition = 'scale 1.4s cubic-bezier(.2,.7,.2,1)';
  if (reduce) bg.style.transition = 'none';
  var wt = setInterval(function () { if (regions.length) { clearInterval(wt); label(); } }, 300); setTimeout(function () { clearInterval(wt); }, 30000);
})();
})();

