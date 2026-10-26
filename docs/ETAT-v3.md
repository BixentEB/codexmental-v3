# État de la v3

## Fait
- Interface commune (barre, bouton de thème, lecteur, bouton de personnalisation) alimentée par `content/catalog.json`.
- Quatre thèmes : Ciel profond (défaut), Héliosphère, Galactique, Champ stellaire. Le thème choisi est mémorisé sur l'appareil du visiteur.
- Le site est autonome : three.js (`vendor/`), polices (`fonts/`) et images d'articles (`img/articles/`) sont hébergés ici ; plus aucune dépendance à la v1 ni à la v2 (hors images Wikimedia Commons et vidéos YouTube intégrées dans certains articles).
- Contenus : Codex (blog), Atelier, Laboratoire (vitrine : `content/lab/projects.json`), Portrait, Contact, Mentions légales (`codex/legal`).
- Le Journal a été supprimé (il doublait le Codex).

## Pas encore migré
- **Observatoire** : à construire comme application autonome (voir la discussion) ; la rubrique affiche une page d'attente.
- Pages complètes de v2 hors catalogue (`arc/`, `mentions/`, `blog/modele.html`) : non reprises, volontairement.
- Brouillons : `psy/article2` et `altstates/revelucide` sont listés avec la mention « brouillon » (à décider : publier, masquer).

## Décisions à prendre
- Identité de l'éditeur et licence de réutilisation à préciser dans « Mentions légales ».
- Avenir du thème Champ stellaire (voir la proposition).


## Univers ajoutés
- **Voisinage stellaire** (`themes/voisinage`) : carte 3D des étoiles proches ; chaque étoile dorée est une rubrique.
- **Vie d'une étoile** (`themes/vie-etoile`) : six stades et deux destins (Soleil / étoile massive) ; chaque rubrique est un stade.

## Passe « références & thèmes » (octobre 2026)
- Portrait : séparateurs entre fiches (Coups de cœur, Esprits, Mythes, Mondes, Symboles, Livres & idées) ; illustrations Wikimedia résolues à l'ouverture (`figure.wk[data-q]`, cache `codex.wk`, crédit et licence affichés ; la figure disparaît si rien n'est trouvé) ; « Gaming » devient « Jeu », numéros et icônes retirés (numéros conservés uniquement dans Synchronicités), Compétences en tableau.
- Héliosphère : description, titre en haut à gauche, Soleil plus réaliste. Champ stellaire : constellation de Persée (Algol variable). Vie d'une étoile : disque/jets/cavité de la protoétoile et nébuleuse planétaire refaits.

## Thème « Ciel d'ailleurs » (octobre 2026)
Vue depuis la terre ferme : un seul shader WebGL (ciel jour/crépuscule/nuit selon l'heure réelle, étoiles et Voie lactée, aurores, planète à anneaux, lune, planète bleue, nuages, crêtes). Réglages : heure réelle / journée accélérée / heure choisie, intensité des aurores. `?hour=` force l'heure (tests). Menus : planète à anneaux = Codex, lune = Atelier, planète bleue = Laboratoire, étoile = Observatoire, aurore = Portrait. Mémorisation : `codex.ailleurs`.

## Performance adaptative (core/perf.js)
- À l'arrivée : estimation (cœurs, mémoire, mobile, carte graphique, rendu logiciel) → niveau haute / moyenne / économe / sans animation.
- Pendant la visite : un ordonnanceur commun (`CodexRaf`) plafonne la cadence et surveille la fluidité ; si l'appareil peine, la définition baisse (`CodexPx`, événement `perf`), puis la scène s'arrête. Le niveau appris est retenu une semaine (`codex.perf`).
- Démarrage en douceur : définition réduite pendant 2,5 s. Thèmes `heavy` : jamais lancés automatiquement tant qu'ils n'ont pas tenu 8 s sur l'appareil.
- Garde-fou de plantage (`codex.boot`), mode sans scène (`?scene=off` / `?scene=on`), réglage manuel dans le menu des thèmes (« Qualité des animations »), `?perf=high|medium|low|off|auto`.
- Ciel d'ailleurs : `enabled:false` dans themes.json (accessible avec `?preview`) le temps d'isoler le plantage de la carte graphique.

## Idées mises de côté
- **Multilingue** : regrouper les textes d'interface dans `i18n/<langue>.json`, un dossier de contenus par langue (`content/<langue>/…`, catalogue et recherche par langue), sélecteur de langue ; traduction préparée par Claude, relue par l'auteur. À faire après Labo/Observatoire.
- **Ciel d'ailleurs** : rendu fixe, relief/forêt/eau plus réalistes, réactivation via `themes/themes.json` après validation.

### Mobile (ajout)
Téléphone détecté → niveau « économe » d'emblée ; définition plafonnée à 1,5× ; lecteur ouvert sur écran < 900 px → la scène ne tourne plus qu'au ralenti (2 i/s) ; images > 400 ms comptées comme lentes (dégradation plus rapide).
