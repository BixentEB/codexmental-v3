/* ======================================================================
   Thème Atome — un atome de bore (5 protons, 6 neutrons, 5 électrons)
   dessiné comme un petit système solaire : noyau qui frémit, orbites
   lumineuses, traînées colorées, nuage quantique, photons et paires
   virtuelles. Canvas 2D pur (pas de WebGL) : tourne partout, s'allège
   avec Codex.perf.scale sans jamais s'éteindre.
   ====================================================================== */
window.CodexScene = { ok: true };
(function () {
  'use strict';
  var C = window.Codex, cv = document.getElementById('at-cv'), nav = document.getElementById('at-nav');
  var g = cv && cv.getContext('2d', { alpha: false });
  if (!g) { window.CodexScene.ok = false; return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAF = window.CodexRaf || requestAnimationFrame, TAU = Math.PI * 2;
  function Q() { return C.perf ? C.perf.scale : 1; }   // 1 · .8 · .6 · .5

  /* ---------- réglages (carte commune), mémorisés ---------- */
  var CFG = { speed: 1, glow: 1, trail: 1, model: 'mixte' };
  try { var sv = JSON.parse(localStorage.getItem('codex.atome') || 'null'); if (sv) Object.keys(CFG).forEach(function (k) { if (sv[k] != null) CFG[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem('codex.atome', JSON.stringify(CFG)); } catch (e) {} }

  /* ---------- les cinq électrons = les cinq rubriques ---------- */
  var D2R = Math.PI / 180;
  var E = [
    { id: 'codex',   name: 'Codex',        orb: '1s', c: '#7ff3ff', info: 'Articles et réflexions',                 r: .53, w: 1.05, inc: 74, node: 15,  ph: 0 },
    { id: 'profil',  name: 'Portrait',     orb: '1s', c: '#ffd27a', info: 'Parcours, passions et aspirations',      r: .53, w: 1.05, inc: 74, node: 105, ph: 3.1 },
    { id: 'atelier', name: 'Atelier',      orb: '2s', c: '#ff7fbf', info: 'Créations, théories, hypothèses',        r: .96, w: .55,  inc: 64, node: 60,  ph: 1.2 },
    { id: 'lab',     name: 'Laboratoire',  orb: '2s', c: '#9dff8a', info: 'Applications et projets en construction', r: .96, w: .55,  inc: 64, node: 180, ph: 3.4 },
    { id: 'dashb',   name: 'Observatoire', orb: '2p', c: '#b79cff', info: 'Observations, cartes et explorations',   r: .96, w: .5,   inc: 64, node: 300, ph: 5.3 }
  ];
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function glowSprite(col, core) {
    var s = document.createElement('canvas'), z = 128; s.width = s.height = z; var x = s.getContext('2d'), c = rgb(col);
    var gr = x.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
    gr.addColorStop(0, core ? 'rgba(255,255,255,1)' : 'rgba(' + c + ',.9)');
    gr.addColorStop(core ? .06 : .15, 'rgba(' + c + ',.95)');
    gr.addColorStop(.18, 'rgba(' + c + ',.55)');
    gr.addColorStop(.42, 'rgba(' + c + ',.16)');
    gr.addColorStop(1, 'rgba(' + c + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, z, z); return s;
  }
  function ballSprite(a, b) {   // nucléon : sphère ombrée, reflet en haut à gauche
    var s = document.createElement('canvas'), z = 64; s.width = s.height = z; var x = s.getContext('2d');
    var gr = x.createRadialGradient(z * .36, z * .32, z * .04, z * .5, z * .5, z * .5);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.25, a); gr.addColorStop(.85, b); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(z / 2, z / 2, z / 2, 0, TAU); x.fill(); return s;
  }
  E.forEach(function (e, i) { e.rgb = rgb(e.c); e.spr = glowSprite(e.c, true); e.halo = glowSprite(e.c, false); e.ex = 0; e.armed = false; e.i = i; e.th = e.ph; e.U = [0, 0, 0]; e.V = [0, 0, 0]; });
  var PROTON = ballSprite('#ff7fae', '#8a1a52'), NEUTRON = ballSprite('#a9c8ff', '#2a3f8f');
  var NGLOW = glowSprite('#ff9a6b', true), NGLOW2 = glowSprite('#c06bff', false), SPARK = glowSprite('#ffffff', true);

  /* noyau : 11 nucléons serrés (1 au centre, 10 autour), 5 protons et 6 neutrons alternés */
  var NUC = [];
  (function () {
    NUC.push({ p: [0, 0, 0], k: 0 });
    for (var i = 0; i < 10; i++) {
      var y = 1 - (i + .5) / 10 * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
      NUC.push({ p: [Math.cos(a) * rr * .085, y * .085, Math.sin(a) * rr * .085], k: 0 });
    }
    var kinds = [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];   // 1 = proton
    NUC.forEach(function (n, i) { n.k = kinds[i]; n.f = 2.2 + Math.random() * 2.5; n.ph = Math.random() * TAU; n.o = [0, 0, 0]; });
  })();

  /* ---------- mise en page (suit la taille d'écran, glisse en douceur) ---------- */
  var W = 0, H = 0, DPR = 1, mob = false, bg = null;
  var L = { cx: 0, cy: 0, R: 100, dim: 1 }, T = { cx: 0, cy: 0, R: 100, dim: 1 };
  var dust = [], sparks = [];
  function target() {
    var reading = document.documentElement.classList.contains('reading');
    if (mob) {
      var hi = document.querySelector('#scene .hero-inner'), hb = hi ? hi.getBoundingClientRect().bottom : H * .35;
      var top = Math.min(Math.max(hb + 6, H * .24), H * .5), avail = H - top - 86;
      T.R = Math.max(90, Math.min(W * .4, avail * .46)); T.cx = W * .5; T.cy = top + avail * .5 + 10; T.dim = 1;
    } else {
      T.R = Math.min(W * .27, H * .35); T.cx = Math.max(W * .62, 470 + T.R * 1.15); if (T.cx + T.R * 1.05 + 150 > W) T.cx = W - T.R * 1.05 - 150; T.cy = H * .53; T.dim = 1;
      if (reading) { T.R *= .62; T.cx = W - T.R * 1.25; T.cy = H * .6; T.dim = .5; }
    }
  }
  function paintBg() {
    bg = document.createElement('canvas'); bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
    var x = bg.getContext('2d'); x.scale(DPR, DPR);
    var base = x.createRadialGradient(W * .62, H * .52, 0, W * .62, H * .52, Math.max(W, H) * .8);
    base.addColorStop(0, '#150d42'); base.addColorStop(.45, '#0a062b'); base.addColorStop(1, '#04021a');
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    [[.7, .35, .55, '120,40,190', .22], [.45, .75, .5, '20,140,200', .16], [.9, .8, .4, '220,60,140', .14], [.2, .2, .45, '70,60,220', .12]].forEach(function (b) {
      var gr = x.createRadialGradient(W * b[0], H * b[1], 0, W * b[0], H * b[1], Math.max(W, H) * b[2]);
      gr.addColorStop(0, 'rgba(' + b[3] + ',' + b[4] + ')'); gr.addColorStop(1, 'rgba(' + b[3] + ',0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    });
    var n = Math.round(W * H / 2600 * Q());
    for (var i = 0; i < n; i++) {
      var a = Math.random(); x.fillStyle = a < .1 ? 'rgba(255,180,220,' : a < .3 ? 'rgba(150,240,255,' : 'rgba(215,210,255,';
      x.fillStyle += (.15 + Math.random() * .55) + ')'; var s = Math.random() < .93 ? .9 : 1.7; x.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
  }
  function resize() {
    W = innerWidth; H = innerHeight; mob = W < 800; DPR = window.CodexPx ? CodexPx(1.75) : Math.min(devicePixelRatio || 1, 1.75);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    paintBg(); target(); if (!L.cx) { L.cx = T.cx; L.cy = T.cy; L.R = T.R; }
    var ns = Math.round((mob ? 28 : 55) * Q()); sparks = [];
    for (var i = 0; i < ns; i++) sparks.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, ph: Math.random() * TAU, s: 6 + Math.random() * 12, c: Math.random() < .5 ? 0 : Math.random() < .5 ? 2 : 4 });
    kick();
  }

  /* ---------- rotation 3D + projection ---------- */
  var yaw = .4, pitch = .42, dragYaw = 0, dragPitch = 0, vYaw = 0, mx = 0, my = 0, DC = 3.4;
  var cY = 1, sY = 0, cP = 1, sP = 0, OUT = [0, 0, 0, 0];
  function setRot(y, p) { cY = Math.cos(y); sY = Math.sin(y); cP = Math.cos(p); sP = Math.sin(p); }
  function proj(x, y, z) {   // -> OUT = [écranX, écranY, profondeur (z>0 = derrière), échelle]
    var x1 = x * cY + z * sY, z1 = -x * sY + z * cY, y2 = y * cP - z1 * sP, z2 = y * sP + z1 * cP, s = DC / (DC + z2);
    OUT[0] = L.cx + x1 * L.R * s; OUT[1] = L.cy + y2 * L.R * s; OUT[2] = z2; OUT[3] = s; return OUT;
  }
  function basis(e, t) {   // anneau dans le plan XZ, incliné autour de X puis tourné autour de Y (précession lente)
    var i = e.inc * D2R, n = e.node * D2R + t * .025 * (e.i % 2 ? -1 : 1), ci = Math.cos(i), si = Math.sin(i), cn = Math.cos(n), sn = Math.sin(n);
    e.U[0] = cn; e.U[1] = 0; e.U[2] = -sn;
    e.V[0] = ci * sn; e.V[1] = -si; e.V[2] = ci * cn;
  }
  function orbitPt(e, th, rad, j1, j2) {
    var c = Math.cos(th) * rad, s = Math.sin(th) * rad;
    return proj(e.U[0] * c + e.V[0] * s + (j1 || 0), e.U[1] * c + e.V[1] * s + (j2 || 0), e.U[2] * c + e.V[2] * s);
  }

  /* ---------- effets : photons, anneaux, paires virtuelles ---------- */
  var photons = [], rings = [], pairs = [];
  function excite(e, strong) {
    e.ex = strong ? 1 : .65; e.armed = true;
    if (strong) rings.push({ x: e.sx, y: e.sy, t: 0, c: e.rgb });
    e.el.classList.add('hot'); clearTimeout(e.hotT); e.hotT = setTimeout(function () { e.el.classList.remove('hot'); }, 1200);
  }
  function emit(e) {
    var a = Math.atan2(e.sy - L.cy, e.sx - L.cx) + (Math.random() - .5) * .8;
    photons.push({ x: e.sx, y: e.sy, a: a, d: 0, c: e.c, rgb: e.rgb });
    rings.push({ x: e.sx, y: e.sy, t: .35, c: e.rgb });
  }

  /* ---------- étiquettes cliquables ---------- */
  E.forEach(function (e) {
    var d = document.createElement('div'); d.className = 'at-e'; d.style.setProperty('--c', e.c);
    d.innerHTML = '<button type="button"></button><span class="at-l"></span><span class="at-t"></span>';
    var b = d.querySelector('button'); b.setAttribute('aria-label', e.name + ' — ' + e.info);
    // une lettre façon symbole chimique ; le nom complet apparaît au survol et pendant le saut quantique
    d.querySelector('.at-l').innerHTML = '<span class="cx-nm"><b class="cx-sci">' + e.name.charAt(0) + '</b><span class="cx-plain at-n">' + e.name + '</span></span>';
    d.querySelector('.at-t').innerHTML = '<b>' + e.name + '</b><small>électron ' + e.orb + '</small>' + e.info;
    b.addEventListener('click', function () { C.navigate(e.id); });
    nav.appendChild(d); e.el = d; e.back = null; e.flip = null;
  });

  /* ---------- dessin ---------- */
  var t = 0, last = 0, acc = 0, nextAmbient = 4, nOrb = 72;
  function strokeOrbit(e, back) {
    var r = e.r * (1 + (.35 * e.ex)), started = false;
    g.beginPath();
    for (var k = 0; k <= nOrb; k++) {
      var th = k / nOrb * TAU, p = orbitPt(e, th, r), in_ = back ? p[2] > 0 : p[2] <= 0;
      if (in_) { if (started) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); started = true; } } else started = false;
    }
    g.strokeStyle = 'rgba(' + e.rgb + ',' + ((back ? .13 : .34) * CFG.glow * L.dim) + ')';
    g.lineWidth = back ? 1 : 1.5; g.stroke();
  }
  function drawElectron(e, q) {
    var r = e.r * (1 + (.35 * e.ex)), s = e.ss, nuage = CFG.model === 'nuage', A = L.dim * (e.sz > 0 ? .7 : 1);
    // nuage quantique : positions probables, redessinées au hasard à chaque image
    if (nuage) {   // brume lisse qui suit l'électron (positions fixes : pas de scintillement)
      var np = Math.round(16 * q + 4);
      for (var h = 0; h < np; h++) {
        var off = (h / np - .62) * 3.6, w8 = Math.exp(-off * off * .35), pp = orbitPt(e, e.th + off, r * (1 + Math.sin(h * 7.3 + t * .7) * .07), Math.sin(h * 3.1 + t) * .05, Math.cos(h * 5.7 + t * .8) * .05);
        var pz = 70 * pp[3] * (mob ? .8 : 1); g.globalAlpha = .2 * w8 * A * CFG.glow; g.drawImage(e.halo, pp[0] - pz / 2, pp[1] - pz / 2, pz, pz);
      }
      g.globalAlpha = 1;
    }
    if (CFG.model !== 'bohr') {
      var m = Math.round((nuage ? 140 : 26) * q), sp = nuage ? 1.3 : .45;
      g.fillStyle = 'rgba(' + e.rgb + ',' + (nuage ? .55 : .4) * A + ')';
      for (var k = 0; k < m; k++) {
        var gs = (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
        var p = orbitPt(e, e.th - Math.abs(gs) * sp * (Math.random() < .5 ? 1 : -.4), r * (1 + (Math.random() - .5) * .16), (Math.random() - .5) * .07, (Math.random() - .5) * .07);
        var z = (nuage ? 2 : 1.4) * p[3]; g.fillRect(p[0] - z / 2, p[1] - z / 2, z, z);
      }
    }
    // traînée de comète
    if (!nuage && CFG.trail > 0) {
      var segs = q < .7 ? 14 : 24, len = 1.5 * CFG.trail, prev = orbitPt(e, e.th, r), px = prev[0], py = prev[1];
      for (var j = 1; j <= segs; j++) {
        var f = j / segs, p2 = orbitPt(e, e.th - f * len, r), a = Math.pow(1 - f, 1.6) * .7 * CFG.glow * A;
        g.strokeStyle = 'rgba(' + e.rgb + ',' + a + ')'; g.lineWidth = (3.4 * (1 - f) + .5) * p2[3];
        g.beginPath(); g.moveTo(px, py); g.lineTo(p2[0], p2[1]); g.stroke(); px = p2[0]; py = p2[1];
      }
    }
    // l'électron lui-même
    var gz = (nuage ? 44 : 64) * s * CFG.glow * (1 + e.ex * .9) * (mob ? .85 : 1), hz = gz * 2.4;
    g.globalAlpha = A * .38; g.drawImage(e.halo, e.sx - hz / 2, e.sy - hz / 2, hz, hz);
    g.globalAlpha = A * (nuage ? .75 : 1); g.drawImage(e.spr, e.sx - gz / 2, e.sy - gz / 2, gz, gz); g.globalAlpha = 1;
  }
  function drawNucleus(q) {
    var pulse = 1 + Math.sin(t * 2.1) * .06 + Math.sin(t * 5.3) * .025, gz = L.R * .95 * pulse * CFG.glow;
    var p = proj(0, 0, 0);
    g.globalAlpha = .32 * L.dim; g.drawImage(NGLOW2, p[0] - gz, p[1] - gz, gz * 2, gz * 2);
    g.globalAlpha = .75 * L.dim; g.drawImage(NGLOW, p[0] - gz * .45, p[1] - gz * .45, gz * .9, gz * .9); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    var list = NUC.map(function (n) {
      var j = reduce ? 0 : .007;
      n.o[0] = n.p[0] + Math.sin(t * n.f + n.ph) * j; n.o[1] = n.p[1] + Math.sin(t * n.f * 1.3 + n.ph * 2) * j; n.o[2] = n.p[2] + Math.cos(t * n.f + n.ph) * j;
      var pp = proj(n.o[0], n.o[1], n.o[2]); return { x: pp[0], y: pp[1], z: pp[2], s: pp[3], k: n.k };
    }).sort(function (a, b) { return b.z - a.z; });
    var bz = L.R * .105;
    g.globalAlpha = .55 + .45 * L.dim;
    list.forEach(function (n) { var z = bz * n.s; g.drawImage(n.k ? PROTON : NEUTRON, n.x - z / 2, n.y - z / 2, z, z); });
    g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .35 * L.dim; g.drawImage(SPARK, p[0] - gz * .18, p[1] - gz * .18, gz * .36, gz * .36); g.globalAlpha = 1;
  }
  function drawPhotons(dt) {
    for (var i = photons.length - 1; i >= 0; i--) {
      var p = photons[i]; p.d += dt * 520;
      var nx = Math.cos(p.a), ny = Math.sin(p.a), hx = p.x + nx * p.d, hy = p.y + ny * p.d, Lw = 90, fade = Math.max(0, 1 - p.d / Math.max(W, H));
      g.strokeStyle = 'rgba(' + p.rgb + ',' + (.9 * fade) + ')'; g.lineWidth = 1.6; g.beginPath();
      for (var k = 0; k <= 30; k++) {
        var s = k / 30 * Lw, env = Math.sin(k / 30 * Math.PI), off = Math.sin((p.d - s) * .16) * 6 * env, bx = hx - nx * s, by = hy - ny * s;
        if (k) g.lineTo(bx - ny * off, by + nx * off); else g.moveTo(bx, by);
      }
      g.stroke();
      g.globalAlpha = fade; g.drawImage(SPARK, hx - 9, hy - 9, 18, 18); g.globalAlpha = 1;
      if (p.d > Math.max(W, H) * 1.1) photons.splice(i, 1);
    }
    for (var r = rings.length - 1; r >= 0; r--) {
      var R = rings[r]; R.t += dt; var f = R.t / .9; if (f >= 1) { rings.splice(r, 1); continue; }
      g.strokeStyle = 'rgba(' + R.c + ',' + (.8 * (1 - f)) + ')'; g.lineWidth = 2 * (1 - f) + .4;
      g.beginPath(); g.arc(R.x, R.y, 6 + f * 64, 0, TAU); g.stroke();
    }
  }
  function drawPairs(dt, q) {
    if (!reduce && Math.random() < dt * 2.2 * q && pairs.length < 14) {
      var a = Math.random() * TAU, d = L.R * (1.15 + Math.random() * 1.1);
      pairs.push({ x: L.cx + Math.cos(a) * d, y: L.cy + Math.sin(a) * d * .8, a: Math.random() * TAU, t: 0, life: .9 + Math.random() * .6 });
    }
    for (var i = pairs.length - 1; i >= 0; i--) {
      var p = pairs[i]; p.t += dt; var f = p.t / p.life; if (f >= 1) { pairs.splice(i, 1); continue; }
      var sep = Math.sin(f * Math.PI) * 13, dx = Math.cos(p.a) * sep, dy = Math.sin(p.a) * sep, al = Math.sin(f * Math.PI) * .9 * L.dim;
      g.fillStyle = 'rgba(127,243,255,' + al + ')'; g.fillRect(p.x + dx - 1, p.y + dy - 1, 2.2, 2.2);
      g.fillStyle = 'rgba(255,127,191,' + al + ')'; g.fillRect(p.x - dx - 1, p.y - dy - 1, 2.2, 2.2);
      if (f > .88) { var z = 22 * (1 - (f - .88) / .12); g.globalAlpha = .7 * L.dim; g.drawImage(SPARK, p.x - z / 2, p.y - z / 2, z, z); g.globalAlpha = 1; }   // annihilation
    }
  }
  var SPK = E.map(function (e) { return e.spr; });
  function render(dt) {
    var q = Q(); nOrb = q < .7 ? 48 : 72;
    target(); var k = 1 - Math.exp(-dt * 4);
    L.cx += (T.cx - L.cx) * k; L.cy += (T.cy - L.cy) * k; L.R += (T.R - L.R) * k; L.dim += (T.dim - L.dim) * k;
    // rotation : lente d'elle-même + glisser (avec inertie) + légère parallaxe
    if (!drag) { dragYaw += vYaw * dt; vYaw *= Math.exp(-dt * 2.5); }
    setRot(yaw + t * .08 + dragYaw + mx * .25, pitch + dragPitch + my * .18);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.drawImage(bg, 0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    // poussière lumineuse qui dérive
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < -20) s.x = W + 20; else if (s.x > W + 20) s.x = -20; if (s.y < -20) s.y = H + 20; else if (s.y > H + 20) s.y = -20;
      g.globalAlpha = (.25 + .25 * Math.sin(t * 1.3 + s.ph)) * L.dim; g.drawImage(SPK[s.c], s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
    }
    g.globalAlpha = 1;
    // positions des électrons
    E.forEach(function (e) {
      basis(e, t); e.th += dt * e.w * CFG.speed * (1 - e.ex * .3); if (!reduce) e.th = e.th % (TAU * 100);
      e.ex *= Math.exp(-dt * 3); if (e.armed && e.ex < .32) { e.armed = false; emit(e); }
      var p = orbitPt(e, e.th, e.r * (1 + (.35 * e.ex))); e.sx = p[0]; e.sy = p[1]; e.sz = p[2]; e.ss = p[3];
    });
    // derrière -> noyau -> devant
    if (CFG.model !== 'nuage') E.forEach(function (e) { strokeOrbit(e, true); });
    E.forEach(function (e) { if (e.sz > 0) drawElectron(e, q); });
    drawNucleus(q);
    if (CFG.model !== 'nuage') E.forEach(function (e) { strokeOrbit(e, false); });
    E.forEach(function (e) { if (e.sz <= 0) drawElectron(e, q); });
    drawPairs(dt, q); drawPhotons(dt);
    // photon spontané de temps en temps
    if (!reduce) { nextAmbient -= dt; if (nextAmbient < 0) { excite(E[Math.floor(Math.random() * E.length)], false); nextAmbient = 6 + Math.random() * 8; } }
    // étiquettes
    E.forEach(function (e) {
      e.el.style.transform = 'translate3d(' + e.sx.toFixed(1) + 'px,' + e.sy.toFixed(1) + 'px,0)';
      var b = e.sz > 0; if (b !== e.back) { e.back = b; e.el.classList.toggle('behind', b); e.el.style.zIndex = b ? 1 : 2; }
      var fl = e.sx > W - 130; if (fl !== e.flip) { e.flip = fl; e.el.classList.toggle('flip', fl); }
    });
  }
  function frame(ms) {
    if (!reduce) RAF(frame);
    var dt = last ? Math.min(.05, Math.max(0, (ms - last) / 1000)) : .016; last = ms;
    if (document.hidden) return;
    // lecteur ouvert : la scène est derrière un panneau, on ne la redessine qu'à ~8 images/s
    if (document.documentElement.classList.contains('reading')) { acc += dt; if (acc < .12) return; dt = acc; acc = 0; } else acc = 0;
    t += dt * (reduce ? 0 : Math.max(.15, CFG.speed));
    render(Math.min(dt, .12));
  }
  var kickPending = false;
  function kick() { if (!reduce || kickPending || !W) return; kickPending = true; requestAnimationFrame(function () { kickPending = false; render(.016); }); }

  /* ---------- gestes : glisser pour tourner, souris pour la parallaxe ---------- */
  var drag = false, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; vYaw = 0; });
  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }
    if (!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    dragYaw += dx * .007; dragPitch = Math.max(-.9, Math.min(.9, dragPitch + dy * .005)); vYaw = dx * .4; kick();
  }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(function (n) { addEventListener(n, function () { drag = false; }); });

  /* ---------- liaison avec l'interface commune ---------- */
  C.on('navigate', function (ev) {
    if (ev.direct) return;
    if (!ev.id) { C.reader.close(); return; }
    var e = E.filter(function (x) { return x.id === ev.id; })[0];
    if (e && !reduce && !document.documentElement.classList.contains('reading')) { excite(e, true); setTimeout(function () { C.reader.open(ev.id); }, 520); }
    else C.reader.open(ev.id);
  });
  C.on('perf', resize);
  C.on('reader:open', kick); C.on('reader:close', kick);
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { last = 0; });

  /* ---------- carte de réglages ---------- */
  if (C.customize && C.customize.pop) {
    var pop = C.customize.pop();
    function range(id, label, min, max, step, key) {
      var d = document.createElement('div');
      d.innerHTML = '<label class="cx-l" for="' + id + '">' + label + '</label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + CFG[key] + '">';
      d.querySelector('input').addEventListener('input', function (ev) { CFG[key] = parseFloat(ev.target.value); save(); kick(); });
      pop.appendChild(d);
    }
    range('at-speed', 'Vitesse des électrons', 0, 3, .1, 'speed');
    range('at-glow', 'Éclat', .4, 1.6, .05, 'glow');
    range('at-trail', 'Traînées', 0, 2, .1, 'trail');
    var md = document.createElement('div');
    md.innerHTML = '<span class="cx-l">Modèle</span><div class="cx-sw" role="radiogroup" aria-label="Modèle de l’atome"></div>';
    var sw = md.querySelector('.cx-sw');
    [['bohr', 'Bohr (orbites)'], ['mixte', 'Mixte'], ['nuage', 'Nuage quantique']].forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = o[1]; b.dataset.v = o[0];
      b.setAttribute('aria-checked', String(CFG.model === o[0]));
      b.addEventListener('click', function () { CFG.model = o[0]; save(); sw.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.v === CFG.model)); }); kick(); });
      sw.appendChild(b);
    });
    pop.appendChild(md);
  }

  resize();
  if (reduce) render(.016); else RAF(frame);
})();
