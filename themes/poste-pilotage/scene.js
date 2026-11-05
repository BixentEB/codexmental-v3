/* ======================================================================
   Poste de pilotage — à bord de Caeles, le vaisseau de Vincent.
   Couches : l'espace (canvas 2D : étoiles en profondeur, Voie lactée, astre
   de la destination), le cockpit (image aux vitres découpées), puis les écrans
   de la console posés en perspective (matrix3d calculées sur les coins des
   cadres de l'image, repère 1280 × 640). Les menus restent dans la barre :
   les écrans servent à l'immersion (radar, état, navigation, journal, scanner).
   Choisir une rubrique = saut en hyperespace, arrivée devant son astre, puis lecteur.
   ====================================================================== */
(function () {
  'use strict';
  var C = window.Codex, RAF = window.CodexRaf || requestAnimationFrame, TAU = Math.PI * 2;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cp-space'), g = cv && cv.getContext('2d');
  if (!g) { window.CodexScene = { ok: false }; return; }
  function Q() { return C.perf ? C.perf.scale : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------- réglages ---------- */
  var cfg = { cruise: 1, jump: true };
  try { var sv = JSON.parse(localStorage.getItem('codex.cockpit') || '{}'); if (sv.cruise) cfg.cruise = clamp(+sv.cruise, .2, 3); if (sv.jump === false) cfg.jump = false; } catch (e) {}
  function save() { try { localStorage.setItem('codex.cockpit', JSON.stringify(cfg)); } catch (e) {} }

  /* ---------- destinations ---------- */
  var DEST = {
    codex:   { code: 'CDX-01', dist: '4,2 al', kind: 'gas',    c: ['#e8cfa6', '#b8875e', '#f0dcbc', '#9c6b45', '#d9b88e'], atmo: 'rgba(150,190,255,' },
    atelier: { code: 'ATL-02', dist: '0,8 al', kind: 'nebula', c: ['#ff9a5a', '#ff5f6d', '#ffd27a', '#b04aa0'], atmo: 'rgba(255,170,110,' },
    lab:     { code: 'LAB-03', dist: '12 al',  kind: 'ringed', c: ['#9ff0c8', '#3fae84', '#c9ffe6', '#2a6f62', '#7fdcb0'], atmo: 'rgba(130,255,200,' },
    dashb:   { code: 'OBS-04', dist: '∞',      kind: 'ocean',  c: ['#2e6fd0', '#173e8a', '#8fd0ff', '#f2f6ff', '#3fae84'], atmo: 'rgba(120,180,255,' },
    profil:  { code: 'PRT-05', dist: 'ici',    kind: 'ice',    c: ['#cdbbff', '#7b62d8', '#efe8ff', '#4a3a9a', '#a796f0'], atmo: 'rgba(190,170,255,' }
  };
  var ORDER = ['codex', 'atelier', 'lab', 'dashb', 'profil'];
  /* mondes visités (worlds.js) : on pioche sans remise, pour finir par tous les voir */
  var Wd = window.CaelesWorlds, WL = Wd ? Wd.list : [], gl = false, world = null, nextWorld = null;
  var bag = []; try { bag = JSON.parse(localStorage.getItem('codex.cockpit.bag') || '[]'); } catch (e) {}
  var forced = null;   // essais : Codex.cockpit.next('saturne') puis choisir une rubrique
  C.cockpit = { next: function (id) { forced = WL.filter(function (w) { return w.id === id; })[0] || null; return forced ? 'Prochain saut : ' + forced.name : 'Mondes : ' + WL.map(function (w) { return w.id; }).join(', '); }, get worlds() { return WL.map(function (w) { return w.id; }); } };
  function pickWorld() {
    if (forced) { var f = forced; forced = null; return f; }
    if (!WL.length) return null;
    bag = bag.filter(function (id) { return WL.some(function (w) { return w.id === id; }); });
    if (!bag.length) {
      bag = WL.map(function (w) { return w.id; });
      for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      if (world && bag[0] === world.id) bag.push(bag.shift());
    }
    var id = bag.shift(); try { localStorage.setItem('codex.cockpit.bag', JSON.stringify(bag)); } catch (e) {}
    return WL.filter(function (w) { return w.id === id; })[0];
  }
  function ext(id) { return C.external && C.external[id]; }
  function host(u) { return String(u).replace(/^https?:\/\//, '').replace(/\/$/, ''); }
  function sec(id) { return C.catalog && C.catalog.sections.filter(function (s) { return s.id === id; })[0]; }
  function label(id) { var s = sec(id); return s ? s.label : id; }
  function countArticles(id) {
    var s = sec(id), n = 0; if (!s) return 0;
    (function walk(list) { (list || []).forEach(function (x) { if (x.article) n++; if (x.children) walk(x.children); }); })(s.tree);
    return n;
  }

  /* ---------- cadre : l'image en « cover », les écrans suivent ---------- */
  var W = 0, H = 0, DPR = 1, mobile = false, F = { x: 0, y: 0, k: 1 };
  var frame = $('cp-frame');
  function layout() {
    W = innerWidth; H = innerHeight;
    DPR = window.CodexPx ? CodexPx(1.5) : Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    mobile = matchMedia('(max-aspect-ratio: 4/5)').matches;
    var iw = mobile ? 998 : 3548, ih = 1774, k = Math.max(W / iw, H / ih), fw = iw * k, fh = ih * k;
    var ox = (W - fw) / 2, oy = (H - fh) / 2;
    // repère des écrans : 1280 × 640 pour l'image entière ; l'image mobile en est la tranche x ∈ [460, 820]
    var s = fw / (mobile ? 360 : 1280);
    F = { x: ox - (mobile ? 460 * s : 0), y: oy, k: s };
    frame.style.transform = 'translate(' + F.x.toFixed(1) + 'px,' + F.y.toFixed(1) + 'px) scale(' + F.k.toFixed(4) + ')';
    buildStars(); bakeSky();
    if (gl) Wd.resize(W, H, DPR);
  }
  function toScreen(x, y) { return { x: F.x + x * F.k, y: F.y + y * F.k }; }
  var VP = { x: 646, y: 232 };   // centre de la vitre centrale (repère 1280 × 640)
  var BODY = { x: 704, y: 246, r: 116 };

  /* ---------- étoiles en profondeur + Voie lactée ---------- */
  var stars = [], sky = document.createElement('canvas'), sg = sky.getContext('2d');
  function buildStars() {
    var n = Math.round((mobile ? 260 : 620) * Q());
    stars = [];
    for (var i = 0; i < n; i++) stars.push(newStar(true));
  }
  function newStar(any) {
    return { x: rnd(-1, 1), y: rnd(-1, 1), z: any ? rnd(.05, 1) : 1, b: rnd(.35, 1), t: Math.random() < .12 ? 1 : 0 };
  }
  function bakeSky() {   // Voie lactée et nébuleuses, cuites une fois par taille d'écran
    sky.width = Math.round(W * DPR * .5); sky.height = Math.round(H * DPR * .5);
    var w = sky.width, h = sky.height; sg.clearRect(0, 0, w, h);
    sg.save(); sg.translate(w / 2, h * .42); sg.rotate(-.28);
    for (var i = 0; i < 70; i++) {
      var x = rnd(-w * .8, w * .8), y = rnd(-h * .08, h * .08) * (1 + Math.abs(x) / w), r = rnd(w * .04, w * .14);
      var gr = sg.createRadialGradient(x, y, 0, x, y, r), hue = Math.random();
      gr.addColorStop(0, hue < .5 ? 'rgba(190,200,255,.06)' : hue < .8 ? 'rgba(160,110,220,.06)' : 'rgba(255,170,120,.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      sg.fillStyle = gr; sg.beginPath(); sg.arc(x, y, r, 0, TAU); sg.fill();
    }
    for (var j = 0; j < 900; j++) { var a = rnd(-w * .8, w * .8), b2 = rnd(-1, 1) * rnd(0, h * .1); sg.fillStyle = 'rgba(255,255,255,' + rnd(.05, .35).toFixed(2) + ')'; sg.fillRect(a, b2, 1, 1); }
    sg.restore();
  }

  /* ---------- astres des destinations (texture cuite, éclairée au rendu) ---------- */
  var tex = {};
  function bake(id) {
    if (tex[id]) return tex[id];
    var D = DEST[id], S = 512, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d');
    var seed = id.length * 7.3;
    var P2 = TAU;   // u est périodique (texture raccordable pour la rotation)
    function noise(u, v) { return Math.sin(P2 * u + Math.sin(v * 6 + seed) * 1.4) * Math.cos(v * 5 + Math.sin(P2 * u * 2 + seed)) * .5 + Math.sin(P2 * u * 3 + v * 9 + seed * 2) * .25 + Math.sin(P2 * u * 7 - v * 17) * .12; }
    if (D.kind === 'nebula') {
      for (var i = 0; i < 90; i++) {
        var px = S / 2 + rnd(-1, 1) * S * .32, py = S / 2 + rnd(-1, 1) * S * .26, r = rnd(S * .05, S * .2), col = D.c[i % D.c.length];
        var gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, col + '33'); gr.addColorStop(1, col + '00');
        x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
      }
      var core = x.createRadialGradient(S * .52, S * .48, 0, S * .52, S * .48, S * .06); core.addColorStop(0, '#fffbe8'); core.addColorStop(.4, 'rgba(255,220,150,.7)'); core.addColorStop(1, 'rgba(255,160,90,0)');
      x.fillStyle = core; x.beginPath(); x.arc(S * .52, S * .48, S * .06, 0, TAU); x.fill();
    } else {
      var img = x.createImageData(S, S), d = img.data;
      var cols = D.c.map(function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; });
      for (var yy = 0; yy < S; yy++) for (var xx = 0; xx < S; xx++) {
        var u = xx / S, v = yy / S, k, t;
        if (D.kind === 'ocean') { t = noise(u, v * 1.6) + noise(u * 2, v * 3.2) * .45; k = (v < .07 || v > .93) ? 3 : t > .42 ? 4 : t > .34 ? 0 : 1; }
        else if (D.kind === 'ice') { t = Math.sin(v * 15 + noise(u, v) * .8) * .5 + .5; k = Math.min(3, Math.floor(t * 4)); }
        else { t = Math.sin(v * 30 + noise(u, v * 2) * .9 + Math.sin(v * 71) * .35) * .5 + .5; k = Math.min(3, Math.floor(t * 4)); }
        var smooth = D.kind !== 'ocean', cA = cols[k % cols.length], cB = cols[(k + 1) % cols.length], f = smooth ? (function (q) { return q * q * (3 - 2 * q); })(Math.min(1, Math.max(0, t * 4 - k))) : .15, o = (yy * S + xx) * 4;
        d[o] = cA[0] + (cB[0] - cA[0]) * f; d[o + 1] = cA[1] + (cB[1] - cA[1]) * f; d[o + 2] = cA[2] + (cB[2] - cA[2]) * f; d[o + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      if (D.kind === 'ocean') {   // nuages
        for (var n2 = 0; n2 < 60; n2++) { var qx = rnd(0, S), qy = rnd(0, S), qr = rnd(8, 40); x.fillStyle = 'rgba(255,255,255,' + rnd(.12, .35).toFixed(2) + ')'; x.beginPath(); x.ellipse(qx, qy, qr * 2.2, qr * .6, rnd(-.3, .3), 0, TAU); x.fill(); }
      }
      if (D.kind === 'gas') { var sp = x.createRadialGradient(S * .34, S * .58, 0, S * .34, S * .58, S * .07); sp.addColorStop(0, 'rgba(176,88,58,.9)'); sp.addColorStop(1, 'rgba(176,88,58,0)'); x.fillStyle = sp; x.beginPath(); x.ellipse(S * .34, S * .58, S * .09, S * .05, -.2, 0, TAU); x.fill(); }
    }
    return (tex[id] = c);
  }
  function drawBody(id, cx, cy, r, alpha, spin) {
    var D = DEST[id], T = bake(id);
    g.save(); g.globalAlpha = alpha;
    if (D.kind === 'nebula') {
      g.globalCompositeOperation = 'lighter';
      g.drawImage(T, cx - r * 2.2, cy - r * 1.6, r * 4.4, r * 3.2);
      g.restore(); return;
    }
    var halo = g.createRadialGradient(cx, cy, r * .9, cx, cy, r * 1.35); halo.addColorStop(0, D.atmo + '.35)'); halo.addColorStop(1, D.atmo + '0)');
    g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, r * 1.35, 0, TAU); g.fill();
    if (D.kind === 'ringed') ring(cx, cy, r, D, true);
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    var off = (spin % 1) * r * 2;
    g.drawImage(T, cx - r - off, cy - r, r * 2, r * 2); g.drawImage(T, cx + r - off, cy - r, r * 2, r * 2);
    // éclairage : l'étoile est en haut à gauche ; bord assombri, terminateur net, côté nuit presque noir
    var limb = g.createRadialGradient(cx, cy, r * .55, cx, cy, r); limb.addColorStop(0, 'rgba(0,0,0,0)'); limb.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = limb; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    var term = g.createLinearGradient(cx - r * .75, cy - r * .62, cx + r * .75, cy + r * .62);
    term.addColorStop(0, 'rgba(0,0,0,0)'); term.addColorStop(.42, 'rgba(0,0,0,0)'); term.addColorStop(.62, 'rgba(0,0,0,.55)'); term.addColorStop(.78, 'rgba(0,0,0,.9)'); term.addColorStop(1, 'rgba(0,0,0,.97)');
    g.fillStyle = term; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    var hl = g.createRadialGradient(cx - r * .48, cy - r * .42, 0, cx - r * .48, cy - r * .42, r * .7); hl.addColorStop(0, 'rgba(255,250,235,.22)'); hl.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = hl; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    g.strokeStyle = D.atmo + '.55)'; g.lineWidth = Math.max(1, r * .018); g.beginPath(); g.arc(cx, cy, r, Math.PI * .9, Math.PI * 1.65); g.stroke();
    if (D.kind === 'ringed') ring(cx, cy, r, D, false);
    g.restore();
  }
  /* repli sans WebGL (ou qualité minimale) : la carte réelle à plat dans un disque, éclairée de côté */
  var imgCache = {};
  function drawWorld2D(w, cx, cy, r, alpha) {
    g.save(); g.globalAlpha = alpha;
    if (w.atmo) { var a = w.atmo.map(function (v) { return Math.round(v * 255); }).join(','), h = g.createRadialGradient(cx, cy, r * .92, cx, cy, r * 1.25); h.addColorStop(0, 'rgba(' + a + ',.3)'); h.addColorStop(1, 'rgba(' + a + ',0)'); g.fillStyle = h; g.beginPath(); g.arc(cx, cy, r * 1.25, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    var im = w.tex && (imgCache[w.tex] || (imgCache[w.tex] = (function () { var i = new Image(); i.src = 'img/astres/' + w.tex; return i; })()));
    if (im && im.complete && im.naturalWidth) g.drawImage(im, im.naturalWidth * .25, 0, im.naturalWidth * .5, im.naturalHeight, cx - r, cy - r, r * 2, r * 2);
    else { var gr = g.createLinearGradient(0, cy - r, 0, cy + r); w.c.forEach(function (c, i) { gr.addColorStop(i / 3, c); }); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
    var t = g.createLinearGradient(cx - r * .9, cy - r * .45, cx + r * .9, cy + r * .45);
    t.addColorStop(0, 'rgba(0,0,0,0)'); t.addColorStop(.5, 'rgba(0,0,0,.05)'); t.addColorStop(.68, 'rgba(0,0,0,.7)'); t.addColorStop(.82, 'rgba(0,0,0,.95)'); t.addColorStop(1, 'rgba(0,0,0,.98)');
    g.fillStyle = t; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
  function ring(cx, cy, r, D, back) {
    g.save(); g.translate(cx, cy); g.rotate(-.32); g.scale(1, .26);
    g.beginPath(); if (back) g.rect(-r * 2.4, -r * 2.4, r * 4.8, r * 2.4); else g.rect(-r * 2.4, 0, r * 4.8, r * 2.4); g.clip();
    for (var i = 0; i < 4; i++) { g.strokeStyle = 'rgba(200,255,230,' + (.18 + i * .07) + ')'; g.lineWidth = r * (.08 - i * .012); g.beginPath(); g.arc(0, 0, r * (1.45 + i * .16), 0, TAU); g.stroke(); }
    g.restore();
  }

  /* ---------- état du vol ---------- */
  var fuelFrom = 41, fuelTo = 41, lastCount = -1;
  var cur = null, target = null, jumpT = -1, JUMP = reduce ? 0 : 2.8, arriveT = 1, pendingOpen = null, spin = 0, last = 0, fuel = 41, shake = 0;
  function jumpTo(id) {
    id = id && DEST[id] ? id : null;
    if (id === cur && jumpT < 0) { if (id) openSoon(id, 200); return; }
    target = id; pendingOpen = id;
    nextWorld = id && !ext(id) ? pickWorld() : null;
    if (!cfg.jump || reduce) { arrive(); return; }
    jumpT = 0; document.body.classList.add('cp-away'); if (gl) Wd.hide();
    lockHide(); nav('SAUT EN COURS', id ? (nextWorld ? nextWorld.name : host(ext(id))) : 'Vue d’ensemble', id ? DEST[id].code + ' · ' + label(id) : 'retour en orbite libre');
    log(id ? (ext(id) ? 'Cap sur ' + host(ext(id)) : 'Saut vers ' + nextWorld.name + ' · ' + label(id)) : 'Retour en orbite libre');
    fuelFrom = fuel; fuelTo = Math.max(6, fuel - rnd(3, 6)); lastCount = -1;
  }
  function arrive() {
    cur = target; jumpT = -1; arriveT = 0; world = cur ? nextWorld : null;
    if (!cur) document.body.classList.remove('cp-away');
    if (gl) { if (world) Wd.show(world); else Wd.hide(); }
    shipAt(0); gauges();
    C.emit('nav:active', cur);
    if (cur) {
      if (world) nav('CIBLE VERROUILLÉE', world.name, DEST[cur].code + ' · ' + label(cur) + ' · ' + countArticles(cur) + ' articles');
      else nav('SORTIE', host(ext(cur)), DEST[cur].code + ' · ' + label(cur) + ' · même onglet');
      scan(cur); log(world ? 'Arrivée : ' + world.name : 'Ouverture du sas : ' + host(ext(cur)));
      if (world) setTimeout(function () { if (world) log(world.fact); }, 1400);
      if (pendingOpen === cur) openSoon(cur, reduce ? 0 : 900);
    } else {
      nav('EN ORBITE', 'Vue d’ensemble', 'molette : choisir une destination'); scan(null);
    }
    pendingOpen = null; placeLock();
  }
  var openTimer = null;
  function openSoon(id, ms) { clearTimeout(openTimer); openTimer = setTimeout(function () { if (cur === id) C.reader.open(id); }, ms); }

  /* ---------- écrans ---------- */
  var routeP = $('cp-route'), shipDot = document.querySelector('#cp-s-nav .cp-ship'), routeLen = 0;
  try { routeLen = routeP.getTotalLength(); } catch (e) {}
  function shipAt(q) { if (!routeLen || !shipDot) return; var pt = routeP.getPointAtLength(routeLen * q); shipDot.setAttribute('cx', pt.x.toFixed(1)); shipDot.setAttribute('cy', pt.y.toFixed(1)); }
  function nav(a, b, c) { $('cp-n1').textContent = a; $('cp-n2').textContent = b; $('cp-n3').textContent = c; }
  var logEl = $('cp-log');
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function log(t, warm) {
    var li = document.createElement('li'); if (warm) li.className = 'warm';
    var b = document.createElement('b'); b.textContent = hhmm(); li.append(b, document.createTextNode(t));
    logEl.insertBefore(li, logEl.firstChild); while (logEl.children.length > 3) logEl.removeChild(logEl.lastChild);
  }
  var gv = { g1: 98, g2: 74, g4: -153 };
  function gauges() {
    gv.g1 = clamp(gv.g1 + rnd(-1.2, 1), 90, 100); gv.g2 = clamp(gv.g2 + rnd(-4, 4), 55, 92); gv.g4 = Math.round(clamp(gv.g4 + rnd(-2, 2), -170, -140));
    $('cp-g1').style.width = gv.g1 + '%'; $('cp-v1').textContent = Math.round(gv.g1) + ' %';
    $('cp-g2').style.width = gv.g2 + '%'; $('cp-v2').textContent = Math.round(gv.g2) + ' %';
    $('cp-g3').style.width = fuel + '%'; $('cp-v3').textContent = Math.round(fuel) + ' %';
    $('cp-g4').style.width = (100 + gv.g4 + 100) / 1.2 + '%'; $('cp-v4').textContent = '−' + Math.abs(gv.g4) + '°';
  }
  var scg = $('cp-scan').getContext('2d');
  var scanImg = null;
  function scan(id) {
    var w = id && world;
    $('cp-sc0').textContent = id ? 'SCANNER · ' + DEST[id].code : 'SCANNER · CIBLE';
    $('cp-sc1').textContent = w ? w.name : id ? label(id) : 'Aucune cible';
    $('cp-sc2').textContent = w ? w.type + ' · ' + w.where : id ? host(ext(id) || '') : 'choisir une destination';
    $('cp-sc3').textContent = w ? (w.artist ? 'Vue d’artiste d’après les données' : 'Carte : ' + w.credit) : '';
    scanImg = null;
    if (w && w.tex) { scanImg = new Image(); scanImg.src = 'img/astres/' + w.tex; }
  }
  function drawScan(t) {
    scg.clearRect(0, 0, 74, 74);
    scg.strokeStyle = 'rgba(127,200,255,.6)'; scg.lineWidth = 1.5; scg.beginPath(); scg.arc(37, 37, 35, 0, TAU); scg.stroke();
    if (world) {
      scg.save(); scg.beginPath(); scg.arc(37, 37, 33, 0, TAU); scg.clip(); scg.globalAlpha = .7;
      if (scanImg && scanImg.complete && scanImg.naturalWidth) { var o = (t * 3) % 66; scg.drawImage(scanImg, -o, 4, 132, 66); scg.drawImage(scanImg, 132 - o, 4, 132, 66); }
      else { var gr = scg.createLinearGradient(0, 4, 0, 70); world.c.forEach(function (c, i) { gr.addColorStop(i / 3, c); }); scg.fillStyle = gr; scg.fillRect(4, 4, 66, 66); }
      scg.restore(); scg.globalAlpha = 1;
    } else if (cur && DEST[cur].kind !== 'nebula' && !ext(cur) && false) { scg.save(); scg.beginPath(); scg.arc(37, 37, 33, 0, TAU); scg.clip(); scg.globalAlpha = .55; scg.drawImage(bake(cur), -((t * 4) % 66), 4, 66, 66); scg.drawImage(bake(cur), 66 - ((t * 4) % 66), 4, 66, 66); scg.restore(); }
    else if (cur) { scg.globalAlpha = .7; scg.drawImage(bake(cur), 2, 2, 70, 70); scg.globalAlpha = 1; }
    var y = 37 + Math.sin(t * 1.3) * 30; scg.fillStyle = '#f4c77a'; scg.shadowColor = '#f4c77a'; scg.shadowBlur = 8; scg.fillRect(4, y, 66, 2); scg.shadowBlur = 0;
  }
  var rg = $('cp-radar').getContext('2d'), contact = null;
  function drawRadar(t) {
    rg.clearRect(0, 0, 92, 92); rg.strokeStyle = 'rgba(127,200,255,.55)'; rg.lineWidth = 1.5;
    [44, 29, 14].forEach(function (r, i) { rg.globalAlpha = i ? .6 : 1; rg.beginPath(); rg.arc(46, 46, r, 0, TAU); rg.stroke(); }); rg.globalAlpha = 1;
    var a = t * 1.6 % TAU; rg.fillStyle = 'rgba(127,200,255,.28)'; rg.beginPath(); rg.moveTo(46, 46); rg.arc(46, 46, 44, a - .7, a); rg.closePath(); rg.fill();
    rg.fillStyle = '#d9ecff'; rg.beginPath(); rg.arc(46, 46, 2.5, 0, TAU); rg.fill();
    if (contact) { var ca = contact.a + t * .25; rg.fillStyle = '#f4c77a'; rg.shadowColor = '#f4c77a'; rg.shadowBlur = 8; rg.beginPath(); rg.arc(46 + Math.cos(ca) * contact.d, 46 + Math.sin(ca) * contact.d, 4, 0, TAU); rg.fill(); rg.shadowBlur = 0; }
  }
  function radarText(a, b, c) { $('cp-r1').textContent = a; $('cp-r2').textContent = b; $('cp-r3').textContent = c; }

  /* ---------- viseur et astre cliquable ---------- */
  var lock = $('cp-lock'), bodyBtn = $('cp-body');
  function placeLock() {
    if (!cur) { lockHide(); return; }
    var r = BODY.r, x = BODY.x - r * .9, y = Math.max(128, BODY.y - r * .9), s = r * 1.8;
    lock.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + s + 'px;height:' + Math.min(s, 300 - y) + 'px';
    if (!world) { lockHide(); return; }
    $('cp-lock-t').textContent = DEST[cur].code + ' · ' + label(cur).toUpperCase();
    $('cp-lock-b').textContent = world.name.toUpperCase() + ' · ' + (world.artist ? 'VUE D’ARTISTE' : 'VERROUILLÉ');
    lock.hidden = false; bodyBtn.hidden = false;
    bodyBtn.style.cssText = 'left:' + (BODY.x - r) + 'px;top:' + Math.max(120, BODY.y - r) + 'px;width:' + r * 2 + 'px;height:' + (330 - Math.max(120, BODY.y - r)) + 'px';
    bodyBtn.setAttribute('aria-label', 'Entrer dans la rubrique ' + label(cur));
  }
  function lockHide() { lock.hidden = true; bodyBtn.hidden = true; }
  bodyBtn.addEventListener('click', function () { if (cur) C.reader.open(cur); });

  /* ---------- molette : roulette des destinations ---------- */
  var knob = $('cp-knob'), wheel = $('cp-wheel');
  ORDER.forEach(function (id, i) {
    var b = document.createElement('button'); b.type = 'button'; b.dataset.id = id;
    b.innerHTML = '<small>' + DEST[id].code + '</small><span></span>';
    b.addEventListener('click', function () { wheelOpen(false); C.navigate(id); });
    wheel.appendChild(b);
  });
  function wheelOpen(o) {
    knob.setAttribute('aria-expanded', String(o));
    if (o) {
      // ordinateur : un arc au-dessus de la molette ; téléphone (image recadrée, 360 de large) : deux rangées
      var MOB = [[-100, -178], [0, -186], [100, -178], [-52, -112], [52, -112]];
      Array.prototype.forEach.call(wheel.querySelectorAll('button'), function (b, i) {
        var a = Math.PI * (1.08 + i * .21), x = mobile ? MOB[i][0] : Math.cos(a) * 202, y = mobile ? MOB[i][1] : Math.sin(a) * 108 - 18;
        b.style.left = x.toFixed(0) + 'px'; b.style.top = y.toFixed(0) + 'px';
      });
      Array.prototype.forEach.call(wheel.querySelectorAll('button'), function (b) { b.querySelector('span').textContent = label(b.dataset.id); b.setAttribute('aria-current', String(b.dataset.id === cur)); });
      wheel.hidden = false; requestAnimationFrame(function () { wheel.classList.add('open'); var f = wheel.querySelector('[aria-current="true"]') || wheel.querySelector('button'); f.focus({ preventScroll: true }); });
    } else { wheel.classList.remove('open'); setTimeout(function () { if (knob.getAttribute('aria-expanded') !== 'true') wheel.hidden = true; }, 300); }
  }
  knob.addEventListener('click', function (e) { e.stopPropagation(); wheelOpen(knob.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('pointerdown', function (e) { if (knob.getAttribute('aria-expanded') === 'true' && !wheel.contains(e.target) && e.target !== knob) wheelOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (knob.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { wheelOpen(false); knob.focus(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var bs = Array.prototype.slice.call(wheel.querySelectorAll('button')), i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length].focus(); e.preventDefault(); }
  });

  /* ---------- visiteurs inattendus : derrière les vitres, repérés par le radar ---------- */
  C.visitorsHost = $('cp-visitors');
  var blip = $('cp-dome-blip'), contactN = 0;
  C.on('visitor', function (v) {
    if (v.phase === 'start') {
      contactN++; contact = { a: rnd(0, TAU), d: rnd(18, 38) }; blip.classList.add('on'); blip.style.left = rnd(25, 75) + '%'; blip.style.top = rnd(25, 65) + '%';
      radarText('? CONTACT', v.type === 'caeles' ? 'Signature connue' : 'Non identifié', rnd(.01, .09).toFixed(2).replace('.', ',') + ' ua');
      log(v.type === 'caeles' ? 'Écho familier sur le radar…' : 'Contact non identifié', true);
    } else if (v.phase === 'caught') {
      log(v.type === 'caeles' ? 'Caeles ? Mais… c’est nous !' : 'Contact identifié (' + v.count + ')', true);
    } else if (v.phase === 'end') {
      contact = null; blip.classList.remove('on'); radarText('AUCUN CONTACT', 'Secteur dégagé', 'balayage continu');
    }
  });

  /* ---------- lecteur : la scène reste devant l'astre ---------- */
  C.sceneRoot = 'Caeles'; C.sceneKeepsOnClose = true;
  C.on('navigate', function (e) { if (e.direct) { if (!e.id) jumpTo(null); return; } jumpTo(e.id); });

  /* ---------- rendu ---------- */
  function frameDraw(now) {
    RAF(frameDraw);
    var dt = Math.min(.12, (now - (last || now)) / 1000); last = now;
    var reading = document.documentElement.classList.contains('reading');
    if (document.hidden) return;
    var vp = toScreen(VP.x, VP.y), cx = vp.x * DPR, cy = vp.y * DPR, sc = Math.max(W, H) * DPR * .55;
    var speed = (reduce ? .02 : .06) * cfg.cruise, streak = 0;
    if (jumpT >= 0) {
      jumpT += dt / JUMP; var p = Math.min(1, jumpT);
      // trois temps : mise en route lente, croisière, freinage ; les instruments suivent le voyage
      var sm = function (q) { q = clamp(q, 0, 1); return q * q * (3 - 2 * q); };
      var k = p < .32 ? sm(p / .32) * sm(p / .32) : p < .7 ? 1 : 1 - sm((p - .7) / .3);
      speed += k * 3.4; streak = k;
      fuel = fuelFrom + (fuelTo - fuelFrom) * sm(p); shipAt(sm(p));
      var left = Math.ceil((1 - p) * JUMP);
      if (left !== lastCount) { lastCount = left; $('cp-n3').textContent = (p < .7 ? 'ARRIVÉE DANS 00:0' + left : 'DÉCÉLÉRATION · 00:0' + left); $('cp-g3').style.width = fuel + '%'; $('cp-v3').textContent = Math.round(fuel) + ' %'; $('cp-g2').style.width = (70 + k * 29) + '%'; $('cp-v2').textContent = Math.round(70 + k * 29) + ' %'; }
      if (jumpT >= 1) arrive();
    }
    if (arriveT < 1) arriveT = Math.min(1, arriveT + dt / 1.2);
    spin += dt * .004 * cfg.cruise;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = streak > .02 ? 'rgba(1,2,8,' + (.55 - streak * .35).toFixed(2) + ')' : '#010207';
    g.fillRect(0, 0, cv.width, cv.height);
    if (streak < .6) { g.globalAlpha = 1 - streak * 1.6; g.drawImage(sky, 0, 0, cv.width, cv.height); g.globalAlpha = 1; }
    // étoiles : projection depuis le point de fuite ; en hyperespace, elles s'étirent en traits
    g.lineCap = 'round';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], z0 = s.z; s.z -= speed * dt * (.35 + s.b * .3);
      if (s.z <= .02) { stars[i] = s = newStar(false); continue; }
      var x = cx + s.x / s.z * sc, y = cy + s.y / s.z * sc;
      if (x < -50 || y < -50 || x > cv.width + 50 || y > cv.height + 50) { stars[i] = newStar(false); continue; }
      var a = clamp((1 - s.z) * 1.4, 0, 1) * s.b;
      if (streak > .05) {
        var px = cx + s.x / Math.min(1, z0 + streak * .25) * sc, py = cy + s.y / Math.min(1, z0 + streak * .25) * sc;
        g.strokeStyle = 'rgba(' + (190 + 60 * s.b | 0) + ',' + (215 + 40 * s.b | 0) + ',255,' + a.toFixed(2) + ')';
        g.lineWidth = DPR * (.6 + s.b * 1.4 * (1 - s.z)); g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
      } else {
        var r = DPR * (.35 + (1 - s.z) * 1.3 * s.b);
        g.fillStyle = s.t ? 'rgba(255,226,190,' + a.toFixed(2) + ')' : 'rgba(225,235,255,' + a.toFixed(2) + ')';
        g.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }
    if (streak > .05) {   // lueur bleue au cœur du saut
      var fl = g.createRadialGradient(cx, cy, 0, cx, cy, sc * .9); fl.addColorStop(0, 'rgba(150,200,255,' + (streak * .35).toFixed(2) + ')'); fl.addColorStop(1, 'rgba(60,90,200,0)');
      g.fillStyle = fl; g.fillRect(0, 0, cv.width, cv.height);
    }
    // astre de la destination : il grandit en arrivant, dérive doucement ensuite
    if (cur && jumpT < 0) {
      var e2 = ease(arriveT), bp = toScreen(BODY.x + Math.sin(now / 9000) * 4, BODY.y + Math.cos(now / 11000) * 3);
      if (gl && world) { Wd.place(bp.x, bp.y, BODY.r * F.k * (.55 + .45 * e2), e2); Wd.render(dt); }
      else if (world) drawWorld2D(world, bp.x * DPR, bp.y * DPR, BODY.r * F.k * DPR * (.55 + .45 * e2), e2);
    }
    // écrans : radar et scanner (cadence réduite)
    if (!reading || W > 1100) { if (((now / 66) | 0) % 2 === 0) { drawRadar(now / 1000); drawScan(now / 1000); } }
  }

  /* ---------- réglages (carte commune) ---------- */
  if (C.customize) {
    var pop = C.customize.pop();
    var box = document.createElement('div');
    box.innerHTML = '<div><span class="cx-l">Vitesse de croisière</span><input id="cp-cruise" type="range" min="0.2" max="3" step="0.1"></div>' +
      '<div class="cx-row"><label for="cp-jump">Saut en hyperespace à chaque rubrique</label><input id="cp-jump" type="checkbox"></div>' +
      '<div class="cx-row"><label for="cp-fuel">Faire le plein d’antimatière</label><button type="button" id="cp-fuel" class="cp-fuel">Remplir</button></div>';
    pop.appendChild(box);
    var cr = box.querySelector('#cp-cruise'), jp = box.querySelector('#cp-jump');
    cr.value = cfg.cruise; jp.checked = cfg.jump;
    cr.addEventListener('input', function () { cfg.cruise = +cr.value; save(); });
    jp.addEventListener('change', function () { cfg.jump = jp.checked; save(); });
    box.querySelector('#cp-fuel').addEventListener('click', function () { fuel = 100; gauges(); log('Plein d’antimatière effectué'); });
  }

  /* ---------- démarrage ---------- */
  addEventListener('resize', function () { layout(); placeLock(); });
  C.on('perf', function () { layout(); });
  var glc = $('cp-gl');
  if (Wd && glc && !(C.perf && C.perf.tier === 'still')) gl = Wd.init(glc);
  if (!gl && glc) glc.style.display = 'none';
  layout(); gauges(); setInterval(function () { if (jumpT < 0) gauges(); }, 2600);
  C.on('catalog', function () { scan(cur); });
  setTimeout(function () {
    log('Systèmes en ligne. Bonjour à bord.');
    var n = ORDER.reduce(function (s, id) { return s + countArticles(id); }, 0);
    if (n) log(n + ' articles dans la mémoire de bord');
  }, 400);
  setInterval(function () { if (fuel < 100 && jumpT < 0) { fuel = Math.min(100, fuel + .4); } if (fuel < 15 && Math.random() < .05) log('Antimatière basse : une pause café ?', true); }, 4000);
  RAF(frameDraw);
  window.CodexScene = { ok: true };
})();
