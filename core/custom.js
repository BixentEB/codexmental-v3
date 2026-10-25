/* ======================================================================
   Bouton de personnalisation commun à tous les thèmes
   (même carte, même place, même geste que dans « Ciel profond »).
   - le thème décrit son titre et son sous-titre dans theme.json :
       "customize": { "title": "…", "sub": "…", "legacy": "#sélecteur" }
   - « legacy » : le thème possède déjà son panneau ; la carte déclenche son
     ancien bouton (masqué) et suit son état ;
   - sinon, la scène demande un panneau vide avec Codex.customize.pop() et le remplit.
   ====================================================================== */
(function () {
  'use strict';
  var Codex = window.Codex, card = null, popEl = null, legacy = null, mo = null;
  var FLASK = '<svg class="cx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4A1.5 1.5 0 0019 19l-5-10V3"/><path d="M7.5 15h9"/></svg>';
  var GEAR = '<span class="cx-gear" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg></span>';

  function setOpen(o) { if (card) card.setAttribute('aria-expanded', String(!!o)); document.documentElement.classList.toggle('cx-custom-open', !!o); }
  function mount(T) {
    if (card && card.parentNode) card.parentNode.removeChild(card); card = null;   // le panneau éventuel, déjà rempli par la scène, est conservé
    var c = T && T.customize; if (!c) return;
    card = document.createElement('button'); card.type = 'button'; card.className = 'cx-lab';
    card.setAttribute('aria-expanded', 'false');
    card.innerHTML = FLASK + '<span class="cx-txt"><span class="cx-t"></span><span class="cx-s"></span></span>' + GEAR;
    card.querySelector('.cx-t').textContent = c.title || 'Personnalisation';
    card.querySelector('.cx-s').textContent = c.sub || 'Réglages';
    document.body.appendChild(card);
    if (c.legacy) {
      legacy = document.querySelector(c.legacy);
      if (legacy) {
        card.addEventListener('click', function () { legacy.click(); });
        var sync = function () { setOpen(legacy.getAttribute('aria-expanded') === 'true'); };
        mo = new MutationObserver(sync); mo.observe(legacy, { attributes: true, attributeFilter: ['aria-expanded'] }); sync();
      }
    } else {
      card.setAttribute('aria-controls', 'cx-pop');
      card.addEventListener('click', function () { var p = pop(); p.hidden = !p.hidden; setOpen(!p.hidden); });
    }
  }
  function pop() {
    if (!popEl) { popEl = document.createElement('div'); popEl.className = 'cx-pop'; popEl.id = 'cx-pop'; popEl.hidden = true; document.body.appendChild(popEl); }
    return popEl;
  }
  function unmount() {
    if (mo) mo.disconnect(); mo = null; legacy = null;
    [card, popEl].forEach(function (e) { if (e && e.parentNode) e.parentNode.removeChild(e); }); card = popEl = null; setOpen(false);
  }
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && popEl && !popEl.hidden) { popEl.hidden = true; setOpen(false); } });
  Codex.customize = { mount: mount, pop: pop, setOpen: setOpen };
})();
