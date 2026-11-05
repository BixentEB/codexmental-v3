/* ======================================================================
   Poste de pilotage — les mondes visibles derrière les vitres (WebGL, three.js r128 déjà présent sur le site).
   - Système solaire : cartes réelles (mêmes fichiers que l'Observatoire, réduits à 1024 × 512) :
     NASA (domaine public) et Solar System Scope (CC BY 4.0, crédit affiché dans le scanner).
   - Exoplanètes : « vues d'artiste d'après les données » : surface calculée (bruit fractal sur la sphère),
     réglée sur ce qu'on mesure (type, température, couleur, étoile). Personne n'en a de carte : le scanner le dit.
   Une seule sphère, une coquille d'atmosphère, des anneaux si besoin ; rendu seulement quand un monde est en vue.
   API : CaelesWorlds.init(canvas) → bool ; .show(world) ; .place(x, y, r, alpha) ; .render(dt) ; .resize(w, h, dpr) ; .hide()
   ====================================================================== */
(function () {
  'use strict';
  var T = window.THREE;
  var A = 'img/astres/';
  var SSS = 'Solar System Scope (CC BY 4.0)', NASA = 'NASA (domaine public)';
  /* kind : 0 gazeuse · 1 lave · 2 océan/rocheuse · 3 sombre · 4 glace/roche
     sun : couleur de l'étoile ; sun2 : seconde étoile (Kepler-16) */
  var WORLDS = [
    { id: 'jupiter', name: 'Jupiter', where: 'Système solaire', type: 'Géante gazeuse', fact: 'Sa Grande Tache rouge est une tempête plus large que la Terre.', tex: 'jupiter.jpg', credit: SSS, atmo: [1, .85, .65], c: ['#d8c3a0', '#a77650', '#efe2c8', '#8c5a3c'], spin: .05 },
    { id: 'saturne', name: 'Saturne', where: 'Système solaire', type: 'Géante gazeuse', fact: 'Elle est en moyenne moins dense que l’eau.', tex: 'saturne.jpg', rings: 'saturne-anneaux.png', credit: SSS, atmo: [1, .9, .7], c: ['#e3d3a8', '#b99c6a', '#f2e6c6', '#9c805a'], spin: .045 },
    { id: 'terre', name: 'La Terre', where: 'Système solaire', type: 'Planète rocheuse', fact: 'La seule planète connue qui abrite la vie.', tex: 'terre.jpg', night: 'terre-nuit.jpg', water: true, credit: SSS + ' · nuit : NASA Black Marble', atmo: [.45, .7, 1], c: ['#1d4f9a', '#3d7a4a', '#c9b68a', '#f2f6ff'], spin: .03 },
    { id: 'mars', name: 'Mars', where: 'Système solaire', type: 'Planète rocheuse', fact: 'Olympus Mons, le plus haut volcan connu, y culmine à plus de 20 km.', tex: 'mars.jpg', credit: 'NASA/USGS Viking (domaine public)', atmo: [1, .62, .42], c: ['#b5643a', '#7a3a22', '#d99a6a', '#e8d2c0'], spin: .03 },
    { id: 'lune', name: 'La Lune', where: 'Système solaire', type: 'Satellite naturel', fact: 'Elle montre toujours la même face à la Terre.', tex: 'lune.jpg', credit: 'NASA LRO (domaine public)', atmo: null, c: ['#9a9a96', '#6c6c6a', '#c8c8c4', '#505050'], spin: .015 },
    { id: 'europe', name: 'Europe', where: 'Système solaire · lune de Jupiter', type: 'Lune glacée', fact: 'Un océan d’eau liquide se cacherait sous sa croûte de glace.', tex: 'europe.jpg', credit: 'USGS Galileo/Voyager (domaine public)', atmo: null, c: ['#e8dcc8', '#a98a6a', '#f6f0e6', '#8a6a52'], spin: .02 },
    { id: 'titan', name: 'Titan', where: 'Système solaire · lune de Saturne', type: 'Lune à atmosphère', fact: 'Des lacs de méthane liquide dorment sous sa brume orangée.', tex: 'titan.jpg', haze: true, credit: 'NASA Cassini (domaine public)', atmo: [1, .65, .3], c: ['#c98a3a', '#8a5a2a', '#e0b070', '#6a4020'], spin: .02 },
    { id: 'io', name: 'Io', where: 'Système solaire · lune de Jupiter', type: 'Lune volcanique', fact: 'Le corps le plus volcanique du Système solaire.', tex: 'io.jpg', credit: 'USGS Galileo/Voyager (domaine public)', atmo: null, c: ['#e8d070', '#b0803a', '#f2e6a0', '#7a5020'], spin: .02 },
    { id: 'neptune', name: 'Neptune', where: 'Système solaire', type: 'Géante de glace', fact: 'Ses vents dépassent 2 000 km/h, les plus rapides du Système solaire.', tex: 'neptune.jpg', credit: SSS, atmo: [.45, .62, 1], c: ['#3a62d0', '#22408a', '#7aa0f0', '#1a2a6a'], spin: .04 },
    { id: 'uranus', name: 'Uranus', where: 'Système solaire', type: 'Géante de glace', fact: 'Elle tourne couchée sur le côté, inclinée de 98°.', tex: 'uranus.jpg', tilt: 1.45, credit: SSS, atmo: [.6, .9, 1], c: ['#9fe0e6', '#7ac0cc', '#c8f2f4', '#5a9aa8'], spin: .035 },
    { id: 'hd189733b', name: 'HD 189733 b', where: '≈ 64 al · constellation du Petit Renard', type: 'Jupiter chaud', fact: 'Bleu cobalt : sa couleur a été mesurée par Hubble. Environ 1 000 °C.', kind: 0, artist: true, atmo: [.4, .6, 1], c: ['#1c3f9a', '#0f2466', '#4a7ae0', '#0a1440'], spin: .06 },
    { id: 'tres2b', name: 'TrES-2 b', where: '≈ 750 al · constellation du Dragon', type: 'Jupiter chaud', fact: 'Elle renvoie moins de 1 % de la lumière qu’elle reçoit : plus sombre que du charbon.', kind: 3, artist: true, atmo: [.6, .2, .15], c: ['#0c0a0a', '#3a0c06', '#1a1210', '#ff3a10'], spin: .05 },
    { id: '55cnce', name: '55 Cancri e', where: '≈ 41 al · constellation du Cancer', type: 'Super-Terre', fact: 'Sa face éclairée dépasserait 2 000 °C : un monde de lave.', kind: 1, artist: true, atmo: [1, .45, .2], c: ['#1a1412', '#3a2a24', '#ff6a1a', '#ffd27a'], spin: .02 },
    { id: 'kepler16b', name: 'Kepler-16 b', where: '≈ 245 al · constellation du Cygne', type: 'Planète circumbinaire', fact: 'Elle tourne autour de deux étoiles : deux lumières, deux ombres.', kind: 0, artist: true, sun: [1, .78, .55], sun2: [1, .45, .3], atmo: [1, .8, .6], c: ['#b89a72', '#7a6248', '#d8c2a0', '#5a4632'], spin: .04 },
    { id: 'trappist1e', name: 'TRAPPIST-1 e', where: '≈ 40 al · constellation du Verseau', type: 'Planète rocheuse tempérée', fact: 'Dans la zone habitable de sa petite étoile rouge : de l’eau liquide est possible.', kind: 2, artist: true, sun: [1, .62, .42], atmo: [.6, .7, 1], c: ['#1a3a6a', '#4a5a3a', '#8a7a5a', '#f2f0ea'], spin: .03 },
    { id: 'proximab', name: 'Proxima b', where: '4,2 al · la plus proche', type: 'Planète rocheuse', fact: 'La plus proche exoplanète connue, autour d’une naine rouge.', kind: 4, artist: true, sun: [1, .55, .38], atmo: [.7, .6, .9], c: ['#6a5a5a', '#3a3036', '#a8988a', '#e8e4f0'], spin: .025 },
    { id: 'wasp76b', name: 'WASP-76 b', where: '≈ 640 al · constellation des Poissons', type: 'Jupiter ultra-chaud', fact: 'Le fer s’y vaporise côté jour et y pleuvrait côté nuit.', kind: 0, glow: [1, .35, .1], artist: true, atmo: [1, .55, .25], c: ['#c8642a', '#7a2a12', '#f0a050', '#3a1206'], spin: .05 }
  ];

  var VERT = [
    'varying vec3 vN; varying vec3 vP; varying vec2 vUv;',
    'void main(){ vN = normalize(normalMatrix * normal); vP = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');
  var NOISE = [
    'float h3(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),',
    '             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }',
    'float fbm(vec3 p){ float a = .5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= .5; } return s; }'
  ].join('\n');
  var FRAG = [
    'uniform sampler2D map; uniform sampler2D nmap; uniform float hasMap, hasNight, water, haze, kind, time;',
    'uniform vec3 c0, c1, c2, c3, L1, L2, lc1, lc2, atmo, glow; uniform float hasAtmo, alpha;',
    'varying vec3 vN; varying vec3 vP; varying vec2 vUv;', NOISE,
    'void main(){',
    '  vec3 N = normalize(vN), V = vec3(0.0, 0.0, 1.0), p = vP; vec3 col; vec3 emis = vec3(0.0); float wet = 0.0;',
    '  if (hasMap > .5) { col = texture2D(map, vUv).rgb; col = pow(col, vec3(1.08));',
    '    if (water > .5) wet = smoothstep(.04, .12, col.b - max(col.r, col.g) + .06); }',
    '  else if (kind < .5) {',   // géante gazeuse : bandes tourmentées, jamais régulières
    '    float w = fbm(p * 1.7 + vec3(0.0, 0.0, time * .004)); float w2 = fbm(p * 4.3 + w * 1.8);',
    '    float b = sin(p.y * 13.0 + w * 3.4 + w2 * 1.6) * .5 + .5; float b2 = sin(p.y * 31.0 + w2 * 4.0) * .5 + .5;',
    '    col = mix(mix(c0, c1, b), mix(c2, c3, b2), smoothstep(.3, .8, fbm(p * 2.6 + 4.0)) * .55);',
    '    float st = smoothstep(.72, .86, fbm(p * 3.2 + 8.0)) * smoothstep(.55, .2, abs(p.y)); col = mix(col, c2 * 1.05, st * .6);',
    '    col *= .86 + .28 * w2; emis = glow * smoothstep(.2, .9, w2) * .35; }',
    '  else if (kind < 1.5) {',  // lave : croûte sombre, fissures incandescentes
    '    float n = fbm(p * 3.0); col = mix(c0, c1, n);',
    '    float cr = 1.0 - smoothstep(.0, .045, abs(fbm(p * 5.5 + 2.0) - .5)); float pool = smoothstep(.62, .7, fbm(p * 2.1 + 9.0));',
    '    emis = (c2 * cr * 1.6 + c3 * pool * 1.2) * (.75 + .25 * sin(time * .7 + n * 12.0)); }',
    '  else if (kind < 2.5) {',  // océan et terres, calottes, nuages
    '    float h = fbm(p * 2.2 + 3.0); float land = smoothstep(.5, .54, h); wet = 1.0 - land;',
    '    col = mix(c0 * (.8 + .4 * fbm(p * 7.0)), mix(c1, c2, fbm(p * 6.0)), land);',
    '    col = mix(col, c3, smoothstep(.78, .86, abs(p.y) + fbm(p * 5.0) * .12)); }',
    '  else if (kind < 3.5) {',  // monde noir : à peine visible, une lueur thermique
    '    float n = fbm(p * 3.0 + vec3(time * .003)); col = c0 + c1 * n * .4; emis = c3 * pow(fbm(p * 2.0 + 5.0), 3.0) * .22; }',
    '  else {',                  // roche glacée et cratérisée
    '    float n = fbm(p * 3.6); float cr = smoothstep(.62, .66, fbm(p * 7.0 + 1.0)) - smoothstep(.66, .72, fbm(p * 7.0 + 1.0));',
    '    col = mix(c1, c2, n) * (1.0 - cr * .35); col = mix(col, c3, smoothstep(.7, .85, abs(p.y) + n * .15)); }',
    '  if (hasMap < .5 && kind > 1.5 && kind < 2.5 || haze > .5) {',   // nuages ou brume
    '    float cl = smoothstep(.52, .78, fbm(p * 3.1 + vec3(time * .006, 0.0, 0.0)));',
    '    col = haze > .5 ? mix(col, atmo * .9, .72) : mix(col, vec3(.96), cl * .85); wet *= 1.0 - cl; }',
    '  float d1 = dot(N, L1), d2 = dot(N, L2);',
    '  vec3 light = lc1 * smoothstep(-.06, .55, d1) + lc2 * smoothstep(-.06, .55, d2);',
    '  vec3 c = col * light + col * .012;',
    '  vec3 R = reflect(-L1, N); c += lc1 * pow(max(dot(R, V), 0.0), 38.0) * wet * .55 * step(0.0, d1);',
    '  if (hasNight > .5) c += texture2D(nmap, vUv).rgb * vec3(1.0, .82, .55) * 1.25 * (1.0 - smoothstep(-.25, .12, d1));',
    '  c += emis * (1.0 - smoothstep(-.2, .6, d1) * .45);',
    '  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6); c += atmo * hasAtmo * fr * smoothstep(-.35, .55, d1) * .9;',
    '  gl_FragColor = vec4(c, alpha);',
    '}'
  ].join('\n');
  var HALO_F = [
    'uniform vec3 atmo, L1; uniform float alpha; varying vec3 vN;',
    'void main(){ vec3 N = normalize(vN); float e = 1.0 - abs(N.z); float i = pow(e, 5.0) * smoothstep(-.6, .5, dot(N, L1));',
    '  gl_FragColor = vec4(atmo * i * 1.6, i * alpha); }'
  ].join('\n');
  var RING_V = 'varying vec3 vP; varying vec3 vW; void main(){ vP = position; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var RING_F = [
    'uniform sampler2D map; uniform float alpha, inner, outer; uniform vec3 lc1; varying vec3 vP;',
    'void main(){ float r = length(vP.xy); float u = (r - inner) / (outer - inner); if (u < 0.0 || u > 1.0) discard;',
    '  vec4 t = texture2D(map, vec2(u, .5)); gl_FragColor = vec4(t.rgb * lc1 * .95, t.a * alpha * .92); }'
  ].join('\n');

  var R = null, scene, cam, group, globe, halo, ring, mat, hmat, rmat, loader, cache = {}, cur = null, visible = false;
  function vec(a) { return new T.Vector3(a[0], a[1], a[2]); }
  function col(h) { var c = new T.Color(h); return new T.Vector3(c.r, c.g, c.b); }
  function tex(name) {
    if (!name) return null;
    if (cache[name]) return cache[name];
    var t = loader.load(A + name, function () { if (cur && (cur.tex === name || cur.night === name || cur.rings === name)) apply(cur); });
    t.anisotropy = 4; cache[name] = t; return t;
  }
  function loaded(t) { return !!(t && t.image && (t.image.complete === undefined || t.image.complete) && t.image.width); }
  var L1 = new T.Vector3(-.82, .4, .42).normalize(), L2 = new T.Vector3(.78, .18, .5).normalize();   // lumière rasante : un vrai terminateur, comme sur les photos de sonde

  function init(canvas) {
    if (!T) return false;
    try { R = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'low-power' }); }
    catch (e) { return false; }
    R.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
    loader = new T.TextureLoader();
    group = new T.Group(); scene.add(group);
    var U = { map: { value: null }, nmap: { value: null }, hasMap: { value: 0 }, hasNight: { value: 0 }, water: { value: 0 }, haze: { value: 0 }, kind: { value: 0 }, time: { value: 0 },
      c0: { value: new T.Vector3() }, c1: { value: new T.Vector3() }, c2: { value: new T.Vector3() }, c3: { value: new T.Vector3() },
      L1: { value: L1 }, L2: { value: L2 }, lc1: { value: new T.Vector3(1, 1, 1) }, lc2: { value: new T.Vector3() }, atmo: { value: new T.Vector3() }, glow: { value: new T.Vector3() }, hasAtmo: { value: 1 }, alpha: { value: 1 } };
    mat = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true });
    globe = new T.Mesh(new T.SphereGeometry(1, 96, 64), mat); globe.renderOrder = 0; group.add(globe);
    hmat = new T.ShaderMaterial({ uniforms: { atmo: U.atmo, L1: U.L1, alpha: U.alpha }, vertexShader: VERT, fragmentShader: HALO_F, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.BackSide });
    halo = new T.Mesh(new T.SphereGeometry(1.07, 64, 48), hmat); halo.renderOrder = 1; group.add(halo);
    rmat = new T.ShaderMaterial({ uniforms: { map: { value: null }, alpha: U.alpha, inner: { value: 1.24 }, outer: { value: 2.27 }, lc1: U.lc1 }, vertexShader: RING_V, fragmentShader: RING_F, transparent: true, depthWrite: false, side: T.DoubleSide });
    ring = new T.Mesh(new T.RingGeometry(1.24, 2.27, 160, 1), rmat); ring.rotation.x = -Math.PI / 2 + .36; ring.renderOrder = 2; group.add(ring); ring.visible = false;
    return true;
  }
  function apply(w) {
    var U = mat.uniforms, m = tex(w.tex), n = tex(w.night);
    U.hasMap.value = w.tex && loaded(m) ? 1 : 0; U.map.value = m;
    U.hasNight.value = w.night && loaded(n) ? 1 : 0; U.nmap.value = n;
    U.water.value = w.water ? 1 : 0; U.haze.value = w.haze ? 1 : 0; U.kind.value = w.kind || 0;
    U.c0.value.copy(col(w.c[0])); U.c1.value.copy(col(w.c[1])); U.c2.value.copy(col(w.c[2])); U.c3.value.copy(col(w.c[3]));
    U.lc1.value.copy(vec(w.sun || [1, .97, .92])); U.lc2.value.copy(w.sun2 ? vec(w.sun2).multiplyScalar(.7) : new T.Vector3());
    U.atmo.value.copy(w.atmo ? vec(w.atmo) : new T.Vector3()); U.hasAtmo.value = w.atmo ? 1 : 0;
    U.glow.value.copy(w.glow ? vec(w.glow) : new T.Vector3());
    halo.visible = !!w.atmo;
    ring.visible = !!w.rings; if (w.rings) rmat.uniforms.map.value = tex(w.rings);
    group.rotation.set(0, 0, 0); globe.rotation.set(0, 0, 0);
    group.rotation.z = w.tilt != null ? w.tilt : (w.rings ? -.42 : .22);
  }
  function show(w) { cur = w; if (R) apply(w); visible = true; }
  function hide() { visible = false; if (R) R.clear(); }
  function resize(w, h, dpr) { if (!R) return; R.setPixelRatio(dpr); R.setSize(w, h, false); cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h; cam.updateProjectionMatrix(); }
  function place(x, y, r, a) { if (!R) return; group.position.set(x, -y, 0); group.scale.setScalar(r); mat.uniforms.alpha.value = a; }
  var t0 = 0;
  function render(dt) {
    if (!R || !visible || !cur) return;
    t0 += dt; mat.uniforms.time.value = t0;
    globe.rotation.y += dt * (cur.spin || .03);
    R.render(scene, cam);
  }
  window.CaelesWorlds = { list: WORLDS, init: init, show: show, hide: hide, resize: resize, place: place, render: render, get ok() { return !!R; } };
})();
