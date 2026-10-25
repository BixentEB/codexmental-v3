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

  /* ---------- astres (azimut, élévation, rayon en tan) ---------- */
  var BODY = {
    giant: { az: .46, el: .38, r: .105 },
    moon: { az: .04, el: .5, r: .036 },
    blue: { az: -.13, el: .31, r: .03 },
    star: { az: .33, el: .58, r: .01 },
    aurora: { az: -.06, el: .24, r: .01 }
  };
  var MENU = [
    ['codex', 'Codex', '#f0d9a8', 'giant', 'Articles et réflexions'],
    ['atelier', 'Atelier', '#e8ecf5', 'moon', 'Créations, théories, hypothèses'],
    ['lab', 'Laboratoire', '#9ad8ff', 'blue', 'Applications et projets en construction'],
    ['dashb', 'Observatoire', '#c9d8ff', 'star', 'Observations, cartes et explorations'],
    ['profil', 'Portrait', '#7fe6b0', 'aurora', 'Parcours, passions et aspirations']
  ];

  var FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT, uYaw, uPitch, uZoom, uShift, uAur; uniform vec3 uSun;
uniform vec3 uGiant, uMoon, uBlue, uStar;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * vn(p); p = p * 2.03 + vec2(5.2, 1.3); a *= .5; } return v; }
float fbm3(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 3; i++) { v += a * vn(p); p = p * 2.03 + vec2(5.2, 1.3); a *= .5; } return v; }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// projection gnomonique d'une direction sur le plan tangent d'un astre
vec2 tang(vec3 d, vec3 c, out float facing){
  facing = dot(d, c); vec3 t1 = normalize(cross(vec3(0., 1., 0.), c)); vec3 t2 = cross(c, t1);
  return vec2(dot(d, t1), dot(d, t2)) / max(facing, .001);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y; uv.x += uShift;
  vec3 v = normalize(vec3(uv, 1.15 * uZoom));
  float cp = cos(uPitch), sp = sin(uPitch); v = vec3(v.x, v.y * cp + v.z * sp, -v.y * sp + v.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw); vec3 d = vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1., 1.));
  float sE = uSun.y;
  float day = smoothstep(-.06, .22, sE), twiS = smoothstep(-.3, -.02, sE), night = 1. - smoothstep(-.22, -.03, sE);
  float twi = twiS * (1. - smoothstep(0., .24, sE));
  // --- ciel
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
  // --- étoiles et Voie lactée
  float nf = night * smoothstep(-.01, .12, d.y);
  if (nf > .01) {
    vec2 g = vec2(az * 95., el * 95.); vec2 gi = floor(g); float hs = h21(gi);
    float st = 0.;
    if (hs > .945) { vec2 f = fract(g) - .5 - (vec2(h21(gi + 3.1), h21(gi + 7.7)) - .5) * .5; st = pow((hs - .945) / .055, 3.) * smoothstep(.24, 0., length(f)); st *= .7 + .3 * sin(uT * (1. + hs * 5.) + hs * 60.); }
    vec2 g2 = vec2(az * 230., el * 230.); float h2 = h21(floor(g2) + 11.); float st2 = step(.965, h2) * smoothstep(.3, 0., length(fract(g2) - .5)) * (.35 + .4 * h21(floor(g2) + 5.));
    vec3 tn = mix(vec3(.7, .8, 1.), vec3(1., .86, .68), h21(gi + 1.3));
    // bande de la Voie lactée, inclinée
    vec3 nb = normalize(vec3(.35, .75, .45)); float bd = dot(d, nb); float band = exp(-bd * bd * 14.);
    vec2 mw = vec2(atan(d.x, d.z) * 3., d.y * 4.);
    float mn = fbm(mw * 2.2 + 3.), lane = smoothstep(.45, .7, fbm(mw * 3.6 - 9.));
    vec3 milky = mix(vec3(.5, .55, .8), vec3(.95, .8, .62), smoothstep(.3, .8, mn)) * band * (.25 + .9 * mn) * (1. - .7 * lane * band);
    col += (tn * (st * 1.5 + st2) + milky * .28) * nf;
  }
  { float cst = max(dot(d, uStar), 0.); float sl = pow(cst, 6000.) * 4. + pow(cst, 500.) * .35 + pow(cst, 60.) * .06; vec2 sq = vec2(dot(d - uStar * cst, vec3(1., 0., 0.)), dot(d - uStar * cst, vec3(0., 1., 0.))); float spk = (exp(-abs(sq.x) * 700.) * exp(-abs(sq.y) * 28.) + exp(-abs(sq.y) * 700.) * exp(-abs(sq.x) * 28.)) * step(.9, cst) * .5; col += vec3(.8, .9, 1.) * (sl + spk) * (1. - day) * step(0., d.y); }
  // --- planètes et lune (derrière les aurores et les nuages)
  float pv = 1. - day * .86;
  { // grande planète à anneaux
    float fc; vec2 q = tang(d, uGiant, fc); float R = ` + BODY.giant.r + `; float tl = -.38; vec2 qr = rot(q, tl);
    if (fc > 0.) {
      float rr = length(vec2(qr.x, qr.y / .27)) / R; float ringA = smoothstep(1.32, 1.38, rr) * smoothstep(2.35, 2.25, rr);
      float dens = (.62 + .38 * sin(rr * 41. + 3. * fbm3(vec2(rr * 6., 1.)))) * (.45 + .55 * fbm3(vec2(rr * 26., 4.))); dens *= 1. - .92 * smoothstep(.04, .0, abs(rr - 1.88)) ; dens = clamp(dens * 1.3, 0., 1.);
      vec3 ringC = mix(vec3(.88, .78, .62), vec3(.6, .55, .5), fbm3(vec2(rr * 9., 2.)));
      float r = length(q) / R;
      bool back = qr.y > 0.;
      if (back) col = mix(col, ringC * .75, ringA * dens * .85 * pv * step(1., r));
      if (r < 1.) {
        vec3 n = vec3(q / R, sqrt(1. - r * r)); vec2 pq = rot(n.xy, tl);
        float lat = pq.y; float w = fbm(vec2(pq.x * 2.4 + uT * .004, lat * 6.));
        float bands = sin(lat * 17. + 3.2 * w) * .5 + .5; float b2 = sin(lat * 41. + 5. * w + 2.) * .5 + .5;
        vec3 c1 = vec3(.88, .78, .6), c2 = vec3(.6, .36, .22), c3 = vec3(.56, .64, .72);
        vec3 pc = mix(mix(c1, c2, smoothstep(.25, .8, bands)), c3, smoothstep(.55, .95, b2) * .55);
        pc *= .85 + .3 * fbm(vec2(pq.x * 9., lat * 24.));
        vec2 sp = pq - vec2(.32, -.28); pc = mix(pc, vec3(.75, .32, .2), smoothstep(.16, .04, length(sp * vec2(1., 1.8))) * .7);
        vec3 L = normalize(vec3(-.62, .28, .74)); float lam = dot(n, L); float lit = smoothstep(-.18, .45, lam);
        float ld = .45 + .55 * n.z;
        vec3 pl = pc * (.04 + 1.1 * lit) * ld;
        pl += vec3(.35, .55, .8) * pow(1. - n.z, 3.) * (.1 + .6 * lit);
        // ombre portée des anneaux sur la planète
        float sh = smoothstep(.07, .03, abs(qr.y / R + .1)) * step(0., qr.y / R + .1) * .0;
        col = mix(col, pl, pv * smoothstep(1., .985, r));
      }
      if (!back) col = mix(col, ringC * 1.05, ringA * dens * pv * .9);
      col += vec3(.4, .55, .8) * exp(-max(length(q) / R - 1., 0.) * 14.) * .14 * pv * step(0., fc) * step(1., length(q) / R) * (1. - ringA * .5);
    }
  }
  { // lune
    float fc; vec2 q = tang(d, uMoon, fc); float R = ` + BODY.moon.r + `; float r = length(q) / R;
    if (fc > 0. && r < 1.15) {
      vec3 n = vec3(q / R, sqrt(max(1. - r * r, 0.)));
      float tex = fbm(n.xy * 3.4 + 4.); float mar = smoothstep(.45, .62, fbm(n.xy * 1.7 + 9.)); float cr = smoothstep(.5, .9, vn(n.xy * 14.)) * .12;
      vec3 mc = mix(vec3(.82, .8, .76), vec3(.45, .46, .5), mar * .8) * (.8 + .35 * tex) - cr;
      vec3 L = normalize(vec3(.78, .22, .58)); float lit = smoothstep(-.06, .22, dot(n, L));
      vec3 ml = mc * (.03 + 1.15 * lit) * (.6 + .4 * n.z);
      col = mix(col, ml, smoothstep(1., .96, r) * pv);
      col += vec3(.7, .8, 1.) * exp(-max(r - 1., 0.) * 7.) * .22 * night * step(1., r);
    }
  }
  { // petite planète bleue
    float fc; vec2 q = tang(d, uBlue, fc); float R = ` + BODY.blue.r + `; float r = length(q) / R;
    if (fc > 0. && r < 1.3) {
      vec3 n = vec3(q / R, sqrt(max(1. - r * r, 0.)));
      float w = fbm(n.xy * 3. + 2.); float cl = smoothstep(.45, .75, fbm(n.xy * 5. + w * 2. + 6.));
      vec3 bc = mix(vec3(.08, .22, .5), vec3(.18, .55, .62), smoothstep(.4, .7, w)); bc = mix(bc, vec3(.92, .96, 1.), cl * .75);
      vec3 L = normalize(vec3(-.5, .4, .7)); float lit = smoothstep(-.12, .35, dot(n, L));
      vec3 bl = bc * (.03 + 1.1 * lit) + vec3(.3, .6, 1.) * pow(1. - n.z, 2.5) * (.2 + .7 * lit);
      col = mix(col, bl, smoothstep(1., .95, r) * pv);
      col += vec3(.3, .6, 1.) * exp(-max(r - 1., 0.) * 9.) * .3 * pv * step(1., r);
    }
  }
  // --- aurores
  float aurK = uAur * (1. - smoothstep(-.34, -.06, sE) * 0.) * smoothstep(.02, -.2, sE);
  if (aurK > .01) {
    vec3 ac = vec3(0.);
    for (int k = 0; k < 2; k++) {
      float fk = float(k); float a = az + .08 - fk * .5 + fk * .0;
      float base = .17 + .09 * sin(a * 2.3 + uT * .05 + fk * 2.) + .045 * sin(a * 5.2 - uT * .08 + fk) + .015 * sin(a * 11. + uT * .2);
      float h = el - base - fk * .1;
      float rays = fbm3(vec2(a * 15. + fk * 5., uT * .05 + fk * 3.)); float rb = fbm3(vec2(a * 44., uT * .12));
      float streak = .15 + 1.5 * pow(rays, 2.2) + .45 * rb * rays;
      float prof = smoothstep(-.012, .0, h) * exp(-max(h, 0.) * (6. + 3. * fk)) * smoothstep(.8, .3, h);
      float env = smoothstep(1.1, .15, abs(a)) * (.55 + .6 * fbm3(vec2(a * 3. + fk * 9., uT * .02)));
      vec3 c = mix(vec3(.12, 1., .5), vec3(.5, .3, .95), smoothstep(.12, .5, h)); c = mix(c, vec3(1., .3, .6), smoothstep(.45, .8, h) * .8);
      ac += c * prof * streak * env * (.95 - .4 * fk);
    }
    ac += vec3(.04, .3, .17) * exp(-abs(el - .17) * 5.) * smoothstep(1.2, .2, abs(az + .08)) * .14;
    col += ac * aurK * smoothstep(0., .03, d.y) * .62;
  }
  // --- nuages
  {
    vec2 cp2 = d.xz / (max(d.y, 0.) + .22) * .9 + vec2(uT * .006, 0.);
    float c = fbm(cp2); float dens = smoothstep(.52, .8, c) * smoothstep(.0, .09, d.y);
    vec2 Ld = normalize(uSun.xz + vec2(.001)) * .05; float sh = clamp((c - fbm(cp2 + Ld)) * 7. + .5, 0., 1.);
    vec3 lightC = mix(vec3(.025, .035, .07), vec3(.95, .97, 1.), day) ; lightC = mix(lightC, vec3(1., .55, .4), twi * .8);
    vec3 cc = mix(lightC * .3, lightC, sh) * (1. - .35 * dens);
    cc += vec3(.04, .05, .09) * night * (.5 + .5 * fbm(cp2 * 2.)) ;
    col = mix(col, cc, dens * .85);
  }
  // --- terrain : crêtes lointaines à proches
  vec3 amb = mix(vec3(.004, .007, .014), vec3(.07, .1, .08), day) + vec3(.1, .05, .04) * twi;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float h = .05 - fi * .014 + (.05 - fi * .006) * (fbm3(vec2(az * (1.6 + fi * .8) + fi * 7.3, fi * 3.7)) - .4);
    if (i == 3) { float tooth = pow(1. - abs(fract(az * 34. + fbm3(vec2(az * 9., 1.)) * 3.) - .5) * 2., 2.5); h += tooth * .014 * smoothstep(.2, .5, fbm3(vec2(az * 6., 5.))); }
    float m = smoothstep(.0012, -.0012, el - h);
    vec3 gc = mix(mix(hor, amb, .5), amb, fi / 3.) ; gc = mix(gc * (.4 + .35 * day), gc, 1. - fi * .2);
    if (i == 3) gc += hor * (.12 + .25 * day) * exp(-max(h - el, 0.) * 16.) + vec3(.02, .09, .06) * uAur * night * exp(-max(h - el, 0.) * 9.);
    col = mix(col, gc * (1. - fi * .12), m);
  }
  col = 1. - exp(-col * 1.25); col = pow(col, vec3(.92));
  float vg = 1. - .35 * dot(uv, uv); col *= vg;
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
  ['uRes', 'uT', 'uYaw', 'uPitch', 'uZoom', 'uShift', 'uAur', 'uSun', 'uGiant', 'uMoon', 'uBlue', 'uStar'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  /* ---------- vue ---------- */
  var view = { yaw: 0, pitch: .3, zoom: 1, tz: 1, ty: 0, tp: .3 }, shift = 0, clock = 0, simHour = 22, drift = 0;
  function dirOf(b, dz) { var az = b.az + (dz || 0), c = Math.cos(b.el); return [Math.sin(az) * c, Math.sin(b.el), Math.cos(az) * c]; }
  function hourNow() { var n = new Date(); return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600; }
  function hourOf() { return cfg.mode === 'live' ? hourNow() : cfg.mode === 'cycle' ? (simHour % 24) : cfg.hour; }
  function hlabel(h) { var hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function phase(sE) { return sE > .25 ? 'jour' : sE > .02 ? 'matin ou soir' : sE > -.12 ? 'crépuscule' : 'nuit'; }

  /* ---------- repères cliquables ---------- */
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
      var d = dirOf(o.b, o.b === BODY.giant || o.b === BODY.moon || o.b === BODY.blue ? 0 : 0);
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
    else { view.ty = clamp(view.ty - dx * .0025 * 1 / view.zoom, -1.3, 1.3); view.tp = clamp(view.tp + dy * .002 / view.zoom, .02, 1.15); }
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
    w.uniform3f(U.uSun, sun[0], sun[1], sun[2]);
    var g1 = dirOf(BODY.giant), g2 = dirOf(BODY.moon), g3 = dirOf(BODY.blue), g4 = dirOf(BODY.star); w.uniform3f(U.uStar, g4[0], g4[1], g4[2]);
    w.uniform3f(U.uGiant, g1[0], g1[1], g1[2]); w.uniform3f(U.uMoon, g2[0], g2[1], g2[2]); w.uniform3f(U.uBlue, g3[0], g3[1], g3[2]);
    w.drawArrays(w.TRIANGLE_STRIP, 0, 4);
    placeMarks();
    clockT += dt; if (clockT > .5 && clockEl) { clockT = 0; clockEl.textContent = (cfg.mode === 'live' ? 'Heure locale ' : cfg.mode === 'cycle' ? 'Journée accélérée ' : 'Heure choisie ') + hlabel(hr) + ' · ' + phase(sun[1]); }
    requestAnimationFrame(frame);
  }
  window.CodexScene = { ok: true };
  requestAnimationFrame(frame);
})();
