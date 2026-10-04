# contours.nc — contenus pour les réseaux sociaux

Dépôt privé des visuels et sources de diffusion de [contours.nc](https://contours.nc) : carrousels, slides TikTok, visuels de partage et leurs sources HTML. Ces fichiers ne font pas partie du site ; le dépôt du site (`jbrouillon/contours-nc`) les ignore (`/social/`, `/posts/*/social/`, `/posts/*/tiktok/`).

## Organisation

```text
campagnes/                       Campagnes propres au carnet
├── appel-contributions-facebook/  carrousels 4:5 et 1:1, visuel 1200 × 630, source HTML, textes
├── lancement-tiktok/              slides de lancement, animation de fin, sources HTML
└── presentation-contours-nc/      carrousels 4:5 et 1:1
articles/                        Déclinaisons d'un article publié
└── regroupement-bureaux-vote-noumea/
    ├── carrousel/                 diapositives « En bref » au format carrousel
    └── tiktok/                    diapositives « En bref » au format vertical, animation de fin
export/
└── export-en-bref.js            script de capture des diapositives « En bref »
images/
└── contours-hexagon.svg         logo utilisé par les sources HTML
```

Pour un nouvel article, créer `articles/<slug-de-l-article>/` avec le même slug que sur le site.

## Sources HTML

Les fichiers `source.html` produisent les visuels : les ouvrir dans un navigateur, à la taille du format visé (1080 × 1350, 1080 × 1080, 1200 × 630…), puis capturer. Ils ne dépendent que de `images/contours-hexagon.svg` et des polices Google (`Cabin Sketch`, `Atkinson Hyperlegible`).

## Capturer les diapositives « En bref » d'un article

1. Ouvrir l'article publié avec `?lecture=en-bref&slide=1`.
2. Coller `export/export-en-bref.js` dans la console du navigateur, avec `MODE = "social"` (carrousel) ou `"tiktok"` (fenêtre en largeur mobile, 720 px ou moins).
3. Capturer chaque diapositive, en avançant avec les flèches du clavier.

Le script masque la navigation et ajuste la mise en page pour la capture, sans modifier le site. Il cible aujourd'hui les diapositives de l'article sur le regroupement des bureaux de vote (`.vote-brief-*`) ; il faudra l'étendre au composant commun `.contours-brief-*` pour les nouveaux articles.

## Règles

- Ne publier que des chiffres, cartes et citations présents dans l'article d'origine, avec sa source.
- Garder l'identité visuelle du site : papier clair, encre sombre, `Cabin Sketch` pour les titres, `Atkinson Hyperlegible` pour le texte, signature `contours.nc`.
- Fournir un texte alternatif pour chaque visuel publié.
