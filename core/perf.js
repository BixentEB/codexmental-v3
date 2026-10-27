/* ======================================================================
   CODEX MENTAL v3 — performance adaptative
   Objectif : que le site ne fasse jamais souffrir un appareil, sans rien régler.
   1) à l'arrivée : on estime la puissance (cœurs, mémoire, mobile, carte graphique, rendu logiciel) ;
   2) pendant la visite : on surveille la fluidité et on allège pas à pas (définition, cadence, puis scène quasi figée) ;
      la scène n'est JAMAIS coupée automatiquement : un visiteur ne doit pas tomber sur un écran noir.
      Seul un choix explicite (menu > Sans animation, ?perf=off, ?scene=off) la coupe ;
   3) on retient ce qu'on a appris (une semaine) pour que la visite suivante démarre au bon niveau.
   Les scènes ne connaissent que : Codex.perf.scale, CodexPx(max), CodexRaf(fn) et l'événement 'perf'.
   Réglage manuel : ?perf=high|medium|low|still|off|auto  (retenu), menu des thèmes > Qualité.
   ====================================================================== */
(function () {
  'use strict';
  var C = window.Codex; if (!C) return;
  var KEY = 'codex.perf', PREF = 'codex.perfpref', WEEK = 6048e5;
  var ORDER = ['high', 'medium', 'low', 'still', 'off'], FLOOR = 'still';   // FLOOR : plancher automatique
  var TIERS = {
    high:   { scale: 1,   gap: 1000 / 62, label: 'Haute' },
    medium: { scale: .8,  gap: 1000 / 40, label: 'Moyenne' },
    low:    { scale: .6,  gap: 1000 / 24, label: 'Économe' },
    still:  { scale: .5,  gap: 1000,      label: 'Minimale' },   // une image par seconde : la scène reste visible, l'appareil se repose
    off:    { scale: .5,  gap: 1000 / 24, label: 'Sans animation' }
  };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  var params = new URLSearchParams(location.search);

  /* ---------- 1. estimation à l'arrivée ---------- */
  var info = { cores: navigator.hardwareConcurrency || 4, mem: navigator.deviceMemory || 0, mobile: false, saveData: false, webgl: false, soft: false, gpu: '' };
  try { info.mobile = (window.matchMedia && matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent); } catch (e) {}
  try { info.saveData = !!(navigator.connection && navigator.connection.saveData); } catch (e) {}
  (function probe() {
    try {
      var a = document.createElement('canvas'), g = a.getContext('webgl', { failIfMajorPerformanceCaveat: true });
      if (g) { info.webgl = true; var e = g.getExtension('WEBGL_debug_renderer_info'); if (e) info.gpu = String(g.getParameter(e.UNMASKED_RENDERER_WEBGL) || ''); var l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
      else { var b = document.createElement('canvas'), g2 = b.getContext('webgl'); if (g2) { info.webgl = true; info.soft = true; } }   // WebGL présent mais rendu logiciel
    } catch (e) {}
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(info.gpu)) info.soft = true;
  })();
  function detect() {
    var t = 0;   // 0 haute, 1 moyenne, 2 économe, 3 minimale
    if (info.soft) t = Math.max(t, 3);
    if (/mali-4|mali-t[1-6]|adreno \(?[23]\d\d|powervr sgx|intel.*(hd graphics [2-4]\d{3}\b|gma)/i.test(info.gpu)) t = Math.max(t, 2);
    if (info.cores <= 2 || (info.mem && info.mem <= 1) || info.saveData) t = Math.max(t, 2);
    if (info.mobile) t = Math.max(t, 2);   // téléphone : mode économe d'emblée (le suivi de fluidité peut le dégrader, jamais l'inverse)
    if (info.cores <= 4 && info.mem && info.mem <= 4) t = Math.max(t, 1);
    return ORDER[t];
  }

  /* ---------- niveau retenu : réglage manuel > appris > estimé ---------- */
  var detected = ORDER.indexOf(params.get('assume')) >= 0 ? params.get('assume') : detect(), pref = params.get('perf') || get(PREF) || 'auto';
  if (params.get('perf')) set(PREF, pref === 'auto' ? null : pref);
  if (params.get('scene') === 'on') set(KEY, null);
  var learned = null; try { var lj = JSON.parse(get(KEY) || 'null'); if (lj && ORDER.indexOf(lj.tier) >= 0 && Date.now() - lj.t < WEEK) learned = lj.tier === 'off' ? FLOOR : lj.tier; } catch (e) {}   // un ancien « off » appris devient « minimale »
  function worst(a, b) { return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b; }
  var tier = ORDER.indexOf(pref) >= 0 ? pref : (learned ? worst(detected, learned) : detected);

  /* ---------- l'objet partagé ---------- */
  var ramp = performance.now() + 2500;   // démarrage en douceur : définition réduite pendant 2,5 s
  var P = C.perf = {
    info: info, detected: detected, pref: pref,
    get tier() { return tier; },
    get scale() { return TIERS[tier].scale * (performance.now() < ramp ? .7 : 1); },
    get off() { return tier === 'off'; },
    label: function (t) { return (TIERS[t || tier] || TIERS.high).label; },
    TIERS: TIERS, ORDER: ORDER,
    /* garde-fou extérieur (plantage précédent…) : allège jusqu'à t, sauf réglage manuel */
    cap: function (t) { if (ORDER.indexOf(pref) >= 0 || ORDER.indexOf(t) < 0) return; if (ORDER.indexOf(t) > ORDER.indexOf(FLOOR)) t = FLOOR; tier = worst(tier, t); ramp = 0; },
    remember: function (t) { set(KEY, JSON.stringify({ tier: t, t: Date.now(), why: 'plantage' })); },
    /* choix de l'utilisateur : retenu, puis on recharge pour repartir proprement */
    setPref: function (p) { set(PREF, p === 'auto' ? null : p); set(KEY, null); location.reload(); }
  };
  window.CodexPx = function (max) { if (info.mobile) max = Math.min(max || 2, 1.5); return Math.max(.4, Math.min(window.devicePixelRatio || 1, max || 2) * P.scale); };

  /* ---------- 2. ordonnanceur commun + surveillance de la fluidité ---------- */
  var queue = [], pending = false, lastRun = 0, ema = 0, slow = 0, born = performance.now(), notified = false;
  window.CodexRaf = function (fn) { queue.push(fn); if (!pending) { pending = true; requestAnimationFrame(tick); } return 0; };
  function degrade(why) {
    var i = ORDER.indexOf(tier); if (i >= ORDER.indexOf(FLOOR) || ORDER.indexOf(pref) >= 0) return;
    tier = ORDER[i + 1]; ema = 0; slow = 0; ramp = 0;
    set(KEY, JSON.stringify({ tier: tier, t: Date.now(), why: why }));
    C.emit('perf', { tier: tier, scale: P.scale, reason: why });
    toast(tier === FLOOR ? 'Votre appareil a du mal : les animations sont mises au ralenti pour le ménager.' : 'Votre appareil semble peiner : les animations sont allégées.', false);
  }
  function toast(txt, withBtn) {
    var el = document.getElementById('scene-status'); if (!el) return;
    el.hidden = false; el.textContent = txt + ' ';
    if (withBtn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Réessayer en qualité moyenne'; b.style.cssText = 'margin-left:6px;font:inherit;color:inherit;text-decoration:underline;background:none;border:0;cursor:pointer'; b.onclick = function () { P.setPref('medium'); }; el.appendChild(b); }
    else setTimeout(function () { el.hidden = true; }, 7000);
  }
  var scaleSeen = P.scale;
  function tick(t) {
    pending = false;
    if (tier === 'off') { queue.length = 0; return; }
    var cfg = TIERS[tier];
    // lecteur plein écran sur petit écran : la scène est cachée, on ne la fait avancer qu'au ralenti
    var hid = document.documentElement.classList.contains('reading') && window.innerWidth < 900;
    if (hid) { if (lastRun && t - lastRun < 500) { pending = true; requestAnimationFrame(tick); return; } lastRun = t; var qh = queue; queue = []; for (var j = 0; j < qh.length; j++) { try { qh[j](t); } catch (e) { console.error(e); } } if (queue.length && !pending) { pending = true; requestAnimationFrame(tick); } return; }
    if (lastRun && t - lastRun < cfg.gap - 2) { pending = true; requestAnimationFrame(tick); return; }   // cadence plafonnée
    var iv = lastRun ? t - lastRun : 0; lastRun = t;
    var q = queue; queue = []; for (var i = 0; i < q.length; i++) { try { q[i](t); } catch (e) { console.error(e); } }
    // surveillance : ni les 1,5 premières secondes, ni les pauses d'onglet
    if (iv >= 400 && t - born > 1500 && !document.hidden && lastRun) { slow += 1500; if (slow > (tier === 'low' ? 4500 : 2600)) degrade('image > ' + Math.round(iv) + ' ms'); }   // images très lentes : on n'attend pas
    if (iv > 0 && iv < 400 && t - born > 1500 && !document.hidden) {
      ema = ema ? ema + (iv - ema) * .12 : iv;
      var limit = Math.max(cfg.gap * 1.7, 36);
      if (ema > limit) { slow += iv; if (slow > (tier === 'low' ? 4500 : 2600)) degrade('fps ' + Math.round(1000 / ema)); } else slow = Math.max(0, slow - iv * .5);
    }
    if (P.scale !== scaleSeen) { scaleSeen = P.scale; C.emit('perf', { tier: tier, scale: scaleSeen }); }   // fin du démarrage en douceur
    if (queue.length && !pending) { pending = true; requestAnimationFrame(tick); }
  };
  document.addEventListener('visibilitychange', function () { ema = 0; slow = 0; lastRun = 0; });
  if (tier === 'off') document.documentElement.classList.add('noscene');
  // fin du démarrage en douceur : une dernière notification pour que les scènes remontent leur définition
  setTimeout(function () { if (scaleSeen !== P.scale) { scaleSeen = P.scale; C.emit('perf', { tier: tier, scale: scaleSeen }); } }, 2600);
})();
