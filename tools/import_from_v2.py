#!/usr/bin/env python3
"""Importe les contenus de codexmental-v2 vers content/ + catalog.json.

Usage : python3 tools/import_from_v2.py /chemin/vers/codexmental-v2

- Les textes ne sont jamais réécrits : seuls les conteneurs de page sont retirés.
- Chaque article devient un fragment HTML dans content/<rubrique>/...
- content/catalog.json décrit l'arbre (rubriques > groupes > articles).
- content/search.json contient le texte brut, chargé seulement à la première recherche.
ATTENTION — ne plus relancer : depuis la mise en ligne de v3, content/ et catalog.json ont
été retouchés à la main (rubriques renommées, Atelier, visuels animés, émojis…). Relancer le
script écraserait ces modifications. Il reste là pour mémoire.
"""
import json, os, re, shutil, sys, unicodedata
from bs4 import BeautifulSoup

V2 = sys.argv[1] if len(sys.argv) > 1 else '../codexmental-v2'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'content')
EMOJI = re.compile(r'^[\U0001F000-\U0001FAFF☀-➿⭐️‍⌀-⏿\s]+')

def norm(s):
    s = unicodedata.normalize('NFD', EMOJI.sub('', s or '')).lower()
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn')).strip()

def split_emoji(label):
    m = EMOJI.match(label or '')
    emoji = m.group(0).strip() if m else ''
    return emoji, EMOJI.sub('', label or '').strip()

def read(p):
    with open(os.path.join(V2, p), encoding='utf8') as f:
        return f.read()

ASSETS = set()
HIDDEN = {}        # id -> (chemin v2, article parent) : pages liées mais absentes de l'arbre
MISSING = []

def resolve(u, base):
    """Les fragments v2 mêlent chemins relatifs à la page et à la racine : on essaie les deux."""
    u = u.split('#')[0].split('?')[0]
    cands, d = [os.path.normpath(u)], base
    while True:
        cands.append(os.path.normpath(os.path.join(d, u)))
        if not d: break
        d = os.path.dirname(d)
    for c in cands:
        if not c.startswith('..') and os.path.isfile(os.path.join(V2, c)):
            return c
    return None

def fix_refs(root, base, art_id):
    for tag in root.find_all(True):
        for attr in ('src', 'href', 'poster'):
            u = tag.get(attr)
            if not u or re.match(r'^(https?:|data:|mailto:|tel:|//|#|javascript:)', u):
                continue
            p = resolve(u, base)
            if not p:
                MISSING.append((art_id, u)); continue
            if p.endswith('.html') and p.startswith('blog/articles/'):
                tid = p[len('blog/articles/'):-5]
                tag[attr] = '#'
                tag['data-art'] = tid
                HIDDEN.setdefault(tid, (p, art_id))
            elif p.endswith('.html'):
                MISSING.append((art_id, u))
            else:
                ASSETS.add(p)
                tag[attr] = 'content/assets/' + p
        if tag.get('srcset'): del tag['srcset']

TEXTS = {}
def save(art_id, src_rel, section, html, base_dir):
    """Écrit un fragment ; renvoie (chemin relatif au site, nb de mots, base)."""
    soup = BeautifulSoup(html, 'lxml')
    root = soup.body or soup
    for t in root.find_all(['script', 'style', 'link', 'header', 'footer', 'nav']):
        t.decompose()
    fix_refs(root, base_dir, art_id)
    inner = root.decode_contents().strip()
    dest = os.path.join('content', section, art_id.split(':', 1)[-1] + '.html')
    os.makedirs(os.path.dirname(os.path.join(ROOT, dest)), exist_ok=True)
    with open(os.path.join(ROOT, dest), 'w', encoding='utf8') as f:
        f.write(inner + '\n')
    text = re.sub(r'\s+', ' ', BeautifulSoup(inner, 'lxml').get_text(' ')).strip()
    TEXTS[art_id] = text
    return dest.replace(os.sep, '/'), len(text.split()), base_dir

articles = {}
def add(art_id, title, dest_words, **kw):
    dest, words, base = dest_words
    a = {'title': title, 'src': dest, 'base': base, 'words': words}
    a.update({k: v for k, v in kw.items() if v not in (None, '', [])})
    articles[art_id] = a

# ---------------------------------------------------------------- CODEX
cat = json.loads(read('assets/data/codex-articles.json'))
intro_by_key = {norm(k): v for k, v in cat['introductions'].items()}

def codex_article(a, section='codex'):
    html = read(a['path'])
    base = os.path.dirname(a['path'])
    art_id = a['id']
    add(art_id, a['title'], save(art_id, a['path'], section, html, base),
        date=a.get('date'), tags=a.get('tags'), status=a.get('status'), type='article')
    return {'article': art_id}

groups_by_id = {g['id']: g for g in cat['groups']}

def group_node(g, label=None, key=None, desc_key=None):
    emoji, title = split_emoji(g['title'])
    children, series_nodes = [], {}
    for a in g['articles']:
        node = codex_article(a)
        s = a.get('series')
        if s:
            if s not in series_nodes:
                series_nodes[s] = {'label': title if False else None, 'series': True, 'children': []}
                children.append(series_nodes[s])
            series_nodes[s]['children'].append(node)
            if a.get('seriesRole') == 'intro':
                series_nodes[s]['label'] = a['title']
        else:
            children.append(node)
    node = {'label': label or title, 'emoji': emoji, 'children': children}
    intro = intro_by_key.get(norm(key or label or title))
    if intro:
        node['intro'] = intro
        node['desc'] = intro[0]
    return node

# Pages éditoriales de codex.html (onglets Codex, Nexus, Odyssée, Grimoire, Reliques)
cs = BeautifulSoup(read('codex.html'), 'lxml')
pages_children = []
for tab in cs.select('.tabs .tab'):
    pid, label = tab['data-tab'], tab.get_text(strip=True)
    box = cs.find(id=pid)
    for d in box.find_all(attrs={'class': 'cm-collapse'}):
        pass
    art_id = 'codex/' + pid
    add(art_id, label, save(art_id, 'codex.html', 'codex', box.decode_contents(), ''),
        type='page')
    pages_children.append({'article': art_id})

ia = groups_by_id['intelligence-artificielle']
ia_main = {**ia, 'articles': [a for a in ia['articles']]}
tree = [{'label': 'Le Codex', 'children': pages_children,
         'desc': 'Présentation, Nexus, Odyssée, Grimoire et Reliques.'}]
ia_node = group_node(ia_main, label='Articles & réflexions', key='IA — Articles & réflexions')
ex_node = group_node(groups_by_id['expression-libre-mr-chatgpt'], label="Expressions d'intelligences", key="IA — Expressions d'intelligences")
ia_cat = {'label': 'Intelligence artificielle', 'emoji': split_emoji(ia['title'])[0], 'children': [ia_node, ex_node]}
ia_cat['intro'] = intro_by_key.get(norm('Intelligence artificielle')); ia_cat['desc'] = (ia_cat['intro'] or [''])[0]
tree.append(ia_cat)
psy = group_node(groups_by_id['psychologie'], key='Psychologie')
hp = group_node(groups_by_id['haut-potentiel'], label='Haut potentiel', key='Haut Potentiel')
tree.append({'label': 'Psychologie', 'emoji': psy['emoji'], 'children': [psy, hp],
             'desc': psy.get('desc'), 'intro': psy.get('intro')})
for gid, key, short in (('philosophie', 'Philosophie', None),
                        ('etats-modifies-de-conscience', 'États modifiés de conscience', None),
                        ('symbolique-esoterisme', 'Symbolique & ésotérisme', None),
                        ('introspection', 'Introspection', None)):
    tree.append(group_node(groups_by_id[gid], key=key))
for t in tree:
    for k in [k for k, v in t.items() if v in (None, '')]:
        del t[k]

codex_ids = [i for i in articles if not i.startswith('codex/')]
sections = [{
    'id': 'codex', 'label': 'Codex', 'kicker': 'Base de connaissances',
    'intro': "La base de connaissances : notes, concepts et fiches reliés entre eux.",
    'tree': tree}]

# ---------------------------------------------------------------- JOURNAL (vue chronologique du Codex)
by_year = {}
for i in codex_ids:
    d = articles[i].get('date') or ''
    by_year.setdefault(d[:4] or 'Sans date', []).append(i)
btree = []
for y in sorted(by_year, key=lambda y: (y == 'Sans date', y), reverse=False):
    kids = []
    for i in sorted(by_year[y], key=lambda i: articles[i].get('date') or '', reverse=True):
        bid = 'journal/' + i
        articles[bid] = {**articles[i]}
        kids.append({'article': bid})
        TEXTS[bid] = TEXTS[i]
    btree.append({'label': y, 'children': kids})
sections.append({'id': 'blog', 'label': 'Journal', 'nav': False, 'kicker': 'Articles et réflexions',
                 'intro': 'Les mêmes articles que le Codex, classés par date de publication.',
                 'tree': btree})

# ---------------------------------------------------------------- ATELIER
asoup = BeautifulSoup(read('atelier/atelier.html'), 'lxml')
atree = []
for det in asoup.select('#viewer-menu details'):
    emoji, label = split_emoji(det.summary.get_text(strip=True))
    kids = []
    for li in det.select('li a[data-viewer]'):
        path = li['data-viewer']
        e2, t2 = split_emoji(li.get_text(strip=True))
        src = 'atelier/' + path + '.html'
        art_id = 'atelier/' + path
        add(art_id, t2, save(art_id, src, 'atelier', read(src), os.path.dirname(src)), type='page')
        kids.append({'article': art_id})
    atree.append({'label': label, 'emoji': emoji, 'children': kids})
sections.append({'id': 'atelier', 'label': 'Atelier', 'kicker': 'Projets et idées',
                 'intro': 'Projets en cours, expériences et prototypes en construction.', 'tree': atree})

# ---------------------------------------------------------------- LAB
lab = BeautifulSoup(read('lab/index.html'), 'lxml').find('main')
for t in lab.select('.title-chip'): t.decompose()
art_id = 'lab/index'
add(art_id, 'Lab', save(art_id, 'lab/index.html', 'lab', lab.decode_contents(), 'lab'), type='page')
sections.append({'id': 'lab', 'label': 'Laboratoire', 'kicker': 'Applications',
                 'intro': 'Applications, outils et expérimentations.', 'layout': 'page',
                 'tree': [{'article': art_id}]})

# ---------------------------------------------------------------- OBSERVATOIRE (DashB)
sections.append({'id': 'dashb', 'label': 'Observatoire', 'kicker': 'Tableau de bord',
                 'intro': "Un espace d'exploration astronomique : cartes célestes, observations, visualisations.",
                 'layout': 'page', 'tree': [{'article': 'dashb/index'}]})
articles['dashb/index'] = {'title': 'Observatoire', 'type': 'pending',
    'desc': "L'observatoire est une application interactive à part entière ; son portage dans v3 est prévu après les rubriques de lecture."}

# ---------------------------------------------------------------- PORTRAIT
psoup = BeautifulSoup(read('profil/index.html'), 'lxml')
ptree = []
for btn in psoup.select('.menu-icons-svg button[data-path]'):
    sid, title = btn['data-path'], btn.get('title', btn['data-path'])
    folder = f'profil/sections/{sid}'
    kids = []
    sm = os.path.join(V2, folder, 'sousmenu.html')
    entries = [('index', 'Introduction')]
    if os.path.isfile(sm):
        ss = BeautifulSoup(open(sm, encoding='utf8').read(), 'lxml')
        for b in ss.select('button[data-subsection]'):
            if b['data-subsection'] != 'index':
                entries.append((b['data-subsection'], b.get_text(strip=True)))
    for page, label in entries:
        src = f'{folder}/{page}.html'
        if not os.path.isfile(os.path.join(V2, src)):
            continue
        art_id = f'profil/{sid}/{page}'
        add(art_id, label, save(art_id, src, 'profil', read(src), folder), type='page')
        kids.append({'article': art_id})
    ptree.append({'label': title, 'children': kids})
sections.append({'id': 'profil', 'label': 'Portrait', 'kicker': "L'auteur",
                 'intro': "Parcours, passions, influences et fragments de pensée.", 'tree': ptree})

# ---------------------------------------------------------------- CONTACT
sections.append({'id': 'contact', 'label': 'Contact', 'kicker': 'Écrire', 'hidden': True,
                 'intro': '', 'layout': 'page', 'tree': [{'article': 'contact/form'}]})
cs2 = BeautifulSoup(read('contact.html'), 'lxml')
form = cs2.find('form')
articles['contact/form'] = {
    'title': 'Contact', 'type': 'contact',
    'desc': cs2.select_one('p.intro').get_text(strip=True) if cs2.select_one('p.intro') else '',
    'action': form['action'], 'note': (cs2.select_one('p.note') or cs2.new_tag('p')).get_text(strip=True)}

# ---------------------------------------------------------------- Pages liées mais hors arbre
done = set()
while True:
    todo = [t for t in HIDDEN if t not in articles and t not in done]
    if not todo: break
    for tid in todo:
        done.add(tid)
        path, parent = HIDDEN[tid]
        add(tid, tid.split('/')[-1], save(tid, path, 'codex', read(path), os.path.dirname(path)),
            type='article', hidden=True, within=parent)
        with open(os.path.join(ROOT, articles[tid]['src']), encoding='utf8') as fh:
            h = BeautifulSoup(fh.read(), 'lxml')
        t = h.find(['h1', 'h2'])
        if t: articles[tid]['title'] = t.get_text(' ', strip=True)

# ---------------------------------------------------------------- Actifs référencés par les fragments
n_assets = 0
for p in sorted(ASSETS):
    dst = os.path.join(ROOT, 'content', 'assets', p)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(os.path.join(V2, p), dst); n_assets += 1

with open(os.path.join(OUT, 'catalog.json'), 'w', encoding='utf8') as f:
    json.dump({'version': 1, 'sections': sections, 'articles': articles}, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'search.json'), 'w', encoding='utf8') as f:
    json.dump(TEXTS, f, ensure_ascii=False)
if MISSING: print('références introuvables :', MISSING)
print('articles', len(articles), '| actifs copiés', n_assets, '| sections', [s['id'] for s in sections])
