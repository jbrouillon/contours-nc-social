# Campagne — Pourquoi la population se concentre autour de Nouméa ?

Article (note de recherche 2026-06) : https://contours.nc/posts/concentration-population-noumea-pacifique/

Huit écrans qui suivent l’article : la carte des communes en cercles (couverture), la carte animée figée à quatre recensements, le changement d’échelle (Nouméa seule / Grand Nouméa), les migrations internes, les arrivées de l’extérieur, le décalage entre lieu d’habitation et lieu de travail, la comparaison avec le Pacifique, puis l’appel à lire.

La vidéo TikTok s’ouvre sur la **carte animée** de l’article (communes en cercles, 1956 → 2019), puis reprend les écrans 03 à 08 et se termine par l’outro animée de contours.nc.

Elle remplace un premier jet du 9 octobre, capturé depuis le dialogue « En bref » du site (en-tête « Lecture express », croquis réduits, sans source ni légende). Ce premier jet est conservé hors suivi dans `_essais/codex-en-bref/`.

## Fichiers

- `source.html`, `visuels.js` : source reproductible des huit écrans (D3 + rough.js, gabarit `assets/css/campagne-article.css` et `assets/js/campagne-outils.js`).
- `animation.html` : la carte animée, pour la vidéo ; `visuels.js` y expose `window.dessinerCarte(p)`, capturée image par image par `scripts/produire_gif.py`.
- `donnees/` : blocs de données extraits de la page publiée de l’article par `scripts/extraire_donnees_page.py` (l’article n’a pas de fichier de données séparé), avec `provenance.json` (commit du site, empreintes SHA-256 de la page et des blocs).
- `portrait-4x5/`, `carre-1x1/`, `vertical-9x16/` : huit écrans ; `paysage-1.91x1/` : écran 1 pour un partage de lien. Les PNG 9:16 sont exportés sans folio (`folio=0`), car la vidéo ne reprend pas les écrans 01 et 02.
- `video/` : `carte-animee.mp4` (10,5 s), `musique.m4a`, `concentration-grand-noumea.mp4` (44 s).

### Règles reprises de l’article

- Grand Nouméa : Nouméa, Dumbéa, Mont-Dore et Païta ; couronne : Dumbéa, Mont-Dore et Païta. Couleurs des séries de l’article (Grand Nouméa vert, Nouméa rouge, couronne ocre).
- Carte des communes en cercles : aire proportionnelle à la population, même échelle pour toutes les années, cercles écartés de leur position réelle seulement autant que nécessaire ; jointure par la clé normalisée de l’article (`normalizeKey`). Kouaoua et Poum n’ont pas de cercle avant leur création.
- Carte animée : entre deux recensements, les cercles glissent (populations et positions interpolées linéairement), mais **l’année et la part affichées sont toujours celles du recensement le plus proche**, valeurs de l’article ; aucune valeur interpolée n’est présentée comme une donnée.
- `visuels.js` vérifie les phrases des écrans (part du Grand Nouméa croissante à chaque recensement, solde interne positif à chaque période et en tête sauf en 2009-2014, plus de huit arrivants sur dix à chaque période, rang du Grand Nouméa dans la comparaison du Pacifique) et refuse de produire un visuel si les données ne les confirment plus.
- Pacifique : seuls les territoires dont la capitale seule et l’agglomération sont renseignées sont tracés ; l’astérisque reprend le drapeau `estimation` de l’article (périmètre large, fonctionnel ou estimé).

## Régénérer

```powershell
python scripts/extraire_donnees_page.py --page docs/posts/concentration-population-noumea-pacifique/index.html `
  --sortie articles/concentration-population-noumea-pacifique/donnees `
  chart-concentration chart-migrations-internes chart-arrivees-exterieures chart-emplois-residence `
  chart-emplois-noumea-historique chart-pacifique-villes carte-population-communes
python scripts/exporter_visuels.py html articles/concentration-population-noumea-pacifique/source.html `
  --sortie articles/concentration-population-noumea-pacifique --prefixe concentration-grand-noumea `
  --formats portrait-4x5 carre-1x1 --force
python scripts/exporter_visuels.py html articles/concentration-population-noumea-pacifique/source.html `
  --sortie articles/concentration-population-noumea-pacifique --prefixe concentration-grand-noumea `
  --formats vertical-9x16 --parametre folio=0 --force
python scripts/exporter_visuels.py html articles/concentration-population-noumea-pacifique/source.html `
  --sortie articles/concentration-population-noumea-pacifique --prefixe concentration-grand-noumea `
  --formats paysage-1.91x1 --slides 1 --force
python scripts/produire_gif.py articles/concentration-population-noumea-pacifique/animation.html `
  articles/concentration-population-noumea-pacifique/video/carte-animee.mp4 `
  --largeur 1080 --hauteur 1920 --echelle 1 --ips 15 --duree 9000 --pause-finale 1500 `
  --image-par-image dessinerCarte --pret "document.documentElement.dataset.ready === 'true'" --parametre layout=tiktok
python scripts/produire_video.py articles/concentration-population-noumea-pacifique/vertical-9x16 --sans 1,2 `
  --intro articles/concentration-population-noumea-pacifique/video/carte-animee.mp4 `
  --musique articles/concentration-population-noumea-pacifique/video/musique.m4a `
  --sortie articles/concentration-population-noumea-pacifique/video/concentration-grand-noumea.mp4 `
  --durees 5,5,5,5,5.5,4 --outro campagnes/lancement-tiktok/contours-nc-outro.mp4 --force
```

`extraire_donnees_page.py` lit la page dans le commit `HEAD` du site, pas un rendu local en cours.

## Textes proposés

### Facebook

Plus de deux habitants sur trois vivent dans le Grand Nouméa 🏙️

En 2019, Nouméa, Dumbéa, Mont-Dore et Païta rassemblent 67,2 % de la population calédonienne, soit 182 341 habitants.
🔹 En 1956, la couronne (Dumbéa, Mont-Dore, Païta) comptait 2 969 habitants ; en 2019, 88 056, presque autant que Nouméa (94 285).
🔹 La part de la commune de Nouméa culmine en 1976 (42,1 %), celle du Grand Nouméa augmente à chaque recensement : la concentration ne disparaît pas, elle change d’échelle.
🔹 Le Grand Nouméa gagne des habitants sur les autres régions à chaque période depuis 1989, et plus de huit arrivants de l’extérieur sur dix s’y installent.
🔹 51,6 % des emplois sont à Nouméa, où habitent 39,1 % des personnes en emploi.
🔹 Dans le Pacifique aussi, la capitale seule donne une image trop petite de la ville : Papeete passe de 9,6 % à 44,6 % de la population avec son agglomération.

Note de recherche, carte animée des communes de 1956 à 2019 et données :
https://contours.nc/posts/concentration-population-noumea-pacifique/

#NouvelleCalédonie #Nouméa #Démographie #Urbanisation #Pacifique

### Instagram (carrousel)

Même texte, en remplaçant l’adresse par : « Analyse, carte animée et données : lien en bio. »

### TikTok (légende courte)

1956 → 2019 : comment le Grand Nouméa a fini par rassembler plus de deux habitants sur trois 🏙️ Carte animée et analyse sur contours.nc #NouvelleCalédonie #Nouméa #démographie

## Textes alternatifs

1. Carte des 33 communes de Nouvelle-Calédonie représentées par des cercles proportionnels à leur population en 2019 : les quatre cercles verts du Grand Nouméa (Nouméa, Dumbéa, Mont-Dore, Païta) dominent tous les autres et rassemblent 67,2 % des habitants ; Lifou, Koné, Maré et Bourail sont nommées.
2. Quatre cartes des communes en cercles, à la même échelle, en 1956, 1976, 1996 et 2019 : la part du Grand Nouméa passe de 36,8 % à 55,8 %, 60,4 % puis 67,2 % ; les cercles de Dumbéa, Mont-Dore et Païta grossissent jusqu’à réunir 88 056 habitants en 2019, contre 94 285 à Nouméa.
3. Courbes de 1956 à 2019 de la part de la population vivant à Nouméa, dans la couronne et dans le Grand Nouméa : Nouméa culmine à 42,1 % en 1976 puis recule à 34,7 % ; la couronne monte à 32,4 % et le Grand Nouméa à 67,2 %.
4. Barres du solde des déménagements entre grandes régions, par période de 1989 à 2019 : le Grand Nouméa gagne des habitants à chaque période (+1 524 entre 2014 et 2019), les Îles Loyauté, le Nord-Est et le Sud rural en perdent ensemble ; entre 2009 et 2014, le Nord-Ouest gagne davantage (+987).
5. Barres empilées des arrivées de l’extérieur par période de 1989 à 2019 : à chaque période, plus de huit arrivants sur dix résident ensuite dans le Grand Nouméa (85,1 % entre 2014 et 2019, soit 14 760 sur 17 350).
6. Barres comparant, pour Nouméa, la couronne et le reste du territoire, la part des personnes en emploi qui y habitent et de celles qui y travaillent en 2019 : Nouméa, 39,1 % et 51,6 % ; couronne, 34,1 % et 21,9 % ; reste du territoire, 26,8 % et 26,5 %.
7. Pour dix territoires du Pacifique, part de la population vivant dans la capitale seule et dans l’agglomération : de 9,6 % à 44,6 % pour Papeete ; le Grand Nouméa (67,2 %) est en tête, devant Palau et les Îles Marshall ; les périmètres larges ou estimés sont signalés par un astérisque.
8. Écran final : pourquoi la population se concentre-t-elle autour de Nouméa ? Carte animée des communes, naissances, déménagements, arrivées, habiter la couronne et travailler à Nouméa ; analyse sur contours.nc (lien en bio).

## Sources

- Isee : recensements de la population 1956-2019, population des communes, migrations internes et arrivées de l’extérieur, lieu de travail des personnes en emploi.
- Pacifique : instituts statistiques nationaux (ISPF, Fiji Bureau of Statistics, Samoa Bureau of Statistics, etc.) et rapport UN-Habitat *State of Urbanization in the Blue Pacific* (2025), tels que cités dans l’article.
