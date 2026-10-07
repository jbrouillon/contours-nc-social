// Campagne « Empreintes climatiques du Pacifique ». Les règles reprennent
// celles de assets/js/pacific-climate-fingerprints/climate-map-interactive.js
// du site : 21 territoires cartographiés (Pitcairn n'a pas de polygone),
// comptage des valeurs > 0 et < 0, pluie « nettement » plus humide ou plus
// sèche au-delà de deux erreurs-types publiées, valeurs manquantes non
// interpolées.
(() => {
  "use strict";

  const { label, roughPath, roughRect, roughLine, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";

  const metrics = {
    ocean: { label: "Mer", unit: "°C", domain: [-1, 0, 1], colors: ["#3f7197", "#fff4dc", "#b64f47"] },
    land: { label: "Terres", unit: "°C", domain: [-1, 0, 1], colors: ["#456f91", "#fff4dc", "#a94440"] },
    rain: { label: "Pluies", unit: "mm", domain: [-60, 0, 60], colors: ["#d7672d", "#fff1c9", "#2475a7"] },
    sea_level: { label: "Niveau marin", unit: "cm", domain: [-15, 0, 15], colors: ["#d1a348", "#fff4dc", "#416f96"] }
  };
  const rainColors = { wetter: "#2475a7", drier: "#d7672d", near: "#efe3c4" };
  // Dans les comptages, « en dessous de la référence » reste neutre : le bleu
  // signifie « plus froid » pour la mer mais « plus haut » pour le niveau
  // marin, et ne doit pas changer de sens d'un écran à l'autre du carrousel.
  const belowColor = "#a39d93";
  const landmarks = [["PG", "Papouasie-N.-G."], ["FJ", "Fidji"], ["PF", "Polynésie fr."]];

  const countryToCode = new Map([
    ["American Samoa", "AS"], ["Cook Islands", "CK"], ["Fiji", "FJ"], ["Guam", "GU"], ["Kiribati", "KI"],
    ["Marshall Islands", "MH"], ["Micronesia", "FM"], ["Nauru", "NR"], ["New Caledonia", "NC"], ["Niue", "NU"],
    ["Northern Mariana Islands", "MP"], ["Palau", "PW"], ["Papua New Guinea", "PG"], ["Polynesie Francaise", "PF"],
    ["Samoa", "WS"], ["Solomon Islands", "SB"], ["Tokelau", "TK"], ["Tonga", "TO"], ["Tuvalu", "TV"],
    ["Vanuatu", "VU"], ["Wallis et Futuna", "WF"]
  ]);

  const format1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const signed = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${format1.format(Math.abs(x))}`;

  function scale(metric) {
    const m = metrics[metric];
    return d3.scaleLinear().domain(m.domain).range(m.colors).interpolate(d3.interpolateLab).clamp(true);
  }

  function rainClass(row) {
    if (!row || !Number.isFinite(row.value)) return null;
    const band = Number.isFinite(row.standard_error) ? row.standard_error * 2 : 0;
    if (row.value > band) return "wetter";
    if (row.value < -band) return "drier";
    return "near";
  }

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  // --- Données ---------------------------------------------------------------

  function load() {
    return Promise.all([
      d3.csv("donnees/climate_interactive.csv", (d) => ({
        code: d.code,
        indicator: d.indicator,
        year: +d.year,
        value: d.value === "" ? NaN : +d.value,
        standard_error: d.standard_error === "" ? NaN : +d.standard_error
      })),
      d3.json("donnees/eez.geojson")
    ]).then(([rows, eez]) => {
      // d3 attend des anneaux dans le sens horaire : un polygone qui couvre
      // plus d'un hémisphère est retourné.
      const features = eez.features.map((feature) => {
        const code = countryToCode.get(feature.properties.country);
        if (!code) throw new Error(`Territoire inconnu : ${feature.properties.country}`);
        const copy = { ...feature, code };
        if (d3.geoArea(copy) > 2 * Math.PI) {
          copy.geometry = {
            ...feature.geometry,
            coordinates: feature.geometry.type === "Polygon"
              ? feature.geometry.coordinates.map((ring) => ring.slice().reverse())
              : feature.geometry.coordinates.map((polygon) => polygon.map((ring) => ring.slice().reverse()))
          };
        }
        return copy;
      });
      const index = d3.index(rows.filter((d) => Number.isFinite(d.value)), (d) => d.indicator, (d) => d.year, (d) => d.code);
      return { rows, features, mapped: features.map((f) => f.code), index };
    });
  }

  function observations(data, metric, year) {
    const byCode = data.index.get(metric)?.get(year);
    return data.mapped.map((code) => byCode?.get(code)).filter(Boolean);
  }

  function counts(data, metric, year) {
    const values = observations(data, metric, year).map((d) => d.value);
    return { n: values.length, pos: values.filter((v) => v > 0).length, neg: values.filter((v) => v < 0).length };
  }

  function row(data, metric, year, code) {
    const found = data.index.get(metric)?.get(year)?.get(code);
    if (!found) throw new Error(`Observation absente : ${code} · ${metric} · ${year}`);
    return found;
  }

  function values(data) {
    const rain = observations(data, "rain", 2025);
    const ncRain = rainClass(row(data, "rain", 2025, "NC"));
    const ocean2025 = counts(data, "ocean", 2025);
    return {
      mapped: String(data.mapped.length),
      atlas: String(new Set(data.rows.map((d) => d.code)).size),
      ocean_2025: `${ocean2025.pos} / ${ocean2025.n}`,
      ocean_2025_pos: String(ocean2025.pos),
      ocean_1960_pos: String(counts(data, "ocean", 1960).pos),
      land_2025_pos: String(counts(data, "land", 2025).pos),
      land_2025_neg: String(counts(data, "land", 2025).neg),
      rain_2025_wetter: String(rain.filter((d) => rainClass(d) === "wetter").length),
      rain_2025_drier: String(rain.filter((d) => rainClass(d) === "drier").length),
      rain_2025_near: String(rain.filter((d) => rainClass(d) === "near").length),
      sea_2023_pos: String(counts(data, "sea_level", 2023).pos),
      sea_2023_n: String(counts(data, "sea_level", 2023).n),
      nc_ocean_2025: `${signed(row(data, "ocean", 2025, "NC").value)} °C`,
      nc_land_2025: `${signed(row(data, "land", 2025, "NC").value)} °C`,
      nc_rain_2025: { wetter: "nettement plus humides que la normale", drier: "nettement plus sèches que la normale", near: "proches de la normale" }[ncRain]
    };
  }

  // --- Croquis ------------------------------------------------------------

  // Carte des zones économiques exclusives, centrée sur l'antiméridien.
  function drawMap(svg, rc, data, { metric, year, box, labels = true, seedKey }) {
    const collection = { type: "FeatureCollection", features: data.features };
    const projection = d3.geoMercator().rotate([-180, 0]).fitExtent(box, collection);
    const path = d3.geoPath(projection);
    const color = scale(metric);
    // Graticule discret : un repère de papier, sans précision cartographique.
    svg.append("path").attr("d", path(d3.geoGraticule().step([20, 20])()))
      .attr("fill", "none").attr("stroke", "#d5ccbe").attr("stroke-width", 1).attr("stroke-dasharray", "4 6");
    data.features.forEach((feature, index) => {
      const obs = data.index.get(metric)?.get(year)?.get(feature.code);
      const fill = !obs ? "#e9e5dd" : metric === "rain" ? rainColors[rainClass(obs)] : color(obs.value);
      const d = path(feature);
      svg.append("path").attr("d", d).attr("fill", fill).attr("fill-opacity", 0.92);
      roughPath(svg, rc, d, {
        fill: hatchColor(fill), fillStyle: "hachure", hachureAngle: -41, hachureGap: 6, fillWeight: 1,
        stroke: ink, strokeWidth: 1.3, roughness: 1.2, opacity: 0.75, seed: `${seedKey}-${feature.code}`
      });
    });
    if (labels) {
      const size = Math.max(24, Math.min(30, (box[1][0] - box[0][0]) / 34));
      // Quelques repères nommés pour que la carte se lise hors contexte.
      landmarks.forEach(([code, name]) => {
        const feature = data.features.find((f) => f.code === code);
        if (!feature) throw new Error(`Repère absent : ${code}`);
        const [lx, ly] = path.centroid(feature);
        label(svg, name, lx, ly, { anchor: "middle", size: size * 0.86, color: muted, halo: true, haloWidth: 7 });
      });
      const nc = data.features.find((f) => f.code === "NC");
      const [x, y] = path.centroid(nc);
      // Étiquette sous la Nouvelle-Calédonie, sans déborder sur la légende.
      const textY = Math.min(y + size * 3.2, box[1][1] - size * 0.7);
      roughLine(svg, rc, x, y, x - size * 2.2, textY - size * 0.8, { strokeWidth: 1.6, seed: `${seedKey}-nc-arrow` });
      const obs = data.index.get(metric)?.get(year)?.get("NC");
      const text = metric === "rain" ? "Nouvelle-Calédonie" : `Nouvelle-Calédonie ${signed(obs.value)} ${metrics[metric].unit}`;
      label(svg, text, x - size * 2.2, textY, { anchor: "middle", size, halo: true });
    }
    return projection;
  }

  // Libellés en mots de température plutôt qu'en couleurs.
  const countLabels = {
    ocean: ["mer plus chaude que la référence ↑", "plus froide ↓"],
    land: ["terres plus chaudes que la référence ↑", "plus froides ↓"],
    sea_level: ["mer plus haute que la référence ↑", "plus basse ↓"]
  };

  const legendTitles = {
    ocean: ["Température de la mer : écart à la référence", "← plus froide", "plus chaude →"],
    land: ["Température des terres : écart à la référence", "← plus froides", "plus chaudes →"],
    rain: ["Pluies : écart à la normale", "", ""],
    sea_level: ["Niveau marin : écart à la référence", "← plus bas", "plus haut →"]
  };

  // Titre de légende et sens de l'échelle écrits en toutes lettres.
  function drawLegend(svg, rc, metric, x, y, width) {
    const size = 24;
    const [title, low, high] = legendTitles[metric];
    label(svg, title, x, y, { size, weight: 800 });
    y += 26;
    if (metric === "rain") {
      const items = [["drier", "nettement plus sec"], ["near", "proche de la normale"], ["wetter", "nettement plus humide"]];
      const step = width / items.length;
      items.forEach(([key, text], index) => {
        const x0 = x + index * step;
        svg.append("rect").attr("x", x0).attr("y", y).attr("width", 30).attr("height", 24).attr("fill", rainColors[key]).attr("stroke", "#b9b1a5");
        label(svg, text, x0 + 38, y + 12, { size, color: muted });
      });
      return;
    }
    const m = metrics[metric];
    const color = scale(metric);
    const steps = 40;
    d3.range(steps).forEach((i) => {
      const value = m.domain[0] + (m.domain[2] - m.domain[0]) * (i + 0.5) / steps;
      svg.append("rect").attr("x", x + (i * width) / steps).attr("y", y).attr("width", width / steps + 0.5).attr("height", 16).attr("fill", color(value));
    });
    roughRect(svg, rc, x, y, width, 16, { fill: "none", strokeWidth: 1, seed: `legend-${metric}` });
    // Légende étroite (aperçu de lien) : le sens seul, sans les bornes.
    const roomy = width >= 700;
    label(svg, roomy ? `${low} (≤ ${signed(m.domain[0])} ${m.unit})` : low, x, y + 40, { size: 22, weight: 700, color: m.colors[0] });
    label(svg, "référence", x + width / 2, y + 40, { anchor: "middle", size: 22, color: muted });
    label(svg, roomy ? `(≥ ${signed(m.domain[2])} ${m.unit}) ${high}` : high, x + width, y + 40, { anchor: "end", size: 22, weight: 700, color: hatchColor(m.colors[2]) });
  }

  const draw = {
    carte(svg, data, { rc, node, width, height }) {
      const metric = node.dataset.indicator;
      const year = Number(node.dataset.year);
      const minimal = node.dataset.minimal === "true";
      const legendHeight = minimal ? 0 : 116;
      drawMap(svg, rc, data, {
        metric, year, labels: !minimal, seedKey: `carte-${metric}-${year}`,
        box: [[6, 6], [width - 6, height - legendHeight - 8]]
      });
      if (!minimal) {
        const legendWidth = Math.min(width - 20, metric === "rain" ? 860 : 800);
        drawLegend(svg, rc, metric, (width - legendWidth) / 2, height - legendHeight + 30, legendWidth);
        label(svg, String(year), width - 6, 26, { anchor: "end", size: 48, family: "Cabin Sketch, sans-serif", color: muted });
      }
    },

    // Comptage annuel : au-dessus de l'axe, les territoires au-dessus de leur
    // référence ; en dessous, ceux qui sont en dessous.
    compte(svg, data, { rc, node, width, height }) {
      const metric = node.dataset.indicator;
      const startYear = Number(node.dataset.start);
      const endYear = Number(node.dataset.end);
      const years = d3.range(startYear, endYear + 1);
      const series = years.map((year) => ({ year, ...counts(data, metric, year) }));
      const maxN = d3.max(series, (d) => d.n);
      const tick = 24;
      const left = 60;
      const right = width - 10;
      const top = 52;
      const bottom = height - 78;
      const x = d3.scaleBand().domain(years).range([left, right]).paddingInner(0.22);
      const negMax = Math.max(4, d3.max(series, (d) => d.neg));
      const y = d3.scaleLinear().domain([-negMax, maxN]).range([bottom, top]);
      const m = metrics[metric];
      const warm = m.colors[2];
      const cool = belowColor;
      [0, 5, 10, 15, 20].filter((v) => v <= maxN).forEach((v) => {
        svg.append("line").attr("x1", left).attr("x2", right).attr("y1", y(v)).attr("y2", y(v))
          .attr("stroke", "#d5ccbe").attr("stroke-dasharray", "3 6");
        label(svg, String(v), left - 10, y(v), { anchor: "end", size: tick, color: muted });
      });
      series.forEach((d) => {
        if (d.pos) {
          roughRect(svg, rc, x(d.year), y(d.pos), x.bandwidth(), y(0) - y(d.pos), {
            fill: warm, fillStyle: "solid", stroke: hatchColor(warm), strokeWidth: 0.8, roughness: 0.9, seed: `pos-${metric}-${d.year}`
          });
        }
        if (d.neg) {
          roughRect(svg, rc, x(d.year), y(0), x.bandwidth(), y(-d.neg) - y(0), {
            fill: cool, fillStyle: "solid", stroke: hatchColor(cool), strokeWidth: 0.8, roughness: 0.9, seed: `neg-${metric}-${d.year}`
          });
        }
      });
      roughLine(svg, rc, left, y(0), right, y(0), { strokeWidth: 2, seed: `axe-${metric}` });
      const tickYears = metric === "sea_level" ? [1993, 2000, 2010, 2023] : [1960, 1980, 2000, 2025];
      tickYears.forEach((year) => label(svg, String(year), x(year) + x.bandwidth() / 2, bottom + 28, { anchor: "middle", size: tick, color: muted }));
      const [aboveText, belowText] = countLabels[metric];
      label(svg, aboveText, left, top - 30, { size: tick, color: hatchColor(warm) });
      label(svg, belowText, right, y(0) + tick * 1.1, { anchor: "end", size: tick, color: muted, halo: true });
      // Repères de début et de fin, lus directement sur les barres.
      [series[0], series[series.length - 1]].forEach((d, index) => {
        const cx = x(d.year) + x.bandwidth() / 2;
        label(svg, `${d.year} : ${d.pos}/${d.n}`, cx, y(Math.max(d.pos, 0)) - 18, {
          anchor: index ? "end" : "start", size: tick * 1.1, halo: true
        });
      });
      label(svg, "nombre de territoires, chaque année", right, height - 4, { anchor: "end", size: 22, color: muted, baseline: "auto" });
    },

    // Empreinte : quatre rubans d'années sur un axe commun 1850–2025.
    empreinte(svg, data, { rc, node, width, height }) {
      const code = node.dataset.code;
      const order = ["ocean", "land", "rain", "sea_level"];
      const left = Math.min(220, width * 0.25);
      const right = width - 8;
      const top = 8;
      const axis = 48;
      const rowHeight = (height - top - axis) / order.length;
      const x = d3.scaleLinear().domain([1850, 2026]).range([left, right]);
      const size = Math.max(24, Math.min(30, rowHeight / 4));
      order.forEach((metric, index) => {
        const y0 = top + index * rowHeight + rowHeight * 0.12;
        const h = rowHeight * 0.76;
        const color = scale(metric);
        const rows = data.rows.filter((d) => d.code === code && d.indicator === metric && Number.isFinite(d.value));
        roughRect(svg, rc, left, y0, right - left, h, { fill: "none", stroke: "#b9b1a5", strokeWidth: 1, seed: `cadre-${metric}` });
        rows.forEach((d) => {
          const fill = metric === "rain" ? rainColors[rainClass(d)] : color(d.value);
          svg.append("rect").attr("x", x(d.year)).attr("y", y0).attr("width", x(d.year + 1) - x(d.year) + 0.4).attr("height", h).attr("fill", fill);
        });
        const first = d3.min(rows, (d) => d.year);
        label(svg, metrics[metric].label, left - 14, y0 + h / 2 - size * 0.45, { anchor: "end", size });
        label(svg, `depuis ${first}`, left - 14, y0 + h / 2 + size * 0.8, { anchor: "end", size: size * 0.8, color: muted, weight: 400 });
      });
      [1850, 1900, 1950, 2000, 2025].forEach((year) => {
        const xx = x(year + 0.5);
        svg.append("line").attr("x1", xx).attr("x2", xx).attr("y1", height - axis).attr("y2", height - axis + 8).attr("stroke", ink);
        label(svg, String(year), xx, height - axis + 30, { anchor: year === 2025 ? "end" : "middle", size: 24, color: muted });
      });
    }
  };

  start({ load, values, draw });
})();
