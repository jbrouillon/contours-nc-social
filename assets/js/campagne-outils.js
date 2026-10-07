// Outils communs des campagnes tirées d'un article (articles/<slug>/source.html).
// Mise en page selon ?layout=, activation de ?slide=N, remplissage des valeurs
// calculées ([data-v="clé"]), croquis rough.js à graines déterministes et
// signal document.documentElement.dataset.ready attendu par exporter_visuels.py.
(function () {
  "use strict";

  const ink = "#252525";
  const paper = "#fffdf8";

  function seed(value) {
    let hash = 2166136261;
    for (const char of String(value || "contours")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (Math.abs(hash) % 2147483646) + 1;
  }

  function label(parent, text, x, y, options = {}) {
    return parent.append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", options.anchor || "start")
      .attr("dominant-baseline", options.baseline || "middle")
      .attr("font-family", options.family || "Atkinson Hyperlegible, sans-serif")
      .attr("font-size", options.size || 26)
      .attr("font-weight", options.weight || 700)
      .attr("fill", options.color || ink)
      .attr("paint-order", options.halo ? "stroke" : null)
      .attr("stroke", options.halo ? (options.haloColor || paper) : null)
      .attr("stroke-width", options.halo ? (options.haloWidth || 6) : null)
      .attr("stroke-linejoin", options.halo ? "round" : null)
      .text(text);
  }

  function append(parent, node, opacity) {
    parent.node().appendChild(node);
    const selection = d3.select(node);
    if (opacity != null) selection.attr("opacity", opacity);
    return selection;
  }

  function roughOptions(options, defaults) {
    const merged = { ...defaults, ...options };
    merged.seed = seed(options.seed);
    delete merged.opacity;
    return merged;
  }

  function roughPath(parent, rc, pathData, options = {}) {
    if (!pathData) return null;
    const node = rc.path(pathData, roughOptions(options, {
      fill: "none", fillStyle: "solid", stroke: ink, strokeWidth: 1.4, roughness: 1.2, bowing: 0.8
    }));
    return append(parent, node, options.opacity);
  }

  function roughLine(parent, rc, x1, y1, x2, y2, options = {}) {
    const node = rc.line(x1, y1, x2, y2, roughOptions(options, {
      stroke: ink, strokeWidth: 1.4, roughness: 1.1, bowing: 0.8
    }));
    return append(parent, node, options.opacity);
  }

  function roughRect(parent, rc, x, y, width, height, options = {}) {
    const node = rc.rectangle(x, y, width, height, roughOptions(options, {
      fill: "none", fillStyle: "hachure", stroke: ink, strokeWidth: 1.2, roughness: 1.3, bowing: 1
    }));
    return append(parent, node, options.opacity);
  }

  function roughCircle(parent, rc, x, y, diameter, options = {}) {
    const node = rc.circle(x, y, diameter, roughOptions(options, {
      fill: paper, fillStyle: "hachure", hachureGap: 3, hachureAngle: -38, fillWeight: 1,
      stroke: ink, strokeWidth: 1, roughness: 1.1, bowing: 0.8
    }));
    return append(parent, node, options.opacity);
  }

  // Graphique en unités : un carré crayonné par élément (bureau, territoire),
  // regroupés par catégorie dans l'ordre donné. Plus lisible qu'un nuage de
  // points dans un fil mobile. groups = [{ count, color, label }].
  // Renvoie la hauteur occupée.
  function units(parent, rc, groups, box, options = {}) {
    const [[x0, y0], [x1, y1]] = box;
    const total = d3.sum(groups, (g) => g.count);
    if (!total) throw new Error("Graphique en unités vide");
    const width = x1 - x0;
    const height = y1 - y0;
    const gapRatio = options.gapRatio ?? 0.28;
    // Plus grand côté de carré qui fait tenir toutes les unités dans la boîte.
    let best = { size: 0, columns: 1 };
    for (let columns = 1; columns <= total; columns += 1) {
      const rows = Math.ceil(total / columns);
      const size = Math.min(width / (columns + (columns - 1) * gapRatio), height / (rows + (rows - 1) * gapRatio));
      if (size > best.size) best = { size, columns };
    }
    const size = Math.min(best.size, options.maxSize || Infinity);
    const step = size * (1 + gapRatio);
    const columns = Math.max(1, Math.floor((width + size * gapRatio) / step));
    const used = columns * step - size * gapRatio;
    const left = x0 + (width - used) / 2;
    let index = 0;
    groups.forEach((group, g) => {
      for (let k = 0; k < group.count; k += 1, index += 1) {
        const x = left + (index % columns) * step;
        const y = y0 + Math.floor(index / columns) * step;
        roughRect(parent, rc, x, y, size, size, {
          fill: group.color, fillStyle: group.fillStyle || "hachure", hachureGap: Math.max(2.4, size / 6),
          hachureAngle: group.angle ?? -41, fillWeight: Math.max(1, size / 22), stroke: group.stroke || ink,
          strokeWidth: Math.max(1, size / 26), roughness: 1, seed: `${options.seed || "unites"}-${g}-${k}`
        });
      }
    });
    return Math.ceil(total / columns) * step - size * gapRatio;
  }

  // Remplit les éléments [data-v] avec les valeurs calculées. Une clé absente
  // est une erreur : on refuse de produire un visuel incomplet.
  function fill(values) {
    document.querySelectorAll("[data-v]").forEach((node) => {
      const key = node.dataset.v;
      if (!(key in values) || values[key] == null || values[key] === "") {
        throw new Error(`Valeur manquante : ${key}`);
      }
      node.textContent = values[key];
    });
    document.querySelectorAll("[data-trend]").forEach((node) => {
      const value = values[node.dataset.trend];
      if (typeof value !== "number") throw new Error(`Tendance non numérique : ${node.dataset.trend}`);
      node.classList.add(value >= 0 ? "is-up" : "is-down");
    });
  }

  function showError(error) {
    console.error(error);
    const active = document.querySelector(".slide.is-active") || document.body;
    const box = document.createElement("p");
    box.className = "error";
    box.textContent = `Le visuel n’a pas pu être produit : ${error.message}`;
    active.prepend(box);
    document.documentElement.dataset.ready = "error";
  }

  // load() renvoie les données ; values(data) les chiffres affichés ;
  // draw[nom](svg, data, context) dessine le croquis [data-sketch="nom"].
  async function start({ load, values, draw }) {
    const params = new URLSearchParams(window.location.search);
    const layout = params.get("layout") || "portrait";
    document.body.classList.add(`layout-${layout}`);
    const slides = Array.from(document.querySelectorAll("[data-slide]"));
    const requested = Number.parseInt(params.get("slide") || "1", 10);
    const index = Math.min(slides.length, Math.max(1, requested || 1)) - 1;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
      const folio = slide.querySelector(".folio");
      if (folio) folio.textContent = `${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    });

    try {
      if (!window.d3 || !window.rough) throw new Error("d3 ou rough.js indisponible");
      const [data] = await Promise.all([
        load(),
        document.fonts.load('700 72px "Cabin Sketch"'),
        document.fonts.load('700 30px "Atkinson Hyperlegible"'),
        document.fonts.load('400 30px "Atkinson Hyperlegible"')
      ]);
      const computed = values(data);
      fill(computed);
      const active = slides[index];
      // Le croquis est dessiné à la taille réelle de sa zone : les cartes
      // remplissent ainsi chaque format et les textes gardent une taille en px.
      active.querySelectorAll("svg[data-sketch]").forEach((node) => {
        const name = node.dataset.sketch;
        if (!draw[name]) throw new Error(`Croquis inconnu : ${name}`);
        const box = node.getBoundingClientRect();
        const width = Math.round(box.width);
        const height = Math.round(box.height);
        if (width < 200 || height < 150) throw new Error(`Zone trop petite pour le croquis ${name} (${width} × ${height})`);
        node.setAttribute("viewBox", `0 0 ${width} ${height}`);
        const svg = d3.select(node);
        svg.selectAll("*").remove();
        draw[name](svg, data, { rc: rough.svg(node), layout, values: computed, node, width, height });
      });
      await document.fonts.ready;
      document.documentElement.dataset.ready = "true";
    } catch (error) {
      showError(error);
    }
  }

  window.CampagneArticle = { seed, label, roughPath, roughLine, roughRect, roughCircle, units, start, ink, paper };
})();
