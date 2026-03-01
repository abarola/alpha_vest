/**
 * BayesDemon front-end script
 * - Enhances pre-rendered image galleries (captions + explainers)
 * - Lightbox
 * - Rank & historical analysis tables (JSON-driven)
 * - Optional table filters and sorting
 * - Scroll-to-top button
 * - Optional image refresh via manifest (cache busting only when files change)
 */
document.addEventListener("DOMContentLoaded", () => {
  let rankingPresetController = null;
  const shortlistController = initShortlist();

  initDecisionPath();
  initScrollReveal();

  /* ==================== 1. Images (static HTML, JS enhances behavior) ==================== */

  function filenameToCaption(name) {
    return String(name || "")
      .replace(/\.\w+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  function ensureCaption(fig, img) {
    let cap = fig.querySelector("figcaption");
    if (!cap) {
      cap = document.createElement("figcaption");
      fig.appendChild(cap);
    }
    if (!cap.textContent?.trim()) {
      cap.textContent =
        img.alt?.trim() || filenameToCaption(img.getAttribute("src"));
    }
  }

  function markStaticExplainer(fig) {
    const existing = fig.querySelector("details.chart-explainer");
    if (existing) fig.classList.add("has-explainer");
  }

  function enhancePreRenderedGalleries() {
    const figures = Array.from(document.querySelectorAll("figure.image-card"));
    figures.forEach((fig, idx) => {
      const img = fig.querySelector("img");
      if (!img) return;

      // Ensure accessibility + consistent behavior
      if (!img.alt?.trim())
        img.alt = filenameToCaption(img.getAttribute("src"));
      img.tabIndex = img.tabIndex >= 0 ? img.tabIndex : 0;

      // Performance defaults (keep your explicit HTML attributes if already present)
      if (!img.loading) img.loading = "lazy";
      img.decoding = img.decoding || "async";
      img.fetchPriority = idx < 2 ? "high" : "low";

      // Used by lightbox open
      img.dataset.caption = img.dataset.caption || img.alt;

      ensureCaption(fig, img);
      markStaticExplainer(fig);
    });

    // Mobile collapse logic per gallery (exclude figures that have an explainer)
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    const collapseLimit = 4;
    const galleries = Array.from(document.querySelectorAll(".image-section"));

    galleries.forEach((gallery) => {
      const figs = Array.from(gallery.querySelectorAll("figure.image-card"));
      const plainFigures = figs.filter(
        (f) => !f.classList.contains("has-explainer")
      );

      // Remove any prior state
      plainFigures.forEach((f) => f.classList.remove("hidden-mobile"));
      const existingBtn = gallery.querySelector(".show-more-btn");
      if (existingBtn) existingBtn.remove();

      if (plainFigures.length <= collapseLimit) return;

      plainFigures
        .slice(collapseLimit)
        .forEach((f) => f.classList.add("hidden-mobile"));

      const btn = document.createElement("button");
      btn.className = "show-more-btn";
      btn.textContent = `Show ${plainFigures.length - collapseLimit} more`;
      btn.addEventListener("click", () => {
        plainFigures.forEach((f) => f.classList.remove("hidden-mobile"));
        btn.remove();
      });
      gallery.appendChild(btn);
    });
  }

  enhancePreRenderedGalleries();

  /* ==================== 1b. Lightbox ==================== */
  const lightbox = initLightbox();

  document.addEventListener("click", (e) => {
    const img = e.target;
    if (img && img.tagName === "IMG" && img.closest(".image-card")) {
      lightbox.open(img.src, img.dataset.caption || img.alt || "");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      document.activeElement?.tagName === "IMG" &&
      document.activeElement.closest(".image-card")
    ) {
      e.preventDefault();
      const img = document.activeElement;
      lightbox.open(img.src, img.dataset.caption || img.alt || "");
    }
  });

  function initLightbox() {
    let backdrop = document.querySelector(".lightbox-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "lightbox-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.innerHTML = `
        <button class="lightbox-close" aria-label="Close">×</button>
        <img class="lightbox-image" alt="" />
        <div class="lightbox-caption"></div>
      `;
      document.body.appendChild(backdrop);
    }

    const imgEl = backdrop.querySelector(".lightbox-image");
    const capEl = backdrop.querySelector(".lightbox-caption");
    const closeBtn = backdrop.querySelector(".lightbox-close");

    const open = (src, caption = "") => {
      if (!src) return;
      imgEl.src = src;
      imgEl.alt = caption;
      capEl.textContent = caption;
      backdrop.classList.add("open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    };

    const close = () => {
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
      imgEl.src = "";
      imgEl.alt = "";
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    closeBtn.addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return { open, close };
  }

  /* ==================== 1c. Optional: refresh images only when files change ==================== */
  // If you create this file, JS will append ?v=... ONLY for images listed there.
  // If the file doesn't exist, nothing happens.
  applyImageManifest("images/image-manifest.json");

  async function applyImageManifest(manifestUrl) {
    try {
      const resp = await fetch(manifestUrl, { cache: "no-store" });
      if (!resp.ok) return;

      /** manifest format: { "images/foo.png": "2025-12-30T10:03:22Z", "images/bar.png": "a1b2c3" } */
      const manifest = await resp.json();
      if (!manifest || typeof manifest !== "object") return;

      const imgs = Array.from(
        document.querySelectorAll(
          "figure.image-card img, #compounding-insight img"
        )
      );
      imgs.forEach((img) => {
        const rawSrc = img.getAttribute("src");
        if (!rawSrc) return;

        const abs = new URL(rawSrc, window.location.href);
        const key = abs.pathname.replace(/^\//, ""); // "images/....png"

        const version = manifest[key];
        if (!version) return;

        // keep existing query params; only set/overwrite v
        abs.searchParams.set("v", String(version));
        img.src = abs.toString();
      });
    } catch {
      // silent: manifest is optional
    }
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .trim()
      .toUpperCase();
  }

  function sanitizeSymbolForPath(symbol) {
    return normalizeSymbol(symbol)
      .replace(/[:/\\\s]+/g, "-")
      .replace(/[^A-Z0-9._-]/g, "");
  }

  async function loadPrerenderedStockPages() {
    const safeSymbols = new Set();
    try {
      const resp = await fetch("sitemap.xml", { cache: "no-store" });
      if (!resp.ok) return safeSymbols;
      const xml = await resp.text();
      const matches = xml.matchAll(/stocks\/([A-Za-z0-9._-]+)\.html/g);
      for (const match of matches) {
        if (match?.[1]) safeSymbols.add(match[1].toUpperCase());
      }
    } catch {
      // Keep graceful fallback to stock-details route.
    }
    return safeSymbols;
  }

  function updateRankingSnapshot(rows, stockDetailsHref) {
    const topSymbolEl = document.getElementById("snapshot-top-symbol");
    const topLinkEl = document.getElementById("snapshot-top-link");
    const topRow = rows?.[0];
    const topSymbol = normalizeSymbol(topRow?.symbol);

    if (topSymbolEl) {
      topSymbolEl.textContent = topSymbol || "--";
    }

    if (topLinkEl) {
      if (topSymbol) {
        topLinkEl.href = stockDetailsHref(topSymbol);
        topLinkEl.setAttribute("aria-disabled", "false");
      } else {
        topLinkEl.href = "#rankings";
        topLinkEl.setAttribute("aria-disabled", "true");
      }
    }
  }

  function updateBestReturnRiskSnapshot(rows) {
    const valueEl = document.getElementById("snapshot-best-ror");
    const metaEl = document.getElementById("snapshot-best-ror-meta");
    if (!valueEl || !metaEl || !Array.isArray(rows) || !rows.length) return;

    let best = null;
    rows.forEach((row) => {
      const thresholdRaw = row["Rank Threshold"] ?? row["Rank_Threshold"];
      const threshold = Number.parseFloat(thresholdRaw);

      Object.entries(row).forEach(([key, raw]) => {
        if (!key.toLowerCase().includes("return/risk")) return;
        const numeric = Number.parseFloat(raw);
        if (!Number.isFinite(numeric)) return;

        if (!best || numeric > best.value) {
          best = {
            value: numeric,
            threshold: Number.isFinite(threshold) ? threshold : null,
            method: key.replace(/return\/risk/gi, "").trim(),
          };
        }
      });
    });

    if (!best) return;

    valueEl.textContent = `${best.value.toFixed(2)}x`;
    const thresholdText =
      best.threshold === null ? "n/a" : `Top ${best.threshold}`;
    metaEl.textContent = `${best.method || "Method"} at ${thresholdText}`;
  }

  function initDecisionPath() {
    const links = Array.from(document.querySelectorAll(".decision-step"));
    if (!links.length) return;

    const sections = links
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return null;
        const target = document.querySelector(href);
        return target && target.id ? target : null;
      })
      .filter(Boolean);

    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("active", isActive);
      });
    };

    setActive(sections[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: "-35% 0px -55% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function initScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const revealTargets = Array.from(
      document.querySelectorAll(".decision-path, .content-section")
    );
    if (!revealTargets.length) return;

    revealTargets.forEach((el) => el.classList.add("reveal-on-scroll"));

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.08,
      }
    );

    revealTargets.forEach((target) => observer.observe(target));
  }

  function initShortlist() {
    const STORAGE_KEY = "bayesdemon-shortlist-v1";
    const listEl = document.getElementById("shortlist-list");
    const emptyEl = document.getElementById("shortlist-empty");
    const clearBtn = document.getElementById("shortlist-clear");
    const copyBtn = document.getElementById("shortlist-copy");
    const sizeEl = document.getElementById("shortlist-size");

    if (!listEl) {
      return {
        addSymbol: () => false,
        setHrefResolver: () => {},
        subscribe: () => () => {},
      };
    }

    let symbols = loadFromStorage();
    let hrefResolver = (symbol) =>
      `stock-details.html?symbol=${encodeURIComponent(normalizeSymbol(symbol))}`;
    const listeners = new Set();

    function loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((symbol) => normalizeSymbol(symbol))
          .filter(Boolean)
          .slice(0, 50);
      } catch {
        return [];
      }
    }

    function saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
      } catch {
        // Storage can fail in private mode; keep in-memory behavior.
      }
    }

    function notify() {
      const snapshot = [...symbols];
      listeners.forEach((listener) => listener(snapshot));
    }

    function setButtonState(hasItems) {
      if (copyBtn) copyBtn.disabled = !hasItems;
    }

    function render() {
      listEl.innerHTML = "";
      const hasItems = symbols.length > 0;
      if (sizeEl) sizeEl.textContent = String(symbols.length);
      if (emptyEl) emptyEl.style.display = hasItems ? "none" : "block";
      setButtonState(hasItems);

      symbols.forEach((symbol) => {
        const item = document.createElement("li");
        item.className = "shortlist-item";

        const symbolText = document.createElement("span");
        symbolText.className = "shortlist-symbol";
        symbolText.textContent = symbol;

        const actions = document.createElement("div");
        actions.className = "shortlist-item-actions";

        const openLink = document.createElement("a");
        openLink.className = "shortlist-open";
        openLink.href = hrefResolver(symbol);
        openLink.target = "_blank";
        openLink.rel = "noopener";
        openLink.textContent = "Open";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "shortlist-remove";
        removeBtn.setAttribute("aria-label", `Remove ${symbol}`);
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
          symbols = symbols.filter((itemSymbol) => itemSymbol !== symbol);
          saveToStorage();
          render();
          notify();
        });

        actions.appendChild(openLink);
        actions.appendChild(removeBtn);
        item.appendChild(symbolText);
        item.appendChild(actions);
        listEl.appendChild(item);
      });
    }

    async function copySymbolsToClipboard() {
      if (!symbols.length) return;
      const payload = symbols.join(", ");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const helper = document.createElement("textarea");
        helper.value = payload;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
    }

    clearBtn?.addEventListener("click", () => {
      symbols = [];
      saveToStorage();
      render();
      notify();
    });

    copyBtn?.addEventListener("click", async () => {
      try {
        await copySymbolsToClipboard();
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        window.setTimeout(() => {
          copyBtn.textContent = original;
        }, 1200);
      } catch {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copy failed";
        window.setTimeout(() => {
          copyBtn.textContent = original;
        }, 1200);
      }
    });

    render();

    return {
      addSymbol: (symbol) => {
        const normalized = normalizeSymbol(symbol);
        if (!normalized || symbols.includes(normalized)) return false;
        symbols.push(normalized);
        saveToStorage();
        render();
        notify();
        return true;
      },
      setHrefResolver: (resolver) => {
        if (typeof resolver !== "function") return;
        hrefResolver = resolver;
        render();
      },
      subscribe: (listener) => {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        listener([...symbols]);
        return () => listeners.delete(listener);
      },
    };
  }

  /* ==================== 2. build the ranking table ==================== */
  fetch("rank_companies/rank_companies.json")
    .then(async (resp) => {
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const rows = await resp.json();
      return {
        rows,
        lastModified: resp.headers.get("Last-Modified"),
      };
    })
    .then(async ({ rows, lastModified }) => {
      updateRankingsTrustStrip(rows.length, lastModified);
      if (!rows.length) return;

      const prerenderedSafeSymbols = await loadPrerenderedStockPages();
      const stockDetailsHref = (symbol) => {
        const normalized = normalizeSymbol(symbol);
        const safe = sanitizeSymbolForPath(normalized);
        if (prerenderedSafeSymbols.has(safe)) return `stocks/${safe}.html`;
        return `stock-details.html?symbol=${encodeURIComponent(normalized)}`;
      };

      shortlistController.setHrefResolver(stockDetailsHref);
      updateRankingSnapshot(rows, stockDetailsHref);

      const table = document.getElementById("rank-table");
      const theadTr = table.querySelector("thead tr");
      const tbody = table.querySelector("tbody");

      const cols = Object.keys(rows[0]);
      cols.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.replace(/_/g, " ");
        theadTr.appendChild(th);
      });

      const actionTh = document.createElement("th");
      actionTh.textContent = "Action";
      actionTh.dataset.sortDisabled = "true";
      actionTh.className = "action-th";
      theadTr.appendChild(actionTh);

      const syncActionButtons = (symbols) => {
        const selected = new Set(symbols.map((symbol) => normalizeSymbol(symbol)));
        tbody.querySelectorAll(".table-action-btn").forEach((btn) => {
          const symbol = normalizeSymbol(btn.dataset.symbol);
          const isAdded = selected.has(symbol);
          btn.classList.toggle("is-added", isAdded);
          btn.textContent = isAdded ? "Added" : "Add";
          btn.setAttribute("aria-pressed", isAdded ? "true" : "false");
        });
      };

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        const symbolValue = normalizeSymbol(row.symbol);

        cols.forEach((col) => {
          const td = document.createElement("td");
          if (col.toLowerCase() === "symbol") {
            const link = document.createElement("a");
            link.href = stockDetailsHref(row[col]);
            link.textContent = row[col];
            td.appendChild(link);
            td.dataset.symbol = row[col];
          } else {
            td.textContent = row[col];
          }
          tr.appendChild(td);
        });

        const actionTd = document.createElement("td");
        actionTd.className = "action-cell";
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "table-action-btn";
        addBtn.dataset.symbol = symbolValue;
        addBtn.textContent = "Add";
        addBtn.setAttribute("aria-pressed", "false");
        addBtn.addEventListener("click", () => {
          shortlistController.addSymbol(symbolValue);
        });
        actionTd.appendChild(addBtn);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
      });

      shortlistController.subscribe((symbols) => {
        syncActionButtons(symbols);
      });

      attachSymbolFilter("rank-filter", "rank-table");
      rankingPresetController = initRankingQuickActions(
        "rank-table",
        "rank-filter",
        "historical-analysis-table",
        "analysis-filter"
      );
      makeSortable("rank-table");
    })
    .catch((err) => console.error("Unable to load rank table:", err));

  /* ==================== 3. build the historical analysis table ==================== */
  fetch("rank_companies/mean_analysis.json")
    .then((resp) => resp.json())
    .then((rows) => {
      if (!rows.length) return;

      const table = document.getElementById("historical-analysis-table");
      const theadTr = table.querySelector("thead tr");
      const tbody = table.querySelector("tbody");

      const cols = Object.keys(rows[0]);

      const rankThresholdIndex = cols.findIndex(
        (col) =>
          col.toLowerCase().includes("rank") &&
          col.toLowerCase().includes("threshold")
      );

      cols.forEach((col) => {
        const th = document.createElement("th");

        let headerText = col.replace(/_/g, " ");
        headerText = headerText
          .replace(/mean/gi, "Mean<br>")
          .replace(/std/gi, "Std<br>")
          .replace(/return/gi, "Return")
          .replace(/ratio/gi, "Ratio")
          .replace(/analysis/gi, "Analysis");

        th.innerHTML = headerText;
        th.style.whiteSpace = "normal";
        th.style.textAlign = "center";
        theadTr.appendChild(th);
      });

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        cols.forEach((col, colIndex) => {
          const td = document.createElement("td");

          // Add data attribute for rank threshold column
          if (colIndex === rankThresholdIndex) {
            td.dataset.rankThreshold = row[col];
          }

          if (
            col.toLowerCase().includes("mean") ||
            col.toLowerCase().includes("std")
          ) {
            const value = parseFloat(row[col]);
            td.textContent = !isNaN(value)
              ? (value * 100).toFixed(2) + "%"
              : row[col];
            td.classList.add("is-stat");
          } else if (col.toLowerCase().includes("return/risk")) {
            const value = parseFloat(row[col]);
            td.textContent = !isNaN(value) ? value.toFixed(2) : row[col];
          } else {
            td.textContent = row[col];
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      attachRankThresholdFilter("analysis-filter", "historical-analysis-table");
      makeSortable("historical-analysis-table");
      updateBestReturnRiskSnapshot(rows);
      rankingPresetController?.applyActivePreset?.();
    })
    .catch((err) =>
      console.error("Unable to load historical analysis table:", err)
    );

  /* ==================== 4. Optional: table filter & sorting helpers ==================== */
  function attachSymbolFilter(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;

    input.placeholder = "Filter by symbol or any text...";
    input.style.width = "100%";
    input.style.maxWidth = "400px";

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const rows = table.querySelectorAll("tbody tr");
      let visibleCount = 0;

      rows.forEach((tr) => {
        const text = tr.innerText.toLowerCase();
        const symbolCell = tr.querySelector("[data-symbol]");
        const symbol = symbolCell
          ? symbolCell.dataset.symbol.toLowerCase()
          : "";

        const matches = symbol.includes(q) || text.includes(q);

        if (matches) {
          tr.style.display = "";
          visibleCount++;

          if (symbolCell && q && symbol.includes(q))
            symbolCell.classList.add("highlight-match");
          else if (symbolCell) symbolCell.classList.remove("highlight-match");
        } else {
          tr.style.display = "none";
          if (symbolCell) symbolCell.classList.remove("highlight-match");
        }
      });

      updateFilterCount(table, visibleCount, rows.length);
    });

    addClearButton(input);
  }

  function attachRankThresholdFilter(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;

    input.placeholder = "Filter by rank threshold...";
    input.style.width = "100%";
    input.style.maxWidth = "400px";

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const rows = table.querySelectorAll("tbody tr");
      let visibleCount = 0;

      rows.forEach((tr) => {
        const rankThresholdCell = tr.querySelector("[data-rank-threshold]");
        const rankThreshold = rankThresholdCell
          ? rankThresholdCell.dataset.rankThreshold.toLowerCase()
          : "";
        const matches = rankThreshold.includes(q);

        if (matches || !q) {
          tr.style.display = "";
          visibleCount++;

          if (rankThresholdCell && q && rankThreshold.includes(q))
            rankThresholdCell.classList.add("highlight-match");
          else if (rankThresholdCell)
            rankThresholdCell.classList.remove("highlight-match");
        } else {
          tr.style.display = "none";
          if (rankThresholdCell)
            rankThresholdCell.classList.remove("highlight-match");
        }
      });

      updateFilterCount(table, visibleCount, rows.length);
    });

    addClearButton(input);
  }

  function updateRankingsTrustStrip(totalRows, lastModifiedHeader) {
    const updatedAtEl = document.getElementById("rankings-updated-at");
    const universeEl = document.getElementById("rankings-universe-size");

    if (universeEl) {
      universeEl.textContent = `${totalRows} companies`;
    }
    if (updatedAtEl) {
      updatedAtEl.textContent = formatLastModifiedHeader(lastModifiedHeader);
    }
  }

  function formatLastModifiedHeader(lastModifiedHeader) {
    if (!lastModifiedHeader) return "Not available";
    const parsed = new Date(lastModifiedHeader);
    if (Number.isNaN(parsed.getTime())) return "Not available";
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function initRankingQuickActions(
    rankTableId,
    rankInputId,
    historicalTableId,
    historicalInputId
  ) {
    const rankTable = document.getElementById(rankTableId);
    const rankInput = document.getElementById(rankInputId);
    const historicalTable = document.getElementById(historicalTableId);
    const historicalInput = document.getElementById(historicalInputId);
    const container = document.querySelector(".ranking-quick-actions");
    if (!rankTable || !container) return null;

    const buttons = Array.from(container.querySelectorAll(".preset-btn"));
    if (!buttons.length) return null;

    const getRows = (table) =>
      table ? Array.from(table.querySelectorAll("tbody tr")) : [];

    const clearActivePreset = () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
    };

    const setActivePreset = (preset) => {
      buttons.forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.preset === preset)
      );
    };

    const showAllRows = (table) => {
      if (!table) return;
      const rows = getRows(table);
      rows.forEach((tr) => {
        tr.style.display = "";
        tr
          .querySelectorAll(".highlight-match")
          .forEach((el) => el.classList.remove("highlight-match"));
      });
      updateFilterCount(table, rows.length, rows.length);
    };

    const applyTopRows = (limit) => {
      const rows = getRows(rankTable);
      rows.forEach((tr, idx) => {
        tr.style.display = idx < limit ? "" : "none";
        const symbolCell = tr.querySelector("[data-symbol]");
        if (symbolCell) symbolCell.classList.remove("highlight-match");
      });
      updateFilterCount(rankTable, Math.min(limit, rows.length), rows.length);
    };

    const applyRankThresholdRows = (limit) => {
      if (!historicalTable) return;
      const rows = getRows(historicalTable);
      let visibleCount = 0;

      rows.forEach((tr) => {
        const thresholdCell = tr.querySelector("[data-rank-threshold]");
        const threshold = thresholdCell
          ? Number.parseFloat(thresholdCell.dataset.rankThreshold)
          : Number.NaN;
        const show = Number.isFinite(threshold) && threshold <= limit;

        tr.style.display = show ? "" : "none";
        if (thresholdCell) thresholdCell.classList.remove("highlight-match");
        if (show) visibleCount++;
      });

      updateFilterCount(historicalTable, visibleCount, rows.length);
    };

    const clearInputsAndHighlights = () => {
      if (rankInput?.value) {
        rankInput.value = "";
        rankInput.dispatchEvent(new Event("input"));
      }
      if (historicalInput?.value) {
        historicalInput.value = "";
        historicalInput.dispatchEvent(new Event("input"));
      }
    };

    const applyPreset = (preset, setActive = true) => {
      if (!preset) return;

      clearInputsAndHighlights();

      if (preset === "reset") {
        showAllRows(rankTable);
        showAllRows(historicalTable);
        if (setActive) setActivePreset("reset");
        return;
      }

      if (preset === "top10") {
        applyTopRows(10);
        applyRankThresholdRows(10);
      }
      if (preset === "top25") {
        applyTopRows(25);
        applyRankThresholdRows(25);
      }
      if (preset === "top50") {
        applyTopRows(50);
        applyRankThresholdRows(50);
      }

      if (setActive) setActivePreset(preset);
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPreset(btn.dataset.preset, true);
      });
    });

    rankInput?.addEventListener("input", clearActivePreset);
    historicalInput?.addEventListener("input", clearActivePreset);

    return {
      applyActivePreset: () => {
        const activeBtn = buttons.find((btn) =>
          btn.classList.contains("active")
        );
        if (!activeBtn) return;
        applyPreset(activeBtn.dataset.preset, false);
      },
    };
  }

  function updateFilterCount(table, visible, total) {
    let counter = table.parentElement.querySelector(".filter-count");
    if (!counter) {
      counter = document.createElement("div");
      counter.className = "filter-count";
      table.parentElement.insertBefore(counter, table);
    }

    if (visible < total) {
      counter.textContent = `Showing ${visible} of ${total} rows`;
      counter.style.display = "block";
    } else {
      counter.style.display = "none";
    }
  }

  function addClearButton(input) {
    const wrapper = document.createElement("div");
    wrapper.className = "filter-wrapper";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const clearBtn = document.createElement("button");
    clearBtn.className = "clear-filter";
    clearBtn.innerHTML = "×";
    clearBtn.setAttribute("aria-label", "Clear filter");
    clearBtn.style.display = "none";

    wrapper.appendChild(clearBtn);

    input.addEventListener("input", () => {
      clearBtn.style.display = input.value ? "block" : "none";
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  }

  function makeSortable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const ths = table.querySelectorAll("thead th");
    ths.forEach((th, idx) => {
      if (th.dataset.sortDisabled === "true") return;
      th.classList.add("sortable");
      th.setAttribute("role", "columnheader");
      th.setAttribute("aria-sort", "none");
      th.addEventListener("click", () => {
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        const asc = th.dataset.sort !== "asc";
        rows.sort((a, b) => {
          const A = a.children[idx]?.innerText || "";
          const B = b.children[idx]?.innerText || "";
          const nA = parseFloat(A.replace(/[%,$]/g, ""));
          const nB = parseFloat(B.replace(/[%,$]/g, ""));
          if (!isNaN(nA) && !isNaN(nB)) return asc ? nA - nB : nB - nA;
          return asc ? A.localeCompare(B) : B.localeCompare(A);
        });
        ths.forEach((h) => {
          delete h.dataset.sort;
          h.setAttribute("aria-sort", "none");
        });
        th.dataset.sort = asc ? "asc" : "desc";
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        rows.forEach((r) => tbody.appendChild(r));
      });
    });
  }

  /* ==================== 5. Scroll-to-top behavior ==================== */
  const toTopBtn = document.querySelector(".scroll-to-top");
  if (toTopBtn) {
    const toggleBtn = () => {
      if (window.scrollY > 600) toTopBtn.classList.add("visible");
      else toTopBtn.classList.remove("visible");
    };
    window.addEventListener("scroll", toggleBtn, { passive: true });
    toggleBtn();
    toTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }
});
