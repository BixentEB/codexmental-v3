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
    var tab = d.tabs[0].id, sel = {}, root = el('div', 'lab');
    var bar = el('div', 'lab-bar'), tabs = el('div', 'lab-tabs'); tabs.setAttribute('role', 'tablist');
    var off = el('a', 'lab-off'); off.href = d.official.url; off.target = '_blank'; off.rel = 'noopener noreferrer';
    off.append(el('span', '', d.official.label + ' ↗'), el('small', '', d.official.host + ' · ' + d.official.note));
    bar.append(tabs, off);
    var grid = el('div', 'lab-grid'), detail = el('section', 'lab-detail'); detail.setAttribute('aria-live', 'polite');
    root.append(bar, grid, detail);
    function list() { return d.projects.filter(function (p) { return p.tab === tab; }); }
    function drawTabs() {
      tabs.replaceChildren();
      d.tabs.forEach(function (t) {
        var n = d.projects.filter(function (p) { return p.tab === t.id; }).length;
        var b = el('button', 'lab-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(t.id === tab));
        b.append(document.createTextNode(t.label + ' '), el('span', 'lab-n', String(n)));
        b.addEventListener('click', function () { tab = t.id; drawTabs(); drawGrid(); show(); });
        tabs.append(b);
      });
    }
    function drawGrid() {
      grid.replaceChildren(); grid.className = 'lab-grid ' + (tab === 'cours' ? 'is-main' : 'is-soft');
      var L = list(); if (!sel[tab] || !L.some(function (p) { return p.id === sel[tab]; })) sel[tab] = L[0].id;
      L.forEach(function (p) {
        var c = el('button', 'lab-tile'); c.type = 'button'; c.setAttribute('aria-pressed', String(p.id === sel[tab]));
        var m = el('span', 'lab-mark', p.mark); m.style.setProperty('--ac', p.accent);
        var t = el('span', 'lab-tt'); t.append(el('b', '', p.name), el('small', '', p.platform));
        c.append(m, t); c.addEventListener('click', function () { sel[tab] = p.id; grid.querySelectorAll('.lab-tile').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); }); show(); });
        grid.append(c);
      });
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
    host.replaceChildren(root); drawTabs(); drawGrid(); show();
  }
  function mount(scope) {
    var host = scope && scope.querySelector('.lab-mount'); if (!host) return;
    load(host.getAttribute('data-src')).then(function (d) { if (host.isConnected) build(host, d); },
      function () { host.textContent = 'Le Laboratoire n’a pas pu être chargé. Réessayez dans un instant.'; });
  }
  window.Codex.lab = { mount: mount };
})();
