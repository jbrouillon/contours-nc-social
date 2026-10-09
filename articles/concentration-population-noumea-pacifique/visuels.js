// Campagne « Pourquoi la population se concentre autour de Nouméa ? ». Les
// données sont les blocs JSON de la page publiée de l'article (graphiques et
// carte des communes, voir donnees/provenance.json) : mêmes séries, mêmes
// couleurs. Le Grand Nouméa regroupe Nouméa, Dumbéa, Mont-Dore et Païta ; la
// couronne, Dumbéa, Mont-Dore et Païta.
(() => {
  "use strict";

  const { label, roughPath, roughLine, roughRect, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const gnColor = "#2f6b45";
  const noumeaColor = "#c54832";
  const couronneColor = "#d6a21f";
  const otherColor = "#7a8c8d";
  const sketchFont = "Cabin Sketch, sans-serif";

  const format0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const format1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (x) => `${format1.format(x)} %`;
  const int = (x) => format0.format(x);
  const signedInt = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${format0.format(Math.abs(x))}`;

  // --- Données ---------------------------------------------------------------

  function rewind(features) {
    const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
    const fix = (polygon) => (d3.geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI ? flip(polygon) : polygon);
    return features.map((feature) => {
      const g = feature.geometry;
      const coordinates = g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix);
      return { ...feature, geometry: { ...g, coordinates } };
    });
  }

  function load() {
    const names = [
      "carte-population-communes", "chart-concentration", "chart-migrations-internes",
      "chart-arrivees-exterieures", "chart-emplois-residence", "chart-pacifique-villes"
    ];
    return Promise.all(names.map((name) => d3.json(`donnees/${name}.json`))).then((blocks) => {
      const data = Object.fromEntries(names.map((name, i) => [name, blocks[i]]));
      data.communes = rewind(data["carte-population-communes"].geojson.features);
      return data;
    });
  }

  // Clé de commune de l'article (normalizeKey) : sans accents, en majuscules.
  function normalizeKey(value) {
    return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function share(data, serie, year) {
    const row = data["chart-concentration"].data.find((d) => d.serie === serie && d.annee === year);
    if (!row) throw new Error(`Part absente : ${serie} ${year}`);
    return row;
  }

  function series(data, serie) {
    return data["chart-concentration"].data.filter((d) => d.serie === serie).sort((a, b) => a.annee - b.annee);
  }

  function migration(data, region, periode) {
    const row = data["chart-migrations-internes"].data.find((d) => d.serie === region && d.periode === periode);
    if (!row) throw new Error(`Solde absent : ${region} ${periode}`);
    return row.valeur;
  }

  // Arrivées extérieures par période : Grand Nouméa et reste du territoire.
  function arrivals(data) {
    const rows = data["chart-arrivees-exterieures"].data;
    return d3.groups(rows, (d) => d.periode).map(([periode, items]) => {
      const gn = items.find((d) => d.serie === "grand_noumea")?.valeur;
      const rest = items.find((d) => d.serie === "reste")?.valeur;
      if (!Number.isFinite(gn) || !Number.isFinite(rest)) throw new Error(`Arrivées incomplètes : ${periode}`);
      return { periode, gn, rest, total: gn + rest, part: (100 * gn) / (gn + rest) };
    });
  }

  function work(data, zone, mesure) {
    const row = data["chart-emplois-residence"].data.find((d) => d.zone === zone && d.mesure === mesure);
    if (!row) throw new Error(`Emploi absent : ${zone} · ${mesure}`);
    return row.valeur;
  }

  const LIVE = "Personnes en emploi qui y habitent";
  const WORK = "Personnes qui y travaillent";

  function pacificRows(data) {
    return data["chart-pacifique-villes"].data
      .filter((d) => Number.isFinite(d.noyau) && Number.isFinite(d.elargi))
      .sort((a, b) => d3.descending(a.elargi, b.elargi));
  }

  function values(data) {
    const gn2019 = share(data, "Grand Nouméa", 2019);
    const noumea2019 = share(data, "Nouméa", 2019);
    const couronne2019 = share(data, "Couronne périurbaine", 2019);
    if (gn2019.population !== noumea2019.population + couronne2019.population) throw new Error("Grand Nouméa ≠ Nouméa + couronne");
    const gnSeries = series(data, "Grand Nouméa");
    if (gnSeries.some((d, i) => i && d.valeur <= gnSeries[i - 1].valeur)) throw new Error("Écran 02 : la part du Grand Nouméa ne croît pas à chaque recensement");
    const peak = d3.greatest(series(data, "Nouméa"), (d) => d.valeur);

    const map2019 = data["carte-population-communes"].data.filter((d) => d.annee === 2019);
    if (d3.sum(map2019.filter((d) => d.isGrandNoumea), (d) => d.population) !== gn2019.population) throw new Error("Carte et courbe incohérentes");


    const periods = data["chart-migrations-internes"].options.periods;
    periods.forEach((periode) => {
      if (migration(data, "Grand Nouméa", periode) <= 0) throw new Error(`Écran 04 : solde négatif du Grand Nouméa en ${periode}`);
      const regions = data["chart-migrations-internes"].options.series;
      const leader = d3.greatest(regions, (region) => migration(data, region, periode));
      const expected = periode === "2009-2014" ? "Nord Ouest" : "Grand Nouméa";
      if (leader !== expected) throw new Error(`Écran 04 : ${leader} en tête en ${periode}`);
    });

    const arr = arrivals(data);
    if (arr.some((d) => d.part <= 80)) throw new Error("Écran 05 : une période sous huit arrivants sur dix");
    const recent = arr.find((d) => d.periode === "2014-2019");

    const pacific = pacificRows(data);
    const papeete = pacific.find((d) => d.cas === "Polynésie française");
    const ncRank = pacific.findIndex((d) => d.cas === "Nouvelle-Calédonie");
    if (!papeete || ncRank < 0 || ncRank > 2) throw new Error("Écran 07 : revoir la comparaison du Pacifique");

    return {
      gn_part_2019: pct(gn2019.valeur),
      gn_pop_2019: int(gn2019.population),
      communes_total: String(map2019.length),
      noumea_part_2019: pct(noumea2019.valeur),
      noumea_pic_annee: String(peak.annee),
      noumea_pic_part: pct(peak.valeur),
      couronne_pop_2019: int(couronne2019.population),
      noumea_pop_2019: int(noumea2019.population),
      couronne_pop_1956: int(share(data, "Couronne périurbaine", 1956).population),
      gn_solde_recent: signedInt(migration(data, "Grand Nouméa", "2014-2019")),
      no_solde_2009: signedInt(migration(data, "Nord Ouest", "2009-2014")),
      ext_part_recent: pct(recent.part),
      ext_gn_recent: int(recent.gn),
      ext_total_recent: int(recent.total),
      noumea_emplois: pct(work(data, "Nouméa", WORK)),
      noumea_residents: pct(work(data, "Nouméa", LIVE)),
      couronne_residents: pct(work(data, "Couronne périurbaine", LIVE)),
      couronne_emplois: pct(work(data, "Couronne périurbaine", WORK)),
      papeete_noyau: pct(papeete.noyau),
      papeete_elargi: pct(papeete.elargi),
      papeete_annee: String(papeete.annee)
    };
  }

  // --- Outils de dessin ------------------------------------------------------

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  function bar(svg, rc, x, y, width, height, color, seed, options = {}) {
    if (width <= 0 || height <= 0) return;
    svg.append("rect").attr("x", x).attr("y", y).attr("width", width).attr("height", height).attr("fill", color).attr("fill-opacity", options.opacity ?? 0.88);
    roughRect(svg, rc, x, y, width, height, {
      fill: hatchColor(color), fillStyle: "hachure", hachureAngle: -41, hachureGap: options.gap || 7, fillWeight: 1,
      stroke: hatchColor(color), strokeWidth: 1.2, roughness: 1, opacity: 0.55, seed
    });
  }

  // Générateur pseudo-aléatoire déterministe pour la simulation de forces.
  function lcg(seedValue) {
    let state = seedValue >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  // --- Communes en cercles ----------------------------------------------------
  // Comme la carte animée de l'article : un cercle par commune, d'aire
  // proportionnelle à sa population, écarté de sa position réelle seulement
  // autant que nécessaire. L'échelle des cercles est commune à toutes les
  // années (la plus grande population de la série donne le rayon maximal).
  // Une commune pas encore créée (Kouaoua, Poum) n'a pas de cercle.

  function censusYears(data) {
    return Array.from(new Set(data["carte-population-communes"].data.map((d) => d.annee))).sort(d3.ascending);
  }

  function circleFrame(data, width, height, ratio = 0.125) {
    const maxPop = d3.max(data["carte-population-communes"].data, (d) => d.population || 0);
    const maxRadius = Math.min(width, height) * ratio;
    const radius = d3.scaleSqrt().domain([0, maxPop]).range([0, maxRadius]);
    const margin = maxRadius * 0.7;
    const projection = d3.geoMercator().fitExtent([[margin, margin], [width - margin, height - margin]], { type: "FeatureCollection", features: data.communes });
    return { radius, path: d3.geoPath(projection), width, height };
  }

  function layoutYear(data, frame, year) {
    const rows = new Map(data["carte-population-communes"].data.filter((d) => d.annee === year).map((d) => [normalizeKey(d.key), d]));
    const nodes = data.communes.map((feature) => {
      const key = normalizeKey(feature.properties.commune);
      const row = rows.get(key);
      if (!row) throw new Error(`Commune absente : ${feature.properties.commune} ${year}`);
      const [cx, cy] = frame.path.centroid(feature);
      const population = Number.isFinite(row.population) ? row.population : null;
      return { key, name: row.commune, gn: row.isGrandNoumea, population, r: population ? Math.max(2.5, frame.radius(population)) : 0, x: cx, y: cy, cx, cy };
    });
    const present = nodes.filter((d) => d.population);
    const simulation = d3.forceSimulation(present)
      .randomSource(lcg(year))
      .force("x", d3.forceX((d) => d.cx).strength(0.06))
      .force("y", d3.forceY((d) => d.cy).strength(0.06))
      .force("collide", d3.forceCollide((d) => d.r + 3).strength(1).iterations(4))
      .stop();
    for (let i = 0; i < 600; i += 1) {
      simulation.tick();
      present.forEach((d) => {
        d.x = Math.max(d.r + 4, Math.min(frame.width - d.r - 4, d.x));
        d.y = Math.max(d.r + 4, Math.min(frame.height - d.r - 4, d.y));
      });
    }
    return nodes;
  }

  function drawOutlines(svg, data, frame) {
    svg.append("path").attr("d", data.communes.map((f) => frame.path(f)).join(""))
      .attr("fill", "#ece4d3").attr("stroke", "#b9b1a5").attr("stroke-width", 1).attr("stroke-linejoin", "round");
  }

  function drawCircles(svg, rc, nodes, seedPrefix, scale = 1) {
    nodes.filter((d) => d.r > 0).sort((a, b) => d3.descending(a.r, b.r)).forEach((d) => {
      const color = d.gn ? gnColor : "#c9b48a";
      roughCircle(svg, rc, d.x, d.y, d.r * 2, {
        fill: color, fillStyle: "hachure", hachureGap: (d.gn ? 6 : 4) * scale, fillWeight: (d.gn ? 1.4 : 1) * scale,
        stroke: d.gn ? hatchColor(gnColor) : "#7b6a4a", strokeWidth: (d.gn ? 2.4 : 1.1) * scale, roughness: 1, seed: `${seedPrefix}-${d.key}`
      });
    });
  }

  // Noms du Grand Nouméa au centre de leur cercle, sur un halo de papier.
  function gnNames(svg, nodes, size) {
    return nodes.filter((d) => d.gn && d.r > 16).map((d) => {
      const fontSize = Math.max(16, Math.min(size * 1.05, d.r * 0.42));
      const node = label(svg, d.name, d.x, d.y, { anchor: "middle", size: fontSize, weight: 800, color: ink, halo: true, haloWidth: 6 });
      const w = node.node().getComputedTextLength();
      return [d.x - w / 2, d.y - fontSize * 0.6, d.x + w / 2, d.y + fontSize * 0.6];
    });
  }

  function gnShare(data, year) {
    return share(data, "Grand Nouméa", year).valeur;
  }

  // --- Croquis ------------------------------------------------------------

  const draw = {
    cercles(svg, data, { rc, node, width, height, values: v }) {
      const minimal = node.dataset.minimal === "true";
      const frame = circleFrame(data, width, height, minimal ? 0.12 : 0.125);
      const nodes = layoutYear(data, frame, Number(node.dataset.annee));
      drawOutlines(svg, data, frame);
      drawCircles(svg, rc, nodes, "cercle");
      if (minimal) return;

      const size = Math.max(22, Math.min(28, width / 36));
      const gnNodes = nodes.filter((d) => d.gn);
      const placed = gnNames(svg, nodes, size);
      // Repère du Grand Nouméa, dans la mer au sud-ouest de l'agglomération.
      const left = d3.min(gnNodes, (d) => d.x - d.r);
      const bottom = d3.max(gnNodes, (d) => d.y + d.r);
      const titleSize = size * 1.4;
      const title = label(svg, "Grand Nouméa", 0, 0, { anchor: "end", size: titleSize, family: sketchFont, color: gnColor, halo: true, haloWidth: 8 });
      title.attr("stroke", gnColor).attr("stroke-width", 1).attr("paint-order", "stroke");
      const titleWidth = title.node().getComputedTextLength();
      const tx = Math.max(titleWidth + 6, left - size * 0.8);
      const ty = Math.min(height - size * 1.6, bottom - size * 1.2);
      title.attr("x", tx).attr("y", ty);
      label(svg, `${v.gn_part_2019} des habitants`, tx, ty + titleSize * 0.95, { anchor: "end", size: size * 0.95, weight: 800, color: gnColor, halo: true });
      placed.push([tx - titleWidth, ty - titleSize * 0.6, tx, ty + titleSize * 1.5]);

      // Les autres communes de plus de 5 000 habitants, nommées au-dessus de
      // leur cercle si la place est libre.
      nodes.filter((d) => !d.gn && d.population >= 5000).sort((a, b) => d3.descending(a.population, b.population)).forEach((d) => {
        const text = `${d.name} ${int(d.population)}`;
        const fontSize = size * 0.8;
        const y = d.y - d.r - fontSize * 0.7;
        const node = label(svg, text, d.x, y, { anchor: "middle", size: fontSize, weight: 700, color: "#5a4a2c", halo: true, haloWidth: 5 });
        const w = node.node().getComputedTextLength();
        const b = [d.x - w / 2, y - fontSize * 0.6, d.x + w / 2, y + fontSize * 0.6];
        // Point de l'étiquette le plus proche du centre de chaque grand cercle.
        const hitsCircle = gnNodes.some((g) => {
          const nx = Math.max(b[0], Math.min(g.x, b[2]));
          const ny = Math.max(b[1], Math.min(g.y, b[3]));
          return (nx - g.x) ** 2 + (ny - g.y) ** 2 < g.r * g.r;
        });
        if (b[0] < 0 || b[2] > width || hitsCircle || placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) {
          node.remove();
          return;
        }
        placed.push(b);
      });
    },

    // La carte animée de l'article, figée à quatre recensements, avec la même
    // échelle de cercles partout.
    evolution(svg, data, { rc, node, width, height }) {
      const allYears = node.dataset.annees.split("|").map(Number);
      const gap = 14;
      // Disposition qui donne les plus grandes cartes : 2 × 2, 4 × 1, ou, faute
      // de place, la première et la dernière année seulement (pénalisée pour
      // garder les quatre dates quand c'est possible).
      const layouts = [
        { years: allYears, cols: 2, rows: 2, weight: 1 },
        { years: allYears, cols: 4, rows: 1, weight: 1 },
        { years: [allYears[0], allYears[allYears.length - 1]], cols: 2, rows: 1, weight: 0.75 }
      ].map((o) => {
        const w = (width - gap * (o.cols - 1)) / o.cols;
        const h = (height - gap * (o.rows - 1)) / o.rows;
        const top = Math.min(70, h * 0.2);
        // Le pays est environ 1,4 fois plus large que haut.
        return { ...o, panelW: w, panelH: h, head: top, score: o.weight * Math.min(w, (h - top) * 1.4) };
      });
      const { years, cols, panelW, panelH, head } = layouts.reduce((a, b) => (b.score > a.score ? b : a));
      years.forEach((year, index) => {
        const x0 = (index % cols) * (panelW + gap);
        const y0 = Math.floor(index / cols) * (panelH + gap);
        const g = svg.append("g").attr("transform", `translate(${x0},${y0})`);
        g.append("rect").attr("width", panelW).attr("height", panelH).attr("fill", paper);
        roughRect(g, rc, 0, 0, panelW, panelH, { stroke: "#b9b1a5", strokeWidth: 1.4, roughness: 1.4, seed: `evolution-cadre-${year}` });
        label(g, String(year), 14, head * 0.42, { size: Math.min(44, head * 0.62), family: sketchFont, color: ink })
          .attr("stroke", ink).attr("stroke-width", 1).attr("paint-order", "stroke");
        label(g, `Grand Nouméa : ${pct(gnShare(data, year))}`, 14, head * 0.86, { size: Math.min(22, head * 0.3), weight: 800, color: gnColor });
        const map = g.append("g").attr("transform", `translate(0,${head})`);
        const frame = circleFrame(data, panelW, panelH - head, 0.15);
        drawOutlines(map, data, frame);
        drawCircles(map, rc, layoutYear(data, frame, year), `evolution-${year}`, 0.8);
      });
    },

    // Carte animée pour la vidéo : window.dessinerCarte(p), p de 0 à 1, dessine
    // l'état interpolé entre deux recensements (populations et positions
    // linéaires) et met à jour l'année et la part du Grand Nouméa affichées.
    "cercles-anime"(svg, data, { rc, width, height }) {
      const years = censusYears(data);
      const frame = circleFrame(data, width, height, 0.13);
      const layouts = new Map(years.map((year) => [year, new Map(layoutYear(data, frame, year).map((d) => [d.key, d]))]));
      drawOutlines(svg, data, frame);
      const layer = svg.append("g");
      const size = Math.max(22, Math.min(28, width / 36));
      const yearLabel = label(svg, "", width - 8, 44, { anchor: "end", size: 76, family: sketchFont, color: muted });
      const yearNode = document.querySelector('[data-anime="annee"]');
      const partNode = document.querySelector('[data-anime="part"]');
      if (!yearNode || !partNode) throw new Error("Animation : compteurs absents");
      const first = years[0];
      const last = years[years.length - 1];
      window.dessinerCarte = (progress) => {
        // Courte pause sur le premier recensement, puis défilement continu.
        const t = Math.max(0, Math.min(1, (progress - 0.08) / 0.92));
        const year = first + t * (last - first);
        const i = Math.max(0, d3.bisectRight(years, year) - 1);
        const y0 = years[i];
        const y1 = years[Math.min(years.length - 1, i + 1)];
        const k = y1 === y0 ? 0 : (year - y0) / (y1 - y0);
        const nodes = Array.from(layouts.get(y0).values()).map((a) => {
          const b = layouts.get(y1).get(a.key);
          if (!a.population) return { ...a, r: 0 };
          const population = b.population ? a.population + k * (b.population - a.population) : a.population;
          return { ...a, population, r: Math.max(2.5, frame.radius(population)), x: a.x + k * (b.x - a.x), y: a.y + k * (b.y - a.y) };
        });
        layer.selectAll("*").remove();
        drawCircles(layer, rc, nodes, "anime");
        gnNames(layer, nodes, size);
        // Les cercles glissent d'un recensement à l'autre, mais l'année et la
        // part affichées sont celles du recensement le plus proche : aucune
        // valeur interpolée n'est présentée comme une donnée.
        const census = k < 0.5 ? y0 : y1;
        const shown = String(census);
        yearLabel.text(shown);
        yearNode.textContent = shown;
        partNode.textContent = pct(gnShare(data, census));
        return shown;
      };
      // Contrôle : aux recensements, la part recalculée sur la carte est celle
      // de la courbe de l'article.
      years.forEach((year) => {
        const nodes = Array.from(layouts.get(year).values());
        const ratio = (100 * d3.sum(nodes.filter((d) => d.gn), (d) => d.population || 0)) / d3.sum(nodes, (d) => d.population || 0);
        if (Math.abs(ratio - gnShare(data, year)) > 0.05) throw new Error(`Animation : part du Grand Nouméa incohérente en ${year}`);
      });
      window.dessinerCarte(1);
    },

    // Parts de la population : Nouméa, couronne et Grand Nouméa.
    courbes(svg, data, { rc, width, height }) {
      const keys = [["Grand Nouméa", gnColor, 4.2], ["Nouméa", noumeaColor, 3], ["Couronne périurbaine", couronneColor, 3]];
      const size = 24;
      const left = 64;
      const right = width - Math.min(230, width * 0.24);
      const top = 20;
      const bottom = height - 48;
      const years = series(data, "Nouméa").map((d) => d.annee);
      const x = d3.scaleLinear().domain(d3.extent(years)).range([left, right]);
      const y = d3.scaleLinear().domain([0, 80]).range([bottom, top]);
      [0, 20, 40, 60, 80].forEach((t) => {
        svg.append("line").attr("x1", left).attr("x2", right).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "#d5ccbe").attr("stroke-dasharray", "3 6");
        label(svg, `${t} %`, left - 10, y(t), { anchor: "end", size: 21, color: muted });
      });
      [1956, 1976, 1996, 2019].forEach((year) => label(svg, String(year), x(year), bottom + 28, { anchor: "middle", size: 22, color: muted }));
      roughLine(svg, rc, left, bottom, right, bottom, { strokeWidth: 1.6, seed: "courbes-axe" });
      const ends = [];
      keys.forEach(([serie, color, strokeWidth]) => {
        const points = series(data, serie).map((d) => [x(d.annee), y(d.valeur)]);
        roughPath(svg, rc, d3.line()(points), { stroke: color, strokeWidth, roughness: 0.9, bowing: 0.5, seed: `courbe-${serie}` });
        points.forEach(([px, py], i) => roughCircle(svg, rc, px, py, 11, { fill: color, fillStyle: "solid", stroke: color, seed: `point-${serie}-${i}` }));
        const last = series(data, serie).at(-1);
        ends.push({ serie, color, y: y(last.valeur), value: last.valeur });
      });
      // Libellés de fin, écartés s'ils se chevauchent.
      ends.sort((a, b) => a.y - b.y).forEach((end, i, list) => {
        if (i && end.y - list[i - 1].y < size * 2.2) end.y = list[i - 1].y + size * 2.2;
        const name = end.serie === "Couronne périurbaine" ? "Couronne" : end.serie;
        label(svg, name, right + 16, end.y - size * 0.45, { size: size * 0.95, weight: 800, color: hatchColor(end.color) });
        label(svg, pct(end.value), right + 16, end.y + size * 0.6, { size: size * 0.95, weight: 700, color: end.color });
      });
      const peak = d3.greatest(series(data, "Nouméa"), (d) => d.valeur);
      label(svg, `${peak.annee} : ${pct(peak.valeur)}`, x(peak.annee), y(peak.valeur) - size * 1.1, {
        anchor: "middle", size: size * 0.9, weight: 800, color: noumeaColor, halo: true
      });
    },

    // Solde des déménagements entre grandes régions, par période : Grand
    // Nouméa, Nord-Ouest et les trois autres régions réunies (la somme des
    // cinq soldes est nulle).
    soldes(svg, data, { rc, width, height }) {
      const periods = data["chart-migrations-internes"].options.periods;
      const regions = data["chart-migrations-internes"].options.series;
      const others = regions.filter((r) => r !== "Grand Nouméa" && r !== "Nord Ouest");
      const groups = [
        ["Grand Nouméa", gnColor, (p) => migration(data, "Grand Nouméa", p)],
        ["Nord-Ouest", couronneColor, (p) => migration(data, "Nord Ouest", p)],
        ["Îles Loyauté, Nord-Est et Sud rural", otherColor, (p) => d3.sum(others, (r) => migration(data, r, p))]
      ];
      const size = 23;
      const legendHeight = 44;
      const left = 70;
      const right = width - 8;
      const top = legendHeight + 34;
      const bottom = height - 44;
      const all = periods.flatMap((p) => groups.map(([, , f]) => f(p)));
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(all)), d3.max(all)]).nice().range([bottom, top]);
      const x0 = d3.scaleBand().domain(periods).range([left, right]).paddingInner(0.22).paddingOuter(0.05);
      const x1 = d3.scaleBand().domain(groups.map((g) => g[0])).range([0, x0.bandwidth()]).padding(0.08);
      y.ticks(5).forEach((t) => {
        svg.append("line").attr("x1", left).attr("x2", right).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "#d5ccbe").attr("stroke-dasharray", "3 6");
        label(svg, signedInt(t), left - 10, y(t), { anchor: "end", size: 20, color: muted });
      });
      periods.forEach((periode) => {
        groups.forEach(([name, color, f], g) => {
          const value = f(periode);
          const bx = x0(periode) + x1(name);
          bar(svg, rc, bx, Math.min(y(value), y(0)), x1.bandwidth(), Math.abs(y(value) - y(0)), color, `solde-${periode}-${g}`, { gap: 5 });
          if (g === 0 || (periode === "2009-2014" && g === 1)) {
            label(svg, signedInt(value), bx + x1.bandwidth() / 2, y(value) - 14, { anchor: "middle", size: 19, weight: 800, color: hatchColor(color), halo: true });
          }
        });
        label(svg, periode.replace("-", "–"), x0(periode) + x0.bandwidth() / 2, bottom + 26, { anchor: "middle", size: 20, weight: 700, color: muted });
      });
      roughLine(svg, rc, left, y(0), right, y(0), { strokeWidth: 2, seed: "soldes-zero" });
      // Légende en ligne.
      let lx = left;
      groups.forEach(([name, color], g) => {
        bar(svg, rc, lx, 8, 26, 26, color, `soldes-legende-${g}`, { gap: 5 });
        const node = label(svg, name, lx + 34, 22, { size: 21, weight: 800, color: hatchColor(color) });
        lx += 34 + node.node().getComputedTextLength() + 26;
      });
      if (lx > width) throw new Error("Légende des soldes trop large");
      label(svg, "gain ↑", right, top - 12, { anchor: "end", size: 20, weight: 700, color: muted });
      label(svg, "perte ↓", right, bottom - 10, { anchor: "end", size: 20, weight: 700, color: muted });
      void size;
    },

    // Arrivées de l'extérieur, en 100 % par période.
    arrivees(svg, data, { rc, width, height }) {
      const rows = arrivals(data);
      const size = 24;
      const left = Math.min(150, width * 0.17);
      const right = width - 8;
      const top = 44;
      const rowHeight = (height - top) / rows.length;
      const barHeight = Math.min(70, rowHeight * 0.66);
      const x = d3.scaleLinear().domain([0, 100]).range([left, right]);
      label(svg, "s’installent dans le Grand Nouméa", left, 16, { size: 22, weight: 800, color: gnColor });
      label(svg, "ailleurs", right, 16, { anchor: "end", size: 22, weight: 800, color: hatchColor(otherColor) });
      rows.forEach((row, index) => {
        const y0 = top + index * rowHeight + (rowHeight - barHeight) / 2;
        label(svg, row.periode.replace("-", "–"), left - 14, y0 + barHeight / 2, { anchor: "end", size: 22, weight: 700, color: muted });
        bar(svg, rc, x(0), y0, x(row.part) - x(0), barHeight, gnColor, `arrivees-gn-${index}`);
        bar(svg, rc, x(row.part), y0, x(100) - x(row.part), barHeight, otherColor, `arrivees-reste-${index}`, { opacity: 0.55 });
        label(svg, pct(row.part), x(0) + 14, y0 + barHeight / 2, { size: size * 1.1, weight: 800, color: paper });
      });
      // Repère des huit sur dix.
      svg.append("line").attr("x1", x(80)).attr("x2", x(80)).attr("y1", top - 6).attr("y2", height - 2)
        .attr("stroke", ink).attr("stroke-width", 2).attr("stroke-dasharray", "7 7");
      label(svg, "8 sur 10", x(80) - 8, top - 14, { anchor: "end", size: 20, weight: 800, halo: true });
    },

    // Lieu d'habitation et lieu de travail des personnes en emploi.
    travail(svg, data, { rc, width, height }) {
      const zones = data["chart-emplois-residence"].options.zones;
      const measures = [[LIVE, "y habitent", couronneColor], [WORK, "y travaillent", gnColor]];
      const size = 24;
      const legendHeight = 44;
      const top = legendHeight + 10;
      const left = 6;
      const right = width - 110;
      const groupHeight = (height - top) / zones.length;
      const barHeight = Math.min(56, (groupHeight - size * 1.6) / 2 - 6);
      const x = d3.scaleLinear().domain([0, 60]).range([left, right]);
      let lx = left;
      measures.forEach(([, text, color], m) => {
        bar(svg, rc, lx, 8, 26, 26, color, `travail-legende-${m}`, { gap: 5 });
        const node = label(svg, `personnes en emploi qui ${text}`, lx + 34, 22, { size: 21, weight: 800, color: hatchColor(color) });
        lx += 34 + node.node().getComputedTextLength() + 26;
      });
      zones.forEach((zone, z) => {
        const y0 = top + z * groupHeight;
        label(svg, zone === "Couronne périurbaine" ? "Couronne (Dumbéa, Mont-Dore, Païta)" : zone, left, y0 + size * 0.7, { size, weight: 800 });
        measures.forEach(([mesure, , color], m) => {
          const value = work(data, zone, mesure);
          const by = y0 + size * 1.5 + m * (barHeight + 6);
          bar(svg, rc, x(0), by, x(value) - x(0), barHeight, color, `travail-${z}-${m}`);
          label(svg, pct(value), x(value) + 10, by + barHeight / 2, { size: size * 0.95, weight: 800, color: hatchColor(color) });
        });
      });
    },

    // Capitale seule (cercle vide) et agglomération ou ville associée (cercle
    // plein), en part de la population du territoire.
    pacifique(svg, data, { rc, width, height }) {
      const rows = pacificRows(data);
      const size = Math.min(23, (height - 60) / rows.length * 0.42);
      const left = Math.min(310, width * 0.34);
      const right = width - 70;
      const top = 46;
      const rowHeight = (height - top - 30) / rows.length;
      const x = d3.scaleLinear().domain([0, 80]).range([left, right]);
      [0, 20, 40, 60, 80].forEach((t) => {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top - 6).attr("y2", height - 30).attr("stroke", "#d5ccbe").attr("stroke-dasharray", "3 6");
        label(svg, `${t} %`, x(t), height - 10, { anchor: "middle", size: 20, color: muted });
      });
      roughCircle(svg, rc, left + 10, 16, 18, { fill: paper, fillStyle: "solid", stroke: noumeaColor, strokeWidth: 2.4, seed: "pac-legende-a" });
      const a = label(svg, "capitale seule", left + 26, 16, { size: 21, weight: 800, color: noumeaColor });
      const bx = left + 26 + a.node().getComputedTextLength() + 30;
      roughCircle(svg, rc, bx, 16, 18, { fill: gnColor, fillStyle: "solid", stroke: gnColor, seed: "pac-legende-b" });
      label(svg, "agglomération", bx + 16, 16, { size: 21, weight: 800, color: gnColor });
      rows.forEach((row, index) => {
        const cy = top + index * rowHeight + rowHeight / 2;
        const isNC = row.cas === "Nouvelle-Calédonie";
        if (isNC) {
          svg.append("rect").attr("x", 0).attr("y", cy - rowHeight / 2 + 2).attr("width", width).attr("height", rowHeight - 4).attr("fill", "#e7efe3");
        }
        label(svg, `${row.cas}${row.estimation ? " *" : ""}`, left - 18, cy, { anchor: "end", size, weight: isNC ? 800 : 700, color: isNC ? gnColor : ink });
        roughLine(svg, rc, x(row.noyau), cy, x(row.elargi), cy, { stroke: "#8f877b", strokeWidth: 3, roughness: 0.6, seed: `pac-trait-${index}` });
        roughCircle(svg, rc, x(row.noyau), cy, size * 0.95, { fill: paper, fillStyle: "solid", stroke: noumeaColor, strokeWidth: 2.4, seed: `pac-a-${index}` });
        roughCircle(svg, rc, x(row.elargi), cy, size * 0.95, { fill: gnColor, fillStyle: "solid", stroke: gnColor, seed: `pac-b-${index}` });
        label(svg, pct(row.elargi), x(row.elargi) + size * 0.9, cy, { size: size * 0.92, weight: 800, color: gnColor });
      });
    }
  };

  start({ load, values, draw });
})();
