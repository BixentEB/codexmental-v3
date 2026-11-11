#!/usr/bin/env python3
"""Pages lisibles pour les moteurs de recherche et les IA.

Usage : python3 tools/build_static.py

À partir de content/catalog.json, ce script génère, sans rien toucher au site immersif :
- articles/<id>/index.html : une page HTML simple par publication (titre, auteur, date,
  texte, lien vers la version immersive), avec métadonnées Schema.org et Open Graph ;
- articles/index.html : le sommaire de toutes ces pages ;
- sitemap.xml ;
- content/search.json : nettoyé des publications exclues (voir plus bas).

Date de publication : "date" (affichée aussi dans le lecteur du site) ou, à défaut, "published"
(utilisée seulement ici ; retrouvée dans l'historique des versions 1 et 2 du site).

Exclus partout : publications masquées ("hidden": true), brouillons ("status": "draft"),
pages en attente ("type": "pending") et formulaire de contact. Pour exclure une publication
sans la masquer sur le site : "index": false dans son entrée du catalogue.

Bibliothèque standard uniquement. Relancé automatiquement par
.github/workflows/pages-lisibles.yml à chaque modification du contenu.
"""
import html, json, os, re, shutil, sys
from datetime import date

SITE = 'https://codexmental.com'
AUTHOR = 'Vincent (Bixent)'
AUTHOR_URL = 'https://bixent.codexmental.com'
SITE_NAME = 'Codex Mental'
CONTACT = SITE + '/#contact/form'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'articles')


def load(p):
    with open(os.path.join(ROOT, p), encoding='utf8') as f:
        return json.load(f)


def excluded(a):
    return (a.get('hidden') or a.get('status') == 'draft' or a.get('index') is False
            or a.get('type') in ('pending', 'contact') or not a.get('src'))


def esc(s):
    return html.escape(s or '', quote=True)


def text_of(frag):
    t = re.sub(r'<(script|style)\b.*?</\1>', ' ', frag, flags=re.S | re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


def clean(frag):
    """Garde le texte tel quel ; retire scripts et styles, rend les chemins absolus."""
    frag = re.sub(r'<(script|style)\b.*?</\1>', '', frag, flags=re.S | re.I)
    frag = re.sub(r'\son[a-z]+="[^"]*"', '', frag, flags=re.I)

    def fix(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|data:|#|/)', url):
            return m.group(0)
        return '%s="/%s"' % (attr, url)
    return re.sub(r'\b(src|href|poster)="([^"]*)"', fix, frag)


MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']


def fr_date(d):
    try:
        y, m, j = (int(x) for x in d.split('-'))
        return '%d %s %d' % (j, MOIS[m - 1], y)
    except Exception:
        return d


def drop_title(frag, title):
    """Le titre est déjà en tête de page : on retire le premier <h1> du fragment s'il le répète."""
    m = re.search(r'<h1\b[^>]*>(.*?)</h1>', frag, flags=re.S | re.I)
    if m and text_of(m.group(1)).lower() == (title or '').strip().lower():
        frag = frag[:m.start()] + frag[m.end():]
    return frag


def walk(nodes, trail, out):
    for n in nodes or []:
        if n.get('article'):
            out.setdefault(n['article'], trail)
        else:
            walk(n.get('children'), trail + [n.get('label', '')], out)


def page_url(aid):
    return '%s/articles/%s/' % (SITE, aid)


BAR = ('<header class="bar"><a class="brand" href="/"><img src="/img/favicon-96x96.png" alt="" width="26" height="26"><span>CODEX MENTAL</span></a>'
       '<a class="enter" href="/">Entrer dans Codex Mental <span aria-hidden="true">→</span></a></header>')
PROMO = ('<a class="promo%s" href="/"><img src="/articles/apercu.webp" alt="Aperçu du site" width="1280" height="720" loading="lazy">'
         '<span class="promo-t"><b>Codex Mental, l’univers complet</b><span>Ce texte vient de Codex Mental : un espace vivant d’idées, d’articles et d’expériences, avec ses thèmes animés, son ciel d’observation et son lecteur immersif.</span>'
         '<span class="enter">Entrer dans Codex Mental <span aria-hidden="true">→</span></span></span></a>')
OG_IMAGE = 'https://codexmental.com/articles/apercu.webp'


FOOT = ('<footer class="foot"><p>© %s — %s. Citation et reprise d\'extraits bienvenues, avec le nom de '
        'l\'auteur et un lien vers la page d\'origine. Pour une reprise plus large, <a href="%s">écrivez-moi</a>.</p>'
        '<p><a href="/articles/">Toutes les publications</a> · <a href="/">Entrer dans Codex Mental</a></p></footer>')


# typographie française pour les pages générées : espace insécable avant : ; ! ? » et après «,
# appliquée au texte seulement (jamais aux balises, scripts, styles, code) ; les sources ne changent pas
_TYPO_SPLIT = re.compile(r'(<script[\s\S]*?</script>|<style[\s\S]*?</style>|<pre[\s\S]*?</pre>|<code[\s\S]*?</code>|<textarea[\s\S]*?</textarea>|<[^>]+>)', re.I)


def typo_html(s):
    out = []
    for i, part in enumerate(_TYPO_SPLIT.split(s)):
        if i % 2 == 0 and part:
            part = re.sub(r'[ \t\n]+([:»])', ' \\1', part)
            part = re.sub(r'[ \t\n]+([;!?])', ' \\1', part)
            part = re.sub(r'«[ \t\n]+', '« ', part)
        out.append(part)
    return ''.join(out)


def shell(title, desc, canonical, body, jsonld, og_type='article', top=False):
    return '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="{author}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{site}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="{ogimg}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/img/favicon-96x96.png">
<link rel="stylesheet" href="/articles/lisible.css">
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
{bar}
<main class="page">
{top}{body}
{promo}
{foot}
</main>
</body>
</html>
'''.format(bar=BAR, promo=PROMO % '', top=(PROMO % ' top') if top else '', ogimg=OG_IMAGE, title=esc(title), desc=esc(desc), author=esc(AUTHOR), canonical=esc(canonical),
           og_type=og_type, site=esc(SITE_NAME), body=body, foot=FOOT % (esc(AUTHOR), esc(SITE_NAME), esc(CONTACT)),
           jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'))


def main():
    cat = load('content/catalog.json')
    arts = cat['articles']
    secs = {s['id']: s for s in cat['sections']}
    trails = {}
    for s in cat['sections']:
        walk(s.get('tree'), [s.get('label', s['id'])], trails)

    keep = [(aid, a) for aid, a in arts.items() if not excluded(a)]
    skipped = sorted(aid for aid, a in arts.items() if excluded(a))

    if os.path.isdir(OUT):
        for name in os.listdir(OUT):
            p = os.path.join(OUT, name)
            if os.path.isdir(p):
                shutil.rmtree(p)
    os.makedirs(OUT, exist_ok=True)

    person = {'@type': 'Person', 'name': AUTHOR, 'url': AUTHOR_URL}
    listing = []
    for aid, a in keep:
        a = dict(a, date=a.get('date') or a.get('published'))
        with open(os.path.join(ROOT, a['src']), encoding='utf8') as f:
            frag = f.read()
        title = a.get('title') or aid
        txt = text_of(frag)
        desc = a.get('desc') or (txt[:220].rsplit(' ', 1)[0] + '…' if len(txt) > 220 else txt)
        url = page_url(aid)
        immersive = '%s/#%s' % (SITE, aid)
        trail = trails.get(aid, [])
        ld = {'@context': 'https://schema.org', '@type': 'Article' if a.get('type') == 'article' else 'WebPage',
              'headline': title, 'name': title, 'description': desc, 'url': url, 'mainEntityOfPage': url,
              'inLanguage': 'fr', 'author': person, 'publisher': {'@type': 'Organization', 'name': SITE_NAME, 'url': SITE},
              'isPartOf': {'@type': 'WebSite', 'name': SITE_NAME, 'url': SITE},
              'copyrightHolder': person, 'usageInfo': SITE + '/articles/#reutilisation'}
        if a.get('date'):
            ld['datePublished'] = a['date']
        if a.get('words'):
            ld['wordCount'] = a['words']
        if a.get('tags'):
            ld['keywords'] = ', '.join(a['tags'])
        meta = [esc(AUTHOR)]
        if a.get('date'):
            d = a['date']
            meta.append('<time datetime="%s">%s</time>' % (esc(d), esc(fr_date(d))))
        body = ('<nav class="crumbs"><a href="/articles/">Codex Mental</a>%s</nav>\n'
                '<header class="head"><h1>%s</h1><p class="meta">%s</p>'
                '<p><a class="go" href="%s">Lire dans l\'univers Codex Mental</a></p></header>\n'
                '<div class="txt">%s</div>\n'
                '<p class="cite">Source : %s, « %s », %s%s — <a href="%s">%s</a></p>') % (
            ''.join(' › ' + esc(t) for t in trail if t), esc(title), ' · '.join(meta), esc(immersive),
            clean(drop_title(frag, title)), esc(AUTHOR), esc(title), esc(SITE_NAME), (', ' + esc(fr_date(a['date']))) if a.get('date') else '',
            esc(url), esc(url))
        dest = os.path.join(OUT, *aid.split('/'))
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, 'index.html'), 'w', encoding='utf8') as f:
            f.write(typo_html(shell(title + ' — ' + SITE_NAME, desc, url, body, ld)))
        listing.append((trail[0] if trail else '', aid, title, a.get('date', ''), desc))

    # sommaire
    groups = {}
    for sec, aid, title, d, desc in listing:
        groups.setdefault(sec, []).append((aid, title, d, desc))
    parts = ['<header class="head"><h1>Codex Mental — toutes les publications</h1>'
             '<p class="meta">Écriture, réflexions et explorations de %s. Version lisible du site '
             '<a href="/">codexmental.com</a>, qui reste la porte d\'entrée immersive.</p></header>' % esc(AUTHOR)]
    for sec in groups:
        parts.append('<h2>%s</h2><ul class="list">' % esc(sec or 'Divers'))
        for aid, title, d, desc in groups[sec]:
            parts.append('<li><a href="/articles/%s/">%s</a>%s<br><span>%s</span></li>' % (
                esc(aid), esc(title), (' <time datetime="%s">%s</time>' % (esc(d), esc(fr_date(d)))) if d else '', esc(desc)))
        parts.append('</ul>')
    parts.append('<h2 id="reutilisation">Réutilisation</h2><p>Les textes et créations de Codex Mental sont l\'œuvre de '
                 '%s, tous droits réservés. Vous pouvez les citer et en reprendre des extraits en indiquant le nom de '
                 'l\'auteur et un lien vers la page d\'origine. Pour une reprise plus large, une traduction ou une '
                 'adaptation, <a href="%s">écrivez-moi</a>.</p>' % (esc(AUTHOR), esc(CONTACT)))
    ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Codex Mental — publications',
          'url': SITE + '/articles/', 'inLanguage': 'fr', 'author': person,
          'hasPart': [{'@type': 'CreativeWork', 'name': t, 'url': page_url(a)} for _, a, t, _, _ in listing]}
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8') as f:
        f.write(typo_html(shell('Toutes les publications — ' + SITE_NAME,
                      'Sommaire des articles, réflexions et explorations de Codex Mental, par ' + AUTHOR + '.',
                      SITE + '/articles/', '\n'.join(parts), ld, og_type='website', top=True)))

    # sitemap
    urls = [SITE + '/', SITE + '/articles/'] + [page_url(aid) for _, aid, _, _, _ in listing]
    dates = {page_url(aid): d for _, aid, _, d, _ in listing if d}
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append('  <url><loc>%s</loc>%s</url>' % (esc(u), ('<lastmod>%s</lastmod>' % dates[u]) if u in dates else ''))
    sm.append('</urlset>')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf8') as f:
        f.write('\n'.join(sm) + '\n')

    # recherche du site : rien d'exclu dedans
    sp = os.path.join(ROOT, 'content', 'search.json')
    if os.path.exists(sp):
        s = load('content/search.json')
        removed = [k for k in list(s) if k in arts and excluded(arts[k]) and arts[k].get('type') != 'contact']
        for k in removed:
            del s[k]
        if removed:
            with open(sp, 'w', encoding='utf8') as f:
                json.dump(s, f, ensure_ascii=False)
        print('search.json : retirés', removed)

    print('%d pages générées, %d exclues : %s' % (len(listing), len(skipped), ', '.join(skipped)))
    print('%d sans date de publication' % sum(1 for _, _, _, d, _ in listing if not d))


if __name__ == '__main__':
    main()
