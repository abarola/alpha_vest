(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const elements = {
    total: $("sp-total"), years: $("sp-years"), latest: $("sp-latest"),
    provenance: $("sp-provenance"), search: $("sp-search"), year: $("sp-year"),
    sort: $("sp-sort"), clear: $("sp-clear"), status: $("sp-status"),
    count: $("sp-count"), events: $("sp-events"),
  };
  let events = [];
  let loaded = false;

  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const link = (label, url) => {
    const href = safeUrl(url);
    if (!href) return null;
    const node = text("a", label);
    node.href = href;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  };
  const displaySourceText = (value) => String(value).replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  const displayDate = (iso) => iso ? new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : null;
  const eventYear = (event) => event.date?.slice(0, 4) || event.timing.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
  const sortEvents = (rows, direction) => rows.sort((a, b) => {
    if (!a.date && b.date) return 1;
    if (a.date && !b.date) return -1;
    const compare = a.date && b.date ? a.date.localeCompare(b.date) : 0;
    return direction === "oldest" ? compare : -compare;
  });

  function renderEvent(event) {
    const article = document.createElement("article");
    article.className = "sp-event";
    const top = text("div", "", "sp-event-top");
    const main = document.createElement("div");
    main.append(text("p", event.date ? displayDate(event.date) : event.timing, "sp-event-date"));
    const heading = document.createElement("h3");
    heading.append(document.createTextNode(displaySourceText(event.parent)), text("span", "→", "sp-arrow"), document.createTextNode(displaySourceText(event.details)));
    main.append(heading, text("p", `Source timing: ${event.timing}`, "sp-details"));
    top.append(main);
    const tickers = text("div", "", "sp-tickers");
    for (const ticker of [...event.parent_tickers, ...event.separated_tickers]) {
      const anchor = link(ticker.symbol, ticker.url);
      if (anchor) tickers.append(anchor);
    }
    if (tickers.childElementCount) top.append(tickers);
    article.append(top);
    const documents = (event.documents || []).map((item) => link(item.label, item.url)).filter(Boolean);
    const details = document.createElement("details");
    details.append(text("summary", `Source documents (${documents.length})`));
    if (documents.length) {
      const container = text("div", "", "sp-docs");
      container.append(...documents);
      details.append(container);
    } else {
      details.append(text("p", "No linked documents listed by the source."));
    }
    article.append(details);
    return article;
  }

  function render() {
    if (!loaded) return;
    const query = elements.search.value.trim().toLocaleLowerCase();
    const year = elements.year.value;
    const matching = events.filter((event) => {
      const haystack = [event.parent, event.details, event.timing,
        ...event.parent_tickers.map((item) => item.symbol),
        ...event.separated_tickers.map((item) => item.symbol)].join(" ").toLocaleLowerCase();
      return (!year || eventYear(event) === year) && (!query || haystack.includes(query));
    });
    sortEvents(matching, elements.sort.value);
    elements.events.replaceChildren(...matching.map(renderEvent));
    if (!matching.length) elements.events.append(text("p", "No events match these filters. Try another name, ticker, or year.", "sp-empty"));
    elements.status.textContent = "";
    elements.count.textContent = `${matching.length} of ${events.length} events`;
  }

  function populate(data) {
    if (data.schema_version !== 1 || !Array.isArray(data.events) || !data.events.length) throw new Error("Invalid event dataset");
    events = data.events;
    const dated = sortEvents(events.filter((event) => event.date), "newest");
    const years = [...new Set(events.map(eventYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    elements.total.textContent = String(events.length);
    elements.years.textContent = years.length ? `${years.at(-1)}–${years[0]}` : "Unknown";
    elements.latest.textContent = dated.length ? displayDate(dated[0].date) : "Undated";
    for (const year of years) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      elements.year.append(option);
    }
    const source = data.source || {};
    elements.provenance.replaceChildren(
      document.createTextNode(`Source updated: ${source.source_updated_at ? displayDate(source.source_updated_at) : "not stated"} · Retrieved: ${data.fetched_at ? new Date(data.fetched_at).toLocaleString() : "unknown"} · `),
      link(source.name || "Source", source.url) || document.createTextNode("Source")
    );
    loaded = true;
    render();
  }

  for (const key of ["search", "year", "sort"]) elements[key].addEventListener(key === "search" ? "input" : "change", render);
  elements.clear.addEventListener("click", () => {
    elements.search.value = "";
    elements.year.value = "";
    elements.sort.value = "newest";
    render();
    elements.search.focus();
  });
  fetch("data/spinoffs.json", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(populate)
    .catch(() => {
      loaded = false;
      events = [];
      elements.total.textContent = "—";
      elements.years.textContent = "—";
      elements.latest.textContent = "—";
      elements.count.textContent = "";
      elements.status.textContent = "The event archive could not be loaded. Please try again later.";
      elements.provenance.textContent = "Source dates unavailable.";
      elements.events.replaceChildren(text("p", "Event data is temporarily unavailable.", "sp-empty"));
    });
})();
