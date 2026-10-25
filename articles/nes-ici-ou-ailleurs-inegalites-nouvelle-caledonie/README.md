# Campagne — Nés ici ou en métropole : des inégalités de diplôme, d’emploi et de logement

Article : https://contours.nc/posts/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/

Huit écrans qui reprennent le résumé « En bref » de l’article, avec les mêmes chiffres et les mêmes précautions : le diplôme (couverture), la catégorie « nés ailleurs », le chômage à diplôme égal, l’année d’arrivée, les jeunes arrivés avant 16 ans, le logement, les quartiers de Nouméa, puis la lecture des chiffres et l’appel à lire l’article. Les deux écrans « chômage » et « à profil comparable » du résumé sont réunis en un seul (écran 03).

L’angle : comparer les personnes nées en Nouvelle-Calédonie et celles nées en métropole, et non un bloc « nés ailleurs » qui mêle des situations opposées (écran 02). Les écarts sont nets en 2019 et ne s’expliquent ni par l’âge et le sexe, ni entièrement par le diplôme. La campagne n’introduit aucun indicateur ni aucune méthode absents de l’article.

**Vocabulaire.** « Nés en métropole » désigne la modalité « métropole, DOM ou autre territoire français » du recensement, qui ne peut pas être détaillée : la couverture le précise (« “Nés en métropole” inclut les DOM »). Pour le grand public, les IRIS de l’Isee sont appelés « zones » ; le pied de page de l’écran 07 précise « 1 zone = 1 IRIS, petit secteur du recensement · tous âges ».

**Précautions.** Le lieu de naissance n’est pas une appartenance communautaire (écran 08) ; les écarts ne disent rien de leurs causes (« un marqueur de trajectoires, pas une cause ») ; les données datent de 2019, avant mai 2024. La carte de l’écran 07 décrit des zones, pas des personnes.

## Fichiers

- `source.html`, `visuels.js` : source reproductible (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `donnees/` : copie de cinq fichiers publiés par l’article (`profils-25-64-ans.csv`, `diplome-egal.csv`, `generations-installation.csv`, `iris-origines.csv`, `iris-origines.json`) avec `provenance.json` (commit du site, SHA-256). Importés au commit de publication de l’article (`feca9d8`, 25 octobre 2026).
- `portrait-4x5/`, `carre-1x1/`, `vertical-9x16/` : huit écrans ; `paysage-1.91x1/` : écran 1 pour un partage de lien.
- `video/nes-ici-metropole-muet.mp4` : 41 s, huit écrans puis l’outro animée, sans son (17,4 Mo).

### Règles reprises de l’article

- Groupes, couleurs et formes : vert et rond pour les natifs, bleu et carré pour les personnes nées en métropole, couleurs des lieux de naissance et des périodes d’installation de `assets/js/nes-ici-venus-dailleurs.js`.
- Arrondis : une décimale sous 10 %, un entier au-delà, comme les figures et le texte de l’article.
- Taux « à âge et sexe comparables » et « à âge, sexe et diplôme comparables » : colonnes publiées par `analysis.R` (`taux_age_sexe_identiques`, lignes « Ensemble, à âge, sexe et diplôme identiques »), sans recalcul.
- Carte : seuils et couleurs de l’indicateur `pct_metro` de l’article (2, 5, 10, 20 et 40 %), emprise `vue_gn` du fichier de l’article, 155 IRIS habités sur 162. Les effectifs par zone sont retrouvés à partir des parts publiées (arrondies à quatre décimales) ; l’erreur reste très inférieure à une personne.
- `visuels.js` vérifie chaque phrase chiffrée des écrans (« plus de quatre fois », « les deux tiers », « plus des deux tiers de l’écart », « près de quatre fois », « toutes à Nouméa », sens de chaque écart, ordre des lieux de naissance et des périodes) et refuse de produire un visuel si les données ne la confirment plus.

## Régénérer

```powershell
$S = "posts/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/data"
python scripts/importer_donnees_site.py --sortie articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/donnees `
  "$S/profils-25-64-ans.csv" "$S/diplome-egal.csv" "$S/generations-installation.csv" "$S/iris-origines.csv" "$S/iris-origines.json"
python scripts/exporter_visuels.py html articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/source.html `
  --sortie articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie --prefixe nes-ici-metropole `
  --formats portrait-4x5 carre-1x1 vertical-9x16 --force
python scripts/exporter_visuels.py html articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/source.html `
  --sortie articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie --prefixe nes-ici-metropole `
  --formats paysage-1.91x1 --slides 1 --force
python scripts/produire_video.py articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/vertical-9x16 `
  --sortie articles/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/video/nes-ici-metropole-muet.mp4 `
  --durees 5,4.5,5,4.5,5,4.5,5,4 --outro campagnes/lancement-tiktok/contours-nc-outro.mp4 --force
```

Sous Windows, si la console refuse la flèche « → » des messages de `importer_donnees_site.py`, définir `$env:PYTHONIOENCODING = "utf-8"`.

### Son : à ajouter dans l’application

Seule la **version muette** est produite : le son est ajouté dans TikTok (ou Instagram pour un Reel) au moment de la publication, avec un morceau calédonien de la bibliothèque musicale de l’application (par exemple Gurejele, kaneka de Maré), qui en détient la licence. La publication Buffer se fait donc en mode « rappel ». Ne jamais intégrer à la vidéo un enregistrement commercial récupéré ailleurs.

## Textes proposés

### Facebook

Nés ici ou en métropole : des écarts nets de diplôme, d’emploi et de logement 📊

Nous avons exploité le recensement de 2019, qui compte 144 526 personnes de 25 à 64 ans :
🔹 Diplôme : 9,3 % des personnes nées en Nouvelle-Calédonie ont un bac +3 ou plus, contre 43 % de celles nées en métropole. À âge et sexe comparables, l’écart ne bouge presque pas.
🔹 « Nés ailleurs » mêle des situations opposées : 3,3 % de bac +3 parmi les personnes nées à Wallis-et-Futuna, 43 % parmi celles nées en métropole.
🔹 Emploi : 15 % des actifs nés ici se déclarent au chômage, contre 3,2 %. L’écart se retrouve à chaque niveau de diplôme.
🔹 Même arrivés avant 16 ans, les 25-34 ans nés en métropole ont près de quatre fois plus souvent un bac +3 que les natifs du même âge (41 % contre 11 %).
🔹 Logement : 21 % des natifs vivent dans un logement surpeuplé, contre 5,4 %. Seule la propriété joue en leur faveur (67 % contre 50 %).
🔹 Quartiers : dix zones de Nouméa comptent au moins 40 % d’habitants nés en métropole.

Le lieu de naissance n’est ni une appartenance communautaire, ni une cause : c’est un marqueur de trajectoires. « Nés en métropole » inclut les DOM, et les données datent de 2019, avant mai 2024.

L’article, les figures interactives et les données :
https://contours.nc/posts/nes-ici-ou-ailleurs-inegalites-nouvelle-caledonie/

#NouvelleCalédonie #Recensement #Inégalités #Emploi #DataViz

### Instagram (carrousel)

Même texte, en remplaçant l’adresse par : « Article, figures et données : lien en bio. »

### TikTok (légende courte)

Nés ici ou en métropole : diplôme, chômage, logement, quartiers. Ce que montre le recensement de 2019, et ce qu’il ne dit pas. Article sur contours.nc 📊 #NouvelleCalédonie #recensement #inégalités

## Textes alternatifs

1. Barres comparant les 25-64 ans nés en Nouvelle-Calédonie et ceux nés en métropole ou dans un DOM en 2019 : 9,3 % des premiers ont un bac +3 ou plus, contre 43 % des seconds ; 26 % des premiers n’ont aucun diplôme, contre 3,8 % des seconds. À âge et sexe comparables : 9,2 % contre 43 %.
2. Barres de la part des 25-64 ans diplômés d’un bac +3 ou plus selon le lieu de naissance en 2019 : 43 % pour la métropole ou un DOM, 29 % pour l’étranger, 11 % pour la Polynésie française, 9,3 % pour la Nouvelle-Calédonie et 3,3 % pour Wallis-et-Futuna ; 16 % pour l’ensemble. Les personnes nées en métropole forment les deux tiers des 25-64 ans nés hors du pays.
3. Pour chacun des six niveaux de diplôme, chômage déclaré des actifs nés en Nouvelle-Calédonie et de ceux nés en métropole en 2019 : 24 % contre 8,0 % sans diplôme, 18 % contre 4,4 % avec le CEP ou le brevet, 19 % contre 5,3 % avec un CAP ou un BEP, 11 % contre 4,1 % avec le baccalauréat, 5,5 % contre 2,9 % avec un bac +2, 4,0 % contre 2,0 % avec un bac +3 ou plus. Ensemble : 15 % contre 3,2 % ; à âge, sexe et diplôme comparables, 13 % contre 5,1 %.
4. Barres de la part des diplômés d’un bac +3 ou plus parmi les personnes nées en métropole selon leur année d’arrivée en 2019 : 48 % pour 2015-2019, 46 % pour 2005-2014, 43 % pour 1990-2004 et 35 % avant 1990, contre 9,3 % pour les natifs. Parmi les arrivées de 2015-2019, 46 % des personnes en emploi travaillent dans le secteur public, contre 24 % des natifs.
5. Barres de la part des 25-34 ans diplômés d’un bac +3 ou plus en 2019 : 11 % des natifs, 41 % des personnes nées en métropole arrivées avant 16 ans, 42 % de celles arrivées à 16-24 ans et 55 % de celles arrivées à 25 ans ou plus.
6. Barres comparant les 25-64 ans nés en Nouvelle-Calédonie et ceux nés en métropole en 2019 : logement surpeuplé, 21 % contre 5,4 % ; logement sans internet, 48 % contre 6,3 % ; ménage propriétaire de son logement, 67 % contre 50 %.
7. Carte des zones de recensement du Grand Nouméa selon la part des habitants nés en métropole ou dans un DOM en 2019 : les dix zones où cette part atteint au moins 40 %, cerclées de noir, sont toutes dans le sud de la commune de Nouméa (Anse Vata, Val Plaisance, Ouémo…) ; elles regroupent 24 % des personnes nées en métropole, contre 3,5 % des natifs. Dans 52 zones du pays, dont 33 dans le Nord ou aux îles Loyauté, ces personnes représentent moins de 2 % des habitants.
8. Écran final : le lieu de naissance est un marqueur de trajectoires, pas une cause, et ne dit pas l’appartenance communautaire ; données de 2019, avant mai 2024. Bande de la répartition des 144 526 personnes de 25 à 64 ans : 72 % nées en Nouvelle-Calédonie, 18 % en métropole ou dans un DOM, 9,4 % à l’étranger, à Wallis-et-Futuna ou en Polynésie française. Article, figures et données sur contours.nc (lien en bio).

## Sources

- Isee, recensement de la population 2019, fichiers détaillés Individus et Logements ; PopGIS3 Nouvelle-Calédonie, IRIS du RGP 2019.
- Indicateurs, champs et méthode : article contours.nc, section « Données et méthode ».
