/* ======================================================================
   Laboratoire — vitrine des créations (apps, outils, concepts).
   Données : content/lab/projects.json. À gauche, une roulette verticale ;
   à droite, la fiche de la création choisie. Les étiquettes ne servent
   qu'à identifier : elles ne filtrent rien.
   ====================================================================== */
(function () {
  'use strict';
  var cache = null, STEP = 52;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function load(url) {
    if (cache) return Promise.resolve(cache);
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { return (cache = d); });
  }
  function build(host, d) {
    var P = d.projects, sel = 0, root = el('div', 'lab');
    root.append(el('p', 'lab-intro', d.intro));
    var body = el('div', 'lab-body'), wheelBox = el('div', 'lab-wheelbox');
    var up = el('button', 'lab-nav', '▲'), down = el('button', 'lab-nav', '▼'), wheel = el('div', 'lab-wheel'), list = el('ul', 'lab-list');
    up.type = down.type = 'button'; up.setAttribute('aria-label', 'Création précédente'); down.setAttribute('aria-label', 'Création suivante');
    wheel.setAttribute('role', 'listbox'); wheel.setAttribute('aria-label', 'Créations'); wheel.tabIndex = 0;
    var items = P.map(function (p, i) {
      var li = el('li', 'lab-item'); li.setAttribute('role', 'option'); li.id = 'labi-' + i;
      var m = el('span', 'lab-mark', p.mark); m.style.setProperty('--ac', p.accent);
      li.append(m, el('span', 'lab-iname', p.name)); li.addEventListener('click', function () { go(i); }); list.append(li); return li;
    });
    wheel.append(list); wheelBox.append(up, wheel, down);
    var detail = el('section', 'lab-detail'); detail.setAttribute('aria-live', 'polite');
    body.append(wheelBox, detail); root.append(body);

    function layout() {
      items.forEach(function (li, i) {
        var o = i - sel, a = Math.abs(o);
        li.style.transform = 'translateY(' + (o * STEP) + 'px) scale(' + Math.max(.62, 1 - a * .1).toFixed(3) + ')';
        li.style.opacity = a > 3 ? 0 : (1 - a * .17).toFixed(2);
        li.style.pointerEvents = a > 3 ? 'none' : '';
        li.setAttribute('aria-selected', String(i === sel)); li.style.zIndex = 10 - a;
      });
      wheel.setAttribute('aria-activedescendant', 'labi-' + sel);
      up.disabled = sel <= 0; down.disabled = sel >= P.length - 1;
    }
    function row(label, v) { var r = el('div', 'lab-meta'); r.append(el('dt', '', label), el('dd', '', v)); return r; }
    function show() {
      var p = P[sel]; detail.replaceChildren();
      var head = el('div', 'lab-head'), mark = el('span', 'lab-mark big', p.mark), ht = el('div');
      mark.style.setProperty('--ac', p.accent); ht.append(el('p', 'lab-group', p.group), el('h2', '', p.name), el('div', 'lab-platform', p.platform)); head.append(mark, ht);
      var tg = el('div', 'lab-tagrow'); (p.tags || []).forEach(function (t) { var s = el('span', 'lab-chip', t); s.style.setProperty('--tag', d.palette[t] || '#c9d9ee'); tg.append(s); });
      detail.append(head, tg, el('p', 'lab-summary', p.summary), el('p', 'lab-desc', p.detail));
      if (p.features && p.features.length) { var f = el('div', 'lab-feat'), ul = el('ul'); f.append(el('h3', '', 'Fonctions principales')); p.features.forEach(function (t) { ul.append(el('li', '', t)); }); f.append(ul); detail.append(f); }
      var side = el('dl', 'lab-side');
      [['État', p.state], ['Accès', p.access], ['Technologies', p.tech], ['Évolutions prévues', p.next], ['Diffusion', p.diffusion], ['Licence', p.license], ['Téléchargement', p.download]].forEach(function (m) { if (m[1]) side.append(row(m[0], m[1])); });
      detail.append(side);
    }
    function go(i) { i = Math.max(0, Math.min(P.length - 1, i)); if (i === sel && detail.childNodes.length) return; sel = i; layout(); show(); }
    up.addEventListener('click', function () { go(sel - 1); }); down.addEventListener('click', function () { go(sel + 1); });
    wheel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(sel + 1); } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(sel - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); } else if (e.key === 'End') { e.preventDefault(); go(P.length - 1); }
    });
    var acc = 0;
    wheelBox.addEventListener('wheel', function (e) {
      var dir = e.deltaY > 0 ? 1 : -1, n = sel + dir; if (n < 0 || n >= P.length) return;
      e.preventDefault(); acc += e.deltaY; if (Math.abs(acc) > 40) { go(n); acc = 0; }
    }, { passive: false });
    var ty = null; wheel.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
    wheel.addEventListener('touchend', function (e) { if (ty == null) return; var dy = e.changedTouches[0].clientY - ty; ty = null; if (Math.abs(dy) > 30) go(sel + (dy < 0 ? 1 : -1)); });
    host.replaceChildren(root); layout(); show();
  }
  function mount(scope) {
    var host = scope && scope.querySelector('.lab-mount'); if (!host) return;
    load(host.getAttribute('data-src')).then(function (d) { if (host.isConnected) build(host, d); },
      function () { host.textContent = 'Le Laboratoire n’a pas pu être chargé. Réessayez dans un instant.'; });
  }
  window.Codex.lab = { mount: mount };
})();
