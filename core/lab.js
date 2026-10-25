/* ======================================================================
   Laboratoire — vitrine de présentation des créations (outils, CSS, apps).
   Les données sont dans content/lab/projects.json ; la version complète
   (infos, versions, téléchargements) vivra plus tard sur un sous-domaine.
   Présentation : filtres par étiquettes (sans catégories), rail de cartes
   à faire défiler, puis fiche détaillée de la création choisie.
   ====================================================================== */
(function () {
  'use strict';
  var cache = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function load(url) {
    if (cache) return Promise.resolve(cache);
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { return (cache = d); });
  }
  function build(host, d) {
    var P = d.projects, active = {}, shown = P.slice(), sel = P[0].id;
    var root = el('div', 'lab');
    /* introduction */
    var intro = el('div', 'lab-intro'), a = el('a', '', d.repoLabel);
    a.href = d.repo; a.target = '_blank'; a.rel = 'noopener noreferrer';
    intro.append(el('p', '', d.intro), a);
    /* étiquettes : filtres cumulables */
    var tagsAll = []; P.forEach(function (p) { (p.tags || []).forEach(function (t) { if (tagsAll.indexOf(t) < 0) tagsAll.push(t); }); });
    var filters = el('div', 'lab-filters'); filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Filtrer par étiquette');
    function tagBtn(t, label) {
      var b = el('button', 'lab-tag', label || t); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--tag', d.palette[t] || '#c9d9ee'); b.dataset.tag = t; return b;
    }
    var allBtn = el('button', 'lab-all', 'Tout'); allBtn.type = 'button'; allBtn.setAttribute('aria-pressed', 'true'); filters.append(allBtn);
    tagsAll.forEach(function (t) { filters.append(tagBtn(t)); });
    /* rail */
    var railWrap = el('div', 'lab-railwrap'), prev = el('button', 'lab-nav lab-prev', '‹'), next = el('button', 'lab-nav lab-next', '›'), rail = el('div', 'lab-rail');
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Création précédente'); next.setAttribute('aria-label', 'Création suivante');
    rail.setAttribute('role', 'listbox'); rail.setAttribute('aria-label', 'Créations');
    railWrap.append(prev, rail, next);
    var count = el('p', 'lab-count'); count.setAttribute('aria-live', 'polite');
    var detail = el('section', 'lab-detail'); detail.setAttribute('aria-live', 'polite');

    function cardOf(p) {
      var c = el('button', 'lab-card'); c.type = 'button'; c.id = 'labc-' + p.id; c.setAttribute('role', 'option'); c.dataset.id = p.id;
      var m = el('span', 'lab-mark', p.mark); m.style.setProperty('--ac', p.accent);
      var dots = el('span', 'lab-dots'); (p.tags || []).forEach(function (t) { var s = el('i'); s.style.background = d.palette[t] || '#c9d9ee'; s.title = t; dots.append(s); });
      c.append(m, el('span', 'lab-cname', p.name), el('span', 'lab-cplat', p.platform), dots);
      c.addEventListener('click', function () { choose(p.id, true); });
      return c;
    }
    function metaRow(label, value) { var r = el('div', 'lab-meta'); r.append(el('dt', '', label), el('dd', '', value)); return r; }
    function render() {
      shown = P.filter(function (p) { var k = Object.keys(active); return !k.length || k.every(function (t) { return (p.tags || []).indexOf(t) >= 0; }); });
      rail.replaceChildren(); shown.forEach(function (p) { rail.append(cardOf(p)); });
      if (!shown.length) { rail.append(el('p', 'lab-none', 'Aucune création ne porte toutes ces étiquettes.')); detail.replaceChildren(); count.textContent = ''; return; }
      if (!shown.some(function (p) { return p.id === sel; })) sel = shown[0].id;
      choose(sel, false);
    }
    function choose(id, scroll) {
      sel = id; var p = P.filter(function (x) { return x.id === id; })[0], idx = shown.indexOf(p);
      rail.querySelectorAll('.lab-card').forEach(function (c) { var on = c.dataset.id === id; c.setAttribute('aria-selected', String(on)); c.tabIndex = on ? 0 : -1; if (on && scroll !== false) { var l = c.offsetLeft - (rail.clientWidth - c.offsetWidth) / 2; rail.scrollTo({ left: l, behavior: reduce ? 'auto' : 'smooth' }); } });
      count.textContent = (idx + 1) + ' / ' + shown.length;
      detail.replaceChildren();
      var main = el('div', 'lab-main'), head = el('div', 'lab-head'), mark = el('span', 'lab-mark big', p.mark), ht = el('div'), tg = el('div', 'lab-tagrow');
      mark.style.setProperty('--ac', p.accent); ht.append(el('h2', '', p.name), el('div', 'lab-platform', p.platform)); head.append(mark, ht);
      (p.tags || []).forEach(function (t) { var s = el('span', 'lab-chip', t); s.style.setProperty('--tag', d.palette[t] || '#c9d9ee'); tg.append(s); });
      main.append(head); if (tg.childNodes.length) main.append(tg);
      main.append(el('p', 'lab-summary', p.summary), el('p', 'lab-desc', p.detail));
      if (p.features && p.features.length) { var f = el('div', 'lab-feat'), ul = el('ul'); f.append(el('h3', '', 'Fonctions principales')); p.features.forEach(function (t) { ul.append(el('li', '', t)); }); f.append(ul); main.append(f); }
      var side = el('dl', 'lab-side'); [['État', p.status], ['Diffusion', p.visibility], ['Licence', p.license], ['Lien vers', 'Bientôt sur le Lab']].forEach(function (m) { side.append(metaRow(m[0], m[1])); });
      detail.append(main, side);
      prev.disabled = idx <= 0; next.disabled = idx >= shown.length - 1;
    }
    function step(dlt) { var i = shown.map(function (p) { return p.id; }).indexOf(sel) + dlt; if (i >= 0 && i < shown.length) { choose(shown[i].id, true); var c = document.getElementById('labc-' + sel); if (c && root.contains(document.activeElement)) c.focus({ preventScroll: true }); } }
    prev.addEventListener('click', function () { step(-1); }); next.addEventListener('click', function () { step(1); });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (e.key === 'Home') { e.preventDefault(); choose(shown[0].id, true); } else if (e.key === 'End') { e.preventDefault(); choose(shown[shown.length - 1].id, true); }
    });
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b === allBtn) active = {}; else { var t = b.dataset.tag; if (active[t]) delete active[t]; else active[t] = 1; }
      allBtn.setAttribute('aria-pressed', String(!Object.keys(active).length));
      filters.querySelectorAll('.lab-tag').forEach(function (x) { x.setAttribute('aria-pressed', String(!!active[x.dataset.tag])); });
      render();
    });
    root.append(intro, filters, railWrap, count, detail);
    host.replaceChildren(root); render();
  }
  function mount(scope) {
    var host = scope && scope.querySelector('.lab-mount'); if (!host) return;
    load(host.getAttribute('data-src')).then(function (d) { if (host.isConnected) build(host, d); },
      function () { host.textContent = 'Le Laboratoire n’a pas pu être chargé. Réessayez dans un instant.'; });
  }
  window.Codex.lab = { mount: mount };
})();
