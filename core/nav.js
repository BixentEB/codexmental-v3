/* ======================================================================
   CODEX MENTAL v3 — commandes communes de navigation dans les scènes
   (mêmes gestes que sur obs.codexmental.com)
   - clic droit sans glisser sur la scène : retour d'une étape
       lecteur ouvert → on le ferme (la scène reste sur l'objet) ;
       objet choisi → vue d'ensemble ;
   - Échap, en cascade : menu ou panneau ouvert → fermé (gestionnaires existants),
       lecteur ouvert → fermé, objet choisi → vue d'ensemble ;
   - fil d'Ariane discret dans la scène quand un objet est choisi (« Système solaire › Jupiter ») ;
   - petit rappel des raccourcis, une seule fois, au premier objet choisi (souris uniquement) ;
   - réglages dans le menu des thèmes : ligne « Raccourcis » + interrupteur du clic droit.
   Une scène peut préciser :  Codex.sceneLabel = function (id) { return 'Jupiter'; }
                              Codex.sceneRoot  = 'Système solaire';
   Tout passe par Codex.navigate('home') : chaque thème sait déjà revenir à sa vue d'ensemble.
   ====================================================================== */
(function () {
  'use strict';
  var C = window.Codex; if (!C) return;
  var KEY_RC = 'codex.rclick', KEY_HINT = 'codex.hint.nav';
  var rclick = true; try { rclick = localStorage.getItem(KEY_RC) !== '0'; } catch (e) {}
  var selected = null, crumbEl = null, hintEl = null;
  var html = document.documentElement;
  var ROOTS = { heliosphere: 'Système solaire', galactique: 'Galaxie', voisinage: 'Voisinage stellaire', 'poste-pilotage': 'Caeles' };

  function reading() { return !!(C.reader && C.reader.isOpen); }
  function labelOf(id) {
    if (!id) return '';
    if (typeof C.sceneLabel === 'function') { var l = C.sceneLabel(id); if (l) return l; }
    var s = C.catalog && C.catalog.sections.filter(function (x) { return x.id === id; })[0];
    return s ? s.label : id;
  }
  function rootName() { return C.sceneRoot || (C.theme && (ROOTS[C.theme.id] || C.theme.label)) || 'Vue d’ensemble'; }

  function home() {
    if (reading()) C.reader.close();
    selected = null; render();
    C.navigate('home');
  }
  function back() {
    if (reading()) { C.reader.close(); return 'reader'; }
    if (selected) { home(); return 'home'; }
    return null;
  }
  C.nav = { back: back, home: home, get selected() { return selected; } };

  /* l'objet choisi : annoncé par la scène (nav:active) ou demandé par la barre (navigate) */
  // Le lecteur annonce aussi « plus rien » en se fermant ; une scène qui reste sur l'objet après la fermeture
  // (Héliosphère, Poste de pilotage : Codex.sceneKeepsOnClose = true) garde donc son objet choisi.
  var closing = false;
  C.on('reader:close', function () { closing = true; setTimeout(function () { closing = false; }, 0); render(); });
  C.on('nav:active', function (id) {
    if (!id && closing && C.sceneKeepsOnClose) return;
    selected = id || null; render(); if (id) hint();
  });
  C.on('navigate', function (e) { if (!e.id) { selected = null; render(); } });
  C.on('reader:open', render);

  /* ---------- fil d'Ariane ---------- */
  function render() {
    if (!crumbEl) return;
    var show = !!selected && C.sceneOk && !html.classList.contains('noscene');
    crumbEl.hidden = !show;
    if (!show) return;
    crumbEl.innerHTML = '';
    var a = document.createElement('button'); a.type = 'button'; a.className = 'cx-cr-root'; a.textContent = rootName();
    a.addEventListener('click', home);
    var sep = document.createElement('span'); sep.className = 'cx-cr-sep'; sep.setAttribute('aria-hidden', 'true'); sep.textContent = '›';
    var cur = document.createElement('span'); cur.className = 'cx-cr-cur'; cur.setAttribute('aria-current', 'location'); cur.textContent = labelOf(selected);
    crumbEl.append(a, sep, cur);
  }

  /* ---------- rappel des raccourcis (une fois, à la souris) ---------- */
  function hint() {
    if (hintEl || !rclick) return;
    if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;
    try { if (localStorage.getItem(KEY_HINT)) return; localStorage.setItem(KEY_HINT, '1'); } catch (e) { return; }
    hintEl = document.createElement('div'); hintEl.className = 'cx-hint'; hintEl.setAttribute('role', 'status');
    hintEl.innerHTML = '<kbd>clic droit</kbd> retour <span aria-hidden="true">·</span> <kbd>Échap</kbd> vue d’ensemble';
    document.body.appendChild(hintEl);
    requestAnimationFrame(function () { hintEl.classList.add('on'); });
    setTimeout(function () { hintEl.classList.remove('on'); setTimeout(function () { hintEl.remove(); }, 800); }, 6500);
  }

  /* ---------- clic droit sans glisser ---------- */
  var down = null;
  function inScene(t) { var s = document.getElementById('scene'); return s && s.contains(t) && !t.closest('input, select, textarea, button, a, [contenteditable]'); }
  window.addEventListener('pointerdown', function (e) {
    down = (e.button === 2 && inScene(e.target)) ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
  }, true);
  window.addEventListener('pointerup', function (e) {
    if (e.button !== 2 || !down) return;
    var d = down; down = null;
    if (!rclick || !C.sceneOk) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || e.timeStamp - d.t > 700) return;   // un glisser du clic droit déplace la vue : ce n'est pas un retour
    back();
  }, true);
  document.addEventListener('contextmenu', function (e) { if (rclick && C.sceneOk && inScene(e.target)) e.preventDefault(); });

  /* ---------- Échap en cascade ----------
     On note l'état AVANT que les autres gestionnaires agissent (phase de capture),
     puis on n'agit qu'en dernier, et seulement si rien d'autre n'était ouvert. */
  var busy = false;
  function somethingOpen() {
    if (reading()) return true;
    var m = document.getElementById('theme-menu'); if (m && !m.hidden) return true;
    if (html.classList.contains('cx-custom-open')) return true;
    if (document.body.classList.contains('solar-settings-open')) return true;
    if (document.querySelector('.mv-open, .lightbox:not([hidden]), dialog[open]')) return true;
    var sc = document.getElementById('scene');
    if (sc && sc.querySelector('[aria-expanded="true"], details[open]')) return true;
    return false;
  }
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') busy = somethingOpen(); }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || busy || e.defaultPrevented) return;
    var t = e.target; if (t && t.closest && t.closest('input, select, textarea, [contenteditable]')) return;
    if (selected && C.sceneOk) home();
  });

  /* ---------- réglages : ligne dans le menu des thèmes ---------- */
  function settingsRow() {
    var menu = document.getElementById('theme-menu'); if (!menu || menu.querySelector('.cx-keys-row')) return;
    var li = document.createElement('li'); li.className = 'perf-row cx-keys-row'; li.setAttribute('role', 'none');
    li.innerHTML = '<label class="cx-keys-sw"><input type="checkbox" id="cx-rclick"> Clic droit : retour d’une étape</label>' +
      '<small class="perf-hint">Raccourcis dans les scènes : <kbd>clic droit</kbd> retour · <kbd>Échap</kbd> vue d’ensemble.</small>';
    var perf = menu.querySelector('.perf-row'); menu.insertBefore(li, perf || null);
    var cb = li.querySelector('input'); cb.checked = rclick;
    cb.addEventListener('change', function () { rclick = cb.checked; try { localStorage.setItem(KEY_RC, rclick ? '1' : '0'); } catch (e) {} });
  }

  C.on('ready', function () {
    crumbEl = document.createElement('nav'); crumbEl.className = 'cx-crumbs'; crumbEl.setAttribute('aria-label', 'Position dans la scène'); crumbEl.hidden = true;
    document.body.appendChild(crumbEl);
    settingsRow(); render();
  });
})();
