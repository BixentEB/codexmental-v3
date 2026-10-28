/* Thème Galactique — galaxie spirale 3D (importée de v2 ; le lecteur est celui de l'interface commune). */
window.CodexScene = { ok: true };
/* ===================== Générateur de galaxie + GLSL ===================== */
var TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Forme d'un bras : spirale logarithmique, avec ondulation (turbulence) */
function armTheta(r, k, arms, twist, turb) { return k * TAU / arms + twist * Math.log(1 + 4 * r) / Math.log(5) + 0.2 * turb * Math.sin(7 * r); }
function armSigma(r, turb) { return Math.min(0.55, (0.04 + 0.04 * turb) / (r + 0.07)); }
function smooth01(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function omegaAt(r, spin) { return spin * (1 + 0.35 * (1 - 2 * smooth01(0.1, 1.0, r))); }

/* cfg : { count, arms, twist, turb, seed, nebula, dust } → tableaux typés pour trois couches de points */
function buildGalaxy(cfg) {
  var rnd = mulberry32(cfg.seed), N = cfg.count, arms = cfg.arms, twist = cfg.twist, turb = cfg.turb, nucleusScale = .45 + cfg.nucleus / 100 * 1.1;
  function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function gammaR(Rd, lo) { var r; do { r = -Rd * (Math.log(1 - rnd()) + Math.log(1 - rnd())); } while (r > 1 || r < (lo || 0)); return r; }
  function layer(n) { return { n: 0, cap: n, rad: new Float32Array(n), ang: new Float32Array(n), y: new Float32Array(n), col: new Float32Array(n * 3), size: new Float32Array(n), seed: new Float32Array(n) }; }
  function put(L, r, a, y, cr, cg, cb, s) {
    var i = L.n; if (i >= L.cap) return;
    L.rad[i] = r; L.ang[i] = a; L.y[i] = y; L.col[3 * i] = cr; L.col[3 * i + 1] = cg; L.col[3 * i + 2] = cb; L.size[i] = s; L.seed[i] = rnd(); L.n++;
  }
  var stars = layer(N), neb = layer(cfg.nebula), dust = layer(cfg.dust);
  var nBulge = Math.floor(N * .25), nHalo = Math.floor(N * .03), nField = Math.floor(N * .21), nCl = Math.floor(N * .06);
  var i, t, k, r, a, y, b, x, z, bri, s;

  /* Bulbe : barre allongée + sphéroïde, étoiles vieilles (jaune-orangé) */
  var barA = .55, cb = Math.cos(barA), sb = Math.sin(barA);
  for (i = 0; i < nBulge; i++) {
    if (rnd() < .55) { var bx = gauss() * .15, bz = gauss() * .055; x = (bx * cb - bz * sb) * nucleusScale; z = (bx * sb + bz * cb) * nucleusScale; }
    else { x = gauss() * .085 * nucleusScale; z = gauss() * .085 * nucleusScale; }
    y = gauss() * .045 * nucleusScale;
    r = Math.hypot(x, z); if (r > .6) { i--; continue; }
    a = Math.atan2(z, x); t = rnd(); bri = .28 + .62 * Math.pow(rnd(), .8);
    put(stars, r, a, y, bri, bri * (.7 + .2 * t), bri * (.42 + .3 * t), .3 + .4 * rnd());
  }
  /* Halo sphérique, très diffus */
  for (i = 0; i < nHalo; i++) {
    var u = rnd() * 2 - 1, th = rnd() * TAU, sq = Math.sqrt(1 - u * u), rr = .12 + 1.0 * Math.pow(rnd(), .7);
    x = sq * Math.cos(th) * rr; z = sq * Math.sin(th) * rr; y = u * rr * .8;
    r = Math.hypot(x, z); if (r > 1.15) { i--; continue; }
    bri = .1 + .18 * rnd();
    put(stars, r, Math.atan2(z, x), y, bri, bri * .82, bri * .62, .3);
  }
  /* Disque de fond : étoiles anciennes entre les bras */
  for (i = 0; i < nField; i++) {
    r = gammaR(.30, .03); a = rnd() * TAU; y = gauss() * .014 * (1 + r * 1.5);
    bri = .13 + .27 * rnd();
    put(stars, r, a, y, bri, bri * .9, bri * .74, .28 + .26 * rnd());
  }
  /* Amas jeunes : nœuds bleus brillants le long des bras + régions HII */
  var NC = 260, clusters = [], per = Math.max(1, Math.round(nCl / NC));
  for (i = 0; i < NC; i++) {
    r = gammaR(.34, .1); k = Math.floor(rnd() * arms);
    a = armTheta(r, k, arms, twist, turb) + gauss() * armSigma(r, turb) * .6;
    clusters.push([r, a]);
    for (var m = 0; m < per; m++) {
      var rr2 = r + gauss() * .008, aa = a + gauss() * .008 / (r + .02);
      t = rnd(); bri = .5 + .5 * rnd();
      put(stars, Math.max(.02, rr2), aa, gauss() * .006, bri * (.55 + .25 * t), bri * (.72 + .2 * t), bri, .34 + .36 * rnd());
    }
  }
  /* Étoiles des bras (le reste) */
  while (stars.n < N) {
    r = gammaR(.30, .04); k = Math.floor(rnd() * arms);
    a = armTheta(r, k, arms, twist, turb) + gauss() * armSigma(r, turb);
    r = Math.max(.02, r + gauss() * .01 * (1 + turb));
    y = gauss() * .012 * (1 + r * 1.2);
    t = rnd();
    if (rnd() < .03) { put(stars, r, a, y, .75, .88, 1.0, 1.0 + .6 * rnd()); continue; }
    bri = (.16 + .44 * rnd()) * (r < .15 ? .7 : 1);
    if (t < .62) put(stars, r, a, y, bri * (.62 + .2 * rnd()), bri * (.78 + .15 * rnd()), bri, .26 + .34 * rnd());
    else if (t < .82) put(stars, r, a, y, bri, bri * .95, bri * .88, .26 + .3 * rnd());
    else put(stars, r, a, y, bri, bri * .82, bri * .58, .26 + .3 * rnd());
  }

  /* Nébuleuses : halos roses (HII) et bleus (réflexion) autour des amas */
  for (i = 0; i < neb.cap; i++) {
    var cl, base = rnd() < .7;
    if (base) { cl = clusters[Math.floor(rnd() * clusters.length)]; r = cl[0] + gauss() * .012; a = cl[1] + gauss() * .012 / (cl[0] + .02); }
    else { r = gammaR(.34, .12); k = Math.floor(rnd() * arms); a = armTheta(r, k, arms, twist, turb) + gauss() * armSigma(r, turb) * .8; }
    t = rnd(); bri = .04 + .08 * rnd();
    if (t < .32) put(neb, r, a, gauss() * .006, bri * 1.0, bri * .26, bri * .5, 5 + 11 * rnd());
    else if (t < .86) put(neb, r, a, gauss() * .006, bri * .38, bri * .58, bri * 1.15, 5 + 12 * rnd());
    else put(neb, r, a, gauss() * .006, bri * 1.0, bri * .55, bri * .25, 5 + 9 * rnd());
  }

  /* Poussière : voiles sombres sur le bord intérieur des bras + anneau autour du bulbe */
  for (i = 0; i < dust.cap; i++) {
    if (rnd() < .09) { r = .05 + .12 * rnd(); a = rnd() * TAU; put(dust, r, a, gauss() * .006, .22 * rnd() + .06, 0, 0, 5 + 7 * rnd()); continue; }
    r = gammaR(.28, .1); if (r > .9) { i--; continue; }
    k = Math.floor(rnd() * arms); var sg = armSigma(r, turb);
    a = armTheta(r, k, arms, twist, turb) - .85 * sg + gauss() * sg * .55;
    put(dust, r, a, gauss() * .006, .08 + .24 * rnd(), 0, 0, 5 + 9 * rnd() + 7 * r);
  }
  return { stars: stars, neb: neb, dust: dust };
}

var PT_VERT = [
'attribute float aRad; attribute float aAng; attribute float aY; attribute float aSize; attribute float aSeed; attribute vec3 aColor;',
'uniform float uTime,uSpin,uR,uSizeScale,uPR,uBright,uTwinkle,uMinPS,uMaxPS;',
'varying vec3 vC; varying float vSeed;',
'float omega(float r){return uSpin*(1.0+0.35*(1.0-2.0*smoothstep(0.1,1.0,r)));}',
'void main(){',
'  float th=aAng+uTime*omega(aRad);',
'  vec3 p=vec3(cos(th)*aRad,aY,sin(th)*aRad)*uR;',
'  vec4 mv=modelViewMatrix*vec4(p,1.0);',
'  float dist=max(-mv.z,0.001);',
'  float ps=aSize*uSizeScale/dist;',
'  float fade=ps<uMinPS?(ps/uMinPS)*(ps/uMinPS):1.0;',
'  float nearF=smoothstep(0.4,4.0,dist);',
'  gl_PointSize=clamp(ps,uMinPS,uMaxPS)*uPR;',
'  float tw=1.0+uTwinkle*0.2*sin(uTime*(1.5+aSeed*4.0)+aSeed*40.0);',
'  vC=aColor*uBright*fade*nearF*tw;',
'  vSeed=aSeed;',
'  gl_Position=projectionMatrix*mv;',
'}'
].join('\n');

var STAR_FRAG = [
'varying vec3 vC; varying float vSeed;',
'void main(){ vec2 c=gl_PointCoord-0.5; float d=dot(c,c)*4.0; float a=exp(-d*3.5); gl_FragColor=vec4(vC*a,1.0); }'
].join('\n');

var NEB_FRAG = [
'varying vec3 vC; varying float vSeed;',
'void main(){',
'  vec2 c=gl_PointCoord-0.5; float d=dot(c,c)*4.0;',
'  float n=0.62+0.38*sin(c.x*11.0+vSeed*37.0)*sin(c.y*9.0+vSeed*19.0+c.x*3.0);',
'  float a=exp(-d*2.6)*n;',
'  gl_FragColor=vec4(vC*a,1.0);',
'}'
].join('\n');

var DUST_FRAG = [
'varying vec3 vC; varying float vSeed;',
'void main(){',
'  vec2 c=gl_PointCoord-0.5; float d=dot(c,c)*4.0;',
'  float n=0.6+0.4*sin(c.x*10.0+vSeed*29.0)*sin(c.y*8.0+vSeed*13.0+c.y*4.0);',
'  float a=vC.x*exp(-d*2.2)*n;',
'  gl_FragColor=vec4(0.004,0.002,0.010,a);',
'}'
].join('\n');

/* Lueur diffuse du disque : lumière des étoiles non résolues, modulée par la même loi de spirale */
var GLOW_VERT = [
'varying vec2 vP;',
'void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
].join('\n');
var GLOW_FRAG = [
'varying vec2 vP;',
'uniform float uTime,uSpin,uArms,uTwist,uTurb,uGlow,uR;',
'float omega(float r){return uSpin*(1.0+0.35*(1.0-2.0*smoothstep(0.1,1.0,r)));}',
'void main(){',
'  vec2 p=vP/uR; float r=length(p);',
'  if(r>1.2) discard;',
'  float th=atan(-p.y,p.x);',
'  float arm=uTwist*log(1.0+4.0*r)/log(5.0)+0.2*uTurb*sin(7.0*r);',
'  float ph=uArms*(th-uTime*omega(r)-arm);',
'  float a=pow(0.5+0.5*cos(ph),2.6);',
'  float disk=exp(-r/0.30);',
'  float bulge=exp(-r*r/(2.0*0.095*0.095))*1.3+0.55*exp(-r/0.13);',
'  float armAmp=a*exp(-r/0.40)*smoothstep(0.03,0.2,r);',
'  vec3 warm=vec3(1.0,0.72,0.42); vec3 blue=vec3(0.42,0.60,1.0);',
'  vec3 col=warm*(bulge*0.9+0.20*disk)+mix(warm*0.8,blue,smoothstep(0.08,0.4,r))*armAmp*0.55;',
'  col*=uGlow*(1.0-smoothstep(0.75,1.2,r));',
'  gl_FragColor=vec4(col,1.0);',
'}'
].join('\n');

/* Fond d'étoiles lointaines */
var BG_VERT = [
'attribute float aSize; attribute vec3 aColor; uniform float uPR; varying vec3 vC;',
'void main(){ vC=aColor; gl_PointSize=aSize*uPR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
].join('\n');
var BG_FRAG = [
'varying vec3 vC;',
'void main(){ float d=length(gl_PointCoord-0.5); float a=1.0-smoothstep(0.0,0.5,d); a*=a; gl_FragColor=vec4(vC*a,1.0); }'
].join('\n');

/* Passe finale : tonemapping filmique, vignette, grain */
var FINAL_VERT = [
'varying vec2 vUv;',
'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
].join('\n');
var FINAL_FRAG = [
'uniform sampler2D tDiffuse; uniform float uTime,uExposure; uniform vec2 uRes; varying vec2 vUv;',
'float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }',
'void main(){',
'  vec3 c=texture2D(tDiffuse,vUv).rgb;',
'  c=aces(c*uExposure);',
'  vec2 d=vUv-0.5;',
'  c*=1.0-dot(d,d)*0.8;',
'  float g=h21(vUv*uRes+fract(uTime)*91.7)-0.5;',
'  c+=g*0.02;',
'  gl_FragColor=vec4(c,1.0);',
'}'
].join('\n');

window.__G = { PT_VERT: PT_VERT, STAR_FRAG: STAR_FRAG, NEB_FRAG: NEB_FRAG, DUST_FRAG: DUST_FRAG, GLOW_VERT: GLOW_VERT, GLOW_FRAG: GLOW_FRAG, BG_VERT: BG_VERT, BG_FRAG: BG_FRAG, FINAL_VERT: FINAL_VERT, FINAL_FRAG: FINAL_FRAG, buildGalaxy: buildGalaxy };
(function () {
  'use strict';
  var DEG = Math.PI / 180;
  var stage = document.getElementById('stage');
  var labelsEl = document.getElementById('labels');
  var tabsEl = document.getElementById('tabs');
  var loadingEl = document.getElementById('loading');

  function fail(msg) { loadingEl.textContent = msg; loadingEl.classList.remove('done'); window.CodexScene.ok = false; }
  var Codex = window.Codex;
  var T = window.THREE;
  if (!T || !T.OrbitControls || !T.EffectComposer || !T.UnrealBloomPass || !T.ShaderPass) {
    fail("Impossible de charger le moteur 3D. Vérifiez votre connexion et rechargez la page."); return;
  }
  var renderer;
  try { renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
  catch (err) { fail("Votre navigateur ne permet pas d'afficher la 3D (WebGL indisponible)."); return; }

  var SECTIONS = {
    home:    { name: 'Accueil', sub: '', rgb: '185,164,255', text: '' },
    codex:   { name: 'Codex', sub: '', rgb: '255,214,150', text: "Le blog : articles et réflexions sur l’IA, la psychologie, la philosophie et l’esprit. Une étoile jaune au cœur d'un bras proche du centre." },
    blog:    { name: 'Système violet', sub: 'Exploration libre', rgb: '201,160,255', text: "Un système stellaire à explorer librement. Admirez son étoile violette et ses planètes, sans ouvrir de rubrique du site." },
    rubis:   { name: 'Système rubis', sub: 'Exploration libre', rgb: '255,91,105', text: "Un système rouge à explorer librement : une géante aux anneaux cuivrés, une planète bleue accompagnée de sa lune et un monde rocheux pourpre. Aucune rubrique associée." },
    atelier: { name: 'Atelier', sub: '', rgb: '255,157,77', text: "Le lieu où je range mes idées farfelues : la cryodynamique, Polaris et autres explorations. Une étoile orange, plus loin dans la spirale." },
    lab:     { name: 'Laboratoire', sub: 'Créations', rgb: '90,240,168', text: "La vitrine de mes créations : outils, personnalisations CSS et applications. Une étoile verte en bordure du disque." },
    dashb:   { name: 'Observatoire', sub: 'Cartes et données', rgb: '92,180,255', text: "Un espace d’exploration astronomique : cartes célestes, observations et données réelles. Une étoile bleue sur un bras jeune." },
    profil:  { name: 'Portrait', sub: "L'auteur", rgb: '230,236,255', text: "Parcours, passions, influences et fragments de pensée. Une exploration de l'esprit derrière CODEX MENTAL." }
  };
  /* Systèmes stellaires : r = rayon normalisé, k = bras */
  var SYS = [
    { id: 'codex',   r: .30, k: 0, col: 0xffe3b0, planets: [[1.7, .16, 0xc9b79c, .9], [2.8, .24, 0xe8c48a, .55], [4.0, .13, 0x9aa7c4, .32]] },
    { id: 'dashb',   r: .40, k: 1, col: 0x5cb4ff, planets: [[1.6, .14, 0x9ad0ff, 1.0], [2.7, .22, 0x2f6fd0, .6], [3.9, .18, 0xdbe9ff, .35]] },
    { id: 'blog',    r: .52, k: 2, col: 0xc9a0ff, planets: [[1.8, .2, 0xb990f0, .8], [3.0, .15, 0x6f5ac0, .5], [4.2, .26, 0xe0d0ff, .3]] },
    { id: 'atelier', r: .64, k: 3, col: 0xff9d4d, planets: [[1.6, .13, 0xc2612c, 1.0], [2.6, .2, 0xe8924f, .6], [3.8, .17, 0x7a3a22, .34]] },
    { id: 'lab',     r: .76, k: 0, col: 0x5af0a8, planets: [[1.7, .18, 0x3fd08f, .85], [2.9, .14, 0xb7f5d4, .5], [4.1, .22, 0x1f7a55, .3]] },
    { id: 'profil',  r: .88, k: 1, col: 0xe6ecff, planets: [[1.8, .15, 0xdfe6f8, .7], [3.0, .2, 0xaab4d4, .45], [4.2, .12, 0x8d98ba, .28]] },
    { id: 'rubis',   r: .68, k: 2, col: 0xff5368, planets: [[1.9, .31, 0xb74d42, .72], [3.15, .22, 0x304b9d, .48], [4.35, .17, 0x82365e, .31]] }
  ];

  /* ---------- Paramètres ---------- */
  var R = 100, SPIN = .014;
  var state = { pop: 100, arms: 4, twist: 9, nucleus: 50, turb: .75, glow: 1.35, speed: 1, quality: 'high', seed: 20241020 };
  // Préférences locales du laboratoire (propres à ce navigateur).
  var GAL_PREF_KEY = 'codex.galactique.settings.v1';
  var galRanges = { pop: [20, 200], arms: [2, 6], twist: [1, 9], nucleus: [0, 100], turb: [0, 1.5], glow: [0.4, 2], speed: [0, 5] };
  try {
    var savedGal = JSON.parse(localStorage.getItem(GAL_PREF_KEY) || 'null');
    if (savedGal && typeof savedGal === 'object') {
      Object.keys(galRanges).forEach(function (key) {
        var value = Number(savedGal[key]), range = galRanges[key];
        if (savedGal[key] !== undefined && savedGal[key] !== null && Number.isFinite(value) && value >= range[0] && value <= range[1]) state[key] = value;
      });
      if (['std', 'high', 'ultra'].includes(savedGal.quality)) state.quality = savedGal.quality;
      if (Number.isSafeInteger(savedGal.seed) && savedGal.seed >= 0) state.seed = savedGal.seed;
    }
  } catch (err) { /* Stockage indisponible : valeurs par défaut. */ }
  function saveGalSettings() {
    try { localStorage.setItem(GAL_PREF_KEY, JSON.stringify(state)); } catch (err) { /* Mode privé ou stockage bloqué. */ }
  }
  Object.keys(galRanges).forEach(function (key) {
    var input = document.getElementById(key);
    if (input) input.value = state[key];
  });
  document.getElementById('quality').value = state.quality;

  var QUAL = { std: { n: 80000, neb: 700, dust: 1800 }, high: { n: 160000, neb: 1300, dust: 3200 }, ultra: { n: 320000, neb: 2000, dust: 4800 } };
  var paused = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var simT = 0, last = performance.now();
  var W = 800, H = 600, PR = 1, mobile = false;

  /* ---------- Scène ---------- */
  var scene = new T.Scene(); scene.background = new T.Color(0x000000);
  var camera = new T.PerspectiveCamera(45, 1, 0.05, 6000);
  var canvas = renderer.domElement; canvas.id = 'cv'; canvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(canvas, stage.firstChild);
  var controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.enablePan = false; controls.zoomSpeed = .9; controls.rotateSpeed = .6;
  controls.minDistance = 4; controls.maxDistance = 800; controls.autoRotateSpeed = .35;
  var userTouched = false;
  controls.addEventListener('start', function () { userTouched = true; });
  var tanHalf = Math.tan(camera.fov * DEG / 2);
  var homeDist = 190;
  function homeCamPos() { var el = 38 * DEG; return new T.Vector3(0, Math.sin(el), Math.cos(el)).multiplyScalar(homeDist); }

  /* ---------- Fond : étoiles lointaines et petites galaxies ---------- */
  var skyGroup = new T.Group(); scene.add(skyGroup);
  var bgUniforms = { uPR: { value: 1 } };
  (function () {
    var N = 7000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = s * Math.cos(th) * 2500; pos[i * 3 + 1] = u * 2500; pos[i * 3 + 2] = s * Math.sin(th) * 2500;
      var b = .1 + .75 * Math.pow(Math.random(), 4), tmp = Math.random();
      col[i * 3] = (tmp < .5 ? .75 + tmp * .5 : 1) * b; col[i * 3 + 1] = (tmp < .5 ? .85 + tmp * .3 : 1 - (tmp - .5) * .3) * b; col[i * 3 + 2] = (tmp < .5 ? 1 : 1 - (tmp - .5) * 1.1) * b;
      size[i] = 1 + 2.2 * Math.pow(Math.random(), 8);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aColor', new T.BufferAttribute(col, 3)); g.setAttribute('aSize', new T.BufferAttribute(size, 1));
    var m = new T.ShaderMaterial({ uniforms: bgUniforms, vertexShader: BG_VERT, fragmentShader: BG_FRAG, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    var pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -2; skyGroup.add(pts);
  })();
  function canvasTex(draw) { var c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d')); return new T.CanvasTexture(c); }
  var smudgeTex = canvasTex(function (g) {
    g.translate(128, 128); g.scale(1, .42);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 120);
    gr.addColorStop(0, 'rgba(255,240,220,0.9)'); gr.addColorStop(.18, 'rgba(255,210,170,0.45)'); gr.addColorStop(.5, 'rgba(160,170,255,0.14)'); gr.addColorStop(1, 'rgba(120,140,255,0)');
    g.fillStyle = gr; g.fillRect(-128, -128 * 2.4, 256, 256 * 2.4);
  });
  for (var gi = 0; gi < 34; gi++) {
    var sm = new T.Sprite(new T.SpriteMaterial({ map: smudgeTex, color: new T.Color().setHSL(.55 + Math.random() * .15, .3, .75), blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: .12 + Math.random() * .28, rotation: Math.random() * 6.28 }));
    var uu = Math.random() * 2 - 1, tt = Math.random() * 6.28, ss = Math.sqrt(1 - uu * uu);
    sm.position.set(ss * Math.cos(tt) * 2300, uu * 2300, ss * Math.sin(tt) * 2300);
    var sc = 26 + Math.random() * 60; sm.scale.set(sc, sc, 1); sm.renderOrder = -1; skyGroup.add(sm);
  }

  /* ---------- Galaxie ---------- */
  var uni = {
    uTime: { value: 0 }, uSpin: { value: SPIN }, uR: { value: R }, uSizeScale: { value: 1000 }, uPR: { value: 1 }, uBright: { value: 1 }, uTwinkle: { value: 1 }, uMinPS: { value: 1.6 }, uMaxPS: { value: 26 }
  };
  function ptMaterial(frag, blending, extra) {
    var u = {}; Object.keys(uni).forEach(function (k) { u[k] = uni[k]; });   // uniformes partagés par référence
    Object.keys(extra || {}).forEach(function (k) { u[k] = { value: extra[k] }; });
    return new T.ShaderMaterial({ uniforms: u, vertexShader: PT_VERT, fragmentShader: frag, transparent: true, depthWrite: false, blending: blending });
  }
  var starMat = ptMaterial(STAR_FRAG, T.AdditiveBlending);
  var nebMat = ptMaterial(NEB_FRAG, T.AdditiveBlending, { uMinPS: 3, uMaxPS: 140, uTwinkle: 0 });
  var dustMat = ptMaterial(DUST_FRAG, T.NormalBlending, { uMinPS: 3, uMaxPS: 160, uTwinkle: 0, uBright: 1 });
  nebMat.uniforms.uBright = { value: 1 }; dustMat.uniforms.uBright = { value: 1 };
  var layers = { stars: null, neb: null, dust: null };

  function toGeometry(L) {
    var n = L.n, g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aRad', new T.BufferAttribute(L.rad.subarray(0, n), 1));
    g.setAttribute('aAng', new T.BufferAttribute(L.ang.subarray(0, n), 1));
    g.setAttribute('aY', new T.BufferAttribute(L.y.subarray(0, n), 1));
    g.setAttribute('aSize', new T.BufferAttribute(L.size.subarray(0, n), 1));
    g.setAttribute('aSeed', new T.BufferAttribute(L.seed.subarray(0, n), 1));
    g.setAttribute('aColor', new T.BufferAttribute(L.col.subarray(0, n * 3), 3));
    return g;
  }
  function setLayer(name, geo, mat, order) {
    if (layers[name]) { scene.remove(layers[name]); layers[name].geometry.dispose(); }
    var p = new T.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; scene.add(p); layers[name] = p;
  }
  function rebuild() {
    var q = QUAL[state.quality], pop = state.pop / 100;
    var G = buildGalaxy({ count: Math.round(q.n * pop), arms: state.arms, twist: state.twist, nucleus: state.nucleus, turb: state.turb, seed: state.seed, nebula: Math.round(q.neb * Math.min(1.4, pop)), dust: Math.round(q.dust * Math.min(1.4, pop)) });
    setLayer('neb', toGeometry(G.neb), nebMat, 2);
    setLayer('stars', toGeometry(G.stars), starMat, 3);
    setLayer('dust', toGeometry(G.dust), dustMat, 4);
    var c = G.stars.n;
    document.getElementById('countOut').textContent = (Math.round(c / 1000)) + ' k';
    document.getElementById('capText').textContent = 'Simulation procédurale · ' + c.toLocaleString('fr-FR') + ' étoiles';
    glowMat.uniforms.uArms.value = state.arms; glowMat.uniforms.uTwist.value = state.twist; glowMat.uniforms.uTurb.value = state.turb;
  }

  /* lueur diffuse (plan) + cœur */
  var glowMat = new T.ShaderMaterial({
    uniforms: { uTime: uni.uTime, uSpin: uni.uSpin, uR: uni.uR, uArms: { value: 4 }, uTwist: { value: 9 }, uTurb: { value: .75 }, uGlow: { value: 1 } },
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  });
  var glowPlane = new T.Mesh(new T.PlaneGeometry(R * 2.4, R * 2.4), glowMat);
  glowPlane.rotation.x = -Math.PI / 2; glowPlane.renderOrder = 1; scene.add(glowPlane);

  function glowTexture(rgb, a0) {
    return canvasTex(function (g) {
      var gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(' + rgb + ',' + a0 + ')'); gr.addColorStop(.2, 'rgba(' + rgb + ',' + (a0 * .42) + ')'); gr.addColorStop(.55, 'rgba(' + rgb + ',' + (a0 * .1) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    });
  }
  function glowSprite(tex, size, order) {
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.set(size, size, 1); sp.renderOrder = order || 2; return sp;
  }
  var coreA = glowSprite(glowTexture('255,214,160', .55), 46, 2), coreB = glowSprite(glowTexture('255,170,110', .22), 130, 2);
  scene.add(coreA); scene.add(coreB);
  function applyNucleus() { var scale = .45 + state.nucleus / 100 * 1.1; coreA.scale.set(46 * scale, 46 * scale, 1); coreB.scale.set(130 * scale, 130 * scale, 1); }
  applyNucleus();

  /* ---------- Systèmes stellaires (sections) ---------- */
  scene.add(new T.AmbientLight(0x303850, .5));
  var sysList = [], sysById = {};
  SYS.forEach(function (d) {
    var s = SECTIONS[d.id], group = new T.Group(); scene.add(group);
    var colr = new T.Color(d.col);
    var core = new T.Mesh(new T.SphereGeometry(.48, 24, 16), new T.MeshBasicMaterial({ color: d.col, toneMapped: false })); group.add(core);
    var rgb = s.rgb;
    var halo = glowSprite(glowTexture(rgb, .9), 11, 6); group.add(halo);
    var halo2 = glowSprite(glowTexture(rgb, .25), 26, 5); group.add(halo2);
    var light = new T.PointLight(d.col, 2.0, 38, 2); group.add(light);
    var tilt = new T.Group(); tilt.rotation.set((Math.random() - .5) * .8, Math.random() * 6.28, (Math.random() - .5) * .5); group.add(tilt);
    var planets = [], rings = [];
    d.planets.forEach(function (p, idx) {
      var m = new T.Mesh(new T.SphereGeometry(p[1], 20, 14), new T.MeshBasicMaterial({ color: p[2], toneMapped: false })); tilt.add(m);
      var pts = []; for (var i = 0; i < 96; i++) { var a = i / 96 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * p[0], 0, Math.sin(a) * p[0])); }
      var lm = new T.LineBasicMaterial({ color: d.col, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      var ln = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), lm); tilt.add(ln); rings.push(lm);
      if (d.id === 'rubis' && idx === 0) {
        // Anneaux planétaires, indépendants des orbites du système.
        var ring = new T.Mesh(
          new T.RingGeometry(p[1] * 1.38, p[1] * 2.15, 80),
          new T.MeshBasicMaterial({ color: 0xd8a278, side: T.DoubleSide, transparent: true, opacity: .83, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2.65;
        ring.rotation.y = .24;
        m.add(ring);
        var innerRing = new T.Mesh(
          new T.RingGeometry(p[1] * 1.16, p[1] * 1.33, 80),
          new T.MeshBasicMaterial({ color: 0xf0c6a0, side: T.DoubleSide, transparent: true, opacity: .68, depthWrite: false })
        );
        innerRing.rotation.copy(ring.rotation);
        m.add(innerRing);
      }
      var moon = null;
      if (d.id === 'rubis' && idx === 1) {
        moon = new T.Group();
        m.add(moon);
        var satellite = new T.Mesh(
          new T.SphereGeometry(.065, 14, 10),
          new T.MeshBasicMaterial({ color: 0xd9e3f2, toneMapped: false })
        );
        satellite.position.set(.43, 0, 0);
        moon.add(satellite);
      }
      planets.push({ mesh: m, rad: p[0], w: p[3], a: Math.random() * 6.28, moon: moon });
    });
    var hit = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ visible: false })); hit.userData.id = d.id; group.add(hit);
    var S = { id: d.id, def: d, group: group, planets: planets, rings: rings, hit: hit, halo: halo, halo2: halo2, pos: new T.Vector3(), rPx: 10 };
    sysList.push(S); sysById[d.id] = S;
  });

  function sysPosition(S, out) {
    var r = S.def.r, k = S.def.k % state.arms;
    var th = k * Math.PI * 2 / state.arms + state.twist * Math.log(1 + 4 * r) / Math.log(5) + .2 * state.turb * Math.sin(7 * r) + simT * omegaAt(r, SPIN);
    return out.set(Math.cos(th) * r * R, 0, Math.sin(th) * r * R);
  }
  function omegaAt(r, spin) { var t = Math.min(1, Math.max(0, (r - .1) / .9)); t = t * t * (3 - 2 * t); return spin * (1 + .35 * (1 - 2 * t)); }

  /* ---------- Post-traitement ---------- */
  var composer, bloom, finalPass, finalUniforms, customRT = false;
  (function () {
    var rt = null;
    try {
      if (renderer.capabilities.isWebGL2) rt = new T.WebGLRenderTarget(800, 600, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: T.HalfFloatType });
    } catch (e) { rt = null; }
    customRT = !!rt;
    composer = rt ? new T.EffectComposer(renderer, rt) : new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, camera));
    bloom = new T.UnrealBloomPass(new T.Vector2(800, 600), .75, .95, .9);
    composer.addPass(bloom);
    finalPass = new T.ShaderPass({ uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1 }, uRes: { value: new T.Vector2(800, 600) } }, vertexShader: FINAL_VERT, fragmentShader: FINAL_FRAG });
    finalPass.renderToScreen = true; finalUniforms = finalPass.uniforms; composer.addPass(finalPass);
  })();

  /* ---------- Interface ---------- */
  var els = {}, tabButtons = {};
  // numéros de catalogue façon Messier/NGC (catalogue « CM », celui de Codex Mental) : le nom se déplie au survol
  var CAT = { codex: 'CM 1', profil: 'CM 13', atelier: 'CM 31', lab: 'CM 42', dashb: 'CM 57', blog: 'CM 64', rubis: 'CM 81' };
  SYS.forEach(function (d) {
    var s = SECTIONS[d.id], el = document.createElement('div');
    el.className = 'pl right';
    el.innerHTML = '<button class="hit" type="button" aria-label="' + s.name + '"></button><span class="lbl">' + '<b>' + (CAT[d.id] ? '<span class="cx-nm"><span class="cx-sci sym">' + CAT[d.id] + '</span><span class="cx-plain">' + s.name + '</span></span>' : s.name) + '</b></span>';
    labelsEl.appendChild(el);
    var h = el.querySelector('.hit');
    h.addEventListener('focus', function () { hover = d.id; }); h.addEventListener('blur', function () { if (hover === d.id) hover = null; });
    h.addEventListener('click', function () { select(d.id); });
    els[d.id] = el;
  });
  ['home', 'codex', 'blog', 'rubis', 'atelier', 'lab', 'dashb', 'profil'].forEach(function (id) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = SECTIONS[id].name;
    b.addEventListener('click', function () { select(id === 'home' ? null : id); });
    tabsEl.appendChild(b); tabButtons[id] = b;
  });

  /* ---------- Lecteur : délégué à l'interface commune (Codex.reader) ---------- */
  var readerOpen = false;
  function openSharedReader(id) { if (!id) return; readerOpen = true; Codex.reader.open(id); }
  function closeSharedReader() { if (readerOpen) { readerOpen = false; Codex.reader.close({ silent: true }); } }
  // fermeture demandée par le lecteur (croix, Échap) : retour à la vue d'ensemble de la galaxie
  Codex.on('reader:close', function () { readerOpen = false; select(null); });
  // La barre commune demande une rubrique : la caméra vole vers son système, puis le lecteur s'ouvre.
  Codex.on('navigate', function (e) {
    if (e.direct) { if (!e.id) { closeSharedReader(); select(null); } return; }
    select(e.id);
  });
  var hover = null, selected = null, flight = null, lastSel = new T.Vector3();
  var tmpV = new T.Vector3(), ZERO = new T.Vector3();
  function select(id) {
    // Même parcours que l'Héliosphère : fermer le lecteur avant le vol vers une autre rubrique.
    // L'iframe ne doit pas rester visible au-dessus de la galaxie pendant la transition.
    closeSharedReader();
    document.getElementById("card").classList.remove("gal-card-dismissed");
    selected = id;
    var key = id || 'home', s = SECTIONS[key];
    Object.keys(tabButtons).forEach(function (k) { tabButtons[k].setAttribute('aria-current', k === key ? 'true' : 'false'); });
    stage.classList.toggle('sel', !!id);
    if (id) {
      document.getElementById('cardTitle').textContent = s.name + (s.sub ? ' · ' + s.sub : '');
      document.getElementById('cardText').textContent = s.text;
      document.getElementById('cardDot').style.setProperty('--c', 'rgb(' + s.rgb + ')');
    } else { userTouched = false; }
    Codex.emit('nav:active', id);
    startFlight(id);
  }
  document.getElementById('back').addEventListener('click', function () { select(null); });
  document.getElementById('cardDismiss').addEventListener('click', function () { document.getElementById('card').classList.add('gal-card-dismissed'); });
  function camOffsetFor(S) {
    var out = new T.Vector3(S.pos.x, 0, S.pos.z); if (out.lengthSq() < 1e-6) out.set(1, 0, 0); out.normalize();
    var tan = new T.Vector3(-out.z, 0, out.x);
    return out.multiplyScalar(.45).addScaledVector(tan, .55).add(new T.Vector3(0, .5, 0)).normalize().multiplyScalar(16);
  }
  function startFlight(id, dur, fromOff) {
    flight = { t: 0, dur: dur || 3, id: id, fromOff: fromOff || camera.position.clone().sub(controls.target), fromTgt: controls.target.clone() };
    controls.enabled = false; controls.autoRotate = false;
    controls.minDistance = id ? 3 : 4;
  }
  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  var qI = new T.Quaternion(), qT = new T.Quaternion(), vDir = new T.Vector3(), vTo = new T.Vector3();
  function stepCamera(dt) {
    var S = selected ? sysById[selected] : null;
    if (flight) {
      flight.t += dt;
      var k = Math.min(1, flight.t / flight.dur), e = ease(k), tgt, toOff;
      if (flight.id) { var Q = sysById[flight.id]; tgt = Q.pos; toOff = camOffsetFor(Q); } else { tgt = ZERO; toOff = homeCamPos(); }
      var lf = flight.fromOff.length(), lt = toOff.length();
      vDir.copy(flight.fromOff).normalize(); vTo.copy(toOff).normalize();
      qT.setFromUnitVectors(vDir, vTo); qI.identity().slerp(qT, e);
      vDir.applyQuaternion(qI).multiplyScalar(Math.exp(Math.log(lf) + (Math.log(lt) - Math.log(lf)) * e));
      controls.target.lerpVectors(flight.fromTgt, tgt, e);
      camera.position.copy(controls.target).add(vDir);
      if (k >= 1) { flight = null; controls.enabled = true; if (S) {lastSel.copy(S.pos);if(selected!=='blog' && selected!=='rubis')openSharedReader(selected);} }
    } else if (S) {
      tmpV.copy(S.pos).sub(lastSel); camera.position.add(tmpV); controls.target.copy(S.pos); lastSel.copy(S.pos);
    }
    controls.autoRotate = !selected && !flight && !userTouched && !paused;
  }

  /* picking */
  var ray = new T.Raycaster(), ndc = new T.Vector2(), pointerIn = false, needPick = false, downX = 0, downY = 0, lastPX = 0, lastPY = 0;
  var hitMeshes = sysList.map(function (S) { return S.hit; });
  function pickAt(cx, cy) {
    var r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var h = ray.intersectObjects(hitMeshes, false);
    return h.length ? h[0].object.userData.id : null;
  }
  canvas.addEventListener('pointermove', function (e) { pointerIn = true; needPick = true; lastPX = e.clientX; lastPY = e.clientY; });
  canvas.addEventListener('pointerleave', function () { pointerIn = false; hover = null; canvas.classList.remove('over'); });
  canvas.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('pointerup', function (e) {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    var id = pickAt(e.clientX, e.clientY); if (id) select(id);
  });

  /* réglages */
  var rebuildTimer = 0;
  function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuild, 90); }
  function bind(id, fmt, fn) {
    var inp = document.getElementById(id), out = document.getElementById(id + 'Out');
    function upd() { var v = parseFloat(inp.value); out.textContent = fmt(v); fn(v); saveGalSettings(); }
    inp.addEventListener('input', upd); out.textContent = fmt(parseFloat(inp.value));
  }
  bind('pop', function (v) { return v + ' %'; }, function (v) { state.pop = v; scheduleRebuild(); });
  bind('arms', function (v) { return String(v); }, function (v) { state.arms = v; scheduleRebuild(); });
  bind('twist', function (v) { return v.toFixed(1); }, function (v) { state.twist = v; scheduleRebuild(); });
  bind('nucleus', function (v) { return v + ' %'; }, function (v) { state.nucleus = v; applyNucleus(); scheduleRebuild(); });
  bind('turb', function (v) { return v.toFixed(2); }, function (v) { state.turb = v; scheduleRebuild(); });
  bind('glow', function (v) { return v.toFixed(2); }, function (v) { state.glow = v; applyGlow(); });
  bind('speed', function (v) { return v + '×'; }, function (v) { state.speed = v; });
  function applyGlow() {
    uni.uBright.value = state.glow; nebMat.uniforms.uBright.value = state.glow; glowMat.uniforms.uGlow.value = state.glow;
    finalUniforms.uExposure.value = .85 * (.7 + .3 * state.glow);
  }
  var qSel = document.getElementById('quality');
  qSel.addEventListener('change', function () { state.quality = qSel.value; saveGalSettings(); resize(); rebuild(); });
  var pauseBtn = document.getElementById('pause');
  function syncPause() { pauseBtn.textContent = paused ? 'Lecture' : 'Pause'; }
  pauseBtn.addEventListener('click', function () { paused = !paused; syncPause(); });
  document.getElementById('reset').addEventListener('click', function () { select(null); });
  document.getElementById('reseed').addEventListener('click', function () { state.seed = Math.floor(Math.random() * 1e9); saveGalSettings(); rebuild(); });
  var panel = document.getElementById('panel'), ptog = document.getElementById('panelToggle');
  ptog.addEventListener('click', function () { var c = panel.classList.toggle('closed'); ptog.setAttribute('aria-expanded', String(!c)); ptog.textContent = '⚙'; });

  // Close floating menus when interacting outside; keep the compact lab header visible.
  var themeMenu = panel.querySelector('.gal-theme-menu');
  function closeLabSettings() {
    if (!panel.classList.contains('closed')) {
      panel.classList.add('closed');
      ptog.setAttribute('aria-expanded', 'false');
      ptog.textContent = '⚙';
    }
  }
  document.addEventListener('pointerdown', function (event) {
    if (themeMenu && themeMenu.open && !themeMenu.contains(event.target)) themeMenu.open = false;
    if (!panel.contains(event.target)) closeLabSettings();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (themeMenu && themeMenu.open) themeMenu.open = false;
      closeLabSettings();
    }
  });
  if (themeMenu) themeMenu.addEventListener('toggle', function () {
    if (themeMenu.open) closeLabSettings();
  });


  /* ---------- Taille ---------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(280, Math.round(r.width)); H = Math.max(300, Math.round(r.height));
    mobile = W < 640;
    PR = CodexPx(state.quality === 'std' ? 1 : 2);
    renderer.setPixelRatio(PR); renderer.setSize(W, H, false);
    if (customRT) composer.setSize(W * PR, H * PR); else { composer.setPixelRatio(PR); composer.setSize(W, H); }
    finalUniforms.uRes.value.set(W * PR, H * PR);
    uni.uPR.value = PR; bgUniforms.uPR.value = PR;
    uni.uSizeScale.value = H / (2 * tanHalf);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    homeDist = Math.min(640, Math.max(190, 340 / Math.max(camera.aspect, .45)));
    if (!resize.once) { resize.once = true; }
  }
  var rto = 0;
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rto); rto = setTimeout(resize, 80); }).observe(stage);

  /* ---------- Boucle ---------- */
  var v3 = new T.Vector3(), camSpace = new T.Vector3(), firstFrame = true;
  function frame(now) {
    (window.CodexRaf||requestAnimationFrame)(frame);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var sdt = paused ? 0 : dt * state.speed;
    simT += sdt;
    uni.uTime.value = simT;

    sysList.forEach(function (S) {
      sysPosition(S, S.pos); S.group.position.copy(S.pos);
      S.planets.forEach(function (p) { p.a += p.w * sdt * 2; p.mesh.position.set(Math.cos(p.a) * p.rad, 0, Math.sin(p.a) * p.rad); if (p.moon) p.moon.rotation.y += sdt * 1.25; });
    });
    scene.updateMatrixWorld(true);
    stepCamera(dt);
    controls.update();
    skyGroup.position.copy(camera.position);

    if (needPick && pointerIn && !flight) { needPick = false; var id = pickAt(lastPX, lastPY); hover = id; canvas.classList.toggle('over', !!id); }

    camera.updateMatrixWorld();
    var camLen = camera.position.length();
    sysList.forEach(function (S) {
      var dist = camera.position.distanceTo(S.pos);
      var pxPerUnit = H / (2 * tanHalf * dist);
      S.rPx = 5 * pxPerUnit;
      S.hit.scale.setScalar(Math.max(1.4, 20 / Math.max(pxPerUnit, .001)));
      var vis = 1 - Math.min(1, Math.max(0, (dist - 18) / 40));   // orbites visibles de près
      S.rings.forEach(function (lm) { lm.opacity += ((.22 + vis * .32) - lm.opacity) * .1; });
      S.halo.material.opacity = 1;
      S.halo2.material.opacity = .85;
    });

    sysList.forEach(function (S) {
      var el = els[S.id];
      camSpace.copy(S.pos).applyMatrix4(camera.matrixWorldInverse);
      var behind = camSpace.z > 0;
      v3.copy(S.pos).project(camera);
      var x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
      var rp = Math.min(Math.max(S.rPx, 7), 46);
      var cls = mobile ? 'below' : (x > W - 190 ? 'left' : 'right');
      var hid = behind || x < -40 || x > W + 40 || y < -40 || y > H + 40;
      var full = 'pl ' + cls + (selected === S.id ? ' active' : '') + (hover === S.id ? ' hov' : '') + (selected && selected !== S.id ? ' dim' : '') + (hid ? ' hid' : '');
      if (el.className !== full) el.className = full;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.setProperty('--s', rp.toFixed(1) + 'px');
      el.style.setProperty('--hit', Math.max(30, rp * 2 + 8).toFixed(1) + 'px');
    });

    finalUniforms.uTime.value = now / 1000;
    composer.render();
    if (firstFrame) { firstFrame = false; setTimeout(function () { loadingEl.classList.add('done'); }, 150); }
  }

  /* ---------- Démarrage ---------- */
  if (window.innerWidth < 640 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) { state.quality = 'std'; qSel.value = 'std'; } else { qSel.value = state.quality; }
  resize();
  applyGlow(); syncPause(); rebuild();
  select(null);
  /* ouverture : on arrive de loin */
  camera.position.copy(homeCamPos()).multiplyScalar(2.3); controls.target.copy(ZERO);
  startFlight(null, 3.6, camera.position.clone());
  Codex.on('perf', function () { resize(); });
  (window.CodexRaf||requestAnimationFrame)(function (t) { last = t; frame(t); });
})();
