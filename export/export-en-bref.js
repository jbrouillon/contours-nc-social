// Prépare l'export des diapositives « En bref » sur une page publiée de
// contours.nc, sans modifier le site.
//
// Usage manuel : ouvrir l'article avec ?lecture=en-bref&slide=1&export=social,
// puis coller ce script dans la console du navigateur. Les formats de canevas
// normalisés sont portrait-4x5, carre-1x1, vertical-9x16 et paysage-1.91x1.
(() => {
  "use strict";

  const PARAMETRE_MODE = "export";
  const MODES = {
    social: "social",
    tiktok: "vertical-9x16",
    vertical: "vertical-9x16",
    "vertical-9x16": "vertical-9x16",
    portrait: "portrait-4x5",
    "portrait-4x5": "portrait-4x5",
    carre: "carre-1x1",
    "carre-1x1": "carre-1x1",
    paysage: "paysage-1.91x1",
    "paysage-1.91x1": "paysage-1.91x1"
  };
  const FORMATS_CANEVAS = new Set([
    "portrait-4x5",
    "carre-1x1",
    "vertical-9x16",
    "paysage-1.91x1"
  ]);
  const STYLE_ID = "contours-brief-export-style";
  const CLASSES = [
    "contours-brief-social-export",
    "contours-brief-tiktok-export",
    "contours-brief-canvas-export",
    "contours-brief-format-portrait-4x5",
    "contours-brief-format-carre-1x1",
    "contours-brief-format-vertical-9x16",
    "contours-brief-format-paysage-1-91x1",
    "vote-brief-social-export",
    "vote-brief-tiktok-export"
  ];

  const params = new URLSearchParams(window.location.search);
  const modeDemande = (params.get(PARAMETRE_MODE) || "social").toLowerCase();
  const mode = MODES[modeDemande];
  if (!mode) {
    console.error(
      `[contours.nc] Mode d'export inconnu : « ${modeDemande} ». ` +
      "Utiliser social, portrait-4x5, carre-1x1, vertical-9x16 ou paysage-1.91x1."
    );
    return;
  }

  const composantCommun = document.querySelector(".contours-brief-dialog");
  const composantHistorique = document.querySelector("[data-vote-brief-dialog], .vote-brief-dialog");
  const dialogue = composantCommun || composantHistorique;
  if (!dialogue) {
    console.error(
      "[contours.nc] Aucune diapositive « En bref » détectée. " +
      "Attendre le chargement complet de la page, puis relancer le script."
    );
    return;
  }

  if (dialogue.hidden) {
    console.error(
      "[contours.nc] Le résumé est fermé. Ouvrir l'article avec " +
      "?lecture=en-bref&slide=1, puis relancer le script."
    );
    return;
  }

  const css = `
/* Capture des diapositives « En bref » de contours.nc pour les réseaux
   sociaux. Compatible avec le composant commun .contours-brief-* et avec
   l'ancien composant .vote-brief-* de l'article sur les bureaux de vote. */

/* Tous les formats : panneau sans bouton de fermeture, navigation ni lien. */
body.contours-brief-social-export .contours-brief-panel,
body.vote-brief-social-export .vote-brief-panel {
  grid-template-rows: auto minmax(0, 1fr);
}

body.contours-brief-social-export .contours-brief-close,
body.contours-brief-social-export .contours-brief-nav,
body.contours-brief-social-export .contours-brief-read,
body.vote-brief-social-export .vote-brief-close,
body.vote-brief-social-export .vote-brief-nav,
body.vote-brief-social-export .vote-brief-read {
  display: none !important;
}

/* Canevas normalisés : le panneau remplit exactement la fenêtre capturée. */
html.contours-brief-canvas-export,
html.contours-brief-canvas-export body {
  background: #fffdf8;
  height: 100%;
  margin: 0;
  overflow: hidden;
  width: 100%;
}

body.contours-brief-canvas-export .contours-brief-dialog,
body.contours-brief-canvas-export .vote-brief-dialog {
  background: #fffdf8;
  display: block;
  inset: 0;
  padding: 0;
}

body.contours-brief-canvas-export .contours-brief-panel,
body.contours-brief-canvas-export .vote-brief-panel {
  bottom: 0.4rem;
  box-shadow: none;
  height: auto;
  left: 0.4rem;
  max-height: none;
  max-width: none;
  min-width: 0;
  position: absolute;
  right: 0.4rem;
  top: 0.4rem;
  transform: none;
  width: auto;
}

body.contours-brief-canvas-export .contours-brief-stage,
body.contours-brief-canvas-export .vote-brief-stage {
  overflow: hidden;
}

body.contours-brief-canvas-export .contours-brief-stage .contours-brief-slide,
body.contours-brief-canvas-export .vote-brief-stage .vote-brief-slide {
  align-content: safe center;
  min-height: 100%;
}

/* Le paysage dispose de peu de hauteur : resserrer sans réduire les cartes. */
body.contours-brief-format-paysage-1-91x1 .contours-brief-header,
body.contours-brief-format-paysage-1-91x1 .vote-brief-header {
  padding-bottom: 0.45rem;
  padding-top: 0.55rem;
}

body.contours-brief-format-paysage-1-91x1 .contours-brief-stage .contours-brief-slide,
body.contours-brief-format-paysage-1-91x1 .vote-brief-stage .vote-brief-slide {
  padding-bottom: 1rem;
  padding-top: 1rem;
}

body.contours-brief-format-paysage-1-91x1 .contours-brief-copy h3,
body.contours-brief-format-paysage-1-91x1 .vote-brief-copy h3 {
  margin-bottom: 0.65rem;
}

body.contours-brief-format-paysage-1-91x1 .contours-brief-big,
body.contours-brief-format-paysage-1-91x1 .vote-brief-big {
  margin-bottom: 0.45rem;
  margin-top: 0.65rem;
}

/* Format TikTok : écran vertical, textes et croquis agrandis. */
@media (max-width: 720px) {
  body.contours-brief-tiktok-export .contours-brief-stage,
  body.vote-brief-tiktok-export .vote-brief-stage {
    display: grid;
  }

  body.contours-brief-tiktok-export .contours-brief-slide,
  body.vote-brief-tiktok-export .vote-brief-slide {
    align-content: safe center;
    min-height: 100%;
    padding: 1.1rem 1rem;
  }

  body.contours-brief-tiktok-export .contours-brief-copy h3,
  body.vote-brief-tiktok-export .vote-brief-copy h3 {
    font-size: clamp(1.65rem, 7vw, 2rem);
    line-height: 1.08;
  }

  body.contours-brief-tiktok-export .contours-brief-big,
  body.vote-brief-tiktok-export .vote-brief-big {
    font-size: clamp(2.35rem, 11vw, 3.2rem);
  }

  body.contours-brief-tiktok-export .contours-brief-copy > p:last-of-type,
  body.vote-brief-tiktok-export .vote-brief-copy > p:last-of-type {
    font-size: 1rem;
    line-height: 1.42;
  }

  body.contours-brief-tiktok-export .contours-brief-sketch,
  body.vote-brief-tiktok-export .vote-brief-sketch {
    max-height: 250px;
    max-width: 430px;
  }

  body.vote-brief-tiktok-export [data-vote-brief-sketch="mesh"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="pair9"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="time9"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="pair8"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="carpair"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="buspair"],
  body.vote-brief-tiktok-export [data-vote-brief-sketch="vehicle"] {
    max-height: 290px;
    max-width: 500px;
  }
}
`;

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;

  document.documentElement.classList.remove("contours-brief-canvas-export");
  document.body.classList.remove(...CLASSES);
  document.body.classList.add("contours-brief-social-export", "vote-brief-social-export");
  if (mode === "vertical-9x16") {
    document.body.classList.add("contours-brief-tiktok-export", "vote-brief-tiktok-export");
  }
  if (FORMATS_CANEVAS.has(mode)) {
    const classeFormat = `contours-brief-format-${mode.replace(".", "-")}`;
    document.documentElement.classList.add("contours-brief-canvas-export");
    document.body.classList.add("contours-brief-canvas-export", classeFormat);
  }

  const famille = composantCommun ? "composant commun" : "composant historique";
  const conseil = mode === "social"
    ? "Capturer le panneau visible."
    : "Le panneau remplit le canevas ; capturer la fenêtre entière.";
  document.documentElement.dataset.contoursBriefExportReady = mode;
  console.info(`[contours.nc] Export ${mode} prêt (${famille}). ${conseil}`);
})();
