// Campagne « Appel à contributions ». Les textes des croquis reprennent la
// page https://contours.nc/contribuer/ (formats, premier échange, étapes,
// publics). Le contour de la Nouvelle-Calédonie est celui de la bannière du
// site (assets/data/nc_logo.geojson).
(() => {
  "use strict";

  const { label, roughPath, roughRect, roughLine, roughCircle, start, ink, paper } = window.CampagneArticle;
  const muted = "#625d55";
  const green = "#2f6b45";
  const red = "#c54832";
  const gold = "#d6a21f";
  const teal = "#237a67";
  const sketchFont = "Cabin Sketch, sans-serif";
  const palette = [green, gold, red, teal, "#6c568f"];

  function hatchColor(color) {
    const lab = d3.lab(color);
    return d3.lab(Math.max(10, lab.l - 30), lab.a, lab.b).formatHex();
  }

  // Découpe un texte en lignes d'une largeur approximative (en caractères).
  function wrap(text, maxWidth, size) {
    const perLine = Math.max(8, Math.floor(maxWidth / (size * 0.52)));
    const lines = [];
    let line = "";
    text.split(" ").forEach((word) => {
      if ((line + " " + word).trim().length > perLine) {
        lines.push(line.trim());
        line = word;
      } else {
        line += ` ${word}`;
      }
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function lines(svg, text, x, y, maxWidth, size, options = {}) {
    const rows = wrap(text, maxWidth, size);
    rows.forEach((row, i) => label(svg, row, x, y + i * size * 1.22, { size, ...options }));
    return rows.length * size * 1.22;
  }

  function rewind(features) {
    const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
    const fix = (polygon) => (d3.geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI ? flip(polygon) : polygon);
    return features.map((feature) => {
      const g = feature.geometry;
      return { ...feature, geometry: { ...g, coordinates: g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix) } };
    });
  }

  function load() {
    return d3.json("../../assets/data/nc_logo.geojson").then((geo) => ({ nc: rewind(geo.features) }));
  }

  const formats = [
    ["Note de recherche", "Premiers résultats, analyse exploratoire ou synthèse accessible d’une étude."],
    ["Carte ou datavisualisation", "Une représentation originale pour explorer un territoire, un phénomène ou des données."],
    ["Éclairage", "Une analyse documentée d’une question contemporaine."],
    ["Données et méthodes", "Un jeu de données, un indicateur, une méthode ou un outil utile à d’autres."],
    ["Mémoire, thèse ou stage", "Un résultat qui mérite de circuler au-delà de son cadre académique."]
  ];

  const draw = {
    // La Nouvelle-Calédonie entourée de fiches : ce qu'on peut y publier.
    couverture(svg, data, { rc, node, width, height }) {
      const minimal = node.dataset.minimal === "true";
      const margin = minimal ? 10 : Math.min(width, height) * 0.2;
      const projection = d3.geoMercator().fitExtent([[margin, margin], [width - margin, height - margin]], { type: "FeatureCollection", features: data.nc });
      const path = d3.geoPath(projection);
      data.nc.forEach((feature, index) => {
        roughPath(svg, rc, path(feature), {
          fill: hatchColor("#9fbf9a"), fillStyle: "hachure", hachureAngle: -41, hachureGap: minimal ? 5 : 7, fillWeight: 1.2,
          stroke: ink, strokeWidth: 2, roughness: 1.3, seed: `contrib-nc-${index}`
        });
      });
      if (minimal) return;
      const size = Math.max(22, Math.min(30, width / 34));
      const cards = [
        ["Note de recherche", 0.02, 0.06, green],
        ["Carte", 0.70, 0.04, gold],
        ["Données", 0.04, 0.78, teal],
        ["Datavisualisation", 0.58, 0.82, red]
      ];
      cards.forEach(([text, fx, fy, color], index) => {
        const w = text.length * size * 0.56 + size * 1.6;
        const h = size * 2;
        const x = Math.min(width - w - 6, fx * width);
        const y = Math.min(height - h - 6, fy * height);
        svg.append("rect").attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("fill", paper);
        roughRect(svg, rc, x, y, w, h, { stroke: color, strokeWidth: 2.4, roughness: 1.4, seed: `contrib-fiche-${index}` });
        roughRect(svg, rc, x + size * 0.45, y + h / 2 - size * 0.32, size * 0.64, size * 0.64, {
          fill: color, fillStyle: "solid", stroke: hatchColor(color), strokeWidth: 1, seed: `contrib-puce-${index}`
        });
        label(svg, text, x + size * 1.3, y + h / 2, { size, weight: 800, color: hatchColor(color) });
      });
    },

    // Les cinq formats, en fiches crayonnées.
    formats(svg, data, { rc, width, height }) {
      const cols = width > height * 1.6 ? 2 : 1;
      const rows = Math.ceil(formats.length / cols);
      const gap = 14;
      const cardW = (width - gap * (cols - 1)) / cols;
      const cardH = (height - gap * (rows - 1)) / rows;
      const title = Math.max(22, Math.min(34, cardH * 0.3));
      const body = Math.max(18, Math.min(26, cardH * 0.22));
      formats.forEach(([name, text], index) => {
        const x = (index % cols) * (cardW + gap);
        const y = Math.floor(index / cols) * (cardH + gap);
        const color = palette[index];
        svg.append("rect").attr("x", x).attr("y", y).attr("width", cardW).attr("height", cardH).attr("fill", paper);
        roughRect(svg, rc, x, y, cardW, cardH, { stroke: "#b9b1a5", strokeWidth: 1.4, roughness: 1.3, seed: `contrib-format-${index}` });
        roughRect(svg, rc, x, y, 10, cardH, { fill: color, fillStyle: "solid", stroke: color, seed: `contrib-format-bord-${index}` });
        label(svg, name, x + 26, y + cardH * 0.3, { size: title, family: sketchFont, color: hatchColor(color) })
          .attr("stroke", hatchColor(color)).attr("stroke-width", 0.8).attr("paint-order", "stroke");
        lines(svg, text, x + 26, y + cardH * 0.3 + title * 1.05, cardW - 46, body, { weight: 700, color: muted });
      });
    },

    // Ce qu'il faut pour un premier échange : quatre cases à cocher.
    idee(svg, data, { rc, width, height }) {
      const items = [
        "Le sujet ou la question",
        "Ce que vous souhaitez montrer",
        "Les données, sources ou matériaux mobilisés",
        "Éventuellement, un lien vers un travail existant"
      ];
      const rowH = height / items.length;
      const size = Math.max(24, Math.min(36, rowH * 0.3));
      items.forEach((text, index) => {
        const y = index * rowH + rowH / 2;
        const box = size * 1.4;
        roughRect(svg, rc, 8, y - box / 2, box, box, { strokeWidth: 2.2, roughness: 1.3, seed: `contrib-case-${index}` });
        roughPath(svg, rc, `M${8 + box * 0.2},${y} L${8 + box * 0.45},${y + box * 0.28} L${8 + box * 0.95},${y - box * 0.45}`, {
          stroke: green, strokeWidth: 4, roughness: 1, seed: `contrib-coche-${index}`
        });
        lines(svg, text, 8 + box + 22, y - (wrap(text, width - box - 40, size).length - 1) * size * 0.6, width - box - 40, size, { weight: 800 });
        if (index < items.length - 1) {
          roughLine(svg, rc, 8, (index + 1) * rowH, width - 8, (index + 1) * rowH, { stroke: "#d5ccbe", strokeWidth: 1.2, seed: `contrib-sep-${index}` });
        }
      });
    },

    // Quatre étapes reliées par un trait crayonné.
    etapes(svg, data, { rc, width, height }) {
      const steps = [
        ["Proposition", "Vous présentez votre idée en quelques lignes."],
        ["Échange", "Nous définissons ensemble le format le plus adapté."],
        ["Préparation et relecture", "Clarté, sources et méthodes transparentes."],
        ["Publication", "Signée, avec l’affiliation et de quoi citer le contenu."]
      ];
      const vertical = height > width * 0.45;
      const n = steps.length;
      const r = Math.max(26, Math.min(44, (vertical ? height / n : width / n) * 0.22));
      const title = Math.max(22, Math.min(34, r * 0.8));
      const body = Math.max(18, Math.min(26, r * 0.6));
      const centers = steps.map((_, i) => (vertical
        ? [r + 6, (i + 0.5) * (height / n)]
        : [(i + 0.5) * (width / n), r + 10]));
      roughPath(svg, rc, d3.line()(centers), { stroke: muted, strokeWidth: 2, roughness: 1.2, seed: "contrib-etapes-trait" });
      steps.forEach(([name, text], i) => {
        const [x, y] = centers[i];
        const color = palette[i];
        roughCircle(svg, rc, x, y, r * 2, { fill: color, fillStyle: "solid", stroke: hatchColor(color), strokeWidth: 2, seed: `contrib-etape-${i}` });
        label(svg, String(i + 1).padStart(2, "0"), x, y + 1, { anchor: "middle", size: r * 0.85, family: sketchFont, color: paper });
        if (vertical) {
          label(svg, name, x + r + 20, y - body * 0.7, { size: title, weight: 800, color: hatchColor(color) });
          lines(svg, text, x + r + 20, y + title * 0.65, width - x - r - 30, body, { weight: 700, color: muted });
        } else {
          const w = width / n - 12;
          lines(svg, name, x - w / 2, y + r + title, w, title * 0.85, { weight: 800, color: hatchColor(color) });
          lines(svg, text, x - w / 2, y + r + title * 3, w, body * 0.9, { weight: 700, color: muted });
        }
      });
    },

    // Les publics invités à contribuer, en étiquettes.
    publics(svg, data, { rc, width, height }) {
      const tags = ["Chercheurs", "Doctorants", "Postdoctorants", "Jeunes chercheurs", "Étudiants", "Professionnels", "Experts", "Producteurs de données"];
      const size = Math.max(24, Math.min(40, width / 24));
      const padX = size * 0.8;
      const h = size * 2;
      const gap = size * 0.55;
      const rowsOut = [];
      let row = [];
      let rowW = 0;
      tags.forEach((tag) => {
        const w = tag.length * size * 0.56 + padX * 2;
        if (rowW + w > width - 8 && row.length) {
          rowsOut.push(row);
          row = [];
          rowW = 0;
        }
        row.push([tag, w]);
        rowW += w + gap;
      });
      if (row.length) rowsOut.push(row);
      const totalH = rowsOut.length * h + (rowsOut.length - 1) * gap;
      let y = Math.max(0, (height - totalH) / 2);
      let k = 0;
      rowsOut.forEach((items) => {
        const used = d3.sum(items, (d) => d[1]) + gap * (items.length - 1);
        let x = (width - used) / 2;
        items.forEach(([tag, w]) => {
          const color = palette[k % palette.length];
          svg.append("rect").attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("rx", h / 2).attr("fill", paper);
          roughRect(svg, rc, x, y, w, h, {
            fill: color, fillStyle: "hachure", hachureGap: 8, fillWeight: 1, stroke: hatchColor(color), strokeWidth: 2, roughness: 1.4,
            opacity: 0.85, seed: `contrib-tag-${k}`
          });
          label(svg, tag, x + w / 2, y + h / 2, { anchor: "middle", size, weight: 850, color: ink, halo: true, haloWidth: 6 });
          x += w + gap;
          k += 1;
        });
        y += h + gap;
      });
    }
  };

  start({ load, values: () => ({}), draw });
})();
