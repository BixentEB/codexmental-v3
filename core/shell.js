/* ======================================================================
   Interface commune : barre du haut, navigation des rubriques, bouton de thème.
   Les couleurs viennent de la palette du thème actif (variables CSS).
   ====================================================================== */
(function () {
  'use strict';
  var Codex = window.Codex;
  var ICONS = {"codex": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M7 7h10M7 11h10M7 15h6\"/></svg>", "atelier": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m16 5 3 3M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20Z\"/></svg>", "lab": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 3h6M10 3v7l-5.5 8.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 10V3M8 15h8\"/></svg>", "dashb": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20.341 6.484A10 10 0 0 1 10.266 21.85\"/><path d=\"M3.659 17.516A10 10 0 0 1 13.74 2.152\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><circle cx=\"19\" cy=\"5\" r=\"2\"/><circle cx=\"5\" cy=\"19\" r=\"2\"/></svg>", "profil": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/></svg>", "contact": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 7L2 7\"/></svg>", "blog": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.65\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 4h14v16H5z\"/><path d=\"M8.5 8.5h7M8.5 12h7M8.5 15.5h4\"/></svg>"};
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function themeItem(t) {
    var cur = t.id === Codex.theme.id;
    return '<li><a role="menuitemradio" aria-checked="' + cur + '"' + (cur ? ' aria-current="true"' : '') + ' href="?theme=' + esc(t.id) + '" data-theme-id="' + esc(t.id) + '">' +
      '<span class="sw" style="--sw1:' + esc((t.swatch || [])[0] || '#999') + ';--sw2:' + esc((t.swatch || [])[1] || '#555') + '" aria-hidden="true"></span>' +
      '<span class="tx"><b>' + esc(t.label) + (t.preview ? ' <i>aperçu</i>' : '') + '</b><small>' + esc(t.description || '') + '</small></span></a></li>';
  }
  function themeMenu() {   // catégories repliables ; celle du thème actif est ouverte
    var order = [], groups = {};
    Codex.themes.forEach(function (t) { var c = t.category || 'Thèmes'; if (!groups[c]) { groups[c] = []; order.push(c); } groups[c].push(t); });
    if (order.length < 2) return Codex.themes.map(themeItem).join('');
    return order.map(function (c, i) {
      var open = groups[c].some(function (t) { return t.id === Codex.theme.id; });
      return '<li class="cat"><button type="button" class="cat-btn" aria-expanded="' + open + '" aria-controls="tc-' + i + '"><span>' + esc(c) + '</span><em>' + groups[c].length + '</em></button>' +
        '<ul class="cat-list" id="tc-' + i + '" role="group" aria-label="' + esc(c) + '"' + (open ? '' : ' hidden') + '>' + groups[c].map(themeItem).join('') + '</ul></li>';
    }).join('');
  }

  function perfRow() {   // qualité des animations : automatique par défaut, réglable
    var P = Codex.perf; if (!P) return '';
    var opts = [['auto', 'Auto (' + P.label() + ')'], ['high', 'Haute'], ['medium', 'Moyenne'], ['low', 'Économe'], ['still', 'Minimale'], ['off', 'Sans animation']];
    return '<li class="perf-row" role="none"><label for="perf-sel">Qualité des animations</label><select id="perf-sel">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (P.pref === 'auto' || P.ORDER.indexOf(P.pref) < 0 ? 'auto' : P.pref) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select><small class="perf-hint">Changer la qualité relance la scène : quelques secondes de fabrication.</small></li>';
  }
  Codex.ui.buildShell = function () {
    var bar = document.getElementById('topbar');
    var secs = (Codex.catalog ? Codex.catalog.sections : []).filter(function (s) { return !s.hidden && s.nav !== false; });
    var contact = Codex.catalog && Codex.catalog.sections.filter(function (s) { return s.id === 'contact'; })[0];
    var nav = secs.map(function (s) {
      return '<a class="nav-item" href="#' + esc(s.id) + '" data-section="' + esc(s.id) + '">' + (ICONS[s.id] || '') + '<span>' + esc(s.label) + '</span></a>';
    }).join('');
    bar.innerHTML =
      '<a class="brand" href="./" data-section="home">✦ CODEX MENTAL</a>' +
      '<nav class="nav" aria-label="Rubriques du site">' + nav + '</nav>' +
      (contact ? '<a class="nav-contact" href="#contact" data-section="contact" title="Me contacter" aria-label="Me contacter">' + ICONS.contact + '</a>' : '') +
      '<div class="themes"><button type="button" class="theme-btn" id="theme-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu">' +
      '<span class="sw cur" aria-hidden="true"></span><span class="lbl">Thème</span><span class="name">' + esc(Codex.theme.label) + '</span></button>' +
      '<ul class="theme-menu" id="theme-menu" role="menu" aria-label="Choisir un thème" hidden>' + themeMenu() + perfRow() + '</ul></div>';
    var t = Codex.theme, sw = (Codex.themes.filter(function (x) { return x.id === t.id; })[0] || {}).swatch || [];
    bar.querySelector('.sw.cur').style.cssText = '--sw1:' + (sw[0] || 'var(--accent)') + ';--sw2:' + (sw[1] || 'var(--accent-2, var(--accent))');

    var btn = document.getElementById('theme-btn'), menu = document.getElementById('theme-menu');
    var ps = document.getElementById('perf-sel'); if (ps) ps.addEventListener('change', function () { Codex.perf.setPref(ps.value); });
    function setOpen(o) { menu.hidden = !o; btn.setAttribute('aria-expanded', String(o)); if (o) { var c = menu.querySelector('[aria-current]') || menu.querySelector('a'); c && c.focus({ preventScroll: true }); } }
    Codex.ui.openThemes = function () { setOpen(true); };
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); e.stopPropagation(); } }, true);
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('.cat-btn, .cat-list:not([hidden]) a, :scope > li > a')), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    // changer de thème = recharger avec le nouveau thème en conservant la lecture en cours (#adresse)
    menu.addEventListener('click', function (e) {
      var cb = e.target.closest('.cat-btn');
      if (cb) { var ul = document.getElementById(cb.getAttribute('aria-controls')), op = cb.getAttribute('aria-expanded') !== 'true'; menu.querySelectorAll('.cat-btn').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = true; }); cb.setAttribute('aria-expanded', String(op)); ul.hidden = !op; return; }
      var a = e.target.closest('a[data-theme-id]'); if (!a) return;
      e.preventDefault();
      if (a.dataset.themeId === Codex.theme.id) { setOpen(false); return; }
      try { localStorage.setItem('codex.theme', a.dataset.themeId); } catch (er) {}
      var q = new URLSearchParams(location.search); q.set('theme', a.dataset.themeId);
      location.href = location.pathname + '?' + q.toString() + location.hash;
    });
    // navigation : la scène s'anime ; sans scène, on ouvre le lecteur directement
    bar.addEventListener('click', function (e) {
      var a = e.target.closest('[data-section]'); if (!a || !bar.contains(a)) return;
      e.preventDefault();
      var id = a.dataset.section;
      if (!Codex.sceneOk || id === 'contact') {
        if (id === 'home') Codex.reader.close(); else Codex.reader.open(id, a);
        Codex.emit('navigate', { id: id === 'home' ? null : id, raw: id, direct: true });
      } else Codex.navigate(id);
    });
    Codex.on('nav:active', function (id) {
      bar.querySelectorAll('.nav-item, .nav-contact').forEach(function (n) { n.classList.toggle('on', n.dataset.section === id); n.setAttribute('aria-current', n.dataset.section === id ? 'page' : 'false'); });
    });
  };
})();
