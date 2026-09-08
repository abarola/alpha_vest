/* Progressive enhancement for one existing chart. No external chart dependency. */
(() => {
  const cardId = "chart-portfolio_company_valuation_map_yahoo_ttm";
  const percent = (value) => value == null ? "Not available" : `${(value * 100).toFixed(1)}%`;
  const multiple = (value) => `${value.toFixed(1)}×`;
  const date = (value) => value ? new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(value)) : "Not available";
  const svgNode = (tag, attributes = {}, content) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (content != null) node.textContent = content;
    return node;
  };

  function mount(card, data) {
    const rows = data.companies;
    const reference = data.reference;
    const matches = (row) => row.fcfYield > reference.fcfYield && row.priceToBook < reference.priceToBook;
    const matching = rows.filter(matches).length;
    let selected = null;
    let view = "chart";
    let lastWidth = 0;
    const explorer = document.createElement("div");
    explorer.className = "valuation-explorer";
    explorer.innerHTML = `
      <div class="vm-insight"><strong></strong><p>Above the dashed line means a higher cash-flow yield. Left of the dashed line means a lower valuation multiple.</p></div>
      <div class="vm-controls">
        <label class="vm-picker" for="vm-company">Explore a company<select id="vm-company"><option value="">Portfolio overview</option></select></label>
        <div class="vm-switch" role="group" aria-label="Valuation view">
          <button type="button" data-view="chart" aria-pressed="true" aria-controls="vm-chart-panel">Chart</button>
          <button type="button" data-view="table" aria-pressed="false" aria-controls="vm-table-panel">Data table</button>
        </div>
      </div>
      <div class="vm-layout">
        <div class="vm-plot">
          <div id="vm-chart-panel">
            <div class="vm-chart"></div>
            <div class="vm-legend"><span><i class="vm-swatch" aria-hidden="true"></i>Meets both comparisons</span><span><i class="vm-swatch other" aria-hidden="true"></i>Other companies</span></div>
            <p class="vm-hint">Select a dot or choose a company above. Dashed lines show portfolio reference levels.</p>
          </div>
          <div id="vm-table-panel" hidden class="vm-table-wrap" role="region" aria-label="Valuation data" tabindex="0">
            <table><caption>Companies ordered by cash-flow yield, highest first. Select a company for details.</caption><thead><tr><th scope="col">Company</th><th scope="col">Cash-flow yield</th><th scope="col">Price / tangible book</th><th scope="col">Meets both</th></tr></thead><tbody></tbody></table>
          </div>
        </div>
        <aside class="vm-detail" aria-label="Selection details" aria-live="polite" aria-atomic="true"></aside>
      </div>
      <p class="vm-footnote"></p>
      <details class="vm-method"><summary>Definitions &amp; source</summary>
        <p><strong>Cash-flow yield</strong> is the last 12 months of free cash flow divided by market value. A higher yield means more cash generated relative to the share price; it is not a forecast return.</p>
        <p><strong>Price / tangible book</strong> compares market value with book equity after subtracting intangible assets. The horizontal axis uses a logarithmic scale: 1× to 10× is the same distance as 10× to 100×.</p>
        <p><strong>The highlighted area</strong> combines a cash-flow yield above the portfolio reference with a price / tangible book multiple below it. All dots have the same size; portfolio weights appear in company details.</p>
        <p>Cash flow can be cyclical, and tangible book is less informative for asset-light businesses. Compare businesses in context before drawing a valuation conclusion. Companies without positive price / tangible book or available cash-flow yield cannot be plotted.</p>
        <p>Source: Yahoo Finance trailing-12-month cash flow and the existing portfolio analysis. The retrieval date refers to cash-flow data; reporting periods vary by company. Price-based ratios are from the source analysis snapshot.</p>
        <a href="images/portfolio_performance/portfolio_company_valuation_map_yahoo_ttm.png" target="_blank" rel="noopener">View original chart ↗</a>
      </details>`;
    explorer.querySelector(".vm-insight strong").textContent = `${matching} of ${rows.length} companies combine higher cash-flow yield with a lower valuation multiple.`;
    const picker = explorer.querySelector("select");
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.ticker;
      option.textContent = row.ticker;
      picker.append(option);
    });
    const retrievedDates = rows.map((row) => row.retrievedAt?.slice(0, 10)).filter(Boolean).sort();
    const retrieval = retrievedDates.length ? (retrievedDates[0] === retrievedDates.at(-1)
      ? date(retrievedDates[0]) : `${date(retrievedDates[0])}–${date(retrievedDates.at(-1))}`) : "unavailable";
    explorer.querySelector(".vm-footnote").textContent = `Cash-flow data retrieved ${retrieval} · ${rows.length} companies shown${data.excludedCount ? ` · ${data.excludedCount} excluded: missing yield or non-positive valuation multiple` : ""}. These comparisons support research; they do not establish that a company is undervalued.`;

    const detail = explorer.querySelector(".vm-detail");
    function showDetails() {
      detail.replaceChildren();
      const eyebrow = document.createElement("p");
      eyebrow.className = "vm-eyebrow";
      eyebrow.textContent = selected ? "Company in focus" : "Start with the references";
      const heading = document.createElement("h4");
      heading.textContent = selected?.ticker || "Portfolio overview";
      const description = document.createElement("p");
      description.textContent = selected
        ? `Cash-flow yield is ${selected.fcfYield > reference.fcfYield ? "above" : selected.fcfYield < reference.fcfYield ? "below" : "at"} the portfolio reference; the valuation multiple is ${selected.priceToBook < reference.priceToBook ? "lower" : selected.priceToBook > reference.priceToBook ? "higher" : "the same"}.`
        : "Use these two reference levels to place each company in context. Select a company to see its values and the comparison.";
      const metrics = document.createElement("dl");
      const values = selected ? [
        ["Cash-flow yield", percent(selected.fcfYield)],
        ["Price / tangible book", multiple(selected.priceToBook)],
        ["Weight in covered companies", percent(selected.weight)],
        ["Yield vs. 5-year median", selected.changeVsMedian == null ? "Not available" : `${selected.changeVsMedian >= 0 ? "+" : ""}${(selected.changeVsMedian * 100).toFixed(1)} percentage points`],
      ] : [["Portfolio cash-flow yield", percent(reference.fcfYield)], ["Portfolio price / tangible book", multiple(reference.priceToBook)]];
      values.forEach(([label, value]) => {
        const group = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        group.append(dt, dd);
        metrics.append(group);
      });
      detail.append(eyebrow, heading, description, metrics);
      if (selected) {
        const period = document.createElement("p");
        period.className = "vm-period";
        period.textContent = `12-month period ending ${date(selected.periodEnd)}.`;
        detail.append(period);
        if (selected.detailsUrl && /^stocks\/[A-Z0-9._-]+\.html$/.test(selected.detailsUrl)) {
          const link = document.createElement("a");
          link.href = selected.detailsUrl;
          link.textContent = "Explore fundamentals →";
          detail.append(link);
        }
      }
    }

    const chart = explorer.querySelector(".vm-chart");
    function draw() {
      const width = Math.round(chart.clientWidth);
      if (width < 100 || view !== "chart") return;
      lastWidth = width;
      const height = width < 440 ? 370 : 410;
      const box = { left: 49, right: width - 22, top: 39, bottom: height - 69 };
      const xMin = Math.min(-0.3, Math.floor(Math.log10(Math.min(...rows.map((row) => row.priceToBook), reference.priceToBook)))) ;
      const xMax = Math.ceil(Math.log10(Math.max(...rows.map((row) => row.priceToBook), reference.priceToBook))) + .05;
      const yMin = Math.min(0, Math.floor(Math.min(...rows.map((row) => row.fcfYield * 100), reference.fcfYield * 100) / 5) * 5);
      const yMax = Math.max(5, Math.ceil(Math.max(...rows.map((row) => row.fcfYield * 100), reference.fcfYield * 100) / 5) * 5);
      const x = (value) => box.left + (Math.log10(value) - xMin) / (xMax - xMin) * (box.right - box.left);
      const y = (value) => box.bottom - (value - yMin) / (yMax - yMin) * (box.bottom - box.top);
      const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "group", "aria-labelledby": "vm-svg-title vm-svg-desc" });
      svg.append(svgNode("title", { id: "vm-svg-title" }, "Cash-flow yield and company valuation"));
      svg.append(svgNode("desc", { id: "vm-svg-desc" }, "Each dot is a company. Higher cash-flow yields are above; lower price-to-tangible-book ratios are to the left on a logarithmic axis. The shaded area meets both portfolio comparisons. Select a dot with Enter or Space, or use the company selector or data table."));
      svg.append(svgNode("rect", { x: box.left, y: box.top, width: x(reference.priceToBook) - box.left, height: y(reference.fcfYield * 100) - box.top, fill: "#13382f", opacity: .75 }));
      const yStep = Math.max(5, Math.ceil((yMax - yMin) / 5 / 5) * 5);
      for (let tick = yMin; tick <= yMax; tick += yStep) {
        svg.append(svgNode("line", { x1: box.left, x2: box.right, y1: y(tick), y2: y(tick), class: "vm-grid" }));
        svg.append(svgNode("text", { x: box.left - 9, y: y(tick) + 5, "text-anchor": "end", class: "vm-axis" }, `${tick}%`));
      }
      for (let power = Math.ceil(xMin); power < xMax; power++) {
        const tick = 10 ** power;
        svg.append(svgNode("line", { x1: x(tick), x2: x(tick), y1: box.top, y2: box.bottom, class: "vm-grid" }));
        svg.append(svgNode("text", { x: x(tick), y: box.bottom + 25, "text-anchor": "middle", class: "vm-axis" }, `${tick}×`));
      }
      svg.append(svgNode("line", { x1: x(reference.priceToBook), x2: x(reference.priceToBook), y1: box.top, y2: box.bottom, class: "vm-reference" }));
      svg.append(svgNode("line", { x1: box.left, x2: box.right, y1: y(reference.fcfYield * 100), y2: y(reference.fcfYield * 100), class: "vm-reference" }));
      svg.append(svgNode("text", { x: box.left, y: 22, class: "vm-axis-title" }, "Cash-flow yield ↑"));
      svg.append(svgNode("text", { x: box.left, y: height - 16, class: "vm-axis-title" }, "← Lower price / tangible book"));
      // Paint the selected company last so overlapping points never hide it.
      const ordered = [...rows].sort((a, b) => Number(a === selected) - Number(b === selected));
      ordered.forEach((row) => {
        const active = row === selected;
        const group = svgNode("g", { class: "vm-point", tabindex: "0", role: "button", "data-ticker": row.ticker, "aria-pressed": String(active), "aria-label": `${row.ticker}: cash-flow yield ${percent(row.fcfYield)}, price to tangible book ${multiple(row.priceToBook)}. ${matches(row) ? "Meets both comparisons." : "Does not meet both comparisons."}` });
        const cx = x(row.priceToBook), cy = y(row.fcfYield * 100);
        group.append(svgNode("circle", { cx, cy, r: 13, fill: "transparent" }));
        group.append(svgNode("circle", { cx, cy, r: active ? 8 : 6, class: "vm-dot", fill: matches(row) ? "#8be0ce" : "#8497aa", opacity: selected && !active ? .45 : .95 }));
        if (active) {
          const anchor = cx > width - 90 ? "end" : "start";
          group.append(svgNode("text", { x: cx + (anchor === "end" ? -13 : 13), y: cy - 12, "text-anchor": anchor }, row.ticker));
        }
        group.addEventListener("click", () => choose(row.ticker, true));
        group.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(row.ticker, true); }
        });
        svg.append(group);
      });
      chart.replaceChildren(svg);
    }

    const tbody = explorer.querySelector("tbody");
    [...rows].sort((a, b) => b.fcfYield - a.fcfYield).forEach((row) => {
      const tr = document.createElement("tr");
      tr.dataset.ticker = row.ticker;
      const nameCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vm-table-company";
      button.textContent = row.ticker;
      button.addEventListener("click", () => choose(row.ticker));
      nameCell.append(button);
      tr.append(nameCell);
      [percent(row.fcfYield), multiple(row.priceToBook), matches(row) ? "Yes" : "No"].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      tbody.append(tr);
    });
    function choose(ticker, restoreFocus = false) {
      selected = rows.find((row) => row.ticker === ticker) || null;
      picker.value = selected?.ticker || "";
      showDetails();
      tbody.querySelectorAll("tr").forEach((tr) => {
        const active = tr.dataset.ticker === selected?.ticker;
        tr.dataset.selected = String(active);
        tr.querySelector("button").setAttribute("aria-pressed", String(active));
      });
      draw();
      if (restoreFocus) Array.from(chart.querySelectorAll(".vm-point")).find((point) => point.dataset.ticker === selected?.ticker)?.focus({ preventScroll: true });
    }
    picker.addEventListener("change", () => choose(picker.value));
    explorer.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      view = button.dataset.view;
      explorer.querySelector("#vm-chart-panel").hidden = view !== "chart";
      explorer.querySelector("#vm-table-panel").hidden = view !== "table";
      explorer.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      draw();
    }));
    card.querySelector(".chart-reader-frame").before(explorer);
    card.classList.add("valuation-enhanced");
    card.querySelector(".chart-reader-caption h3").textContent = "Cash generation, in perspective";
    card.querySelector(".chart-reader-caption p").textContent = "Explore how each company’s cash-flow yield and valuation compare with the portfolio.";
    choose("");
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(() => { if (Math.round(chart.clientWidth) !== lastWidth) draw(); }).observe(chart);
    } else {
      window.addEventListener("resize", draw);
      new MutationObserver(draw).observe(card, { attributes: true, attributeFilter: ["hidden"] });
    }
    const preview = document.querySelector("#gallery-portfolio .chart-preview");
    if (preview) {
      const summary = document.createElement("span");
      summary.className = "vm-preview-summary";
      summary.textContent = `${matching} of ${rows.length} companies meet both portfolio comparisons. Select a company to understand why.`;
      preview.querySelector(".chart-preview-prompt").before(summary);
      preview.querySelector(".chart-preview-prompt").textContent = "Explore interactive chart →";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const card = document.getElementById(cardId);
    if (!card?.querySelector(".chart-reader-frame")) return;
    try {
      const response = await fetch("data/valuation-map.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Valuation data unavailable");
      const data = await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.companies) || !data.companies.length ||
          !Number.isFinite(data.reference?.priceToBook) || data.reference.priceToBook <= 0 ||
          !Number.isFinite(data.reference?.fcfYield) || data.companies.some((row) =>
            typeof row.ticker !== "string" || !Number.isFinite(row.priceToBook) || row.priceToBook <= 0 || !Number.isFinite(row.fcfYield))) {
        throw new Error("Invalid valuation data");
      }
      mount(card, data);
    } catch (error) {
      // Keep the existing image and reading notes fully usable when data is unavailable.
      card.classList.remove("valuation-enhanced");
      card.querySelector(".valuation-explorer")?.remove();
      console.warn("Interactive valuation map unavailable; using original chart.", error);
    }
  });
})();
