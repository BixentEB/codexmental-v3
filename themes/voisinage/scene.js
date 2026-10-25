/* Thème Voisinage stellaire — carte 3D des étoiles proches (three.js r148, orbite et vols de caméra maison).
   Positions : ascension droite, déclinaison et distance approximatives ; distances compressées pour rester lisibles.
   Les données rigoureuses seront celles de l'Observatoire. */
window.CodexScene = { ok: false };
(function () {
  'use strict';
  var T = window.THREE, Codex = window.Codex;
  var cv = document.getElementById('vs-cv'), labelsEl = document.getElementById('vs-labels');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!T || !cv) return;
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  var DPR = renderer.getPixelRatio();
  var scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1, .1, 3000);
  var DEG = Math.PI / 180;

  /* ---------- données ---------- */
  var COL = { O: 0xa9c6ff, B: 0xb8d0ff, A: 0xdce8ff, F: 0xfff3de, G: 0xffe3a6, K: 0xffbf80, M: 0xff8f66 };
  var STARS = [
    { id: 'profil', menu: 1, name: 'Portrait', star: 'Le Soleil', ra: 0, dec: 0, d: 0, cls: 'G', m: 1.3, sub: 'Notre étoile', text: "Le point de départ de toute carte : c’est d’ici que l’on observe. Un espace pour découvrir l’auteur, ses passions et ses influences." },
    { id: 'codex', menu: 1, name: 'Codex', star: 'Sirius', ra: 6.7525, dec: -16.716, d: 8.6, cls: 'A', m: 1.6, text: "La plus brillante des étoiles du ciel nocturne, accompagnée d’une naine blanche. Le blog : articles et réflexions." },
    { id: 'atelier', menu: 1, name: 'Atelier', star: 'Alpha du Centaure', ra: 14.66, dec: -60.83, d: 4.37, cls: 'G', m: 1.4, text: "Le système stellaire le plus proche du Soleil. Le lieu où je range mes idées farfelues." },
    { id: 'lab', menu: 1, name: 'Laboratoire', star: 'Véga', ra: 18.615, dec: 38.78, d: 25, cls: 'A', m: 1.5, text: "Étoile blanche très brillante, longtemps utilisée comme référence de luminosité. La vitrine de mes créations." },
    { id: 'dashb', menu: 1, name: 'Observatoire', star: 'Arcturus', ra: 14.261, dec: 19.18, d: 36.7, cls: 'K', m: 1.5, text: "Géante orangée parmi les plus brillantes du ciel. La tête dans les étoiles : cartes et données astronomiques." },
    { id: 'proxima', name: 'Proxima du Centaure', ra: 14.495, dec: -62.68, d: 4.24, cls: 'M', m: .8, text: "Naine rouge, l’étoile la plus proche du Soleil. Elle possède au moins une planète tempérée, Proxima b." },
    { id: 'barnard', name: 'Étoile de Barnard', ra: 17.963, dec: 4.69, d: 5.96, cls: 'M', m: .8, text: "Naine rouge qui possède le plus grand mouvement propre connu : elle se déplace plus vite que toute autre sur le fond du ciel." },
    { id: 'wolf359', name: 'Wolf 359', ra: 10.94, dec: 7.01, d: 7.86, cls: 'M', m: .7, text: "Naine rouge très peu lumineuse, invisible à l’œil nu malgré sa proximité." },
    { id: 'lalande', name: 'Lalande 21185', ra: 11.05, dec: 35.97, d: 8.3, cls: 'M', m: .7, text: "Naine rouge de la Grande Ourse, l’une des étoiles les plus proches visibles aux jumelles." },
    { id: 'epseri', name: 'Epsilon Eridani', ra: 3.549, dec: -9.46, d: 10.5, cls: 'K', m: 1, text: "Étoile orangée encore jeune, entourée d’un disque de débris." },
    { id: 'cygni61', name: '61 Cygni', ra: 21.115, dec: 38.75, d: 11.4, cls: 'K', m: .9, text: "Première étoile dont la distance a été mesurée, par Friedrich Bessel en 1838." },
    { id: 'procyon', name: 'Procyon', ra: 7.655, dec: 5.225, d: 11.46, cls: 'F', m: 1.2, text: "Étoile blanc-jaune brillante, accompagnée d’une naine blanche." },
    { id: 'taucet', name: 'Tau Ceti', ra: 1.734, dec: -15.94, d: 11.9, cls: 'G', m: 1, text: "Étoile semblable au Soleil, autour de laquelle plusieurs planètes candidates ont été signalées." },
    { id: 'altair', name: 'Altair', ra: 19.846, dec: 8.87, d: 16.7, cls: 'A', m: 1.2, text: "Étoile blanche à la rotation très rapide, environ neuf heures : elle est visiblement aplatie." },
    { id: 'fomalhaut', name: 'Fomalhaut', ra: 22.96, dec: -29.62, d: 25.1, cls: 'A', m: 1.2, text: "Étoile blanche entourée d’un vaste disque de poussières, photographié directement." },
    { id: 'pollux', name: 'Pollux', ra: 7.755, dec: 28.03, d: 33.8, cls: 'K', m: 1.2, text: "Géante orangée des Gémeaux, qui possède une exoplanète confirmée." },
    { id: 'trappist', name: 'TRAPPIST-1', ra: 23.106, dec: -5.04, d: 40.7, cls: 'M', m: .8, text: "Naine rouge ultra-froide autour de laquelle gravitent sept planètes rocheuses de taille proche de la Terre." },
    { id: 'capella', name: 'Capella', ra: 5.278, dec: 46, d: 42.9, cls: 'G', m: 1.3, text: "Système de quatre étoiles : deux géantes jaunes et deux naines rouges." },
    { id: 'castor', name: 'Castor', ra: 7.577, dec: 31.89, d: 51, cls: 'A', m: 1.1, text: "Système de six étoiles, regroupées en trois paires." },
    { id: 'aldebaran', name: 'Aldébaran', ra: 4.599, dec: 16.51, d: 65, cls: 'K', m: 1.3, text: "Géante orangée, « l’œil du Taureau »." },
    { id: 'regulus', name: 'Régulus', ra: 10.14, dec: 11.97, d: 79, cls: 'B', m: 1.2, text: "Étoile bleu-blanc du Lion, qui tourne si vite qu’elle est nettement aplatie." },
    { id: 'polaris', name: 'Polaris', ra: 2.53, dec: 89.26, d: 433, cls: 'F', m: 1.2, text: "L’étoile Polaire actuelle, une céphéide à environ 430 années-lumière : sa luminosité varie régulièrement." }
  ];
  function pos(s) {
    var ra = s.ra * 15 * DEG, dec = s.dec * DEG, r = rad(s.d);
    return new T.Vector3(r * Math.cos(dec) * Math.cos(ra), r * Math.sin(dec), -r * Math.cos(dec) * Math.sin(ra));
  }
  function rad(d) { return d <= 0 ? 0 : 8 * Math.pow(d, .62); }   // échelle compressée
  function fmtD(d) { return d <= 0 ? 'Au centre de la carte' : (d >= 100 ? Math.round(d) : String(d).replace('.', ',')) + ' années-lumière'; }
  function CLS(c) { return { O: 'bleue', B: 'bleu-blanc', A: 'blanche', F: 'jaune-blanc', G: 'jaune', K: 'orangée', M: 'rouge' }[c]; }

  /* ---------- fond : voie lactée et nébuleuses procédurales ---------- */
  var sky = new T.Mesh(new T.SphereGeometry(1500, 48, 32), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uA: { value: new T.Color(0x16305e) }, uB: { value: new T.Color(0x4b2a68) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'precision highp float; varying vec3 vP; uniform float uTime; uniform vec3 uA; uniform vec3 uB;' +
      'float h(vec3 p){ p=fract(p*.3183+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }' +
      'float n(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }' +
      'float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+1.7; a*=.5; } return v; }' +
      'void main(){ vec3 d = normalize(vP); vec3 axis = normalize(vec3(.35,.9,.25)); float lat = dot(d,axis);' +
      ' float band = exp(-lat*lat*14.); float c = fbm(d*3.2+vec3(0.,0.,uTime*.002)); float f = fbm(d*7.5+4.);' +
      ' float dust = smoothstep(.35,.7,fbm(d*5.+9.)); float m = band*(.35+.9*c)*(1.-.55*dust);' +
      ' vec3 col = mix(uA, uB, c)*m*3.1 + vec3(.014,.02,.05); col += vec3(.9,.8,.7)*pow(band,3.)*f*.12;' +
      ' gl_FragColor = vec4(col,1.); }'
  }));
  scene.add(sky);

  /* ---------- étoiles : points lumineux ---------- */
  var starMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uPx: { value: DPR }, uK: { value: 1 }, uTime: { value: 0 } },
    vertexShader: 'attribute float aS; attribute vec3 aC; attribute float aP; varying vec3 vC; varying float vT; uniform float uPx; uniform float uK; uniform float uTime;' +
      'void main(){ vC=aC; vT=.85+.15*sin(uTime*1.6+aP*40.); vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;' +
      ' gl_PointSize = clamp(aS*uK*uPx*(340./-mv.z), 1.2*uPx, 46.*uPx); }',
    fragmentShader: 'precision mediump float; varying vec3 vC; varying float vT;' +
      'void main(){ vec2 p=gl_PointCoord-.5; float r=length(p)*2.; if(r>1.) discard;' +
      ' float core=exp(-r*r*18.), halo=exp(-r*3.2)*.45; float spike=max(exp(-abs(p.x)*60.)*exp(-abs(p.y)*5.),exp(-abs(p.y)*60.)*exp(-abs(p.x)*5.))*.35;' +
      ' float a=(core+halo+spike)*vT; gl_FragColor=vec4(vC*a, a); }'
  });
  function pointsOf(list, sizeOf) {
    var g = new T.BufferGeometry(), n = list.length, P = new Float32Array(n * 3), S = new Float32Array(n), C = new Float32Array(n * 3), Q = new Float32Array(n);
    list.forEach(function (o, i) { P[i * 3] = o.p.x; P[i * 3 + 1] = o.p.y; P[i * 3 + 2] = o.p.z; S[i] = sizeOf(o); var c = new T.Color(o.c); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; Q[i] = o.q; });
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aS', new T.BufferAttribute(S, 1)); g.setAttribute('aC', new T.BufferAttribute(C, 3)); g.setAttribute('aP', new T.BufferAttribute(Q, 1));
    var pts = new T.Points(g, starMat); pts.frustumCulled = false; return pts;
  }
  var named = STARS.map(function (s, i) { s.p = pos(s); s.c = COL[s.cls]; s.q = (i * .6180339) % 1; return s; });
  scene.add(pointsOf(named, function (s) { return (s.menu ? 17 : 11) * s.m; }));
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var field = [], i, u, v, r, cls = ['B', 'A', 'F', 'G', 'K', 'M', 'M', 'K'];
  for (i = 0; i < 2600; i++) {
    u = rnd() * 2 - 1; v = rnd() * Math.PI * 2; r = 30 + Math.pow(rnd(), .7) * 420; var q = Math.sqrt(1 - u * u);
    field.push({ p: new T.Vector3(r * q * Math.cos(v), r * u * .8, r * q * Math.sin(v)), c: COL[cls[(rnd() * cls.length) | 0]], q: rnd(), s: .8 + rnd() * 1.8 });
  }
  var fieldPts = pointsOf(field, function (o) { return o.s; }); scene.add(fieldPts);

  /* ---------- repères : anneaux de distance et pieds d'étoiles ---------- */
  var guides = new T.Group(); scene.add(guides);
  var ringMat = new T.LineBasicMaterial({ color: 0x7fb0e8, transparent: true, opacity: .2, depthWrite: false });
  var RINGS = [5, 10, 25, 50, 100];
  RINGS.forEach(function (d) {
    var R = rad(d), pts = []; for (var k = 0; k <= 128; k++) { var a = k / 128 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    guides.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), ringMat));
  });
  var stemPts = []; named.forEach(function (s) { if (s.d > 0) { stemPts.push(s.p.clone(), new T.Vector3(s.p.x, 0, s.p.z)); } });
  guides.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(stemPts), new T.LineBasicMaterial({ color: 0x7fb0e8, transparent: true, opacity: .16, depthWrite: false })));
  var feet = pointsOf(named.filter(function (s) { return s.d > 0; }).map(function (s) { return { p: new T.Vector3(s.p.x, 0, s.p.z), c: 0x7fb0e8, q: 0 }; }), function () { return 2.2; });
  guides.add(feet);
  /* étiquettes d'anneaux */
  var ringLabels = RINGS.map(function (d) { var e = document.createElement('div'); e.className = 'vs-pt'; e.innerHTML = '<span class="lbl" style="left:4px;top:-6px;font-size:10.5px;color:var(--muted);font-family:var(--font-mono)">' + d + ' al</span>'; labelsEl.appendChild(e); return { el: e, p: new T.Vector3(rad(d), 0, 0) }; });

  /* ---------- étiquettes cliquables ---------- */
  var cardEl = document.getElementById('vs-card'), hov = null;
  named.forEach(function (s) {
    var e = document.createElement('div'); e.className = 'vs-pt' + (s.menu ? ' menu' : '');
    e.innerHTML = '<button class="hit" type="button" aria-label="' + s.name + (s.star ? ' — ' + s.star : '') + '"></button><span class="lbl"><b>' + s.name + '</b>' + (s.star ? '<i>' + s.star + '</i>' : '') + '</span>';
    labelsEl.appendChild(e); s.el = e;
    var b = e.querySelector('.hit');
    b.addEventListener('mouseenter', function () { hover(s); }); b.addEventListener('mouseleave', function () { hover(null); });
    b.addEventListener('focus', function () { hover(s); }); b.addEventListener('blur', function () { hover(null); });
    b.addEventListener('click', function () { choose(s); });
  });
  function hover(s) {
    if (hov && hov.el) hov.el.classList.remove('hov'); hov = s;
    if (!s) { if (!focused) cardEl.hidden = true; else show(focused); return; }
    s.el.classList.add('hov'); show(s);
  }
  function show(s) {
    cardEl.hidden = false;
    document.getElementById('vs-card-n').textContent = s.menu ? s.name + ' · ' + s.star : s.name;
    document.getElementById('vs-card-s').textContent = s.d > 0 ? 'Étoile ' + CLS(s.cls) + ' · ' + fmtD(s.d) : 'Étoile jaune · ' + fmtD(0);
    document.getElementById('vs-card-d').textContent = '';
    document.getElementById('vs-card-t').textContent = s.text;
  }

  /* ---------- caméra : orbite + vols ---------- */
  var cam = { yaw: .6, pitch: .42, dist: 240, target: new T.Vector3(), shift: 0 };
  var goal = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: new T.Vector3(), shift: 0 };
  var flight = null, focused = null, idle = 0, W = 1, H = 1, auto = true, rotSpeed = 1;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function flyTo(tg, dist, then) {
    flight = { t: 0, dur: reduce ? .01 : 1.7, from: { target: cam.target.clone(), dist: cam.dist }, to: { target: tg.clone(), dist: dist }, then: then };
  }
  var backBtn = document.getElementById('vs-back');
  function home() { focused = null; hover(null); backBtn.hidden = true; goal.shift = 0; flyTo(new T.Vector3(), 240); }
  function choose(s) {
    focused = s; show(s); backBtn.hidden = false; idle = 0;
    flyTo(s.p, s.d > 0 ? 22 : 60, function () { if (s.menu) { goal.shift = .22; Codex.reader.open(s.id); } });
  }
  backBtn.addEventListener('click', function () { if (Codex.reader.isOpen && Codex.reader.isOpen()) Codex.reader.close(); else home(); });
  var drag = null, pointers = {}, pinch0 = 0;
  cv.addEventListener('pointerdown', function (e) { pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); idle = 0; if (Object.keys(pointers).length === 2) { var p = Object.keys(pointers).map(function (k) { return pointers[k]; }); pinch0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); } });
  cv.addEventListener('pointermove', function (e) {
    var p = pointers[e.pointerId]; if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    var ks = Object.keys(pointers);
    if (ks.length === 2) { var a = pointers[ks[0]], b = pointers[ks[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { cam.dist = clamp(cam.dist * pinch0 / d, 8, 800); } pinch0 = d; }
    else { cam.yaw -= dx * .006; cam.pitch = clamp(cam.pitch + dy * .006, -1.35, 1.35); flight = null; }
    idle = 0;
  });
  function up(e) { delete pointers[e.pointerId]; pinch0 = 0; if (!Object.keys(pointers).length) cv.classList.remove('drag'); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * .0012), 8, 800); idle = 0; }, { passive: false });

  /* ---------- liaison avec l'interface commune ---------- */
  var ids = {}; named.forEach(function (s) { if (s.menu) ids[s.id] = s; });
  Codex.on('navigate', function (e) {
    if (e.direct) { if (!e.id) home(); return; }
    if (!e.id) { Codex.reader.close(); home(); return; }
    if (ids[e.id]) choose(ids[e.id]); else Codex.reader.open(e.id);
  });
  Codex.on('reader:close', function () { home(); });

  /* ---------- réglages ---------- */
  var cfg = { names: 'all', rings: true, stems: true, field: 1 };
  try { var sv = JSON.parse(localStorage.getItem('codex.voisinage') || '{}'); Object.keys(cfg).forEach(function (k) { if (sv[k] !== undefined) cfg[k] = sv[k]; }); if (sv.rot !== undefined) rotSpeed = sv.rot; } catch (e) {}
  function save() { try { localStorage.setItem('codex.voisinage', JSON.stringify({ names: cfg.names, rings: cfg.rings, stems: cfg.stems, field: cfg.field, rot: rotSpeed })); } catch (e) {} }
  function applyCfg() {
    ['menus', 'stars', 'none'].forEach(function (k) { document.body.classList.toggle('vs-n-' + k, cfg.names === k); });
    guides.visible = cfg.rings || cfg.stems; ringMat.visible = cfg.rings; guides.children[RINGS.length].visible = cfg.stems; feet.visible = cfg.stems;
    ringLabels.forEach(function (l) { l.el.style.display = cfg.rings ? '' : 'none'; });
    fieldPts.visible = cfg.field > 0;
  }
  if (Codex.customize) {
    var pop = Codex.customize.pop();
    pop.innerHTML = '<div><label class="cx-l" for="vs-rot">Rotation automatique</label><input id="vs-rot" type="range" min="0" max="3" step=".1"></div>' +
      '<div><label class="cx-l" for="vs-names">Noms affichés</label><select id="vs-names" style="width:100%;padding:8px;background:transparent;color:inherit;border:1px solid var(--line);border-radius:8px"><option value="all">Rubriques et étoiles</option><option value="menus">Rubriques seulement</option><option value="stars">Étoiles seulement</option><option value="none">Aucun nom</option></select></div>' +
      '<label class="cx-row" for="vs-rings"><span>Anneaux de distance</span><input id="vs-rings" type="checkbox"></label>' +
      '<label class="cx-row" for="vs-stems"><span>Repères verticaux</span><input id="vs-stems" type="checkbox"></label>' +
      '<label class="cx-row" for="vs-field"><span>Étoiles de fond</span><input id="vs-field" type="checkbox"></label>';
    var $ = function (id) { return document.getElementById(id); };
    $('vs-rot').value = rotSpeed; $('vs-names').value = cfg.names; $('vs-rings').checked = cfg.rings; $('vs-stems').checked = cfg.stems; $('vs-field').checked = cfg.field > 0;
    $('vs-rot').addEventListener('input', function (e) { rotSpeed = parseFloat(e.target.value); save(); });
    $('vs-names').addEventListener('change', function (e) { cfg.names = e.target.value; applyCfg(); save(); });
    $('vs-rings').addEventListener('change', function (e) { cfg.rings = e.target.checked; applyCfg(); save(); });
    $('vs-stems').addEventListener('change', function (e) { cfg.stems = e.target.checked; applyCfg(); save(); });
    $('vs-field').addEventListener('change', function (e) { cfg.field = e.target.checked ? 1 : 0; applyCfg(); save(); });
  }
  applyCfg();

  /* ---------- boucle ---------- */
  function resize() { W = window.innerWidth; H = window.innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  var v3 = new T.Vector3(), last = performance.now(), paused = document.hidden, clock = 0;
  document.addEventListener('visibilitychange', function () { paused = document.hidden; last = performance.now(); if (!paused) requestAnimationFrame(frame); });
  function project(p, out) { v3.copy(p).project(camera); out.x = (v3.x * .5 + .5) * W; out.y = (-v3.y * .5 + .5) * H; out.z = v3.z; return out; }
  var o = { x: 0, y: 0, z: 0 };
  function frame(now) {
    if (paused) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt; idle += dt;
    if (flight) {
      flight.t += dt / flight.dur; var k = ease(Math.min(1, flight.t));
      cam.target.lerpVectors(flight.from.target, flight.to.target, k); cam.dist = flight.from.dist + (flight.to.dist - flight.from.dist) * k;
      if (flight.t >= 1) { var th = flight.then; flight = null; if (th) th(); }
    } else if (!focused && !reduce && rotSpeed > 0 && idle > 1.5) { cam.yaw += dt * .05 * rotSpeed; }
    cam.shift += (goal.shift - cam.shift) * Math.min(1, dt * 3);
    var cp = Math.cos(cam.pitch);
    camera.position.set(cam.target.x + cam.dist * cp * Math.sin(cam.yaw), cam.target.y + cam.dist * Math.sin(cam.pitch), cam.target.z + cam.dist * cp * Math.cos(cam.yaw));
    camera.lookAt(cam.target);
    camera.setViewOffset(W, H, cam.shift * W, 0, W, H);
    starMat.uniforms.uTime.value = clock; sky.material.uniforms.uTime.value = clock; sky.position.copy(camera.position);
    renderer.render(scene, camera);
    named.forEach(function (s) { project(s.p, o); var vis = o.z < 1 && o.x > -60 && o.x < W + 60 && o.y > 64 && o.y < H + 40; s.el.style.visibility = vis ? '' : 'hidden'; if (vis) s.el.style.transform = 'translate3d(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px,0)'; });
    (function () {   // désencombrement : les rubriques gardent leur nom, les autres étoiles s'effacent si elles se chevauchent
      var placed = [], list = named.filter(function (s) { return s.el.style.visibility !== 'hidden'; }).sort(function (a, b) { return (b.menu ? 1 : 0) - (a.menu ? 1 : 0); });
      list.forEach(function (s) {
        var m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(s.el.style.transform || ''); if (!m) return;
        var x = +m[1], y = +m[2], hit = placed.some(function (q) { return Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 18; });
        if (hit && !s.menu && !s.el.classList.contains('hov')) s.el.classList.add('vs-dim'); else { s.el.classList.remove('vs-dim'); placed.push({ x: x, y: y }); }
      });
    })();
    ringLabels.forEach(function (l) { project(l.p, o); var vis = o.z < 1 && cfg.rings; l.el.style.visibility = vis ? '' : 'hidden'; if (vis) l.el.style.transform = 'translate3d(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px,0)'; });
    requestAnimationFrame(frame);
  }
  window.CodexScene = { ok: true };
  requestAnimationFrame(frame);
})();
