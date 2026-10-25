/* ======================================================================
   Laboratoire — vitrine de présentation des créations (outils, CSS, apps).
   Les données sont dans content/lab/projects.json ; la version complète
   (infos, versions, téléchargements) vivra plus tard sur un sous-domaine.
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
    var P = d.projects, sel = 0, btns = [];
    var root = el('div', 'lab');
    var intro = el('div', 'lab-intro'), p = el('p', '', d.intro), a = el('a', '', d.repoLabel);
    a.href = d.repo; a.target = '_blank'; a.rel = 'noopener noreferrer';
    intro.append(p, a);
    var wheel = el('nav', 'lab-wheel'); wheel.setAttribute('aria-label', 'Sélection des créations');
    var up = el('button', 'lab-arrow', '⌃'), down = el('button', 'lab-arrow', '⌄');
    up.type = down.type = 'button'; up.setAttribute('aria-label', 'Création précédente'); down.setAttribute('aria-label', 'Création suivante');
    wheel.append(up);
    var tags = el('div', 'lab-tags'), detail = el('section', 'lab-detail'), rail = el('div', 'lab-rail');
    detail.setAttribute('aria-live', 'polite');
    function choose(i, focus) {
      sel = (i + P.length) % P.length; var it = P[sel];
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === sel)); });
      if (btns[sel] && btns[sel].scrollIntoView && focus !== false) { /* défilement local de la roue seulement */
        var w = wheel, b = btns[sel];
        if (getComputedStyle(w).flexDirection === 'row') w.scrollTo({ left: b.offsetLeft - w.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
      }
      tags.replaceChildren(); (it.tags || []).forEach(function (t) { var s = el('span', 'lab-tag', t); s.style.setProperty('--tag', d.palette[t] || '#c9d9ee'); tags.append(s); });
      detail.replaceChildren();
      var head = el('div', 'lab-head'), mark = el('span', 'lab-mark', it.mark), ht = el('div');
      mark.style.setProperty('--ac', it.accent); ht.append(el('h2', '', it.name), el('div', 'lab-platform', it.platform)); head.append(mark, ht);
      detail.append(head, el('p', 'lab-summary', it.summary), el('p', 'lab-desc', it.detail));
      if (it.features && it.features.length) {
        var f = el('div', 'lab-feat'); f.append(el('strong', '', 'Fonctions principales'));
        var ul = el('ul'); it.features.forEach(function (t) { ul.append(el('li', '', t)); }); f.append(ul); detail.append(f);
      }
      rail.replaceChildren();
      [['État', it.status], ['Diffusion', it.visibility], ['Licence', it.license], ['Lien vers', 'Bientôt sur le Lab']].forEach(function (m) {
        var c = el('div', 'lab-meta'); c.append(el('small', '', m[0]), el('strong', '', m[1])); rail.append(c);
      });
    }
    P.forEach(function (it, i) {
      var b = el('button', 'lab-choice'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      var m = el('span', 'lab-mark', it.mark); m.style.setProperty('--ac', it.accent);
      b.append(m, el('span', 'lab-name', it.name)); b.addEventListener('click', function () { choose(i); }); wheel.append(b); btns.push(b);
    });
    wheel.append(down);
    up.addEventListener('click', function () { choose(sel - 1); }); down.addEventListener('click', function () { choose(sel + 1); });
    wheel.addEventListener('wheel', function (e) {   // la molette feuillette la roue sans faire défiler la page
      if (getComputedStyle(wheel).flexDirection !== 'column' || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault(); choose(sel + (e.deltaY > 0 ? 1 : -1), false);
    }, { passive: false });
    wheel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); choose(sel + 1); btns[sel].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); choose(sel - 1); btns[sel].focus(); }
    });
    root.append(intro, wheel, tags, detail, rail);
    host.replaceChildren(root); choose(0, false);
  }
  function mount(scope) {
    var host = scope && scope.querySelector('.lab-mount'); if (!host) return;
    load(host.getAttribute('data-src')).then(function (d) { if (host.isConnected) build(host, d); },
      function () { host.textContent = 'Le Laboratoire n’a pas pu être chargé. Réessayez dans un instant.'; });
  }
  window.Codex.lab = { mount: mount };
})();
