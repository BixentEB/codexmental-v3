/* ======================================================================
   Petit clin d'œil de la page Contact : une soucoupe passe de temps en temps
   au-dessus du titre. Au survol de l'icône, un passage ; au clic, une
   séquence au hasard : passage, balayage, salut… ou l'enlèvement d'une
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

    function W() { return sky.clientWidth || 600; }
    function H() { return sky.clientHeight || 150; }
    function go(el, frames, opt) {
      var a = el.animate(frames, Object.assign({ fill: 'forwards', easing: 'ease-in-out' }, opt)); anims.push(a);
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

    var seq = { passage: passage, scan: scan, salut: salut, vache: enlevement };
    function pick() { var all = ['passage', 'scan', 'salut', 'vache', 'vache']; return all[Math.floor(Math.random() * all.length)]; }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { if (dead) return; (document.hidden ? Promise.resolve() : seq[pick()]()).then(schedule); }, 45000 + Math.random() * 45000);
    }
    function onClick() { clicks++; seq[clicks % 3 === 0 ? 'vache' : pick()](); }
    icon.setAttribute('role', 'button'); icon.setAttribute('tabindex', '0'); icon.setAttribute('aria-label', 'Faire revenir le vaisseau spatial');
    icon.addEventListener('mouseenter', function () { if (!playing) passage(); });
    icon.addEventListener('click', onClick);
    icon.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
    try { if (!sessionStorage.getItem('codex-contact-ufo-seen')) { sessionStorage.setItem('codex-contact-ufo-seen', '1'); setTimeout(function () { if (!dead) passage(); }, 900); } } catch (e) { setTimeout(passage, 900); }
    schedule();
    cur = { stop: function () { dead = true; clearTimeout(timer); reset(); }, play: function (n) { return seq[n] && seq[n](); } };
  }
  function stop() { if (cur) { cur.stop(); cur = null; } }
  window.Codex.ufo = { mount: mount, stop: stop, play: function (n) { return cur ? cur.play(n) : null; } };
})();
