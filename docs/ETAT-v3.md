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
