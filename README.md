# contours.nc — contenus pour les réseaux sociaux

Dépôt public des visuels et sources de diffusion de [contours.nc](https://contours.nc) : carrousels, slides TikTok, visuels de partage et leurs sources HTML. Ces fichiers ne font pas partie du site ; le dépôt du site (`jbrouillon/contours-nc`) les ignore (`/social/`, `/posts/*/social/`, `/posts/*/tiktok/`).

## Organisation

```text
campagnes/                       Campagnes propres au carnet
├── appel-contributions/          campagne en 6 écrans (source.html, visuels.js), quatre formats, vidéo muette, textes
├── appel-contributions-facebook/  ancienne version Facebook : carrousels 4:5 et 1:1, visuel 1200 × 630, source HTML
├── lancement-tiktok/              slides de lancement, animation de fin, sources HTML
└── presentation-contours-nc/      carrousels 4:5 et 1:1
articles/                        Déclinaisons d'un article publié
├── regroupement-bureaux-vote-noumea/
│   ├── carrousel/                 diapositives « En bref » au format carrousel
│   └── tiktok/                    diapositives « En bref » au format vertical, animation de fin
├── provinciales-2026-geographie-forces-politiques/
│                                  campagne en 8 écrans : source.html, visuels.js, donnees/, exports, textes
├── pacific-climate-fingerprints/  campagne en 6 écrans : source.html, visuels.js, donnees/, exports, textes
├── disparites-territoriales-nouvelle-caledonie/
│                                  campagne en 6 écrans : source.html, visuels.js, donnees/, exports, vidéo, textes
└── concentration-population-noumea-pacifique/
                                   campagne en 8 écrans et carte animée : source.html, animation.html,
                                   visuels.js, donnees/, exports, vidéo, textes
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
├── extraire_donnees_page.py     extraction des données embarquées dans une page publiée du site
├── produire_gif.py              GIF ou MP4 à partir d'une source HTML animée
└── produire_video.py            vidéo 9:16 : intro animée, écrans, musique et outro
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

Pour une carte animée, préférer le mode **image par image** : la page expose `window.FONCTION(p)`, qui dessine l'état `p` (de 0 à 1) et renvoie une valeur, et le script dessine puis capture chaque image (`--image-par-image FONCTION`, avec `--pret` pour le signal de disponibilité et `--parametre layout=tiktok` pour le format). Le rendu ne dépend plus du temps réel ; si le navigateur sans interface se bloque en cours de capture, il est relancé et la capture reprend à l'image en cours. Exemple : `articles/concentration-population-noumea-pacifique/animation.html` (voir son README).

## Données d'un article sans fichier séparé

Quand un article embarque ses données dans la page (blocs `<script type="application/json" id="…-data">` écrits par `analysis.R`), `scripts/extraire_donnees_page.py` les extrait de la page publiée, lue dans le commit `HEAD` du site et non dans un rendu local, et écrit `provenance.json` :

```powershell
python scripts/extraire_donnees_page.py --page docs/posts/<slug>/index.html `
  --sortie articles/<slug>/donnees chart-concentration carte-population-communes
```

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

Rythme visé depuis octobre 2026 : deux publications par semaine sur Facebook (12 h), deux sur Instagram (12 h), une à deux sur TikTok (19 h), en alternant campagnes complètes (carrousels, vidéos) et extraits d’une image tirés d’une campagne déjà publiée, avec le lien de l’article. Les vidéos TikTok et les Reels sont publiés muets, en mode « rappel », pour ajouter un son de la bibliothèque de l’application (par exemple Gurejele).

`calendrier.csv` liste les publications programmées dans Buffer (organisation « My organization », fuseau Pacific/Noumea) : date et heure de Nouméa, réseau, campagne, format, mode, statut et identifiant Buffer. Le mettre à jour à chaque programmation ou publication.

- Les images sont envoyées à Buffer par leur URL `raw.githubusercontent.com` figée sur un commit : commiter et pousser les visuels avant de les programmer, et ne pas réécrire l'historique de ce dépôt.
- Facebook et Instagram sont publiés automatiquement. Le lien de l'article doit être dans la bio Instagram et TikTok au moment de la publication.
- TikTok est programmé en mode « rappel » : à l'heure prévue, l'application Buffer envoie une notification ; ouvrir TikTok, choisir un son (tendance ou bibliothèque commerciale), publier. Buffer n'a pas accès aux sons de TikTok.
- Plan gratuit de Buffer : 3 canaux, 10 publications en attente par canal ; une place se libère dès qu'un post part.

## Vidéos TikTok avec musique

`scripts/produire_video.py` enchaîne les PNG 9:16 d'une campagne par fondus et pose une piste musicale (coupée à la durée de la vidéo, fondu d'entrée et de sortie). ffmpeg est pris dans le PATH, sinon dans `imageio-ffmpeg` (`python -m pip install --user imageio-ffmpeg`).

```powershell
python scripts/produire_video.py articles/<slug>/vertical-9x16 `
  --musique articles/<slug>/video/musique.m4a `
  --sortie articles/<slug>/video/<slug>.mp4 --durees 3.5,5,6,5,5,5,5,4 `
  --outro campagnes/lancement-tiktok/contours-nc-outro.mp4
```

La vidéo est encodée à débit constant (`--debit`, 3,4 Mbit/s par défaut) : sans plancher, des écrans fixes descendent vers 1 Mbit/s et TikTok les recompresse en flou. Ce débit garde une vidéo de 45 s sous les 20 Mo acceptés par jsDelivr. Pour publier depuis TikTok Studio, importer le fichier MP4 d’origine (pas une copie renvoyée par une messagerie) et activer l’importation en haute qualité dans l’application ; juste après la mise en ligne, TikTok affiche parfois une version basse définition le temps de finir son traitement.

**Toute vidéo se termine par l'outro animée** (`--outro`) : ne jamais livrer ni programmer une vidéo sans elle.

`--intro` place une vidéo avant les écrans fixes (par exemple une carte animée produite par `produire_gif.py --image-par-image`) et `--sans 1,2` retire les écrans qu'elle remplace. Exporter alors les PNG 9:16 avec `--parametre folio=0` pour masquer une numérotation qui ne correspondrait plus.

L'outro (`campagnes/lancement-tiktok/contours-nc-outro.mp4`, 7,5 s) est le logo animé de `outro-source.html`, capturé à 30 images par seconde et accéléré d'un tiers ; la musique continue dessous et s'éteint sur la signature. Pour la régénérer :

```powershell
python scripts/produire_gif.py campagnes/lancement-tiktok/outro-source.html `
  campagnes/lancement-tiktok/contours-nc-outro.mp4 --ips 30 --ralenti 12 `
  --acceleration 1.5 --duree 9000 --pause-finale 1500
```

La capture se fait en 720 × 1280 (mise en page de 540 × 960) puis est agrandie au montage : en 1080 × 1920, le navigateur sans interface ne suit pas le rendu du second bloc du logo.

- Les pistes de `articles/*/video/musique.m4a` sont des morceaux instrumentaux originaux générés par vidIQ (outil `generate_music`, présenté comme libre de droits), convertis en AAC. Provinciales : piano feutré et marimba, ambiance documentaire neutre (piste a14cd8cd). Empreintes climatiques : nappes, ukulélé et piano, ambiance océanique (piste acfda2b8). Générées le 7 octobre 2026. Disparités territoriales : acoustique océanienne posée, ukulélé en arpèges, tambour de bois, percussions de bambou, ressac discret (piste 3ad92481). Concentration autour de Nouméa : groove océanien lumineux, ukulélé gratté, guitare acoustique façon slack-key, tambours de bois (piste e38ebaf9). Générées le 10 octobre 2026, en remplacement de deux premières pistes jugées trop peu « Pacifique » (54bf0a24 et 9c8348d2, conservées dans l’historique Git).
- Buffer doit récupérer la vidéo avec le type `video/mp4` : `raw.githubusercontent.com` la sert en `application/octet-stream`, utiliser l'URL jsDelivr figée sur un commit (`https://cdn.jsdelivr.net/gh/jbrouillon/contours-nc-social@<commit>/<chemin>`, 20 Mo au plus par fichier).


## Règles

- Ne publier que des chiffres, cartes et citations présents dans l'article d'origine, avec sa source.
- Garder l'identité visuelle du site : papier clair, encre sombre, `Cabin Sketch` pour les titres, `Atkinson Hyperlegible` pour le texte, signature `contours.nc`.
- Fournir un texte alternatif pour chaque visuel publié.
- Écrire pour le grand public : éviter le jargon statistique (« IRIS » devient « zone », définie une fois dans le visuel) et rappeler la précaution de lecture utile (territoires et non personnes, lieu de naissance et non appartenance communautaire).
- Terminer toute vidéo par l'outro animée de contours.nc.
