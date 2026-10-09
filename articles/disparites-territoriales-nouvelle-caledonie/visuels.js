// Campagne « Explorer les disparités territoriales en Nouvelle-Calédonie ».
// Les données, seuils de classes et couleurs sont ceux de la carte des IRIS de
// l'article (assets/js/disparites-territoriales-nouvelle-caledonie.js du site,
// ncMetricDefinitions et colorFor). Les calculs portent, comme dans l'article,
// sur les 155 IRIS peuplés ; chaque IRIS compte une fois, quelle que soit sa
// population. Le Grand Nouméa regroupe Nouméa, Dumbéa, Mont-Dore et Païta.
(() => {
  "use strict";

  const { label, roughPath, roughLine, roughRect, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const noData = "#d6d0c4";
  const gnColor = "#2f6b45";
  const restColor = "#c98d3a";
  const trendColor = "#c54832";
  const GN = ["Nouméa", "Dumbéa", "Mont-Dore", "Païta"];
  // Emprise du Grand Nouméa reprise de l'article Provinciales 2026
  // (metadata.json, zoom_views.grand_noumea) : ouest, sud, est, nord.
  const GN_BBOX = [166.34, -22.32, 166.64, -22.11];
  // Cadrage resserré sur l'agglomération (Nouméa, Koutio, Boulari) pour
  // l'écran consacré à Nouméa.
  const AGGLO_BBOX = [166.385, -22.33, 166.585, -22.18];

  // Copie de ncMetricDefinitions (article) pour les trois indicateurs montrés.
  const metrics = {
    taux_sans_internet: {
      label: "Ménages sans accès à internet",
      thresholds: [20, 35, 50, 65, 80],
      colors: ["#f4f1e8", "#e4dec3", "#cbc491", "#a8a35e", "#7b7d3e", "#52582d"]
    },
    taux_chomage: {
      label: "Chômage parmi les actifs",
      thresholds: [8, 12, 20, 30, 40],
      colors: ["#f5eee4", "#ead9c5", "#e2bd84", "#d89258", "#c85d3e", "#8e2f27"]
    },
    taux_bac3_plus: {
      label: "Diplômés d’un bac +3 ou plus",
      thresholds: [2, 5, 10, 20, 35],
      colors: ["#f1ece2", "#dce3cf", "#b9d0ae", "#85b087", "#528565", "#2f5f46"]
    },
    taux_nes_hors_nc: {
      label: "Personnes nées hors de Nouvelle-Calédonie",
      thresholds: [5, 10, 20, 35, 50],
      colors: ["#f0eef5", "#ddd8e9", "#beb3d4", "#9584b6", "#6c568f", "#49356c"]
    }
  };

  const format1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const format2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const format0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const pct = (x) => `${format1.format(x)} %`;

  // --- Données ---------------------------------------------------------------

  // d3 attend des anneaux dans le sens horaire. Les IRIS mêlent les deux
  // orientations d'un polygone à l'autre d'un même multipolygone : chaque
  // polygone qui couvrirait plus d'un hémisphère est retourné séparément.
  function rewind(features) {
    const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
    const fix = (polygon) => (d3.geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI ? flip(polygon) : polygon);
    return features.map((feature) => {
      const g = feature.geometry;
      if (!g) return feature;
      const coordinates = g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix);
      return { ...feature, geometry: { ...g, coordinates } };
    });
  }

  function load() {
    return d3.json("donnees/disparites-territoriales-nouvelle-caledonie-nc.json").then((bundle) => {
      const byId = new Map(bundle.nc_data.map((row) => [String(row.map_id), row]));
      const features = rewind(bundle.nc_geometry.features).map((feature) => {
        const row = byId.get(String(feature.properties.map_id));
        if (!row) throw new Error(`IRIS sans données : ${feature.properties.map_id}`);
        return { ...feature, row };
      });
      if (features.length !== 162) throw new Error(`${features.length} IRIS au lieu de 162`);
      const populated = bundle.nc_data.filter((row) => row.population > 0);
      return {
        features,
        populated,
        area: rewind(bundle.nc_linework.area.features),
        communes: bundle.nc_linework.communes,
        provinces: bundle.nc_linework.provinces
      };
    });
  }

  const inGN = (row) => GN.includes(row.commune);

  // Classe d'une valeur, comme colorFor dans l'article (d3.bisectRight).
  function classOf(value, definition) {
    if (value == null || !Number.isFinite(+value)) return -1;
    return Math.min(d3.bisectRight(definition.thresholds, +value), definition.colors.length - 1);
  }

  function legendLabel(index, thresholds) {
    if (index === 0) return `< ${thresholds[0]} %`;
    if (index === thresholds.length) return `≥ ${thresholds[index - 1]} %`;
    return `${thresholds[index - 1]}–${thresholds[index]} %`;
  }

  // Coefficient de corrélation de Pearson, comme le nuage de points de
  // l'article (« r de Pearson », chaque IRIS compte une fois).
  function pearson(rows, xKey, yKey) {
    const pairs = rows.filter((r) => Number.isFinite(r[xKey]) && Number.isFinite(r[yKey]));
    const mx = d3.mean(pairs, (r) => r[xKey]);
    const my = d3.mean(pairs, (r) => r[yKey]);
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    pairs.forEach((r) => {
      sxy += (r[xKey] - mx) * (r[yKey] - my);
      sxx += (r[xKey] - mx) ** 2;
      syy += (r[yKey] - my) ** 2;
    });
    return { r: sxy / Math.sqrt(sxx * syy), n: pairs.length, slope: sxy / sxx, intercept: my - (sxy / sxx) * mx };
  }

  function values(data) {
    const rows = data.populated;
    if (rows.length !== 155) throw new Error(`${rows.length} IRIS peuplés au lieu de 155`);
    const below = (key, threshold) => rows.filter((r) => Number.isFinite(r[key]) && r[key] < threshold);
    const above = (key, threshold) => rows.filter((r) => Number.isFinite(r[key]) && r[key] >= threshold);
    const internetLow = below("taux_sans_internet", 20);
    const internetHigh = above("taux_sans_internet", 80);
    const chomageLow = below("taux_chomage", 8);
    const chomageHigh = above("taux_chomage", 30);
    const bac3High = above("taux_bac3_plus", 35);
    // Les phrases des écrans affirment ces répartitions : on les vérifie.
    if (internetHigh.filter(inGN).length > 2) throw new Error("Écran 01 : revoir « seuls … dans le Grand Nouméa »");
    if (chomageHigh.filter(inGN).length !== 1) throw new Error("Écran 02 : revoir « un seul est dans le Grand Nouméa »");
    if (bac3High.some((r) => r.commune !== "Nouméa")) throw new Error("Écran 03 : un IRIS hors de Nouméa dépasse 35 %");
    const correlation = pearson(rows, "taux_sans_internet", "taux_chomage");
    const origin = pearson(rows, "taux_nes_hors_nc", "taux_bac3_plus");
    // L'écran 04 parle d'un lien fort et positif : on le vérifie.
    if (origin.r < 0.6) throw new Error(`Écran 04 : corrélation trop faible (${origin.r})`);
    return {
      internet_haut: String(internetHigh.length),
      internet_haut_gn: String(internetHigh.filter(inGN).length),
      internet_bas: String(internetLow.length),
      internet_bas_gn: String(internetLow.filter(inGN).length),
      chomage_haut: String(chomageHigh.length),
      chomage_bas: String(chomageLow.length),
      chomage_bas_gn: String(chomageLow.filter(inGN).length),
      bac3_haut_noumea: `${bac3High.length} sur ${bac3High.length}`,
      bac3_mediane: pct(d3.median(rows, (r) => r.taux_bac3_plus)),
      r_chomage_internet: `r = ${format2.format(correlation.r)}`,
      iris_peuples: String(correlation.n),
      r_nes_bac3: `r = ${format2.format(origin.r)}`,
      iris_peuples_nes: String(origin.n)
    };
  }

  // --- Cartes ---------------------------------------------------------------

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  // Cadre de papier crayonné, comme les panneaux de carte du site.
  function paperCard(svg, rc, x, y, width, height, seed) {
    svg.append("rect").attr("x", x).attr("y", y).attr("width", width).attr("height", height).attr("fill", paper);
    roughRect(svg, rc, x, y, width, height, { fill: "none", stroke: "#b9b1a5", strokeWidth: 1.6, roughness: 1.5, bowing: 1.2, seed });
  }

  // Côte : seules les îles assez grandes sont crayonnées ; les îlots, en trait
  // rough, deviennent des pâtés illisibles une fois l'image réduite.
  function drawCoast(svg, rc, path, features, seed, minArea = 90, strokeWidth = 2) {
    const polygons = features.flatMap((feature) => {
      const geometry = feature.geometry;
      return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    });
    const small = [];
    polygons.forEach((coordinates, index) => {
      const shape = { type: "Polygon", coordinates };
      const d = path(shape);
      if (!d) return;
      if (path.area(shape) < minArea) small.push(d);
      else roughPath(svg, rc, d, { stroke: ink, strokeWidth, roughness: 1.1, bowing: 1, seed: `${seed}-${index}` });
    });
    if (small.length) {
      svg.append("path").attr("d", small.join("")).attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1.1).attr("stroke-linejoin", "round");
    }
  }

  // IRIS colorés par classe : aplat, hachure rough légère dans le ton de la
  // classe, limites d'IRIS fines et limites communales plus marquées.
  function drawIris(svg, rc, data, path, definition, { seedKey, gap = 7, communes = true, irisStroke = 0.6 }) {
    data.features.forEach((feature) => {
      const id = classOf(feature.row[definition.key], definition);
      const fill = id < 0 ? noData : definition.colors[id];
      const d = path(feature);
      if (!d) return;
      svg.append("path").attr("d", d).attr("fill", fill);
      // La première classe, presque couleur papier, garde une hachure lâche :
      // elle ne doit pas se confondre avec la mer ni avec un IRIS sans habitant.
      if (id >= 0) {
        roughPath(svg, rc, d, {
          fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: id ? gap - id * 0.6 : gap * 1.3,
          fillWeight: 1, stroke: "none", strokeWidth: 0, roughness: 1.3, bowing: 1, opacity: id ? 0.45 : 0.3,
          seed: `${seedKey}-${feature.properties.map_id}`
        });
      }
    });
    svg.append("path").attr("d", data.features.map((f) => path(f)).join(""))
      .attr("fill", "none").attr("stroke", "#4f4942").attr("stroke-width", irisStroke).attr("stroke-opacity", 0.45).attr("stroke-linejoin", "round");
    if (communes) {
      svg.append("path").attr("d", path(data.communes)).attr("fill", "none")
        .attr("stroke", "#3b3630").attr("stroke-width", 1.4).attr("stroke-opacity", 0.55).attr("stroke-linejoin", "round");
    }
  }

  // Une boîte est libre si aucun de ses points d'échantillonnage ne tombe sur
  // la terre : l'agrandissement du Grand Nouméa se place dans la mer.
  function boxIsFree(projection, area, [x0, y0, x1, y1]) {
    for (let i = 0; i <= 8; i += 1) {
      for (let j = 0; j <= 8; j += 1) {
        const point = projection.invert([x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * j / 8]);
        if (point && area.some((feature) => d3.geoContains(feature, point))) return false;
      }
    }
    return true;
  }

  function gnProjection(box, bbox = GN_BBOX) {
    const [west, south, east, north] = bbox;
    return d3.geoMercator().fitExtent(box, { type: "MultiPoint", coordinates: [[west, south], [east, north]] }).clipExtent(box);
  }

  // Noms de repère dans le Grand Nouméa : IRIS regroupés par quartier, nommés
  // au centre de leur emprise ; un nom qui en chevaucherait un autre est omis.
  const quartiers = [
    [/^Centre ville/, "Centre-ville"], [/^Anse Vata/, "Anse Vata"], [/^Ouémo/, "Ouémo"], [/Magenta/, "Magenta"],
    [/^Vallée des Colons/, "Vallée des Colons"], [/^Rivi.re Sal.e/, "Rivière-Salée"], [/^Ducos$/, "Ducos"],
    [/^Nouville/, "Nouville"], [/^Tina/, "Tina"], [/^Koutio/, "Koutio"], [/^Boulari/, "Boulari"],
    [/^Paita centre/, "Païta"], [/^N'Géa/, "N’Géa"], [/^Val Plaisance/, "Val Plaisance"], [/^Normandie/, "Normandie"]
  ];

  function quartierLabels(svg, data, path, box, size, only = null) {
    const groups = d3.rollups(
      data.features.filter((f) => GN.includes(f.properties.commune))
        .map((f) => [quartiers.find(([pattern]) => pattern.test(f.properties.map_label || ""))?.[1], f])
        .filter(([name]) => name && (!only || only.includes(name))),
      (items) => {
        const shape = { type: "FeatureCollection", features: items.map(([, f]) => f) };
        return { area: path.area(shape), xy: path.centroid(shape) };
      },
      ([name]) => name
    ).sort((a, b) => d3.descending(a[1].area, b[1].area));
    const placed = [];
    groups.forEach(([name, g]) => {
      const [x, y] = g.xy;
      if (!Number.isFinite(x)) return;
      const half = (name.length * size * 0.55) / 2 + 4;
      const b = [x - half, y - size * 0.6, x + half, y + size * 0.6];
      if (b[0] < box[0][0] || b[2] > box[1][0] || b[1] < box[0][1] || b[3] > box[1][1]) return;
      if (placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return;
      placed.push(b);
      label(svg, name, x, y, { anchor: "middle", size, weight: 800, color: "#3f3a35", halo: true, haloWidth: 5 }).classed("nom-quartier", true);
    });
  }

  // Panneau du Grand Nouméa : IRIS agrandis, côte, limites communales.
  function drawGrandNoumea(svg, rc, data, definition, box, { seedKey, labels = false, labelSize = 22, title = null, bbox = GN_BBOX, only = null }) {
    const [[x0, y0], [x1, y1]] = box;
    paperCard(svg, rc, x0, y0, x1 - x0, y1 - y0, `${seedKey}-cadre`);
    const inner = [[x0 + 8, y0 + 8], [x1 - 8, y1 - 8]];
    const projection = gnProjection(inner, bbox);
    const path = d3.geoPath(projection);
    const clip = `clip-${seedKey}`;
    svg.append("defs").append("clipPath").attr("id", clip).append("rect")
      .attr("x", inner[0][0]).attr("y", inner[0][1]).attr("width", inner[1][0] - inner[0][0]).attr("height", inner[1][1] - inner[0][1]);
    const g = svg.append("g").attr("clip-path", `url(#${clip})`);
    drawIris(g, rc, data, path, definition, { seedKey, gap: 6, irisStroke: 0.8 });
    drawCoast(g, rc, path, data.area, `${seedKey}-cote`, 30, 1.8);
    if (labels) quartierLabels(svg, data, path, inner, labelSize, only);
    if (title) label(svg, title, x0 + 16, y0 + 26, { size: labelSize, weight: 800, halo: true, haloWidth: 7 });
    return projection;
  }

  // Légende de l'article : une case par classe, chaque classe libellée, et le
  // gris des IRIS sans habitant.
  function drawLegend(svg, rc, definition, x, y, width, seedKey) {
    label(svg, `${definition.label}, 2019`, x, y, { size: 24, weight: 800 });
    const top = y + 24;
    const count = definition.colors.length;
    const item = width / count;
    const swatch = item - 6;
    definition.colors.forEach((fill, index) => {
      const x0 = x + index * item;
      svg.append("rect").attr("x", x0).attr("y", top).attr("width", swatch).attr("height", 28).attr("fill", fill);
      roughRect(svg, rc, x0, top, swatch, 28, {
        fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: index ? 7 - index * 0.6 : 9,
        fillWeight: 0.9, stroke: ink, strokeWidth: 0.9, roughness: 1.3, opacity: 0.7, seed: `${seedKey}-legende-${index}`
      });
      label(svg, legendLabel(index, definition.thresholds), x0 + swatch / 2, top + 48, {
        anchor: "middle", size: Math.min(21, item / 5.4), weight: 700, color: muted
      });
    });
    const ny = top + 82;
    svg.append("rect").attr("x", x).attr("y", ny - 11).attr("width", 34).attr("height", 22).attr("fill", noData).attr("stroke", "#b9b1a5");
    label(svg, "zone sans habitant", x + 44, ny, { size: 20, color: muted });
  }
  const LEGEND_HEIGHT = 128;

  // Légende compacte : une case par classe, les seuils écrits aux limites.
  function drawCompactLegend(svg, rc, definition, x, y, width, seedKey) {
    const count = definition.colors.length;
    const item = width / count;
    definition.colors.forEach((fill, index) => {
      const x0 = x + index * item;
      svg.append("rect").attr("x", x0).attr("y", y).attr("width", item).attr("height", 22).attr("fill", fill);
      roughRect(svg, rc, x0, y, item, 22, {
        fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: index ? 7 - index * 0.6 : 9,
        fillWeight: 0.9, stroke: ink, strokeWidth: 0.8, roughness: 1.2, opacity: 0.6, seed: `${seedKey}-legende-${index}`
      });
    });
    definition.thresholds.forEach((t, index) => {
      const last = index === definition.thresholds.length - 1;
      label(svg, last ? `${t} %` : String(t), x + (index + 1) * item, y + 40, { anchor: "middle", size: 19, weight: 700, color: muted });
    });
  }

  const draw = {
    // Deux indicateurs sur la même emprise, comme les cartes côte à côte de
    // l'article ; empilées dans un format haut.
    "deux-cartes"(svg, data, { rc, node, width, height }) {
      const keys = [node.dataset.gauche, node.dataset.droite];
      const definitions = keys.map((key) => ({ key, ...metrics[key] }));
      if (definitions.some((d) => !d.colors)) throw new Error(`Indicateur inconnu : ${keys.join(", ")}`);
      const stacked = height > width * 1.05;
      const gap = 24;
      const titleH = 34;
      const legendH = 52;
      const panelW = stacked ? width : (width - gap) / 2;
      const panelH = stacked ? (height - gap) / 2 : height;
      const only = ["Rivière-Salée", "Ducos", "Magenta", "Anse Vata", "Koutio", "Nouville"];
      definitions.forEach((definition, index) => {
        const x0 = stacked ? 0 : index * (panelW + gap);
        const y0 = stacked ? index * (panelH + gap) : 0;
        const titleText = definition.key === "taux_nes_hors_nc" ? "Nés hors de Nouvelle-Calédonie" : definition.label;
        label(svg, titleText, x0 + 2, y0 + titleH / 2, { size: Math.min(25, panelW / 19), weight: 800, color: definition.colors[5] });
        const mapBox = [[x0 + 2, y0 + titleH], [x0 + panelW - 2, y0 + panelH - legendH]];
        drawGrandNoumea(svg, rc, data, definition, mapBox, {
          seedKey: `deux-${definition.key}`, bbox: AGGLO_BBOX, labels: true, labelSize: Math.max(17, Math.min(21, panelW / 24)), only
        });
        drawCompactLegend(svg, rc, definition, x0 + 6, y0 + panelH - legendH + 10, panelW - 12, `deux-${definition.key}`);
      });
    },

    // Carte des 162 IRIS, avec l'agrandissement du Grand Nouméa. Dans un
    // format haut, l'agrandissement passe sous la carte ; sinon il se loge dans
    // la mer, au sud-ouest de la Grande Terre.
    carte(svg, data, { rc, node, width, height, layout }) {
      const definition = { key: node.dataset.metric, ...metrics[node.dataset.metric] };
      if (!definition.colors) throw new Error(`Indicateur inconnu : ${node.dataset.metric}`);
      const minimal = node.dataset.minimal === "true";
      const seedKey = `carte-${definition.key}${minimal ? "-mini" : ""}`;
      const legend = minimal ? 0 : LEGEND_HEIGHT;
      const mapBottom = height - legend - (minimal ? 0 : 14);
      const tall = !minimal && mapBottom > width * 0.95;
      const mainBox = tall ? [[6, 6], [width - 6, mapBottom * 0.6]] : [[6, 6], [width - 6, mapBottom - 6]];
      const projection = d3.geoMercator().fitExtent(mainBox, { type: "FeatureCollection", features: data.area });
      const path = d3.geoPath(projection);
      drawIris(svg, rc, data, path, definition, { seedKey, gap: 7, irisStroke: minimal ? 0.3 : 0.45 });
      roughPath(svg, rc, path(data.provinces), { stroke: "#332e29", strokeWidth: 1.2, roughness: 1.6, bowing: 1.2, opacity: 0.45, seed: `${seedKey}-provinces` });
      drawCoast(svg, rc, path, data.area, `${seedKey}-cote`, 90, minimal ? 1.4 : 2);
      if (minimal) return;

      // Emprise du Grand Nouméa sur la carte principale.
      const [west, south, east, north] = GN_BBOX;
      const [ax, ay] = projection([west, north]);
      const [bx, by] = projection([east, south]);
      roughRect(svg, rc, ax, ay, bx - ax, by - ay, { stroke: ink, strokeWidth: 2.2, roughness: 0.9, seed: `${seedKey}-emprise` });

      let inset;
      if (tall) {
        inset = [[6, mapBottom * 0.62], [width - 6, mapBottom - 4]];
      } else {
        // Plus grande boîte libre ancrée dans le coin inférieur gauche.
        let size = 0.62;
        let free = null;
        for (; size > 0.2; size -= 0.03) {
          const w = (mainBox[1][0] - mainBox[0][0]) * size;
          const h = Math.min((mainBox[1][1] - mainBox[0][1]) * size * 1.15, w * 0.72);
          const candidate = [mainBox[0][0], mainBox[1][1] - h, mainBox[0][0] + w, mainBox[1][1]];
          if (boxIsFree(projection, data.area, candidate)) { free = candidate; break; }
        }
        if (!free) throw new Error("Pas de place pour l’agrandissement du Grand Nouméa");
        inset = [[free[0], free[1]], [free[2], free[3]]];
      }
      const labelSize = layout === "link" ? 18 : 23;
      drawGrandNoumea(svg, rc, data, definition, inset, { seedKey: `${seedKey}-gn`, title: "Grand Nouméa", labelSize: labelSize + 4 });
      // Trait de rappel entre l'emprise et son agrandissement.
      const anchor = tall ? [(inset[0][0] + inset[1][0]) / 2, inset[0][1]] : [inset[1][0], inset[0][1]];
      roughLine(svg, rc, tall ? (ax + bx) / 2 : ax, by, anchor[0], anchor[1], { strokeWidth: 1.6, opacity: 0.7, seed: `${seedKey}-rappel` });

      const legendWidth = Math.min(width - 8, 860);
      drawLegend(svg, rc, definition, (width - legendWidth) / 2, mapBottom + 30, legendWidth, seedKey);
    },

    // Le Grand Nouméa seul, IRIS nommés par quartier, avec un repère de
    // situation dans le pays.
    "grand-noumea"(svg, data, { rc, node, width, height }) {
      const definition = { key: node.dataset.metric, ...metrics[node.dataset.metric] };
      const seedKey = `gn-${definition.key}`;
      const mapBottom = height - LEGEND_HEIGHT - 14;
      const box = [[2, 2], [width - 2, mapBottom]];
      const projection = drawGrandNoumea(svg, rc, data, definition, box, {
        seedKey, labels: true, labelSize: Math.max(21, Math.min(26, width / 40)), bbox: AGGLO_BBOX
      });

      // Repère de situation : silhouette du pays, emprise agrandie en rouge,
      // dans le premier coin du cadre qui tombe en mer.
      const locW = Math.min(230, width * 0.26);
      const locH = locW * 0.62;
      const corners = [
        [box[0][0] + 16, mapBottom - locH - 16], [box[1][0] - locW - 16, mapBottom - locH - 16],
        [box[1][0] - locW - 16, box[0][1] + 16], [box[0][0] + 16, box[0][1] + 16]
      ];
      const corner = corners.find(([cx, cy]) => boxIsFree(projection, data.area, [cx - 6, cy - 6, cx + locW + 6, cy + locH + 6])) || corners[0];
      const locBox = [corner, [corner[0] + locW, corner[1] + locH]];
      svg.append("rect").attr("x", locBox[0][0] - 6).attr("y", locBox[0][1] - 6)
        .attr("width", locW + 12).attr("height", locBox[1][1] - locBox[0][1] + 12).attr("fill", paper).attr("stroke", "#b9b1a5");
      const loc = d3.geoMercator().fitExtent(locBox, { type: "FeatureCollection", features: data.area });
      const locPath = d3.geoPath(loc);
      svg.append("path").attr("d", data.area.map((f) => locPath(f)).join("")).attr("fill", "#e9e2d3").attr("stroke", ink).attr("stroke-width", 0.8);
      const [west, south, east, north] = AGGLO_BBOX;
      const [ax, ay] = loc([west, north]);
      const [bx, by] = loc([east, south]);
      svg.append("rect").attr("x", ax - 3).attr("y", ay - 3).attr("width", bx - ax + 6).attr("height", by - ay + 6)
        .attr("fill", "none").attr("stroke", trendColor).attr("stroke-width", 2.4);
      // Les noms de quartier restent lisibles au-dessus du repère.
      svg.selectAll("text.nom-quartier").raise();

      const legendWidth = Math.min(width - 8, 860);
      drawLegend(svg, rc, definition, (width - legendWidth) / 2, mapBottom + 30, legendWidth, seedKey);
    },

    // Nuage de points : un IRIS peuplé par point, taille selon la population,
    // couleur selon l'appartenance au Grand Nouméa ; droite de tendance rouge
    // comme dans l'article.
    nuage(svg, data, { rc, node, width, height }) {
      const xKey = node.dataset.x;
      const yKey = node.dataset.y;
      const rows = data.populated.filter((r) => Number.isFinite(r[xKey]) && Number.isFinite(r[yKey]));
      const fit = pearson(rows, xKey, yKey);
      const size = 24;
      const left = 78;
      const right = width - 16;
      const top = 74;
      const bottom = height - 74;
      const x = d3.scaleLinear().domain([0, 100]).range([left, right]);
      const yMax = Math.ceil(d3.max(rows, (r) => r[yKey]) / 10) * 10;
      const y = d3.scaleLinear().domain([0, yMax]).range([bottom, top]);
      const radius = d3.scaleSqrt().domain([0, d3.max(rows, (r) => r.population)]).range([0, Math.min(22, width / 46)]);

      svg.append("rect").attr("x", left).attr("y", top).attr("width", right - left).attr("height", bottom - top).attr("fill", paper);
      x.ticks(5).forEach((t) => {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom).attr("stroke", "#e1d9cb").attr("stroke-dasharray", "3 6");
        label(svg, `${t} %`, x(t), bottom + 26, { anchor: "middle", size: 21, color: muted });
      });
      y.ticks(5).forEach((t) => {
        svg.append("line").attr("x1", left).attr("x2", right).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "#e1d9cb").attr("stroke-dasharray", "3 6");
        label(svg, `${t} %`, left - 10, y(t), { anchor: "end", size: 21, color: muted });
      });
      roughRect(svg, rc, left, top, right - left, bottom - top, { stroke: "#b9b1a5", strokeWidth: 1.2, seed: "nuage-cadre" });

      // Les plus gros points d'abord, pour laisser voir les petits.
      rows.slice().sort((a, b) => d3.descending(a.population, b.population) || d3.ascending(a.map_id, b.map_id)).forEach((row) => {
        const color = inGN(row) ? gnColor : restColor;
        roughCircle(svg, rc, x(row[xKey]), y(row[yKey]), Math.max(7, radius(row.population) * 2), {
          fill: color, fillStyle: "hachure", hachureGap: 3, fillWeight: 1, stroke: hatchColor(color), strokeWidth: 1, roughness: 0.8,
          seed: `nuage-${row.map_id}`
        });
      });

      const x0 = 0;
      const x1 = Math.min(100, (yMax - fit.intercept) / fit.slope);
      roughLine(svg, rc, x(x0), y(fit.intercept + fit.slope * x0), x(x1), y(fit.intercept + fit.slope * x1), {
        stroke: trendColor, strokeWidth: 3, roughness: 0.8, seed: "nuage-tendance"
      });

      label(svg, "Ménages sans accès à internet →", right, height - 14, { anchor: "end", size, weight: 800, baseline: "auto" });
      label(svg, "↑ Chômage parmi les actifs", left - 4, top - 22, { size, weight: 800 });
      // Légende des groupes, en mots.
      const gnCount = rows.filter(inGN).length;
      const restCount = rows.length - gnCount;
      const legendY = top + 26;
      [[gnColor, `Grand Nouméa (${gnCount} zones)`], [restColor, `reste du pays (${restCount} zones)`]].forEach(([color, text], index) => {
        const ly = legendY + index * 34;
        roughCircle(svg, rc, left + 24, ly, 18, { fill: color, fillStyle: "hachure", hachureGap: 3, stroke: hatchColor(color), seed: `nuage-legende-${index}` });
        label(svg, text, left + 42, ly, { size: 22, weight: 800, color: hatchColor(color), halo: true });
      });
      label(svg, "tendance", x(Math.min(92, x1 - 4)), y(fit.intercept + fit.slope * Math.min(92, x1 - 4)) + 30, {
        anchor: "end", size: 22, weight: 800, color: trendColor, halo: true
      });
    }
  };

  start({ load, values, draw });
})();
