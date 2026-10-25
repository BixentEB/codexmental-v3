/* ======================================================================
   Lecteur d'articles commun
   Il ne contient aucun article : il lit content/catalog.json (arbre des
   rubriques) et charge chaque article à la demande. Les thèmes n'y touchent
   pas : ils l'ouvrent avec Codex.reader.open('codex') et reçoivent
   'reader:open' / 'reader:close' pour réagir (décor, caméra…).
   ====================================================================== */
(function () {
  'use strict';
  var Codex = window.Codex;
  var $ = function (id) { return document.getElementById(id); };
  var rd = $('reader'), rdMain = $('rd-main'), tList = $('t-list'), tHead = $('t-head'),
      tQ = $('t-q'), crumbsEl = $('rd-crumbs'), prog = $('rd-prog');
  var DB = null, idx = {}, groups = {}, order = {}, searchText = null, searchP = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FS = [15, 16, 17, 18, 19, 20, 21];
  var R = { open: false, sec: null, view: 'hub', gid: null, aid: null, expanded: {}, treeOpen: true,
            focus: false, mview: 'tree', opener: null, q: '', token: 0 };
  var state = { fs: 17 };
  try { var saved = JSON.parse(localStorage.getItem('codex.reader') || '{}'); if (FS.indexOf(saved.fs) >= 0) state.fs = saved.fs; } catch (e) {}
  function persist() { try { localStorage.setItem('codex.reader', JSON.stringify({ fs: state.fs })); } catch (e) {} }

  /* ---------- utilitaires ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function isMobile() { return window.matchMedia('(max-width:760px)').matches; }
  function isTablet() { return window.matchMedia('(max-width:1099px)').matches; }
  function plural(n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); }
  function fmtDate(a) { if (!a.date) return ''; try { return new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return a.date; } }
  function mins(a) { return Math.max(1, Math.round((a.words || 0) / 200)); }
  function emoji(n) { return n.emoji ? '<span class="emoji" aria-hidden="true">' + esc(n.emoji) + '</span>' : ''; }

  /* ---------- catalogue ---------- */
  function prep() {
    DB.sections.forEach(function (sec) {
      order[sec.id] = []; sec.n = 0;
      (function walk(nodes, path, parentId) {
        nodes.forEach(function (n) {
          if (n.article) {
            var a = DB.articles[n.article]; if (!a) return;
            a.id = n.article;
            idx[a.id] = { sec: sec.id, path: path.slice() };
            if (a.type !== 'pending') { order[sec.id].push(a.id); sec.n++; }
          } else {
            n.id = (parentId || sec.id) + '/' + slug(n.label); n.sec = sec.id; n.parent = parentId;
            groups[n.id] = n; walk(n.children || [], path.concat(n), n.id);
          }
        });
      })(sec.tree || [], [], null);
    });
    Object.keys(DB.articles).forEach(function (id) {   // pages liées mais hors arbre
      var a = DB.articles[id]; a.id = id;
      if (a.hidden && a.within && idx[a.within]) idx[id] = idx[a.within];
    });
  }
  function secById(id) { if (!DB) return null; for (var i = 0; i < DB.sections.length; i++) if (DB.sections[i].id === id) return DB.sections[i]; return null; }
  function countOf(g) { var n = 0; (g.children || []).forEach(function (c) { n += c.article ? (DB.articles[c.article] ? 1 : 0) : countOf(c); }); return n; }
  function loadSearch() {
    if (!searchP) searchP = fetch('content/search.json').then(function (r) { return r.json(); }).then(function (j) { searchText = j; }, function () { searchText = {}; });
    return searchP;
  }

  /* ---------- articles : chargement et nettoyage ---------- */
  var cache = {};
  function fetchArticle(a) {
    if (a._html != null) return Promise.resolve(a._html);
    if (!a.src) return Promise.resolve('');
    if (!cache[a.id]) cache[a.id] = fetch(a.src).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) { a._html = /\.md$/.test(a.src) ? mdToHtml(t) : clean(t, a); return a._html; });
    return cache[a.id];
  }
  var DROP = 'script,style,link,meta,canvas,object,embed,form,input,textarea,select,button,header,footer,nav,base,noscript';
  function clean(html, a) {
    var tpl = document.createElement('template'); tpl.innerHTML = html;
    var root = tpl.content;
    root.querySelectorAll(DROP).forEach(function (el) { el.remove(); });
    root.querySelectorAll('iframe').forEach(function (f) {
      var src = f.getAttribute('src') || '';
      if (!/^https:\/\//.test(src)) { f.remove(); return; }
      f.setAttribute('loading', 'lazy'); f.setAttribute('referrerpolicy', 'no-referrer');
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
      f.removeAttribute('style');
    });
    root.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (at) {
        if (/^on/i.test(at.name) || at.name === 'style' || at.name === 'id' || at.name === 'srcdoc') el.removeAttribute(at.name);
      });
      var h = el.getAttribute('href');
      if (h && /^\s*javascript:/i.test(h)) el.removeAttribute('href');
    });
    root.querySelectorAll('a[href^="http"]').forEach(function (l) { l.target = '_blank'; l.rel = 'noopener noreferrer'; });
    root.querySelectorAll('img').forEach(function (i) { i.loading = 'lazy'; i.decoding = 'async'; if (!i.alt) i.alt = ''; });
    // le titre de l'article est déjà affiché par le lecteur : on retire le doublon en tête
    var first = root.querySelector('h1, h2');
    if (first && a && norm(first.textContent).replace(/\W+/g, '') === norm(a.title).replace(/\W+/g, '')) first.remove();
    var box = document.createElement('div'); box.appendChild(root);
    return box.innerHTML;
  }
  function mdToHtml(src) {   // Markdown minimal pour de futurs articles .md
    var L = String(src || '').replace(/\r/g, '').split('\n'), out = [], i = 0, m, buf, it;
    function inl(t) { t = esc(t); return t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); }
    var BLOCK = /^(#{1,3}\s|```|>|[-*]\s|\d+\.\s|---+$)/;
    while (i < L.length) {
      var l = L[i];
      if (/^```/.test(l)) { buf = []; i++; while (i < L.length && !/^```/.test(L[i])) { buf.push(L[i]); i++; } i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue; }
      m = /^(#{1,3})\s+(.*)$/.exec(l); if (m) { out.push('<h' + m[1].length + '>' + inl(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      if (/^---+$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(l)) { buf = []; while (i < L.length && /^>\s?/.test(L[i])) { buf.push(L[i].replace(/^>\s?/, '')); i++; } out.push('<blockquote>' + inl(buf.join(' ')) + '</blockquote>'); continue; }
      if (/^[-*]\s+/.test(l)) { it = []; while (i < L.length && /^[-*]\s+/.test(L[i])) { it.push('<li>' + inl(L[i].replace(/^[-*]\s+/, '')) + '</li>'); i++; } out.push('<ul>' + it.join('') + '</ul>'); continue; }
      if (/^\d+\.\s+/.test(l)) { it = []; while (i < L.length && /^\d+\.\s+/.test(L[i])) { it.push('<li>' + inl(L[i].replace(/^\d+\.\s+/, '')) + '</li>'); i++; } out.push('<ol>' + it.join('') + '</ol>'); continue; }
      if (!l.trim()) { i++; continue; }
      buf = []; while (i < L.length && L[i].trim() && !BLOCK.test(L[i])) { buf.push(L[i]); i++; }
      if (!buf.length) { buf.push(L[i]); i++; }
      out.push('<p>' + inl(buf.join(' ')) + '</p>');
    }
    return out.join('');
  }
  function withToc(html) {   // ajoute des ancres aux titres et construit « Dans cet article »
    var box = document.createElement('div'); box.innerHTML = html;
    var toc = [], used = {};
    box.querySelectorAll('h2').forEach(function (h) {
      var t = h.textContent.trim(); if (t.length < 3) return;
      var id = 'h-' + (slug(t) || 'x'); while (used[id]) id += '-b'; used[id] = 1; h.id = id; toc.push({ id: id, t: t });
    });
    return { html: box.innerHTML, toc: toc };
  }

  /* ---------- ouverture et fermeture ---------- */
  function setHash(id) { try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {} }
  function markNav() { Codex.emit('nav:active', R.open ? R.sec : null); }
  function showPanel() {
    if (R.open) return;
    R.open = true; R.treeOpen = !isTablet();
    rd.inert = false; rd.classList.add('shown');
    document.documentElement.classList.add('reading');
    Codex.emit('reader:open', { section: R.sec });
  }
  function closeReader(opts) {
    if (!R.open) return;
    R.open = false;
    rd.classList.remove('shown'); rd.inert = true;
    document.documentElement.classList.remove('reading');
    setHash('');
    if (!opts || !opts.silent) Codex.emit('reader:close', { section: R.sec });
    markNav();
    if (R.opener && R.opener.focus) { try { R.opener.focus({ preventScroll: true }); } catch (e) {} }
  }
  function openSec(id, from) {
    var sec = secById(id); if (!sec) return false;
    if (from) R.opener = from;
    R.sec = id; tQ.value = ''; R.q = ''; R.expanded = {};
    (sec.tree || []).forEach(function (g) { if (!g.article) R.expanded[g.id] = true; });
    if (sec.layout === 'page' && order[id][0]) { R.view = 'article'; R.aid = order[id][0]; R.gid = null; R.mview = 'main'; }
    else if (sec.layout === 'page' && sec.tree && sec.tree[0] && sec.tree[0].article) { R.view = 'article'; R.aid = sec.tree[0].article; R.gid = null; R.mview = 'main'; }
    else { R.view = 'hub'; R.gid = null; R.aid = null; R.mview = 'tree'; }
    var was = R.open;
    showPanel(); render(); mainTop();
    if (!was) setTimeout(function () { var c = rd.querySelector('[data-act="close"]'); if (c) c.focus({ preventScroll: true }); }, 60);
    return true;
  }
  function goHub() { R.view = 'hub'; R.gid = null; R.aid = null; R.mview = 'tree'; render(); mainTop(); }
  function goGroup(id) {
    var g = groups[id]; if (!g) return;
    R.sec = g.sec; R.view = 'group'; R.gid = id; R.aid = null; R.expanded[id] = true;
    var p = g.parent; while (p) { R.expanded[p] = true; p = groups[p] && groups[p].parent; }
    if (isTablet()) R.treeOpen = false;
    render(); mainTop();
  }
  function goArticle(id) {
    var m = idx[id]; if (!m) return;
    if (!R.open) showPanel();
    R.sec = m.sec; R.view = 'article'; R.aid = id; R.gid = null; R.mview = 'main';
    m.path.forEach(function (g) { R.expanded[g.id] = true; });
    if (isTablet()) R.treeOpen = false;
    render(); mainTop();
    rdMain.focus({ preventScroll: true });
  }
  function mainTop() { rdMain.scrollTop = 0; updateProg(); }
  function route() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h || !DB) return false;
    if (DB.articles[h] && idx[h]) { openSec(idx[h].sec); goArticle(h); return true; }
    if (secById(h)) { openSec(h); return true; }
    return false;
  }

  /* ---------- rendu ---------- */
  var ICO_CH = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  function render() {
    if (!R.open) return;
    var sec = secById(R.sec), solo = !!(sec && sec.layout === 'page');
    rd.classList.toggle('solo', solo);
    rd.classList.toggle('tree-open', R.treeOpen && !solo);
    rd.classList.toggle('focus', R.focus && !isMobile());
    rd.dataset.mv = solo ? 'main' : R.mview;
    rd.querySelector('[data-act="tree"]').setAttribute('aria-expanded', String(R.treeOpen));
    rd.querySelector('[data-act="focus"]').setAttribute('aria-pressed', String(R.focus));
    rd.style.setProperty('--fs', state.fs + 'px');
    renderTop(); renderTreeHead(); renderTreeList(); renderMain(); markNav();
    setHash(R.view === 'article' ? R.aid : R.sec);
  }
  function renderTop() {
    var sec = secById(R.sec); if (!sec) return;
    var parts = [];
    if (sec.layout === 'page') parts.push('<span class="cur">' + esc(sec.label) + '</span>');
    else {
      var chain = [];
      if (R.view === 'article') chain = idx[R.aid].path; else if (R.view === 'group') { var cur = groups[R.gid]; while (cur) { chain.unshift(cur); cur = cur.parent ? groups[cur.parent] : null; } }
      parts.push(R.view === 'hub' ? '<span class="cur">' + esc(sec.label) + '</span>' : '<button type="button" data-act="hub">' + esc(sec.label) + '</button>');
      chain.forEach(function (c, i) {
        var last = R.view === 'group' && i === chain.length - 1;
        parts.push(last ? '<span class="cur">' + esc(c.label) + '</span>' : '<button type="button" data-act="group" data-id="' + esc(c.id) + '">' + esc(c.label) + '</button>');
      });
      if (R.view === 'article') parts.push('<span class="cur">' + esc(DB.articles[R.aid].title) + '</span>');
    }
    crumbsEl.innerHTML = parts.join('<span class="sep">›</span>');
  }
  function renderTreeHead() {
    var sec = secById(R.sec);
    if (!sec) { tHead.innerHTML = ''; return; }
    tHead.innerHTML = '<p class="t-kicker">' + esc(sec.kicker) + '</p><h2 class="t-title">' + esc(sec.label) + '</h2><p class="t-count">' + plural(sec.n, 'article') + '</p>';
  }
  function treeHTML(nodes, depth) {
    var h = '<ul' + (depth ? '' : ' role="tree"') + '>';
    nodes.forEach(function (n) {
      if (n.article) {
        var a = DB.articles[n.article]; if (!a) return;
        var cur = R.view === 'article' && R.aid === a.id;
        h += '<li><button type="button" class="leaf" data-act="art" data-id="' + esc(a.id) + '"' + (cur ? ' aria-current="page"' : '') + '>' +
          '<span class="dt"></span><span class="lt">' + esc(a.title) + '</span>' +
          (a.status === 'draft' ? '<span class="st">brouillon</span>' : (a.words ? '<span class="mn">' + mins(a) + ' min</span>' : '')) + '</button></li>';
      } else {
        var open = !!R.expanded[n.id], on = R.view === 'group' && R.gid === n.id;
        h += '<li class="g"><div class="row"><button type="button" class="chev" data-act="tog" data-id="' + esc(n.id) + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Replier ' : 'Déplier ') + esc(n.label) + '">' + ICO_CH + '</button>' +
          '<button type="button" class="glabel' + (on ? ' on' : '') + '" data-act="group" data-id="' + esc(n.id) + '"><span>' + emoji(n) + esc(n.label) + (n.series ? '<i>série</i>' : '') + '</span><span class="n">' + countOf(n) + '</span></button></div>' +
          (open ? treeHTML(n.children || [], depth + 1) : '') + '</li>';
      }
    });
    return h + '</ul>';
  }
  function searchAll(q) {
    q = norm(q.trim()); if (!q) return null;
    var res = [];
    DB.sections.forEach(function (s) {
      if (s.id === 'blog') return;   // le Journal reprend les articles du Codex
      (order[s.id] || []).forEach(function (id) {
        var a = DB.articles[id], head = norm(a.title + ' ' + (a.desc || '') + ' ' + (a.tags || []).join(' '));
        var t = head.indexOf(q) >= 0, b = !t && searchText && norm(searchText[id]).indexOf(q) >= 0;
        if (t || b) res.push({ id: id, s: t ? 0 : 1 });
      });
    });
    return res.sort(function (x, y) { return x.s - y.s; });
  }
  function renderTreeList() {
    var res = R.q ? searchAll(R.q) : null;
    if (res) {
      if (!res.length) { tList.innerHTML = '<p class="t-empty">Aucun résultat pour « ' + esc(R.q) + ' ».</p>'; return; }
      tList.innerHTML = '<p class="res-h">' + plural(res.length, 'résultat') + '</p><ul>' + res.map(function (r) {
        var a = DB.articles[r.id], m = idx[r.id], path = [secById(m.sec).label].concat(m.path.map(function (g) { return g.label; })).join(' › ');
        return '<li><button type="button" class="leaf" data-act="art" data-id="' + esc(r.id) + '"><span class="dt"></span><span class="lt">' + esc(a.title) + '<span class="sub">' + esc(path) + '</span></span></button></li>';
      }).join('') + '</ul>';
      return;
    }
    var sec = secById(R.sec);
    tList.innerHTML = sec && sec.layout !== 'page' ? treeHTML(sec.tree || [], 0) : '';
  }
  function arow(a) {
    var chip = a.status === 'draft' ? '<span class="chip draft">Brouillon</span>' : '';
    return '<button type="button" class="arow noNo" data-act="art" data-id="' + esc(a.id) + '"><span class="ar-t">' + esc(a.title) + '</span>' +
      (a.desc ? '<span class="ar-d">' + esc(a.desc) + '</span>' : '') +
      '<span class="ar-m">' + chip + ' ' + esc(fmtDate(a)) + (a.words ? (a.date ? ' · ' : '') + mins(a) + ' min' : '') + '</span></button>';
  }
  function introHTML(g) { return (g.intro || []).length ? '<div class="intro-more">' + g.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : ''; }
  function listHTML(g) {
    var h = '', direct = (g.children || []).filter(function (n) { return n.article && DB.articles[n.article]; });
    if (direct.length) h += '<ul class="alist">' + direct.map(function (n) { return '<li>' + arow(DB.articles[n.article]) + '</li>'; }).join('') + '</ul>';
    (g.children || []).forEach(function (n) {
      if (n.article) return;
      h += '<h2 class="sub"><button type="button" data-act="group" data-id="' + esc(n.id) + '">' + emoji(n) + esc(n.label) + '</button><span class="n">' + countOf(n) + '</span></h2>' + listHTML(n);
    });
    return h;
  }
  function renderMain() {
    var sec = secById(R.sec), h = '';
    if (R.view === 'hub') {
      var tops = (sec.tree || []).filter(function (n) { return !n.article; });
      var lone = (sec.tree || []).filter(function (n) { return n.article; });
      h += '<div class="pane"><p class="kicker">' + esc(sec.kicker) + '</p><h1 class="h-sec">' + esc(sec.label) + '</h1><p class="intro">' + esc(sec.intro) + '</p>';
      if (lone.length) h += '<ul class="alist">' + lone.map(function (n) { return '<li>' + arow(DB.articles[n.article]) + '</li>'; }).join('') + '</ul>';
      if (tops.length) h += '<h2 class="sub">Parcourir</h2><div class="cards">' + tops.map(function (g) {
        var firsts = []; (function pick(n) { (n.children || []).forEach(function (c) { if (firsts.length < 3) { if (c.article) { if (DB.articles[c.article]) firsts.push(DB.articles[c.article].title); } else pick(c); } }); })(g);
        return '<button type="button" class="gcard" data-act="group" data-id="' + esc(g.id) + '"><span class="gc-n">' + plural(countOf(g), 'article') + '</span><span class="gc-t">' + emoji(g) + esc(g.label) + '</span>' +
          (g.desc ? '<span class="gc-d">' + esc(g.desc) + '</span>' : '') + '<span class="gc-l">' + esc(firsts.join(' · ')) + '</span></button>';
      }).join('') + '</div>';
      var latest = (order[sec.id] || []).map(function (id) { return DB.articles[id]; }).filter(function (a) { return a.date; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 4);
      if (latest.length) h += '<h2 class="sub">Derniers ajouts</h2><ul class="alist">' + latest.map(function (a) { return '<li>' + arow(a) + '</li>'; }).join('') + '</ul>';
      h += '</div>';
      rdMain.innerHTML = h; updateProg(); return;
    }
    if (R.view === 'group') {
      var g = groups[R.gid];
      h += '<div class="pane"><p class="kicker">' + esc(sec.label) + ' · ' + plural(countOf(g), 'article') + (g.series ? ' · série' : '') + '</p><h1 class="h-sec">' + emoji(g) + esc(g.label) + '</h1>' +
        (introHTML(g) || '<div style="height:18px"></div>') + listHTML(g) + '</div>';
      rdMain.innerHTML = h; updateProg(); return;
    }
    renderArticle(sec);
  }
  function renderArticle(sec) {
    var a = DB.articles[R.aid], m = idx[R.aid], token = ++R.token;
    var pth = m.path.length ? m.path[m.path.length - 1].label : sec.label;
    var head = '<p class="a-meta"><b>' + esc(pth) + '</b>' + (a.status === 'draft' ? '<span class="chip draft">Brouillon</span>' : '') + (fmtDate(a) ? '<span>' + esc(fmtDate(a)) + '</span>' : '') + (a.words ? '<span>' + mins(a) + ' min de lecture</span>' : '') + '</p>';
    var title = '<h1 class="a-title">' + esc(a.title) + '</h1>' + (a.desc && a.type !== 'pending' ? '<p class="a-lead">' + esc(a.desc) + '</p>' : '');
    var solo = sec.layout === 'page';
    if (a.type === 'pending') { rdMain.innerHTML = '<article class="pane">' + title.replace(/<p class="a-lead">.*?<\/p>/, '') + '<div class="msgbox">' + esc(a.desc || '') + '</div></article>'; updateProg(); return; }
    if (a.type === 'contact') { rdMain.innerHTML = '<article class="pane">' + title + contactForm(a) + '</article>'; bindContact(a); updateProg(); return; }
    rdMain.innerHTML = '<article class="pane">' + (solo ? '' : head) + title + '<p class="t-empty">Chargement…</p></article>';
    fetchArticle(a).then(function (html) {
      if (token !== R.token || R.view !== 'article' || R.aid !== a.id) return;
      var body = withToc(html), h = '<article class="pane">' + (solo ? '' : head) + title;
      if (body.toc.length >= 3) h += '<nav class="toc" aria-label="Dans cet article"><span class="lbl">Dans cet article</span><ol>' + body.toc.map(function (t) { return '<li><button type="button" data-act="anchor" data-id="' + esc(t.id) + '">' + esc(t.t) + '</button></li>'; }).join('') + '</ol></nav>';
      h += '<div class="prose">' + body.html + '</div>';
      if ((a.tags || []).length) h += '<div class="a-tags">' + a.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>';
      var ord = order[sec.id] || [], p = ord.indexOf(a.id);
      if (!solo && p >= 0 && ord.length > 1) {
        h += '<nav class="a-nav" aria-label="Articles voisins">';
        if (p > 0) h += '<button type="button" class="pv" data-act="art" data-id="' + esc(ord[p - 1]) + '"><span class="l">← Précédent</span><span class="t">' + esc(DB.articles[ord[p - 1]].title) + '</span></button>';
        if (p < ord.length - 1) h += '<button type="button" class="nx" data-act="art" data-id="' + esc(ord[p + 1]) + '"><span class="l">Suivant →</span><span class="t">' + esc(DB.articles[ord[p + 1]].title) + '</span></button>';
        h += '</nav>';
      }
      rdMain.innerHTML = h + '</article>'; updateProg();
    }, function () {
      if (token !== R.token) return;
      rdMain.innerHTML = '<article class="pane">' + title + '<div class="msgbox">Cet article n\'a pas pu être chargé. Réessayez dans un instant.</div></article>';
    });
  }
  function contactForm(a) {
    return '<form class="cform" id="cform" action="' + esc(a.action) + '" method="POST"><label>Votre nom<input name="name" autocomplete="name" required maxlength="120"></label>' +
      '<label>Votre adresse e-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label>' +
      '<label>Votre message<textarea name="message" required maxlength="10000"></textarea></label>' +
      '<button type="submit">Envoyer le message</button><p class="st" role="status" aria-live="polite"></p><p class="cnote">' + esc(a.note || '') + '</p></form>';
  }
  function bindContact() {
    var f = $('cform'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = f.querySelector('button'), st = f.querySelector('.st');
      b.disabled = true; st.textContent = 'Envoi en cours…'; st.removeAttribute('data-error');
      fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } }).then(function (r) {
        if (!r.ok) throw new Error('x'); st.textContent = 'Merci ! Votre message a bien été envoyé.'; f.reset();
      }).catch(function () { st.textContent = "L'envoi n'a pas abouti. Vous pouvez réessayer dans quelques instants."; st.setAttribute('data-error', ''); })
        .then(function () { b.disabled = false; });
    });
  }

  /* ---------- interactions ---------- */
  function updateProg() {
    var max = rdMain.scrollHeight - rdMain.clientHeight;
    prog.style.width = (R.view === 'article' && max > 8 ? Math.min(100, rdMain.scrollTop / max * 100) : 0).toFixed(1) + '%';
  }
  rdMain.addEventListener('scroll', updateProg, { passive: true });
  rd.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-art]');
    if (link && rd.contains(link)) { e.preventDefault(); if (DB.articles[link.dataset.art]) goArticle(link.dataset.art); return; }
    var el = e.target.closest('[data-act]'); if (!el || !rd.contains(el)) return;
    var act = el.dataset.act, id = el.dataset.id;
    if (act === 'close') closeReader();
    else if (act === 'hub') goHub();
    else if (act === 'group') { if (isMobile() && el.closest('.tree')) { R.expanded[id] = !R.expanded[id]; renderTreeList(); } else goGroup(id); }
    else if (act === 'tog') { R.expanded[id] = !R.expanded[id]; renderTreeList(); }
    else if (act === 'art') goArticle(id);
    else if (act === 'back') { R.mview = 'tree'; render(); }
    else if (act === 'tree') { R.treeOpen = !R.treeOpen; render(); }
    else if (act === 'focus') { R.focus = !R.focus; render(); }
    else if (act === 'fs+' || act === 'fs-') {
      var i = FS.indexOf(state.fs); if (i < 0) i = 2;
      i = Math.max(0, Math.min(FS.length - 1, i + (act === 'fs+' ? 1 : -1)));
      state.fs = FS[i]; persist(); rd.style.setProperty('--fs', state.fs + 'px'); updateProg();
    }
    else if (act === 'anchor') { var t = rdMain.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id)); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });
  tQ.addEventListener('input', function () { R.q = tQ.value; loadSearch().then(renderTreeList); renderTreeList(); });
  tQ.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var res = R.q && DB ? searchAll(R.q) : null; if (res && res.length) goArticle(res[0].id); }
    if (e.key === 'Escape' && tQ.value) { tQ.value = ''; R.q = ''; renderTreeList(); e.stopPropagation(); }
  });
  window.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea';
    if (e.key === 'Escape' && R.open) { closeReader(); return; }
    if (!R.open || typing) return;
    if (e.key === '/') { e.preventDefault(); if (isTablet() && !isMobile()) { R.treeOpen = true; render(); } tQ.focus(); }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && R.view === 'article') {
      var ord = order[R.sec] || [], p = ord.indexOf(R.aid), nx = ord[p + (e.key === 'ArrowRight' ? 1 : -1)];
      if (nx) goArticle(nx);
    }
  });
  window.addEventListener('hashchange', function () { var h = decodeURIComponent((location.hash || '').slice(1)); if (!h) { closeReader({ silent: true }); return; } if (!(R.open && (R.aid === h || R.sec === h))) route(); });
  var lastMobile = isMobile();
  window.addEventListener('resize', function () {
    var mob = isMobile();
    if (R.open && mob !== lastMobile) { R.treeOpen = !isTablet(); render(); }
    lastMobile = mob;
  });

  /* ---------- API publique ---------- */
  Codex.reader = {
    get isOpen() { return R.open; },
    get section() { return R.sec; },
    open: function (id, from) { return DB ? openSec(id, from) : false; },
    openArticle: function (id) { if (DB && idx[id]) { openSec(idx[id].sec); goArticle(id); return true; } return false; },
    close: function (opts) { closeReader(opts); },
    route: route,
    has: function (id) { return !!secById(id); }
  };
  Codex.catalogReady = fetch('content/catalog.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (j) { DB = j; prep(); Codex.catalog = j; Codex.emit('catalog', j); return j; })
    .catch(function (err) { console.error('Catalogue indisponible', err); Codex.emit('catalog:error', err); return null; });
})();
