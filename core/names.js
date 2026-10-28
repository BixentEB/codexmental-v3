/* ======================================================================
   CODEX MENTAL v3 — noms des rubriques dans les scènes
   Chaque thème étiquette ses rubriques dans la notation de son univers
   (☿, α Per, G2 V, J0047+41…). Une étiquette s'écrit :
     <span class="cx-nm"><span class="cx-sci">G2 V</span><span class="cx-plain">Portrait</span></span>
   Trois modes, réglables (carte de réglages du thème + menu des thèmes), retenus pour tout le site :
     - alt   : les noms scientifiques se changent de temps en temps, chacun à son rythme, en nom courant (défaut) ;
     - sci   : toujours le nom scientifique ;
     - plain : toujours le nom courant.
   Le survol (ou la rubrique choisie) montre l'autre nom : chaque thème le déclare dans son CSS.
   ====================================================================== */
(function () {
  'use strict';
  var C = window.Codex; if (!C) return;
  var KEY = 'codex.names', MODES = [['alt', 'Alternés'], ['sci', 'Scientifiques'], ['plain', 'Courants']];
  var mode = 'alt';
  try { var m = localStorage.getItem(KEY); if (m === 'alt' || m === 'sci' || m === 'plain') mode = m; } catch (e) {}
  var groups = [];
  function apply() {
    var r = document.documentElement;
    MODES.forEach(function (x) { r.classList.toggle('cxn-' + x[0], x[0] === mode); });
    if (mode !== 'alt') Array.prototype.forEach.call(document.querySelectorAll('.cx-nm.swap'), function (e) { e.classList.remove('swap'); e._n = 0; });
    groups.forEach(function (g) { Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) { b.setAttribute('aria-checked', String(b.dataset.v === mode)); }); });
    C.emit('names', mode);
  }
  function set(m) { if (m === mode) return; mode = m; try { localStorage.setItem(KEY, m); } catch (e) {} apply(); }

  /* alternance : chaque étiquette a son propre rythme (long en scientifique, plus court en nom courant) */
  setInterval(function () {
    if (mode !== 'alt' || document.hidden || document.documentElement.classList.contains('reading')) return;
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll('.cx-nm'), function (el) {
      if (!el._n) { el._n = now + 3000 + Math.random() * 9000; return; }
      if (now < el._n) return;
      var on = el.classList.toggle('swap');
      el._n = now + (on ? 4500 + Math.random() * 2500 : 9000 + Math.random() * 8000);
    });
  }, 500);

  /* réglage dans la carte de personnalisation du thème */
  function control() {
    var d = document.createElement('div'); d.className = 'cx-names';
    d.innerHTML = '<span class="cx-l">Noms des rubriques</span><div class="cx-sw" role="radiogroup" aria-label="Noms des rubriques"></div>';
    var sw = d.querySelector('.cx-sw');
    MODES.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = x[0]; b.textContent = x[1];
      b.setAttribute('aria-checked', String(x[0] === mode)); b.addEventListener('click', function () { set(x[0]); });
      sw.appendChild(b);
    });
    groups.push(sw); return d;
  }
  C.names = { get mode() { return mode; }, set: set, MODES: MODES, control: control };
  // thèmes qui ont leur propre panneau de réglages : on y ajoute le choix au même endroit que leurs autres réglages
  var OWN = { 'ciel-profond': 'div.pop#pop', galactique: '#panel .body', heliosphere: '#solar-settings-panel' };
  C.on('ready', function (T) {
    if (!C.sceneOk || !T) return;
    var own = OWN[T.id] && document.querySelector('#scene ' + OWN[T.id]);
    if (own) own.appendChild(control());
    else if (T.customize && !T.customize.legacy && C.customize && C.customize.pop) C.customize.pop().appendChild(control());
  });
  apply();
})();
