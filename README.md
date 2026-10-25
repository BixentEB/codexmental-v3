# Codex Mental · v3

Un site statique (aucune étape de build) : une **interface commune** (barre, lecteur d'articles, bouton de thème) et des **thèmes** interchangeables qui ne contiennent aucun article.

## Essayer en local
```bash
python3 -m http.server 8000      # puis http://localhost:8000
```
`?theme=heliosphere` force un thème ; `?preview` (si un thème est marqué `enabled:false`) l'affiche quand même.

## Structure
| Dossier | Rôle |
|---|---|
| `index.html` | Page unique : scène du thème + barre commune + lecteur |
| `core/host.js` | Charge le thème choisi, applique sa palette, relie scène ↔ interface (`window.Codex`) |
| `core/shell.js`, `shell.css` | Barre du haut, navigation des rubriques, **bouton de thème** |
| `core/reader.js`, `reader.css` | Lecteur d'articles (sommaire, recherche, taille du texte, mobile) |
| `themes/themes.json` | Registre des thèmes (ordre, thème par défaut, activé ou non) |
| `themes/<id>/` | Un thème : `theme.json` (palette, polices, bibliothèques), `scene.html`, `scene.css`, `scene.js` |
| `content/catalog.json` | Arbre des rubriques → groupes → articles |
| `content/<rubrique>/…html` | Un fragment HTML par article (texte tel quel) |
| `content/search.json` | Texte brut pour la recherche (chargé à la première recherche) |
| `tools/import_from_v2.py` | Importe/rafraîchit les contenus depuis le dépôt v2 |

## Principe
- **Les couleurs de l'interface viennent du thème** : `theme.json › palette` est posé en variables CSS (`--accent`, `--panel`, `--line`…). Changer de thème change la barre, le lecteur et les menus.
- **Changer de thème** recharge la page avec `?theme=<id>` en gardant `#article` : la lecture en cours est conservée. Le choix est mémorisé (`localStorage`, clé `codex.theme`).
- **Une scène ne connaît que `window.Codex`** :
  - écouter `Codex.on('navigate', e => …)` (la barre demande la rubrique `e.id`, `null` = accueil) ;
  - ouvrir le lecteur : `Codex.reader.open('codex')` (ou `Codex.open(id)`) ;
  - réagir à `reader:open` / `reader:close` (décaler le décor, zoomer…) ;
  - signaler `window.CodexScene = { ok: true }` (ou `false` si la scène ne peut pas démarrer : la barre ouvre alors le lecteur directement).

## Ajouter un thème
1. Créer `themes/<id>/` avec `theme.json`, `scene.html`, `scene.css`, `scene.js` (voir `themes/champ-stellaire`, le plus court).
2. Ajouter une entrée dans `themes/themes.json` (`"enabled": false` pour le tester avec `?preview`).
3. Les sélecteurs CSS du thème doivent rester sous `#scene` pour ne pas toucher au lecteur.

## Ajouter ou modifier un article
Mettre le fragment dans `content/<rubrique>/…` et l'ajouter à l'arbre de `content/catalog.json` (`"article": "<id>"`). Un article peut aussi être un `.md` (`"src": "….md"`).

## État
Voir `docs/ETAT-v3.md`.
