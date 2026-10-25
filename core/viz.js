/* ======================================================================
   Illustrations animées des articles (sans texte)
   Un article place <figure class="viz" data-viz="imagination|concepts|creer">,
   ce module y dessine l'animation en SVG avec les couleurs du thème actif
   (--accent, --accent-2). Les animations se mettent en pause hors écran et
   si l'utilisateur préfère moins de mouvement.
   ====================================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', uid = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var s = e.target; s.classList.toggle('off', !e.isIntersecting);
      try { if (e.isIntersecting && !reduce) s.unpauseAnimations(); else s.pauseAnimations(); } catch (x) {}
    });
  }, { threshold: 0.05 }) : null;

  function spark(pathId, dur, begin, back, cls) {
    return '<circle r="3.2" class="spark ' + (cls || '') + '"><animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" ' +
      (back ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : 'calcMode="linear"') + '><mpath href="#' + pathId + '"/></animateMotion>' +
      '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.85;1" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/></circle>';
  }

  /* ---- Imagination : des entrées nourrissent un cœur, d'où partent des branches qui reviennent l'alimenter ---- */
  function imagination() {
    var p = 'im' + (++uid) + '-';
    var L = [[185, 52], [155, 125], [160, 220], [195, 285]], R = [[700, 52], [755, 115], [760, 205], [705, 282]];
    var paths = '', nodes = '', sparks = '', i, d;
    L.forEach(function (n, k) {
      d = 'M450 165 C' + (400 - k * 8) + ' ' + (165 + (k < 2 ? -30 : 30) * (k % 2 ? 1 : 1.4)) + ' ' + (n[0] + 130) + ' ' + n[1] + ' ' + n[0] + ' ' + n[1];
      paths += '<path id="' + p + 'l' + k + '" class="branch in" d="' + d + '"/>';
      sparks += spark(p + 'l' + k, 4.2 + k * .6, k * 1.1, true, 'in');
      nodes += '<g class="node in" style="--d:' + (k * .7) + 's" transform="translate(' + n[0] + ' ' + n[1] + ')"><circle class="halo" r="15"/><circle class="dot" r="5.5"/></g>';
    });
    R.forEach(function (n, k) {
      d = 'M450 165 C' + (500 + k * 8) + ' ' + (165 + (k < 2 ? -30 : 30) * (k % 2 ? 1 : 1.4)) + ' ' + (n[0] - 130) + ' ' + n[1] + ' ' + n[0] + ' ' + n[1];
      paths += '<path id="' + p + 'r' + k + '" class="branch out" d="' + d + '"/>';
      sparks += spark(p + 'r' + k, 4.6 + k * .5, .6 + k * 1.2, false, 'out');
      nodes += '<g class="node out" style="--d:' + (k * .8 + .3) + 's" transform="translate(' + n[0] + ' ' + n[1] + ')"><circle class="halo" r="15"/><circle class="dot" r="5.5"/></g>';
    });
    paths += '<path id="' + p + 'ret" class="branch back" d="M705 282 C 640 336 520 316 450 192"/>';
    sparks += spark(p + 'ret', 5.4, 2.2, false, 'back') + spark(p + 'ret', 5.4, 4.9, false, 'back');
    return '<svg viewBox="0 0 900 330" preserveAspectRatio="xMidYMid meet" role="presentation" focusable="false">' +
      '<defs><radialGradient id="' + p + 'g"><stop offset="0" stop-color="var(--c2)" stop-opacity=".5"/><stop offset="1" stop-color="var(--c2)" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="450" cy="165" r="170" fill="url(#' + p + 'g)" class="aura"/>' + paths + sparks + nodes +
      '<g transform="translate(450 165)"><circle class="ring r1" r="30"/><circle class="ring r2" r="30"/><circle class="core" r="23"/><circle class="core-in" r="9"/></g></svg>';
  }

  /* ---- Concepts : un ciel d'idées reliées entre elles, parcouru d'impulsions ---- */
  var CPTS = [[11, 13], [82, 12], [31, 25], [66, 25], [11, 38], [86, 38], [24, 49], [74, 50], [12, 65], [87, 65], [30, 76], [67, 77], [48, 12], [49, 62], [17, 83], [84, 84]];
  var IMPS = [[50, 39], [40, 45], [59, 47], [39, 57], [61, 58], [49, 90], [49, 72], [50, 25]];
  function concepts() {
    var p = 'cp' + (++uid) + '-', W = 900, H = 520, pts = CPTS.map(function (c) { return [c[0] * W / 100, c[1] * H / 100]; });
    var links = [], seen = {}, i, j, k;
    pts.forEach(function (a, i) {   // chaque idée est reliée à ses deux voisines les plus proches
      var ds = pts.map(function (b, j) { return [j, (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])]; }).filter(function (x) { return x[0] !== i; }).sort(function (x, y) { return x[1] - y[1]; });
      for (k = 0; k < 2; k++) { var j2 = ds[k][0], key = Math.min(i, j2) + '-' + Math.max(i, j2); if (!seen[key]) { seen[key] = 1; links.push([i, j2]); } }
    });
    var s = '', lk = '', nd = '', sp = '';
    links.forEach(function (l, n) {
      var a = pts[l[0]], b = pts[l[1]], mx = (a[0] + b[0]) / 2 + (a[1] - b[1]) * .12, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * .12;
      lk += '<path id="' + p + 'k' + n + '" class="link" d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '"/>';
      if (n % 2 === 0) sp += spark(p + 'k' + n, 5 + (n % 5) * .8, (n * 1.7) % 9, n % 4 === 0, n % 3 ? 'in' : 'out');
    });
    pts.forEach(function (c, n) {
      var big = n % 5 === 0;
      nd += '<g class="cnode f' + (n % 3) + '" style="--d:' + ((n * 0.83) % 6).toFixed(2) + 's" transform="translate(' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ')"><circle class="halo" r="' + (big ? 22 : 17) + '"/><circle class="dot" r="' + (big ? 7.5 : 5.5) + '"/></g>';
    });
    IMPS.forEach(function (c, n) {
      nd += '<circle class="imp" style="--d:' + (n * 0.9) + 's" cx="' + (c[0] * W / 100).toFixed(1) + '" cy="' + (c[1] * H / 100).toFixed(1) + '" r="' + (n === 0 ? 3.6 : 2.6) + '"/>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="presentation" focusable="false">' +
      '<defs><radialGradient id="' + p + 'g"><stop offset="0" stop-color="var(--c1)" stop-opacity=".22"/><stop offset="1" stop-color="var(--c1)" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse cx="470" cy="240" rx="360" ry="220" fill="url(#' + p + 'g)"/>' + lk + sp + nd + '</svg>';
  }

  /* ---- Créer : cinq étapes qui s'allument tour à tour, de l'idée à la création ---- */
  function creer() {
    var p = 'cr' + (++uid) + '-', X = [110, 280, 450, 620, 790], Y = 80, T = 8;
    var glyph = [
      '<path d="M0-13V-8M0 8V13M-13 0H-8M8 0H13M-9-9l3 3M6 6l3 3M9-9l-3 3M-6 6l-3 3"/><circle r="4"/>',                       // idée : étincelle
      '<path d="M0-12L11-6V6L0 12L-11 6V-6Z"/><path d="M0-12V0M-11-6L0 0L11-6"/>',                                           // prototype : volume
      '<path d="M-13 0C-7-9 7-9 13 0C7 9-7 9-13 0Z"/><circle r="4"/>',                                                         // test : œil
      '<path d="M10-5A11 11 0 1 0 11 3"/><path d="M11-12V-4H3"/>',                                                             // correction : reprise
      '<path d="M0-14L3.5-3.5L14 0L3.5 3.5L0 14L-3.5 3.5L-14 0L-3.5-3.5Z"/>'                                                   // création : étoile
    ];
    var line = '<path id="' + p + 'l" class="rail" d="M' + X[0] + ' ' + Y + ' H' + X[4] + '"/>', segs = '', nodes = '', i;
    for (i = 0; i < 4; i++) segs += '<path class="chev" d="M' + (X[i] + (X[i + 1] - X[i]) / 2 - 5) + ' ' + (Y - 7) + ' l7 7 -7 7"/>';
    for (i = 0; i < 5; i++) nodes += '<g class="stage" style="--delay:' + (i * T / 5) + 's;--T:' + T + 's" transform="translate(' + X[i] + ' ' + Y + ')"><circle class="halo" r="40"/><circle class="disc" r="31"/><g class="glyph">' + glyph[i] + '</g></g>';
    var bloom = '<g transform="translate(' + X[4] + ' ' + Y + ')"><circle class="bloom" style="--T:' + T + 's" r="31"/></g>';
    var pulse = '<circle r="4.5" class="spark go"><animateMotion dur="' + T + 's" repeatCount="indefinite" calcMode="linear"><mpath href="#' + p + 'l"/></animateMotion></circle>';
    return '<svg viewBox="0 0 900 160" preserveAspectRatio="xMidYMid meet" role="presentation" focusable="false">' + line + segs + pulse + bloom + nodes + '</svg>';
  }

  var KIND = { imagination: imagination, concepts: concepts, creer: creer };
  function mount(root) {
    (root || document).querySelectorAll('figure.viz[data-viz]').forEach(function (el) {
      if (el.dataset.ready || !KIND[el.dataset.viz]) return;
      el.dataset.ready = '1'; el.classList.add('viz-' + el.dataset.viz);
      var holder = document.createElement('div'); holder.className = 'viz-svg'; holder.innerHTML = KIND[el.dataset.viz]();
      el.insertBefore(holder, el.firstChild);
      if (!el.getAttribute('role')) el.setAttribute('role', 'img');
      var svg = holder.querySelector('svg');
      if (reduce) { try { svg.pauseAnimations(); } catch (e) {} el.classList.add('still'); }
      else if (io) io.observe(svg);
    });
  }
  window.Codex.viz = { mount: mount };
})();
