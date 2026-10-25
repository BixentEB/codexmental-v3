/* ======================================================================
   Médias du lecteur
   - transforme les images d'un article en miniatures ;
   - les ouvre dans une fenêtre (lightbox) avec croix, flèches et Échap ;
   - n'autorise qu'un seul bloc <details> ouvert à la fois.
   Les articles ne contiennent rien de spécial : tout se fait ici, pour
   toutes les pages, présentes et futures.
   ====================================================================== */
(function () {
  'use strict';
  var Codex = window.Codex;
  var rd = document.getElementById('reader'), main = document.getElementById('rd-main');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THUMB = 520, FULL = 1800;

  function withParam(url, key, val) {
    try { var u = new URL(url, location.href); u.searchParams.set(key, val); return u.toString(); } catch (e) { return url; }
  }
  function sized(url, w) {   // Wikimedia et Unsplash savent servir une version réduite
    if (/commons\.wikimedia\.org\/wiki\/Special:(Redirect\/file|FilePath)\//.test(url)) return withParam(url, 'width', w);
    if (/images\.unsplash\.com\//.test(url)) return withParam(url, 'w', w);
    return url;
  }
  function isImg(u) { return /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(u || '') || /Special:(Redirect\/file|FilePath)\//.test(u || ''); }

  /* ---------- miniatures ---------- */
  function restructureRefs(root) {   // « Esprits » : l'image passe sous le premier paragraphe du texte
    root.querySelectorAll('.ref-feature').forEach(function (feat) {
      var art = feat.querySelector('.ref-art'), copy = feat.querySelector('.ref-copy');
      if (!art || !copy) return;
      var row = document.createElement('div'); row.className = 'th-row';
      var mainImg = art.querySelector(':scope > img'), mainCap = art.querySelector(':scope > figcaption');
      if (mainImg) {
        var f = document.createElement('figure'); f.appendChild(mainImg);
        if (mainCap) f.appendChild(mainCap);
        row.appendChild(f);
      }
      art.querySelectorAll('figure').forEach(function (fg) { row.appendChild(fg); });
      var p = copy.querySelector(':scope > p');
      if (p) p.after(row); else copy.appendChild(row);
      art.remove();
    });
  }
  function moveGalleries(root) {     // Civilisations, Fascinations : la galerie descend sous le premier paragraphe
    root.querySelectorAll('[class*="gallery"]').forEach(function (g) {
      if (g.dataset.place === 'keep' || g.closest('.th-row') || g.querySelector('.th-row')) return;
      if (!g.querySelector('img') || g.parentNode.closest('[class*="gallery"]')) return;
      var after = null;   // premier paragraphe d'une <section> de l'article (et pas du lecteur lui-même, qui est une <section> aussi)
      g.parentNode.querySelectorAll('p').forEach(function (p) {
        if (after || g.contains(p) || /credit/.test(p.className || '')) return;
        var s = p.closest('section'); if (s && s !== g.parentNode && g.parentNode.contains(s)) after = p;
      });
      var credit = g.nextElementSibling && /credit/.test(g.nextElementSibling.className || '') ? g.nextElementSibling : null;
      if (after && !g.contains(after)) { after.after(g); if (credit) g.after(credit); }
    });
  }
  function enhance(root) {
    root = root || main;
    var prose = root.querySelector('.prose'); if (!prose) return;
    restructureRefs(prose); moveGalleries(prose);
    var n = 0;
    prose.querySelectorAll('img').forEach(function (img) {
      if (img.closest('.codex-nexus-person') || img.classList.contains('astra-avatar') || img.dataset.thumb === 'no') return;
      var a = img.parentElement && img.parentElement.tagName === 'A' ? img.parentElement : null;
      var full = (a && isImg(a.getAttribute('href'))) ? a.getAttribute('href') : (img.currentSrc || img.src);
      if (a && a.childNodes.length === 1) { a.replaceWith(img); }   // le lien vers le fichier devient un agrandissement
      var fig = img.closest('figure');
      if (!fig) { fig = document.createElement('figure'); img.replaceWith(fig); fig.appendChild(img); }
      fig.classList.add('th-fig');
      img.dataset.full = sized(full, FULL);
      var thumb = sized(img.getAttribute('src'), THUMB);
      if (thumb !== img.getAttribute('src')) img.src = thumb;
      img.classList.add('th'); img.tabIndex = 0; img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Agrandir l’image' + (img.alt ? ' : ' + img.alt : ''));
      var cap = fig.querySelector('figcaption');
      if (!cap && img.alt) img.dataset.cap = img.alt;
      n++;
    });
    // les groupes de miniatures se rangent côte à côte
    var seen = [];
    prose.querySelectorAll('figure.th-fig').forEach(function (f) {
      var p = f.parentElement; if (p && seen.indexOf(p) < 0 && p !== prose) seen.push(p);
    });
    seen.forEach(function (p) { p.classList.add('th-row'); });
    // un seul bloc ouvert à la fois, dès l'arrivée
    var open = prose.querySelectorAll('details[open]');
    for (var i = 1; i < open.length; i++) if (!open[i].contains(open[0]) && !open[0].contains(open[i])) open[i].removeAttribute('open');
  }

  /* ---------- lightbox ---------- */
  var lb = null, items = [], cur = -1, opener = null, ELS = {};
  function build() {
    lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image agrandie');
    lb.innerHTML = '<button type="button" class="lb-x" aria-label="Fermer l’image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button type="button" class="lb-nav lb-prev" aria-label="Image précédente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-nav lb-next" aria-label="Image suivante"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>';
    document.body.appendChild(lb);
    ELS = { img: lb.querySelector('img'), cap: lb.querySelector('figcaption'), x: lb.querySelector('.lb-x'), prev: lb.querySelector('.lb-prev'), next: lb.querySelector('.lb-next') };
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-x') || e.target === lb || e.target.classList.contains('lb-fig')) close();
      else if (e.target.closest('.lb-prev')) step(-1);
      else if (e.target.closest('.lb-next')) step(1);
    });
  }
  function capOf(img) {
    var f = img.closest('figure'), c = f && f.querySelector('figcaption');
    if (c) return c.textContent.replace(/\s+/g, ' ').trim();
    return img.dataset.cap || img.alt || '';
  }
  function show(i) {
    cur = (i + items.length) % items.length;
    var t = items[cur], thumb = t.currentSrc || t.src, full = t.dataset.full || thumb;
    ELS.img.alt = t.alt || ''; ELS.img.src = thumb; ELS.img.classList.add('loading');
    var big = new Image();
    big.onload = function () { if (items[cur] === t) { ELS.img.src = full; ELS.img.classList.remove('loading'); } };
    big.onerror = function () { ELS.img.classList.remove('loading'); };
    big.src = full;
    ELS.cap.textContent = capOf(t);
    var multi = items.length > 1; ELS.prev.hidden = ELS.next.hidden = !multi;
  }
  function step(d) { if (items.length > 1) show(cur + d); }
  function openLb(img) {
    if (!lb) build();
    items = Array.prototype.slice.call(main.querySelectorAll('.prose img.th'));
    var i = items.indexOf(img); if (i < 0) return;
    opener = img; lb.hidden = false; document.documentElement.classList.add('lb-open');
    show(i); ELS.x.focus({ preventScroll: true });
  }
  function close() {
    if (!lb || lb.hidden) return;
    lb.hidden = true; document.documentElement.classList.remove('lb-open'); ELS.img.removeAttribute('src');
    if (opener && opener.isConnected) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
    opener = null;
  }
  main.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('.prose img.th'); if (!img) return;
    e.preventDefault(); openLb(img);
  });
  main.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.prose img.th')) { e.preventDefault(); openLb(e.target); }
  });
  window.addEventListener('keydown', function (e) {   // en phase de capture : Échap ferme l'image avant le lecteur
    if (!lb || lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); step(-1); }
    else if (e.key === 'Tab') {
      var f = [ELS.x, ELS.prev, ELS.next].filter(function (b) { return !b.hidden; }), i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }, true);
  Codex.on('reader:close', close);

  /* ---------- un seul bloc <details> ouvert ---------- */
  main.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open || !d.closest('.prose')) return;
    main.querySelectorAll('.prose details[open]').forEach(function (o) {
      if (o !== d && !o.contains(d) && !d.contains(o)) o.removeAttribute('open');
    });
    requestAnimationFrame(function () {   // le bloc refermé libère de la place : on recale la vue sur celui qu'on vient d'ouvrir
      var r = d.getBoundingClientRect(), m = main.getBoundingClientRect();
      if (r.top < m.top + 6 || r.top > m.bottom - 80) main.scrollBy({ top: r.top - m.top - 14, behavior: reduce ? 'auto' : 'smooth' });
    });
  }, true);

  /* ---------- YouTube à la demande : l'iframe n'existe qu'après un clic ---------- */
  main.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.yt-facade .yt-play'); if (!b) return;
    var box = b.parentNode, id = box.getAttribute('data-yt'); if (!id) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.title = b.getAttribute('aria-label') || 'Lecture YouTube';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
    box.classList.add('on'); box.replaceChildren(f);
  });

  Codex.media = { enhance: enhance, close: close };
})();
