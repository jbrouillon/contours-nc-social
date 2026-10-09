# Campagne — Explorer les disparités territoriales en Nouvelle-Calédonie

Article : https://contours.nc/posts/disparites-territoriales-nouvelle-caledonie/

Six écrans tirés des données de l’article : une couverture (la carte du pays selon l’accès à internet), le chômage, les diplômés du supérieur à Nouméa, le lien entre lieu de naissance et diplômes, le cumul chômage × internet, puis l’appel à explorer avec la principale précaution de lecture.

L’angle : une moyenne pour tout le pays cache de grands écarts, et ces écarts dessinent souvent la même géographie, entre le Grand Nouméa et le reste du pays. Ils recoupent aussi l’origine des habitants : là où vivent le plus de personnes nées hors de Nouvelle-Calédonie, les diplômés du supérieur sont plus nombreux. Les chiffres sont des **comptes de zones dans les classes de la légende de l’article** (« 28 zones où au moins 80 % des ménages n’ont pas internet ») et des corrélations calculées comme dans l’outil de l’article. La campagne n’introduit aucun indicateur ni aucune méthode absents de l’article.

**Vocabulaire.** Pour le grand public, les IRIS de l’Isee sont appelés « zones » (« zone de recensement » dans les textes alternatifs) ; le pied de page de la couverture précise « 1 zone = 1 IRIS, petit secteur du recensement 2019 ».

**Lieu de naissance.** L’écran 04 rapproche deux parts calculées par zone ; il ne dit pas que les personnes nées hors du pays sont les diplômées. Son titre porte donc sur les cartes (« deux cartes qui se ressemblent ») et sa note rappelle, comme l’article, que le lieu de naissance ne dit pas l’appartenance communautaire.

Elle remplace un premier jet du 9 octobre, capturé depuis le dialogue « En bref » du site (en-tête « Lecture express », croquis réduits, sans source ni légende) et qui affichait des corrélations de Spearman alors que l’outil de l’article calcule un r de Pearson. Ce premier jet est conservé hors suivi dans `_essais/codex-en-bref/`.

## Fichiers

- `source.html`, `visuels.js` : source reproductible (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `donnees/` : copie de `assets/data/disparites-territoriales-nouvelle-caledonie-nc.json` publié par le site, avec `provenance.json` (commit du site, SHA-256).
- `portrait-4x5/`, `carre-1x1/`, `vertical-9x16/` : six écrans ; `paysage-1.91x1/` : écran 1 pour un partage de lien.
- `video/` : `musique.m4a` et `disparites-territoriales.mp4` (35,5 s, six écrans puis l’outro animée).

### Règles reprises de l’article

- Seuils et couleurs des classes : `ncMetricDefinitions` de `assets/js/disparites-territoriales-nouvelle-caledonie.js` ; une valeur égale à un seuil passe dans la classe supérieure (`d3.bisectRight`, comme `colorFor`).
- Population de calcul : les 155 zones habitées sur 162 ; chaque zone compte une fois, quelle que soit sa population. Les 7 zones sans habitant sont en gris.
- Corrélations : r de Pearson, comme le nuage de points de l’article. L’article cite lui-même le lien entre nés hors de Nouvelle-Calédonie et cadres (0,80) ; la campagne montre, avec le même outil, celui entre nés hors de Nouvelle-Calédonie et diplômés d’un bac +3 ou plus (0,87).
- Grand Nouméa : Nouméa, Dumbéa, Mont-Dore et Païta. L’agrandissement de la couverture reprend l’emprise de l’article Provinciales 2026 ; les écrans 03 et 04 resserrent le cadre sur l’agglomération.
- `visuels.js` vérifie les phrases des écrans (« seules 2 », « une seule », « toutes à Nouméa », lien fort et positif) et refuse de produire un visuel si les données ne les confirment plus.

## Régénérer

```powershell
python scripts/importer_donnees_site.py --sortie articles/disparites-territoriales-nouvelle-caledonie/donnees `
  assets/data/disparites-territoriales-nouvelle-caledonie-nc.json
python scripts/exporter_visuels.py html articles/disparites-territoriales-nouvelle-caledonie/source.html `
  --sortie articles/disparites-territoriales-nouvelle-caledonie --prefixe disparites-territoriales `
  --formats portrait-4x5 carre-1x1 vertical-9x16 --force
python scripts/exporter_visuels.py html articles/disparites-territoriales-nouvelle-caledonie/source.html `
  --sortie articles/disparites-territoriales-nouvelle-caledonie --prefixe disparites-territoriales `
  --formats paysage-1.91x1 --slides 1 --force
python scripts/produire_video.py articles/disparites-territoriales-nouvelle-caledonie/vertical-9x16 `
  --musique articles/disparites-territoriales-nouvelle-caledonie/video/musique.m4a `
  --sortie articles/disparites-territoriales-nouvelle-caledonie/video/disparites-territoriales.mp4 `
  --durees 4.5,5.5,5.5,6,5.5,4 --outro campagnes/lancement-tiktok/contours-nc-outro.mp4 --force
```

## Textes proposés

### Facebook

Une moyenne pour tout le pays cache de grands écarts 🗺️

Nous avons cartographié les 162 petites zones du recensement de 2019 (les IRIS de l’Isee) :
🔹 Internet : dans 28 zones, au moins 80 % des ménages n’y ont pas accès. Seules 2 sont dans le Grand Nouméa.
🔹 Chômage : il touche au moins 30 % des actifs dans 34 zones, dont une seule dans le Grand Nouméa.
🔹 Diplômes : les 13 zones où la part de diplômés d’un bac +3 ou plus atteint 35 % sont toutes à Nouméa.
🔹 Origine : là où vivent le plus de personnes nées hors de Nouvelle-Calédonie, les diplômés du supérieur sont plus nombreux (r = 0,87 entre les zones).
🔹 Chômage élevé et absence d’internet vont souvent de pair (r = 0,81).

Ces cartes décrivent des territoires, pas des personnes : un écart entre zones ne dit rien de chaque habitant, ni de ses causes, et le lieu de naissance ne dit pas l’appartenance communautaire.

20 indicateurs, deux cartes côte à côte, les quartiers du Grand Nouméa en 2014 et 2019 :
https://contours.nc/posts/disparites-territoriales-nouvelle-caledonie/

#NouvelleCalédonie #Recensement #Cartographie #Inégalités #DataViz

### Instagram (carrousel)

Même texte, en remplaçant l’adresse par : « Cartes interactives et données : lien en bio. »

### TikTok (légende courte)

Une même Nouvelle-Calédonie, des écarts considérables d’une zone à l’autre : internet, chômage, diplômes, origine. Cartes à explorer sur contours.nc 🗺️ #NouvelleCalédonie #carte #recensement

## Textes alternatifs

1. Carte des 162 zones de recensement de Nouvelle-Calédonie selon la part des ménages sans accès à internet en 2019, avec un agrandissement du Grand Nouméa : dans 28 zones, au moins 80 % des ménages n’ont pas internet, dont 2 seulement dans le Grand Nouméa ; 22 des 23 zones sous 20 % s’y trouvent.
2. Carte des 162 zones selon le taux de chômage en 2019, avec un agrandissement du Grand Nouméa : 34 zones où le chômage touche au moins 30 % des actifs, dont une seule dans le Grand Nouméa, qui regroupe 29 des 31 zones sous 8 %.
3. Carte des zones de l’agglomération de Nouméa selon la part des diplômés d’un bac +3 ou plus en 2019 : les 13 zones où cette part atteint au moins 35 % sont toutes dans la commune de Nouméa, surtout dans le sud et l’est de la presqu’île (Orphelinat, Val Plaisance, Baie des Citrons, Anse Vata, Ouémo, Trianon, Tina…) ; dans la moitié des zones du pays, elle reste sous 6,5 %.
4. Deux cartes de l’agglomération de Nouméa en 2019 : à gauche la part des personnes nées hors de Nouvelle-Calédonie, à droite celle des diplômés d’un bac +3 ou plus ; les deux sont élevées dans les mêmes zones du sud de la presqu’île (corrélation de 0,87 entre les 155 zones habitées du pays). Le lieu de naissance ne dit pas l’appartenance communautaire.
5. Nuage de points des 155 zones habitées : en abscisse la part des ménages sans internet, en ordonnée le taux de chômage ; les deux augmentent ensemble (r = 0,81) ; les zones du Grand Nouméa se regroupent en bas à gauche, celles du reste du pays s’étalent vers le haut et la droite.
6. Écran final : 20 indicateurs, 162 zones et 58 quartiers du Grand Nouméa à explorer sur contours.nc (lien en bio) ; ces cartes décrivent des territoires, pas des personnes.

## Sources

- Isee, recensement de la population 2019 ; PopGIS3 Nouvelle-Calédonie, IRIS du RGP 2019.
- Indicateurs, seuils, couleurs et méthode : article contours.nc, section « Données et méthode ».
