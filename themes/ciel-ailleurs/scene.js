/* Thème Ciel d'ailleurs — un ciel vu depuis la terre ferme : heure réelle, aurores, planète à anneaux, lune. WebGL (un seul shader). */
(function () {
  'use strict';
  var Codex = window.Codex, cv = document.getElementById('ca-cv'), gl = null;
  try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (e) {}
  if (!gl) { window.CodexScene = { ok: false }; return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var W = 0, H = 0, dpr = 1;

  /* ---------- réglages mémorisés ---------- */
  var KEY = 'codex.ailleurs', cfg = { mode: 'live', hour: 22, aur: 1 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { cfg.mode = /^(live|cycle|manual)$/.test(sv.mode) ? sv.mode : 'live'; cfg.hour = clamp(+sv.hour || 22, 0, 24); cfg.aur = clamp(isNaN(+sv.aur) ? 1 : +sv.aur, 0, 1.6); } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  var qh = /[?&]hour=(\d+(?:\.\d+)?)/.exec(location.search); if (qh) { cfg.mode = 'manual'; cfg.hour = clamp(+qh[1], 0, 24); }

  /* ---------- le soleil, d'après l'heure et la date (latitude 48°) ---------- */
  var LAT = 48 * Math.PI / 180;
  function sunVec(hour) {
    var now = new Date(), N = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    var dec = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365), Hh = (hour - 12) * 15 * Math.PI / 180;
    var sa = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(Hh), alt = Math.asin(clamp(sa, -1, 1));
    var sinA = -Math.cos(dec) * Math.sin(Hh) / Math.max(.0001, Math.cos(alt)), cosA = (Math.sin(dec) - Math.sin(LAT) * sa) / Math.max(.0001, Math.cos(LAT) * Math.cos(alt));
    var A = Math.atan2(sinA, cosA) - Math.PI;   // on regarde vers le sud : le soleil se lève à gauche
    return [Math.sin(A) * Math.cos(alt), Math.sin(alt), Math.cos(A) * Math.cos(alt)];
  }

  /* ---------- le ciel à 360° : chaque astre a une direction fixe (azimut, élévation, rayon) ---------- */
  var BODY = {
    giant:  { az: .50,  el: .36, r: .10 },   // Codex
    moon:   { az: 2.05, el: .52, r: .040 },  // Atelier
    blue:   { az: -1.75, el: .30, r: .034 }, // Laboratoire
    star:   { az: 3.0,  el: .58, r: .01 },   // Observatoire
    aurora: { az: -.12, el: .24, r: .01 },   // Portrait
    mars:   { az: -.95, el: .46, r: .02 },
    gmoon:  { az: .78,  el: .47, r: .011 },
    galaxy: { az: 1.15, el: .66, r: .1 },
    neb:    { az: -2.55, el: .46, r: .16 },
    comet:  { az: 2.55, el: .30, r: .05 }
  };
  /* chaque visite tire un ciel un peu différent : positions, teintes, phase de la lune, aurores */
  var qs = /[?&]seed=(\d+)/.exec(location.search), seed = qs ? +qs[1] : Math.floor(Math.random() * 4294967296);
  function rnd() { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function jit(b, da, de) { b.az += (rnd() - .5) * 2 * da; b.el = clamp(b.el + (rnd() - .5) * 2 * de, .14, .8); }
  jit(BODY.giant, .10, .04); jit(BODY.moon, .12, .05); jit(BODY.blue, .12, .04); jit(BODY.star, .15, .06);
  var AUR_OFF = (rnd() - .5) * .5; BODY.aurora.az += AUR_OFF;
  jit(BODY.mars, .35, .06); jit(BODY.galaxy, .45, .08); jit(BODY.neb, .4, .06); jit(BODY.comet, .6, .08);
  var RND = [rnd(), rnd(), rnd(), rnd()];
  var MENU = [
    ['codex', 'Codex', '#f0d9a8', 'giant', 'Articles et réflexions'],
    ['atelier', 'Atelier', '#e8ecf5', 'moon', 'Créations, théories, hypothèses'],
    ['lab', 'Laboratoire', '#9ad8ff', 'blue', 'Applications et projets en construction'],
    ['dashb', 'Observatoire', '#c9d8ff', 'star', 'Observations, cartes et explorations'],
    ['profil', 'Portrait', '#7fe6b0', 'aurora', 'Parcours, passions et aspirations']
  ];
  function dirOf(b) { var c = Math.cos(b.el); return [Math.sin(b.az) * c, Math.sin(b.el), Math.cos(b.az) * c]; }
  function glslVec(n, b) { var d = dirOf(b); return 'const vec3 ' + n + ' = vec3(' + d.map(function (x) { return x.toFixed(5); }).join(',') + ');\n'; }
  var CONSTS = glslVec('P_GIANT', BODY.giant) + glslVec('P_MOON', BODY.moon) + glslVec('P_BLUE', BODY.blue) + glslVec('P_STAR', BODY.star) + glslVec('P_MARS', BODY.mars) + glslVec('P_GAL', BODY.galaxy) + glslVec('P_NEB', BODY.neb) + glslVec('P_COMET', BODY.comet) +
    'const float R_GIANT = ' + BODY.giant.r + '; const float R_MOON = ' + BODY.moon.r + '; const float R_BLUE = ' + BODY.blue.r + '; const float R_MARS = ' + BODY.mars.r + '; const float R_GMOON = ' + BODY.gmoon.r + ';\n';

  var FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT, uYaw, uPitch, uZoom, uShift, uAur, uAurAz; uniform vec3 uSun; uniform vec4 uRnd;
` + CONSTS + `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ return vec3(h31(p), h31(p + 17.3), h31(p + 41.7)); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1., 0., 0.)), f.x), mix(h31(i + vec3(0., 1., 0.)), h31(i + vec3(1., 1., 0.)), f.x), f.y),
             mix(mix(h31(i + vec3(0., 0., 1.)), h31(i + vec3(1., 0., 1.)), f.x), mix(h31(i + vec3(0., 1., 1.)), h31(i + vec3(1., 1., 1.)), f.x), f.y), f.z); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * vn(p); p = p * 2.03 + vec2(5.2, 1.3); a *= .5; } return v; }
float fbm3(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 3; i++) { v += a * vn(p); p = p * 2.03 + vec2(5.2, 1.3); a *= .5; } return v; }
float fbmS(vec3 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * vn3(p); p = p * 2.07 + vec3(3.1, 1.7, 5.3); a *= .5; } return v; }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
vec2 tang(vec3 d, vec3 c, out float facing){
  facing = dot(d, c); vec3 t1 = normalize(cross(vec3(0., 1., 0.), c)); vec3 t2 = cross(c, t1);
  return vec2(dot(d, t1), dot(d, t2)) / max(facing, .001);
}
// cratères : hauteur d'un sol lunaire
float craters(vec2 p){
  float h = 0.;
  for (int k = 0; k < 3; k++) {
    float sc = 4. * pow(2.1, float(k)); vec2 g = p * sc, gi = floor(g), gf = fract(g);
    vec2 c = vec2(h21(gi + float(k) * 7.), h21(gi + 3. + float(k) * 5.)) * .6 + .2; float rd = .18 + .2 * h21(gi + 9.);
    float dd = length(gf - c) / rd;
    h -= (1. - smoothstep(0., 1., dd)) * .5 / (1. + float(k)) * step(.45, h21(gi + 1.5));
    h += smoothstep(.85, 1., dd) * smoothstep(1.35, 1., dd) * .22 / (1. + float(k)) * step(.45, h21(gi + 1.5));
  }
  return h;
}

float sE;   // élévation du soleil
float day, twiS, night, twi, aurK, pv;
vec3 drift(vec3 v){ float a = uT * .0003 + uRnd.z * 6.; vec3 k = normalize(vec3(.1, .75, .65)); return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1. - cos(a)); }
vec3 skyBase(vec3 d, float day, float twiS, float twi){
  vec3 zen = mix(mix(vec3(.003, .006, .02), vec3(.07, .1, .27), twiS), vec3(.13, .33, .74), day);
  vec3 hor = mix(mix(vec3(.01, .018, .04), vec3(.55, .3, .32), twiS), vec3(.64, .79, .95), day);
  vec3 col = mix(zen, hor, pow(1. - clamp(d.y, 0., 1.), 3.2));
  float cs = dot(d, uSun);
  vec3 sunCol = mix(vec3(1., .55, .28), vec3(1., .93, .8), smoothstep(0., .5, sE));
  float vis = smoothstep(-.32, -.02, sE);
  col += sunCol * (pow(max(cs, 0.), 7.) * .32 + pow(max(cs, 0.), 110.) * 1.4) * vis;
  col += vec3(1., .42, .22) * twi * exp(-abs(d.y) * 5.5) * (.25 + .75 * pow(max(cs, 0.) * .5 + .5, 3.)) * .75;
  col += vec3(.45, .25, .5) * twi * exp(-abs(d.y - .25) * 3.) * .12;
  col += vec3(1., .96, .88) * smoothstep(.99955, .99985, cs) * 9. * step(-.03, sE) * step(0., d.y);
  return col;
}
vec3 aurora(vec3 d){
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1., 1.)); vec3 ac = vec3(0.);
  float a0 = az + .14 - uAurAz;
  float env0 = smoothstep(1.2, .15, abs(a0));
  if (abs(a0) > 1.75) return ac;
  for (int k = 0; k < 2; k++) {
    float fk = float(k); float a = a0 - fk * .5;
    float base = .17 + .09 * sin(a * 2.3 + uT * .05 + fk * 2.) + .045 * sin(a * 5.2 - uT * .08 + fk) + .015 * sin(a * 11. + uT * .2);
    float h = el - base - fk * .1;
    float rays = fbm3(vec2(a * 15. + fk * 5., uT * .05 + fk * 3.)); float rb = fbm3(vec2(a * 44., uT * .12));
    float streak = .15 + 1.5 * pow(rays, 2.2) + .45 * rb * rays;
    float prof = smoothstep(-.012, .0, h) * exp(-max(h, 0.) * (6. + 3. * fk)) * smoothstep(.8, .3, h);
    float env = smoothstep(1.1, .15, abs(a)) * (.55 + .6 * fbm3(vec2(a * 3. + fk * 9., uT * .02)));
    vec3 c = mix(vec3(.12, 1., .5), vec3(.5, .3, .95), smoothstep(.12, .5, h)); c = mix(c, vec3(1., .3, .6), smoothstep(.45, .8, h) * .8);
    ac += c * prof * streak * env * (.95 - .4 * fk);
  }
  ac += vec3(.04, .3, .17) * exp(-abs(el - .17) * 5.) * smoothstep(1.2, .2, abs(a0)) * .14;
  return ac * .62;
}

vec3 skyFull(vec3 d){
  vec3 col;
  // --- ciel
  col = skyBase(d, day, twiS, twi);
  // --- étoiles, Voie lactée, objets du ciel profond
  float nf = night * smoothstep(-.01, .12, d.y);
  if (nf > .01) {
    vec3 tn; vec3 dO = d; d = drift(dO); float twk = exp(-max(dO.y, 0.) * 8.);
    vec3 sc = d * 64.; vec3 si = floor(sc); vec3 rc = h33(si); float st = 0.;
    if (rc.x > .93) { float r = length(fract(sc) - (.25 + .5 * rc.yzx).xyz * vec3(1.) ) ; r = length(fract(sc) - (.2 + .6 * rc.yzx)); st = pow((rc.x - .93) / .07, 2.2) * smoothstep(.2, .0, r) * max(.75 + (.25 + .6 * twk) * sin(uT * (1. + rc.y * 5.) + rc.z * 60.), 0.); }
    vec3 sc2 = d * 170.; vec3 si2 = floor(sc2); vec3 rc2 = h33(si2 + 9.); float st2 = 0.;
    if (rc2.x > .9) st2 = smoothstep(.3, .0, length(fract(sc2) - (.2 + .6 * rc2.yzx))) * (.25 + .5 * rc2.z);
    tn = mix(vec3(.65, .78, 1.), vec3(1., .82, .62), rc.z); tn += twk * .4 * vec3(sin(uT * 7. + rc.z * 40.), sin(uT * 8.3 + rc.y * 30.), 0.);
    // Voie lactée : bande inclinée, noyau, poussières
    vec3 nb = normalize(vec3(.35, .75, .45)); float bd = dot(d, nb); float band = exp(-bd * bd * 11.);
    vec3 gc = normalize(vec3(-.55, .1, .82) - nb * dot(vec3(-.55, .1, .82), nb)); float core = exp(-pow(acos(clamp(dot(d, gc), -1., 1.)), 2.) * 1.6);
    float mn = fbmS(d * 6.), lane = smoothstep(.46, .72, fbmS(d * 11. + 7.));
    vec3 milky = mix(vec3(.45, .52, .8), vec3(1., .78, .55), core) * band * (.18 + .9 * mn + 1.1 * core) * (1. - .75 * lane * band);
    float dust = (1. - smoothstep(.45, .8, vn3(d * 90.))) * band * .12;
    col += (tn * (st * 1.7 + st2) + milky * .3 + vec3(.5, .6, .9) * dust * .2) * nf;
    // airglow vert très faible près de l'horizon
    col += vec3(.015, .05, .03) * exp(-dO.y * 9.) * night * .6;
    // galaxie lointaine : spirale inclinée (bulbe, bras, voile de poussière, étoiles d'avant-plan)
    { float fc; vec2 q = tang(d, P_GAL, fc) / .095; q = rot(q, .62);
      float rho = length(q);
      if (fc > 0. && rho < 3.4) {
        vec2 f2 = vec2(q.x, q.y / .42);                        // plan du disque vu sous ~65°
        float r = length(f2), th = atan(f2.y, f2.x);
        float disk = exp(-r * 1.05) * smoothstep(3.2, 1.6, r);
        float spiral = .5 + .5 * cos(2. * (th - 1.9 * log(r + .12)) + .6 * fbm3(f2 * 2.));
        float arms = mix(.55, 1.25, pow(spiral, 1.6)) * smoothstep(.25, 1., r);
        float bulge = exp(-r * r * 3.6) * 1.6 + exp(-r * 6.) * .9;
        float clump = .75 + .5 * fbm3(f2 * 5. + 3.);
        float dustL = smoothstep(.32, .0, abs(q.y * 1.1 - .035 * q.x * q.x * 0. + .03 * (fbm3(vec2(q.x * 3., 4.)) - .5))) * smoothstep(2.6, .4, abs(q.x)) * (1. - .5 * exp(-r * r * 4.));
        float g = (disk * arms * clump + bulge) * (1. - .7 * dustL);
        vec3 gc = mix(vec3(.62, .68, 1.), vec3(1., .86, .66), smoothstep(.1, 1.1, bulge + .2 * exp(-r)));
        col += gc * g * .34 * nf;
        } }
    // nébuleuse en émission
    { float fc; vec2 q = tang(d, P_NEB, fc) / .16; float r = length(q);
      if (fc > 0. && r < 2.2) { float n1 = fbm(q * 2.4 + 3.), n2 = fbm(q * 5. - n1 * 2. + 8.); float m = smoothstep(.28, .8, n1) * smoothstep(2.2, .5, r);
        vec3 nc = mix(mix(vec3(.9, .2, .45), vec3(.95, .5, .2), step(.55, uRnd.w) * (.5 + .5 * uRnd.w)), mix(vec3(.15, .6, .75), vec3(.3, .35, .95), step(.55, uRnd.w)), smoothstep(.35, .75, n2)); nc = mix(nc, vec3(1., .75, .85), smoothstep(.7, .95, n2) * .6);
        col += nc * m * (.25 + .75 * n2) * .5 * nf; col *= 1. - .5 * smoothstep(.55, .75, fbm(q * 6. + 20.)) * m * .6; } }
    // comète : noyau, coma, queue ionique (droite, bleutée) et queue de poussière (courbe, dorée)
    { float fc; vec2 q = tang(d, P_COMET, fc) / .05;
      if (fc > .97) { float r = length(q); vec2 td = normalize(vec2(-.35, .94)); float along = dot(q, td), perp = dot(q, vec2(-td.y, td.x));
        float gate = smoothstep(.97, .995, fc);
        float coma = exp(-r * r * 2.2) * .9 + exp(-r * 3.4) * .45 + exp(-r * 22.) * 1.4;
        float fl = .55 + .45 * fbm3(vec2(along * 1.3, perp * 2.2));
        float ion = smoothstep(-.5, .4, along) * exp(-max(along, 0.) * .55) * exp(-pow(perp / (.14 + max(along, 0.) * .05), 2.)) * fl;
        float pc = perp - .06 * along * along * .12 - .2 * along;
        float dust = smoothstep(-.3, .5, along) * exp(-max(along, 0.) * .36) * exp(-pow((perp - .12 * along * (1. + .12 * along)) / (.3 + max(along, 0.) * .16), 2.)) * (.6 + .4 * fl);
        col += (vec3(.65, .85, 1.) * (coma * .9 + ion * .45) + vec3(1., .85, .6) * dust * .22) * gate * nf; } }
    // étoiles filantes
    { float tt = uT * .2; float id = floor(tt), f = fract(tt); float on = step(.55, h21(vec2(id, 4.)));
      vec3 sd = normalize(vec3(h21(vec2(id, 1.)) * 2. - 1., .35 + .5 * h21(vec2(id, 2.)), h21(vec2(id, 3.)) * 2. - 1.));
      vec3 dr = normalize(cross(sd, normalize(vec3(h21(vec2(id, 6.)) - .5, 1., h21(vec2(id, 7.)) - .5)))); dr = normalize(dr - vec3(0., .5, 0.));
      vec3 pp = normalize(sd + dr * (f - .5) * .35); vec3 dt = normalize(dr - pp * dot(dr, pp));
      vec3 nr = normalize(cross(pp, dt)); float u = dot(d, dt), w = dot(d, nr), pz = dot(d, pp);
      float L = .1; float k = clamp(-u / L, 0., 1.);
      float wd = .0007 + .0009 * (1. - k);   // fine, un peu plus large près de la tête
      float tl = exp(-w * w / (wd * wd)) * pow(1. - k, 1.6) * step(u, .0008) * step(-L, u) * step(.9, pz);
      col += vec3(.85, .93, 1.) * tl * smoothstep(0., .12, f) * smoothstep(1., .7, f) * on * .9 * step(.02, dO.y); }
    d = dO;
  }
  // --- astres proches
  { // petite planète orange, en croissant
    float fc; vec2 q = tang(drift(d), P_MARS, fc); float R = R_MARS; float r = length(q) / R;
    if (fc > 0. && r < 1.2) { vec3 n = vec3(q / R, sqrt(max(1. - r * r, 0.)));
      float t1 = fbm(n.xy * 4. + 1.); vec3 mc = mix(vec3(.55, .25, .14), vec3(.82, .5, .3), t1); mc *= .85 + .3 * craters(n.xy * .8 + .3);
      vec3 L = normalize(vec3(.8, .1, .5)); float lit = smoothstep(-.05, .3, dot(n, L));
      col = mix(col, mc * (.02 + 1.1 * lit), smoothstep(1., .94, r) * pv);
      col += vec3(1., .6, .35) * exp(-max(r - 1., 0.) * 11.) * .12 * pv * step(1., r) * lit; } }
  { // grande planète à anneaux
    float fc; vec2 q = tang(d, P_GIANT, fc); float R = R_GIANT; float tl = -.38 + (uRnd.y - .5) * .4; vec2 qr = rot(q, tl);
    if (fc > 0.) {
      float rr = length(vec2(qr.x, qr.y / .27)) / R; float ringA = smoothstep(1.3, 1.36, rr) * smoothstep(2.38, 2.28, rr);
      float fine = .5 + .5 * sin(rr * 120. + 6. * fbm3(vec2(rr * 8., 1.)));
      float dens = (.5 + .5 * sin(rr * 36. + 3. * fbm3(vec2(rr * 6., 1.)))) * (.35 + .65 * fbm3(vec2(rr * 30., 4.))) * (.7 + .3 * fine);
      dens *= 1. - .95 * smoothstep(.035, .0, abs(rr - 1.9)); dens *= .55 + .45 * smoothstep(1.3, 1.6, rr); dens = clamp(dens * 1.35, 0., 1.);
      vec3 ringC = mix(vec3(.9, .8, .64), vec3(.58, .52, .46), fbm3(vec2(rr * 9., 2.))) * (.8 + .3 * fine);
      float r = length(q) / R; bool back = qr.y > 0.;
      vec3 L = normalize(vec3(-.62, .28, .74));
      float ringLit = .12 + .88 * smoothstep(-.2, .4, -qr.x / R * L.x * -1. + L.z * .5);
      vec2 Pr = vec2(qr.x, qr.y / .27) / R; vec2 lr = rot(L.xy, tl); vec2 ld = normalize(vec2(lr.x, lr.y * 2.2 + .12));
      float along = dot(Pr, ld); float cross2 = length(Pr - along * ld);
      float pShadow = step(along, 0.) * smoothstep(1.04, .9, cross2) * smoothstep(0., -.25, along);   // ombre de la planète sur ses anneaux
      ringLit *= 1. - .9 * pShadow;
      if (back) col = mix(col, ringC * ringLit * .8, ringA * dens * .8 * pv * step(1., r));
      if (r < 1.) {
        vec3 n = vec3(q / R, sqrt(1. - r * r)); vec2 pq = rot(n.xy, tl);
        float lat = pq.y;
        float w = fbm(vec2(pq.x * 2.6 + uT * .004, lat * 7.)), w2 = fbm(vec2(pq.x * 7. - uT * .006, lat * 22.) + w * 2.);
        float bands = sin(lat * 15. + 4. * (w - .5) + 2. * (w2 - .5)) * .5 + .5; float b2 = sin(lat * 38. + 6. * w2 + 2.) * .5 + .5;
        vec3 c1 = vec3(.9, .8, .62), c2 = vec3(.58, .33, .2), c3 = vec3(.54, .62, .7);
        vec3 pc = mix(mix(c1, c2, smoothstep(.25, .8, bands)), c3, smoothstep(.55, .95, b2) * .5);
        pc *= .8 + .4 * w2;
        float pal = uRnd.x; vec3 tn2 = pal < .4 ? vec3(1.) : (pal < .7 ? vec3(.72, .95, 1.18) : vec3(1.12, .8, .66));
        pc = mix(pc, vec3(dot(pc, vec3(.333))) * tn2 * 1.12, step(.4, pal) * .8);
        vec2 sp2 = pq - vec2(.32 * (uRnd.w * 2. - 1.), -.28 * (.5 + uRnd.x)); float storm = smoothstep(.17, .03, length(sp2 * vec2(1., 1.9)));
        pc = mix(pc, vec3(.78, .34, .2), storm * .75); pc += (w2 - .5) * storm * .4;
        float lam = dot(n, L); float lit = smoothstep(-.22, .5, lam);
        float shadowBand = exp(-pow((pq.y + .24 - L.y * .0) / .055, 2.)) * .5 * lit;   // ombre portée des anneaux
        vec3 pl = pc * (.035 + 1.15 * lit) * (.5 + .5 * n.z) * (1. - shadowBand);
        pl += vec3(.35, .55, .85) * pow(1. - n.z, 3.2) * (.08 + .7 * lit);
        pl += vec3(1., .85, .6) * pow(max(lam, 0.), 8.) * .04;
        col = mix(col, pl, pv * smoothstep(1., .985, r));
      }
      if (!back) col = mix(col, ringC * ringLit * 1.05, ringA * dens * pv * .9);
      float rl = length(q) / R;
      col += vec3(.4, .55, .8) * exp(-max(rl - 1., 0.) * 14.) * .14 * pv * step(1., rl) * (1. - ringA * .5);
    }
  }
  { // petite lune de la géante, en orbite lente dans le plan des anneaux
    float fc; vec2 q = tang(d, P_GIANT, fc); float R = R_GIANT; float tl = -.38 + (uRnd.y - .5) * .4;
    float oa = uT * .035 + uRnd.w * 6.28; vec2 oc = rot(vec2(cos(oa) * 3.7, sin(oa) * 3.7 * .27) * R, -tl);
    vec2 qm = q - oc; float rm = length(qm) / R_GMOON; bool inFront = sin(oa) < 0.;
    float behind = inFront ? 1. : smoothstep(R * 1.02, R * .96, length(q));
    if (fc > 0. && rm < 1.3) { vec3 n = vec3(qm / R_GMOON, sqrt(max(1. - rm * rm, 0.))); float lit = smoothstep(-.1, .4, dot(n, normalize(vec3(-.6, .3, .7))));
      col = mix(col, vec3(.7, .66, .6) * (.04 + 1.1 * lit) * (.85 + .3 * fbm3(n.xy * 6.)), smoothstep(1., .9, rm) * pv * (1. - behind)); } }
  { // lune : relief éclairé, mers sombres
    float fc; vec2 q = tang(d, P_MOON, fc); float R = R_MOON; float r = length(q) / R;
    if (fc > 0. && r < 1.15) {
      vec3 n = vec3(q / R, sqrt(max(1. - r * r, 0.)));
      vec3 L = normalize(vec3(mix(-.85, .85, uRnd.z), .22, .58));
      vec2 p2 = n.xy * .9; float h0 = craters(p2) + .35 * fbm(n.xy * 5.), h1 = craters(p2 + L.xy * .02) + .35 * fbm(n.xy * 5. + L.xy * .1);
      float mar = smoothstep(.46, .62, fbm(n.xy * 1.6 + 9.));
      vec3 mc = mix(vec3(.84, .82, .78), vec3(.42, .43, .47), mar * .85) * (.85 + .3 * fbm(n.xy * 14.));
      float lam = dot(n, L); float lit = smoothstep(-.04, .2, lam) * clamp(.75 + (h0 - h1) * 14., .25, 1.4);
      vec3 ml = mc * (.025 + 1.2 * lit) * (.7 + .3 * n.z);
      col = mix(col, ml, smoothstep(1., .965, r) * pv);
      col += vec3(.7, .8, 1.) * exp(-max(r - 1., 0.) * 7.) * .2 * night * step(1., r);
    }
  }
  { // planète bleue : océans, continents, nuages, lumières de ville
    float fc; vec2 q = tang(d, P_BLUE, fc); float R = R_BLUE; float r = length(q) / R;
    if (fc > 0. && r < 1.35) {
      vec3 n = vec3(q / R, sqrt(max(1. - r * r, 0.)));
      float w = fbm(n.xy * 2.6 + 2. + uRnd.x * 37. + uT * .002), land = smoothstep(.5, .56, w);
      vec3 oc = mix(vec3(.03, .12, .32), vec3(.06, .3, .5), fbm3(n.xy * 8.)); vec3 lc = mix(vec3(.2, .36, .16), vec3(.58, .5, .34), fbm(n.xy * 7. + 4.));
      vec3 bc = mix(oc, lc, land);
      float cl = smoothstep(.5, .78, fbm(n.xy * 4.5 + w * 2.5 + 6. + uT * .004)); bc = mix(bc, vec3(.95, .97, 1.), cl * .85);
      vec3 L = normalize(vec3(-.5, .4, .7)); float lam = dot(n, L); float lit = smoothstep(-.1, .32, lam);
      vec3 bl = bc * (.025 + 1.15 * lit) + vec3(.3, .6, 1.) * pow(1. - n.z, 2.4) * (.15 + .75 * lit);
      bl += vec3(1., .75, .4) * land * (1. - cl) * smoothstep(.3, .0, lam) * smoothstep(.62, .78, fbm(n.xy * 20. + 3.)) * .5;
      bl += vec3(1., .95, .9) * pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 40.) * (1. - land) * lit * .5;
      col = mix(col, bl, smoothstep(1., .955, r) * pv);
      col += vec3(.3, .6, 1.) * exp(-max(r - 1., 0.) * 9.) * .32 * pv * step(1., r) * (.35 + .65 * lit);
    }
  }
  { // étoile-repère (Observatoire) : un vrai point lumineux à aigrettes
    float cst = max(dot(d, P_STAR), 0.); float sl = pow(cst, 6000.) * 4. + pow(cst, 500.) * .35 + pow(cst, 60.) * .06;
    vec3 off = d - P_STAR * cst; vec3 t1 = normalize(cross(vec3(0., 1., 0.), P_STAR)); vec3 t2 = cross(P_STAR, t1);
    vec2 sq = vec2(dot(off, t1), dot(off, t2));
    float spk = (exp(-abs(sq.x) * 700.) * exp(-abs(sq.y) * 28.) + exp(-abs(sq.y) * 700.) * exp(-abs(sq.x) * 28.)) * step(.9, cst) * .5;
    col += vec3(.8, .9, 1.) * (sl + spk) * (1. - day) * step(0., d.y);
  }
  // --- aurores
  if (aurK > .01) col += aurora(d) * aurK * smoothstep(0., .03, d.y);
  // --- nuages : cumulus et cirrus, liseré lumineux
  {
    vec2 cp2 = d.xz / (max(d.y, 0.) + .22) * .9 + vec2(uT * .006, 0.);
    float c = fbm(cp2); float dens = smoothstep(.5, .8, c) * smoothstep(.0, .09, d.y);
    float cirr = fbm3(vec2(cp2.x * .6 + 3., cp2.y * 2.4 + uT * .004)); float ci = smoothstep(.55, .85, cirr) * smoothstep(.02, .3, d.y) * .35;
    vec2 Ld = normalize(uSun.xz + vec2(.001)) * .05; float sh = clamp((c - fbm(cp2 + Ld)) * 7. + .5, 0., 1.);
    vec3 lightC = mix(vec3(.025, .035, .07), vec3(.95, .97, 1.), day); lightC = mix(lightC, vec3(1., .55, .4), twi * .8);
    vec3 cc = mix(lightC * .3, lightC, sh) * (1. - .35 * dens);
    cc += lightC * pow(max(dot(d, uSun), 0.), 14.) * (1. - dens) * .4 * step(0., sE + .1);
    cc += vec3(.04, .05, .09) * night * (.5 + .5 * fbm(cp2 * 2.));
    col = mix(col, cc, dens * .85);
    col = mix(col, lightC * .9 + vec3(.02), ci);
  }
  return col;
}

vec3 land(vec3 col, float az, float el){
  vec2 pz = vec2(cos(az), sin(az));
  float shore = -.012 + .006 * fbm3(pz * 12. + 2.);
  vec3 amb = mix(vec3(.004, .007, .014), vec3(.07, .1, .08), day) + vec3(.1, .05, .04) * twi;
  vec3 hor = mix(mix(vec3(.01, .018, .04), vec3(.55, .3, .32), twiS), vec3(.64, .79, .95), day);
  vec3 sunC = mix(vec3(1., .55, .28), vec3(1., .93, .8), smoothstep(0., .5, sE));
  float sunAz = atan(uSun.x, uSun.z);
  for (int i = 0; i < 5; i++) {
    float fi = float(i), far = 1. - fi / 4.;
    float n = fbm(pz * (1.5 + fi * .8) + vec2(fi * 7.3, fi * 3.7));
    float rg = 1. - abs(2. * fbm3(pz * (2.4 + fi) + fi * 3.1) - 1.);
    float h = .05 - fi * .0105 + (.058 - fi * .008) * (mix(n, rg * .85, far * far * .55) - .42);
    if (i == 3) { float tooth = pow(1. - abs(fract(az * 5.7296 * 6. + fbm3(pz * 9. + 1.) * 3.) - .5) * 2., 2.5); h = .014 + .02 * fbm3(pz * 5. + 8.) + tooth * .016 * smoothstep(.2, .5, fbm3(pz * 6. + 5.)); }
    if (i == 4) { float x = az * 5.7296 * 14.; float cell = floor(x); float bl = pow(1. - abs(fract(x) - .5) * 2., 1.6) * step(.45, h21(vec2(cell, 3.))) * (.4 + .6 * h21(vec2(cell, 9.)));
      h = .003 + .004 * fbm3(pz * 7. + 4.) + bl * .011 * smoothstep(.25, .55, fbm3(pz * 4. + 12.)); }
    float m = smoothstep(.0012, -.0012, el - h) * smoothstep(shore - .002, shore + .002, el);
    // perspective atmosphérique : le lointain tire sur la brume de l'horizon
    float hz = far * far * (.18 + .55 * day) + far * .08 * twiS;
    vec3 gc = mix(amb * (1. - .2 * fi / 3.), hor, hz);
    // liseré lumineux du côté du soleil, sur les crêtes
    float rim = smoothstep(.012, .0, abs(el - h)) * (.5 + .5 * cos(az - sunAz)) * (.25 + .75 * twi) * step(.0, sE + .1);
    gc += sunC * rim * .22 * (1. - fi * .12);
    if (i < 4) gc *= .75 + .25 * smoothstep(.0, .05, el);
    col = mix(col, gc * (1. - fi * .05), m);
  }
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y; uv.x += uShift;
  vec3 v = normalize(vec3(uv, 1.15 * uZoom));
  float cp = cos(uPitch), sp = sin(uPitch); v = vec3(v.x, v.y * cp + v.z * sp, -v.y * sp + v.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw); vec3 d = vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1., 1.));
  sE = uSun.y;
  day = smoothstep(-.06, .22, sE); twiS = smoothstep(-.3, -.02, sE); night = 1. - smoothstep(-.22, -.03, sE);
  twi = twiS * (1. - smoothstep(0., .24, sE));
  aurK = uAur * smoothstep(.02, -.2, sE);
  pv = 1. - day * .86;
  float shore = -.012 + .006 * fbm3(vec2(cos(az), sin(az)) * 12. + 2.);
  vec3 col;
  if (el > shore) {
    col = land(skyFull(d), az, el);
  } else {
    // --- lac : le ciel entier s'y reflète (astres, aurores, collines), brouillé par les rides
    vec2 pz = vec2(cos(az), sin(az));
    vec2 wv = vec2(fbm3(pz * 60. + vec2(0., el * 300. + uT * .2)), fbm3(pz * 50. + vec2(4., el * 260. - uT * .15))) - .5;
    float depth = clamp(-d.y * 12., 0., 1.);
    vec3 rd = normalize(vec3(d.x + wv.x * (.012 + .02 * depth), -d.y * .8 + .004 + abs(wv.y) * .03 * (.3 + depth), d.z + wv.y * (.012 + .02 * depth)));
    float raz = atan(rd.x, rd.z), rel = asin(clamp(rd.y, -1., 1.));
    vec3 rf = land(skyFull(rd), raz, rel);
    float F = .36 + .55 * pow(1. - depth, 2.);
    vec3 deep = mix(vec3(.003, .008, .014), vec3(.03, .08, .1), day);
    col = mix(deep, rf, F) * (.85 + .3 * wv.x);
  }
  col = 1. - exp(-col * 1.25); col = pow(col, vec3(.92));
  float vg = 1. - .32 * dot(uv, uv); col *= vg;
  col += (h21(gl_FragCoord.xy + uT) - .5) / 200.;
  gl_FragColor = vec4(col, 1.);
}
`;
  function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(o)); return null; } return o; }
  var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'), fs = sh(gl.FRAGMENT_SHADER, FRAG), prog = null, U = {};
  if (vs && fs) { prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null; }
  if (!prog) { window.CodexScene = { ok: false }; return; }
  gl.useProgram(prog); var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['uRes', 'uT', 'uYaw', 'uPitch', 'uZoom', 'uShift', 'uAur', 'uAurAz', 'uSun', 'uRnd'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  /* ---------- vue ---------- */
  var view = { yaw: 0, pitch: .3, zoom: 1, tz: 1, ty: 0, tp: .3 }, shift = 0, clock = 0, simHour = 22, drift = 0;
  function hourNow() { var n = new Date(); return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600; }
  function hourOf() { return cfg.mode === 'live' ? hourNow() : cfg.mode === 'cycle' ? (simHour % 24) : cfg.hour; }
  function hlabel(h) { var hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function phase(sE) { return sE > .25 ? 'jour' : sE > .02 ? 'matin ou soir' : sE > -.12 ? 'crépuscule' : 'nuit'; }

  /* ---------- repères cliquables ---------- */
  var qy = /[?&]yaw=(-?[\d.]+)/.exec(location.search); if (qy) { view.ty = view.yaw = +qy[1]; } var qp = /[?&]pitch=(-?[\d.]+)/.exec(location.search); if (qp) { view.tp = view.pitch = +qp[1]; }
  function base() { return Math.min(1, (W / H) / 1.55); }
  var marks = document.getElementById('ca-marks'), mk = [];
  MENU.forEach(function (m) {
    var d = document.createElement('div'); d.className = 'ca-mk'; d.style.setProperty('--c', m[2]);
    d.innerHTML = '<button type="button" aria-label="' + m[1] + ' — ' + m[4] + '"></button><span class="ring"></span><span class="lab">' + m[1] + '</span><span class="tip"><em>' + m[4] + '</em></span>';
    d.querySelector('button').addEventListener('click', function () { Codex.navigate(m[0]); });
    marks.appendChild(d); mk.push({ el: d, b: BODY[m[3]] });
  });
  function placeMarks(dz) {
    var cyw = Math.cos(view.yaw), syw = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch), f = 1.15 * view.zoom * base();
    mk.forEach(function (o) {
      var d = dirOf(o.b);
      var x = d[0] * cyw - d[2] * syw, z = d[0] * syw + d[2] * cyw, y = d[1];
      var y2 = y * cp - z * sp, z2 = y * sp + z * cp;
      if (z2 < .05) { o.el.style.display = 'none'; return; }
      var sx = (x / z2 * f - shift) * H + W / 2, sy = H / 2 - y2 / z2 * f * H;
      o.el.style.display = ''; o.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)';
    });
  }

  /* ---------- réglages ---------- */
  var pop = null;
  if (Codex.customize) {
    pop = Codex.customize.pop();
    pop.innerHTML = '<div><label class="cx-l" for="ca-mode">Heure du ciel</label><select id="ca-mode" style="width:100%;padding:8px;background:transparent;color:inherit;border:1px solid var(--line);border-radius:8px"><option value="live">Heure réelle</option><option value="cycle">Journée accélérée</option><option value="manual">Heure choisie</option></select></div>' +
      '<div><label class="cx-l" for="ca-hour">Heure choisie</label><input id="ca-hour" type="range" min="0" max="24" step=".25"></div>' +
      '<div><label class="cx-l" for="ca-aur">Aurores</label><input id="ca-aur" type="range" min="0" max="1.6" step=".1"></div>';
    var $ = function (id) { return document.getElementById(id); };
    $('ca-mode').value = cfg.mode; $('ca-hour').value = cfg.hour; $('ca-aur').value = cfg.aur;
    $('ca-mode').addEventListener('change', function (e) { cfg.mode = e.target.value; if (cfg.mode === 'manual') cfg.hour = Math.round(hourNow() * 4) / 4; $('ca-hour').value = cfg.hour; save(); });
    $('ca-hour').addEventListener('input', function (e) { cfg.hour = parseFloat(e.target.value); cfg.mode = 'manual'; $('ca-mode').value = 'manual'; save(); });
    $('ca-aur').addEventListener('input', function (e) { cfg.aur = parseFloat(e.target.value); save(); });
  }

  Codex.on('navigate', function (e) { if (e.direct) return; if (!e.id) Codex.reader.close(); else Codex.reader.open(e.id); });

  /* ---------- regard : glisser, molette ---------- */
  var ptr = {}, pinch0 = 0;
  cv.addEventListener('pointerdown', function (e) { ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', function (e) {
    var p = ptr[e.pointerId]; if (!p) return; var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; var k = Object.keys(ptr);
    if (k.length === 2) { var dd = Math.hypot(ptr[k[0]].x - ptr[k[1]].x, ptr[k[0]].y - ptr[k[1]].y); if (pinch0) view.tz = clamp(view.tz * dd / pinch0, .7, 2.6); pinch0 = dd; }
    else { if (!document.documentElement.classList.contains('ca-moved') && Math.abs(dx) + Math.abs(dy) > 3) document.documentElement.classList.add('ca-moved'); view.ty -= dx * .0025 / view.zoom; view.tp = clamp(view.tp + dy * .002 / view.zoom, .02, 1.45); }
  });
  function pend(e) { delete ptr[e.pointerId]; pinch0 = 0; if (!Object.keys(ptr).length) cv.style.cursor = 'grab'; }
  cv.addEventListener('pointerup', pend); cv.addEventListener('pointercancel', pend);
  cv.addEventListener('wheel', function (e) { e.preventDefault(); view.tz = clamp(view.tz * Math.exp(-e.deltaY * .0012), .7, 2.6); }, { passive: false });
  cv.addEventListener('dblclick', function () { view.ty = 0; view.tp = .3; view.tz = 1; });

  /* ---------- boucle ---------- */
  function resize() { W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, W < 900 ? .9 : 1.15); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  window.addEventListener('resize', resize); resize();
  var last = performance.now(), paused = document.hidden, clockEl = document.getElementById('ca-clock'), clockT = 0;
  document.addEventListener('visibilitychange', function () { paused = document.hidden; last = performance.now(); if (!paused) requestAnimationFrame(frame); });
  function frame(now) {
    if (paused) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    var reading = document.documentElement.classList.contains('reading');
    shift += ((reading ? .26 : 0) - shift) * Math.min(1, dt * 4);
    view.yaw += (view.ty - view.yaw) * Math.min(1, dt * 8); view.pitch += (view.tp - view.pitch) * Math.min(1, dt * 8); view.zoom += (view.tz - view.zoom) * Math.min(1, dt * 6);
    if (cfg.mode === 'cycle') simHour += dt * (24 / 150); else simHour = hourOf();
    var hr = hourOf(), sun = sunVec(hr); drift = clock * .0006;
    var w = gl;
    w.viewport(0, 0, cv.width, cv.height);
    w.uniform2f(U.uRes, cv.width, cv.height); w.uniform1f(U.uT, clock); w.uniform1f(U.uYaw, view.yaw); w.uniform1f(U.uPitch, view.pitch); w.uniform1f(U.uZoom, view.zoom * base()); w.uniform1f(U.uShift, shift); w.uniform1f(U.uAur, cfg.aur);
    w.uniform3f(U.uSun, sun[0], sun[1], sun[2]); w.uniform1f(U.uAurAz, AUR_OFF); w.uniform4f(U.uRnd, RND[0], RND[1], RND[2], RND[3]);
    w.drawArrays(w.TRIANGLE_STRIP, 0, 4);
    placeMarks();
    clockT += dt; if (clockT > .5 && clockEl) { clockT = 0; clockEl.textContent = (cfg.mode === 'live' ? 'Heure locale ' : cfg.mode === 'cycle' ? 'Journée accélérée ' : 'Heure choisie ') + hlabel(hr) + ' · ' + phase(sun[1]); }
    requestAnimationFrame(frame);
  }
  window.CodexScene = { ok: true };
  requestAnimationFrame(frame);
})();
