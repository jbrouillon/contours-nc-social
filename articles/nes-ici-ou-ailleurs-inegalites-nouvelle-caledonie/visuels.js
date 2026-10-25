// Campagne « Nés ici ou en métropole : des inégalités de diplôme, d'emploi et
// de logement ». Les chiffres viennent des fichiers publiés par l'article
// (donnees/, voir provenance.json) ; les groupes, couleurs, seuils de la carte
// et règles d'arrondi sont ceux de l'article (assets/js/nes-ici-venus-dailleurs.js
// et analysis.R du site). Chaque phrase chiffrée des écrans est vérifiée dans
// values() : si les données ne la confirment plus, aucun visuel n'est produit.
(() => {
  "use strict";

  const { label, roughPath, roughLine, roughRect, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const noData = "#d6d0c4";
  const colorNc = "#2f6b45";
  const colorMetro = "#2f5673";
  const colorEnsemble = "#c54832";
  const TERRITOIRE = "Nouvelle-Calédonie";
  const NC = "Nés en Nouvelle-Calédonie";
  const METRO = "Métropole ou DOM";
  const HORS = "Nés hors de Nouvelle-Calédonie";
  const ENSEMBLE = "Ensemble des 25-64 ans";

  // Lieux de naissance, couleurs de l'article (ORIGINS).
  const ORIGINS = [
    { groupe: "Nouvelle-Calédonie", label: "Nouvelle-Calédonie", color: colorNc },
    { groupe: METRO, label: "Métropole ou DOM", color: colorMetro },
    { groupe: "Étranger", label: "Étranger", color: "#887c3b" },
    { groupe: "Polynésie française", label: "Polynésie française", color: "#c98d63" },
    { groupe: "Wallis-et-Futuna", label: "Wallis-et-Futuna", color: "#a8633f" }
  ];
  // Périodes de la dernière installation (DURATIONS de l'article).
  const PERIODS = [
    { groupe: "Arrivés en 2015-2019", label: "2015-2019", color: "#1c3a52" },
    { groupe: "Arrivés en 2005-2014", label: "2005-2014", color: "#2f5673" },
    { groupe: "Arrivés en 1990-2004", label: "1990-2004", color: "#5f84a5" },
    { groupe: "Arrivés avant 1990", label: "avant 1990", color: "#94b0c9" }
  ];
  const AGE_ARRIVAL = [
    { groupe: "Arrivés avant 16 ans", label: ["Nés en métropole,", "arrivés avant 16 ans"] },
    { groupe: "Arrivés à 16-24 ans", label: ["Nés en métropole,", "arrivés à 16-24 ans"] },
    { groupe: "Arrivés à 25 ans ou plus", label: ["Nés en métropole,", "arrivés à 25 ans ou plus"] }
  ];
  const INDICATORS = {
    bac3: "Diplômés d’un bac +3 ou plus",
    sans_diplome: "Sans aucun diplôme",
    surpeuplement: "Logement surpeuplé",
    sans_internet: "Logement sans accès à internet",
    proprietaire: "Ménage propriétaire de son logement"
  };
  const DIPLOMAS = ["Aucun diplôme", "CEP ou brevet", "CAP ou BEP", "Baccalauréat", "Bac +2", "Bac +3 ou plus"];
  // Carte des IRIS : seuils et couleurs de l'indicateur pct_metro de l'article.
  const MAP = {
    key: "pct_metro",
    label: "Habitants nés en métropole ou dans un DOM",
    thresholds: [2, 5, 10, 20, 40],
    colors: ["#eef2f5", "#d4e0ea", "#a9c2d6", "#7a9fbd", "#4f7a9e", "#2f5673"]
  };
  const SEUIL_FORT = 40;
  const SEUIL_FAIBLE = 2;

  // Comme l'article : une décimale sous 10 %, un entier au-delà.
  const f0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const f1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (x) => `${Math.abs(x) < 10 ? f1.format(x) : f0.format(x)} %`;
  const int = (x) => f0.format(x);
  const LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
  const lettres = (n) => (n >= 0 && n <= 10 ? LETTRES[n] : String(n));
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  // --- Données ---------------------------------------------------------------

  // d3 attend des anneaux extérieurs dans le sens horaire : tout polygone qui
  // couvrirait plus d'un hémisphère est retourné (comme rewindGeometry dans
  // l'article).
  function rewindGeometry(g) {
    const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
    const fix = (polygon) => (d3.geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI ? flip(polygon) : polygon);
    if (!g) return g;
    if (g.type === "Polygon") return { ...g, coordinates: fix(g.coordinates) };
    if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map(fix) };
    if (g.type === "GeometryCollection") return { ...g, geometries: g.geometries.map(rewindGeometry) };
    return g;
  }
  const rewind = (features) => features.map((f) => ({ ...f, geometry: rewindGeometry(f.geometry) }));

  function polygonsOf(features) {
    const out = [];
    const visit = (g) => {
      if (!g) return;
      if (g.type === "Polygon") out.push(g.coordinates);
      else if (g.type === "MultiPolygon") out.push(...g.coordinates);
      else if (g.type === "GeometryCollection") g.geometries.forEach(visit);
    };
    features.forEach((f) => visit(f.geometry));
    return out;
  }

  function load() {
    return Promise.all([
      d3.csv("donnees/profils-25-64-ans.csv", d3.autoType),
      d3.csv("donnees/diplome-egal.csv", d3.autoType),
      d3.csv("donnees/generations-installation.csv", d3.autoType),
      d3.csv("donnees/iris-origines.csv", d3.autoType),
      d3.json("donnees/iris-origines.json")
    ]).then(([profils, diplome, generations, irisRows, bundle]) => {
      const iris = rewind(bundle.iris.features);
      check(iris.length === 162 && irisRows.length === 162, "162 IRIS attendus");
      return { profils, diplome, generations, irisRows, iris, terreGn: rewind(bundle.terre_gn.features), vue: bundle.vue_gn };
    });
  }

  // Valeur d'un indicateur pour un groupe. Les natifs figurent dans deux
  // regroupements, avec des valeurs identiques (comme v() dans analysis.R).
  function accessor(profils) {
    return (groupe, indicateur, col = "taux") => {
      const found = [...new Set(profils
        .filter((r) => r.territoire === TERRITOIRE && r.groupe === groupe && r.indicateur === indicateur)
        .map((r) => r[col]))];
      check(found.length === 1 && Number.isFinite(found[0]), `Valeur introuvable : ${groupe} · ${indicateur} · ${col}`);
      return found[0];
    };
  }
  const oa = (naissance, anciennete) => `${naissance} · ${anciennete}`;

  function generation(data, groupe, indicateur, col = "taux") {
    const rows = data.generations.filter((r) => r.regroupement === "age_arrivee" && r.classe_age === "25-34" &&
      r.groupe === groupe && r.indicateur === indicateur);
    check(rows.length === 1, `Case introuvable : 25-34 · ${groupe} · ${indicateur}`);
    return rows[0][col];
  }

  function diplomaRate(data, niveau, groupe) {
    const rows = data.diplome.filter((r) => r.indicateur === "chomage" && r.niveau === niveau && r.groupe === groupe);
    check(rows.length === 1, `Chômage introuvable : ${niveau} · ${groupe}`);
    return rows[0].taux;
  }

  // Effectifs par IRIS, retrouvés à partir des parts publiées (arrondies à
  // 4 décimales) : l'erreur reste très inférieure à une personne.
  function irisCounts(data) {
    return data.irisRows.filter((r) => r.population > 0).map((r) => ({
      ...r,
      nes_metro: Math.round(r.population * r.pct_metro / 100),
      nes_nc: Math.round(r.population * (100 - r.pct_hors) / 100)
    }));
  }

  function values(data) {
    const v = accessor(data.profils);

    // 01 Diplôme : « plus de quatre fois » ; l'âge et le sexe ne changent
    // « presque pas » l'écart (moins d'un point, comme dans analysis.R).
    const bac3Nc = v(NC, "bac3");
    const bac3Metro = v(METRO, "bac3");
    check(bac3Metro / bac3Nc > 4 && bac3Metro / bac3Nc < 5, "Écran 01 : revoir « plus de quatre fois »");
    const gapStd = v(METRO, "bac3", "taux_age_sexe_identiques") - v(NC, "bac3", "taux_age_sexe_identiques");
    check(Math.abs(gapStd - (bac3Metro - bac3Nc)) < 1, "Écran 01 : revoir « ne bouge presque pas »");
    check(v(NC, "sans_diplome") > v(METRO, "sans_diplome"), "Écran 01 : sans diplôme");

    // 02 Lieux de naissance : Wallis-et-Futuna au plus bas, métropole au plus
    // haut ; les deux tiers des personnes nées hors du pays.
    const byOrigin = ORIGINS.map((o) => v(o.groupe, "bac3"));
    check(Math.min(...byOrigin) === v("Wallis-et-Futuna", "bac3") && Math.max(...byOrigin) === bac3Metro,
      "Écran 02 : revoir l'ordre des lieux de naissance");
    const partMetroHors = v(METRO, "bac3", "effectif_champ") / v(HORS, "bac3", "effectif_champ");
    check(Math.abs(partMetroHors - 2 / 3) < 0.02, "Écran 02 : revoir « les deux tiers »");
    check(v(HORS, "bac3") > v("Étranger", "bac3") && v(HORS, "bac3") < bac3Metro, "Écran 02 : revoir « tirent la moyenne »");

    // 03 Chômage : plus élevé chez les natifs à chaque niveau de diplôme ; à
    // âge, sexe et diplôme identiques, « plus des deux tiers » de l'écart.
    DIPLOMAS.forEach((d) => check(diplomaRate(data, d, NC) > diplomaRate(data, d, METRO), `Écran 03 : ${d}`));
    const obs = [diplomaRate(data, "Ensemble (taux observé)", NC), diplomaRate(data, "Ensemble (taux observé)", METRO)];
    const std = [diplomaRate(data, "Ensemble, à âge, sexe et diplôme identiques", NC),
      diplomaRate(data, "Ensemble, à âge, sexe et diplôme identiques", METRO)];
    check(Math.abs(obs[0] - v(NC, "chomage")) < 1e-3 && Math.abs(obs[1] - v(METRO, "chomage")) < 1e-3, "Écran 03 : taux observés");
    const kept = (std[0] - std[1]) / (obs[0] - obs[1]);
    check(kept > 2 / 3 && kept < 1, "Écran 03 : revoir « plus des deux tiers »");

    // 04 Année d'arrivée : la part baisse des arrivées récentes aux plus
    // anciennes et reste « bien plus » élevée que chez les natifs.
    const byPeriod = PERIODS.map((p) => v(oa(METRO, p.groupe), "bac3"));
    check(byPeriod.every((x, i) => i === 0 || x < byPeriod[i - 1]), "Écran 04 : la part ne baisse pas avec l'ancienneté");
    check(byPeriod[3] > 3 * bac3Nc, "Écran 04 : revoir « bien plus diplômées »");
    const publicRecent = v(oa(METRO, PERIODS[0].groupe), "public");
    check(publicRecent > v(NC, "public"), "Écran 04 : secteur public");

    // 05 Arrivés avant 16 ans (25-34 ans) : « près de quatre fois » ; tous les
    // groupes d'âge à l'arrivée dépassent les natifs.
    const enfants = generation(data, "Arrivés avant 16 ans", "bac3");
    const natifsJeunes = generation(data, NC, "bac3");
    check(enfants / natifsJeunes > 3.5 && enfants / natifsJeunes < 4, "Écran 05 : revoir « près de quatre fois »");
    check(generation(data, "Arrivés avant 16 ans", "bac3", "effectif_champ") >= 200, "Écran 05 : groupe trop petit");
    AGE_ARRIVAL.forEach((a) => check(generation(data, a.groupe, "bac3") > natifsJeunes, `Écran 05 : ${a.groupe}`));

    // 06 Logement : surpeuplement « près de quatre fois » ; « seule la
    // propriété » joue en faveur des natifs.
    const surpNc = v(NC, "surpeuplement");
    const surpMetro = v(METRO, "surpeuplement");
    check(surpNc / surpMetro > 3.5 && surpNc / surpMetro < 4, "Écran 06 : revoir « près de quatre fois »");
    check(v(NC, "sans_internet") > v(METRO, "sans_internet") && v(NC, "proprietaire") > v(METRO, "proprietaire"),
      "Écran 06 : sens des écarts");

    // 07 Zones : au moins 40 % d'habitants nés en métropole, toutes à Nouméa ;
    // part des personnes nées en métropole et des natifs qui y vivent.
    const zones = irisCounts(data);
    check(zones.length === 155, `${zones.length} IRIS habités au lieu de 155`);
    const fortes = zones.filter((z) => z.pct_metro >= SEUIL_FORT);
    check(fortes.length >= 2 && fortes.length <= 10, "Écran 07 : nombre de zones à écrire en lettres");
    check(fortes.every((z) => z.commune === "Nouméa"), "Écran 07 : une zone hors de Nouméa");
    const share = (rows, key) => d3.sum(rows, (z) => z[key]) / d3.sum(zones, (z) => z[key]) * 100;
    const faibles = zones.filter((z) => z.pct_metro < SEUIL_FAIBLE);
    const faiblesHorsSud = faibles.filter((z) => z.province !== "Province Sud");
    check(faiblesHorsSud.length > faibles.length / 2, "Écran 07 : zones faibles");

    // 08 Composition des 25-64 ans.
    const total = v(ENSEMBLE, "bac3", "effectif_champ");
    check(Math.abs(d3.sum(ORIGINS, (o) => v(o.groupe, "bac3", "effectif_champ")) - total) < 1, "Écran 08 : effectifs");

    return {
      bac3_nc: pct(bac3Nc),
      bac3_metro: pct(bac3Metro),
      bac3_nc_std: pct(v(NC, "bac3", "taux_age_sexe_identiques")),
      bac3_metro_std: pct(v(METRO, "bac3", "taux_age_sexe_identiques")),
      bac3_wf: pct(v("Wallis-et-Futuna", "bac3")),
      part_metro_hors: "les deux tiers",
      chomage_nc: pct(v(NC, "chomage")),
      chomage_metro: pct(v(METRO, "chomage")),
      chomage_nc_std: pct(std[0]),
      chomage_metro_std: pct(std[1]),
      bac3_metro_ancien: pct(byPeriod[3]),
      public_metro_recent: pct(publicRecent),
      public_nc: pct(v(NC, "public")),
      bac3_enfants: pct(enfants),
      bac3_nc_jeunes: pct(natifsJeunes),
      surpeuplement_nc: pct(surpNc),
      surpeuplement_metro: pct(surpMetro),
      proprietaire_nc: pct(v(NC, "proprietaire")),
      proprietaire_metro: pct(v(METRO, "proprietaire")),
      zones_fortes_maj: maj(lettres(fortes.length)),
      zones_fortes_chiffre: String(fortes.length),
      part_metro_fortes: pct(share(fortes, "nes_metro")),
      part_nc_fortes: pct(share(fortes, "nes_nc")),
      zones_faibles: String(faibles.length),
      zones_faibles_hors_sud: String(faiblesHorsSud.length),
      total_adultes: int(total)
    };
  }

  // --- Barres -----------------------------------------------------------------

  // Barre crayonnée : aplat léger et hachure dans la teinte du groupe.
  function bar(svg, rc, x, y, width, height, color, seed, strong = true) {
    svg.append("rect").attr("x", x).attr("y", y).attr("width", Math.max(1, width)).attr("height", height)
      .attr("fill", color).attr("fill-opacity", strong ? 0.2 : 0.12);
    roughRect(svg, rc, x, y, Math.max(2, width), height, {
      fill: color, fillStyle: "hachure", hachureAngle: -41, hachureGap: Math.max(4, height / 9), fillWeight: Math.max(1.2, height / 34),
      stroke: hatchColor(color), strokeWidth: Math.max(1.4, height / 30), roughness: 1, bowing: 0.8, seed
    });
  }

  function fontSize(width, height) {
    return Math.round(Math.max(21, Math.min(28, width / 34, height / 16)));
  }

  // Lignes de barres horizontales : libellé à gauche (une ou deux lignes),
  // barre, valeur. rows = [{ label, value, color, strong }]. before(x) dessine
  // sous les barres (trait de référence) ; header titre la colonne des libellés.
  function barRows(svg, rc, rows, { x0, x1, y0, y1, max, size, labelWidth, seedKey, before, header }) {
    if (header) {
      label(svg, header, x0, y0 + size * 0.6, { size: size * 0.92, weight: 800, color: muted });
      y0 += size * 1.6;
    }
    const step = (y1 - y0) / rows.length;
    const barH = Math.min(step * 0.58, size * 2.4);
    const x = d3.scaleLinear().domain([0, max]).range([x0 + labelWidth, x1 - size * 3.4]);
    if (before) before(x, y0, y1);
    rows.forEach((row, i) => {
      const cy = y0 + step * (i + 0.5);
      const lines = Array.isArray(row.label) ? row.label : [row.label];
      lines.forEach((line, k) => {
        label(svg, line, x0 + labelWidth - 16, cy + (k - (lines.length - 1) / 2) * size * 1.12, {
          anchor: "end", size: row.strong ? size : size * 0.92, weight: row.strong ? 800 : 700,
          color: row.strong ? (row.labelColor || row.color) : ink
        });
      });
      bar(svg, rc, x(0), cy - barH / 2, x(row.value) - x(0), barH, row.color, `${seedKey}-${i}`, row.strong);
      label(svg, pct(row.value), x(row.value) + 12, cy, { size: size * 1.12, weight: 800, color: hatchColor(row.color), halo: true });
    });
    svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", y0).attr("y2", y1).attr("stroke", ink).attr("stroke-width", 1.4);
    return x;
  }

  // Trait vertical de référence (ensemble, natifs) avec son libellé en bas.
  function referenceLine(svg, rc, x, value, y0, y1, text, color, size, seedKey) {
    roughLine(svg, rc, x(value), y0 - 6, x(value), y1 + 6, { stroke: color, strokeWidth: 2.6, roughness: 0.7, seed: seedKey });
    label(svg, text, x(value), y1 + size * 1.2, { anchor: "middle", size: size * 0.92, weight: 800, color, halo: true });
  }

  // Légende des deux groupes comparés : rond vert, carré bleu (formes de
  // l'article). Si elle ne tient pas dans la largeur, libellés courts.
  function groupLegend(svg, rc, x, y, size, seedKey, labels = ["Nés en Nouvelle-Calédonie", "Nés en métropole ou dans un DOM"]) {
    const width = +svg.attr("viewBox").split(" ")[2];
    const drawWith = (texts) => {
      const g = svg.append("g");
      let cursor = x;
      [[colorNc, texts[0], "circle"], [colorMetro, texts[1], "square"]].forEach(([color, text, shape], index) => {
        const s = size * 0.9;
        if (shape === "circle") roughCircle(g, rc, cursor + s / 2, y, s, { fill: color, fillStyle: "solid", stroke: hatchColor(color), seed: `${seedKey}-${index}` });
        else roughRect(g, rc, cursor, y - s / 2, s, s, { fill: color, fillStyle: "solid", stroke: hatchColor(color), seed: `${seedKey}-${index}` });
        const node = label(g, text, cursor + s + 10, y, { size: size * 0.92, weight: 800, color: hatchColor(color) });
        cursor += s + 10 + node.node().getComputedTextLength() + (index ? 0 : size * 1.4);
      });
      return { g, end: cursor };
    };
    const first = drawWith(labels);
    if (first.end > width) {
      first.g.remove();
      drawWith(["Nés ici", "Nés en métropole"]);
    }
  }

  const draw = {
    // Paires de barres natifs / nés en métropole, un bloc par indicateur.
    paires(svg, data, { rc, node, width, height }) {
      const v = accessor(data.profils);
      const keys = node.dataset.indicateurs.split(",");
      const size = fontSize(width, height);
      groupLegend(svg, rc, 0, size * 0.8, size, "paires-legende");
      const top = size * 2.2;
      const blockH = (height - top) / keys.length;
      const max = Math.min(100, Math.ceil(d3.max(keys, (k) => Math.max(v(NC, k), v(METRO, k))) / 10) * 10 + 10);
      const x = d3.scaleLinear().domain([0, max]).range([0, width - size * 4]);
      keys.forEach((key, b) => {
        const y = top + b * blockH;
        label(svg, INDICATORS[key], 0, y + size * 0.7, { size, weight: 800 });
        const barsTop = y + size * 1.5;
        const barH = Math.min((blockH - size * 1.5) * 0.36, size * 2.2);
        const gap = Math.min(barH * 0.32, 14);
        [[NC, colorNc], [METRO, colorMetro]].forEach(([groupe, color], i) => {
          const value = v(groupe, key);
          const by = barsTop + i * (barH + gap);
          bar(svg, rc, x(0), by, x(value) - x(0), barH, color, `paires-${key}-${i}`);
          label(svg, pct(value), x(value) + 12, by + barH / 2, { size: size * 1.12, weight: 800, color: hatchColor(color) });
        });
        svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", barsTop - 4).attr("y2", barsTop + 2 * barH + gap + 4)
          .attr("stroke", ink).attr("stroke-width", 1.4);
      });
    },

    // Bac +3 selon le lieu de naissance, avec l'ensemble des 25-64 ans.
    origines(svg, data, { rc, width, height }) {
      const v = accessor(data.profils);
      const size = fontSize(width, height);
      const rows = ORIGINS.map((o) => ({
        label: o.label, value: v(o.groupe, "bac3"), color: o.color, strong: o.groupe === "Nouvelle-Calédonie" || o.groupe === METRO
      })).sort((a, b) => b.value - a.value);
      const bottom = height - size * 2;
      const ensemble = v(ENSEMBLE, "bac3");
      barRows(svg, rc, rows, {
        x0: 0, x1: width, y0: 4, y1: bottom, max: 50, size, labelWidth: Math.min(width * 0.4, size * 11), seedKey: "origines",
        header: "Lieu de naissance",
        before: (x, top) => referenceLine(svg, rc, x, ensemble, top, bottom, `Ensemble : ${pct(ensemble)}`, colorEnsemble, size, "origines-ensemble")
      });
    },

    // Chômage par niveau de diplôme : rond vert (natifs) et carré bleu
    // (personnes nées en métropole) reliés par un trait.
    "diplome-egal"(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      groupLegend(svg, rc, 0, size * 0.8, size, "diplome-legende", ["Nés ici", "Nés en métropole"]);
      const top = size * 2.4;
      const bottom = height - size * 1.6;
      const labelWidth = Math.min(width * 0.32, size * 8.6);
      const rows = DIPLOMAS.map((d) => ({ niveau: d, nc: diplomaRate(data, d, NC), metro: diplomaRate(data, d, METRO) }));
      const max = Math.ceil(d3.max(rows, (r) => r.nc) / 10) * 10;
      // Bande réservée, entre les libellés et 0 %, aux valeurs écrites à
      // gauche des carrés bleus.
      const x = d3.scaleLinear().domain([0, max]).range([labelWidth + size * 3.4, width - size * 3]);
      d3.range(0, max + 1, 10).forEach((t) => {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top - 6).attr("y2", bottom).attr("stroke", "#d9d0c1").attr("stroke-dasharray", "3 7");
        label(svg, `${t} %`, x(t), bottom + size * 0.9, { anchor: "middle", size: size * 0.82, color: muted });
      });
      const step = (bottom - top) / rows.length;
      rows.forEach((r, i) => {
        const cy = top + step * (i + 0.5);
        label(svg, r.niveau, labelWidth - 18, cy, { anchor: "end", size: size * 0.92, weight: 700 });
        roughLine(svg, rc, x(r.metro), cy, x(r.nc), cy, { stroke: "#a39b8f", strokeWidth: 3, roughness: 0.6, seed: `egal-lien-${i}` });
        const s = size * 1.05;
        roughRect(svg, rc, x(r.metro) - s / 2, cy - s / 2, s, s, { fill: colorMetro, fillStyle: "solid", stroke: hatchColor(colorMetro), seed: `egal-metro-${i}` });
        roughCircle(svg, rc, x(r.nc), cy, s * 1.1, { fill: colorNc, fillStyle: "solid", stroke: hatchColor(colorNc), seed: `egal-nc-${i}` });
        label(svg, pct(r.nc), x(r.nc) + s * 0.9, cy, { size: size * 0.92, weight: 800, color: colorNc, halo: true });
        label(svg, pct(r.metro), x(r.metro) - s * 0.9, cy, { anchor: "end", size: size * 0.92, weight: 800, color: colorMetro, halo: true });
      });
    },

    // Personnes nées en métropole selon la période d'installation ; trait
    // vert des natifs.
    arrivees(svg, data, { rc, width, height }) {
      const v = accessor(data.profils);
      const size = fontSize(width, height);
      const rows = PERIODS.map((p) => ({
        label: p.label === "avant 1990" ? "Arrivés avant 1990" : `Arrivés en ${p.label}`,
        value: v(oa(METRO, p.groupe), "bac3"), color: p.color, strong: p.label === "avant 1990", labelColor: colorMetro
      }));
      const bottom = height - size * 2;
      const natifs = v(NC, "bac3");
      barRows(svg, rc, rows, {
        x0: 0, x1: width, y0: 4, y1: bottom, max: 50, size, labelWidth: Math.min(width * 0.36, size * 10), seedKey: "arrivees",
        header: "Personnes nées en métropole, selon l’année d’arrivée",
        before: (x, top) => referenceLine(svg, rc, x, natifs, top, bottom, `Natifs : ${pct(natifs)}`, colorNc, size, "arrivees-natifs")
      });
    },

    // 25-34 ans : natifs, puis personnes nées en métropole selon l'âge à
    // l'arrivée.
    "age-arrivee"(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const rows = [
        { label: ["Nés en", "Nouvelle-Calédonie"], value: generation(data, NC, "bac3"), color: colorNc, strong: true },
        ...AGE_ARRIVAL.map((a, i) => ({ label: a.label, value: generation(data, a.groupe, "bac3"), color: i ? "#5f84a5" : colorMetro, strong: i === 0 }))
      ];
      barRows(svg, rc, rows, {
        x0: 0, x1: width, y0: 4, y1: height - 4, max: 60, size, labelWidth: Math.min(width * 0.42, size * 12.5), seedKey: "age",
        header: "Personnes de 25 à 34 ans ayant un bac +3 ou plus"
      });
    },

    // Grand Nouméa, part des habitants nés en métropole par IRIS.
    "carte-gn"(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const legendH = size * 3.6;
      const box = [[2, 2], [width - 2, height - legendH - 8]];
      const [[x0, y0], [x1, y1]] = box;
      svg.append("rect").attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0).attr("fill", paper);
      roughRect(svg, rc, x0, y0, x1 - x0, y1 - y0, { stroke: "#b9b1a5", strokeWidth: 1.6, roughness: 1.4, seed: "carte-cadre" });
      const inner = [[x0 + 8, y0 + 8], [x1 - 8, y1 - 8]];
      const [west, south, east, north] = data.vue;
      const projection = d3.geoMercator().fitExtent(inner, { type: "MultiPoint", coordinates: [[west, south], [east, north]] });
      const path = d3.geoPath(projection);
      svg.append("defs").append("clipPath").attr("id", "clip-carte-gn").append("rect")
        .attr("x", inner[0][0]).attr("y", inner[0][1]).attr("width", inner[1][0] - inner[0][0]).attr("height", inner[1][1] - inner[0][1]);
      const g = svg.append("g").attr("clip-path", "url(#clip-carte-gn)");
      const visible = data.iris.filter((f) => {
        const b = path.bounds(f);
        return b[1][0] >= inner[0][0] && b[0][0] <= inner[1][0] && b[1][1] >= inner[0][1] && b[0][1] <= inner[1][1];
      });
      visible.forEach((feature) => {
        const p = feature.properties;
        const cls = p.population > 0 ? classOf(p[MAP.key]) : -1;
        const fill = cls < 0 ? noData : MAP.colors[cls];
        const d = path(feature);
        if (!d) return;
        g.append("path").attr("d", d).attr("fill", fill);
        if (cls >= 0) {
          roughPath(g, rc, d, {
            fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: cls ? 6.4 - cls * 0.5 : 8,
            fillWeight: 1, stroke: "none", strokeWidth: 0, roughness: 1.2, opacity: cls ? 0.45 : 0.3, seed: `carte-${p.id}`
          });
        }
      });
      g.append("path").attr("d", visible.map((f) => path(f)).join("")).attr("fill", "none")
        .attr("stroke", "#4f4942").attr("stroke-width", 0.8).attr("stroke-opacity", 0.5).attr("stroke-linejoin", "round");
      // Zones d'au moins 40 % : contour d'encre, pour les compter d'un coup d'œil.
      g.append("path").attr("d", visible.filter((f) => f.properties.population > 0 && f.properties[MAP.key] >= SEUIL_FORT).map((f) => path(f)).join(""))
        .attr("fill", "none").attr("stroke", ink).attr("stroke-width", 2.4).attr("stroke-linejoin", "round");
      const small = [];
      polygonsOf(data.terreGn).forEach((coordinates, index) => {
        const shape = { type: "Polygon", coordinates };
        const d = path(shape);
        if (!d) return;
        if (path.area(shape) < 40) small.push(d);
        else roughPath(g, rc, d, { stroke: ink, strokeWidth: 1.9, roughness: 1, bowing: 1, seed: `carte-cote-${index}` });
      });
      if (small.length) g.append("path").attr("d", small.join("")).attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1);
      calloutLabels(svg, rc, visible, path, inner, Math.max(18, Math.min(24, width / 40)),
        ["Anse Vata", "Val Plaisance", "Ouémo", "Centre-ville", "Magenta", "Rivière-Salée", "Ducos", "Koutio"]);
      drawLegend(svg, rc, 4, height - legendH + size * 0.4, width - 8, size);
    },

    // Composition des 25-64 ans selon le lieu de naissance.
    composition(svg, data, { rc, width, height }) {
      const v = accessor(data.profils);
      const total = v(ENSEMBLE, "bac3", "effectif_champ");
      const size = Math.round(Math.max(21, Math.min(27, width / 36)));
      const parts = [
        { label: "nées en Nouvelle-Calédonie", value: v("Nouvelle-Calédonie", "bac3", "effectif_champ"), color: colorNc },
        { label: "nées en métropole ou dans un DOM", value: v(METRO, "bac3", "effectif_champ"), color: colorMetro },
        { label: "nées à l’étranger, à Wallis-et-Futuna ou en Polynésie", value: d3.sum(["Étranger", "Polynésie française", "Wallis-et-Futuna"], (g) => v(g, "bac3", "effectif_champ")), color: "#a8633f" }
      ];
      // Bande et légende en lignes, centrées dans la hauteur disponible.
      const barH = 46;
      const lineH = size * 1.25;
      const content = size * 1.7 + barH + size * 0.6 + parts.length * lineH;
      const top = Math.max(0, (height - content) / 2);
      label(svg, `${int(total)} personnes de 25 à 64 ans recensées en 2019`, 0, top + size * 0.6, { size, weight: 800 });
      const y = top + size * 1.7;
      const x = d3.scaleLinear().domain([0, total]).range([0, width]);
      let cursor = 0;
      parts.forEach((p, i) => {
        bar(svg, rc, x(cursor), y, x(p.value) - x(0) - 3, barH, p.color, `composition-${i}`);
        const ly = y + barH + size * 0.6 + (i + 0.5) * lineH;
        roughRect(svg, rc, 0, ly - size * 0.35, size * 0.7, size * 0.7, { fill: p.color, fillStyle: "solid", stroke: hatchColor(p.color), seed: `composition-cle-${i}` });
        label(svg, `${pct(p.value / total * 100)} ${p.label}`, size * 1.1, ly, { size: size * 0.92, weight: 800, color: hatchColor(p.color) });
        cursor += p.value;
      });
    }
  };

  function classOf(value) {
    if (value == null || !Number.isFinite(+value)) return -1;
    return Math.min(d3.bisectRight(MAP.thresholds, +value), MAP.colors.length - 1);
  }

  // Légende de la carte : six classes, puis, à part, le gris des zones sans
  // habitant (son libellé, plus long, est aligné à droite).
  function drawLegend(svg, rc, x, y, width, size) {
    label(svg, `${MAP.label}, en % · 2019`, x, y, { size: size * 0.92, weight: 800 });
    const top = y + size * 0.8;
    const h = size * 0.9;
    const textSize = size * 0.8;
    const classesW = width * 0.8;
    const item = classesW / MAP.colors.length;
    MAP.colors.forEach((fill, i) => {
      const x0 = x + i * item;
      svg.append("rect").attr("x", x0).attr("y", top).attr("width", item - 8).attr("height", h).attr("fill", fill);
      roughRect(svg, rc, x0, top, item - 8, h, {
        fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: 6, fillWeight: 0.9,
        stroke: ink, strokeWidth: i === MAP.colors.length - 1 ? 2.4 : 0.9, roughness: 1.2, opacity: 0.7, seed: `legende-${i}`
      });
      const text = i === 0 ? `< ${MAP.thresholds[0]} %` : i === MAP.thresholds.length ? `≥ ${MAP.thresholds[i - 1]} %` : `${MAP.thresholds[i - 1]}–${MAP.thresholds[i]} %`;
      label(svg, text, x0 + (item - 8) / 2, top + size * 1.75, { anchor: "middle", size: textSize, weight: 700, color: muted });
    });
    const greyW = item * 0.6;
    svg.append("rect").attr("x", x + width - greyW).attr("y", top).attr("width", greyW).attr("height", h)
      .attr("fill", noData).attr("stroke", "#b9b1a5");
    label(svg, "sans habitant", x + width, top + size * 1.75, { anchor: "end", size: textSize, weight: 700, color: muted });
  }

  // Noms de quartier posés dans la mer, reliés à leur quartier par un trait
  // (méthode de la campagne Disparités) ; omis s'il n'y a pas de place.
  const QUARTIERS = [
    [/^Centre ville/, "Centre-ville"], [/^Anse Vata/, "Anse Vata"], [/^Ouémo/, "Ouémo"], [/^Magenta/, "Magenta"],
    [/^Val Plaisance/, "Val Plaisance"], [/^Rivière Salée/, "Rivière-Salée"], [/^Ducos$/, "Ducos"],
    [/^Koutio/, "Koutio"], [/^Boulari/, "Boulari"]
  ];

  function landMask(features, path, [[x0, y0], [x1, y1]]) {
    const width = Math.ceil(x1 - x0);
    const height = Math.ceil(y1 - y0);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.translate(-x0, -y0);
    context.beginPath();
    d3.geoPath(path.projection(), context)({ type: "FeatureCollection", features });
    context.fill();
    const pixels = context.getImageData(0, 0, width, height).data;
    return (x, y) => {
      const i = Math.round(x - x0);
      const j = Math.round(y - y0);
      if (i < 0 || j < 0 || i >= width || j >= height) return true;
      return pixels[4 * (j * width + i) + 3] > 32;
    };
  }

  function calloutLabels(svg, rc, features, path, box, size, names) {
    const isLand = landMask(features, path, box);
    const groups = d3.rollups(
      features.map((f) => [QUARTIERS.find(([pattern]) => pattern.test(f.properties.iris || ""))?.[1], f])
        .filter(([name]) => name && names.includes(name)),
      (items) => path.centroid({ type: "FeatureCollection", features: items.map(([, f]) => f) }),
      ([name]) => name
    ).sort((a, b) => names.indexOf(a[0]) - names.indexOf(b[0]));
    const pad = size * 0.25;
    const taken = [];
    const [[bx0, by0], [bx1, by1]] = box;
    const angles = d3.range(0, 360, 22.5).sort((a, b) => Math.abs(Math.cos(b * Math.PI / 180)) - Math.abs(Math.cos(a * Math.PI / 180)));
    groups.forEach(([name, [ax, ay]]) => {
      if (!Number.isFinite(ax) || ax < bx0 || ax > bx1 || ay < by0 || ay > by1) return;
      const w = name.length * size * 0.56 + size * 0.5;
      const h = size * 1.3;
      let found = null;
      for (const radius of [1.6, 2.4, 3.3, 4.4, 5.6, 7].map((k) => k * size)) {
        for (const angle of angles) {
          const cx = ax + radius * Math.cos(angle * Math.PI / 180);
          const cy = ay + radius * Math.sin(angle * Math.PI / 180);
          const r = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
          if (r[0] < bx0 + 4 || r[2] > bx1 - 4 || r[1] < by0 + 4 || r[3] > by1 - 4) continue;
          if (taken.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])) continue;
          let wet = true;
          for (let x = r[0]; x <= r[2] && wet; x += 3) {
            for (let y = r[1]; y <= r[3]; y += 3) {
              if (isLand(x, y)) { wet = false; break; }
            }
          }
          if (wet) { found = { r, cx, cy }; break; }
        }
        if (found) break;
      }
      if (!found) return;
      const { r, cx, cy } = found;
      taken.push([r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad]);
      const ex = Math.max(r[0], Math.min(ax, r[2]));
      const ey = Math.max(r[1], Math.min(ay, r[3]));
      roughLine(svg, rc, ax, ay, ex, ey, { strokeWidth: Math.max(1, size / 16), roughness: 0.6, opacity: 0.8, seed: `rappel-${name}` });
      svg.append("circle").attr("cx", ax).attr("cy", ay).attr("r", Math.max(2.2, size * 0.17)).attr("fill", ink)
        .attr("stroke", paper).attr("stroke-width", Math.max(1, size / 18));
      label(svg, name, cx, cy, { anchor: "middle", size, weight: 800, color: "#3f3a35", halo: true, haloWidth: Math.max(2.5, size / 6) });
    });
  }

  start({ load, values, draw });
})();
