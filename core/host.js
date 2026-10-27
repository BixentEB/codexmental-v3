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

  /* petite présentation sous le titre du thème (texte unique : content/who.json ; emplacement : « who » dans theme.json) */
  function addWho(T) {
    if (!T.who) return;
    json('content/who.json').then(function (w) {
      var ref = document.querySelector(T.who.after || T.who.append); if (!ref || document.querySelector('.cx-who')) return;
      var d = document.createElement('div'); d.className = 'cx-who';
      var s = document.createElement('strong'); s.textContent = w.lead; var p = document.createElement('p'); p.textContent = w.text; d.append(s, p);
      if (w.sign) { var g = document.createElement('em'); g.className = 'sig'; g.textContent = w.sign; d.append(g); }
      if (T.who.after) ref.insertAdjacentElement('afterend', d); else ref.appendChild(d);
    }).catch(function () {});
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
    // garde-fou : si la visite précédente ne s'est pas terminée proprement (plantage du navigateur), on revient au thème par défaut
    var crashed = null;
    try { var cf = JSON.parse(localStorage.getItem('codex.boot') || 'null'); if (cf && cf.id) crashed = cf.id; localStorage.removeItem('codex.boot'); } catch (e) {}
    var want = params.get('theme') || stored() || registry.default;
    // démarrage sécurisé : ?scene=off coupe les scènes (le lecteur reste), ?scene=on les rétablit
    var sp = params.get('scene');
    // « manual » = coupure demandée par ?scene=off (durable) ; l'ancienne valeur « off », posée automatiquement après un faux plantage, est effacée
    try { if (sp === 'off') localStorage.setItem('codex.scene', 'manual'); else if (sp === 'on') { localStorage.removeItem('codex.scene'); } else if (localStorage.getItem('codex.scene') === 'off') localStorage.removeItem('codex.scene'); } catch (e) {}
    var sceneOff = sp === 'off' || (sp !== 'on' && (function () { try { return localStorage.getItem('codex.scene') === 'manual'; } catch (e) { return false; } })());
    if (crashed && sp !== 'on' && !params.get('theme')) {
      if (crashed !== registry.default) { want = registry.default; Codex.recovered = crashed; }
      // plantage sur le thème par défaut : on ne coupe pas, on allège (scène quasi figée pour cette visite, niveau économe ensuite)
      else if (Codex.perf) { Codex.perf.cap('still'); Codex.perf.remember('low'); Codex.recoveredSoft = true; }
    }
    // performance adaptative (core/perf.js) : « off » n'existe que sur choix explicite (menu, ?perf=off) ; niveau économe = pas de thème gourmand au démarrage automatique
    var PF = Codex.perf;
    if (PF && PF.off && sp !== 'on') { sceneOff = true; Codex.perfOff = true; }
    // thème gourmand (heavy) : il ne démarre tout seul depuis la mémoire du navigateur qu'après avoir déjà tenu 8 s sur cet appareil ; demandé explicitement (menu, ?theme=), il démarre toujours
    var okList = []; try { okList = JSON.parse(localStorage.getItem('codex.ok') || '[]'); } catch (e) {}
    var wantT = Codex.themes.filter(function (t) { return t.id === want; })[0];
    if (wantT && wantT.heavy && !params.get('theme') && (okList.indexOf(want) < 0 || (PF && (PF.tier === 'low' || PF.tier === 'still'))) && want !== registry.default) { Codex.deferred = wantT.label; want = registry.default; }
    var entry = Codex.themes.filter(function (t) { return t.id === want; })[0] ||
                Codex.themes.filter(function (t) { return t.id === registry.default; })[0] || Codex.themes[0];
    var T = Codex.theme = Object.assign({ id: entry.id, label: entry.label }, await json('themes/' + entry.id + '/theme.json'));
    store(T.id);
    if (!sceneOff) try { localStorage.setItem('codex.boot', JSON.stringify({ id: T.id, t: Date.now() })); } catch (e) {}
    var okBoot = function () { try { localStorage.removeItem('codex.boot'); } catch (e) {} };
    var okStable = function () { okBoot(); if (sceneOff || document.hidden) return; try { var l = JSON.parse(localStorage.getItem('codex.ok') || '[]'); if (l.indexOf(T.id) < 0) { l.push(T.id); localStorage.setItem('codex.ok', JSON.stringify(l)); } } catch (e) {} };
    window.addEventListener('pagehide', okBoot); setTimeout(okStable, 8000);
    applyTheme(T);
    var base = 'themes/' + T.id + '/';
    // polices du thème
    if (T.fonts && T.fonts.href) { var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = T.fonts.href; document.head.appendChild(fl); }
    // lecteur (reader.js) charge le catalogue ; la barre en a besoin
    await (Codex.catalogReady || Promise.resolve());
    Codex.ui.buildShell && Codex.ui.buildShell();
    // scène
    var host = document.getElementById('scene');
    if (sceneOff) {
      Codex.sceneOk = false; Codex.safe = true; document.documentElement.classList.add('noscene');
    } else try {
      if (T.markup) host.insertAdjacentHTML('beforeend', await (await fetch(base + T.markup)).text());
      await Promise.all((T.css || []).map(function (c) { return addCss(base + c); }));
      // une bibliothèque injoignable n'est pas fatale : la scène décide si elle peut démarrer ou se replier
      for (var i = 0; i < (T.scripts || []).length; i++) { try { await addScript(T.scripts[i]); } catch (e) { console.warn(e.message); } }
      if (T.scene) await addScript(base + T.scene);
      Codex.sceneOk = !!(window.CodexScene && window.CodexScene.ok !== false);
      addWho(T);
      if (Codex.customize) Codex.customize.mount(T);
      if (!Codex.sceneOk) document.documentElement.classList.add('noscene');
      if (!Codex.sceneOk) message("La scène n'a pas pu démarrer (WebGL indisponible ?). La lecture des articles reste disponible.");
    } catch (err) {
      console.error(err);
      document.documentElement.classList.add('noscene');
      message("La scène 3D n'a pas pu se charger (connexion ou WebGL). La lecture des articles reste disponible.");
      var ld = document.getElementById('loading');
      if (ld) { ld.textContent = "La scène n'a pas pu se charger."; ld.classList.remove('done'); }
    }
    document.documentElement.classList.add('ready');
    if (Codex.perfOff) message('Animations désactivées (votre choix). Vous pouvez les rétablir depuis le menu des thèmes, rubrique « Qualité des animations ».');
    else if (Codex.safe) message("Mode sans scène : les animations sont coupées, la lecture fonctionne normalement. Pour les rétablir, ajoutez ?scene=on à l’adresse.");
    else if (Codex.deferred) { message('Le thème « ' + Codex.deferred + ' » est gourmand : il ne démarre que lorsque vous le choisissez dans le menu des thèmes.'); setTimeout(function () { message(''); }, 9000); }
    else if (Codex.recovered) message("Le thème « " + Codex.recovered + " » a fait planter la visite précédente : retour au thème par défaut. Vous pouvez le réessayer depuis le menu des thèmes.");
    if (Codex.recovered) setTimeout(function () { message(''); }, 14000);
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
      document.documentElement.classList.add('noscene');
      var el = document.getElementById('scene-status');
      if (el) { el.hidden = false; el.textContent = 'Le site n\'a pas pu démarrer : ' + err.message; }
    });
  });
})();
