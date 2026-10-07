# Campagne — Provinciales 2026 : où les forces politiques ont-elles gagné du terrain ?

Article : https://contours.nc/posts/provinciales-2026-geographie-forces-politiques/

Huit écrans, tirés de l’article et de son résumé « En bref » : une ouverture (une carte, trois chiffres), le Sud (droite loyaliste en carte lissée, puis Nouméa par secteur électoral, puis le centre bureau par bureau), le Nord (UC et UNI), les Îles (abstention, Nation autochtone), puis un écran de méthode et d’appel à lire.

Les cartes reprennent le rendu et le lissage du site (surface lissée, hachure rough.js légère, limites communales, côte crayonnée, cadre de papier) et une légende complète : chaque classe est libellée et le sens « recul / progression » est écrit en toutes lettres. Les écrans 04 et 06 sont des essaims : un cercle par bureau présent aux deux scrutins, placé selon son évolution en points, avec la valeur de toute la province en repère.

## Fichiers

- `source.html`, `visuels.js` : source reproductible (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `donnees/` : copie des données de l’article, avec `provenance.json` (commit du site, empreintes SHA-256). Tous les chiffres affichés sont recalculés à partir de ces fichiers, avec les mêmes règles que l’article (appariement des bureaux par nom ou numéro, classes de couleurs identiques, cadrage du Grand Nouméa lu dans `metadata.json`).
- Écart affiché sur la couverture : différence des deux scores arrondis au dixième (UC : 36,0 % → 39,9 %, soit +3,9 points ; l’article, qui calcule sur les valeurs exactes, indique +4,0 points).
- `portrait-4x5/` (1080 × 1350, carrousel Instagram, Facebook, LinkedIn), `carre-1x1/` (1080 × 1080), `vertical-9x16/` (1080 × 1920, TikTok, Reels, Stories), `paysage-1.91x1/` (1200 × 630, partage de lien : écran 1 seulement).

En 1:1, quelques phrases secondaires sont masquées (`hide-square`) pour garder les cartes lisibles. En 9:16, les titres sont raccourcis (`only-tiktok` / `hide-tiktok`), la typographie est resserrée pour laisser la hauteur aux figures et la liste de l’écran final est masquée. L’aperçu de lien reprend les titres courts.

### Cartes lissées (écrans 02, 05, 07) et secteurs de Nouméa (écran 03)

Les cartes sont lissées comme la vue « Lissage » du site : en chaque point, voix et suffrages des bureaux voisins sont pondérés par un noyau gaussien puis rapportés, sur 12 km dans le Sud et le Nord et 8 km aux Îles (portées lues dans `metadata.json`). Au-delà d’une portée du bureau le plus proche, la couleur est pâlie ; au-delà du rayon d’affichage, rien n’est estimé. Les classes de couleur sont calculées sur la surface lissée, et les chiffres affichés restent les résultats communaux officiels.

Nouméa est cartographiée par secteur électoral (`vote_context_secteurs.geojson`, couche de la Ville de Nouméa de juin 2026 publiée par l’article sur le regroupement des bureaux de vote) : chaque secteur prend l’évolution de son bureau entre 2019 et 2026. L’appariement est celui de l’article : 51 bureaux par nom et 6 (n° 18, 19, 33, 37, 38, 44) par numéro de secteur, parce qu’ils ont gardé leur numéro mais changé d’école. Cette règle a été ajoutée à `analysis.R` du site, qui l’applique à tous les graphiques de bureaux. Leur rapport d’inscrits 2026/2019 (1,01 à 1,28) reste dans la fourchette des bureaux appariés par nom (0,57 à 1,37). En 2026, les électeurs de Nouméa votaient dans neuf lieux regroupés : un secteur représente les électeurs d’un bureau, pas un lieu de vote.

## Régénérer

```powershell
python scripts/importer_donnees_site.py --sortie articles/provinciales-2026-geographie-forces-politiques/donnees `
  posts/provinciales-2026-geographie-forces-politiques/data/synthese_province.csv `
  posts/provinciales-2026-geographie-forces-politiques/data/synthese_communes.csv `
  posts/provinciales-2026-geographie-forces-politiques/data/communes.geojson `
  posts/provinciales-2026-geographie-forces-politiques/data/provinces.geojson `
  posts/provinciales-2026-geographie-forces-politiques/data/bureaux_forces_2019_2026.csv `
  posts/provinciales-2026-geographie-forces-politiques/data/appariement_bureaux_2019_2026.csv `
  posts/provinciales-2026-geographie-forces-politiques/data/metadata.json `
  posts/regroupement-bureaux-vote-noumea/data/vote_context_secteurs.geojson
python scripts/exporter_visuels.py html articles/provinciales-2026-geographie-forces-politiques/source.html `
  --sortie articles/provinciales-2026-geographie-forces-politiques --prefixe provinciales-2026-geographie `
  --formats portrait-4x5 carre-1x1 vertical-9x16 --force
python scripts/exporter_visuels.py html articles/provinciales-2026-geographie-forces-politiques/source.html `
  --sortie articles/provinciales-2026-geographie-forces-politiques --prefixe provinciales-2026-geographie `
  --formats paysage-1.91x1 --slides 1 --force
```

Si une valeur manque dans les données, la source affiche une erreur et l’export échoue au lieu de produire un visuel incomplet.

## Textes proposés

### Facebook / Instagram (carrousel)

Provinciales 2019 → 2026 : où les forces politiques ont-elles gagné du terrain ?

Nous avons comparé les deux scrutins commune par commune et bureau par bureau.
🔹 Sud : la droite loyaliste passe de 40,6 % à 50,1 %, bien au-delà de Nouméa, et progresse dans 53 des 57 secteurs électoraux de Nouméa. Le centre recule dans 115 des 122 bureaux comparables.
🔹 Nord : l’UC repasse devant l’UNI, dans un camp indépendantiste stable.
🔹 Îles : l’abstention augmente dans 39 bureaux sur 41, et Maré devient le cœur d’un troisième pôle.

Les cartes montrent où les rapports de force ont changé ; elles ne disent pas comment chaque électeur a voté.

Cartes interactives, zoom sur le Grand Nouméa et méthode : lien en bio / en commentaire.
https://contours.nc/posts/provinciales-2026-geographie-forces-politiques/

#NouvelleCalédonie #Provinciales2026 #Élections #Cartographie #DataViz

### LinkedIn

Où les forces politiques ont-elles gagné du terrain entre les provinciales de 2019 et de 2026 en Nouvelle-Calédonie ?

Dans cette note de recherche, nous descendons à l’échelle des communes et des bureaux de vote. Trois provinces, trois recompositions : extension de la droite loyaliste et fragmentation du centre dans le Sud, UC devant l’UNI dans le Nord, recul de la participation et affirmation de Nation autochtone aux Îles. Partout, la moyenne provinciale cache des mouvements locaux de sens opposés.

Données : résultats officiels par bureau de vote (Haut-commissariat), contrôlés contre les totaux provinciaux ; 122 bureaux comparables dans le Sud, 78 dans le Nord, 41 aux Îles.

https://contours.nc/posts/provinciales-2026-geographie-forces-politiques/

### TikTok / Reels (légende courte)

2019 → 2026 : la carte politique calédonienne a bougé, mais pas partout dans le même sens. Sud, Nord, Îles : trois recompositions en huit écrans. Article complet sur contours.nc 🗺️ #NouvelleCalédonie #Provinciales2026 #carte

Les écrans 9:16 sont des images fixes : prévoir 3 à 4 s par écran, et 6 s pour la carte des secteurs et les essaims (écrans 3, 4 et 6).

## Textes alternatifs

1. Carte des trois provinces de la Nouvelle-Calédonie : entre 2019 et 2026, l’UC-FLNKS gagne 3,9 points dans le Nord, la participation recule de 11,6 points aux Îles et la droite loyaliste gagne 9,5 points dans le Sud.
2. Carte lissée de la province Sud : la droite loyaliste passe de 40,6 % à 50,1 % des suffrages exprimés et progresse dans la plupart des communes, notamment à Poya Sud (+29,3 points), Farino (+23,7) et Nouméa (+10,1).
3. Carte des 57 secteurs électoraux de Nouméa colorés selon l’évolution de la droite loyaliste dans leur bureau : elle progresse dans 53 secteurs ; dans toute la commune, elle passe de 50,4 % à 60,5 %.
4. Essaim des 122 bureaux comparables de la province Sud, placés selon l’évolution du centre non-indépendantiste en points : 115 reculent, 7 progressent ; dans la province, le centre passe de 18,5 % à 12,1 % (−6,4 points).
5. Carte lissée de la province Nord : l’UC passe de 36,0 % à 39,9 % et l’UNI de 38,5 % à 35,7 % ; l’UC progresse le plus à Houaïlou (+18,9 points) et avance à Touho (+10,3).
6. Essaim des 41 bureaux comparables de la province des Îles, placés selon l’évolution de l’abstention en points : elle augmente dans 39 bureaux ; la participation passe de 66,5 % à 54,9 %.
7. Carte lissée de la province des Îles : Nation autochtone obtient 62,8 % à Maré, 24,2 % à Ouvéa et 11,8 % à Lifou en 2026, soit 32,2 % dans la province contre 11,0 % pour la Dynamique autochtone en 2019.
8. Écran final : les moyennes provinciales cachent des mouvements locaux de sens opposés ; les cartes montrent où les rapports de force ont changé, pas comment chaque électeur a voté. Adresse contours.nc, lien en bio.

## Sources

- Résultats des provinciales 2026 par bureau de vote et résultats définitifs 2019 : Haut-commissariat de la République en Nouvelle-Calédonie.
- Traitements, regroupements politiques et appariement des bureaux : article contours.nc, section « Méthode ».
