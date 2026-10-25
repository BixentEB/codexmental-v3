# État de la v3

## Fait
- Interface commune (barre, bouton de thème, lecteur) alimentée par `content/catalog.json`.
- Quatre thèmes branchés : Ciel profond, Héliosphère, Galactique, Champ stellaire.
- Contenus importés de v2 sans modification de texte : Codex (5 pages + 20 articles), Atelier (9), Lab (1), Portrait (7 sections, 40 pages), Contact (formulaire).
- Le Journal (`blog`) reprend les articles du Codex classés par année ; il n'est pas dans la barre (comme en v2) mais s'ouvre depuis la planète « Blog » d'Héliosphère.

## À vérifier à l'œil (non testé dans l'environnement de développement)
- Rendu 3D d'Héliosphère et de Galactique et de Champ stellaire (bibliothèque three.js chargée depuis un CDN : indisponible là où le code a été écrit). Le code des scènes est repris de v2 ; seuls le lecteur et la navigation ont été remplacés.
- Vols de caméra jusqu'à la rubrique, puis ouverture automatique du lecteur.

## Pas encore migré
- **Observatoire (DashB)** : application interactive à part entière (modules, textures ~23 Mo) ; la rubrique affiche pour l'instant une page d'attente.
- **Lab** : une seule fiche (`lab/index.html` de v2).
- Pages complètes de v2 hors catalogue (`arc/`, `mentions/`, `blog/modele.html`, `blog/blog.json`).
- Brouillons : `psy/article2` et `altstates/revelucide` sont listés avec la mention « brouillon » (à décider : publier, masquer).
- Articles de test v2 (`ai/articletest1`, etc.) non importés.

## Décisions à confirmer
- Thème par défaut : Ciel profond (`themes/themes.json › default`).
- Journal : vue chronologique du Codex (ou rubrique éditoriale distincte ?).
