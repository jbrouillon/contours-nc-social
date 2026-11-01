// Campagne de l'article « Inégalités de revenus : où se situe la
// Nouvelle-Calédonie ? » : le carrousel (source.html) et la visite guidée du
// globe (visite-globe.html), base possible de la vidéo, produite à part.
// Les chiffres viennent des fichiers publiés par l'article (donnees/, voir
// provenance.json) ; couleurs, classes du globe et règles d'arrondi sont ceux
// de l'article (assets/js/inegalites-revenus.js et analysis.R du site). Chaque
// phrase chiffrée des écrans est vérifiée dans values() : si les données ne la
// confirment plus, aucun visuel n'est produit.
(() => {
  "use strict";

  const { label, roughPath, roughLine, roughRect, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const sketchFont = "Cabin Sketch, sans-serif";
  // Rouge : la Nouvelle-Calédonie ; sépia : la France et les autres
  // territoires ; vert : l'égalité parfaite (couleurs de l'article).
  const colorNc = "#c54832";
  const colorOther = "#7b6a55";
  const colorEq = "#2f6b45";
  const colorDot = "#5f574c";
  // Globe : palette Spectral de ColorBrewer en six classes, aux seuils du
  // rapport S80/S20 de l'article (GLOBE_OUTILS de inegalites-revenus.js),
  // l'écart entre les 20 % les plus aisés et les 20 % les plus modestes : le
  // globe que l'article affiche d'abord.
  const GLOBE_COULEURS = ["#3288bd", "#66c2a5", "#abdda4", "#fee08b", "#f46d43", "#9e0142"];
  const S80_SEUILS = [4, 5, 6, 8, 12];
  const S80_BORNES = [2, 30];
  const oceanColor = "#f6f4ec";
  const noDataColor = "#e7e1d4";
  const noDataStroke = "#b9b0a0";
  const landColor = "#ebe6dc";
  const NC_LONLAT = [165.6, -21.3];
  const VUE_ATLANTIQUE = [-25, 8];
  // Vue sur le Pacifique, la Nouvelle-Calédonie un peu sous le centre.
  const VUE_PACIFIQUE = [NC_LONLAT[0], NC_LONLAT[1] + 8];

  // Arrondis de l'article : une décimale sous 10 %, un entier au-delà ;
  // rapports et taux de pauvreté à une décimale ; indice de Gini à deux.
  const f0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const f1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const share = (x) => (Math.abs(x) < 10 ? f1.format(x) : f0.format(x));
  const pct = (x) => `${share(x)} %`;
  const ratio = (x) => f1.format(x);
  const taux = (x) => `${f1.format(x)} %`;
  const gini = (x) => f2.format(x);
  const LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
  const lettres = (n) => (n >= 0 && n <= 10 ? LETTRES[n] : String(n));

  const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
  const countryName = (row) => regionNames.of(String(row.iso2)) || row.pays;

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  function fontSize(width, height) {
    return Math.round(Math.max(21, Math.min(28, width / 34, height / 16)));
  }

  const textWidth = (text, size) => String(text).length * size * 0.56;

  // Cabin Sketch est creux : comme pour les titres (-webkit-text-stroke), un
  // liseré de sa propre couleur le remplit, au-dessus d'un halo de papier.
  // Renvoie le groupe des deux textes, à déplacer ensemble.
  function sketchLabel(parent, text, x, y, options) {
    const g = parent.append("g");
    label(g, text, x, y, { ...options, family: sketchFont, color: paper, halo: true, haloWidth: options.haloWidth || 7 });
    label(g, text, x, y, { ...options, family: sketchFont, halo: true, haloColor: options.color, haloWidth: Math.max(1.4, options.size / 22) });
    return g;
  }

  // --- Données ---------------------------------------------------------------

  // d3 attend des anneaux extérieurs dans le sens horaire : un polygone mal
  // orienté couvrirait tout le globe (rewindGeometry de l'article).
  function rewindGeometry(g) {
    const fix = (rings) => (d3.geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings);
    if (!g) return g;
    if (g.type === "Polygon") return { ...g, coordinates: fix(g.coordinates) };
    if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map(fix) };
    if (g.type === "GeometryCollection") return { ...g, geometries: g.geometries.map(rewindGeometry) };
    return g;
  }

  function load() {
    return Promise.all([
      d3.csv("donnees/deciles-nc.csv", d3.autoType),
      d3.csv("donnees/deciles-france.csv", d3.autoType),
      d3.csv("donnees/indicateurs-nc.csv", d3.autoType),
      d3.csv("donnees/seuils-nc.csv", d3.autoType),
      d3.csv("donnees/niveaux-de-vie-nc.csv", d3.autoType),
      d3.csv("donnees/gini-monde.csv", d3.autoType),
      d3.csv("donnees/indicateurs-ocde.csv", d3.autoType),
      d3.csv("donnees/gini-outre-mer.csv", d3.autoType),
      d3.json("donnees/pays-monde.geojson")
    ]).then(([deciles, decilesFrance, indicateurs, seuils, repere, monde, ocde, outreMer, geo]) => {
      // Parts des dix dixièmes : Nouvelle-Calédonie 2019 (Isee), France
      // métropolitaine 2018 (Insee).
      const partsOf = (rows, annee) => d3.range(1, 11).map((k) => {
        const row = rows.find((d) => d.annee === annee && d.decile === k);
        check(row && Number.isFinite(row.part), `Dixième absent : ${annee}, ${k}`);
        return row.part;
      });
      const parts = partsOf(deciles, 2019);
      const partsFrance = partsOf(decilesFrance, 2018);
      const nc = (id) => {
        const row = indicateurs.find((d) => d.indicateur === id);
        check(row, `Indicateur calédonien absent : ${id}`);
        return row;
      };
      const niveau = (id) => {
        const row = repere.find((d) => d.indicateur === id && d.annee === 2019);
        check(row && Number.isFinite(row.valeur), `Repère absent : ${id}`);
        return row.valeur;
      };
      const mediane = seuils.find((d) => d.annee === 2019 && d.decile === 5);
      check(mediane, "Niveau de vie médian absent");
      check(monde.length > 150 && ocde.length === 43, "Bases de comparaison incomplètes");
      const features = geo.features.map((f) => ({ ...f, geometry: rewindGeometry(f.geometry) }));
      return {
        parts, partsFrance, nc, monde, ocde, outreMer, features,
        mediane: mediane.seuil,
        seuilPauvrete: niveau("seuil_pauvrete_personne_seule"),
        populationPauvre: niveau("population_pauvre")
      };
    });
  }

  const pays = (rows, code) => {
    const row = rows.find((d) => d.iso3 === code);
    check(row, `Pays absent : ${code}`);
    return row;
  };

  // Les cinq outils, Nouvelle-Calédonie (définition officielle, 2019) et
  // France, comme les fiches de l'article. Pas de nom technique (S80/S20,
  // D9/D1, Gini) : ce que mesure l'outil, en clair, complété au besoin d'une
  // ligne plus petite (`note`).
  function outils(data) {
    const france = pays(data.monde, "FRA");
    const franceOcde = pays(data.ocde, "FRA");
    return [
      { name: ["Part des 10 %", "les plus aisés"], fmt: pct, nc: data.nc("part_haut10").nc_2019, fr: france.d10 },
      { name: ["20 % les plus aisés"], note: "÷ 20 % les plus modestes", fmt: ratio, nc: data.nc("s80_s20").nc_2019, fr: data.nc("s80_s20").france_2018 },
      { name: ["Seuil des 10 % aisés"], note: "÷ seuil des 10 % modestes", fmt: ratio, nc: data.nc("d9_d1").nc_2019, fr: data.nc("d9_d1").france_2018 },
      { name: ["Indice d’inégalité"], note: "de 0 (égalité) à 1", fmt: gini, nc: data.nc("gini").nc_2019, fr: data.nc("gini").france_2018 },
      { name: ["Taux de pauvreté"], fmt: taux, nc: data.nc("pauvrete").nc_2019, fr: franceOcde.pauvrete }
    ];
  }

  // Écran 04 : où est l'écart avec la France ? En haut de l'échelle, la part
  // des 10 % les plus aisés ; en bas, le taux de pauvreté. Ce sont les deux
  // chiffres de la diapositive 4 de l'article ; les verdicts sont vérifiés
  // dans values().
  function hautBas(data) {
    const tools = outils(data);
    return [
      { ...tools[0], name: "En haut de l’échelle", note: "part des revenus des 10 % les plus aisés", verdict: "un peu plus" },
      { ...tools[4], name: "En bas de l’échelle", note: "habitants sous le seuil de pauvreté", verdict: "deux fois plus" }
    ];
  }

  function values(data) {
    const p = data.parts;
    const bas10 = p[0];
    const haut10 = p[9];
    check(Math.abs(haut10 - data.nc("part_haut10").nc_2019) < 0.01, "Écran 01 : part des 10 % les plus aisés incohérente");
    const bas20 = p[0] + p[1];
    const haut20 = p[8] + p[9];

    // Écran 02 Rapport S80/S20 publié par l'Isee, « presque deux fois » celui de la
    // France métropolitaine.
    const s80 = data.nc("s80_s20").nc_2019;
    const s80France = data.nc("s80_s20").france_2018;
    check(s80 / s80France > 1.8 && s80 / s80France < 2, "Écran 02 : revoir « presque deux fois »");
    check(Math.abs(haut20 / bas20 - s80) < 0.15, "Écran 02 : piles et rapport publié incohérents");
    // Piles françaises (Insee) : elles redonnent le rapport de l'Isee ; les
    // 20 % les plus modestes y reçoivent plus, les 20 % les plus aisés moins.
    const pf = data.partsFrance;
    const bas20France = pf[0] + pf[1];
    const haut20France = pf[8] + pf[9];
    check(Math.abs(haut20France / bas20France - s80France) < 0.15, "Écran 02 : piles françaises et rapport publié incohérents");
    check(bas20 < bas20France && haut20 > haut20France, "Écran 02 : piles calédoniennes et françaises");

    // Écran 03 Taux de pauvreté « deux fois plus » élevé qu'en France (OCDE, même
    // seuil de 50 %).
    const pauvrete = data.nc("pauvrete").nc_2019;
    const franceOcde = pays(data.ocde, "FRA");
    check(Math.abs(pauvrete / franceOcde.pauvrete - 2) < 0.15, "Écran 03 : revoir « deux fois plus »");
    // Seuil : « la moitié du revenu qui partage la population en deux » (le
    // revenu médian), arrondie à la centaine.
    check(Math.abs(data.seuilPauvrete - data.mediane / 2) < 100, "Écran 03 : seuil et revenu médian incohérents");

    // Écran 04 « Les cinq outils de mesure vont dans le même sens » : tous au-dessus
    // de la France. « Vient surtout du bas de l'échelle » : les 10 % les plus
    // aisés reçoivent « un peu plus » (l'écart le plus faible des cinq), la
    // pauvreté est « deux fois plus » fréquente (D9/D1 aussi doublé).
    const tools = outils(data);
    tools.forEach((t) => check(Number.isFinite(t.nc) && Number.isFinite(t.fr) && t.nc > t.fr, `Écran 04 : ${t.name.join(" ")}`));
    const ratios = tools.map((t) => t.nc / t.fr);
    check(ratios[0] < 1.1 && ratios[0] === Math.min(...ratios), "Écran 04 : revoir « un peu plus »");
    check(Math.abs(ratios[2] - 2) < 0.1 && Math.abs(ratios[4] - 2) < 0.15, "Écran 04 : revoir « deux fois plus »");

    // Écran 05 France et Outre-mer (définitions rapprochées) : pour l'indice de
    // Gini, « seule la Guyane » fait plus ; « seule la Guyane est plus
    // inégalitaire » : aucun autre territoire ne dépasse la
    // Nouvelle-Calédonie, quel que soit l'indicateur.
    const om = (t) => {
      const row = data.outreMer.find((d) => d.territoire === t);
      check(row, `Territoire absent : ${t}`);
      return row;
    };
    const ncOm = om("Nouvelle-Calédonie");
    const giniH = ncOm.gini;
    const plus = data.outreMer.filter((d) => Number.isFinite(d.gini) && d.gini > giniH).map((d) => d.territoire);
    check(plus.length === 1 && plus[0] === "Guyane", "Écran 05 : revoir « seule la Guyane »");
    ["gini", "s80_s20", "d9_d1"].forEach((k) => {
      const au = data.outreMer.filter((d) => Number.isFinite(d[k]) && d[k] > ncOm[k]).map((d) => d.territoire);
      check(au.every((t) => t === "Guyane"), `Écran 05 : ${k}, un autre territoire que la Guyane fait plus`);
    });

    // Écran 06 et visite du globe (écart entre les 20 % les plus aisés et
    // les 20 % les plus modestes, définition officielle : 8,4) : « 35 sur
    // 164 » pays « seulement » ont un écart plus grand (comme l'article :
    // « n'est dépassée que par 35 des 164 pays ») ; la France et l'Australie
    // ont « un écart bien plus faible, en vert » (moins de 70 % de la valeur
    // calédonienne, dans les deux classes vertes du globe).
    const mondeAbove = data.monde.filter((d) => d.s80_s20 > s80);
    check(mondeAbove.length / data.monde.length < 0.25, "Écran 06 : revoir « seulement »");
    ["FRA", "AUS"].forEach((code) => {
      const row = pays(data.monde, code);
      check(row.s80_s20 < 0.7 * s80, `Visite : ${code}, revoir « bien plus faible »`);
      check([1, 2].includes(s80Class(row.s80_s20)), `Visite : ${code} n'est pas en vert`);
    });
    const giniNc = data.nc("gini").nc_2019;

    // Écran 07 OCDE : pays au rapport S80/S20 plus élevé ; l'Australie, la
    // Nouvelle-Zélande et la France « loin derrière » (moins de 70 %).
    const ocdeAbove = data.ocde.filter((d) => d.s80_s20 > s80);
    check(ocdeAbove.length <= 6, "Écran 07 : revoir « seulement »");
    const voisins = ["AUS", "NZL", "FRA"].map((code) => pays(data.ocde, code));
    voisins.forEach((d) => check(d.s80_s20 < 0.7 * s80, `Écran 07 : ${d.iso3} pas « loin derrière »`));

    // Écran 08 De 2008 à 2019, les inégalités ont « un peu reculé » : les cinq
    // outils baissent, l'indice de Gini de moins de 0,03, le taux de pauvreté
    // de moins d'un point (même contrôle qu'analysis.R).
    ["part_haut10", "s80_s20", "d9_d1", "gini", "pauvrete"].forEach((id) => {
      const row = data.nc(id);
      check(Number.isFinite(row.nc_2008) && row.nc_2019 < row.nc_2008, `Écran 08 : ${id} n'a pas baissé`);
    });
    check(data.nc("gini").nc_2008 - giniNc < 0.03, "Écran 08 : revoir « un peu » (indice de Gini)");
    check(data.nc("pauvrete").nc_2008 - pauvrete < 1, "Écran 08 : revoir « un peu » (pauvreté)");

    return {
      bas10_nb: share(bas10),
      haut10_nb: share(haut10),
      bas10_f: `${share(bas10)} F`,
      haut10_f: `${share(haut10)} F`,
      rapport_haut_bas: `${ratio(haut10 / bas10)} fois`,
      bas20: pct(bas20),
      haut20: pct(haut20),
      s80_fois: `${ratio(s80)} fois`,
      s80_france_fois: `${ratio(s80France)} fois`,
      pauvrete: taux(pauvrete),
      pauvrete_france: taux(franceOcde.pauvrete),
      annee_france: String(franceOcde.annee),
      seuil: `${f0.format(data.seuilPauvrete)} F CFP`,
      population_pauvre: f0.format(data.populationPauvre),
      monde_au_dessus: String(mondeAbove.length),
      n_monde: String(data.monde.length),
      n_ocde: String(data.ocde.length),
      ocde_lettres: lettres(ocdeAbove.length),
      ocde_chiffre: String(ocdeAbove.length)
    };
  }

  // --- Pictogrammes -----------------------------------------------------------

  // Silhouette (tête et buste) debout sur `base`, de hauteur `h` (article).
  function silhouette(cx, base, h) {
    const r = h * 0.17;
    const cy = base - h + r;
    const top = cy + r + h * 0.05;
    const w = h * 0.3;
    const body = `M${cx - w},${base}V${top + w}Q${cx - w},${top} ${cx},${top}Q${cx + w},${top} ${cx + w},${top + w}V${base}Z`;
    return { cx, cy, r, body };
  }

  function drawSilhouette(parent, cx, base, h, fill, stroke, strokeWidth = 1.2) {
    const s = silhouette(cx, base, h);
    const g = parent.append("g");
    g.append("circle").attr("cx", s.cx).attr("cy", s.cy).attr("r", s.r);
    g.append("path").attr("d", s.body);
    g.selectAll("*").attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeWidth).attr("stroke-linejoin", "round");
  }

  function roughSilhouette(parent, rc, cx, base, h, key, strokeWidth = 1.6) {
    const s = silhouette(cx, base, h);
    roughCircle(parent, rc, s.cx, s.cy, s.r * 2, { fill: "none", stroke: ink, strokeWidth, roughness: 0.8, seed: `${key}-tete` });
    roughPath(parent, rc, s.body, { stroke: ink, strokeWidth, roughness: 0.8, bowing: 0.5, seed: `${key}-corps` });
  }

  // Pile de francs : hachure rouge et un trait par franc.
  function pile(svg, rc, x, y0, y1, width, color, francs, scale, key, strong = true) {
    svg.append("rect").attr("x", x).attr("y", y1).attr("width", width).attr("height", y0 - y1)
      .attr("fill", color).attr("fill-opacity", strong ? 0.18 : 0.1);
    roughRect(svg, rc, x, y1, width, y0 - y1, {
      fill: color, fillStyle: "hachure", hachureAngle: -41, hachureGap: Math.max(4, width / 10), fillWeight: 1.3,
      stroke: strong ? hatchColor(color) : "#b8afa1", strokeWidth: strong ? 2 : 1.4, roughness: 1, bowing: 0.6, seed: key,
      opacity: strong ? 1 : 0.75
    });
    if (!strong) return;
    for (let f = 1; f < francs - 0.2; f += 1) {
      svg.append("line").attr("x1", x + 2).attr("x2", x + width - 2).attr("y1", scale(f)).attr("y2", scale(f))
        .attr("stroke", hatchColor(color)).attr("stroke-width", 1).attr("stroke-opacity", 0.55);
    }
  }

  function equalityLine(svg, rc, x0, x1, y, text, size, key) {
    roughLine(svg, rc, x0, y, x1, y, { stroke: colorEq, strokeWidth: 2.4, roughness: 0.5, strokeLineDash: [12, 9], seed: key });
    label(svg, text, x0 + 4, y - size * 0.75, { size: size * 0.9, weight: 800, color: colorEq, halo: true });
  }

  // --- Globe ------------------------------------------------------------------

  const s80Class = (value) => S80_SEUILS.filter((t) => value >= t).length;

  // Globe orthographique de rayon R centré en (cx, cy), colorié selon l'écart
  // entre les 20 % les plus aisés et les 20 % les plus modestes ; renvoie
  // update(centre) pour le faire tourner (vidéo). `reperes` : pays signalés
  // comme la Nouvelle-Calédonie, par un anneau et leur nom ({ nom, lonlat }) ;
  // update.reperes donne leur groupe SVG par nom, pour les montrer ou non.
  function globe(svg, rc, data, cx, cy, R, key, size, reperes = []) {
    const byIso = new Map(data.monde.map((d) => [d.iso3, d]));
    const withShape = new Set(data.features.map((f) => f.properties.iso3));
    const projection = d3.geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90).precision(0.5);
    const path = d3.geoPath(projection);
    const defs = svg.append("defs");
    const pattern = defs.append("pattern").attr("id", `${key}-sans-donnee`).attr("patternUnits", "userSpaceOnUse")
      .attr("width", 9).attr("height", 9).attr("patternTransform", "rotate(45)");
    pattern.append("rect").attr("width", 9).attr("height", 9).attr("fill", noDataColor);
    pattern.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 9).attr("stroke", noDataStroke).attr("stroke-width", 1.4);
    const sphere = svg.append("path").datum({ type: "Sphere" }).attr("fill", oceanColor);
    const graticule = svg.append("path").datum(d3.geoGraticule10()).attr("fill", "none").attr("stroke", "#cfc6b6")
      .attr("stroke-width", 0.8).attr("stroke-dasharray", "3 5");
    const countries = svg.append("g").selectAll("path").data(data.features).join("path")
      .attr("fill", (f) => {
        const row = byIso.get(f.properties.iso3);
        if (f.properties.iso3 === "NCL") return GLOBE_COULEURS[s80Class(data.nc("s80_s20").nc_2019)];
        if (row) return GLOBE_COULEURS[s80Class(row.s80_s20)];
        return f.properties.iso3 === "ATA" ? landColor : `url(#${key}-sans-donnee)`;
      })
      .attr("stroke", paper).attr("stroke-width", 0.8);
    // Petits États absents du fond de carte : un point à leur capitale.
    const islands = svg.append("g").selectAll("circle")
      .data(data.monde.filter((d) => !withShape.has(d.iso3) && Number.isFinite(d.lon)))
      .join("circle").attr("r", Math.max(4, R / 48)).attr("fill", (d) => GLOBE_COULEURS[s80Class(d.s80_s20)])
      .attr("stroke", ink).attr("stroke-width", 1.2);
    svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R).attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1.6);
    roughCircle(svg, rc, cx, cy, 2 * R + 8, { fill: "none", stroke: ink, strokeWidth: 1.4, roughness: 0.8, curveFitting: 0.995, seed: `${key}-sphere`, opacity: 0.6 });
    // Nouvelle-Calédonie et repères : anneau et nom (sans valeur : la couleur
    // suffit), quand ils sont sur la face visible. L'anneau de la
    // Nouvelle-Calédonie est rempli de la couleur de sa classe : l'île, trop
    // petite à cette échelle, n'en montrerait qu'un trait.
    const couleurNc = GLOBE_COULEURS[s80Class(data.nc("s80_s20").nc_2019)];
    const marques = [{ nom: "Nouvelle-Calédonie", lonlat: NC_LONLAT, couleur: couleurNc }, ...reperes].map((m) => {
      const g = svg.append("g");
      const ring = g.append("circle").attr("r", size * 0.75).attr("fill", m.couleur || "none").attr("fill-opacity", 0.92)
        .attr("stroke", ink).attr("stroke-width", 3);
      const name = label(g, m.nom, 0, 0, { size: size * 1.05, weight: 800, halo: true, haloWidth: 7 });
      return { ...m, g, ring, name };
    });

    function update(centre) {
      projection.rotate([-centre[0], -centre[1], 0]);
      sphere.attr("d", path);
      graticule.attr("d", path);
      countries.attr("d", path);
      islands.each(function place(d) {
        const visible = d3.geoDistance([d.lon, d.lat], centre) < Math.PI / 2 - 0.03;
        const [x, y] = projection([d.lon, d.lat]);
        d3.select(this).attr("cx", x).attr("cy", y).attr("display", visible ? null : "none");
      });
      marques.forEach((m) => {
        const distance = d3.geoDistance(m.lonlat, centre);
        const show = distance < 1.2;
        m.g.attr("display", show ? null : "none").attr("opacity", show ? Math.min(1, (1.2 - distance) / 0.3) : 0);
        if (!show) return;
        const [x, y] = projection(m.lonlat);
        m.ring.attr("cx", x).attr("cy", y);
        // Le nom à droite de l'anneau, sinon à gauche, sinon dessous quand
        // le globe touche le bord gauche de l'image (globe à côté du texte).
        const w = textWidth(m.nom, size * 1.05);
        if (x + size * 1.1 + w < cx + R * 0.98) m.name.attr("x", x + size * 1.1).attr("y", y).attr("text-anchor", "start");
        else if (x - size * 1.1 - w > 0) m.name.attr("x", x - size * 1.1).attr("y", y).attr("text-anchor", "end");
        else m.name.attr("x", Math.max(w / 2, x)).attr("y", y + size * 1.6).attr("text-anchor", "middle");
      });
    }
    update(VUE_ATLANTIQUE);
    update.reperes = new Map(marques.map((m) => [m.nom, m.g]));
    return update;
  }

  // Échelle des couleurs du globe et place de la Nouvelle-Calédonie, sans
  // valeur : seulement le sens, de l'écart le plus faible au plus grand.
  function globeLegend(svg, data, x0, y, width, size) {
    const bounds = [S80_BORNES[0], ...S80_SEUILS, S80_BORNES[1]];
    const cw = width / GLOBE_COULEURS.length;
    const h = size * 0.9;
    const value = data.nc("s80_s20").nc_2019;
    const k = s80Class(value);
    const mx = x0 + cw * (k + (value - bounds[k]) / (bounds[k + 1] - bounds[k]));
    label(svg, "Nouvelle-Calédonie", mx, y - size * 1.3, { anchor: "middle", size: size * 0.95, weight: 800, color: colorNc, halo: true });
    svg.append("path").attr("d", `M${mx},${y - 3}l-${size * 0.45},-${size * 0.6}h${size * 0.9}z`).attr("fill", colorNc);
    GLOBE_COULEURS.forEach((color, i) => {
      svg.append("rect").attr("x", x0 + i * cw).attr("y", y).attr("width", cw).attr("height", h).attr("fill", color);
    });
    // Libellés courts quand la légende est étroite (globe à côté du texte).
    const longs = textWidth("← écart plus faible", size * 0.85) + textWidth("écart plus grand →", size * 0.85) + size < width;
    label(svg, longs ? "← écart plus faible" : "← plus faible", x0, y + h + size * 1.1, { size: size * 0.85, weight: 700, color: muted });
    label(svg, longs ? "écart plus grand →" : "plus grand →", x0 + width, y + h + size * 1.1, { anchor: "end", size: size * 0.85, weight: 700, color: muted });
    return y + h + size * 1.6;
  }

  // --- Essaim de points (OCDE) -------------------------------------------------

  // Chaque point prend la position la plus proche de l'axe qui ne chevauche
  // aucun point déjà placé (dodge de l'article) ; `fixed` : positions déjà
  // prises sur l'axe (repères calédoniens).
  function dodge(items, x, radius, padding, fixed = []) {
    const min = 2 * radius + padding;
    const placed = fixed.map((fx) => ({ x: fx, y: 0, fixed: true }));
    items.map((d) => ({ d, x: x(d), y: 0 }))
      .sort((a, b) => a.x - b.x || String(a.d.iso3).localeCompare(String(b.d.iso3)))
      .forEach((c) => {
        const near = placed.filter((q) => Math.abs(q.x - c.x) < min);
        const candidates = [0];
        near.forEach((q) => {
          const dy = Math.sqrt(Math.max(0, min * min - (q.x - c.x) ** 2));
          candidates.push(q.y + dy, q.y - dy);
        });
        candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
        c.y = candidates.find((cy) => near.every((q) => (q.x - c.x) ** 2 + (q.y - cy) ** 2 >= min * min - 1e-6));
        placed.push(c);
      });
    return placed.filter((q) => !q.fixed);
  }

  // Étiquettes en couloirs au-dessus de la rangée (laneLabels de l'article,
  // simplifié) : chacune prend le premier couloir où elle tient, au plus près
  // de son point ; d'abord sans qu'aucun trait de rappel ne traverse une
  // étiquette et avec un glissement limité, puis sans ces contraintes.
  // Renvoie le nombre de couloirs.
  function lanes(items, size, left, right) {
    const placed = [];
    const spot = (item, width, shift, strict) => {
      const clamp = (x) => Math.max(left + width / 2, Math.min(right - width / 2, x));
      for (let lane = 0; lane < 8; lane += 1) {
        const others = placed.filter((p) => p.lane === lane);
        const ok = (lx) => others.every((p) => lx + width / 2 <= p.lx - p.width / 2 + 0.5 || lx - width / 2 >= p.lx + p.width / 2 - 0.5)
          && (!strict || (
            placed.every((p) => p.lane >= lane || item.x < p.lx - p.width / 2 - 4 || item.x > p.lx + p.width / 2 + 4)
            && placed.every((p) => p.lane <= lane || p.x < lx - width / 2 - 4 || p.x > lx + width / 2 + 4)));
        const candidates = [item.x, ...others.flatMap((p) => [p.lx + (p.width + width) / 2, p.lx - (p.width + width) / 2])]
          .map(clamp).filter((lx) => Math.abs(lx - item.x) <= shift && ok(lx))
          .sort((a, b) => Math.abs(a - item.x) - Math.abs(b - item.x));
        if (candidates.length) return { lane, lx: candidates[0] };
      }
      return null;
    };
    items.slice().sort((a, b) => a.x - b.x).forEach((item) => {
      const width = textWidth(item.text, size) + size * 0.8;
      const best = spot(item, width, size * 5, true) || spot(item, width, size * 12, true) || spot(item, width, Infinity, false);
      if (!best) throw new Error(`Étiquette impossible à placer : ${item.text}`);
      Object.assign(item, best, { width });
      placed.push(item);
    });
    return placed.length ? d3.max(placed, (p) => p.lane) + 1 : 0;
  }

  // --- Croquis ----------------------------------------------------------------

  const draw = {
    // Dix habitants, un par dixième de la population, sous leur pile de
    // francs (sur 100 francs de niveaux de vie).
    partage(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const band = d3.scaleBand().domain(d3.range(10)).range([0, width]).paddingInner(0.22);
      const bw = band.bandwidth();
      const pileW = Math.min(bw * 0.72, 64);
      const personH = Math.max(36, Math.min(height * 0.18, bw * 1.15, 86));
      const bottom = height - size * 1.4;
      const personBase = bottom - size * 0.3;
      const pileBase = personBase - personH - 10;
      const y = d3.scaleLinear().domain([0, 30]).range([pileBase, size * 1.6]);
      equalityLine(svg, rc, 0, width, y(10), "égalité : 10 F chacun", size, "partage-egalite");
      data.parts.forEach((part, k) => {
        const cx = band(k) + bw / 2;
        pile(svg, rc, cx - pileW / 2, pileBase, y(part), pileW, colorNc, part, y, `partage-pile-${k}`);
        const extreme = k === 0 || k === 9;
        label(svg, `${share(part)} F`, cx, y(part) - size * 0.75, {
          anchor: "middle", size: extreme ? size * 1.2 : size * 0.8, weight: 800, color: extreme ? hatchColor(colorNc) : ink, halo: true
        });
        roughSilhouette(svg, rc, cx, personBase, personH, `partage-habitant-${k}`, extreme ? 2.2 : 1.5);
      });
      label(svg, "← plus modestes", 0, height - size * 0.5, { size: size * 0.85, weight: 800, color: muted });
      label(svg, "plus aisés →", width, height - size * 0.5, { anchor: "end", size: size * 0.85, weight: 800, color: muted });
    },

    // Cinq paires de piles, une par cinquième de la population : la
    // Nouvelle-Calédonie (2019) à gauche, la France métropolitaine (2018) à
    // droite, à la même échelle. Le rapport S80/S20, en légende, compare la
    // dernière pile à la première ; les trois du milieu sont estompées.
    quintiles(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const quintiles = (p) => d3.range(5).map((q) => p[2 * q] + p[2 * q + 1]);
      const series = [
        { name: "Nouvelle-Calédonie", parts: quintiles(data.parts), rapport: data.nc("s80_s20").nc_2019, color: colorNc },
        { name: "France métropolitaine", parts: quintiles(data.partsFrance), rapport: data.nc("s80_s20").france_2018, color: colorOther }
      ];
      // Légende : chaque territoire et son rapport S80/S20, côte à côte ou
      // l'un sous l'autre selon la place.
      const keyW = size * 1.3;
      const itemW = (s) => keyW + size * 0.6 + textWidth(s.name, size * 0.95) + size * 0.6 + textWidth(`× ${ratio(s.rapport)}`, size * 1.35);
      const sideBySide = d3.max(series, itemW) < width / 2 - size;
      // L'un sous l'autre, les deux rapports en colonne.
      const nameW = d3.max(series, (s) => textWidth(s.name, size * 0.95));
      series.forEach((s, i) => {
        const lx = sideBySide ? i * width / 2 : 0;
        const ly = size * 0.9 + (sideBySide ? 0 : i * size * 1.9);
        svg.append("rect").attr("x", lx).attr("y", ly - size * 0.45).attr("width", keyW).attr("height", size * 0.9).attr("fill", s.color).attr("fill-opacity", 0.18);
        roughRect(svg, rc, lx, ly - size * 0.45, keyW, size * 0.9, { fill: s.color, fillStyle: "hachure", hachureGap: 4, stroke: hatchColor(s.color), seed: `quintiles-cle-${i}` });
        const tx = lx + keyW + size * 0.6;
        label(svg, s.name, tx, ly, { size: size * 0.95, weight: 800, color: hatchColor(s.color) });
        sketchLabel(svg, `× ${ratio(s.rapport)}`, tx + (sideBySide ? textWidth(s.name, size * 0.95) : nameW) + size * 0.6, ly, { size: size * 1.35, color: s.color });
      });
      const top = size * (sideBySide ? 2.4 : 4.3);
      const band = d3.scaleBand().domain(d3.range(5)).range([0, width]).paddingInner(0.2);
      const inner = d3.scaleBand().domain([0, 1]).range([0, band.bandwidth()]).paddingInner(0.12);
      const pileW = inner.bandwidth();
      const labelsH = size * 2.5;
      const pileBase = height - labelsH;
      const y = d3.scaleLinear().domain([0, 48]).range([pileBase, top + size * 1.6]);
      // Valeurs de deux piles voisines : jamais plus larges que l'écart entre
      // elles (« 8,7 F », cinq caractères).
      const fit = (wanted) => Math.min(wanted, (inner.step() - 6) / (5 * 0.56));
      equalityLine(svg, rc, 0, width, y(20), "égalité : 20 F", size, "quintiles-egalite");
      const noms = [["20 % les plus", "modestes"], ["2e"], ["3e"], ["4e"], ["20 % les plus", "aisés"]];
      d3.range(5).forEach((q) => {
        const extreme = q === 0 || q === 4;
        series.forEach((s, i) => {
          const part = s.parts[q];
          const px = band(q) + inner(i);
          pile(svg, rc, px, pileBase, y(part), pileW, s.color, part, y, `quintiles-pile-${i}-${q}`, extreme);
          label(svg, `${share(part)} F`, px + pileW / 2, y(part) - size * 0.75, {
            anchor: "middle", size: fit(extreme ? size * 1.15 : size * 0.85), weight: 800, color: extreme ? hatchColor(s.color) : muted, halo: true
          });
        });
        const cx = band(q) + band.bandwidth() / 2;
        noms[q].forEach((line, k) => label(svg, line, cx, pileBase + size * (0.85 + k * 1.05), {
          anchor: "middle", size: size * 0.82, weight: 800, color: extreme ? ink : muted
        }));
      });
    },

    // Deux grilles de cent silhouettes : sous le seuil de pauvreté en
    // Nouvelle-Calédonie (2019) et en France (OCDE, même seuil).
    pauvrete(svg, data, { width, height }) {
      const size = fontSize(width, height);
      const panels = [
        { name: "Nouvelle-Calédonie", value: data.nc("pauvrete").nc_2019, color: colorNc },
        { name: "France", value: pays(data.ocde, "FRA").pauvrete, color: colorOther }
      ];
      // Côte à côte, ou l'une sous l'autre si la figure est plus haute que
      // large (9:16).
      const head = size * 1.6;
      const foot = size * 1.5;
      const gap = size * 2;
      const stacked = height > width * 1.1;
      const cell = stacked
        ? Math.min(width / 10, (height - 2 * head - gap - foot) / 20)
        : Math.min((width - gap) / 20, (height - head - foot) / 10);
      const gridW = cell * 10;
      const blockH = stacked ? 2 * (head + gridW) + gap : head + gridW;
      const left = stacked ? (width - gridW) / 2 : (width - (2 * gridW + gap)) / 2;
      const top = Math.max(0, (height - blockH - foot) / 2);
      panels.forEach((p, i) => {
        const x0 = stacked ? left : left + i * (gridW + gap);
        const y0 = top + (stacked ? i * (head + gridW + gap) : 0);
        label(svg, p.name, x0, y0 + size * 0.6, { size: size * 1.05, weight: 800, color: hatchColor(p.color) });
        const filled = Math.round(p.value);
        d3.range(100).forEach((n) => {
          const cx = x0 + (n % 10) * cell + cell / 2;
          const base = y0 + head + Math.floor(n / 10) * cell + cell * 0.92;
          const below = n < filled;
          drawSilhouette(svg, cx, base, cell * 0.84, below ? p.color : paper, below ? hatchColor(p.color) : "#c9bfae", Math.max(1, cell / 28));
        });
      });
      label(svg, "1 silhouette = 1 % de la population", left, top + blockH + size, { size: size * 0.82, weight: 700, color: muted });
    },

    // Écran 04 : en haut et en bas de l'échelle, la Nouvelle-Calédonie et la
    // France ; sur chaque ligne, la plus grande des deux valeurs occupe toute
    // la longueur, et le verdict s'affiche en face du titre.
    "haut-bas"(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const rows = hautBas(data);
      const legendY = size * 0.7;
      [[colorNc, "Nouvelle-Calédonie, 2019"], [colorOther, "France"]].forEach(([color, text], i) => {
        const x = i ? Math.min(width * 0.62, size * 16) : 0;
        roughRect(svg, rc, x, legendY - size * 0.4, size * 1.1, size * 0.8, { fill: color, fillStyle: "hachure", hachureGap: 4, stroke: hatchColor(color), seed: `haut-bas-cle-${i}` });
        label(svg, text, x + size * 1.5, legendY, { size: size * 0.92, weight: 800, color: hatchColor(color) });
      });
      const top = size * 2.4;
      const step = (height - top) / rows.length;
      const barH = Math.min(step * 0.2, size * 2);
      const x1 = width - size * 4.2;
      rows.forEach((r, i) => {
        // Bloc centré dans sa part de hauteur : titre, glose, deux barres.
        const blockH = size * 2.6 + 2 * barH + 8;
        const y0 = top + step * i + Math.max(0, (step - blockH) / 2);
        label(svg, r.name, 0, y0 + size * 0.6, { size: size * 1.2, weight: 800 });
        sketchLabel(svg, r.verdict, width, y0 + size * 0.6, { anchor: "end", size: size * 1.35, color: colorNc });
        label(svg, r.note, 0, y0 + size * 1.75, { size: size * 0.85, weight: 700, color: muted });
        const x = d3.scaleLinear().domain([0, Math.max(r.nc, r.fr)]).range([0, x1]);
        [[r.nc, colorNc], [r.fr, colorOther]].forEach(([value, color], j) => {
          const by = y0 + size * 2.6 + j * (barH + 8);
          svg.append("rect").attr("x", 0).attr("y", by).attr("width", x(value)).attr("height", barH).attr("fill", color).attr("fill-opacity", 0.16);
          roughRect(svg, rc, 0, by, x(value), barH, {
            fill: color, fillStyle: "hachure", hachureGap: Math.max(4, barH / 4), fillWeight: 1.2, stroke: hatchColor(color), strokeWidth: 1.6, roughness: 1, seed: `haut-bas-${i}-${j}`
          });
          label(svg, r.fmt(value), x(value) + 12, by + barH / 2, { size: j ? size * 1 : size * 1.15, weight: 800, color: hatchColor(color) });
        });
      });
    },

    // Globe et échelle des couleurs, où se place la Nouvelle-Calédonie ;
    // centré sur l'Atlantique, ou sur le Pacifique avec data-centre="pacifique"
    // (couverture de la campagne « monde »).
    globe(svg, data, { rc, width, height, node }) {
      const size = fontSize(width, height);
      const legendH = size * 5.6;
      const centre = node.dataset.centre === "pacifique" ? VUE_PACIFIQUE : VUE_ATLANTIQUE;
      if (width > height * 1.35) {
        const R = Math.min(height / 2 - 6, width * 0.27);
        globe(svg, rc, data, R + 6, height / 2, R, "globe", size)(centre);
        const lx = 2 * R + size * 2;
        const lw = Math.min(width - lx - 10, size * 18);
        globeLegend(svg, data, lx, height / 2 + size * 0.5, lw, size);
      } else {
        const R = Math.min(width / 2 - 6, (height - legendH) / 2 - 6);
        globe(svg, rc, data, width / 2, R + 6, R, "globe", size)(centre);
        const lw = Math.min(width, size * 20);
        globeLegend(svg, data, (width - lw) / 2, 2 * R + 12 + size * 2.9, lw, size);
      }
    },

    // Vidéo : visite guidée du globe. window.visiteGlobe(p), p de 0 à 1,
    // dessine l'état p (capturé image par image par scripts/produire_gif.py) :
    // trajet d'une étape à l'autre, puis arrêt, pendant lequel le globe dérive
    // lentement, avec la légende de l'étape au-dessus ([data-etape-titre],
    // [data-etape-texte]). Les légendes sont vérifiées dans values() (Écran 06
    // et visite).
    "globe-visite"(svg, data, { rc, width, height, values: v }) {
      const size = fontSize(width, height);
      const legendH = size * 5.6;
      const R = Math.min(width / 2 - 6, (height - legendH) / 2 - 6);
      const reperes = [{ nom: "France", lonlat: [2.5, 46.5] }, { nom: "Australie", lonlat: [134, -25] }];
      const update = globe(svg, rc, data, width / 2, R + 6, R, "visite", size, reperes);
      const lw = Math.min(width, size * 20);
      globeLegend(svg, data, (width - lw) / 2, 2 * R + 12 + size * 2.9, lw, size);
      const bloc = document.querySelector("[data-etape]");
      const titre = document.querySelector("[data-etape-titre]");
      const texte = document.querySelector("[data-etape-texte]");
      check(bloc && titre && texte, "Visite : légende d'étape absente");
      // Centre du globe, durée du trajet depuis l'étape précédente puis de
      // l'arrêt (en secondes), légende, repères affichés.
      const etapes = [
        { centre: [2, 40], trajet: 0, arret: 4, titre: `${v.n_monde} pays`, texte: "colorés selon l’écart entre les 20 % les plus aisés et les 20 % les plus modestes", montre: ["France"] },
        { centre: VUE_PACIFIQUE, trajet: 3.6, arret: 4, titre: v.s80_fois, nc: true, texte: "plus pour les 20 % les plus aisés que pour les 20 % les plus modestes, en Nouvelle-Calédonie", montre: ["Nouvelle-Calédonie"] },
        { centre: [148, -20], trajet: 1.4, arret: 3.5, titre: "Australie", texte: "sa grande voisine : un écart bien plus faible, en vert, comme la France", montre: ["Nouvelle-Calédonie:anneau", "Australie"] },
        { centre: VUE_PACIFIQUE, trajet: 1.4, arret: 4.5, titre: `${v.monde_au_dessus} sur ${v.n_monde}`, nc: true, texte: "pays seulement ont un écart plus grand que la Nouvelle-Calédonie", montre: ["Nouvelle-Calédonie"] }
      ];
      let fin = 0;
      etapes.forEach((e) => {
        e.debut = fin;
        e.arrivee = fin + e.trajet;
        fin = e.arrivee + e.arret;
      });
      // Dérive pendant les arrêts, en degrés de longitude par seconde.
      const derive = 1.2;
      const position = (e, dt) => [e.centre[0] + derive * dt, e.centre[1]];
      const ease = d3.easeCubicInOut;
      const fondu = 0.45;
      const montrer = (e, opacite) => {
        titre.textContent = e.titre;
        titre.classList.toggle("is-nc", Boolean(e.nc));
        texte.textContent = e.texte;
        bloc.style.opacity = String(opacite);
      };
      // « Nom:anneau » : l'anneau seul, sans le nom.
      const reperesVisibles = (e) => update.reperes.forEach((g, nom) => {
        const anneau = e.montre.includes(`${nom}:anneau`);
        if (!anneau && !e.montre.includes(nom)) g.attr("display", "none");
        g.selectAll("text").attr("display", anneau ? "none" : null);
      });
      window.visiteGlobe = (progress) => {
        const t = Math.max(0, Math.min(1, progress)) * fin;
        const k = etapes.findIndex((e, i) => i === etapes.length - 1 || t < etapes[i + 1].debut);
        const e = etapes[k];
        if (t >= e.arrivee) {
          update(position(e, t - e.arrivee));
          reperesVisibles(e);
          montrer(e, 1);
          return t;
        }
        // En trajet : la légende précédente s'efface juste avant la
        // mi-chemin, la suivante apparaît juste après ; les repères suivent.
        const prev = etapes[k - 1];
        const depart = position(prev, prev.arret);
        const u = ease((t - e.debut) / e.trajet);
        update([depart[0] + u * (e.centre[0] - depart[0]), depart[1] + u * (e.centre[1] - depart[1])]);
        const milieu = e.debut + e.trajet / 2;
        reperesVisibles(t < milieu ? prev : e);
        if (t < milieu) montrer(prev, Math.min(1, (milieu - t) / fondu));
        else montrer(e, Math.min(1, (t - milieu) / fondu));
        return t;
      };
      window.visiteGlobe(1);
    },

    // Écran 07 : un point par pays de l'OCDE, d'autant plus à droite que les
    // 20 % les plus aisés reçoivent plus que les 20 % les plus modestes ; la
    // Nouvelle-Calédonie en rouge, avec sa définition officielle (celle du
    // titre). Ni graduation ni valeur : la position suffit.
    regles(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const row = data.nc("s80_s20");
      const [d0, d1] = [2, 14];
      const x = d3.scaleLinear().domain([d0, d1]).range([size * 0.6, width - size * 1.6]);
      const clamp = (v) => x(Math.min(d1, v));
      // Points plus gros quand la hauteur le permet (9:16).
      const r = Math.max(7, Math.min(size * 0.62, height / 42));
      const ncX = x(row.nc_2019);
      const placed = dodge(data.ocde, (d) => clamp(d.s80_s20), r, 2, [ncX]);
      const ys = d3.extent(placed, (p) => p.y);
      // Les pays qui font plus que la Nouvelle-Calédonie, trop serrés pour
      // être nommés un à un, sont réunis sous une accolade ; la France,
      // l'Australie et la Nouvelle-Zélande sont nommées à leur point.
      const aboveRows = data.ocde.filter((d) => d.s80_s20 > row.nc_2019).sort((a, b) => b.s80_s20 - a.s80_s20);
      const above = new Set(aboveRows.map((d) => d.iso3));
      const reperes = new Set(["FRA", "AUS", "NZL"]);
      const items = placed.filter((p) => reperes.has(p.d.iso3)).map((p) => ({ p, x: p.x, text: countryName(p.d) }));
      const labelSize = size * 0.9;
      const laneH = labelSize * 1.35;
      const abovePlaced = placed.filter((p) => above.has(p.d.iso3));
      const ax0 = d3.min(abovePlaced, (p) => p.x) - r;
      const ax1 = x(d1) + r * 1.8;
      const textLeft = Math.min(ax0, width - size * 15);
      const lines = [];
      `Font plus : ${aboveRows.map(countryName).join(", ")}`.split(" ").forEach((word) => {
        const last = lines[lines.length - 1];
        if (last && textWidth(`${last} ${word}`, labelSize) <= width - textLeft) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
      });
      const nLanes = Math.max(lanes(items, labelSize, 0, textLeft - size * 0.6), lines.length + 0.6);
      // Bloc centré dans la hauteur : étiquettes, essaim, axe, nom de la
      // Nouvelle-Calédonie et sens de lecture.
      const blockH = nLanes * laneH + size * 0.9 + (ys[1] - ys[0]) + 2 * r + 4 + size * 0.8 + size * 3.4;
      const offset = Math.max(0, (height - blockH) / 2);
      const swarmTop = offset + nLanes * laneH + size * 0.9;
      const center = swarmTop + r + 4 - ys[0];
      const axisY = center + ys[1] + r + size * 0.8;
      svg.append("line").attr("x1", x(d0)).attr("x2", x(d1)).attr("y1", axisY).attr("y2", axisY).attr("stroke", "#a39b8f").attr("stroke-width", 1.6);
      placed.forEach((p) => {
        const hi = above.has(p.d.iso3) || reperes.has(p.d.iso3);
        if (p.d.s80_s20 > d1) {
          svg.append("path").attr("d", `M${p.x - r * 0.6},${center + p.y - r * 1.4}l${r * 2.4},${r * 1.4}l-${r * 2.4},${r * 1.4}z`).attr("fill", ink);
        } else {
          svg.append("circle").attr("cx", p.x).attr("cy", center + p.y).attr("r", hi ? r + 1.2 : r).attr("fill", hi ? ink : colorDot)
            .attr("fill-opacity", hi ? 1 : 0.75).attr("stroke", paper).attr("stroke-width", 1);
        }
      });
      svg.append("circle").attr("cx", ncX).attr("cy", center).attr("r", r + 4).attr("fill", colorNc).attr("stroke", paper).attr("stroke-width", 2);
      // Accolade au-dessus des pays qui font plus, liste dessus.
      const by = center + ys[0] - r - size * 0.5;
      roughLine(svg, rc, ax0, by, ax1, by, { strokeWidth: 1.8, roughness: 0.6, seed: "regles-accolade" });
      [ax0, ax1].forEach((bx, i) => roughLine(svg, rc, bx, by, bx, by + size * 0.4, { strokeWidth: 1.8, roughness: 0.4, seed: `regles-accolade-${i}` }));
      lines.forEach((line, k) => label(svg, line, textLeft, by - size * 0.7 - (lines.length - 1 - k) * laneH, { size: labelSize, weight: 800, halo: true }));
      items.forEach((item) => {
        const ly = swarmTop - size * 0.5 - item.lane * laneH;
        svg.append("line").attr("x1", item.p.x).attr("x2", item.lx).attr("y1", center + item.p.y - r - 2).attr("y2", ly + labelSize * 0.55)
          .attr("stroke", muted).attr("stroke-width", 1.3);
        label(svg, item.text, item.lx, ly, { anchor: "middle", size: labelSize, weight: 800, halo: true });
      });
      // Sous l'axe : la Nouvelle-Calédonie sous son point, la clé de lecture
      // à gauche, le sens à droite.
      const ncHalf = textWidth("Nouvelle-Calédonie", size) / 2;
      const ncLabelX = Math.max(ncHalf, Math.min(width - ncHalf, ncX));
      label(svg, "Nouvelle-Calédonie", ncLabelX, axisY + size * 1.1, { anchor: "middle", size, weight: 800, color: hatchColor(colorNc), halo: true });
      label(svg, "1 point = 1 pays", 0, axisY + size * 2.6, { size: size * 0.82, weight: 700, color: muted });
      label(svg, "plus à droite, plus inégalitaire →", width, axisY + size * 2.6, { anchor: "end", size: size * 0.82, weight: 700, color: muted });
    },

    // Indice de Gini de la France et des Outre-mer comparés par l'Isee.
    "outre-mer"(svg, data, { rc, width, height }) {
      const size = fontSize(width, height);
      const rows = data.outreMer.filter((d) => Number.isFinite(d.gini)).sort((a, b) => b.gini - a.gini);
      const labelW = Math.min(width * 0.4, textWidth("France métropolitaine", size) + size);
      const x = d3.scaleLinear().domain([0, 0.5]).range([labelW, width - size * 3.4]);
      const step = height / rows.length;
      const barH = Math.min(step * 0.56, size * 1.9);
      rows.forEach((d, i) => {
        const cy = step * (i + 0.5);
        const isNc = d.territoire === "Nouvelle-Calédonie";
        const color = isNc ? colorNc : colorOther;
        label(svg, d.territoire, labelW - size * 0.6, cy, { anchor: "end", size: isNc ? size : size * 0.92, weight: 800, color: isNc ? hatchColor(colorNc) : ink });
        svg.append("rect").attr("x", x(0)).attr("y", cy - barH / 2).attr("width", x(d.gini) - x(0)).attr("height", barH).attr("fill", color).attr("fill-opacity", isNc ? 0.2 : 0.12);
        roughRect(svg, rc, x(0), cy - barH / 2, x(d.gini) - x(0), barH, {
          fill: color, fillStyle: "hachure", hachureGap: Math.max(4, barH / 5), fillWeight: 1.2, stroke: hatchColor(color), strokeWidth: isNc ? 2.2 : 1.4, seed: `om-${i}`
        });
        label(svg, gini(d.gini), x(d.gini) + 12, cy, { size: size * 1.05, weight: 800, color: hatchColor(color) });
      });
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", height).attr("stroke", ink).attr("stroke-width", 1.4);
    }
  };

  start({ load, values, draw });
})();
