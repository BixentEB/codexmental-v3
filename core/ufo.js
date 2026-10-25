/* ======================================================================
   Petit clin d'œil de la page Contact : une soucoupe passe de temps en temps
   au-dessus du titre. Au survol de l'icône, un passage ; au clic, une
   séquence au hasard : passage, balayage, salut, zigzag, looping… ou l'enlèvement d'une
   vache qui est tout à fait volontaire.
   Rien ne bouge si l'utilisateur préfère moins d'animations.
   ====================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = null;

  var SAUCER = '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M21 21Q23 8 32 8Q41 8 43 21"/><ellipse cx="32" cy="24" rx="27" ry="9"/><path d="M10 27Q32 42 54 27"/><circle class="lt l1" cx="20" cy="26" r="2"/><circle class="lt l2" cx="32" cy="29" r="2"/><circle class="lt l3" cx="44" cy="26" r="2"/></svg>';
  var COW = '<svg viewBox="0 0 44 30" aria-hidden="true"><g class="cow-in">' +
    '<path class="tail" d="M9 11C5 11 3 14 3 19" fill="none" stroke="#cfd5ea" stroke-width="1.6" stroke-linecap="round"/>' +
    '<rect class="leg" x="12" y="20" width="2.6" height="8" rx="1.2" fill="#dfe3f2"/><rect class="leg b" x="16.5" y="20" width="2.6" height="8" rx="1.2" fill="#cfd5ea"/>' +
    '<rect class="leg b" x="26" y="20" width="2.6" height="8" rx="1.2" fill="#cfd5ea"/><rect class="leg" x="30.5" y="20" width="2.6" height="8" rx="1.2" fill="#dfe3f2"/>' +
    '<ellipse cx="21.5" cy="15" rx="13.5" ry="7.5" fill="#f2f4fb"/>' +
    '<path d="M14 11c2.5-2.5 5.5-1.5 5.5 1s-3.5 3.6-5 1.4z" fill="#262b40"/><ellipse cx="26.5" cy="17.5" rx="3.6" ry="2.6" fill="#262b40"/>' +
    '<ellipse cx="22" cy="21.6" rx="2" ry="1.6" fill="#f0b6bd"/>' +
    '<g class="head"><path d="M33.5 6.5l-1.8-3M38.5 6.5l1.8-3" stroke="#e6d9b8" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="36" cy="11" rx="5.6" ry="4.8" fill="#f2f4fb"/>' +
    '<ellipse cx="38.4" cy="13.2" rx="3.3" ry="2.5" fill="#f0b6bd"/><circle cx="37.2" cy="9.6" r="1" fill="#262b40"/><ellipse cx="31.4" cy="8.6" rx="2.2" ry="1.2" fill="#dfe3f2" transform="rotate(-25 31.4 8.6)"/></g>' +
    '</g></svg>';

  function mount(pane) {
    stop();
    var sky = pane && pane.querySelector('.ufo-sky'), icon = pane && pane.querySelector('.contact-ufo');
    if (!sky || !icon || reduce) return;
    sky.innerHTML = '<div class="ground"></div><div class="ufo">' + SAUCER + '<div class="beam"></div></div><div class="cow">' + COW + '</div>';
    var ufo = sky.querySelector('.ufo'), beam = sky.querySelector('.beam'), cow = sky.querySelector('.cow');
    var playing = false, timer = null, dead = false, clicks = 0, anims = [];
    var UW = 40, UH = 26;   // taille de la soucoupe

    var SLOW = 1.9;   // la soucoupe prend son temps
    function W() { return sky.clientWidth || 600; }
    function H() { return sky.clientHeight || 150; }
    function go(el, frames, opt) {
      var o2 = Object.assign({ fill: 'forwards', easing: 'ease-in-out' }, opt); if (o2.duration) o2.duration = Math.round(o2.duration * SLOW); var a = el.animate(frames, o2); anims.push(a);
      return a.finished.catch(function () {});
    }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function reset() {
      anims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = [];
      ufo.style.opacity = 0; cow.style.opacity = 0; beam.style.opacity = 0; sky.classList.remove('flying', 'lit');
    }
    function guard(fn) {
      return function () {
        if (playing || dead || !sky.isConnected || document.hidden) return Promise.resolve();
        playing = true; sky.classList.add('flying');
        return Promise.resolve().then(fn).catch(function (e) { if (window.console) console.warn('Soucoupe :', e && e.message || e); }).then(function () { reset(); playing = false; });
      };
    }
    function beamTo(y, h) { beam.style.height = h + 'px'; }

    /* passage : de gauche à droite, avec un léger balancement et un faisceau à mi-parcours (comme en v2) */
    var passage = guard(function () {
      var w = W(), y = 34;
      beamTo(y, H() - y - 30);
      return Promise.all([
        go(ufo, [
          { transform: 'translate(-70px,' + (y + 4) + 'px) rotate(-9deg)', opacity: 0 },
          { transform: 'translate(' + (w * .3) + 'px,' + (y + 12) + 'px) rotate(5deg)', opacity: 1, offset: .3 },
          { transform: 'translate(' + (w * .46) + 'px,' + (y - 4) + 'px) rotate(-10deg)', opacity: 1, offset: .46 },
          { transform: 'translate(' + (w * .6) + 'px,' + (y + 10) + 'px) rotate(6deg)', opacity: 1, offset: .62 },
          { transform: 'translate(' + (w + 80) + 'px,' + (y - 6) + 'px) rotate(12deg)', opacity: 0 }
        ], { duration: 4700 }),
        go(beam, [{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1, offset: .47 }, { opacity: 1, offset: .56 }, { opacity: 0, offset: .64 }, { opacity: 0 }], { duration: 4700 })
      ]);
    });

    /* balayage : la soucoupe s'arrête au-dessus de l'icône et l'éclaire */
    var scan = guard(function () {
      var r = icon.getBoundingClientRect(), s = sky.getBoundingClientRect(), x = Math.max(0, r.left - s.left + r.width / 2 - UW / 2), y = 24;
      beamTo(y, Math.max(40, s.height - y - 24));
      return go(ufo, [{ transform: 'translate(-70px,' + (y - 6) + 'px) rotate(-8deg)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(0)', opacity: 1 }], { duration: 1700, easing: 'cubic-bezier(.2,.8,.3,1)' })
        .then(function () { sky.classList.add('lit'); return go(beam, [{ opacity: 0 }, { opacity: 1 }, { opacity: .7 }, { opacity: 1 }, { opacity: 0 }], { duration: 2200 }); })
        .then(function () { sky.classList.remove('lit'); return go(ufo, [{ transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 1 }, { transform: 'translate(' + (W() + 80) + 'px,' + (y - 14) + 'px) rotate(10deg)', opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.6,0,.9,.5)' }); });
    });

    /* salut : un petit zigzag et trois clignotements de feux */
    var salut = guard(function () {
      var w = W(), x = w * (.35 + Math.random() * .3), y = 40;
      return go(ufo, [{ transform: 'translate(' + (w + 60) + 'px,' + (y - 12) + 'px) rotate(8deg)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(0)', opacity: 1 }], { duration: 1600, easing: 'cubic-bezier(.2,.8,.3,1)' })
        .then(function () { sky.classList.add('lit'); return go(ufo, [{ transform: 'translate(' + x + 'px,' + y + 'px) rotate(0)' }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(-16deg)' }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(14deg)' }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(-8deg)' }, { transform: 'translate(' + x + 'px,' + y + 'px) rotate(0)' }], { duration: 1800 }); })
        .then(function () { sky.classList.remove('lit'); return go(ufo, [{ transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 1 }, { transform: 'translate(-80px,' + (y - 14) + 'px) rotate(-10deg)', opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(.6,0,.9,.5)' }); });
    });

    /* enlèvement : la vache arrive d'un bon pas, se place sous le faisceau et monte, ravie */
    var enlevement = guard(function () {
      var w = W(), h = H(), gy = h - 34, ux = w * (.52 + Math.random() * .18), uy = 22, cw = 40, ch = 27;
      var cowX = ux + UW / 2 - cw / 2, from = -cw - 20;
      cow.style.width = cw + 'px'; cow.style.height = ch + 'px';
      beamTo(uy, gy - uy - 6);
      var hop = [];   // petits bonds de la marche
      for (var i = 0; i <= 8; i++) hop.push({ transform: 'translate(' + (from + (cowX - from) * i / 8) + 'px,' + (gy + (i % 2 ? -5 : 0)) + 'px)', opacity: 1 });
      return go(ufo, [{ transform: 'translate(' + (w + 60) + 'px,' + (uy - 10) + 'px) rotate(8deg)', opacity: 0 }, { transform: 'translate(' + ux + 'px,' + uy + 'px) rotate(0)', opacity: 1 }], { duration: 2000, easing: 'cubic-bezier(.2,.8,.3,1)' })
        .then(function () { sky.classList.add('walk'); return go(cow, hop, { duration: 2300, easing: 'linear' }); })
        .then(function () { sky.classList.remove('walk'); return go(beam, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 }); })
        .then(function () { sky.classList.add('lit'); return wait(250); })
        .then(function () {
          var up = gy - uy - 14;
          return go(cow, [
            { transform: 'translate(' + cowX + 'px,' + gy + 'px) rotate(0) scale(1)', opacity: 1 },
            { transform: 'translate(' + cowX + 'px,' + (gy - up * .3) + 'px) rotate(-8deg) scale(.9)', opacity: 1, offset: .3 },
            { transform: 'translate(' + cowX + 'px,' + (gy - up * .65) + 'px) rotate(9deg) scale(.7)', opacity: 1, offset: .62 },
            { transform: 'translate(' + cowX + 'px,' + (gy - up) + 'px) rotate(-4deg) scale(.32)', opacity: .9, offset: .92 },
            { transform: 'translate(' + cowX + 'px,' + (gy - up - 4) + 'px) rotate(0) scale(.1)', opacity: 0 }
          ], { duration: 2600, easing: 'cubic-bezier(.45,0,.55,1)' });
        })
        .then(function () { return go(beam, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }); })
        .then(function () { return wait(250); })
        .then(function () { sky.classList.remove('lit'); return go(ufo, [{ transform: 'translate(' + ux + 'px,' + uy + 'px) rotate(0)', opacity: 1 }, { transform: 'translate(' + ux + 'px,' + (uy - 3) + 'px) rotate(-6deg)', opacity: 1, offset: .12 }, { transform: 'translate(' + (w + 90) + 'px,' + (uy - 24) + 'px) rotate(14deg)', opacity: 0 }], { duration: 1700, easing: 'cubic-bezier(.7,0,.9,.4)' }); });
    });


    /* --- vieux films : mouvements brusques, arrêts nets, ressorts --- */
    function T(x, y, r, o) { return 'translate(' + x + 'px,' + y + 'px) rotate(' + (r || 0) + 'deg)'; }
    function R(a, b) { return a + Math.random() * (b - a); }
    function trail(pts, dur, ease) {   // suit une liste de points {x,y,r,o}, répartis régulièrement
      var n = pts.length - 1;
      return go(ufo, pts.map(function (q, i) { return { transform: T(q.x, q.y, q.r), opacity: q.o == null ? 1 : q.o, offset: i / n }; }), { duration: dur, easing: ease || 'ease-in-out' });
    }
    /* zigzag : fonce, s'arrête net, repart dans l'autre sens, comme sur un fil */
    var zigzag = guard(function () {
      var w = W(), fromLeft = Math.random() < .5, k = fromLeft ? 1 : -1, x0 = fromLeft ? -70 : w + 60, pts = [{ x: x0, y: R(30, 60), r: -8 * k, o: 0 }], x = x0, y;
      for (var i = 0; i < 5; i++) { x += k * R(w * .12, w * .22) * (i % 2 ? -.5 : 1); x = Math.max(10, Math.min(w - UW - 10, x)); y = R(14, Math.min(H() - UH - 56, 190)); pts.push({ x: x, y: y, r: R(-14, 14) }); }
      pts.push({ x: fromLeft ? w + 80 : -80, y: R(10, 50), r: 10 * k, o: 0 });
      return trail(pts, 5200, 'cubic-bezier(.5,0,.3,1)');
    });
    /* looping : une boucle complète, la soucoupe est un peu fière */
    var looping = guard(function () {
      var w = W(), cx = w * R(.3, .6), cy = 58, rad = 26, pts = [{ x: -70, y: cy + rad, r: -6, o: 0 }, { x: cx - rad * 2, y: cy + rad, r: 0 }], a;
      for (var i = 0; i <= 12; i++) { a = Math.PI / 2 + i / 12 * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * rad - (i / 12) * 0, y: cy + Math.sin(a) * rad * -1 + 0, r: i / 12 * 360 }); }
      pts.push({ x: cx + rad * 2, y: cy + rad, r: 360 }, { x: w + 80, y: cy, r: 360 + 8, o: 0 });
      return trail(pts, 4600, 'linear');
    });
    /* hésitation : elle se pose à mi-hauteur, tangue, repart en trombe */
    var hesite = guard(function () {
      var w = W(), x = w * R(.25, .7), y = R(30, 56);
      return trail([{ x: -70, y: y - 18, r: -8, o: 0 }, { x: x + 40, y: y, r: 6 }, { x: x - 8, y: y + 4, r: -9 }, { x: x, y: y, r: 0 }], 1900, 'cubic-bezier(.2,.9,.3,1.1)')
        .then(function () { sky.classList.add('lit'); return go(ufo, [{ transform: T(x, y, 0) }, { transform: T(x, y - 7, 5) }, { transform: T(x, y + 5, -5) }, { transform: T(x, y - 4, 3) }, { transform: T(x, y, 0) }], { duration: 2200, easing: 'ease-in-out' }); })
        .then(function () { sky.classList.remove('lit'); return wait(350); })
        .then(function () { return go(ufo, [{ transform: T(x, y, 0), opacity: 1 }, { transform: T(x - 14, y + 2, -14), opacity: 1, offset: .2 }, { transform: T(w + 90, y - 30, 16), opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.7,0,1,.5)' }); });
    });
    /* piqué : descend vers l'icône puis se redresse en vrille */
    var pique = guard(function () {
      var r = icon.getBoundingClientRect(), s = sky.getBoundingClientRect(), x = Math.max(0, r.left - s.left + r.width / 2 - UW / 2), y = H() - UH - 34, w = W();
      return trail([{ x: x - w * .3, y: 8, r: -20, o: 0 }, { x: x - 30, y: y * .5, r: 15 }, { x: x, y: y, r: 0 }, { x: x + 10, y: y - 2, r: 4 }, { x: x + w * .25, y: 6, r: 28, o: 0 }], 3600, 'cubic-bezier(.5,0,.4,1)');
    });

    var seq = { passage: passage, scan: scan, salut: salut, vache: enlevement, zigzag: zigzag, looping: looping, hesite: hesite, pique: pique };
    var last = '', nSeq = 0;
    function pick() {   // au hasard, jamais deux fois la même d'affilée
      var all = ['passage', 'scan', 'salut', 'zigzag', 'looping', 'hesite', 'pique'], n;
      nSeq++; if (nSeq % 3 === 0) return (last = 'vache');   // un enlèvement de vache toutes les trois apparitions
      do { n = all[Math.floor(Math.random() * all.length)]; } while (n === last); return (last = n);
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { if (dead) return; (document.hidden ? Promise.resolve() : seq[pick()]()).then(schedule); }, 12000 + Math.random() * 14000);
    }
    function onClick() { clicks++; seq[clicks % 3 === 0 ? 'vache' : pick()](); }
    icon.setAttribute('role', 'button'); icon.setAttribute('tabindex', '0'); icon.setAttribute('aria-label', 'Faire revenir le vaisseau spatial');
    icon.addEventListener('mouseenter', function () { if (!playing) passage(); });
    icon.addEventListener('click', onClick);
    icon.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
    setTimeout(function () { if (!dead) seq[pick()](); }, 900);   // à chaque ouverture de la page, elle arrive toute seule
    schedule();
    cur = { stop: function () { dead = true; clearTimeout(timer); reset(); }, play: function (n) { return seq[n] && seq[n](); } };
  }
  function stop() { if (cur) { cur.stop(); cur = null; } }
  window.Codex.ufo = { mount: mount, stop: stop, play: function (n) { return cur ? cur.play(n) : null; } };
})();
