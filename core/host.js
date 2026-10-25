/* ======================================================================
   CODEX MENTAL v3 — hôte commun
   Un seul point d'entrée pour tout ce qui est partagé entre les thèmes :
   événements, palette, chargement du thème actif, lecteur, sélecteur.
   Un thème = un dossier themes/<id>/ ; il ne connaît que window.Codex.
   ====================================================================== */
(function () {
  'use strict';
  var listeners = {};
  var Codex = window.Codex = {
    version: 3,
    theme: null,          // thème actif (contenu de theme.json)
    themes: [],           // thèmes proposés au lecteur
    catalog: null,        // rempli par reader.js
    sceneOk: false,
    on: function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return fn; },
    off: function (evt, fn) { listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; }); },
    emit: function (evt, data) { (listeners[evt] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { console.error('[Codex] ' + evt, e); } }); },
    /* Appelé par le shell (barre du haut) : la scène du thème s'abonne à 'navigate'. */
    navigate: function (id) { Codex.emit('navigate', { id: id === 'home' ? null : id, raw: id }); },
    /* Appelé par une scène quand elle arrive sur une rubrique : ouvre le lecteur. */
    open: function (id) { return Codex.reader && Codex.reader.open(id); },
    ui: {}
  };

  var params = new URLSearchParams(location.search);
  var KEY = 'codex.theme';
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(id) { try { localStorage.setItem(KEY, id); } catch (e) {} }
  function json(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url + ' → HTTP ' + r.status); return r.json(); }); }
  function addCss(href) {
    return new Promise(function (ok) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
      l.onload = l.onerror = function () { ok(); }; document.head.appendChild(l);
    });
  }
  function addScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { ko(new Error('Chargement impossible : ' + src)); };
      document.head.appendChild(s);
    });
  }
  Codex.ui.loadScript = addScript;

  var PAL = { bg: '--bg', fg: '--fg', fgSoft: '--fg-soft', muted: '--muted', hud: '--hud', accent: '--accent',
              accent2: '--accent-2', line: '--line', panel: '--panel', panelSolid: '--panel-solid', panelDeep: '--panel-deep' };
  function applyTheme(T) {
    var root = document.documentElement, p = T.palette || {};
    Object.keys(PAL).forEach(function (k) { if (p[k]) root.style.setProperty(PAL[k], p[k]); });
    var f = T.fonts || {};
    if (f.display) root.style.setProperty('--font-display', f.display);
    if (f.body) root.style.setProperty('--font-body', f.body);
    if (f.mono) root.style.setProperty('--font-mono', f.mono);
    var rd = T.reader || {};
    root.dataset.theme = T.id;
    root.dataset.readerLayout = rd.layout || 'wide';
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta && p.bg) meta.content = p.bg;
    document.title = 'Codex Mental · ' + T.label;
  }

  function message(txt) {
    var el = document.getElementById('scene-status'); if (!el) return;
    el.textContent = txt; el.hidden = !txt;
  }

  async function boot() {
    var registry = await json('themes/themes.json');
    var preview = params.has('preview');
    Codex.themes = registry.themes.filter(function (t) { return t.enabled !== false || preview; })
      .map(function (t) { return Object.assign({}, t, { preview: t.enabled === false }); });
    var want = params.get('theme') || stored() || registry.default;
    var entry = Codex.themes.filter(function (t) { return t.id === want; })[0] ||
                Codex.themes.filter(function (t) { return t.id === registry.default; })[0] || Codex.themes[0];
    var T = Codex.theme = Object.assign({ id: entry.id, label: entry.label }, await json('themes/' + entry.id + '/theme.json'));
    store(T.id);
    applyTheme(T);
    var base = 'themes/' + T.id + '/';
    // polices du thème
    if (T.fonts && T.fonts.href) { var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = T.fonts.href; document.head.appendChild(fl); }
    // lecteur (reader.js) charge le catalogue ; la barre en a besoin
    await (Codex.catalogReady || Promise.resolve());
    Codex.ui.buildShell && Codex.ui.buildShell();
    // scène
    var host = document.getElementById('scene');
    try {
      if (T.markup) host.insertAdjacentHTML('beforeend', await (await fetch(base + T.markup)).text());
      await Promise.all((T.css || []).map(function (c) { return addCss(base + c); }));
      // une bibliothèque injoignable n'est pas fatale : la scène décide si elle peut démarrer ou se replier
      for (var i = 0; i < (T.scripts || []).length; i++) { try { await addScript(T.scripts[i]); } catch (e) { console.warn(e.message); } }
      if (T.scene) await addScript(base + T.scene);
      Codex.sceneOk = !!(window.CodexScene && window.CodexScene.ok !== false);
      if (Codex.customize) Codex.customize.mount(T);
      if (!Codex.sceneOk) message("La scène n'a pas pu démarrer (WebGL indisponible ?). La lecture des articles reste disponible.");
    } catch (err) {
      console.error(err);
      message("La scène 3D n'a pas pu se charger (connexion ou WebGL). La lecture des articles reste disponible.");
      var ld = document.getElementById('loading');
      if (ld) { ld.textContent = "La scène n'a pas pu se charger."; ld.classList.remove('done'); }
    }
    document.documentElement.classList.add('ready');
    Codex.emit('ready', T);
    restore();
  }

  /* Rouvre la lecture indiquée dans l'adresse (#rubrique ou #article), par exemple après un changement de thème. */
  function restore() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h || !Codex.catalog) return;
    var art = Codex.catalog.articles[h], sec = art ? null : Codex.catalog.sections.filter(function (s) { return s.id === h; })[0];
    if (!art && !sec) return;
    Codex.reader.route();
  }

  document.addEventListener('DOMContentLoaded', function () {
    boot().catch(function (err) {
      console.error(err);
      var el = document.getElementById('scene-status');
      if (el) { el.hidden = false; el.textContent = 'Le site n\'a pas pu démarrer : ' + err.message; }
    });
  });
})();
