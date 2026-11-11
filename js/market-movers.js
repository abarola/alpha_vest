(() => {
  "use strict";

  const card = document.getElementById("market-movers");
  if (!card) return;

  const top = 15;
  const preview = 5;
  const status = card.querySelector(".market-movers-status");
  const controls = card.querySelector(".market-movers-switch");
  const results = card.querySelector(".market-movers-results");
  const expand = card.querySelector(".market-movers-expand");
  const buttons = [...controls.querySelectorAll("button")];
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  const returnFormat = new Intl.NumberFormat("en-US", {
    style: "percent", signDisplay: "always", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const symbolPattern = /^[A-Z][A-Z0-9-]{0,9}$/;
  let period = "1d";
  let expanded = false;

  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }

  function validWindow(window, size) {
    if (!window) return false;
    const { ranked, advancing, declining, missing, gainers, losers } = window;
    const validCount = (count) => Number.isSafeInteger(count) && count >= 0;
    if (![ranked, advancing, declining].every(validCount) || ranked > size || ranked * 100 < size * 95 ||
        advancing + declining > ranked || !Array.isArray(missing) || missing.length !== size - ranked ||
        missing.some((symbol) => typeof symbol !== "string" || !symbolPattern.test(symbol))) return false;

    const used = new Set(missing);
    if (used.size !== missing.length) return false;
    const validMoves = (moves, count, sign) => Array.isArray(moves) && moves.length === Math.min(top, count) &&
      moves.every((move, index) => {
        if (!move || typeof move.symbol !== "string" || !symbolPattern.test(move.symbol) || used.has(move.symbol) ||
            !Number.isFinite(move.return_pct) || move.return_pct <= -100 || move.return_pct * sign <= 0 ||
            (index > 0 && move.return_pct * sign > moves[index - 1].return_pct * sign)) return false;
        used.add(move.symbol);
        return true;
      });
    return validMoves(gainers, advancing, 1) && validMoves(losers, declining, -1);
  }

  function readSnapshot(data) {
    if (data?.schema_version !== 1 || data.universe !== "SP500" ||
        !Number.isSafeInteger(data.universe_size) || data.universe_size < 490) throw new Error("Invalid universe");
    const asOf = parseDate(data.as_of);
    const daily = parseDate(data.periods?.["1d"]?.start_date);
    const quarterly = parseDate(data.periods?.["3m"]?.start_date);
    if (!asOf || !daily || !quarterly || daily >= asOf || quarterly >= daily ||
        !["1d", "3m"].every((key) => validWindow(data.periods[key], data.universe_size))) {
      throw new Error("Invalid market movers snapshot");
    }
    return { ...data, asOf, starts: { "1d": daily, "3m": quarterly } };
  }

  function element(tag, className, text = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function renderList(selector, moves, breadth, scale) {
    const panel = card.querySelector(selector);
    panel.querySelector(".market-movers-breadth").textContent = breadth;
    const rows = moves.map(({ symbol, return_pct }, index) => {
      const row = element("li", "market-movers-row");
      const rank = element("span", "market-movers-rank", String(index + 1).padStart(2, "0"));
      const track = element("span", "market-movers-track");
      const bar = element("span", "market-movers-bar");
      rank.setAttribute("aria-hidden", "true");
      track.setAttribute("aria-hidden", "true");
      bar.style.width = `${Math.abs(return_pct) / scale * 100}%`;
      track.append(bar);
      row.append(rank, element("strong", "market-movers-symbol", symbol), track,
        element("span", "market-movers-return", returnFormat.format(return_pct / 100)));
      row.hidden = !expanded && index >= preview;
      return row;
    });
    if (!rows.length) rows.push(element("li", "market-movers-empty", "None in this period"));
    panel.querySelector("ol").replaceChildren(...rows);
  }

  function render(snapshot) {
    const window = snapshot.periods[period];
    const scale = Math.max(window.gainers[0]?.return_pct ?? 0, -(window.losers[0]?.return_pct ?? 0));
    const maxRows = Math.max(window.gainers.length, window.losers.length);
    const dates = dateFormat.formatRange(snapshot.starts[period], snapshot.asOf);
    const stale = Date.now() - snapshot.asOf.getTime() > 7 * 86400000;
    const coverage = `${window.ranked} of ${snapshot.universe_size} ranked`;
    const missing = window.missing.length ? ` · ${window.missing.length} missing` : "";
    status.dataset.stale = String(stale);
    status.textContent = `${dates} · ${coverage}${missing}${stale ? " · Older snapshot" : ""}`;
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.period === period)));
    renderList(".market-movers-up", window.gainers, `${window.advancing} advanced`, scale);
    renderList(".market-movers-down", window.losers, `${window.declining} declined`, scale);
    const flat = window.ranked - window.advancing - window.declining;
    card.querySelector(".market-movers-missing").textContent = window.missing.length
      ? `${flat} unchanged. Missing endpoint prices: ${window.missing.join(", ")}.`
      : `${flat} unchanged. Every constituent had both prices.`;
    expand.hidden = maxRows <= preview;
    expand.textContent = expanded ? "Show fewer" : `Show all ${maxRows} per side`;
    expand.setAttribute("aria-expanded", String(expanded && !expand.hidden));
  }

  async function load() {
    status.textContent = "Loading market movers…";
    try {
      const response = await fetch("data/market_movers.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Market movers fetch failed");
      const snapshot = readSnapshot(await response.json());
      render(snapshot);
      controls.hidden = false;
      results.hidden = false;
      buttons.forEach((button) => button.addEventListener("click", () => {
        if (period === button.dataset.period) return;
        period = button.dataset.period;
        render(snapshot);
      }));
      expand.addEventListener("click", () => {
        expanded = !expanded;
        render(snapshot);
      });
    } catch {
      status.textContent = "Market movers data is temporarily unavailable.";
    }
  }

  load();
})();
