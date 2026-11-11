/* Public-market-only currency/rates section. No external chart runtime. */
(() => {
  "use strict";
  const keys = ["eurusd", "spread_bps", "us_10y_pct", "germany_10y_pct"];
  const numeric = value => typeof value === "number" && Number.isFinite(value);
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

  function validate(data) {
    if (!data || data.schema_version !== 1 || data.frequency !== "daily" || !validDate(data.as_of) ||
        !Array.isArray(data.dates) || data.dates.length < 3 || data.dates.length > 50000 ||
        data.dates[0] !== data.first_date || data.dates.at(-1) !== data.as_of ||
        !data.dates.every((date, i) => validDate(date) && (!i || date > data.dates[i - 1]))) return false;
    if (!data.latest || !data.history || !keys.every(key => numeric(data.latest[key]) &&
        Array.isArray(data.history[key]) && data.history[key].length === data.dates.length &&
        data.history[key].every(value => value === null || numeric(value)) &&
        numeric(data.history[key].at(-1)) && Math.abs(data.history[key].at(-1) - data.latest[key]) < 1e-6)) return false;
    if (data.history.eurusd.some(value => value !== null && value <= 0)) return false;
    for (let i = 0; i < data.dates.length; i++) {
      const us = data.history.us_10y_pct[i], de = data.history.germany_10y_pct[i], spread = data.history.spread_bps[i];
      if (numeric(us) && numeric(de) ? !numeric(spread) || Math.abs(spread - 100 * (us - de)) > 1e-6 : spread !== null) return false;
    }
    if (!Array.isArray(data.quantiles) || data.quantiles.length !== 6) return false;
    const identities = new Set();
    for (const row of data.quantiles) {
      if (!row || typeof row !== "object") return false;
      const id = `${row.series}:${row.years}`;
      if (!["eurusd", "spread_bps"].includes(row.series) || ![1, 5, 10].includes(row.years) || identities.has(id) ||
          !Number.isInteger(row.observations) || row.observations < 1 || row.observations > data.dates.length ||
          typeof row.full_window_covered !== "boolean" || !numeric(row.latest) || Math.abs(row.latest - data.latest[row.series]) > 1e-6 ||
          !validDate(row.window_start_exclusive) || row.window_end_inclusive !== data.as_of || row.window_start_exclusive >= data.as_of) return false;
      identities.add(id);
      if (row.observations < 3) {
        if (![row.p10, row.p50, row.p90, row.latest_percentile].every(value => value === null)) return false;
      } else if (![row.p10, row.p50, row.p90, row.latest_percentile].every(numeric) ||
          row.p10 > row.p50 || row.p50 > row.p90 || row.latest_percentile < 0 || row.latest_percentile > 100) return false;
    }
    const hosts = new Set(["www.ecb.europa.eu", "www.bundesbank.de", "fred.stlouisfed.org", "home.treasury.gov"]);
    if (!Array.isArray(data.sources) || !data.sources.length || !data.sources.every(source => {
      try { const url = new URL(source.url); return url.protocol === "https:" && hosts.has(url.hostname) && validDate(source.as_of) && typeof source.series_id === "string"; }
      catch { return false; }
    })) return false;
    return true;
  }

  const number = (value, decimals = 1) => numeric(value) ? value.toLocaleString("en-GB", {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "—";
  const dateLabel = value => new Date(value).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function svgNode(tag, attributes, text) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function chart(parent, data, components = false) {
    const figure = node("figure", "fx-chart");
    const title = components ? "Component 10-year yields" : "EUR/USD and the yield spread";
    const definitions = components ? [["germany_10y_pct", "Germany 10Y", "fx-teal"], ["us_10y_pct", "US Treasury 10Y", "fx-amber"]] :
      [["eurusd", "EUR/USD · left", "fx-teal"], ["spread_bps", "US−Germany spread · right", "fx-amber"]];
    figure.append(node("h4", "", title));
    const legend = node("div", "fx-legend"); definitions.forEach(([, label]) => legend.append(node("span", "", label))); figure.append(legend);
    const plot = node("div"); figure.append(plot);
    const readout = node("p", "fx-readout"); readout.setAttribute("aria-live", "polite"); figure.append(readout);
    parent.append(figure);
    const times = data.dates.map(Date.parse), last = times.length - 1;
    let selected = last;
    function render() {
      const width = Math.max(270, plot.clientWidth || 900), height = width < 600 ? 215 : 255;
      const left = 45, right = width - (components ? 15 : 50), top = 15, bottom = height - 30;
      const svg = svgNode("svg", {viewBox: `0 0 ${width} ${height}`, role: "img", tabindex: "0", "aria-label": `${title}. Full history to ${dateLabel(data.as_of)}. Use arrow keys to inspect dates.`});
      svg.append(svgNode("title", {}, `${title}: ${data.first_date} to ${data.as_of}`));
      const x = time => left + (time - times[0]) / (times[last] - times[0]) * (right - left);
      const extent = values => {
        const finite = values.filter(numeric), min = Math.min(...finite), max = Math.max(...finite), pad = (max - min || Math.abs(max) || 1) * .08;
        return [min - pad, max + pad];
      };
      const shared = components ? extent([...data.history.us_10y_pct, ...data.history.germany_10y_pct]) : null;
      definitions.forEach(([key,, color], index) => {
        const [min, max] = shared || extent(data.history[key]);
        const y = value => bottom - (value - min) / (max - min) * (bottom - top);
        if (!components || index === 0) {
          for (let tick = 0; tick <= 4; tick++) {
            const value = min + tick * (max - min) / 4, py = y(value);
            if (index === 0) svg.append(svgNode("line", {x1: left, x2: right, y1: py, y2: py, class: "fx-grid"}));
            svg.append(svgNode("text", {x: index === 0 ? left - 7 : right + 7, y: py + 4, "text-anchor": index === 0 ? "end" : "start"}, number(value, key === "eurusd" ? 2 : components ? 1 : 0)));
          }
        }
        let path = "", connected = false;
        data.history[key].forEach((value, i) => {
          if (value === null) { connected = false; return; }
          path += `${connected ? "L" : "M"}${x(times[i]).toFixed(1)},${y(value).toFixed(1)}`; connected = true;
        });
        svg.append(svgNode("path", {d: path, class: `fx-path ${color}`}));
      });
      const ticks = width < 550 ? 3 : 6;
      for (let i = 0; i < ticks; i++) {
        const time = times[0] + (times[last] - times[0]) * i / (ticks - 1);
        svg.append(svgNode("text", {x: x(time), y: height - 6, "text-anchor": i === 0 ? "start" : i === ticks - 1 ? "end" : "middle"}, new Date(time).getUTCFullYear()));
      }
      const cursor = svgNode("line", {x1: right, x2: right, y1: top, y2: bottom, class: "fx-cursor"}); svg.append(cursor);
      function show(index) {
        selected = Math.max(0, Math.min(last, index));
        cursor.setAttribute("x1", x(times[selected])); cursor.setAttribute("x2", x(times[selected]));
        readout.textContent = dateLabel(data.dates[selected]) + " · " + definitions.map(([key, label]) =>
          `${label.replace(/ · .*/, "")} ${number(data.history[key][selected], key === "eurusd" ? 4 : key === "spread_bps" ? 0 : 2)}${key === "spread_bps" ? " bps" : key === "eurusd" ? "" : "%"}`).join(" · ");
      }
      svg.addEventListener("pointermove", event => {
        const bounds = svg.getBoundingClientRect(), px = (event.clientX - bounds.left) / bounds.width * width;
        const time = times[0] + (px - left) / (right - left) * (times[last] - times[0]);
        let low = 0, high = last;
        while (low < high) { const mid = (low + high) >>> 1; if (times[mid] < time) low = mid + 1; else high = mid; }
        show(low && Math.abs(times[low - 1] - time) < Math.abs(times[low] - time) ? low - 1 : low);
      });
      svg.addEventListener("keydown", event => {
        const next = {ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: last}[event.key];
        if (next !== undefined) { event.preventDefault(); show(next); }
      });
      plot.replaceChildren(svg); show(selected);
    }
    render();
    if (typeof ResizeObserver !== "undefined") {
      let previous = plot.clientWidth;
      new ResizeObserver(() => { if (Math.abs(plot.clientWidth - previous) > 2) { previous = plot.clientWidth; render(); } }).observe(plot);
    }
  }

  function table(parent, headings, rows) {
    const wrap = node("div", "fx-table-wrap"), element = node("table"), head = node("thead"), tr = node("tr");
    wrap.tabIndex = 0; wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", headings.includes("N") ? "Distribution levels" : "Historical percentiles");
    headings.forEach(label => { const th = node("th", "", label); th.scope = "col"; tr.append(th); }); head.append(tr); element.append(head);
    const body = node("tbody"); rows.forEach(row => { const line = node("tr"); row.forEach((value, i) => line.append(node(i === 0 ? "th" : "td", "", value))); body.append(line); });
    element.append(body); wrap.append(element); parent.append(wrap); return body;
  }

  function render(root, data) {
    root.replaceChildren();
    const values = node("div", "fx-values");
    for (const [key, label, unit, decimals] of [["eurusd", "EUR / USD", "USD per euro", 4], ["spread_bps", "US yield advantage", "basis points · US minus Germany", 0],
                                               ["us_10y_pct", "US Treasury 10Y", "yield per annum", 2], ["germany_10y_pct", "Germany 10Y", "yield per annum", 2]]) {
      const card = node("article", "macro-summary-card"); card.append(node("div", "macro-summary-label", label),
        node("div", "macro-summary-value", number(data.latest[key], decimals) + (key.endsWith("_pct") ? "%" : key === "spread_bps" ? " bps" : "")), node("div", "macro-summary-detail", unit)); values.append(card);
    }
    root.append(values); chart(root, data); chart(root, data, true);
    root.append(node("h4", "", "Latest value in historical context"));
    const rows = ["eurusd", "spread_bps"].map(key => [key === "eurusd" ? "EUR/USD" : "US−Germany spread", ...[1, 5, 10].map(year => {
      const q = data.quantiles.find(row => row.series === key && row.years === year);
      return `${number(q.latest_percentile)}${q.latest_percentile === null ? "" : "%"}${q.full_window_covered ? "" : " · partial"}`;
    })]);
    const body = table(root, ["Latest percentile", "1 year", "5 years", "10 years"], rows);
    body.querySelectorAll("td").forEach(cell => cell.classList.add("fx-rank"));
    root.append(node("p", "fx-note", "Percentile = the share of observations below the latest value, with ties half-weighted. 50% is the historical middle. Daily data through the date shown, including the latest partial month."));
    const details = node("details", "fx-details"); details.append(node("summary", "", "Distribution levels, sources & reading notes"));
    table(details, ["Series", "Window", "P10", "Median", "P90", "N"], data.quantiles.map(row => [row.series === "eurusd" ? "EUR/USD" : "Spread (bps)", `${row.years}Y${row.full_window_covered ? "" : " · partial"}`,
      ...[row.p10, row.p50, row.p90].map(value => number(value, row.series === "eurusd" ? 4 : 1)), String(row.observations)]));
    details.append(node("p", "", "Full history is shown above. Each calendar-year window ends on the latest common date and includes that observation. Missing data are not filled. P10, median and P90 use linear interpolation on paired observed dates. Different source observation times mean these are not synchronized closes. Descriptive history, not a currency forecast."));
    const list = node("ul"); data.sources.forEach(source => { const item = node("li"), link = node("a", "", source.series_id); link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; item.append(link, document.createTextNode(` · ${dateLabel(source.as_of)}`)); list.append(item); }); details.append(list); root.append(details);
  }

  if (typeof module !== "undefined") module.exports = {validate, number, validDate};
  if (typeof document === "undefined") return;
  const content = document.getElementById("fx-content"), status = document.getElementById("fx-status"), root = document.getElementById("eurusd-macro");
  if (!content || !status || !root) return;
  (async () => {
    try {
      const response = await fetch("data/eurusd_yield_spread.json", {cache: "no-store"});
      if (!response.ok) throw Error("Unavailable data");
      const data = await response.json(); if (!validate(data)) throw Error("Invalid market data");
      content.hidden = false; render(content, data);
      const age = Math.floor((Date.now() - Date.parse(data.as_of)) / 86400000);
      root.dataset.state = age > 7 ? "stale" : "current";
      status.textContent = `As of ${dateLabel(data.as_of)}${age > 7 ? " · update overdue" : " · daily"}`;
    } catch {
      content.replaceChildren(); content.hidden = true; root.dataset.state = "unavailable";
      status.textContent = "Currency and rate data are unavailable.";
    }
  })();
})();
