// Active le mode d'export des diapositives « En bref » sur une page publiée
// de contours.nc, sans modifier le site.
//
// Usage : ouvrir l'article avec ?lecture=en-bref&slide=1, puis coller ce
// script dans la console du navigateur (ou l'injecter avec un outil de
// capture). Choisir MODE = "social" ou "tiktok" ; pour TikTok, passer la
// fenêtre en largeur mobile (720 px ou moins).
(() => {
  const MODE = "social";
  const css = `
/* Capture des diapositives « En bref » de l'article sur le regroupement des
   bureaux de vote (contours.nc), pour les réseaux sociaux.
   Repris des modifications non publiées de assets/css/habitat.css. */

/* Mode social : panneau sans bouton de fermeture, navigation ni lien. */
body.vote-brief-social-export .vote-brief-panel {
  grid-template-rows: auto minmax(0, 1fr);
}

body.vote-brief-social-export .vote-brief-close,
body.vote-brief-social-export .vote-brief-nav,
body.vote-brief-social-export .vote-brief-read {
  display: none;
}

/* Mode TikTok : écran vertical, textes et croquis agrandis. */
@media (max-width: 720px) {
  body.vote-brief-tiktok-export .vote-brief-stage {
    display: grid;
  }

  body.vote-brief-tiktok-export .vote-brief-slide {
    align-content: safe center;
    min-height: 100%;
    padding: 1.1rem 1rem;
  }

  body.vote-brief-tiktok-export .vote-brief-copy h3 {
    font-size: clamp(1.65rem, 7vw, 2rem);
    line-height: 1.08;
  }

  body.vote-brief-tiktok-export .vote-brief-big {
    font-size: clamp(2.35rem, 11vw, 3.2rem);
  }

  body.vote-brief-tiktok-export .vote-brief-copy > p:last-of-type {
    font-size: 1rem;
    line-height: 1.42;
  }

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
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  document.body.classList.add("vote-brief-social-export");
  if (MODE === "tiktok") document.body.classList.add("vote-brief-tiktok-export");
})();
