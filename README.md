# contours.nc — contenus pour les réseaux sociaux

Dépôt public des visuels et sources de diffusion de [contours.nc](https://contours.nc) : carrousels, slides TikTok, visuels de partage et leurs sources HTML. Ces fichiers ne font pas partie du site ; le dépôt du site (`jbrouillon/contours-nc`) les ignore (`/social/`, `/posts/*/social/`, `/posts/*/tiktok/`).

## Organisation

```text
campagnes/                       Campagnes propres au carnet
├── appel-contributions-facebook/  carrousels 4:5 et 1:1, visuel 1200 × 630, source HTML, textes
├── lancement-tiktok/              slides de lancement, animation de fin, sources HTML
└── presentation-contours-nc/      carrousels 4:5 et 1:1
articles/                        Déclinaisons d'un article publié
├── regroupement-bureaux-vote-noumea/
│   ├── carrousel/                 diapositives « En bref » au format carrousel
│   └── tiktok/                    diapositives « En bref » au format vertical, animation de fin
├── provinciales-2026-geographie-forces-politiques/
│                                  campagne en 8 écrans : source.html, visuels.js, donnees/, exports, textes
└── pacific-climate-fingerprints/  campagne en 6 écrans : source.html, visuels.js, donnees/, exports, textes
assets/
├── css/campagne-article.css     gabarit commun des campagnes d'article (4:5, 1:1, 9:16, 1,91:1)
├── js/campagne-outils.js        outils communs : formats, valeurs calculées, croquis rough.js, signal prêt
├── js/contours-sketch.js        bannière animée du site, avec l'option animationTimeScale
└── data/nc_logo.geojson         contour de la Nouvelle-Calédonie utilisé par la bannière
export/
└── export-en-bref.js            script de capture des diapositives « En bref »
images/
└── contours-hexagon.svg         logo utilisé par les sources HTML
scripts/
├── exporter_visuels.py          export PNG multiformat depuis « En bref » ou une source HTML
├── importer_donnees_site.py     copie de données du site avec provenance (commit, SHA-256)
└── produire_gif.py              production d'un GIF à partir d'une source HTML animée
```

Pour un nouvel article, créer `articles/<slug-de-l-article>/` avec le même slug que sur le site.

## Sources HTML

Les fichiers `source.html` produisent les visuels. Ils dépendent de `images/contours-hexagon.svg`, de la bannière `assets/js/contours-sketch.js` (sources TikTok) et des polices Google (`Cabin Sketch`, `Atkinson Hyperlegible`) ; d3 et rough.js sont chargés depuis jsDelivr. `scripts/exporter_visuels.py` les sert en HTTP et les capture aux dimensions demandées.

`assets/js/contours-sketch.js` est une copie de la bannière du site, enrichie de l'option `animationTimeScale` qui ralentit l'animation pour la capture. Elle n'existe que dans ce dépôt : la version du site reste celle publiée.

## Produire un GIF animé

```powershell
python -m pip install --user pillow websocket-client
python scripts/produire_gif.py campagnes/lancement-tiktok/outro-source.html campagnes/lancement-tiktok/contours-nc-outro.gif
```

Le script ouvre la page une seule fois dans Edge ou Chrome sans interface, ralentit l'animation (`--ralenti 6` par défaut, transmis par `?timeScale=`) et la capture à 10 images par seconde (`--ips`), en 720 × 1280 avec une mise en page de 540 × 960 (`--echelle`). Options utiles : `--duree` (ms d'animation), `--pause-finale`, `--largeur`, `--hauteur`. La source doit accepter `?manual=1&timeScale=N`, signaler qu'elle est prête et exposer sa fonction de démarrage, comme `outro-source.html`.

## Exporter les visuels sociaux

Le moteur produit quatre canevas normalisés :

| Format | Dimensions | Usages principaux |
|---|---:|---|
| `portrait-4x5` | 1 080 × 1 350 px | carrousels et images de fil en portrait |
| `carre-1x1` | 1 080 × 1 080 px | publications carrées réutilisables |
| `vertical-9x16` | 1 080 × 1 920 px | TikTok, Reels, Stories et Shorts |
| `paysage-1.91x1` | 1 200 × 630 px | aperçus de liens et publications horizontales |

Le 4:5 reste notamment le ratio vertical maximal rendu par les publications photo LinkedIn ; le 1,91:1 convient aux aperçus de liens et le 9:16 au plein écran vertical. Les noms de formats décrivent toutefois le canevas plutôt qu'un réseau : une même sortie peut être réutilisée sur plusieurs plateformes.

Repères officiels consultés en octobre 2026 : [photos LinkedIn](https://www.linkedin.com/help/linkedin/answer/a527229/share-photos-or-videos?lang=en), [aperçus de liens LinkedIn](https://www.linkedin.com/help/linkedin/answer/a521928) et [principes créatifs TikTok](https://ads.tiktok.com/business/en-US/creative-codes).

### Depuis les diapositives « En bref »

Depuis la racine de ce dépôt, pour un article publié :

```powershell
python scripts/exporter_visuels.py en-bref `
  --url https://contours.nc/posts/<slug>/ `
  --sortie articles/<slug> `
  --formats portrait-4x5 carre-1x1 vertical-9x16 paysage-1.91x1
```

Pour contrôler le rendu local du dépôt du site avant publication :

```powershell
python scripts/exporter_visuels.py en-bref `
  --racine-web ..\contours-nc\docs `
  --page posts/<slug>/index.html `
  --sortie articles/<slug> `
  --formats portrait-4x5 vertical-9x16
```

Le script détecte le nombre de diapositives, attend les polices, images et croquis, masque les contrôles du dialogue, vérifie les débordements et écrit `en-bref-01.png`, `en-bref-02.png`, etc. dans un sous-dossier par format. Il prend en charge le composant commun `.contours-brief-*` et l'ancien composant `.vote-brief-*`.

### Depuis une source HTML autonome

Une source existante peut être exportée sans ouvrir le navigateur manuellement :

```powershell
python scripts/exporter_visuels.py html `
  campagnes/appel-contributions-facebook/source.html `
  --sortie campagnes/appel-contributions-facebook `
  --prefixe appel-contributions `
  --formats portrait-4x5 carre-1x1
```

Les dispositions propres à une source se règlent sans modifier le moteur. Par exemple, la source de lancement utilise `layout=feed` pour le 4:5 :

```powershell
python scripts/exporter_visuels.py html `
  campagnes/lancement-tiktok/source.html `
  --sortie campagnes/lancement-tiktok `
  --prefixe lancement-contours-nc `
  --formats portrait-4x5 vertical-9x16 `
  --layout portrait-4x5=feed
```

Par convention, une future source HTML :

- contient un élément `[data-slide]` par écran ;
- active l'écran demandé par le paramètre `?slide=N` ;
- fait remplir la fenêtre à `.slide.is-active` ;
- définit `document.documentElement.dataset.ready = "true"` après le chargement des polices, données et dessins ;
- accepte si nécessaire `?layout=...` et d'autres paramètres passés avec `--parametre CLE=VALEUR`.

`--selecteur` et `--pret` permettent d'adapter une source plus ancienne. `--slides N` limite explicitement une série, par exemple à la première image d'un aperçu de lien.

### Garde-fous

- Les dimensions du PNG sont vérifiées après chaque capture.
- Une série n'est écrite qu'après le contrôle de toutes ses diapositives.
- Un fichier existant n'est jamais remplacé sans `--force`.
- Le script ne supprime pas les anciens exports surnuméraires si une série raccourcit : les examiner manuellement.
- `--autoriser-debordement` existe pour le diagnostic, pas pour une livraison finale.
- Le canevas 9:16 ne remplace pas un contrôle des zones d'interface propres à TikTok, Reels ou Stories : garder les informations décisives loin des bords et vérifier la publication en prévisualisation.

## Préparer manuellement une capture « En bref »

Le script d'injection reste utile pour une prévisualisation ponctuelle dans un navigateur :

1. Ouvrir l'article publié avec `?lecture=en-bref&slide=1&export=social` pour un carrousel, ou `?lecture=en-bref&slide=1&export=tiktok` pour un format vertical.
2. Coller `export/export-en-bref.js` dans la console du navigateur. Pour TikTok, passer la fenêtre en largeur mobile (720 px ou moins) avant de lancer le script.
3. Vérifier le message « Export prêt » dans la console, puis capturer chaque diapositive en avançant avec les flèches du clavier.

Le script masque la fermeture, la navigation et le lien de lecture détaillée, puis ajuste la mise en page pour la capture sans modifier le site. Il prend en charge le composant commun `.contours-brief-*` des nouveaux articles et l'ancien composant `.vote-brief-*` de l'article sur le regroupement des bureaux de vote. Il peut être relancé sans dupliquer les styles ; le paramètre `export` détermine le mode à chaque exécution.

## Calendrier de diffusion

`calendrier.csv` liste les publications programmées dans Buffer (organisation « My organization », fuseau Pacific/Noumea) : date et heure de Nouméa, réseau, campagne, format, mode, statut et identifiant Buffer. Le mettre à jour à chaque programmation ou publication.

- Les images sont envoyées à Buffer par leur URL `raw.githubusercontent.com` figée sur un commit : commiter et pousser les visuels avant de les programmer, et ne pas réécrire l'historique de ce dépôt.
- Facebook et Instagram sont publiés automatiquement. Le lien de l'article doit être dans la bio Instagram et TikTok au moment de la publication.
- TikTok est programmé en mode « rappel » : à l'heure prévue, l'application Buffer envoie une notification ; ouvrir TikTok, choisir un son (tendance ou bibliothèque commerciale), publier. Buffer n'a pas accès aux sons de TikTok.
- Plan gratuit de Buffer : 3 canaux, 10 publications programmées à la fois.

## Règles

- Ne publier que des chiffres, cartes et citations présents dans l'article d'origine, avec sa source.
- Garder l'identité visuelle du site : papier clair, encre sombre, `Cabin Sketch` pour les titres, `Atkinson Hyperlegible` pour le texte, signature `contours.nc`.
- Fournir un texte alternatif pour chaque visuel publié.
