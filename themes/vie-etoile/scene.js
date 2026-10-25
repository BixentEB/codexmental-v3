/* Thème Vie d'une étoile — canvas 2D, six stades interpolés, deux destins. */
(function () {
  'use strict';
  var Codex = window.Codex, cv = document.getElementById('ve-cv'), g = cv.getContext('2d');
  if (!g) { window.CodexScene = { ok: false }; return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* paramètres d'un stade : r rayon (fraction de min(W,H)), c cœur RGB, h halo RGB, glow, dust nuage, disc disque, shell coquille, flash, beams jets, rays couronne, puls pulsation */
  function P(o) { var d = { r: 0, c: [255, 255, 255], h: [255, 200, 150], glow: 0, dust: 0, disc: 0, shell: 0, flash: 0, beams: 0, rays: 0, puls: 0 }; for (var k in o) d[k] = o[k]; return d; }
  var PATHS = {
    sun: { label: 'Étoile comme le Soleil', stages: [
      { id: 'atelier', menu: 1, name: 'Nébuleuse natale', dur: 'des millions d’années', text: 'Un nuage froid de gaz et de poussière s’effondre sur lui-même. Rien ne brille encore : tout est promesse. Ici vit l’Atelier, là où l’on range les idées avant qu’elles ne prennent forme.', p: P({ dust: 1, h: [255, 140, 110], glow: .05 }) },
      { id: 'lab', menu: 1, name: 'Protoétoile', dur: '≈ 50 millions d’années', text: 'Le cœur s’échauffe, un disque tourne autour. L’étoile n’est pas encore née, mais elle chauffe déjà. Le Laboratoire : ce qui se matérialise.', p: P({ r: .028, c: [255, 220, 180], h: [255, 150, 90], glow: .55, dust: .45, disc: 1 }) },
      { id: 'codex', menu: 1, name: 'Séquence principale', dur: '≈ 10 milliards d’années', text: 'La fusion de l’hydrogène s’allume et l’équilibre dure. C’est le long présent d’une étoile, celui du Soleil aujourd’hui. Le Codex : le temps des articles et des réflexions.', p: P({ r: .075, c: [255, 250, 225], h: [255, 205, 110], glow: 1, rays: 1 }) },
      { id: 'dashb', menu: 1, name: 'Géante rouge', dur: '≈ 1 milliard d’années', text: 'L’hydrogène du cœur est épuisé : l’étoile enfle, rougit, avale ses planètes proches. L’Observatoire : on regarde de loin ce qui change.', p: P({ r: .24, c: [255, 190, 130], h: [235, 70, 40], glow: .9, puls: 1 }) },
      { id: null, name: 'Nébuleuse planétaire', dur: '≈ 20 000 ans', text: 'Les couches externes s’échappent doucement et forment une coquille lumineuse. Elle n’a rien à voir avec les planètes : c’est un vieux nom.', p: P({ r: .02, c: [230, 245, 255], h: [120, 200, 255], glow: .8, shell: 1 }) },
      { id: 'profil', menu: 1, name: 'Naine blanche', dur: 'des milliards d’années à refroidir', text: 'Il ne reste que le cœur, petit comme la Terre et très dense, qui se refroidit lentement. Le Portrait : ce qui reste quand on ne garde que l’essentiel.', p: P({ r: .016, c: [245, 250, 255], h: [150, 190, 255], glow: .7 }) }
    ] },
    massive: { label: 'Étoile massive', stages: [
      { id: 'atelier', menu: 1, name: 'Nébuleuse natale', dur: 'quelques millions d’années', text: 'Un nuage plus lourd s’effondre plus vite et plus fort. Les étoiles massives sont rares, mais elles façonnent leur galaxie.', p: P({ dust: 1, h: [200, 110, 200], glow: .08 }) },
      { id: 'lab', menu: 1, name: 'Protoétoile', dur: '< 100 000 ans', text: 'Une naissance brutale : le disque est dense, les jets puissants. Tout va vite.', p: P({ r: .04, c: [225, 230, 255], h: [150, 160, 255], glow: .7, dust: .4, disc: 1 }) },
      { id: 'codex', menu: 1, name: 'Séquence principale', dur: 'quelques millions d’années', text: 'Bleue, des dizaines de fois plus massive que le Soleil, elle brûle son carburant en un éclair à l’échelle cosmique.', p: P({ r: .105, c: [235, 240, 255], h: [120, 150, 255], glow: 1.15, rays: 1.4 }) },
      { id: 'dashb', menu: 1, name: 'Supergéante rouge', dur: 'quelques centaines de milliers d’années', text: 'Elle gonfle démesurément. Dans son cœur, les éléments lourds se succèdent jusqu’au fer, qui ne rapporte plus d’énergie.', p: P({ r: .3, c: [255, 170, 120], h: [220, 50, 40], glow: 1, puls: 1.6 }) },
      { id: null, name: 'Supernova', dur: 'quelques semaines d’éclat', text: 'Le cœur s’effondre en une fraction de seconde, puis rebondit : une explosion qui, un instant, éclipse une galaxie entière et sème les éléments lourds.', p: P({ r: .05, c: [255, 255, 255], h: [255, 180, 160], glow: 1.6, shell: 1.6, flash: 1 }) },
      { id: 'profil', menu: 1, name: 'Étoile à neutrons', dur: 'pratiquement éternelle', text: 'Une boule de la taille d’une ville, plus dense qu’un noyau d’atome. Parfois, elle tourne et balaie l’espace de ses faisceaux : un pulsar. Les plus massives deviennent des trous noirs.', p: P({ r: .008, c: [220, 235, 255], h: [140, 170, 255], glow: .9, beams: 1 }) }
    ] }
  };
  var MENU_NAMES = { atelier: 'Atelier', lab: 'Laboratoire', codex: 'Codex', dashb: 'Observatoire', profil: 'Portrait' };

  /* ---------- état ---------- */
  var cfg = { path: 'sun', auto: true, speed: 1 };
  try { var sv = JSON.parse(localStorage.getItem('codex.vie') || '{}'); Object.keys(cfg).forEach(function (k) { if (sv[k] !== undefined) cfg[k] = sv[k]; }); } catch (e) {}
  if (!PATHS[cfg.path]) cfg.path = 'sun';
  function save() { try { localStorage.setItem('codex.vie', JSON.stringify(cfg)); } catch (e) {} }
  var stage = 0, cur = JSON.parse(JSON.stringify(PATHS[cfg.path].stages[0].p)), from = cur, to = cur, tt = 1, timer = 0, userHold = 0, cxShift = 0;
  var KEYS = ['r', 'glow', 'dust', 'disc', 'shell', 'flash', 'beams', 'rays', 'puls'];
  function setTarget(p, instant) {
    from = JSON.parse(JSON.stringify(cur)); to = p; tt = instant || reduce ? 1 : 0;
    if (tt === 1) cur = JSON.parse(JSON.stringify(p));
  }
  function mix(a, b, k) { return a + (b - a) * k; }
  function mixRGB(a, b, k) { return [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]; }
  function stepAnim(dt) {
    if (tt >= 1) return;
    tt = Math.min(1, tt + dt / 2.2); var k = ease(tt);
    KEYS.forEach(function (key) { cur[key] = mix(from[key], to[key], k); });
    cur.c = mixRGB(from.c, to.c, k); cur.h = mixRGB(from.h, to.h, k);
    if (to.flash && tt > .85) cur.flash = to.flash * (1 - (tt - .85) / .15 * .8);
  }

  /* ---------- fond : étoiles et poussière ---------- */
  var field = [], dustB = [], i;
  for (i = 0; i < 220; i++) field.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.3 + .3, a: Math.random() * .6 + .2, tw: Math.random() * 6 });
  for (i = 0; i < 26; i++) dustB.push({ a: Math.random() * 6.28, d: Math.random(), s: .12 + Math.random() * .22, sp: (Math.random() - .5) * .08, hue: Math.random() });
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function blob(x, y, r, c, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }

  var clock = 0;
  function draw() {
    var m = Math.min(W, H), cx = W * (.5 - cxShift * .2), cy = H * .46;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    // fond d'étoiles
    field.forEach(function (s) { var a = s.a * (.7 + .3 * Math.sin(clock * .8 + s.tw)); g.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; g.fillRect(s.x * W, s.y * H, s.s, s.s); });
    g.globalCompositeOperation = 'lighter';
    // nuage
    if (cur.dust > .01) dustB.forEach(function (b) {
      var a = b.a + clock * b.sp, dist = b.d * m * (.62 - .3 * cur.disc * .8), x = cx + Math.cos(a) * dist * 1.25, y = cy + Math.sin(a) * dist * .7;
      var col = b.hue > .5 ? cur.h : [150, 90, 170]; blob(x, y, b.s * m * (.9 - .35 * cur.disc), col, .09 * cur.dust);
    });
    // disque
    if (cur.disc > .01) { g.save(); g.translate(cx, cy); g.rotate(-.35); g.scale(1, .26); for (var k = 0; k < 4; k++) { var rr = m * (.1 + k * .06); g.strokeStyle = rgba(cur.h, .16 * cur.disc / (k + 1)); g.lineWidth = 9 - k * 2; g.beginPath(); g.arc(0, 0, rr, 0, 6.2832); g.stroke(); } g.restore(); }
    // coquille / onde de choc
    if (cur.shell > .01) {
      var sr = m * (.14 + cur.shell * .2 + .015 * Math.sin(clock)); var shc = to.flash ? [255, 150, 120] : [110, 210, 255];
      for (var j = 0; j < 3; j++) { g.strokeStyle = rgba(shc, .22 - j * .05); g.lineWidth = 14 - j * 4; g.beginPath(); g.arc(cx, cy, sr + j * 10, 0, 6.2832); g.stroke(); }
      blob(cx, cy, sr * 1.15, shc, .1);
    }
    // halo + étoile
    var pulse = 1 + cur.puls * .04 * Math.sin(clock * 1.6), R = Math.max(1.5, cur.r * m) * pulse;
    if (cur.glow > .01) {
      blob(cx, cy, R * 5.5 + m * .04, cur.h, .22 * Math.min(1.6, cur.glow));
      blob(cx, cy, R * 2.6 + 6, cur.h, .4 * Math.min(1.4, cur.glow));
    }
    if (cur.rays > .01) { g.save(); g.translate(cx, cy); g.rotate(clock * .05); for (var q = 0; q < 12; q++) { g.rotate(6.2832 / 12); var L = R * (2.2 + .8 * Math.sin(clock * 1.3 + q * 2.1)) * cur.rays, gr = g.createLinearGradient(R, 0, R + L, 0); gr.addColorStop(0, rgba(cur.h, .28)); gr.addColorStop(1, rgba(cur.h, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(R * .9, -R * .09); g.lineTo(R + L, 0); g.lineTo(R * .9, R * .09); g.fill(); } g.restore(); }
    if (cur.beams > .01) { g.save(); g.translate(cx, cy); g.rotate(clock * 1.1); [1, -1].forEach(function (sgn) { var gr = g.createLinearGradient(0, 0, sgn * m * .42, 0); gr.addColorStop(0, rgba(cur.h, .55 * cur.beams)); gr.addColorStop(1, rgba(cur.h, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -3); g.lineTo(sgn * m * .42, -m * .035); g.lineTo(sgn * m * .42, m * .035); g.lineTo(0, 3); g.fill(); }); g.restore(); }
    if (cur.r > 0) {
      var cg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      cg.addColorStop(0, rgba(cur.c, 1)); cg.addColorStop(.7, rgba(mixRGB(cur.c, cur.h, .6), .95)); cg.addColorStop(1, rgba(cur.h, .0));
      g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();
    }
    if (cur.flash > .01) { g.fillStyle = 'rgba(255,255,255,' + (cur.flash * .45).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'source-over';
  }

  /* ---------- interface ---------- */
  var timeEl = document.getElementById('ve-time'), nEl = document.getElementById('ve-n'), dEl = document.getElementById('ve-d'), tEl = document.getElementById('ve-t');
  function buildTime() {
    var path = PATHS[cfg.path]; timeEl.innerHTML = '';
    path.stages.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; if (s.menu) b.className = 'menu';
      b.innerHTML = s.name + (s.menu ? '<small>' + MENU_NAMES[s.id] + '</small>' : '<small>&nbsp;</small>');
      b.addEventListener('click', function () { userHold = 25; goStage(i); if (s.id) { /* clic sur une rubrique : on ouvre la page */ Codex.navigate(s.id); } });
      timeEl.appendChild(b);
    });
    var pb = document.createElement('button'); pb.type = 'button'; pb.className = 've-path'; pb.title = 'Changer de destin'; pb.textContent = cfg.path === 'sun' ? 'Destin ⇄' : 'Destin ⇄'; pb.title = 'Changer de destin (' + PATHS[cfg.path].label + ')';
    pb.setAttribute('aria-label', 'Changer de destin : actuellement ' + path.label);
    pb.addEventListener('click', function () { cfg.path = cfg.path === 'sun' ? 'massive' : 'sun'; save(); userHold = 25; buildTime(); goStage(Math.min(stage, 5)); syncPop(); });
    timeEl.appendChild(pb);
  }
  function goStage(i) {
    stage = clamp(i, 0, 5); var s = PATHS[cfg.path].stages[stage];
    setTarget(s.p);
    nEl.textContent = s.name; dEl.textContent = PATHS[cfg.path].label + ' · ' + s.dur; tEl.textContent = s.text;
    Array.prototype.forEach.call(timeEl.children, function (b, k) { if (b.classList.contains('ve-path')) return; if (k === stage) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    timer = 0;
  }
  function stageOf(id) { var st = PATHS[cfg.path].stages; for (var k = 0; k < st.length; k++) if (st[k].id === id) return k; return -1; }

  Codex.on('navigate', function (e) {
    if (e.direct) return;
    if (!e.id) { Codex.reader.close(); return; }
    var k = stageOf(e.id); userHold = 25;
    if (k >= 0 && k !== stage) { goStage(k); setTimeout(function () { Codex.reader.open(e.id); }, reduce ? 0 : 900); }
    else Codex.reader.open(e.id);
  });
  Codex.on('reader:close', function () { userHold = 8; });

  var pop = null;
  function syncPop() { var p = document.getElementById('ve-path'); if (p) p.value = cfg.path; }
  if (Codex.customize) {
    pop = Codex.customize.pop();
    pop.innerHTML = '<div><label class="cx-l" for="ve-path">Destin</label><select id="ve-path" style="width:100%;padding:8px;background:transparent;color:inherit;border:1px solid var(--line);border-radius:8px"><option value="sun">Étoile comme le Soleil</option><option value="massive">Étoile massive</option></select></div>' +
      '<label class="cx-row" for="ve-auto"><span>Lecture automatique</span><input id="ve-auto" type="checkbox"></label>' +
      '<div><label class="cx-l" for="ve-speed">Rythme</label><input id="ve-speed" type="range" min=".5" max="2" step=".1"></div>';
    var $ = function (id) { return document.getElementById(id); };
    $('ve-path').value = cfg.path; $('ve-auto').checked = cfg.auto; $('ve-speed').value = cfg.speed;
    $('ve-path').addEventListener('change', function (e) { cfg.path = e.target.value; save(); buildTime(); goStage(stage); });
    $('ve-auto').addEventListener('change', function (e) { cfg.auto = e.target.checked; save(); });
    $('ve-speed').addEventListener('input', function (e) { cfg.speed = parseFloat(e.target.value); save(); });
  }

  /* ---------- boucle ---------- */
  function resize() { W = window.innerWidth; H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; }
  window.addEventListener('resize', resize); resize();
  var last = performance.now(), paused = document.hidden;
  document.addEventListener('visibilitychange', function () { paused = document.hidden; last = performance.now(); if (!paused) requestAnimationFrame(frame); });
  function frame(now) {
    if (paused) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    var reading = document.documentElement.classList.contains('reading');
    cxShift += ((reading ? 1 : 0) - cxShift) * Math.min(1, dt * 4);
    stepAnim(dt);
    if (userHold > 0) userHold -= dt;
    else if (cfg.auto && !reading && !reduce) { timer += dt * cfg.speed; if (timer > 9) { goStage((stage + 1) % 6); } }
    draw(); requestAnimationFrame(frame);
  }
  buildTime(); goStage(0); setTarget(PATHS[cfg.path].stages[0].p, true);
  window.CodexScene = { ok: true };
  requestAnimationFrame(frame);
})();
