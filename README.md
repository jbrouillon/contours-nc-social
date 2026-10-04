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
assets/
├── js/contours-sketch.js        bannière animée du site, avec l'option animationTimeScale
└── data/nc_logo.geojson         contour de la Nouvelle-Calédonie utilisé par la bannière
export/
└── export-en-bref.js            script de capture des diapositives « En bref »
images/
└── contours-hexagon.svg         logo utilisé par les sources HTML
scripts/
└── produire_gif.py              production d'un GIF à partir d'une source HTML animée
```

Pour un nouvel article, créer `articles/<slug-de-l-article>/` avec le même slug que sur le site.

## Sources HTML

Les fichiers `source.html` produisent les visuels : les ouvrir dans un navigateur, à la taille du format visé (1080 × 1350, 1080 × 1080, 1200 × 630…), puis capturer. Ils dépendent de `images/contours-hexagon.svg`, de la bannière `assets/js/contours-sketch.js` (sources TikTok) et des polices Google (`Cabin Sketch`, `Atkinson Hyperlegible`) ; d3 et rough.js sont chargés depuis jsDelivr.

`assets/js/contours-sketch.js` est une copie de la bannière du site, enrichie de l'option `animationTimeScale` qui ralentit l'animation pour la capture. Elle n'existe que dans ce dépôt : la version du site reste celle publiée.

## Produire un GIF animé

```powershell
python -m pip install --user pillow websocket-client
python scripts/produire_gif.py campagnes/lancement-tiktok/outro-source.html campagnes/lancement-tiktok/contours-nc-outro.gif
```

Le script ouvre la page une seule fois dans Edge ou Chrome sans interface, ralentit l'animation (`--ralenti 6` par défaut, transmis par `?timeScale=`) et la capture à 10 images par seconde (`--ips`), en 720 × 1280 avec une mise en page de 540 × 960 (`--echelle`). Options utiles : `--duree` (ms d'animation), `--pause-finale`, `--largeur`, `--hauteur`. La source doit accepter `?manual=1&timeScale=N`, signaler qu'elle est prête et exposer sa fonction de démarrage, comme `outro-source.html`.

## Capturer les diapositives « En bref » d'un article

1. Ouvrir l'article publié avec `?lecture=en-bref&slide=1`.
2. Coller `export/export-en-bref.js` dans la console du navigateur, avec `MODE = "social"` (carrousel) ou `"tiktok"` (fenêtre en largeur mobile, 720 px ou moins).
3. Capturer chaque diapositive, en avançant avec les flèches du clavier.

Le script masque la navigation et ajuste la mise en page pour la capture, sans modifier le site. Il cible aujourd'hui les diapositives de l'article sur le regroupement des bureaux de vote (`.vote-brief-*`) ; il faudra l'étendre au composant commun `.contours-brief-*` pour les nouveaux articles.

## Règles

- Ne publier que des chiffres, cartes et citations présents dans l'article d'origine, avec sa source.
- Garder l'identité visuelle du site : papier clair, encre sombre, `Cabin Sketch` pour les titres, `Atkinson Hyperlegible` pour le texte, signature `contours.nc`.
- Fournir un texte alternatif pour chaque visuel publié.
