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
