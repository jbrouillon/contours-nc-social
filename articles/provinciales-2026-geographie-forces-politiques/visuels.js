// Campagne « Provinciales 2026 : où les forces politiques ont-elles gagné du
// terrain ? ». Les calculs reproduisent ceux de l'article (index.qmd et
// assets/js/provinciales-2026-geographie-forces.js du site) : mêmes fichiers,
// mêmes appariements de bureaux, mêmes classes de couleurs.
(() => {
  "use strict";

  const { label, roughPath, roughLine, roughRect, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const frame = "#d5ccbe";
  const noData = "#e9e5dd";
  const decrease = "#c54832";
  const increase = "#237a67";
  const deltaColors = ["#7a1f14", "#bc4630", "#e8957b", "#f1ebe1", "#86c4aa", "#2c8a6b", "#11503e"];
  const FLOOR = -1000;

  const format0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const formatKm = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  const format1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const minus = (text) => text.replace("-", "−");
  const pct = (x) => `${format1.format(x)} %`;
  const signed = (x) => minus(`${x >= 0 ? "+" : ""}${format1.format(x)}`);
  const pts = (x) => `${signed(x)} points`;
  const absPts = (x) => `${format1.format(Math.abs(x))} points`;

  // --- Données ---------------------------------------------------------------

  // Typage automatique, sauf les codes de bureau (« 0001 ») gardés en nombre
  // comme dans le site.
  function load() {
    return Promise.all([
      d3.csv("donnees/synthese_province.csv", d3.autoType),
      d3.csv("donnees/synthese_communes.csv", d3.autoType),
      d3.csv("donnees/bureaux_forces_2019_2026.csv", d3.autoType),
      d3.csv("donnees/appariement_bureaux_2019_2026.csv", d3.autoType),
      d3.json("donnees/communes.geojson"),
      d3.json("donnees/provinces.geojson"),
      d3.json("donnees/metadata.json"),
      d3.json("donnees/vote_context_secteurs.geojson"),
      d3.json("donnees/iris_context.geojson")
    ]).then(([province, communes, points, matches, communeShapes, provinceShapes, metadata, secteurs, iris]) => ({
      province, communes, points, matches, communeShapes, provinceShapes, metadata,
      secteurs: rewind(secteurs.features), iris: rewind(iris.features)
    }));
  }

  function valueAt(data, province, force, variable = "score_2026") {
    const row = data.province.find((d) => d.province === province && d.force === force && d.annee === 2026);
    if (!row || !Number.isFinite(row[variable])) throw new Error(`Absent : ${province} · ${force} · ${variable}`);
    return row[variable];
  }

  // Écart affiché : différence des deux scores arrondis au dixième, pour que
  // le lecteur retrouve le même résultat que les scores montrés ailleurs
  // (36,0 % → 39,9 % donne +3,9 et non +4,0, valeur arrondie de +3,97).
  function shownGap(data, province, force) {
    const before = Math.round(valueAt(data, province, force, "score_2019") * 10);
    const after = Math.round(valueAt(data, province, force, "score_2026") * 10);
    return (after - before) / 10;
  }

  // d3 attend des anneaux dans le sens horaire : une couche au sens
  // RFC 7946 (antihoraire) est retournée.
  function rewind(features) {
    return features.map((feature) => {
      if (d3.geoArea(feature) <= 2 * Math.PI) return feature;
      const g = feature.geometry;
      const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
      return { ...feature, geometry: { ...g, coordinates: g.type === "Polygon" ? flip(g.coordinates) : g.coordinates.map(flip) } };
    });
  }

  // Évolution 2019 → 2026 du bureau de chaque secteur de Nouméa, clé :
  // numéro du bureau de 2026 (celui du secteur). L'appariement est celui de
  // l'article, y compris les bureaux appariés par numéro de secteur.
  function sectorDeltas(data, force) {
    const score = (year, code) => data.points.find((d) => d.province === "Province Sud" && d.commune === "Nouméa" &&
      d.annee === year && d.force === force && Number(d.code_bv) === code)?.pct;
    const deltas = new Map();
    deltas.parSecteur = [];
    pairs(data, "Province Sud").filter((p) => p.commune === "Nouméa").forEach((pair) => {
      const before = score(2019, Number(pair.code_bv_2019));
      const after = score(2026, Number(pair.code_bv_2026));
      if (!Number.isFinite(before) || !Number.isFinite(after)) return;
      deltas.set(Number(pair.code_bv_2026), after - before);
      if (pair.methode === "secteur") deltas.parSecteur.push(Number(pair.code_bv_2026));
    });
    return deltas;
  }

  // Repères de quartier : contours IRIS de Nouméa (iris_context.geojson),
  // regroupés par quartier et nommés au centre de leur emprise. Seuls les
  // quartiers les plus connus sont nommés ; un nom qui en chevaucherait un
  // autre est omis.
  const quartiers = [
    [/^Nouville/, "Nouville"], [/^Ducos$/, "Ducos"], [/^Riv.re Sal.e/, "Rivière-Salée"],
    [/Montravel/, "Montravel"], [/^Tindu/, "Tindu"], [/^Kam.r./, "Kaméré"], [/^Normandie/, "Normandie"],
    [/^Tina/, "Tina"], [/^PK 6/, "PK6"], [/^PK 7/, "PK7"], [/Magenta/, "Magenta"],
    [/^Vall.e des Colons/, "Vallée des Colons"], [/^Centre ville/, "Centre-ville"], [/^Anse Vata/, "Anse Vata"],
    [/^Ou.mo/, "Ouémo"], [/^N.G.a/, "N’Géa"], [/^Portes de Fer/, "Portes de Fer"]
  ];
  function sectorLabels(svg, data, path, box) {
    const groups = d3.rollups(
      data.iris.map((f) => [quartiers.find(([pattern]) => pattern.test(f.properties.libgeo || ""))?.[1], f]).filter(([name]) => name),
      (items) => {
        const shape = { type: "FeatureCollection", features: items.map(([, f]) => f) };
        return { area: path.area(shape), xy: path.centroid(shape) };
      },
      ([name]) => name
    ).sort((a, b) => d3.descending(a[1].area, b[1].area));
    const size = 21;
    const placed = [];
    groups.forEach(([name, g]) => {
      const [x, y] = g.xy;
      if (!Number.isFinite(x)) return;
      const half = (name.length * size * 0.55) / 2 + 4;
      const b = [x - half, y - size * 0.6, x + half, y + size * 0.6];
      if (b[0] < box[0][0] || b[2] > box[1][0] || b[1] < box[0][1] || b[3] > box[1][1]) return;
      if (placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return;
      placed.push(b);
      label(svg, name, x, y, { anchor: "middle", size, weight: 800, color: "#3f3a35", halo: true, haloWidth: 5 });
    });
  }

  // Évolution médiane selon le niveau de 2019, comme dans l'article (seuils de
  // lecture : moins de 25 % et 55 % ou plus).
  function noumeaBands(data) {
    const score = (year, code) => data.points.find((d) => d.commune === "Nouméa" && d.annee === year &&
      d.force === "loyaliste" && Number(d.code_bv) === code)?.pct;
    const rows = pairs(data, "Province Sud").filter((p) => p.commune === "Nouméa").map((p) => {
      const before = score(2019, Number(p.code_bv_2019));
      return { before, delta: score(2026, Number(p.code_bv_2026)) - before };
    }).filter((d) => Number.isFinite(d.delta));
    const median = (list) => d3.median(list, (d) => d.delta);
    const weak = rows.filter((d) => d.before < 25);
    const strong = rows.filter((d) => d.before >= 55);
    if (!weak.length || !strong.length) throw new Error("Classes de niveau vides à Nouméa");
    return { weak: median(weak), strong: median(strong) };
  }
  const ptsWord = (x) => `${signed(x)} ${Math.abs(Math.round(x * 10) / 10) < 2 ? "point" : "points"}`;

  function sectorCounts(data) {
    const deltas = sectorDeltas(data, "loyaliste");
    const codes = new Set(data.secteurs.map((f) => Number(f.properties.code_bv)));
    const compared = Array.from(deltas.keys()).filter((code) => codes.has(code));
    const up = compared.filter((code) => deltas.get(code) > 0).length;
    // Le titre de l'écran dit « presque tous » : on le vérifie.
    if (up / compared.length < 0.85) throw new Error(`Progression dans ${up} secteurs sur ${compared.length} : revoir le titre`);
    return { up: String(up), compared: String(compared.length) };
  }

  function communeAt(data, province, commune, force, variable = "score_2026") {
    const row = data.communes.find((d) => d.province === province && d.commune === commune && d.force === force && d.annee === 2026);
    if (!row || !Number.isFinite(row[variable])) throw new Error(`Absent : ${commune} · ${force} · ${variable}`);
    return row[variable];
  }

  function communeMax(data, province, force) {
    return d3.greatest(
      data.communes.filter((d) => d.province === province && d.force === force && d.annee === 2026 && Number.isFinite(d.evolution_points)),
      (d) => d.evolution_points
    );
  }

  // Bureaux appariés par nom, par numéro ou, à Nouméa, par numéro de secteur
  // (appariement_bureaux_2019_2026.csv).
  function pairs(data, province) {
    return data.matches.filter((d) => d.province === province && ["nom", "numero", "secteur"].includes(d.methode));
  }

  function series(data, province, key, year) {
    const force = key === "abstention" ? "participation" : key;
    return new Map(
      data.points
        .filter((d) => d.province === province && d.annee === year && d.force === force)
        .map((d) => [`${d.commune}|${Number(d.code_bv)}`, key === "abstention" ? 100 - d.pct : d.pct])
    );
  }

  function scatter(data, province, xKey, yKey) {
    const xs = series(data, province, xKey, 2019);
    const ys = series(data, province, yKey, 2026);
    return pairs(data, province)
      .map((pair) => ({
        commune: pair.commune,
        inscrits: pair.inscrits_2026,
        x: xs.get(`${pair.commune}|${Number(pair.code_bv_2019)}`),
        y: ys.get(`${pair.commune}|${Number(pair.code_bv_2026)}`)
      }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  }

  function values(data) {
    const sud = "Province Sud";
    const nord = "Province Nord";
    const iles = "Province des Iles";
    const centre = scatter(data, sud, "centre_non_ind", "centre_non_ind");
    const abstention = scatter(data, iles, "abstention", "abstention");
    return {
      sud_loy_2019: pct(valueAt(data, sud, "loyaliste", "score_2019")),
      sud_loy_2026: pct(valueAt(data, sud, "loyaliste")),
      sud_loy_evo_n: valueAt(data, sud, "loyaliste", "evolution_points"),
      farino_loy_2019: pct(communeAt(data, sud, "Farino", "loyaliste", "score_2019")),
      farino_loy_2026: pct(communeAt(data, sud, "Farino", "loyaliste")),
      poya_loy_2026: pct(communeAt(data, sud, "Poya Sud", "loyaliste")),
      noumea_secteurs_hausse: sectorCounts(data).up,
      noumea_med_fort: ptsWord(noumeaBands(data).strong),
      noumea_med_faible: ptsWord(noumeaBands(data).weak),
      noumea_secteurs_comparables: sectorCounts(data).compared,
      sud_centre_reculs: String(centre.filter((d) => d.y < d.x).length),
      sud_paires: String(pairs(data, sud).length),
      sud_centre_2019: pct(valueAt(data, sud, "centre_non_ind", "score_2019")),
      sud_centre_2026: pct(valueAt(data, sud, "centre_non_ind")),
      nord_uc_2019: pct(valueAt(data, nord, "uc_flnks", "score_2019")),
      nord_uc_2026: pct(valueAt(data, nord, "uc_flnks")),
      nord_uc_evo_n: valueAt(data, nord, "uc_flnks", "evolution_points"),
      nord_uni_2019: pct(valueAt(data, nord, "uni_palika", "score_2019")),
      nord_uni_2026: pct(valueAt(data, nord, "uni_palika")),
      nord_uni_evo_n: valueAt(data, nord, "uni_palika", "evolution_points"),
      nord_bloc_2019: pct(valueAt(data, nord, "bloc_independantiste", "score_2019")),
      nord_bloc_2026: pct(valueAt(data, nord, "bloc_independantiste")),
      poindimie_uni: pct(communeAt(data, nord, "Poindimié", "uni_palika")),
      iles_abst_hausses: String(abstention.filter((d) => d.y > d.x).length),
      iles_paires: String(pairs(data, iles).length),
      iles_part_2019: pct(valueAt(data, iles, "participation", "score_2019")),
      iles_part_2026: pct(valueAt(data, iles, "participation")),
      ouvea_part_recul: absPts(communeAt(data, iles, "Ouvéa", "participation", "evolution_points")),
      mare_na: pct(communeAt(data, iles, "Maré", "dynamique_autochtone")),
      iles_na_2019: pct(valueAt(data, iles, "dynamique_autochtone", "score_2019")),
      iles_na_2026: pct(valueAt(data, iles, "dynamique_autochtone")),
      iles_uc_2026: pct(valueAt(data, iles, "uc_flnks"))
    };
  }

  // --- Classes de couleurs (reprises du site) ------------------------------

  function roundedBreaks(sorted, probabilities, minimum = -Infinity) {
    const span = (d3.quantileSorted(sorted, 0.98) || 0) - (d3.quantileSorted(sorted, 0.02) || 0);
    const unit = span > 40 ? 5 : span > 16 ? 2 : 1;
    const breaks = [];
    probabilities.forEach((probability) => {
      const value = Math.max(minimum, Math.round(d3.quantileSorted(sorted, probability) / unit) * unit);
      if (!breaks.length || value > breaks[breaks.length - 1]) breaks.push(value);
    });
    return breaks;
  }

  function deltaClasses(list) {
    const sorted = list.filter((v) => Number.isFinite(v) && v > FLOOR).map(Math.abs).sort(d3.ascending);
    const [second, third] = roundedBreaks(sorted, [0.4, 0.8], 2);
    const a = 1;
    const b = Math.max(second || 2, 2);
    const c = Math.max(third || b + 1, b + 1);
    const s = (v) => (v > 0 ? `+${format0.format(v)}` : `−${format0.format(-v)}`);
    return {
      thresholds: [FLOOR, -c, -b, -a, a, b, c],
      colors: deltaColors,
      labels: [`< ${s(-c)}`, `${s(-c)} à ${s(-b)}`, `${s(-b)} à ${s(-a)}`, `±${a}`, `${s(a)} à ${s(b)}`, `${s(b)} à ${s(c)}`, `≥ ${s(c)}`],
      hatch: [
        // « Stable » reçoit une hachure horizontale légère : sans elle, il se
        // confond avec le gris des communes ou secteurs sans donnée.
        { angle: 45, gap: 4 }, { angle: 45, gap: 5.5 }, { angle: 45, gap: 7.5 }, { angle: 0, gap: 6 },
        { angle: -45, gap: 7.5 }, { angle: -45, gap: 5.5 }, { angle: -45, gap: 4 }
      ]
    };
  }

  function scoreClasses(color, list, classCount = 5) {
    const sorted = list.filter((v) => Number.isFinite(v) && v > FLOOR).sort(d3.ascending);
    const breaks = roundedBreaks(sorted, d3.range(1, classCount).map((k) => k / classCount)).filter((v) => v > 0 && v < 100);
    const count = breaks.length + 1;
    const base = d3.lch(color);
    const chroma = Math.max(base.c, 38);
    const light = base.l > 70;
    const darkest = light ? 45 : 22;
    const ramp = (t) => d3.lch(96 - (96 - darkest) * t, chroma * (light ? 0.5 + 0.7 * t : 0.22 + 0.85 * t), base.h);
    return {
      thresholds: [FLOOR, ...breaks],
      colors: d3.range(count).map((i) => ramp(count === 1 ? 0.6 : i / (count - 1)).formatHex()),
      labels: d3.range(count).map((i) => {
        if (i === 0) return `< ${format0.format(breaks[0])} %`;
        if (i === count - 1) return `≥ ${format0.format(breaks[count - 2])} %`;
        return `${format0.format(breaks[i - 1])}–${format0.format(breaks[i])} %`;
      }),
      hatch: d3.range(count).map((i) => ({ angle: -41, gap: 8 - (4 * i) / Math.max(1, count - 1) }))
    };
  }

  function classIndex(classes, value) {
    if (!Number.isFinite(value)) return -1;
    return Math.max(0, d3.bisectRight(classes.thresholds, value) - 1);
  }

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  function titleCaseCommune(value, province) {
    const raw = String(value || "").toLocaleLowerCase("fr-FR");
    const special = new Map([
      ["ile des pins", "Île des Pins"], ["l'ile-des-pins", "Île des Pins"], ["île-des-pins", "Île des Pins"],
      ["mont dore", "Mont-Dore"], ["le mont-dore", "Mont-Dore"], ["kaala gomen", "Kaala-Gomen"],
      ["kaala-gomen", "Kaala-Gomen"], ["kalaa-gomen", "Kaala-Gomen"], ["bouloupari", "Boulouparis"]
    ]);
    let text = special.get(raw) || raw.replace(/(^|[-' ])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr-FR"));
    if (/^poya$/i.test(text)) text = province === "Province Nord" ? "Poya Nord" : "Poya Sud";
    return text;
  }

  function communeKey(name, province) {
    return titleCaseCommune(name, province).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  }

  // Essaim symétrique : chaque cercle prend, parmi les positions qui ne
  // chevauchent aucun cercle déjà placé, la plus proche de l'axe central.
  function dodge(sites, x, radius) {
    const placed = [];
    const diameter = radius * 2;
    sites.forEach((site) => {
      const cx = x(site.delta);
      const near = placed.filter((p) => Math.abs(p.cx - cx) < diameter);
      const candidates = [0];
      near.forEach((p) => {
        const dy = Math.sqrt(diameter * diameter - (p.cx - cx) ** 2);
        candidates.push(p.offset + dy, p.offset - dy);
      });
      candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
      const offset = candidates.find((y) => near.every((p) => (p.cx - cx) ** 2 + (p.offset - y) ** 2 >= diameter * diameter - 0.01));
      placed.push({ ...site, cx, offset });
    });
    return placed;
  }

  // --- Croquis ------------------------------------------------------------

  // Rendu repris du site (provinciales-2026-geographie-forces.js) : aplat de
  // couleur, hachure rough.js légère par commune, limites communales nettes,
  // côte crayonnée. Les épaisseurs sont agrandies d'environ 1,8 fois, l'image
  // étant affichée au tiers de sa taille dans un fil mobile.
  const texture = { fillWeight: 1, roughness: 1.4, bowing: 1, opacity: 0.5, gapScale: 1.5 };

  function hatchOptions(color, hatch, seed) {
    return {
      fill: hatchColor(color), fillStyle: "hachure", hachureAngle: hatch.angle, hachureGap: hatch.gap * texture.gapScale,
      fillWeight: texture.fillWeight, stroke: "none", strokeWidth: 0, roughness: texture.roughness,
      bowing: texture.bowing, opacity: texture.opacity, seed
    };
  }

  // Cadre de papier crayonné, comme les panneaux de carte du site.
  function paperCard(svg, rc, x, y, width, height, seed) {
    svg.append("rect").attr("x", x).attr("y", y).attr("width", width).attr("height", height).attr("fill", paper);
    roughRect(svg, rc, x, y, width, height, { fill: "none", stroke: "#b9b1a5", strokeWidth: 1.6, roughness: 1.5, bowing: 1.2, seed });
  }

  // Côte : seules les îles assez grandes sont crayonnées. Les îlots, en trait
  // rough, deviennent des pâtés illisibles une fois l'image réduite.
  function drawCoast(svg, rc, path, features, seed, minArea = 90) {
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
      else roughPath(svg, rc, d, { stroke: ink, strokeWidth: 2, roughness: 1.2, bowing: 1, seed: `${seed}-${index}` });
    });
    if (small.length) {
      svg.append("path").attr("d", small.join("")).attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1.2).attr("stroke-linejoin", "round");
    }
  }

  // Lieux de vote d'une année : bureaux regroupés par emplacement, inscrits cumulés.
  function votingPlaces(data, province, year, communes) {
    const rows = data.points.filter((d) => d.province === province && d.annee === year && d.force === "participation" &&
      (!communes || communes.some((name) => communeKey(name, province) === communeKey(d.commune, province))) &&
      Number.isFinite(d.longitude) && Number.isFinite(d.latitude));
    return d3.rollups(rows, (values) => ({
      commune: values[0].commune,
      longitude: values[0].longitude,
      latitude: values[0].latitude,
      inscrits: d3.sum(values, (d) => d.inscrits),
      bureaux: values.length
    }), (d) => `${d.longitude.toFixed(5)},${d.latitude.toFixed(5)}`).map(([, value]) => value);
  }

  // Étiquette d'une commune signalée : point, puis texte à droite (à gauche
  // près du bord), décalé vers le bas en cas de chevauchement.
  function placeLabel(svg, rc, placed, text, [cx, cy], { size, right, seed, dot = true }) {
    if (dot) roughCircle(svg, rc, cx, cy, size * 0.5, { fill: ink, fillStyle: "solid", seed });
    const node = label(svg, text, 0, 0, { size, weight: 800, halo: true, haloWidth: size * 0.34 });
    const width = node.node().getComputedTextLength();
    let x = cx + size * 0.55;
    if (x + width > right) x = cx - size * 0.8 - width;
    let y = cy - size * 0.7;
    while (placed.some((b) => x < b[2] && x + width > b[0] && y - size * 0.6 < b[3] && y + size * 0.6 > b[1])) y += size * 1.15;
    placed.push([x, y - size * 0.6, x + width, y + size * 0.6]);
    node.attr("x", x).attr("y", y);
  }

  // --- Lissage (repris de provinciales-2026-geographie-forces.js) -------------

  const NODATA = -9999;

  function ringsToPath(geometry, transform) {
    let pathData = "";
    geometry.coordinates.forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([x, y], index) => {
          const [px, py] = transform(x, y);
          pathData += `${index ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`;
        });
        pathData += "Z";
      });
    });
    return pathData;
  }

  // Bandes de classes vectorisées par marching squares, rendues en pair-impair.
  function classBands(grid, values, thresholds) {
    const contours = d3.contours().size([grid.nx, grid.ny]).thresholds(thresholds)(values);
    const transform = (x, y) => [grid.ox + x * grid.step, grid.oy + y * grid.step];
    const outlines = contours.map((contour) => ringsToPath(contour, transform));
    return outlines.map((outline, index) => ({ index, outline, d: outline ? outline + (outlines[index + 1] || "") : "" }));
  }

  // Cellules terrestres de la vue : masque terre/mer rastérisé, coordonnées
  // en km dans un plan local équirectangulaire.
  function viewCells(projection, boundary, box, step) {
    const [[x0, y0], [x1, y1]] = box;
    const nx = Math.ceil((x1 - x0) / step) + 2;
    const ny = Math.ceil((y1 - y0) / step) + 2;
    const ox = x0 - step;
    const oy = y0 - step;
    const center = projection.invert([(x0 + x1) / 2, (y0 + y1) / 2]);
    const kmX = 111.32 * Math.cos(center[1] * Math.PI / 180);
    const kmY = 110.574;
    const canvas = document.createElement("canvas");
    canvas.width = nx;
    canvas.height = ny;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.setTransform(1 / step, 0, 0, 1 / step, -ox / step, -oy / step);
    context.beginPath();
    d3.geoPath(projection, context)({ type: "FeatureCollection", features: boundary });
    context.fill();
    const mask = context.getImageData(0, 0, nx, ny).data;
    const index = [];
    const xs = [];
    const ys = [];
    for (let j = 1; j < ny - 1; j += 1) {
      for (let i = 1; i < nx - 1; i += 1) {
        if (mask[4 * (j * nx + i) + 3] < 128) continue;
        const geographic = projection.invert([ox + (i + 0.5) * step, oy + (j + 0.5) * step]);
        if (!geographic) continue;
        index.push(j * nx + i);
        xs.push(geographic[0] * kmX);
        ys.push(geographic[1] * kmY);
      }
    }
    return { nx, ny, ox, oy, step, kmX, kmY, index, xs, ys };
  }

  // Score lissé : voix et dénominateurs des bureaux voisins pondérés par un
  // noyau gaussien, puis rapportés ; vide au-delà du rayon d'affichage.
  function smoothGrid(cells, rows, bandwidthKm, displayRadiusKm) {
    const rx = rows.map((row) => row.longitude * cells.kmX);
    const ry = rows.map((row) => row.latitude * cells.kmY);
    const cutoff2 = Math.pow(5 * bandwidthKm, 2);
    const radius2 = displayRadiusKm * displayRadiusKm;
    const inverse = -0.5 / (bandwidthKm * bandwidthKm);
    const values = new Float64Array(cells.nx * cells.ny).fill(NODATA);
    const near = new Float64Array(cells.nx * cells.ny).fill(-1);
    for (let c = 0; c < cells.index.length; c += 1) {
      let numerator = 0;
      let denominator = 0;
      let nearest = Infinity;
      for (let r = 0; r < rows.length; r += 1) {
        const dx = rx[r] - cells.xs[c];
        const dy = ry[r] - cells.ys[c];
        const distance2 = dx * dx + dy * dy;
        if (distance2 < nearest) nearest = distance2;
        if (distance2 > cutoff2) continue;
        const weight = Math.exp(distance2 * inverse);
        numerator += weight * rows[r].voix;
        denominator += weight * rows[r].denominateur;
      }
      near[cells.index[c]] = Math.sqrt(nearest);
      if (nearest <= radius2 && denominator > 0) values[cells.index[c]] = 100 * numerator / denominator;
    }
    return { nx: cells.nx, ny: cells.ny, ox: cells.ox, oy: cells.oy, step: cells.step, values, near };
  }

  function bureauRows(data, province, force, year) {
    return data.points.filter((d) => d.province === province && d.annee === year && d.force === force &&
      d.spatial_include !== false && Number.isFinite(d.longitude) && Number.isFinite(d.latitude) && d.denominateur > 0);
  }

  // Surface lissée d'une évolution (2026 − 2019, en points) ou d'un score 2026.
  function smoothSurface(data, { province, force, variable, projection, boundary, box, bandwidthKm, displayRadiusKm }) {
    const cells = viewCells(projection, boundary, box, 4);
    const g2026 = smoothGrid(cells, bureauRows(data, province, force, 2026), bandwidthKm, displayRadiusKm);
    if (variable !== "evolution_points") {
      const color = data.points.find((d) => d.province === province && d.force === force)?.couleur || ink;
      return { grid: g2026, values: g2026.values, near: g2026.near, classes: scoreClasses(color, Array.from(g2026.values), 7) };
    }
    const g2019 = smoothGrid(cells, bureauRows(data, province, force, 2019), bandwidthKm, displayRadiusKm);
    const values = new Float64Array(g2026.values.length).fill(NODATA);
    const near = new Float64Array(g2026.values.length).fill(-1);
    g2019.values.forEach((value, index) => {
      const next = g2026.values[index];
      if (value > FLOOR && next > FLOOR) values[index] = next - value;
      near[index] = Math.max(g2019.near[index], g2026.near[index]);
    });
    return { grid: g2026, values, near, classes: deltaClasses(Array.from(values)) };
  }

  let clipCounter = 0;

  function drawSmooth(svg, rc, surface, path, boundary, bandwidthKm, seedKey) {
    const id = `terre-${++clipCounter}`;
    svg.append("defs").append("clipPath").attr("id", id).append("path").attr("d", boundary.map((f) => path(f)).join(""));
    const land = svg.append("g").attr("clip-path", `url(#${id})`);
    land.append("path").attr("d", boundary.map((f) => path(f)).join("")).attr("fill", noData);
    const { grid, values, classes } = surface;
    const bands = classBands(grid, values, classes.thresholds);
    bands.forEach((band) => {
      if (!band.d) return;
      const color = classes.colors[band.index];
      land.append("path").attr("d", band.d).attr("fill", color).attr("fill-rule", "evenodd");
      const hatch = classes.hatch[band.index];
      if (hatch) roughPath(land, rc, band.d, hatchOptions(color, hatch, `${seedKey}-bande-${band.index}`));
    });
    land.append("path").attr("d", bands.slice(1).map((band) => band.outline).join(""))
      .attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1).attr("stroke-opacity", 0.35).attr("stroke-linejoin", "round");
    // Au-delà d'une portée du bureau le plus proche, la couleur est extrapolée :
    // lavis de papier et pointillé discret, comme sur le site.
    const [contour] = d3.contours().size([grid.nx, grid.ny]).thresholds([bandwidthKm])(surface.near);
    const far = contour ? ringsToPath(contour, (x, y) => [grid.ox + x * grid.step, grid.oy + y * grid.step]) : "";
    if (far) {
      land.append("path").attr("d", far).attr("fill", paper).attr("fill-opacity", 0.5)
        .attr("stroke", ink).attr("stroke-width", 1.2).attr("stroke-opacity", 0.4).attr("stroke-dasharray", "2 5").attr("stroke-linecap", "round");
    }
  }

  // Carte choroplèthe des communes d'une province, entière ou agrandie sur
  // une emprise (view.bbox). Les classes sont toujours calculées sur toute la
  // province, comme sur le site : une vue agrandie garde la même légende.
  function drawProvinceMap(svg, rc, data, options) {
    const { province, force, variable, box, highlights = [], seedKey, labelSize = 28, view = null, names = true, smooth = false } = options;
    const rows = data.communes.filter((d) => d.province === province && d.force === force && d.annee === 2026);
    const byKey = new Map(rows.map((row) => [communeKey(row.commune, province), row]));
    let classes = variable === "evolution_points"
      ? deltaClasses(rows.map((r) => r.evolution_points))
      : scoreClasses(rows[0]?.couleur || ink, rows.flatMap((r) => [r.score_2019, r.score_2026]), 5);
    const boundary = data.provinceShapes.features.filter((f) => f.properties.province === province);
    const projection = d3.geoMercator();
    if (view) {
      const [west, south, east, north] = view.bbox;
      projection.fitExtent(box, { type: "MultiPoint", coordinates: [[west, south], [east, north]] }).clipExtent(box);
    } else {
      projection.fitExtent(box, { type: "FeatureCollection", features: boundary });
    }
    const path = d3.geoPath(projection);
    const features = data.communeShapes.features.filter(
      (f) => f.properties.province === province && f.geometry && f.geometry.coordinates.length
    );
    let missing = false;
    const smoothing = data.metadata.smoothing;
    const bandwidthKm = Number(view ? view.bandwidth_km : smoothing.bandwidth_km[province]);
    const displayRadiusKm = Number(view ? view.display_radius_km : smoothing.display_radius_km[province]);
    if (smooth) {
      if (!Number.isFinite(bandwidthKm) || !Number.isFinite(displayRadiusKm)) throw new Error(`Portée de lissage absente : ${province}`);
      const surface = smoothSurface(data, { province, force, variable, projection, boundary, box, bandwidthKm, displayRadiusKm });
      classes = surface.classes;
      drawSmooth(svg, rc, surface, path, boundary, bandwidthKm, seedKey);
    }
    if (!smooth) features.forEach((feature, index) => {
      const row = byKey.get(communeKey(feature.properties.commune, province));
      const id = classIndex(classes, row ? row[variable] : NaN);
      if (id < 0) missing = true;
      const fill = id < 0 ? noData : classes.colors[id];
      const d = path(feature);
      if (!d) return;
      svg.append("path").attr("d", d).attr("fill", fill);
      const hatch = id < 0 ? null : classes.hatch[id];
      if (hatch) roughPath(svg, rc, d, hatchOptions(fill, hatch, `${seedKey}-${index}`));
    });
    svg.append("path").attr("d", features.map((f) => path(f)).join(""))
      .attr("fill", "none").attr("stroke", "#4f4942").attr("stroke-width", view ? 1.6 : 1).attr("stroke-opacity", smooth ? 0.55 : 0.8)
      .attr("stroke-dasharray", view ? "9 4" : null).attr("stroke-linejoin", "round");
    drawCoast(svg, rc, path, boundary, `${seedKey}-coast`, view ? 40 : 90);

    // Lieux de vote (vue agrandie) : cercles de papier, taille selon les inscrits.
    const places = view ? votingPlaces(data, province, 2026, view.communes) : [];
    if (places.length) {
      const radius = d3.scaleSqrt().domain([0, d3.max(places, (d) => d.inscrits)]).range([4, 11]);
      places.sort((a, b) => d3.descending(a.inscrits, b.inscrits)).forEach((place, index) => {
        const [px, py] = projection([place.longitude, place.latitude]);
        if (px < box[0][0] || px > box[1][0] || py < box[0][1] || py > box[1][1]) return;
        roughCircle(svg, rc, px, py, radius(place.inscrits) * 2, {
          fill: paper, fillStyle: "solid", strokeWidth: 1.2, roughness: 0.8, seed: `${seedKey}-lieu-${index}`
        });
      });
    }

    // Noms des autres communes, discrets, les plus grandes d'abord ; un nom qui
    // en recouvrirait un autre est omis.
    const placed = [];
    const right = box[1][0];
    const highlighted = new Set(highlights.map((name) => communeKey(name, province)));
    const labelAt = (feature) => {
      if (!view) return path.centroid(feature);
      // En vue agrandie, le centroïde tombe souvent hors cadre : barycentre
      // des lieux de vote visibles, comme sur le site.
      const key = communeKey(feature.properties.commune, province);
      const xy = places.filter((p) => communeKey(p.commune, province) === key).map((p) => projection([p.longitude, p.latitude]))
        .filter(([px, py]) => px >= box[0][0] && px <= box[1][0] && py >= box[0][1] && py <= box[1][1]);
      return xy.length ? [d3.mean(xy, (d) => d[0]), d3.mean(xy, (d) => d[1])] : [NaN, NaN];
    };
    highlights.forEach((name) => {
      const key = communeKey(name, province);
      const feature = features.find((f) => communeKey(f.properties.commune, province) === key);
      const row = byKey.get(key);
      if (!feature || !row) throw new Error(`Commune à signaler introuvable : ${name}`);
      const value = row[variable];
      const text = variable === "evolution_points" ? `${row.commune} ${signed(value)}` : `${row.commune} ${pct(value)}`;
      const xy = labelAt(feature);
      if (!Number.isFinite(xy[0])) throw new Error(`Commune hors cadre : ${name}`);
      placeLabel(svg, rc, placed, text, xy, { size: labelSize, right, seed: `${seedKey}-dot-${name}`, dot: !view });
    });
    if (names && !view) {
      const size = Math.round(labelSize * 0.74);
      features
        .filter((f) => !highlighted.has(communeKey(f.properties.commune, province)))
        .map((f) => ({ name: titleCaseCommune(f.properties.commune, province), xy: path.centroid(f), area: path.area(f) }))
        .filter((d) => d.area > size * size * 6)
        .sort((a, b) => d3.descending(a.area, b.area))
        .forEach(({ name, xy }) => {
          const half = (name.length * size * 0.56) / 2 + 4;
          const b = [xy[0] - half, xy[1] - size * 0.6, xy[0] + half, xy[1] + size * 0.6];
          if (b[0] < box[0][0] || b[2] > right) return;
          if (placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return;
          placed.push(b);
          label(svg, name, xy[0], xy[1], { anchor: "middle", size, weight: 800, color: "#3f3a35", halo: true, haloWidth: 5 });
        });
    }
    return { classes, missing, bandwidthKm };
  }

  // Légende complète, comme sur le site : une case hachurée par classe, chaque
  // classe libellée ; pour une évolution, le sens est écrit en toutes lettres.
  function drawLegend(svg, rc, classes, x, y, width, { title, delta, missing, note, missingText }) {
    const size = 22;
    label(svg, title, x, y, { size: 24, weight: 800, color: ink });
    let top = y + 26;
    if (delta) {
      label(svg, "← recul", x, top + 4, { size, weight: 800, color: decrease });
      label(svg, "stable", x + width / 2, top + 4, { anchor: "middle", size, weight: 700, color: muted });
      label(svg, "progression →", x + width, top + 4, { anchor: "end", size, weight: 800, color: increase });
      top += 26;
    }
    const count = classes.colors.length;
    const item = width / count;
    const swatch = item - 6;
    classes.colors.forEach((fill, index) => {
      const x0 = x + index * item;
      svg.append("rect").attr("x", x0).attr("y", top).attr("width", swatch).attr("height", 30).attr("fill", fill);
      const hatch = classes.hatch[index];
      roughRect(svg, rc, x0, top, swatch, 30, {
        fill: hatch ? hatchColor(fill) : "none", fillStyle: "hachure", hachureAngle: hatch?.angle, hachureGap: (hatch?.gap || 6) * 1.1,
        fillWeight: 0.9, stroke: ink, strokeWidth: 0.9, roughness: 1.3, opacity: 0.7, seed: `legende-${title}-${index}`
      });
      label(svg, classes.labels[index], x0 + swatch / 2, top + 50, { anchor: "middle", size: size * 0.92, weight: 700, color: muted });
    });
    if (note) {
      label(svg, note, x, top + 84, { size: 20, color: muted });
    } else if (missing) {
      const ny = top + 84;
      svg.append("rect").attr("x", x).attr("y", ny - 11).attr("width", 34).attr("height", 22).attr("fill", noData).attr("stroke", "#b9b1a5");
      label(svg, missingText || "commune sans résultat comparable", x + 44, ny, { size: 20, color: muted });
    }
  }

  function legendHeight(delta, extra) {
    return 26 + (delta ? 26 : 0) + 64 + (extra ? 34 : 0);
  }

  // Une commune de la province sans valeur : la légende doit alors l'expliquer.
  function hasMissing(data, province, force, variable) {
    const keys = new Set(data.communes
      .filter((d) => d.province === province && d.force === force && d.annee === 2026 && Number.isFinite(d[variable]))
      .map((d) => communeKey(d.commune, province)));
    return data.communeShapes.features.some((f) => f.properties.province === province && !keys.has(communeKey(f.properties.commune, province)));
  }

  // Bureaux comparables classés selon le sens de l'évolution.
  const bureaux = (n) => (n > 1 ? "bureaux" : "bureau");

  function tally(sites) {
    return {
      ups: sites.filter((d) => d.y > d.x).length,
      downs: sites.filter((d) => d.y < d.x).length,
      equals: sites.filter((d) => d.y === d.x).length
    };
  }

  const draw = {
    // Écran final : les trois provinces, simple repère crayonné.
    provinces(svg, data, { rc, width, height }) {
      const shapes = data.provinceShapes;
      const projection = d3.geoMercator().fitExtent([[10, 10], [width - 10, height - 10]], shapes);
      const path = d3.geoPath(projection);
      const tones = { "Province Sud": "#86c4aa", "Province Nord": "#e8c27a", "Province des Iles": "#e8957b" };
      const names = { "Province Sud": "Sud", "Province Nord": "Nord", "Province des Iles": "Îles" };
      shapes.features.forEach((feature, index) => {
        const d = path(feature);
        const province = feature.properties.province;
        roughPath(svg, rc, d, {
          fill: hatchColor(tones[province]), fillStyle: "hachure", hachureAngle: -41 + index * 30, hachureGap: 7,
          fillWeight: 1.1, stroke: ink, strokeWidth: 1.8, roughness: 1.3, seed: `provinces-${province}`
        });
      });
      const size = Math.max(30, Math.min(54, width / 16));
      shapes.features.forEach((feature) => {
        const province = feature.properties.province;
        const [cx, cy] = path.centroid(feature);
        const offset = province === "Province des Iles" ? [0, -size * 1.4] : province === "Province Nord" ? [-size * 2.2, 0] : [size * 2.2, 0];
        label(svg, names[province], cx + offset[0], cy + offset[1], {
          anchor: "middle", size, family: "Cabin Sketch, sans-serif", halo: true, haloWidth: 8
        });
      });
    },

    carte(svg, data, { rc, node, width, height }) {
      const province = node.dataset.province;
      const force = node.dataset.force;
      const variable = node.dataset.variable;
      const delta = variable === "evolution_points";
      const view = node.dataset.zoom ? data.metadata.smoothing.zoom_views[node.dataset.zoom] : null;
      if (node.dataset.zoom && !view) throw new Error(`Vue agrandie inconnue : ${node.dataset.zoom}`);
      const highlights = (node.dataset.highlight || "").split("|").filter(Boolean);
      if (node.dataset.highlightMax === "true") highlights.unshift(communeMax(data, province, force).commune);
      const smooth = node.dataset.lissage === "true";
      const missing = !smooth && !view && hasMissing(data, province, force, variable);
      const legend = legendHeight(delta, missing || smooth);
      const cardBottom = height - legend - 18;
      paperCard(svg, rc, 2, 2, width - 4, cardBottom - 2, `carte-cadre-${province}-${force}-${node.dataset.zoom || ""}`);
      const labelSize = Math.max(26, Math.min(32, width / 30));
      const { classes, bandwidthKm } = drawProvinceMap(svg, rc, data, {
        province, force, variable, highlights, labelSize, view, smooth,
        box: [[18, 16], [width - 18, cardBottom - 14]],
        seedKey: `carte-${province}-${force}-${variable}-${node.dataset.zoom || ""}`
      });
      const legendWidth = Math.min(width - 8, 900);
      drawLegend(svg, rc, classes, (width - legendWidth) / 2, cardBottom + 30, legendWidth, {
        title: node.dataset.legende || (delta ? "Évolution 2019 → 2026, en points" : "Score 2026, en % des suffrages exprimés"),
        delta, missing,
        note: smooth ? `Estimation lissée sur ${formatKm.format(bandwidthKm)} km autour des bureaux ; pâlie au-delà. Chiffres : résultats communaux.` : null
      });
    },

    // Nouméa par secteur électoral : chaque secteur prend l'évolution de son
    // bureau, apparié avec 2019 par nom ou numéro comme dans l'article. Les
    // secteurs sans bureau comparable restent gris.
    secteurs(svg, data, { rc, node, width, height }) {
      const deltas = sectorDeltas(data, node.dataset.force);
      const classes = deltaClasses(Array.from(deltas.values()));
      const missing = data.secteurs.length - deltas.size;
      const legend = legendHeight(true, true);
      const cardBottom = height - legend - 18;
      paperCard(svg, rc, 2, 2, width - 4, cardBottom - 2, "secteurs-cadre");
      const box = [[18, 16], [width - 18, cardBottom - 14]];
      const sectors = { type: "FeatureCollection", features: data.secteurs };
      const projection = d3.geoMercator().fitExtent(box, sectors).clipExtent(box);
      const path = d3.geoPath(projection);
      data.secteurs.forEach((feature, index) => {
        const delta = deltas.get(Number(feature.properties.code_bv));
        const id = classIndex(classes, delta);
        const fill = id < 0 ? noData : classes.colors[id];
        const d = path(feature);
        svg.append("path").attr("d", d).attr("fill", fill);
        const hatch = id < 0 ? null : classes.hatch[id];
        if (hatch) roughPath(svg, rc, d, hatchOptions(fill, hatch, `secteur-${feature.properties.code_bv}`));
      });
      svg.append("path").attr("d", data.secteurs.map((f) => path(f)).join(""))
        .attr("fill", "none").attr("stroke", "#4f4942").attr("stroke-width", 1).attr("stroke-opacity", 0.75).attr("stroke-linejoin", "round");
      const noumea = data.communeShapes.features.filter((f) => communeKey(f.properties.commune, "Province Sud") === communeKey("Nouméa", "Province Sud"));
      drawCoast(svg, rc, path, noumea, "secteurs-cote", 40);
      sectorLabels(svg, data, path, box);
      const legendWidth = Math.min(width - 8, 900);
      drawLegend(svg, rc, classes, (width - legendWidth) / 2, cardBottom + 30, legendWidth, {
        title: node.dataset.legende || "Évolution 2019 → 2026, en points",
        delta: true, missing: missing > 0,
        missingText: `secteur sans bureau comparable en 2019 (${missing})`,
        note: missing > 0 ? null : `Dont ${deltas.parSecteur.length} secteurs appariés par numéro : école renommée ou déplacée entre 2019 et 2026.`
      });
    },

    // Couverture : une seule carte, trois chiffres. Les provinces sont
    // seulement repérées (tons neutres) : la couleur verte ou rouge est
    // réservée au sens de l'évolution, portée par les chiffres.
    couverture(svg, data, { rc, width, height }) {
      const panels = [
        { province: "Province Nord", force: "uc_flnks", title: "UC-FLNKS", place: "Nord" },
        { province: "Province des Iles", force: "participation", title: "Participation", place: "Îles" },
        { province: "Province Sud", force: "loyaliste", title: "Droite loyaliste", place: "Sud" }
      ];
      const tones = { "Province Nord": "#cdbb98", "Province des Iles": "#d7b8a4", "Province Sud": "#b9c2ad" };
      const vertical = height > width * 1.05;
      const mapBox = vertical ? [[10, 0], [width - 10, height * 0.5]] : [[0, 0], [width * 0.6, height]];
      const projection = d3.geoMercator().fitExtent(mapBox, data.provinceShapes);
      const path = d3.geoPath(projection);
      data.provinceShapes.features.forEach((feature, index) => {
        const province = feature.properties.province;
        roughPath(svg, rc, path(feature), {
          fill: hatchColor(tones[province]), fillStyle: "hachure", hachureAngle: -41 + index * 30, hachureGap: 7,
          fillWeight: 1.2, stroke: ink, strokeWidth: 2, roughness: 1.3, seed: `couverture-${province}`
        });
      });
      const centroid = (province) => {
        const feature = data.provinceShapes.features.find((f) => f.properties.province === province);
        if (!feature) throw new Error(`Province introuvable : ${province}`);
        return path.centroid(feature);
      };

      const top = vertical ? height * 0.54 : 0;
      const rowHeight = (height - top) / panels.length;
      const textX = vertical ? 40 : width * 0.64;
      // Le chiffre le plus long (« −11,6 pts ») doit tenir dans la colonne.
      const bigSize = Math.min(vertical ? 96 : 84, rowHeight * 0.42, (width - textX) / 5.4);
      panels.forEach((panel, index) => {
        const evolution = shownGap(data, panel.province, panel.force);
        const color = evolution >= 0 ? increase : decrease;
        const y0 = top + index * rowHeight;
        if (index > 0) roughLine(svg, rc, textX, y0, width - 4, y0, { stroke: frame, strokeWidth: 1.6, seed: `couv-sep-${index}` });
        const nameY = y0 + rowHeight * 0.2;
        const valueY = nameY + Math.max(bigSize * 0.95, 46);
        label(svg, panel.place, textX, nameY, { size: 34, family: "Cabin Sketch, sans-serif", color: muted });
        label(svg, `${signed(evolution)} pts`, textX, valueY, { size: bigSize, family: "Cabin Sketch, sans-serif", color })
          .attr("stroke", color).attr("stroke-width", 1.6).attr("paint-order", "stroke");
        label(svg, panel.title, textX, valueY + Math.max(bigSize * 0.72, 40), { size: 30, weight: 700 });
        const [cx, cy] = centroid(panel.province);
        roughCircle(svg, rc, cx, cy, 16, { fill: ink, fillStyle: "solid", seed: `couv-dot-${index}` });
        if (vertical) {
          label(svg, panel.place, cx, cy - 34, { anchor: "middle", size: 40, family: "Cabin Sketch, sans-serif", halo: true, haloWidth: 9 });
        } else {
          roughLine(svg, rc, cx + 10, cy, textX - 18, valueY - bigSize * 0.25, { strokeWidth: 1.6, opacity: 0.7, seed: `couv-trait-${index}` });
        }
      });
    },

    // Essaim : un cercle par bureau présent aux deux scrutins, placé selon
    // l'évolution 2019 → 2026 en points. Le côté de la ligne zéro donne le
    // sens, la distance l'ampleur ; la moyenne provinciale sert de repère.
    essaim(svg, data, { rc, node, width, height }) {
      const province = node.dataset.province;
      const inverse = node.dataset.inverse === "true";
      const sites = scatter(data, province, node.dataset.x, node.dataset.y)
        .map((d) => ({ ...d, delta: d.y - d.x }));
      const { ups, downs } = tally(sites);
      const upColor = inverse ? decrease : increase;
      const downColor = inverse ? increase : decrease;
      const [upText, downText] = (node.dataset.libelles || "en hausse|en recul").split("|");
      const average = valueAt(data, province, node.dataset.moyenne, "evolution_points") * (inverse ? -1 : 1);

      const textSize = 28;
      const axisY = height - textSize * 3.6;
      const top = textSize * 3.4;
      const half = (axisY - top - 10) / 2;
      const midY = top + half;
      const extent = d3.extent(sites, (d) => d.delta);
      const bound = Math.max(Math.abs(extent[0]), Math.abs(extent[1]), Math.abs(average)) * 1.05;
      const x = d3.scaleLinear().domain([-bound, bound]).nice().range([20, width - 20]);

      // Placement déterministe (tri par valeur, puis position libre la plus
      // proche de l'axe) ; le rayon diminue jusqu'à ce que l'essaim tienne.
      let radius = Math.min(24, width / 34);
      let placed;
      for (;;) {
        placed = dodge(sites.slice().sort((a, b) => d3.ascending(a.delta, b.delta) || d3.ascending(a.commune, b.commune)), x, radius);
        if (d3.max(placed, (d) => Math.abs(d.offset)) + radius <= half || radius < 5) break;
        radius *= 0.92;
      }

      // Repères : zéro (même score) et moyenne provinciale.
      roughLine(svg, rc, x(0), top - 6, x(0), axisY, { strokeWidth: 2.2, seed: `essaim-zero-${province}` });
      svg.append("line").attr("x1", x(average)).attr("x2", x(average)).attr("y1", top + 8).attr("y2", axisY)
        .attr("stroke", ink).attr("stroke-width", 2).attr("stroke-dasharray", "7 7");
      const averageLeft = x(average) < x(0);
      label(svg, `ensemble de la province ${signed(average)}`, x(average) + (averageLeft ? -10 : 10), top + textSize * 0.4, {
        anchor: averageLeft ? "end" : "start", size: 24, weight: 700, halo: true
      });

      placed.forEach((site, index) => {
        roughCircle(svg, rc, x(site.delta), midY + site.offset, radius * 1.9, {
          fill: site.delta > 0 ? upColor : site.delta < 0 ? downColor : deltaColors[3], fillStyle: "hachure",
          hachureGap: Math.max(2.4, radius / 4), fillWeight: 1.1, strokeWidth: 1, roughness: 0.9,
          seed: `essaim-${province}-${index}`
        });
      });

      // Axe en points, et effectif de chaque côté de la ligne zéro.
      roughLine(svg, rc, x.range()[0], axisY, x.range()[1], axisY, { strokeWidth: 1.6, seed: `essaim-axe-${province}` });
      x.ticks(5).forEach((t) => {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", axisY).attr("y2", axisY + 10).attr("stroke", ink).attr("stroke-width", 1.6);
        label(svg, t === 0 ? "0" : signed(t).replace(",0", ""), x(t), axisY + textSize * 1.1, { anchor: "middle", size: 24, color: muted });
      });
      label(svg, node.dataset.axe || "Évolution 2019 → 2026, en points (0 = même score)", width / 2, axisY + textSize * 2.5, { anchor: "middle", size: 26, weight: 700, color: muted });
      // À gauche de zéro, la valeur recule ; à droite, elle progresse.
      [[downs, downText, downColor, x.range()[0], "start", "← "], [ups, upText, upColor, x.range()[1], "end", ""]]
        .forEach(([count, text, color, lx, anchor, arrow]) => {
          const tail = anchor === "end" ? " →" : "";
          label(svg, `${arrow}${count} ${bureaux(count)}${tail}`, lx, textSize * 0.7, { anchor, size: textSize * 1.1, weight: 700, color });
          label(svg, text, lx, textSize * 1.9, { anchor, size: 24, weight: 700, color: muted });
        });
    }
  };

  start({ load, values, draw });
})();
