# Campagne — Inégalités de revenus : où se situe la Nouvelle-Calédonie ?

Article : https://contours.nc/posts/inegalites-revenus-nouvelle-caledonie-monde/ (publié le 1er novembre 2026).

Un carrousel de huit écrans : le partage de 100 francs (couverture), l’écart entre les 20 % les plus aisés et les 20 % les plus modestes, la pauvreté, l’écart avec la France qui vient surtout du bas de l’échelle, la France et les Outre-mer, le monde, les pays suivis par l’OCDE, puis l’évolution de 2008 à 2019 et la crise de mai 2024, avec l’appel à lire l’article. La vidéo, qui présente le globe interactif de l’article, est produite à part par l’auteur ; `visite-globe.html` en propose une base (voir plus bas).

L’angle : la Nouvelle-Calédonie, classée parmi les pays à revenu élevé, est comparée d’abord à la France, puis à ses Outre-mer, au monde et aux pays suivis par l’OCDE (dont l’Australie et la Nouvelle-Zélande), pas aux États insulaires voisins (voir l’article). Son écart avec la France tient surtout au bas de l’échelle. La campagne n’introduit aucun indicateur ni aucune méthode absents de l’article.

**Écriture.** Grand public, sans nom technique sur les écrans ni dans les textes publiés (demande de l’auteur, 1er novembre 2026) : pas de « S80/S20 », de « D9/D1 », d’« indice de Gini », de « médiane » ni de « PIP ». On montre les conclusions plutôt que la méthode : « fois plus », « en haut / en bas de l’échelle », « 35 pays sur 164 » ; l’indice de Gini, appelé « indice d’inégalité » (de 0, chacun a le même revenu, à 1, une seule personne a tout), n’apparaît qu’à l’écran 05 ; ni graduation, ni médiane, ni bande « selon la définition du revenu » dans les croquis. Le globe est colorié selon l’écart entre les 20 % les plus aisés et les 20 % les plus modestes (rapport S80/S20), comme le globe de l’article à l’ouverture, et non selon l’indice de Gini (demande de l’auteur : la Nouvelle-Calédonie y apparaissait en vert, au milieu de l’échelle, ce qui rendait mal son rang). Le résumé « En bref » de l’article garde la présentation détaillée (sa diapositive 6 reste sur l’indice de Gini) ; la campagne n’en montre qu’une partie, avec des chiffres de l’article.

**Précautions.** Les données calédoniennes datent de l’enquête Budget des familles 2019-2020, avant la crise ouverte en mai 2024 (écran 08). Les comparaisons internationales donnent des ordres de grandeur : les mesures diffèrent d’un pays à l’autre (écrans 06 et 08). Ces outils ne disent pas d’où viennent les écarts.

## Fichiers

- `source.html`, `visuels.js` : source reproductible du carrousel (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `visite-globe.html` : visite guidée du globe en 9:16 (de la France à la Nouvelle-Calédonie, puis l’Australie voisine, et « 35 sur 164 »). `visuels.js` y expose `window.visiteGlobe(p)`, que `scripts/produire_gif.py` capture image par image ; ouverte seule, la page montre l’état final.
- `donnees/` : copie de neuf fichiers publiés par l’article (`deciles-nc.csv`, `deciles-france.csv`, `indicateurs-nc.csv`, `seuils-nc.csv`, `niveaux-de-vie-nc.csv`, `gini-monde.csv`, `indicateurs-ocde.csv`, `gini-outre-mer.csv`, `pays-monde.geojson`) avec `provenance.json`. Importés le 1er novembre 2026 depuis le commit de publication de l’article (`183739a`).
- `portrait-4x5/`, `carre-1x1/` : huit écrans numérotés ; `vertical-9x16/` : les mêmes sans numéro ; `paysage-1.91x1/` : écran 01 pour un partage de lien.

### Règles reprises de l’article

- Couleurs : rouge pour la Nouvelle-Calédonie, sépia pour la France et les autres territoires, vert pour l’égalité parfaite ; globe en six classes de la palette Spectral, aux seuils du rapport S80/S20 de l’article (4, 5, 6, 8 et 12), sans valeur affichée : la Nouvelle-Calédonie (8,4, définition officielle) est en orange, la France (5,2) et l’Australie (5,7) en vert (Banque mondiale, revenu par personne : ces valeurs ne sont pas celles de l’Insee ni de l’OCDE, d’où leur absence des écrans).
- Arrondis : une décimale sous 10 %, un entier au-delà ; rapports et taux de pauvreté à une décimale ; indice de Gini à deux décimales.
- Valeurs calédoniennes : définition officielle de l’Isee (autoconsommation comprise), sauf à l’écran 05 (définitions rapprochées par l’Isee, sans l’autoconsommation). Le globe et l’écran 07 ne placent que la définition officielle (8,4), celle des titres ; l’article donne aussi le classement sans l’autoconsommation.
- Écran 02 : comme la figure de l’outil 2 de l’article, les piles comparent la Nouvelle-Calédonie (Isee, 2019) et la France métropolitaine (Insee, 2018, parts tirées du niveau de vie moyen de chaque dixième), à la même échelle ; les rapports de la légende sont ceux du tableau de l’Isee (8,4 et 4,4).
- Écran 04 : « en haut / en bas de l’échelle » reprend les deux chiffres de la diapositive 4 de l’article (part des 10 % les plus aisés, taux de pauvreté) ; « un peu plus » et « deux fois plus » sont vérifiés, comme « les cinq outils vont dans le même sens » (les cinq indicateurs au-dessus de la France).
- Écran 06 et visite : « 35 pays sur 164 seulement » ont un écart plus grand (l’article : « n’est dépassée que par 35 des 164 pays ») ; la France et l’Australie ont un écart « bien plus faible, en vert » (moins de 70 % de la valeur calédonienne, classes vertes du globe).
- Écran 07 : un point par pays suivi par l’OCDE (43 pays, dont 39 à revenu élevé selon la Banque mondiale : « surtout des pays riches »), sans graduation ; l’Afrique du Sud, hors champ, est un triangle au bord droit.
- Écran 08 : écran final sans figure ; « un peu reculé » est vérifié sur les cinq outils, comme dans `analysis.R`.
- `visuels.js` vérifie chaque phrase chiffrée des écrans (« presque deux fois plus faible », « deux fois plus », « la moitié du revenu qui partage la population en deux », « un peu plus », les cinq outils au-dessus de la France, « seule la Guyane », « 35 pays sur 164 seulement », « bien plus faible, en vert », « cinq seulement », « loin derrière », « un peu reculé ») et refuse de produire un visuel si les données ne la confirment plus. `analysis.R` vérifie les mêmes phrases côté site.

## Régénérer

```powershell
$S = "posts/inegalites-revenus-nouvelle-caledonie-monde/data"
$A = "articles/inegalites-revenus-nouvelle-caledonie-monde"
$env:PYTHONIOENCODING = "utf-8"
python scripts/importer_donnees_site.py --sortie "$A/donnees" `
  "$S/deciles-nc.csv" "$S/deciles-france.csv" "$S/indicateurs-nc.csv" "$S/seuils-nc.csv" "$S/niveaux-de-vie-nc.csv" `
  "$S/gini-monde.csv" "$S/indicateurs-ocde.csv" "$S/gini-outre-mer.csv" "$S/pays-monde.geojson"
python scripts/exporter_visuels.py html "$A/source.html" --sortie $A --prefixe inegalites-revenus `
  --formats portrait-4x5 carre-1x1 --force
python scripts/exporter_visuels.py html "$A/source.html" --sortie $A --prefixe inegalites-revenus `
  --formats vertical-9x16 --parametre folio=0 --force
python scripts/exporter_visuels.py html "$A/source.html" --sortie $A --prefixe inegalites-revenus `
  --formats paysage-1.91x1 --slides 1 --force
# Aperçu de l'article sur le site (images/previews/inegalites-revenus-nouvelle-caledonie-monde.png,
# 1 200 × 630) : l'écran 06, le globe, en 1,91:1 ; copier apercu-06.png dans le dépôt du site.
python scripts/exporter_visuels.py html "$A/source.html" --sortie _essais/apercu-inegalites --prefixe apercu `
  --formats paysage-1.91x1 --slides 6 --force
# Visite guidée du globe (22,4 s d'animation, somme des étapes du croquis « globe-visite »),
# si elle sert de base à la vidéo :
python scripts/produire_gif.py "$A/visite-globe.html" "$A/video/visite-globe.mp4" `
  --largeur 1080 --hauteur 1920 --echelle 1 --ips 15 --duree 22400 --pause-finale 1500 `
  --image-par-image visiteGlobe --pret "document.documentElement.dataset.ready === 'true'" --parametre layout=tiktok
```

Toute vidéo de la campagne se termine par l’outro animée de contours.nc (`campagnes/lancement-tiktok/contours-nc-outro.mp4`, option `--outro` de `scripts/produire_video.py`), reste sous 20 Mo (limite de jsDelivr) et est publiée muette, le son étant ajouté dans l’application (par exemple Gurejele, kaneka de Maré).

## Textes proposés

### Facebook

Inégalités de revenus : où se situe la Nouvelle-Calédonie ? 📊

Imaginez 100 francs partagés entre les habitants comme le sont leurs revenus : les 10 % les plus aisés en reçoivent 27, les 10 % les plus modestes 1,7. Ce que disent les chiffres de l’Isee (2019) :
🔹 Les 20 % les plus aisés reçoivent 8,4 fois plus que les 20 % les plus modestes. En France métropolitaine, 4,4 fois plus.
🔹 Près d’un habitant sur cinq (18,3 %) vit sous le seuil de pauvreté : deux fois plus qu’en France (8,7 %).
🔹 L’écart avec la France vient surtout du bas de l’échelle : les plus aisés y reçoivent à peine plus qu’en France.
🔹 Parmi la France et les Outre-mer comparés, seule la Guyane est plus inégalitaire.
🔹 Dans le monde, 35 pays sur 164 seulement ont un écart plus grand entre les plus aisés et les plus modestes.
🔹 Sur 43 pays suivis par l’OCDE, surtout des pays riches, cinq seulement font plus. L’Australie, la Nouvelle-Zélande et la France sont loin derrière.

Ces chiffres datent de 2019, avant la crise ouverte en mai 2024 ; de 2008 à 2019, les inégalités avaient un peu reculé. Entre pays, les mesures diffèrent : retenez les grands écarts.

L’article explique simplement comment on mesure les inégalités, avec un globe interactif et les données :
https://contours.nc/posts/inegalites-revenus-nouvelle-caledonie-monde/

#NouvelleCalédonie #Inégalités #Pauvreté #Économie #DataViz

### Instagram (carrousel)

Même texte, en remplaçant l’adresse par : « Article, globe interactif et données : lien en bio. »

## Textes alternatifs

1. Dix silhouettes, du dixième le plus modeste au plus aisé de la population, chacune sous une pile de francs : sur 100 francs de revenus en Nouvelle-Calédonie en 2019, 1,7 ; 3,5 ; 4,6 ; 5,8 ; 6,9 ; 8,6 ; 11 ; 14 ; 18 et 27 francs. Si tout le monde avait le même revenu, 10 francs chacun. Les 10 % les plus aisés reçoivent 15,3 fois plus que les 10 % les plus modestes.
2. Cinq paires de piles de francs, une par cinquième de la population, à la même échelle : sur 100 francs de revenus, 5,2 ; 10 ; 15 ; 25 et 44 francs en Nouvelle-Calédonie en 2019, 8,7 ; 14 ; 17 ; 22 et 39 francs en France métropolitaine en 2018. Les 20 % les plus aisés reçoivent 8,4 fois plus que les 20 % les plus modestes, contre 4,4 fois plus en France métropolitaine.
3. Deux grilles de cent silhouettes : 18 sur 100 en rouge pour la Nouvelle-Calédonie en 2019 (18,3 % sous le seuil de pauvreté), 9 sur 100 pour la France en 2023 (8,7 %, OCDE). Seuil : la moitié du revenu qui partage la population en deux, soit 86 100 F CFP par mois pour une personne seule ; 49 700 personnes.
4. Deux comparaisons entre la Nouvelle-Calédonie (2019) et la France. En haut de l’échelle, la part des revenus reçue par les 10 % les plus aisés : 27 % contre 25 %, un peu plus. En bas de l’échelle, la part des habitants sous le seuil de pauvreté : 18,3 % contre 8,7 %, deux fois plus.
5. Barres de l’indice d’inégalité, de 0 (chacun a le même revenu) à 1 (une seule personne a tout), calculé de façon comparable à la France : Guyane 0,43, Nouvelle-Calédonie 0,42, La Réunion 0,36, Guadeloupe 0,34, France métropolitaine 0,30.
6. Globe centré sur le Pacifique, colorié du bleu au rouge selon l’écart entre les 20 % les plus aisés et les 20 % les plus modestes dans 164 pays. La Nouvelle-Calédonie, cerclée, est en orange : 35 pays sur 164 seulement ont un écart plus grand. L’Australie voisine est en vert, comme la France.
7. Un point par pays suivi par l’OCDE (43 pays), d’autant plus à droite que les 20 % les plus aisés reçoivent plus que les 20 % les plus modestes. La Nouvelle-Calédonie, en rouge, est à droite de presque tous ; seuls l’Afrique du Sud, le Costa Rica, le Brésil, le Chili et les États-Unis sont plus à droite. L’Australie, la Nouvelle-Zélande et la France sont loin à gauche.
8. Des chiffres d’avant la crise de mai 2024 : de 2008 à 2019, les inégalités avaient un peu reculé ; les effets de la crise ne sont pas encore mesurés. Entre pays, les mesures diffèrent : retenez les grands écarts. Article, globe et données sur contours.nc (lien en bio).

## Sources

- Isee, enquête Budget des familles 2019-2020 (tableaux « Revenus et inégalités ») et *Synthèse* n° 52 (août 2021) ; enquête Budget consommation des ménages 2008, recalculée par l’Isee selon la définition de 2019.
- Insee, d’après l’Isee (France métropolitaine, 2018 ; DOM, 2017), et Insee, *Revenus et patrimoine des ménages*, édition 2021, fiche « Niveau de vie des personnes » (France métropolitaine, 2018).
- Banque mondiale, Poverty and Inequality Platform, version du 22 septembre 2026.
- OCDE, base de données sur la distribution des revenus, consultée le 30 octobre 2026.
- Fond de carte Natural Earth (domaine public).
- Indicateurs, champs et méthode : article contours.nc, section « Méthode et sources ».
