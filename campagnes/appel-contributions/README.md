# Campagne — Appel à contributions

Page : https://contours.nc/contribuer/

Six écrans qui reprennent la page « Contribuer » du site : l’appel, les cinq formats, ce qu’il faut pour un premier échange, les quatre étapes, les publics, puis le contact. Tous les textes viennent de la page ; aucune promesse supplémentaire (délai, rémunération, sélection) n’est ajoutée.

Elle remplace, pour les nouveaux réseaux, la campagne Facebook de 2026 (`campagnes/appel-contributions-facebook/`), en reprenant le gabarit commun des campagnes d’article.

## Fichiers

- `source.html`, `visuels.js` : source reproductible (gabarit `assets/css/campagne-article.css`, contour de la Nouvelle-Calédonie `assets/data/nc_logo.geojson`).
- `portrait-4x5/`, `carre-1x1/`, `vertical-9x16/` : six écrans ; `paysage-1.91x1/` : écran 1 pour un partage de lien.
- `video/appel-contributions-muet.mp4` : vidéo TikTok muette (37 s, outro comprise) ; le son est ajouté dans l’application (mode « rappel » de Buffer).

## Régénérer

```powershell
python scripts/exporter_visuels.py html campagnes/appel-contributions/source.html `
  --sortie campagnes/appel-contributions --prefixe appel-contributions `
  --formats portrait-4x5 carre-1x1 vertical-9x16 --force
python scripts/exporter_visuels.py html campagnes/appel-contributions/source.html `
  --sortie campagnes/appel-contributions --prefixe appel-contributions `
  --formats paysage-1.91x1 --slides 1 --force
python scripts/produire_video.py campagnes/appel-contributions/vertical-9x16 `
  --sortie campagnes/appel-contributions/video/appel-contributions-muet.mp4 `
  --durees 4.5,6,5.5,6,5.5,5 --outro campagnes/lancement-tiktok/contours-nc-outro.mp4 --force
```

## Textes proposés

### Facebook

Vous travaillez sur la Nouvelle-Calédonie ou le Pacifique ? ✍️

Une analyse, des données, une carte, une visualisation, des résultats de recherche à partager ? contours.nc est ouvert aux contributions extérieures.

🔹 Note de recherche, carte ou datavisualisation, éclairage, données et méthodes, travail issu d’un mémoire, d’une thèse ou d’un stage.
🔹 Pas besoin d’un article déjà rédigé : quelques lignes suffisent pour présenter le sujet, ce que vous souhaitez montrer et les sources mobilisées.
🔹 Le format se discute ensuite, la contribution est relue, puis publiée avec son autrice ou son auteur clairement identifié.

Chercheurs, doctorants, étudiants, professionnels, experts, producteurs de données : toutes les disciplines sont bienvenues dès lors que l’éclairage est documenté.

👉 https://contours.nc/contribuer/ · contributions@contours.nc

Partagez à qui pourrait être concerné 🙏

#NouvelleCalédonie #Pacifique #Recherche #SciencesSociales #DataViz

### Instagram (carrousel)

Même texte, en remplaçant l’adresse du site par : « Formats, étapes et contact : lien en bio. »

### TikTok (légende courte)

Vous travaillez sur la Nouvelle-Calédonie ou le Pacifique ? contours.nc publie aussi vos recherches, cartes et données. Quelques lignes suffisent pour commencer ✍️ #NouvelleCalédonie #recherche #Pacifique

## Textes alternatifs

1. Appel à contributions de contours.nc : « Vous travaillez sur la Nouvelle-Calédonie ou le Pacifique ? » ; croquis de la Nouvelle-Calédonie entouré de quatre fiches : note de recherche, carte, données, datavisualisation.
2. Cinq formats de contribution : note de recherche, carte ou datavisualisation, éclairage, données et méthodes, travail issu d’un mémoire, d’une thèse ou d’un stage.
3. Une idée suffit pour un premier échange : le sujet ou la question, ce que vous souhaitez montrer, les données ou sources mobilisées, éventuellement un lien vers un travail existant.
4. Quatre étapes : proposition, échange sur le format, préparation et relecture, publication avec l’auteur ou l’autrice clairement identifié.
5. Qui peut contribuer : chercheurs, doctorants, postdoctorants, jeunes chercheurs, étudiants, professionnels, experts, producteurs de données ; contours.nc n’est pas une revue académique mais un espace complémentaire.
6. Contact : contributions@contours.nc et contours.nc/contribuer (lien en bio).
