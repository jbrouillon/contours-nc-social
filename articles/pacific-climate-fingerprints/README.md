# Campagne — Empreintes climatiques du Pacifique

Dataviz : https://contours.nc/posts/pacific-climate-fingerprints/

Six écrans qui suivent le récit de la dataviz : 2025 (la mer est plus chaude que sa référence dans tous les territoires cartographiés), le retour en 1960 (comptage annuel), les pluies qui divergent, le niveau marin, l’empreinte de la Nouvelle-Calédonie, puis la méthode et l’appel à explorer.

## Fichiers

- `source.html`, `visuels.js` : source reproductible (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `donnees/` : copie de `climate_interactive.csv` et `eez.geojson` publiés par le site, avec `provenance.json`. Les chiffres sont recalculés avec les règles de `climate-map-interactive.js` : 21 territoires cartographiés (Pitcairn n’a pas de polygone), territoire « au-dessus » si l’anomalie est > 0, pluie « nettement » plus humide ou plus sèche au-delà de deux erreurs-types publiées, aucune interpolation.
- `portrait-4x5/`, `carre-1x1/`, `vertical-9x16/` : six écrans ; `paysage-1.91x1/` : écran 1 pour un partage de lien.

Les textes parlent de température (« plus chaude que sa référence »), jamais de couleur. Les cartes nomment quelques repères (Papouasie-Nouvelle-Guinée, Fidji, Polynésie française, Nouvelle-Calédonie) et leur légende indique le sens de l’échelle (« plus froide / plus chaude », « plus sec / plus humide »). L’écran 01 rappelle que la carte couvre 21 territoires sur les 22 de l’atlas (Pitcairn n’est pas cartographié) ; les deux nombres sont calculés depuis les données. En 9:16 et dans l’aperçu de lien, les titres longs sont raccourcis.

## Régénérer

```powershell
python scripts/importer_donnees_site.py --sortie articles/pacific-climate-fingerprints/donnees `
  assets/data/pacific-climate-fingerprints/climate_interactive.csv `
  assets/data/pacific-climate-fingerprints/eez.geojson
python scripts/exporter_visuels.py html articles/pacific-climate-fingerprints/source.html `
  --sortie articles/pacific-climate-fingerprints --prefixe empreintes-climatiques `
  --formats portrait-4x5 carre-1x1 vertical-9x16 --force
python scripts/exporter_visuels.py html articles/pacific-climate-fingerprints/source.html `
  --sortie articles/pacific-climate-fingerprints --prefixe empreintes-climatiques `
  --formats paysage-1.91x1 --slides 1 --force
```

## Points de vigilance

- Les couleurs sont des écarts à la référence propre de chaque territoire, jamais des climats absolus : ne pas écrire « le Pacifique a gagné x °C ».
- Le niveau marin est publié dans `climate_interactive.csv` par pas de 10 cm : le visuel se limite au nombre de territoires au-dessus de leur référence, sans valeur en centimètres.
- Les anomalies de pluie sont des écarts, pas des cumuls : aucune valeur en millimètres n’est citée.
- Le comptage de 1960 (aucun territoire au-dessus de sa référence) est celui qu’affiche la carte animée de la dataviz pour cette année.
- Dans les deux histogrammes de comptage, « en dessous de la référence » est gris : le bleu signifie « plus froid » pour la mer mais « plus haut » pour le niveau marin, et ne doit pas changer de sens d’un écran à l’autre du carrousel.

## Textes proposés

### Facebook / Instagram (carrousel)

En 2025, la mer est plus chaude que sa référence dans tous les territoires cartographiés du Pacifique 🌊

Dans les 21 territoires de la carte, la mer était plus chaude que leur propre référence locale. En 1960, aucun ne l’était.
Mais le Pacifique ne suit pas une trajectoire unique : en 2025, 10 territoires sont nettement plus humides que leur normale, 9 nettement plus secs.

Et la Nouvelle-Calédonie ? Mer +0,8 °C et terres +0,7 °C au-dessus de leur référence en 2025, pluies nettement inférieures à la normale.

Explorez les 22 empreintes climatiques (FR/EN) : lien en bio / en commentaire.
https://contours.nc/posts/pacific-climate-fingerprints/

Sources : Pacific Data Hub (CPS), NOAA. Soumission de contours.nc au Pacific Dataviz Challenge 2026.

#Pacifique #NouvelleCalédonie #ChangementClimatique #DataViz #Océanie

### LinkedIn

Un même Pacifique, vingt-deux empreintes climatiques.

Pour le Pacific Dataviz Challenge 2026, contours.nc a aligné jusqu’à quatre signaux observés (température de la mer, des terres, pluies, niveau marin) pour 22 territoires, chacun comparé à sa propre référence. Le réchauffement est désormais commun : les 21 territoires cartographiés sont au-dessus de leur référence de température de la mer en 2025, contre aucun en 1960. Les pluies, elles, divergent. Ce sont des observations, pas des prévisions.

Données : Pacific Data Hub (CPS) et NOAA ; valeurs annuelles, sans interpolation.

https://contours.nc/posts/pacific-climate-fingerprints/

### English caption (regional audience)

In 2025, the sea was warmer than its own reference in all 21 mapped Pacific territories, against none in 1960. Rainfall, however, diverges. Explore 22 climate fingerprints (EN/FR), contours.nc’s entry to the 2026 Pacific Dataviz Challenge. Data: Pacific Data Hub (SPC), NOAA.
https://contours.nc/posts/pacific-climate-fingerprints/

### TikTok / Reels (légende courte)

1960 → 2025 : une mer plus chaude que sa référence dans les 21 territoires cartographiés 🌡️ Et pourquoi la pluie ne suit pas la même trajectoire partout. Dataviz complète sur contours.nc #Pacifique #climat #NouvelleCalédonie

## Textes alternatifs

1. Carte des zones économiques du Pacifique selon l’écart de température de surface de la mer à la référence en 2025 : les 21 territoires cartographiés sur les 22 de l’atlas sont plus chauds que leur référence locale, dont la Nouvelle-Calédonie (+0,8 °C).
2. Histogramme annuel de 1960 à 2025 : nombre de territoires où la mer est plus chaude ou plus froide que leur référence ; aucun plus chaud en 1960, les 21 en 2025. Sur les terres, 20 plus chauds en 2025 et aucun plus froid.
3. Carte du Pacifique des pluies en 2025 : 10 territoires nettement plus humides que leur normale, 9 nettement plus secs, 2 proches de la normale.
4. Histogramme annuel du niveau marin de 1993 à 2023 : le nombre de territoires où la mer est plus haute que sa référence augmente jusqu’aux 21 en 2023.
5. Empreinte climatique de la Nouvelle-Calédonie : quatre rubans d’années pour la mer et les terres depuis 1850, les pluies depuis 1979 et le niveau marin depuis 1993 ; les années récentes de la mer et des terres sont plus chaudes que la référence ; mer +0,8 °C et terres +0,7 °C en 2025.
6. Écran final : 22 territoires, 22 empreintes climatiques à explorer sur contours.nc (lien en bio) ; chaque territoire est comparé à sa propre référence ; ce sont des observations et non des prévisions.

## Sources

- Pacific Data Hub (CPS), `DF_CLIMATE_CHANGE` : anomalies annuelles par territoire (température de la mer et des terres, pluies, niveau marin).
- Zones économiques exclusives : couche simplifiée publiée par le site (`assets/data/pacific-climate-fingerprints/eez.geojson`).
- Méthode et précautions : `assets/data/pacific-climate-fingerprints/SOURCES.md` du site.
