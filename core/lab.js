/* ======================================================================
   Laboratoire — deux onglets : « Projets en cours » (fiches complètes) et
   « En réflexion » (fiches légères). Données : content/lab/projects.json.
   Les étiquettes identifient, elles ne filtrent rien.
   ====================================================================== */
(function () {
  'use strict';
  var cache = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function load(url) {
    if (cache) return Promise.resolve(cache);
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { return (cache = d); });
  }
  function build(host, d) {
    var tab = d.tabs[0].id, sel = {}, root = el('div', 'lab'), view = 'wheel';
    try { var v0 = localStorage.getItem('codex.lab.view'); if (v0 === 'wheel' || v0 === 'tiles') view = v0; } catch (e) {}
    var bar = el('div', 'lab-bar'), tabs = el('div', 'lab-tabs'); tabs.setAttribute('role', 'tablist');
    var off = el('a', 'lab-off'); off.href = d.official.url; off.target = '_blank'; off.rel = 'noopener noreferrer';
    off.append(el('span', '', d.official.label + ' ↗'), el('small', '', d.official.host + ' · ' + d.official.note));
    var vt = el('div', 'lab-views'); vt.setAttribute('role', 'group'); vt.setAttribute('aria-label', 'Présentation');
    [['wheel', 'Roulette'], ['tiles', 'Tuiles']].forEach(function (v) { var b = el('button', 'lab-view', v[1]); b.type = 'button'; b.dataset.v = v[0]; b.addEventListener('click', function () { view = v[0]; try { localStorage.setItem('codex.lab.view', view); } catch (e) {} drawGrid(); }); vt.append(b); });
    var left = el('div', 'lab-left'); left.append(tabs, vt);
    bar.append(left, off);
    var grid = el('div', 'lab-grid'), detail = el('section', 'lab-detail'); detail.setAttribute('aria-live', 'polite');
    var body = el('div', 'lab-body'); body.append(grid, detail); root.append(bar, body);
    function list() { return d.projects.filter(function (p) { return p.tab === tab; }); }
    function drawTabs() {
      tabs.replaceChildren();
      d.tabs.forEach(function (t) {
        var n = d.projects.filter(function (p) { return p.tab === t.id; }).length;
        var b = el('button', 'lab-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(t.id === tab));
        b.append(document.createTextNode(t.label + ' '), el('span', 'lab-n', String(n)));
        b.addEventListener('click', function () { tab = t.id; drawTabs(); drawGrid(); });
        tabs.append(b);
      });
    }
    var acc = 0;
    function drawGrid() {
      vt.querySelectorAll('.lab-view').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === view)); });
      grid.replaceChildren(); var L = list(); if (!sel[tab] || !L.some(function (p) { return p.id === sel[tab]; })) sel[tab] = L[0].id;
      grid.className = 'lab-grid is-' + view + ' ' + (tab === 'cours' ? 'is-main' : 'is-soft');
      if (view === 'tiles') {
        L.forEach(function (p) {
          var c = el('button', 'lab-tile'); c.type = 'button'; c.setAttribute('aria-pressed', String(p.id === sel[tab]));
          var m = el('span', 'lab-mark', p.mark); m.style.setProperty('--ac', p.accent);
          c.append(m, el('b', '', p.name)); c.title = p.platform;
          c.addEventListener('click', function () { sel[tab] = p.id; grid.querySelectorAll('.lab-tile').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); }); show(); });
          grid.append(c);
        });
      } else {
        var STEP = 40, wheel = el('div', 'lab-wheel'), ul = el('ul', 'lab-list'), up = el('button', 'lab-nav', '▲'), down = el('button', 'lab-nav', '▼');
        up.type = down.type = 'button'; up.setAttribute('aria-label', 'Précédent'); down.setAttribute('aria-label', 'Suivant');
        wheel.setAttribute('role', 'listbox'); wheel.setAttribute('aria-label', 'Projets'); wheel.tabIndex = 0;
        var items = L.map(function (p, i) { var li = el('li', 'lab-item'); li.setAttribute('role', 'option'); var m = el('span', 'lab-mark', p.mark); m.style.setProperty('--ac', p.accent); li.append(m, el('span', 'lab-iname', p.name)); li.addEventListener('click', function () { go(i); }); ul.append(li); return li; });
        var idx = Math.max(0, L.map(function (p) { return p.id; }).indexOf(sel[tab]));
        function lay() { items.forEach(function (li, i) { var o = i - idx, a = Math.abs(o); li.style.transform = 'translateY(' + (o * STEP) + 'px) scale(' + Math.max(.7, 1 - a * .08).toFixed(3) + ')'; li.style.opacity = a > 3 ? 0 : (1 - a * .2).toFixed(2); li.style.pointerEvents = a > 3 ? 'none' : ''; li.setAttribute('aria-selected', String(i === idx)); }); up.disabled = idx <= 0; down.disabled = idx >= L.length - 1; }
        function go(i) { i = Math.max(0, Math.min(L.length - 1, i)); if (i === idx) return; idx = i; sel[tab] = L[i].id; lay(); show(); }
        up.addEventListener('click', function () { go(idx - 1); }); down.addEventListener('click', function () { go(idx + 1); });
        wheel.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); go(idx + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); go(idx - 1); } });
        grid.addEventListener('wheel', function (e) { var n = idx + (e.deltaY > 0 ? 1 : -1); if (n < 0 || n >= L.length) return; e.preventDefault(); acc += e.deltaY; if (Math.abs(acc) > 40) { go(n); acc = 0; } }, { passive: false });
        wheel.append(ul); grid.append(up, wheel, down); lay();
      }
      show();
    }
    function row(label, v) { var r = el('div', 'lab-meta'); r.append(el('dt', '', label), el('dd', '', v)); return r; }
    function chips(p) { var tg = el('div', 'lab-tagrow'); (p.tags || []).forEach(function (t) { var s = el('span', 'lab-chip', t); s.style.setProperty('--tag', d.palette[t] || '#c9d9ee'); tg.append(s); }); return tg; }
    function head(p) { var h = el('div', 'lab-head'), m = el('span', 'lab-mark big', p.mark), t = el('div'); m.style.setProperty('--ac', p.accent); t.append(el('h2', '', p.name), el('div', 'lab-platform', p.platform)); h.append(m, t, chips(p)); return h; }
    function show() {
      var p = d.projects.filter(function (x) { return x.id === sel[tab]; })[0]; detail.replaceChildren(); detail.className = 'lab-detail ' + (tab === 'cours' ? 'full' : 'light');
      if (tab === 'cours') {
        var left = el('div', 'lab-main');
        left.append(el('p', 'lab-summary', p.summary), el('p', 'lab-desc', p.detail));
        if (p.features && p.features.length) { var f = el('div', 'lab-feat'), ul = el('ul'); f.append(el('h3', '', 'Fonctions principales')); p.features.forEach(function (t) { ul.append(el('li', '', t)); }); f.append(ul); left.append(f); }
        var side = el('dl', 'lab-side');
        [['État', p.state], ['Accès', p.access], ['Technologies', p.tech], ['Évolutions prévues', p.next], ['Diffusion', p.diffusion], ['Licence', p.license], ['Téléchargement', p.download], ['Lien', p.link || 'Bientôt sur le Laboratoire officiel']].forEach(function (m) { if (m[1]) side.append(row(m[0], m[1])); });
        detail.append(head(p), left, side);
      } else {
        var b = el('div', 'lab-soft');
        b.append(el('p', 'lab-summary', p.concept));
        var g = el('div', 'lab-cols'), a = el('div'), c = el('div');
        a.append(el('h3', '', 'Objectif'), el('p', 'lab-desc', p.goal)); var ul2 = el('ul'); (p.ideas || []).forEach(function (t) { ul2.append(el('li', '', t)); }); c.append(el('h3', '', 'Pistes envisagées'), ul2);
        g.append(a, c); b.append(g, el('p', 'lab-hint', 'En réflexion : rien n’est disponible ni annoncé.'));
        detail.append(head(p), b);
      }
    }
    host.replaceChildren(root); drawTabs(); drawGrid();
  }
  function mount(scope) {
    var host = scope && scope.querySelector('.lab-mount'); if (!host) return;
    load(host.getAttribute('data-src')).then(function (d) { if (host.isConnected) build(host, d); },
      function () { host.textContent = 'Le Laboratoire n’a pas pu être chargé. Réessayez dans un instant.'; });
  }
  window.Codex.lab = { mount: mount };
})();
