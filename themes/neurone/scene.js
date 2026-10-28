/* ======================================================================
   Thème Neurone — un cerveau vu de profil, tissé de quelques centaines de
   neurones. Des influx courent de synapse en synapse, de longues fibres
   relient les aires entre elles, et cinq aires du cortex (numérotées selon
   Brodmann) ouvrent les rubriques. Rythmes cérébraux δ θ α β γ réglables.
   Canvas 2D pur : le réseau est dessiné une fois, seuls les influx bougent.
   ====================================================================== */
window.CodexScene = { ok: true };
(function () {
  'use strict';
  var C = window.Codex, cv = document.getElementById('nr-cv'), nav = document.getElementById('nr-nav');
  var g = cv && cv.getContext('2d', { alpha: false });
  if (!g) { window.CodexScene.ok = false; return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAF = window.CodexRaf || requestAnimationFrame, TAU = Math.PI * 2;
  function Q() { return C.perf ? C.perf.scale : 1; }

  /* ---------- réglages ---------- */
  var CFG = { band: 'alpha', act: 1, glow: 1 };
  try { var sv = JSON.parse(localStorage.getItem('codex.neurone') || 'null'); if (sv) Object.keys(CFG).forEach(function (k) { if (sv[k] != null) CFG[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem('codex.neurone', JSON.stringify(CFG)); } catch (e) {} }
  var BANDS = {
    delta: { s: 'δ', hz: '2 Hz',  st: 'sommeil profond', speed: .35, rate: .45, wave: .9, f: 2,  amp: 15 },
    theta: { s: 'θ', hz: '6 Hz',  st: 'rêverie',         speed: .6,  rate: .7,  wave: .55, f: 6, amp: 11 },
    alpha: { s: 'α', hz: '10 Hz', st: 'calme éveillé',   speed: 1,   rate: 1,   wave: 0,  f: 10, amp: 8 },
    beta:  { s: 'β', hz: '20 Hz', st: 'éveil actif',     speed: 1.5, rate: 1.5, wave: 0,  f: 20, amp: 5 },
    gamma: { s: 'γ', hz: '40 Hz', st: 'concentration',   speed: 2.1, rate: 2.1, wave: 0,  f: 40, amp: 3.5 }
  };
  function B() { return BANDS[CFG.band] || BANDS.alpha; }

  /* ---------- les cinq aires = les cinq rubriques (coordonnées : cerveau de profil, front à gauche) ---------- */
  var A = [
    { id: 'codex',   name: 'Codex',        ba: 'BA 10', lobe: 'Cortex préfrontal',          fn: 'réflexion, planification, pensée abstraite', info: 'Articles et réflexions',                  c: '#7fe9ff', x: -.86, y: -.25 },
    { id: 'lab',     name: 'Laboratoire',  ba: 'BA 4',  lobe: 'Cortex moteur primaire',     fn: 'passer à l’action, fabriquer',              info: 'Applications et projets en construction', c: '#9dff8a', x: -.09, y: -.60 },
    { id: 'atelier', name: 'Atelier',      ba: 'BA 7',  lobe: 'Cortex pariétal associatif', fn: 'imagerie mentale, assembler les idées',      info: 'Créations, théories, hypothèses',         c: '#ff8fc8', x: .38,  y: -.55 },
    { id: 'dashb',   name: 'Observatoire', ba: 'BA 17', lobe: 'Cortex visuel primaire',     fn: 'voir, observer',                            info: 'Observations, cartes et explorations',    c: '#b79cff', x: .90,  y: -.06 },
    { id: 'profil',  name: 'Portrait',     ba: 'BA 38', lobe: 'Pôle temporal',              fn: 'mémoire autobiographique, identité',        info: 'Parcours, passions et aspirations',       c: '#ffd27a', x: -.43, y: .23 }
  ];
  var NEUTRAL = [170, 190, 255];
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function sprite(c, core) {
    var s = document.createElement('canvas'), z = 96; s.width = s.height = z; var x = s.getContext('2d');
    var gr = x.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
    gr.addColorStop(0, core ? 'rgba(255,255,255,1)' : 'rgba(' + c + ',.9)');
    gr.addColorStop(core ? .07 : .12, 'rgba(' + c + ',.95)');
    gr.addColorStop(.2, 'rgba(' + c + ',.5)');
    gr.addColorStop(.45, 'rgba(' + c + ',.14)');
    gr.addColorStop(1, 'rgba(' + c + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, z, z); return s;
  }
  A.forEach(function (a, i) { a.i = i; a.rgb = rgb(a.c); a.spr = sprite(a.rgb, true); a.halo = sprite(a.rgb, false); a.ex = 0; });
  var NSPR = sprite(NEUTRAL, true), WHITE = sprite([255, 255, 255], true);

  /* ---------- forme du cerveau ---------- */
  var OUT = [[-1.0, -.05], [-.98, -.22], [-.92, -.38], [-.82, -.52], [-.68, -.63], [-.50, -.71], [-.30, -.76], [-.10, -.78], [.10, -.77], [.30, -.72], [.48, -.64], [.64, -.53], [.78, -.40], [.88, -.26], [.95, -.12], [.99, 0], [.97, .08], [.90, .14], [.78, .17], [.62, .19], [.45, .22], [.28, .27], [.10, .31], [-.08, .33], [-.24, .32], [-.37, .30], [-.47, .27], [-.52, .20], [-.50, .13], [-.45, .09], [-.53, .07], [-.67, .09], [-.81, .09], [-.93, .05], [-.99, .02]];
  function spline(pts, n) {   // Catmull-Rom fermée
    var out = [], L = pts.length;
    for (var i = 0; i < L; i++) {
      var p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    return out;
  }
  var SHAPE = spline(OUT, 6);
  // cervelet (sous le lobe occipital) et tronc cérébral (pont puis bulbe)
  var CBS = spline([[.40, .26], [.52, .19], [.68, .16], [.84, .16], [.94, .23], [.97, .33], [.91, .44], [.76, .51], [.58, .53], [.45, .48], [.38, .38]], 6);
  var STEM = spline([[.15, .24], [.33, .26], [.37, .40], [.35, .52], [.32, .64], [.30, .76], [.28, .83], [.21, .83], [.19, .74], [.16, .62], [.12, .50], [.11, .36]], 6);
  // grands sillons : [points, largeur, intensité]
  var SULCI = [
    [[[-.45, .09], [-.30, .04], [-.10, -.02], [.10, -.08], [.26, -.15], [.33, -.26]], 6, .85],                       // latéral (Sylvius)
    [[[.03, -.79], [-.01, -.63], [-.06, -.50], [-.05, -.38], [-.11, -.24], [-.13, -.12], [-.18, -.03]], 5, .8],      // central (Rolando)
    [[[-.13, -.77], [-.17, -.62], [-.21, -.50], [-.20, -.38], [-.26, -.24], [-.29, -.12], [-.32, -.03]], 4, .65],   // précentral
    [[[.18, -.76], [.14, -.62], [.10, -.50], [.11, -.38], [.06, -.24], [.04, -.13], [.01, -.06]], 4, .65],          // postcentral
    [[[-.20, -.56], [-.36, -.57], [-.52, -.54], [-.68, -.47], [-.80, -.38]], 4, .6],                                // frontal supérieur
    [[[-.25, -.30], [-.40, -.30], [-.56, -.27], [-.72, -.20], [-.86, -.12]], 4, .6],                                // frontal inférieur
    [[[.11, -.42], [.26, -.42], [.42, -.38], [.56, -.32], [.70, -.26], [.82, -.22]], 4, .6],                        // intrapariétal
    [[[-.36, .17], [-.22, .14], [-.04, .10], [.16, .05], [.34, -.01], [.48, -.09], [.56, -.19]], 4.5, .65],         // temporal supérieur
    [[[-.30, .27], [-.10, .25], [.12, .22], [.34, .17], [.56, .11], [.72, .07]], 3.5, .5],                          // temporal inférieur
    [[[.73, -.47], [.67, -.40], [.65, -.31]], 4, .6],                                                            // pariéto-occipital
    [[[.75, -.33], [.77, -.19], [.79, -.05], [.77, .08]], 3.5, .5],                                               // occipital transverse
    [[[-.60, .03], [-.74, .01], [-.88, -.02]], 3, .45],                                                          // orbitaire
    [[[-.29, .04], [-.33, -.07]], 3.5, .55], [[[-.36, .06], [-.45, .00]], 3.5, .55],                              // rameaux de Sylvius
    [[[.30, -.20], [.40, -.29], [.47, -.21]], 3, .45], [[[.50, -.08], [.60, -.14], [.66, -.06]], 3, .45]           // supramarginal, angulaire
  ];
  function inPoly(x, y, P) { var c = false; for (var i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; }
  function inCb(x, y) { return inPoly(x, y, CBS); }

  /* ---------- réseau : neurones, synapses (fabriqué une fois, densité selon la puissance) ---------- */
  var N = [], E = [], ADJ = [];
  function seed(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function build() {
    N = []; E = []; ADJ = [];
    var q = Q(), nC = Math.round(540 * q + 60), nB = Math.round(nC * .17), nS = Math.round(nC * .04), k = 0, s = 1;
    A.forEach(function (a) { N.push({ x: a.x, y: a.y, z: a.i, hub: a, f: 0 }); });
    while (k < nC && s < 40000) { var x = seed(s++) * 2 - 1, y = seed(s++) * 1.15 - .8; if (inPoly(x, y, SHAPE)) { N.push({ x: x, y: y, z: -1, f: 0 }); k++; } }
    k = 0; while (k < nB && s < 80000) { var bx = .36 + seed(s++) * .62, by = .15 + seed(s++) * .39; if (inCb(bx, by) && !inPoly(bx, by, SHAPE)) { N.push({ x: bx, y: by, z: -2, f: 0 }); k++; } }
    k = 0; while (k < nS && s < 90000) { var sx = .05 + seed(s++) * .33, sy = .32 + seed(s++) * .5; if (inPoly(sx, sy, STEM) && !inCb(sx, sy) && !inPoly(sx, sy, SHAPE)) { N.push({ x: sx, y: sy, z: -2, f: 0 }); k++; } }
    // zone de chaque neurone : l'aire la plus proche (influence décroissante), sinon neutre
    N.forEach(function (n) {
      if (n.z >= 0 || n.z === -2) return;
      var best = -1, bd = 1e9; A.forEach(function (a, i) { var d = (n.x - a.x) * (n.x - a.x) + (n.y - a.y) * (n.y - a.y); if (d < bd) { bd = d; best = i; } });
      n.z = best; n.w = Math.max(.25, 1 - Math.sqrt(bd) / .55);   // w : à quel point la couleur de l'aire domine
    });
    N.forEach(function (n) { n.rgb = n.z === -2 ? NEUTRAL : A[n.z].rgb.map(function (c, j) { var w = n.hub ? 1 : n.w; return Math.round(c * w + NEUTRAL[j] * (1 - w)); }); ADJ.push([]); });
    // synapses : les plus proches voisins (davantage pour les aires)
    var seen = {};
    N.forEach(function (n, i) {
      var cand = [];
      for (var j = 0; j < N.length; j++) { if (j === i) continue; var d = Math.hypot(N[j].x - n.x, N[j].y - n.y); if (d < (n.hub ? .2 : .15)) cand.push([d, j]); }
      cand.sort(function (a, b) { return a[0] - b[0]; });
      cand.slice(0, n.hub ? 8 : 3).forEach(function (c) { var j = c[1], key = i < j ? i + '_' + j : j + '_' + i; if (seen[key]) return; seen[key] = 1; E.push([i, j, c[0]]); ADJ[i].push(j); ADJ[j].push(i); });
    });
  }

  /* ---------- mise en page ---------- */
  var W = 0, H = 0, DPR = 1, mob = false, bg = null, net = null, R0 = 100;
  var L = { cx: 0, cy: 0, R: 100, dim: 1 }, T = { cx: 0, cy: 0, R: 100, dim: 1 };
  function target() {
    var reading = document.documentElement.classList.contains('reading');
    if (mob) {
      var hi = document.querySelector('#scene .hero-inner'), hb = hi ? hi.getBoundingClientRect().bottom : H * .35;
      var top = Math.min(Math.max(hb + 6, H * .26), H * .5), avail = H - top - 90;
      T.R = Math.max(90, Math.min(W * .47, avail / 1.7)); T.cx = W * .5 + T.R * .02; T.cy = top + avail * .44; T.dim = 1;
    } else {
      T.R = Math.min(W * .26, H * .42); T.cx = Math.max(W * .6, 480 + T.R * 1.05); if (T.cx + T.R + 140 > W) T.cx = W - T.R - 140; T.cy = H * .5; T.dim = 1;
      if (reading) { T.R *= .55; T.cx = W - T.R * 1.15; T.cy = H * .58; T.dim = .55; }
    }
  }
  function paintBg() {
    bg = document.createElement('canvas'); bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
    var x = bg.getContext('2d'); x.scale(DPR, DPR);
    var base = x.createRadialGradient(W * .62, H * .5, 0, W * .62, H * .5, Math.max(W, H) * .8);
    base.addColorStop(0, '#111840'); base.addColorStop(.45, '#090e2a'); base.addColorStop(1, '#040612');
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    [[.68, .4, .5, '40,90,200', .16], [.85, .75, .4, '200,60,150', .1], [.3, .25, .45, '60,50,200', .1]].forEach(function (b) {
      var gr = x.createRadialGradient(W * b[0], H * b[1], 0, W * b[0], H * b[1], Math.max(W, H) * b[2]);
      gr.addColorStop(0, 'rgba(' + b[3] + ',' + b[4] + ')'); gr.addColorStop(1, 'rgba(' + b[3] + ',0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    });
    var n = Math.round(W * H / 3600 * Q());
    for (var i = 0; i < n; i++) { x.fillStyle = 'rgba(190,205,255,' + (.1 + Math.random() * .4) + ')'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  }
  /* le réseau fixe (contour, sillons, synapses, neurones, dendrites des aires) dessiné une fois sur une toile à part */
  function paintNet() {
    R0 = T.R; var w = 2.2 * R0, h = 1.75 * R0, ox = 1.1 * R0, oy = .82 * R0, u = R0 / 300;
    net = document.createElement('canvas'); net.width = Math.round(w * DPR); net.height = Math.round(h * DPR);
    var x = net.getContext('2d'); x.scale(DPR, DPR); x.lineCap = 'round'; x.lineJoin = 'round';
    function X(v) { return ox + v * R0; } function Y(v) { return oy + v * R0; }
    function path(P, close) { x.beginPath(); P.forEach(function (p, i) { if (i) x.lineTo(X(p[0]), Y(p[1])); else x.moveTo(X(p[0]), Y(p[1])); }); if (close) x.closePath(); }
    function curve(P) {   // tracé lissé passant par les points
      x.beginPath(); x.moveTo(X(P[0][0]), Y(P[0][1]));
      for (var k = 1; k < P.length - 1; k++) { var mx = (P[k][0] + P[k + 1][0]) / 2, my = (P[k][1] + P[k + 1][1]) / 2; x.quadraticCurveTo(X(P[k][0]), Y(P[k][1]), X(mx), Y(my)); }
      x.lineTo(X(P[P.length - 1][0]), Y(P[P.length - 1][1]));
    }
    // un seul volume : les trois parties (cerveau, cervelet, tronc) partagent la même matière, la même lumière et le même contour
    function sub(P) { P.forEach(function (p, i) { if (i) x.lineTo(X(p[0]), Y(p[1])); else x.moveTo(X(p[0]), Y(p[1])); }); x.closePath(); }
    var PARTS = [STEM, CBS, SHAPE];
    function union() { x.beginPath(); PARTS.forEach(sub); }
    // bord extérieur seulement : le tracé de chaque partie, privé de ce qui passe à l'intérieur des autres
    var tmp = document.createElement('canvas'); tmp.width = net.width; tmp.height = net.height; var tx = tmp.getContext('2d');
    function outer(width, color) {
      PARTS.forEach(function (P, i) {
        tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height); tx.setTransform(DPR, 0, 0, DPR, 0, 0);
        tx.lineJoin = 'round'; tx.beginPath(); P.forEach(function (p, k) { if (k) tx.lineTo(X(p[0]), Y(p[1])); else tx.moveTo(X(p[0]), Y(p[1])); }); tx.closePath();
        tx.lineWidth = width; tx.strokeStyle = color; tx.stroke();
        tx.globalCompositeOperation = 'destination-out';
        PARTS.forEach(function (Q, j) { if (j === i) return; tx.beginPath(); Q.forEach(function (p, k) { if (k) tx.lineTo(X(p[0]), Y(p[1])); else tx.moveTo(X(p[0]), Y(p[1])); }); tx.closePath(); tx.fillStyle = '#000'; tx.fill(); });
        tx.globalCompositeOperation = 'source-over';
        x.drawImage(tmp, 0, 0, w, h);
      });
    }
    // jonction entre deux parties : les points du contour de P qui passent à l'intérieur de Q deviennent une fente
    function seam(P, Q) { var runs = [], cur = []; P.concat(P.slice(0, 1)).forEach(function (p) { if (inPoly(p[0], p[1], Q)) cur.push(p); else { if (cur.length > 2) runs.push(cur); cur = []; } }); if (cur.length > 2) runs.push(cur); return runs; }
    // sillon : on creuse la matière (le fond apparaît), puis un fin reflet sur la lèvre éclairée
    function groove(P, wd, al) {
      x.globalCompositeOperation = 'destination-out'; curve(P); x.lineWidth = wd * u; x.strokeStyle = 'rgba(0,0,0,' + al + ')'; x.stroke();
      x.globalCompositeOperation = 'lighter'; x.save(); x.translate(-1.1 * u, -1.1 * u); curve(P); x.lineWidth = Math.max(.6, .9 * u); x.strokeStyle = 'rgba(190,210,255,' + (al * .22) + ')'; x.stroke(); x.restore();
    }

    x.save(); union(); x.clip();
    x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(70,95,210,.12)'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter';
    A.forEach(function (a) { var gr = x.createRadialGradient(X(a.x), Y(a.y), 0, X(a.x), Y(a.y), R0 * .62); gr.addColorStop(0, 'rgba(' + a.rgb + ',.15)'); gr.addColorStop(1, 'rgba(' + a.rgb + ',0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    var li = x.createLinearGradient(X(-.7), Y(-.8), X(.4), Y(.3)); li.addColorStop(0, 'rgba(200,215,255,.10)'); li.addColorStop(1, 'rgba(200,215,255,0)'); x.fillStyle = li; x.fillRect(0, 0, w, h);
    outer(22 * u, 'rgba(140,170,255,.07)'); outer(8 * u, 'rgba(160,190,255,.07)');   // lueur intérieure le long du bord
    x.globalCompositeOperation = 'destination-out';
    var sh = x.createLinearGradient(X(-.2), Y(-.3), X(.5), Y(.9)); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
    // jonctions : fente transverse (cerveau / cervelet), sillon du tronc
    seam(SHAPE, CBS).forEach(function (r) { groove(r, 5, .7); });
    seam(SHAPE, STEM).forEach(function (r) { groove(r, 3, .45); });
    seam(CBS, STEM).forEach(function (r) { groove(r, 3, .5); });
    groove([[.12, .50], [.24, .53], [.35, .50]], 2.4, .45);                     // limite pont / bulbe
    x.restore();
    x.save(); x.beginPath(); sub(CBS); x.clip();                                // lamelles du cervelet (sous le cerveau)
    for (var f = 0; f < 11; f++) { var yy = .245 + f * .027; groove([[.36, yy + .05], [.52, yy - .01], [.70, yy - .02], [.88, yy + .02], [1.0, yy + .07]], 1.5, .5); }
    x.restore();
    x.save(); x.beginPath(); sub(SHAPE); x.clip();
    // sillons tertiaires : courtes rides qui découpent les circonvolutions
    for (var gi = 0; gi < 110; gi++) {
      var gx = seed(5000 + gi * 3) * 2 - 1, gy = seed(5001 + gi * 3) * 1.15 - .8; if (!inPoly(gx, gy, SHAPE)) continue;
      var pts = [[gx, gy]], steps = 3 + Math.floor(seed(5002 + gi * 3) * 4), ang = seed(7000 + gi) * TAU;
      for (var st = 0; st < steps; st++) { ang += Math.sin(gi * 1.7 + st * 2.1) * .9; gx += Math.cos(ang) * .035; gy += Math.sin(ang) * .035; pts.push([gx, gy]); }
      groove(pts, 2.4, .34);
    }
    // grands sillons, d'après une vue latérale de l'hémisphère gauche
    SULCI.forEach(function (sc) { groove(sc[0], sc[1], sc[2]); });
    x.restore();
    x.globalCompositeOperation = 'lighter';
    outer(1.3, 'rgba(160,190,255,.4)');
    // synapses (légèrement courbes) et neurones
    x.lineWidth = .8;
    E.forEach(function (e, i) {
      var a = N[e[0]], b = N[e[1]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, bend = (seed(9000 + i) - .5) * .35;
      x.strokeStyle = 'rgba(' + a.rgb + ',' + (.14 * CFG.glow) + ')'; x.beginPath(); x.moveTo(X(a.x), Y(a.y));
      x.quadraticCurveTo(X(mx - (b.y - a.y) * bend), Y(my + (b.x - a.x) * bend), X(b.x), Y(b.y)); x.stroke();
    });
    N.forEach(function (n) { if (n.hub) return; x.fillStyle = 'rgba(' + n.rgb + ',.6)'; x.beginPath(); x.arc(X(n.x), Y(n.y), 1.2, 0, TAU); x.fill(); });
    // dendrites ramifiées autour de chaque aire
    A.forEach(function (a, ai) {
      var r = 1;
      function branch(px, py, ang, len, depth) {
        var ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
        x.strokeStyle = 'rgba(' + a.rgb + ',' + (.18 + depth * .1) + ')'; x.lineWidth = .5 + depth * .45;
        x.beginPath(); x.moveTo(X(px), Y(py)); x.quadraticCurveTo(X((px + ex) / 2 + Math.sin(ang) * len * .15), Y((py + ey) / 2 - Math.cos(ang) * len * .15), X(ex), Y(ey)); x.stroke();
        if (depth > 0) { r = seed(ai * 100 + depth * 7 + len * 1000); branch(ex, ey, ang - .5 - r * .3, len * .7, depth - 1); branch(ex, ey, ang + .4 + r * .3, len * .62, depth - 1); }
      }
      for (var k = 0; k < 6; k++) branch(a.x, a.y, k / 6 * TAU + ai, .055, 2);
    });
  }
  function resize() {
    W = innerWidth; H = innerHeight; mob = W < 800; DPR = window.CodexPx ? CodexPx(1.75) : Math.min(devicePixelRatio || 1, 1.75);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    var wasReading = document.documentElement.classList.contains('reading');
    document.documentElement.classList.remove('reading'); target(); if (wasReading) document.documentElement.classList.add('reading');   // le réseau se dessine à la taille de l'accueil
    paintBg(); paintNet(); target();
    if (!L.cx) { L.cx = T.cx; L.cy = T.cy; L.R = T.R; }
    kick();
  }

  /* ---------- influx, fibres, salves ---------- */
  var pulses = [], tracts = [], rings = [], hot = [];
  function flash(i, v) { var n = N[i]; if (n.f <= 0) hot.push(i); n.f = Math.max(n.f, v); }
  function spawn(from) {
    var i = from != null ? from : Math.floor(Math.random() * N.length), nb = ADJ[i]; if (!nb || !nb.length) return;
    var j = nb[Math.floor(Math.random() * nb.length)];
    pulses.push({ a: i, b: j, p: 0, len: Math.hypot(N[j].x - N[i].x, N[j].y - N[i].y) || .01, hops: 0 });
  }
  function tract(ai, bi) {
    var a = A[ai], b = A[bi], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    tracts.push({ a: a, b: b, cx: mx * .45 + (-.05) * .55, cy: my * .45 + (-.28) * .55, t: 0, d: 1.5 });
  }
  function bz(tr, t) { var u = 1 - t; return [u * u * tr.a.x + 2 * u * t * tr.cx + t * t * tr.b.x, u * u * tr.a.y + 2 * u * t * tr.cy + t * t * tr.b.y]; }
  function burst(a, strong) {
    var hub = a.i; a.ex = strong ? 1 : .6; flash(hub, 1);
    for (var k = 0; k < (strong ? 12 : 4); k++) spawn(hub);
    var o = (a.i + 1 + Math.floor(Math.random() * 4)) % 5; tract(a.i, o); if (strong) tract(a.i, (o + 2) % 5 === a.i ? (o + 1) % 5 : (o + 2) % 5);
    if (strong) rings.push({ a: a, t: 0 });
    a.el.classList.add('hot'); clearTimeout(a.hotT); a.hotT = setTimeout(function () { a.el.classList.remove('hot'); }, 1300);
  }

  /* ---------- étiquettes ---------- */
  A.forEach(function (a) {
    var d = document.createElement('div'); d.className = 'nr-a'; d.style.setProperty('--c', a.c);
    d.innerHTML = '<button type="button"></button><span class="nr-l"><span class="cx-nm"><span class="cx-sci"></span><span class="cx-plain"></span></span></span><span class="nr-t"><b></b><small></small><span></span></span>';
    d.querySelector('button').setAttribute('aria-label', a.name + ' — ' + a.info);
    d.querySelector('.cx-sci').textContent = a.ba; d.querySelector('.cx-plain').textContent = a.name;
    d.querySelector('.nr-t b').textContent = a.name; d.querySelector('.nr-t small').textContent = a.ba + ' · ' + a.lobe + ' — ' + a.fn; d.querySelector('.nr-t span').textContent = a.info;
    d.querySelector('button').addEventListener('click', function () { C.navigate(a.id); });
    nav.appendChild(d); a.el = d; a.flip = null;
  });

  /* ---------- dessin ---------- */
  var t = 0, last = 0, nextTract = 1.5, nextHub = 3, waveX = -1.2, mx = 0, my = 0, pmx = 0, pmy = 0;
  var eeg = document.getElementById('nr-eeg'), eg = eeg && eeg.getContext('2d'), eegSpike = 0;
  function sx(v) { return L.cx + v * L.R; } function sy(v) { return L.cy + v * L.R; }
  function render(dt) {
    var q = Q(), b = B(), act = CFG.act;
    target(); var k = 1 - Math.exp(-dt * 4);
    L.cx += (T.cx - L.cx) * k; L.cy += (T.cy - L.cy) * k; L.R += (T.R - L.R) * k; L.dim += (T.dim - L.dim) * k;
    pmx += (mx - pmx) * Math.min(1, dt * 3); pmy += (my - pmy) * Math.min(1, dt * 3);
    var ocx = L.cx, ocy = L.cy; L.cx += pmx * -10; L.cy += pmy * -7;   // parallaxe douce
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.drawImage(bg, 0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    // le réseau fixe : copié pixel pour pixel quand il est à sa taille d'accueil (le plus économe), mis à l'échelle sinon
    g.globalAlpha = L.dim;
    if (Math.abs(L.R - R0) < .5) g.drawImage(net, Math.round((L.cx - 1.1 * R0) * DPR) / DPR, Math.round((L.cy - .82 * R0) * DPR) / DPR, net.width / DPR, net.height / DPR);
    else g.drawImage(net, L.cx - 1.1 * L.R, L.cy - .82 * L.R, 2.2 * L.R, 1.75 * L.R);
    g.globalAlpha = 1;
    var s = L.R / 300;   // échelle des effets

    // naissance des influx (le rythme cérébral règle leur nombre et leur vitesse)
    var want = Math.round((mob ? 34 : 58) * q * b.rate * act);
    if (!reduce) while (pulses.length < want) spawn();
    // ondes lentes (δ, θ) : une vague qui balaie le cortex d'avant en arrière
    if (b.wave && !reduce) {
      waveX += dt * (b.f === 2 ? .55 : .9); if (waveX > 1.3) waveX = -1.3;
      for (var i = 0; i < N.length; i++) if (Math.abs(N[i].x - waveX) < .03) flash(i, .45 * b.wave);
    }
    // influx
    var v = .55 * b.speed;
    for (var pi = pulses.length - 1; pi >= 0; pi--) {
      var P = pulses[pi]; P.p += v * dt / P.len;
      if (P.p >= 1) {
        flash(P.b, .8); P.hops++;
        var nb = ADJ[P.b].filter(function (j) { return j !== P.a; });
        if (!nb.length || P.hops > 14 || Math.random() < .06 || pulses.length > want + 6) { pulses.splice(pi, 1); continue; }
        P.a = P.b; P.b = nb[Math.floor(Math.random() * nb.length)]; P.p = 0; P.len = Math.hypot(N[P.b].x - N[P.a].x, N[P.b].y - N[P.a].y) || .01;
      }
      var na = N[P.a], nbn = N[P.b], hx = na.x + (nbn.x - na.x) * P.p, hy = na.y + (nbn.y - na.y) * P.p;
      var ts = Math.max(0, P.p - .09 / P.len), tx = na.x + (nbn.x - na.x) * ts, ty = na.y + (nbn.y - na.y) * ts;
      var X1 = sx(hx), Y1 = sy(hy), X0 = sx(tx), Y0 = sy(ty), cc = nbn.rgb;
      // traînée en deux tronçons (plus vif près de la tête) : pas de dégradé à fabriquer à chaque image
      var XM = (X1 + X0) / 2, YM = (Y1 + Y0) / 2; g.lineWidth = 1.8 * Math.max(.7, s);
      g.strokeStyle = 'rgba(' + cc + ',' + (.9 * L.dim) + ')'; g.beginPath(); g.moveTo(X1, Y1); g.lineTo(XM, YM); g.stroke();
      g.strokeStyle = 'rgba(' + cc + ',' + (.3 * L.dim) + ')'; g.beginPath(); g.moveTo(XM, YM); g.lineTo(X0, Y0); g.stroke();
      var hz = 11 * Math.max(.7, s) * CFG.glow; g.globalAlpha = L.dim; g.drawImage(nbn.z >= 0 ? A[nbn.z].spr : NSPR, X1 - hz / 2, Y1 - hz / 2, hz, hz); g.globalAlpha = 1;
    }
    // neurones qui s'allument
    for (var h = hot.length - 1; h >= 0; h--) {
      var n = N[hot[h]]; n.f -= dt * 2.4; if (n.f <= 0) { n.f = 0; hot.splice(h, 1); continue; }
      if (n.hub) continue;
      var fz = 16 * n.f * Math.max(.7, s) * CFG.glow; g.globalAlpha = n.f * L.dim; g.drawImage(n.z >= 0 ? A[n.z].halo : NSPR, sx(n.x) - fz / 2, sy(n.y) - fz / 2, fz, fz);
    }
    g.globalAlpha = 1;
    // longues fibres entre aires (faisceaux d'association)
    nextTract -= dt * b.rate * act; if (nextTract < 0 && !reduce) { var ai = Math.floor(Math.random() * 5), bi = (ai + 1 + Math.floor(Math.random() * 4)) % 5; tract(ai, bi); nextTract = 1.4 + Math.random() * 2.2; }
    for (var ti = tracts.length - 1; ti >= 0; ti--) {
      var tr = tracts[ti]; tr.t += dt * b.speed / tr.d; var tt = Math.min(1, tr.t);
      g.lineWidth = 2.2 * Math.max(.7, s);
      var prev = bz(tr, Math.max(0, tt - .28));
      for (var kk = 1; kk <= 10; kk++) {
        var u = Math.max(0, tt - .28) + (Math.min(tt, .28) * kk / 10), p2 = bz(tr, u), al = (kk / 10) * .8 * L.dim, mixc = tr.a.rgb.map(function (c, j) { return Math.round(c + (tr.b.rgb[j] - c) * u); });
        g.strokeStyle = 'rgba(' + mixc + ',' + al + ')'; g.beginPath(); g.moveTo(sx(prev[0]), sy(prev[1])); g.lineTo(sx(p2[0]), sy(p2[1])); g.stroke(); prev = p2;
      }
      var hz2 = 20 * Math.max(.7, s) * CFG.glow; g.globalAlpha = L.dim; g.drawImage(WHITE, sx(prev[0]) - hz2 / 2, sy(prev[1]) - hz2 / 2, hz2, hz2); g.globalAlpha = 1;
      if (tr.t >= 1) { tracts.splice(ti, 1); tr.b.ex = Math.max(tr.b.ex, .55); flash(tr.b.i, 1); for (var q2 = 0; q2 < 3; q2++) spawn(tr.b.i); eegSpike = Math.max(eegSpike, .5); }
    }
    // aires : soma lumineux qui bat
    A.forEach(function (a) {
      a.ex *= Math.exp(-dt * 2.2);
      var X = sx(a.x), Y = sy(a.y), beat = 1 + Math.sin(t * (1.6 + a.i * .23) + a.i) * .08, z = (34 + a.ex * 40) * Math.max(.75, s) * beat * CFG.glow;
      g.globalAlpha = .45 * L.dim; g.drawImage(a.halo, X - z * 1.3, Y - z * 1.3, z * 2.6, z * 2.6);
      g.globalAlpha = L.dim; g.drawImage(a.spr, X - z / 2, Y - z / 2, z, z); g.globalAlpha = 1;
    });
    for (var r = rings.length - 1; r >= 0; r--) {
      var RG = rings[r]; RG.t += dt; var f = RG.t / 1.1; if (f >= 1) { rings.splice(r, 1); continue; }
      g.strokeStyle = 'rgba(' + RG.a.rgb + ',' + (.8 * (1 - f)) + ')'; g.lineWidth = 2 * (1 - f) + .4; g.beginPath(); g.arc(sx(RG.a.x), sy(RG.a.y), 8 + f * 80 * Math.max(.7, s), 0, TAU); g.stroke();
    }
    // une aire s'active d'elle-même de temps en temps
    nextHub -= dt * act; if (nextHub < 0 && !reduce) { burst(A[Math.floor(Math.random() * 5)], false); nextHub = 4 + Math.random() * 5; }
    // étiquettes
    A.forEach(function (a) {
      var X = sx(a.x), Y = sy(a.y); a.el.style.transform = 'translate3d(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px,0)';
      var fl = X > W - (mob ? 110 : 150); if (fl !== a.flip) { a.flip = fl; a.el.classList.toggle('flip', fl); }
    });
    L.cx = ocx; L.cy = ocy;
    drawEeg(dt, b);
  }
  /* tracé EEG du rythme choisi */
  var eegT = 0;
  function drawEeg(dt, b) {
    if (!eg || mob || document.documentElement.classList.contains('reading')) return;
    eegT += dt; eegSpike *= Math.exp(-dt * 3);
    var w = 180, h = 40; if (eeg.width !== w * 2) { eeg.width = w * 2; eeg.height = h * 2; }
    eg.setTransform(2, 0, 0, 2, 0, 0); eg.clearRect(0, 0, w, h);
    eg.strokeStyle = 'rgba(159,232,255,.18)'; eg.lineWidth = 1; eg.beginPath(); eg.moveTo(0, h / 2); eg.lineTo(w, h / 2); eg.stroke();
    eg.strokeStyle = '#9fe8ff'; eg.lineWidth = 1.3; eg.shadowColor = '#7fe9ff'; eg.shadowBlur = 6; eg.beginPath();
    var cyc = b.f * .55;
    for (var x = 0; x <= w; x += 2) {
      var ph = (x / w) * cyc * TAU - eegT * b.f * TAU * .25, env = Math.sin(x / w * Math.PI);
      var y = h / 2 + (Math.sin(ph) * b.amp + Math.sin(ph * 2.7 + 1.3) * b.amp * .25 + Math.sin(x * .9 + eegT * 13) * 1.2 + (x > w * .7 ? Math.sin(x * .6) * eegSpike * 12 : 0)) * env;
      if (x) eg.lineTo(x, y); else eg.moveTo(x, y);
    }
    eg.stroke(); eg.shadowBlur = 0;
  }
  function frame(ms) {
    if (!reduce) RAF(frame);
    var dt = last ? Math.min(.05, Math.max(0, (ms - last) / 1000)) : .016; last = ms;
    if (document.hidden) return;
    t += dt; render(dt);
  }
  var kickPending = false;
  function kick() { if (!reduce || kickPending || !W) return; kickPending = true; requestAnimationFrame(function () { kickPending = false; render(.016); }); }
  function syncHud() {
    var b = B(), e;
    if ((e = document.getElementById('nr-band'))) e.textContent = b.s;
    if ((e = document.getElementById('nr-hz'))) e.textContent = b.hz;
    if ((e = document.getElementById('nr-state'))) e.textContent = b.st;
  }

  /* ---------- gestes ---------- */
  addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; } }, { passive: true });

  /* ---------- liaison avec l'interface commune ---------- */
  C.on('navigate', function (ev) {
    if (ev.direct) return;
    if (!ev.id) { C.reader.close(); return; }
    var a = A.filter(function (x) { return x.id === ev.id; })[0];
    if (a && !reduce && !document.documentElement.classList.contains('reading')) { burst(a, true); eegSpike = 1; setTimeout(function () { C.reader.open(ev.id); }, 620); }
    else C.reader.open(ev.id);
  });
  C.on('perf', function () { build(); resize(); });
  C.on('reader:open', kick); C.on('reader:close', kick);
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { last = 0; });

  /* ---------- carte de réglages ---------- */
  if (C.customize && C.customize.pop) {
    var pop = C.customize.pop();
    var md = document.createElement('div');
    md.innerHTML = '<span class="cx-l">Rythme cérébral</span><div class="cx-sw" role="radiogroup" aria-label="Rythme cérébral"></div>';
    var sw = md.querySelector('.cx-sw');
    Object.keys(BANDS).forEach(function (k) {
      var bb = BANDS[k], btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('role', 'radio'); btn.dataset.v = k;
      btn.textContent = bb.s + ' ' + bb.st; btn.title = bb.hz; btn.setAttribute('aria-checked', String(CFG.band === k));
      btn.addEventListener('click', function () { CFG.band = k; save(); syncHud(); sw.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.v === CFG.band)); }); kick(); });
      sw.appendChild(btn);
    });
    pop.appendChild(md);
    [['nr-act', 'Activité', .3, 2, .05, 'act'], ['nr-glow', 'Éclat', .4, 1.6, .05, 'glow']].forEach(function (o) {
      var d = document.createElement('div');
      d.innerHTML = '<label class="cx-l" for="' + o[0] + '">' + o[1] + '</label><input id="' + o[0] + '" type="range" min="' + o[2] + '" max="' + o[3] + '" step="' + o[4] + '" value="' + CFG[o[5]] + '">';
      d.querySelector('input').addEventListener('input', function (ev) { CFG[o[5]] = parseFloat(ev.target.value); save(); if (o[5] === 'glow') paintNet(); kick(); });
      pop.appendChild(d);
    });
  }

  build(); syncHud(); resize();
  if (reduce) render(.016); else RAF(frame);
})();
