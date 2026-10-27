/* ======================================================================
   CODEX MENTAL v3 — accueil léger (sans scène)
   Quand la scène ne peut pas tourner (pas de WebGL, très vieil appareil) ou que
   le visiteur a coupé les animations, l'accueil ne doit jamais être un écran noir :
   ciel étoilé fixe (un SVG dessiné une fois, zéro calcul ensuite), présentation
   et cartes des rubriques qui ouvrent directement le lecteur.
   ====================================================================== */
(function () {
  'use strict';
  var Codex = window.Codex; if (!Codex || !Codex.on) return;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function stars() {   // champ d'étoiles fixe, graine stable pour que le ciel ne change pas d'une visite à l'autre
    var seed = 7, r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, out = '';
    for (var i = 0; i < 220; i++) {
      var s = r(), rad = s > .97 ? 1.5 : s > .85 ? 1 : .6;
      out += '<circle cx="' + (r() * 1600).toFixed(1) + '" cy="' + (r() * 1000).toFixed(1) + '" r="' + rad + '" opacity="' + (.35 + r() * .6).toFixed(2) + '"/>';
    }
    return '<svg class="lite-sky" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="currentColor">' + out + '</g></svg>';
  }

  function build() {
    if (Codex.sceneOk) return;
    var host = document.getElementById('scene'); if (!host || host.querySelector('.lite')) return;
    document.documentElement.classList.add('noscene');
    // une scène qui a échoué à mi-chemin peut avoir laissé son décor (titres, panneaux) : on repart d'une page nette
    Array.prototype.slice.call(host.children).forEach(function (c) { c.remove(); });
    // le message d'état reste lisible quelques secondes, puis s'efface pour ne pas masquer les cartes
    setTimeout(function () { var st = document.getElementById('scene-status'); if (st) st.hidden = true; }, 9000);
    var secs = (Codex.catalog && Codex.catalog.sections) || [];
    var nav = {}; document.querySelectorAll('.nav-item[data-section]').forEach(function (a) { nav[a.dataset.section] = a.querySelector('svg') ? a.querySelector('svg').outerHTML : ''; });
    var cards = secs.filter(function (s) { return s.id !== 'contact'; }).map(function (s) {
      return '<a class="lite-card" href="#' + esc(s.id) + '" data-lite="' + esc(s.id) + '">' + (nav[s.id] || '') +
        '<span><b>' + esc(s.label) + '</b>' + (s.kicker ? '<small>' + esc(s.kicker) + '</small>' : '') + '</span></a>';
    }).join('');
    var d = document.createElement('div'); d.className = 'lite';
    d.innerHTML = stars() + '<div class="lite-in"><p class="lite-kick">Codex Mental · Exploration</p><h1 class="lite-title">Codex Mental</h1>' +
      '<p class="lite-sub">Explorer · Comprendre · Imaginer</p><div class="lite-who"></div><nav class="lite-cards" aria-label="Rubriques">' + cards + '</nav></div>';
    host.appendChild(d);
    fetch('content/who.json').then(function (r) { return r.json(); }).then(function (w) {
      var box = d.querySelector('.lite-who'); if (!box || !w) return;
      box.innerHTML = '<strong>' + esc(w.lead) + '</strong><p>' + esc(w.text) + '</p>';
    }).catch(function () {});
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lite]'); if (!a) return;
      e.preventDefault();
      Codex.reader.open(a.dataset.lite, a);
      Codex.emit('navigate', { id: a.dataset.lite, raw: a.dataset.lite, direct: true });
    });
  }
  Codex.on('ready', build);
})();
