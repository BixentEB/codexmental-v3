/* ======================================================================
   CODEX MENTAL v3 — « visiteurs inattendus » (easter eggs des scènes)
   Règle (décidée le 05/11/2026) : spéciaux, rares, sous conditions, jamais des parasites sans but.
   - au plus UNE apparition spontanée par jour, et pas à chaque visite (≈ une visite sur quatre,
     une sur deux la nuit entre 22 h et 5 h : les soucoupes sortent la nuit) ;
   - dates : 24 juin (Kenneth Arnold, 1947, naissance des « soucoupes volantes ») et 2 juillet
     (journée mondiale des OVNI) : passage garanti ; 1er avril : une surprise ;
   - gestes : une longue contemplation (3 minutes sans toucher à rien) ou trois visites du même astre ;
   - soucoupes, Caeles et flotte : seulement dans les thèmes spatiaux ; Caeles au plus une fois par jour ;
     Atome et Neurone gardent leurs clins d'œil (le chat de Schrödinger, l'idée lumineuse) ;
   - code Konami (↑ ↑ ↓ ↓ ← → ← → B A) : la flotte (thèmes spatiaux), la superposition (Atome), Eurêka (Neurone) ;
   - réglage « Visiteurs inattendus » dans le menu des thèmes (activé par défaut), coupé si le système demande
     moins d'animations ;
   - essais : ?ovni (ou ?ovni=caeles|soucoupe|flotte|special|konami|avril) et, dans la console,
     Codex.ovni('soucoupe' | 'caeles' | 'flotte' | 'special' | 'konami' | 'avril').
   Une scène peut ajouter ses propres visiteurs : Codex.visitors.add('nom', function (layer, done) {…}).
   Événement émis : Codex.emit('visitor', { type, phase: 'start' | 'end' | 'caught' }).
   ====================================================================== */
(function () {
  'use strict';
  var C = window.Codex; if (!C) return;
  var KEY_ON = 'codex.visitors', KEY_DAY = 'codex.visitors.day', KEY_N = 'codex.ovnis', KEY_CAELES = 'codex.visitors.caeles';
  // thèmes où soucoupes, Caeles et flotte ont leur place
  var SPACE = ['heliosphere', 'galactique', 'voisinage', 'ciel-profond', 'champ-stellaire', 'vie-etoile', 'poste-pilotage', 'ciel-ailleurs'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = true; try { on = localStorage.getItem(KEY_ON) !== '0'; } catch (e) {}
  var layer = null, busy = false, timer = null, toastEl = null, toastT = null;
  var html = document.documentElement;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function vw() { return window.innerWidth || 1280; }
  function vh() { return window.innerHeight || 720; }
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, cls, inner) { var e = document.createElement(tag); if (cls) e.className = cls; if (inner) e.innerHTML = inner; return e; }
  function anim(node, frames, opt) { var a = node.animate(frames, Object.assign({ fill: 'forwards', easing: 'linear' }, opt)); return a; }

  /* ---------- dessins ---------- */
  var SAUCER = '<svg viewBox="0 0 64 40" aria-hidden="true"><defs><radialGradient id="cxv-dome" cx="40%" cy="30%"><stop offset="0" stop-color="#e9fbff" stop-opacity=".95"/><stop offset="1" stop-color="#7fd6ff" stop-opacity=".35"/></radialGradient><linearGradient id="cxv-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f4fa"/><stop offset=".55" stop-color="#9aa6b8"/><stop offset="1" stop-color="#4c5566"/></linearGradient></defs>' +
    '<path d="M21 21Q23 7 32 7Q41 7 43 21Z" fill="url(#cxv-dome)" stroke="#cfefff" stroke-width=".8"/>' +
    '<ellipse cx="32" cy="24" rx="27" ry="8.5" fill="url(#cxv-hull)" stroke="#e6ecf6" stroke-width=".8"/>' +
    '<path d="M11 27Q32 39 53 27" fill="none" stroke="#3b4352" stroke-width="1.4"/>' +
    '<circle class="lt" cx="19" cy="26" r="1.9"/><circle class="lt" cx="32" cy="28.6" r="1.9"/><circle class="lt" cx="45" cy="26" r="1.9"/></svg>';
  var ROADSTER = '<svg viewBox="0 0 120 48" aria-hidden="true">' +
    '<path d="M8 33 Q10 24 26 22 L44 20 Q52 12 64 12 L74 13 Q82 19 96 21 Q110 23 112 31 L112 35 L8 36 Z" fill="#c8202b" stroke="#ff6b6b" stroke-width=".8"/>' +
    '<path d="M48 20 Q55 14 64 14 L72 15 Q76 18 78 20 Z" fill="#9ad4ff" fill-opacity=".45"/>' +
    '<circle cx="62" cy="10" r="5.2" fill="#f3f5fa" stroke="#9aa3b5" stroke-width=".8"/><path d="M59 9.4h6" stroke="#3a3f4c" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M58 15 Q62 13 66 15 L67 22 L57 22 Z" fill="#f3f5fa"/>' +
    '<circle cx="28" cy="36" r="6" fill="#1b1d24" stroke="#777e8c" stroke-width="1.4"/><circle cx="92" cy="36" r="6" fill="#1b1d24" stroke="#777e8c" stroke-width="1.4"/></svg>';
  var CAT = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<path d="M6 40 L32 52 L58 40 L58 60 L32 64 L6 60 Z" fill="#6b4a2b" stroke="#c9a06a" stroke-width="1"/><path d="M6 40 L32 28 L58 40 L32 52 Z" fill="#8a6338" stroke="#c9a06a" stroke-width="1"/>' +
    '<path d="M22 40 Q20 22 26 16 L24 6 L31 13 Q33 12.4 35 13 L42 6 L40 16 Q46 22 44 40 Z" fill="#141722" stroke="#9fd8ff" stroke-width="1.2"/>' +
    '<ellipse cx="29" cy="22" rx="1.8" ry="2.6" fill="#ffe27a"/><ellipse cx="37" cy="22" rx="1.8" ry="2.6" fill="#ffe27a"/>' +
    '<path d="M44 36 Q54 30 50 20" fill="none" stroke="#141722" stroke-width="3" stroke-linecap="round"/></svg>';
  var BULB = '<svg viewBox="0 0 40 56" aria-hidden="true"><defs><radialGradient id="cxv-bulb" cx="50%" cy="40%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb23e" stop-opacity=".2"/></radialGradient></defs>' +
    '<path d="M20 3 C9 3 4 12 4 19 C4 27 11 31 13 38 L27 38 C29 31 36 27 36 19 C36 12 31 3 20 3 Z" fill="url(#cxv-bulb)" stroke="#fff3c4" stroke-width="1"/>' +
    '<path d="M15 30 Q20 22 25 30" fill="none" stroke="#ff9f2e" stroke-width="1.4"/>' +
    '<rect x="13" y="39" width="14" height="4" rx="1.5" fill="#b9c1cf"/><rect x="14" y="44" width="12" height="4" rx="1.5" fill="#8f98a8"/><path d="M17 49h6l-1.5 3h-3z" fill="#6c7484"/></svg>';

  var UFOS = [{ f: 'soucoupe-dessous.webp', w: 120 }, { f: 'soucoupe-profil.webp', w: 130 }, { f: 'soucoupe-vieille.webp', w: 110, old: true }];
  // teinte selon la lumière du thème : chaude près du Soleil, froide dans les ciels bleutés
  var TINTS = { heliosphere: ' sepia(.18) hue-rotate(-8deg)', 'vie-etoile': ' sepia(.12)', galactique: ' hue-rotate(6deg)', atome: ' hue-rotate(12deg) saturate(1.1)', neurone: ' hue-rotate(10deg)' };
  function TINT() { return TINTS[C.theme && C.theme.id] || ''; }
  /* ---------- trajets ---------- */
  function path(node, w, opt) {   // traversée en douceur avec un léger tangage
    var L = opt.ltr !== false, y0 = opt.y, y1 = y0 + rnd(-.12, .12) * vh(), x0 = L ? -w - 40 : vw() + 40, x1 = L ? vw() + 40 : -w - 40, n = 6, fr = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 2 + opt.ph) * opt.wob;
      fr.push({ transform: 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) rotate(' + (Math.sin(t * 7 + opt.ph) * (opt.tilt || 0)).toFixed(1) + 'deg) scale(' + (opt.s0 + (opt.s1 - opt.s0) * t).toFixed(3) + ')', opacity: i === 0 || i === n ? 0 : 1 });
    }
    return anim(node, fr, { duration: opt.dur, easing: 'linear' });
  }
  function sprite(cls, inner, w, label) {
    var s = el('button', 'cxv ' + cls, inner); s.type = 'button'; s.style.width = w + 'px';
    s.setAttribute('aria-label', label); s.tabIndex = -1;
    layer.appendChild(s); return s;
  }
  function flee(s, a, type) {   // attrapé : il file en un éclair
    s.addEventListener('click', function () {
      if (s._caught) return; s._caught = true; caught(type);
      var r = s.getBoundingClientRect(); try { a.pause(); } catch (e) {}
      s.style.transform = 'none'; s.style.left = r.left + 'px'; s.style.top = r.top + 'px';
      anim(s, [{ transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'translate(0,-6px) scale(1.12)', opacity: 1, filter: 'brightness(1.8)', offset: .25 }, { transform: 'translate(' + (r.left > vw() / 2 ? '' : '-') + '40px,-' + (vh() * .5).toFixed(0) + 'px) scale(.05)', opacity: 0, filter: 'brightness(3)' }], { duration: 650, easing: 'cubic-bezier(.6,0,.9,.4)' })
        .finished.then(function () { a.cancel(); s.remove(); }).catch(function () {});
    });
  }
  function run(type, s, a) {
    C.emit('visitor', { type: type, phase: 'start' });
    flee(s, a, type);
    return a.finished.then(function () { s.remove(); }, function () {}).then(function () { C.emit('visitor', { type: type, phase: 'end' }); });
  }

  var KINDS = {
    soucoupe: function (opt) {
      // trois soucoupes photoréalistes ; la profondeur règle la taille, la netteté, la lumière et la vitesse
      opt = opt || {};
      var V = UFOS[opt.v != null ? opt.v : Math.floor(Math.random() * UFOS.length)], d = opt.d != null ? opt.d : rnd(.25, 1);
      var w = Math.round((V.w * (.45 + .75 * d)) * Math.min(1, vw() / 1280 + .25));
      var s = sprite('cxv-ufo' + (V.old ? ' cxv-old' : '') + (opt.flip ? ' cxv-flip' : ''), '<i class="cxv-beam"></i><img src="img/visitors/' + V.f + '" alt="" draggable="false">', w, 'Une soucoupe volante : l\u2019attraper');
      s.style.filter = 'brightness(' + (.72 + .3 * d).toFixed(2) + ') saturate(' + (.85 + .2 * d).toFixed(2) + ')' + (d < .45 ? ' blur(' + ((.45 - d) * 1.6).toFixed(2) + 'px)' : '') + TINT();
      var dur = rnd(10000, 15000) * (1.25 - d * .4) * (V.old ? 1.35 : 1), ltr = Math.random() < .5;
      var a = path(s, w, { y: rnd(.14, .48) * vh(), ltr: ltr, dur: dur, wob: rnd(8, 20) * (V.old ? 1.6 : 1), ph: rnd(0, 6), tilt: V.old ? 11 : 6, s0: 1, s1: 1 });
      var beam = s.querySelector('.cxv-beam'), b0 = opt.beam != null ? opt.beam : rnd(.36, .5);
      if (opt.beam !== false) {
        var fr = [{ opacity: 0, transform: 'translateX(-50%) scaleY(.05)' }, { opacity: 0, transform: 'translateX(-50%) scaleY(.05)', offset: b0 },
          { opacity: .85, transform: 'translateX(-50%) scaleY(1)', offset: b0 + .06 }];
        if (V.old) fr.push({ opacity: .2, transform: 'translateX(-50%) scaleY(.9)', offset: b0 + .08 }, { opacity: .8, transform: 'translateX(-50%) scaleY(1)', offset: b0 + .1 }, { opacity: .15, transform: 'translateX(-50%) scaleY(.8)', offset: b0 + .13 }, { opacity: .7, transform: 'translateX(-50%) scaleY(1)', offset: b0 + .15 });
        fr.push({ opacity: .85, transform: 'translateX(-50%) scaleY(1)', offset: b0 + .17 }, { opacity: 0, transform: 'translateX(-50%) scaleY(.2)', offset: b0 + .24 }, { opacity: 0, transform: 'translateX(-50%) scaleY(.05)' });
        anim(beam, fr, { duration: dur });
      }
      return run('soucoupe', s, a);
    },
    caeles: function () {
      var d = rnd(.4, 1), w = Math.round(Math.min(vw() * .16, 110 + 150 * d)), s = sprite('cxv-caeles', '<img src="img/visitors/caeles.webp" alt="" draggable="false">', w, 'Caeles, le vaisseau de Vincent : le saluer');
      s.style.filter = 'brightness(' + (.8 + .2 * d).toFixed(2) + ') contrast(1.04)' + (d < .55 ? ' blur(' + ((.55 - d) * 1.2).toFixed(2) + 'px)' : '') + TINT();
      var y = rnd(.2, .55) * vh(), dur = rnd(11000, 15000) * (1.2 - d * .3), jump = Math.random() < .5;
      if (!jump) return run('caeles', s, path(s, w, { y: y, ltr: true, dur: dur, wob: 6, ph: 0, tilt: 1.2, s0: .62, s1: 1.08 }));
      // variante : il traverse jusqu'au milieu, puis passe en hyperespace
      var xm = vw() * rnd(.42, .6), fr = [
        { transform: 'translate(' + (-w - 40) + 'px,' + (y + 30).toFixed(0) + 'px) scale(.6)', opacity: 0 },
        { transform: 'translate(' + (xm * .5).toFixed(0) + 'px,' + (y + 12).toFixed(0) + 'px) scale(.8)', opacity: 1, offset: .35 },
        { transform: 'translate(' + xm.toFixed(0) + 'px,' + y.toFixed(0) + 'px) scale(.92)', opacity: 1, offset: .72, easing: 'cubic-bezier(.7,0,1,.5)' },
        { transform: 'translate(' + (xm + 40).toFixed(0) + 'px,' + y.toFixed(0) + 'px) scale(.92,.9)', opacity: 1, filter: 'brightness(1.6)', offset: .8 },
        { transform: 'translate(' + (vw() + w * 2).toFixed(0) + 'px,' + y.toFixed(0) + 'px) scale(3.2,.5)', opacity: 0, filter: 'brightness(3) blur(2px)' }
      ];
      var a = anim(s, fr, { duration: dur * .7 });
      setTimeout(function () { if (!s._caught && s.isConnected) flash(y + w * .2); }, dur * .7 * .8);
      return run('caeles', s, a);
    },
    flotte: function () {
      // une flotte : profondeurs et modèles variés, faisceaux décalés (deux soucoupes sur cinq n'en allument pas)
      var jobs = [], beams = [.3, false, .42, .55, false].sort(function () { return Math.random() - .5; });
      for (var i = 0; i < 5; i++) (function (k) { jobs.push(new Promise(function (ok) { setTimeout(function () { KINDS.soucoupe({ v: k % UFOS.length, d: rnd(.2, 1), beam: beams[k] }).then(ok); }, 400 + k * rnd(500, 900)); })); })(i);
      if (caelesFree()) { put(KEY_CAELES, today()); jobs.push(KINDS.caeles()); }   // Caeles : au plus une fois par jour, même dans la flotte
      return Promise.all(jobs);
    }
  };
  function flash(y) {   // trait lumineux du saut en hyperespace
    var f = el('i', 'cxv-flash'); f.style.top = y + 'px'; layer.appendChild(f);
    anim(f, [{ opacity: 0, transform: 'scaleX(.1)' }, { opacity: 1, transform: 'scaleX(1)', offset: .2 }, { opacity: 0, transform: 'scaleX(1.2)' }], { duration: 700, easing: 'ease-out' }).finished.then(function () { f.remove(); });
  }

  /* visiteurs propres à certains thèmes */
  var SPECIAL = {
    heliosphere: function () {   // le Roadster et son mannequin, en orbite autour du Soleil depuis 2018
      var w = 92, s = sprite('cxv-roadster', ROADSTER, w, 'Un roadster en orbite autour du Soleil');
      return run('roadster', s, path(s, w, { y: rnd(.18, .5) * vh(), ltr: Math.random() < .5, dur: rnd(16000, 22000), wob: 8, ph: rnd(0, 6), tilt: 28, s0: .9, s1: 1 }));
    },
    atome: function () {   // le chat de Schrödinger : là… et pas là (dans l'atome lui-même, en nuage de probabilité)
      var inScene = C.atomeFx && C.atomeFx.cat(); if (inScene) { C.emit('visitor', { type: 'chat', phase: 'start' }); return inScene.then(function () { C.emit('visitor', { type: 'chat', phase: 'end' }); }); }
      var w = 64, s = sprite('cxv-cat', CAT, w, 'Le chat de Schrödinger');
      s.style.left = (vw() * rnd(.12, .78)).toFixed(0) + 'px'; s.style.top = (vh() * rnd(.22, .62)).toFixed(0) + 'px';
      var fr = [{ opacity: 0 }], n = 9; for (var i = 1; i < n; i++) fr.push({ opacity: i % 2 ? rnd(.55, .95) : rnd(0, .2), offset: i / n }); fr.push({ opacity: 0 });
      fr.forEach(function (k) { k.easing = 'steps(1, end)'; });   // le pas s'applique entre chaque image clé (sinon l'opacité resterait à 0 tout du long)
      return run('chat', s, anim(s, fr, { duration: 7000 }));
    },
    neurone: function () {   // une idée lumineuse qui s'allume puis s'élève
      var w = 34, s = sprite('cxv-bulb', BULB, w, 'Une idée lumineuse'), x = vw() * rnd(.2, .75), y = vh() * rnd(.35, .6);
      return run('idee', s, anim(s, [
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(.6)', opacity: 0, filter: 'brightness(.6)' },
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1, filter: 'brightness(.8)', offset: .15 },
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.08)', opacity: 1, filter: 'brightness(1.6) drop-shadow(0 0 14px #ffd36a)', offset: .3 },
        { transform: 'translate(' + (x + 20) + 'px,' + (y - vh() * .3) + 'px) scale(.8)', opacity: 0, filter: 'brightness(1.4) drop-shadow(0 0 10px #ffd36a)' }
      ], { duration: 6500, easing: 'ease-in-out' }));
    }
  };
  function addKind(name, fn) { KINDS[name] = function () { return Promise.resolve(fn(layer)); }; }

  /* ---------- compteur ---------- */
  var MILESTONES = { 1: 'Premier ovni repéré !', 5: 'Cinq ! Tu as l’œil.', 10: 'Œil de lynx.', 25: 'Chasseur d’ovnis confirmé.', 50: 'Nox te propose un poste au radar.' };
  var NAMES = { soucoupe: 'Ovni repéré', caeles: 'Caeles vous salue', roadster: 'Roadster repéré', chat: 'Le chat est… vivant ?', idee: 'Idée attrapée', flotte: 'Flotte repérée' };
  function caught(type) {
    var n = (parseInt(get(KEY_N, '0'), 10) || 0) + 1; put(KEY_N, String(n));
    C.emit('visitor', { type: type, phase: 'caught', count: n });
    toast((NAMES[type] || 'Ovni repéré') + ' · ' + n + (MILESTONES[n] ? ' — ' + MILESTONES[n] : ''));
  }
  function toast(txt) {
    if (!toastEl) { toastEl = el('div', 'cxv-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = txt; toastEl.classList.add('on'); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 3600);
  }

  /* ---------- choix ---------- */
  function themeId() { return C.theme && C.theme.id; }
  function spatial() { return SPACE.indexOf(themeId()) >= 0; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function caelesFree() { return get(KEY_CAELES, '') !== today(); }
  function allowed() { return on && !reduce && C.sceneOk && !html.classList.contains('noscene') && !document.hidden && !html.classList.contains('reading'); }
  function pickKind() {
    var id = themeId(), r = Math.random();
    if (!spatial()) return SPECIAL[id] ? 'special' : null;           // Atome, Neurone : leurs clins d'œil seulement
    if (caelesFree() && r < .2) return 'caeles';
    if (SPECIAL[id] && r < .5) return 'special';
    return 'soucoupe';
  }
  function play(kind, force) {
    if (!layer) return Promise.resolve(false);
    if (!force && (!allowed() || busy)) return Promise.resolve(false);
    var id = themeId(), k = kind || pickKind(), fn;
    if (!k) return Promise.resolve(false);
    if (k === 'special') fn = SPECIAL[id] || KINDS.soucoupe;
    else if (k === 'konami') fn = konami;
    else if (k === 'avril') fn = avril;
    else fn = KINDS[k];
    if (!fn) { console.warn('[Codex] visiteur inconnu : ' + k + ' (soucoupe, caeles, flotte, special, konami, avril' + Object.keys(KINDS).filter(function (x) { return ['soucoupe', 'caeles', 'flotte'].indexOf(x) < 0; }).map(function (x) { return ', ' + x; }).join('') + ')'); return Promise.resolve(false); }
    if (k === 'caeles') put(KEY_CAELES, today());
    busy = true;
    return Promise.resolve().then(fn).catch(function (e) { console.warn('[Codex] visiteur :', e && e.message || e); }).then(function () { busy = false; return true; });
  }
  // 1er avril : une soucoupe à l'envers, qui n'a visiblement pas compris
  function avril() { toast('1er avril : quelqu’un pilote à l’envers.'); return KINDS.soucoupe({ flip: true, beam: false }); }
  // code Konami : la surprise dépend du thème
  function konami() {
    var id = themeId();
    if (id === 'atome' && C.atomeFx) { var sp = C.atomeFx.superposition(); if (sp) { toast('Code Konami : superposition ! Le chat est sur toutes les orbites à la fois.'); return sp; } }
    if (id === 'neurone' && C.neuroneFx) { var eu = C.neuroneFx.eureka(); if (eu) { toast('Code Konami : Eurêka !'); return Promise.all([eu, ideas()]); } }
    if (!spatial()) return Promise.resolve(false);
    toast('Code Konami : la flotte arrive !');
    return KINDS.flotte();
  }
  function ideas() {   // Eurêka : une pluie d'idées lumineuses au-dessus du cerveau
    var b = C.neuroneFx && C.neuroneFx.box(), jobs = [];
    for (var i = 0; i < 7; i++) (function (k) {
      jobs.push(new Promise(function (ok) { setTimeout(function () {
        var w = 26, s = sprite('cxv-bulb', BULB, w, 'Une idée lumineuse'), x = b ? b.x + b.w * (.12 + Math.random() * .76) : vw() * rnd(.2, .8), y = b ? b.y + b.h * (.15 + Math.random() * .5) : vh() * rnd(.3, .6);
        run('idee', s, anim(s, [
          { transform: 'translate(' + x + 'px,' + y + 'px) scale(.5)', opacity: 0 },
          { transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1, filter: 'brightness(1.6) drop-shadow(0 0 12px #ffd36a)', offset: .25 },
          { transform: 'translate(' + (x + rnd(-20, 20)) + 'px,' + (y - vh() * .22) + 'px) scale(.7)', opacity: 0 }
        ], { duration: 4200, easing: 'ease-out' })).then(ok);
      }, 500 + k * 380); }));
    })(i);
    return Promise.all(jobs);
  }

  /* ---------- conditions ---------- */
  var timer = null, idleT = null, gestureUsed = false, visits = {};
  function chance() {   // une apparition spontanée aujourd'hui ? (au plus une par jour)
    if (get(KEY_DAY, '') === today()) return null;
    var d = new Date(), m = d.getMonth() + 1, j = d.getDate(), h = d.getHours();
    if ((m === 6 && j === 24) || (m === 7 && j === 2)) return 'garanti';
    if (m === 4 && j === 1) return 'avril';
    var p = h >= 22 || h < 5 ? .5 : .25;
    return Math.random() < p ? 'oui' : null;
  }
  function whenFree(fn, tries) {   // attendre que le lecteur soit refermé, l'onglet visible…
    clearTimeout(timer);
    timer = setTimeout(function () { if (allowed() && !busy) fn(); else if ((tries || 0) < 40) whenFree(fn, (tries || 0) + 1); }, tries ? 15000 : 0);
  }
  function spontaneous(kind) {
    whenFree(function () { put(KEY_DAY, today()); play(kind); });
  }
  function gesture() {   // un geste : au plus un par visite
    if (gestureUsed || !on || reduce || !C.sceneOk) return;
    gestureUsed = true; whenFree(function () { play(); });
  }
  function resetIdle() { clearTimeout(idleT); if (!gestureUsed) idleT = setTimeout(gesture, 180000); }

  /* ---------- code Konami ---------- */
  var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0;
  window.addEventListener('keydown', function (e) {
    var t = e.target; if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) { pos = 0; return; }
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === SEQ[pos] ? pos + 1 : (k === SEQ[0] ? 1 : 0);
    if (pos === SEQ.length) { pos = 0; if (on && !reduce && C.sceneOk) { busy = false; play('konami', true); } }
  });

  /* ---------- réglage ---------- */
  function settingsRow() {
    var menu = document.getElementById('theme-menu'); if (!menu || menu.querySelector('.cxv-row')) return;
    var li = el('li', 'perf-row cxv-row'); li.setAttribute('role', 'none');
    li.innerHTML = '<label class="cx-keys-sw"><input type="checkbox" id="cxv-on"> Visiteurs inattendus</label>' +
      '<small class="perf-hint">' + (reduce ? 'Coupés : votre système demande moins d’animations.' : 'Rarement, et seulement sous certaines conditions. À vous de les trouver.') + '</small>';
    var perf = menu.querySelector('.perf-row:not(.cx-keys-row)'); menu.insertBefore(li, perf || null);
    var cb = li.querySelector('input'); cb.checked = on && !reduce; cb.disabled = reduce;
    cb.addEventListener('change', function () { on = cb.checked; put(KEY_ON, on ? '1' : '0'); if (!on) { clearTimeout(timer); clearTimeout(idleT); } });
  }

  /* ---------- démarrage ---------- */
  C.visitors = { play: play, add: addKind, caught: caught, toast: toast, get count() { return parseInt(get(KEY_N, '0'), 10) || 0; } };
  C.ovni = function (kind) { if (!layer) return 'Pas de scène ici : rien ne peut voler.'; busy = false; play(kind || 'soucoupe', true); return 'En approche : ' + (kind || 'soucoupe'); };
  C.on('ready', function () {
    layer = el('div', 'cxv-layer'); layer.setAttribute('aria-hidden', 'true');
    // une scène peut accueillir les visiteurs dans son propre décor (Poste de pilotage : derrière les vitres)
    if (C.visitorsHost && C.visitorsHost.appendChild) { layer.classList.add('cxv-in'); C.visitorsHost.appendChild(layer); }
    else document.body.appendChild(layer);
    settingsRow();
    if (!C.sceneOk) return;
    var q = new URLSearchParams(location.search);
    if (q.has('ovni')) { setTimeout(function () { busy = false; play(q.get('ovni') || 'soucoupe', true); }, 1200); return; }
    if (!on || reduce) return;
    var c = chance();
    if (c) setTimeout(function () { spontaneous(c === 'avril' ? 'avril' : null); }, rnd(20000, 90000));
    // gestes : longue contemplation, ou trois visites du même astre
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (n) { window.addEventListener(n, resetIdle, { passive: true }); });
    resetIdle();
    C.on('navigate', function (ev) { if (!ev || !ev.id) return; visits[ev.id] = (visits[ev.id] || 0) + 1; if (visits[ev.id] === 3) gesture(); });
  });
})();
