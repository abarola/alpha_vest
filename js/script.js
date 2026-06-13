/**
 * BayesDemon front-end script
 * - Enhances pre-rendered image galleries (captions + explainers)
 * - Lightbox
 * - Rank and portfolio tables (JSON-driven)
 * - Optional table filters and sorting
 * - Scroll-to-top button
 * - Optional image refresh via manifest (cache busting only when files change)
 */
document.addEventListener("DOMContentLoaded", () => {
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
    const capText = cap.textContent ? cap.textContent.trim() : "";
    if (!capText) {
      const altText = img.alt ? img.alt.trim() : "";
      cap.textContent = altText || filenameToCaption(img.getAttribute("src"));
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
      const altText = img.alt ? img.alt.trim() : "";
      if (!altText)
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
    const activeEl = document.activeElement;
    if (
      (e.key === "Enter" || e.key === " ") &&
      activeEl &&
      activeEl.tagName === "IMG" &&
      activeEl.closest(".image-card")
    ) {
      e.preventDefault();
      const img = activeEl;
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
        <div class="lightbox-stage">
          <img class="lightbox-image" alt="" />
        </div>
        <div class="lightbox-controls" aria-label="Image zoom controls">
          <button type="button" class="lightbox-zoom-out" aria-label="Zoom out">−</button>
          <span class="lightbox-zoom-level" aria-live="polite">100%</span>
          <button type="button" class="lightbox-zoom-in" aria-label="Zoom in">+</button>
          <button type="button" class="lightbox-zoom-reset">Reset</button>
        </div>
        <div class="lightbox-caption"></div>
      `;
      document.body.appendChild(backdrop);
    }

    let imgEl = backdrop.querySelector(".lightbox-image");
    let stage = backdrop.querySelector(".lightbox-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "lightbox-stage";
      imgEl.parentNode.insertBefore(stage, imgEl);
      stage.appendChild(imgEl);
    }

    let controls = backdrop.querySelector(".lightbox-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "lightbox-controls";
      controls.setAttribute("aria-label", "Image zoom controls");
      controls.innerHTML = `
        <button type="button" class="lightbox-zoom-out" aria-label="Zoom out">−</button>
        <span class="lightbox-zoom-level" aria-live="polite">100%</span>
        <button type="button" class="lightbox-zoom-in" aria-label="Zoom in">+</button>
        <button type="button" class="lightbox-zoom-reset">Reset</button>
      `;
      backdrop.appendChild(controls);
    }

    const capEl = backdrop.querySelector(".lightbox-caption");
    const closeBtn = backdrop.querySelector(".lightbox-close");
    const zoomOutBtn = backdrop.querySelector(".lightbox-zoom-out");
    const zoomInBtn = backdrop.querySelector(".lightbox-zoom-in");
    const resetBtn = backdrop.querySelector(".lightbox-zoom-reset");
    const zoomLevel = backdrop.querySelector(".lightbox-zoom-level");

    const minScale = 1;
    const maxScale = 5;
    const scaleStep = 0.5;
    let scale = minScale;
    let translateX = 0;
    let translateY = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const renderTransform = () => {
      imgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      zoomLevel.textContent = `${Math.round(scale * 100)}%`;
      zoomOutBtn.disabled = scale <= minScale;
      zoomInBtn.disabled = scale >= maxScale;
      stage.classList.toggle("is-zoomed", scale > minScale);
    };

    const resetZoom = () => {
      scale = minScale;
      translateX = 0;
      translateY = 0;
      renderTransform();
    };

    const setScale = (nextScale) => {
      scale = Math.min(maxScale, Math.max(minScale, nextScale));
      if (scale === minScale) {
        translateX = 0;
        translateY = 0;
      }
      renderTransform();
    };

    const open = (src, caption = "") => {
      if (!src) return;
      resetZoom();
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
      resetZoom();
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    closeBtn.addEventListener("click", close);
    zoomOutBtn.addEventListener("click", () => setScale(scale - scaleStep));
    zoomInBtn.addEventListener("click", () => setScale(scale + scaleStep));
    resetBtn.addEventListener("click", resetZoom);

    stage.addEventListener(
      "wheel",
      (e) => {
        if (!backdrop.classList.contains("open")) return;
        e.preventDefault();
        setScale(scale + (e.deltaY < 0 ? scaleStep : -scaleStep));
      },
      { passive: false }
    );

    stage.addEventListener("pointerdown", (e) => {
      if (scale <= minScale) return;
      dragging = true;
      dragStartX = e.clientX - translateX;
      dragStartY = e.clientY - translateY;
      stage.classList.add("is-dragging");
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      translateX = e.clientX - dragStartX;
      translateY = e.clientY - dragStartY;
      renderTransform();
    });

    const stopDragging = (e) => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (stage.hasPointerCapture(e.pointerId)) {
        stage.releasePointerCapture(e.pointerId);
      }
    };
    stage.addEventListener("pointerup", stopDragging);
    stage.addEventListener("pointercancel", stopDragging);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (!backdrop.classList.contains("open")) return;
      if (e.key === "+" || e.key === "=") setScale(scale + scaleStep);
      if (e.key === "-" || e.key === "_") setScale(scale - scaleStep);
      if (e.key === "0") resetZoom();
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
    } catch (_err) {
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

  function showTableLoadError(tableId, message) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const container = table.closest(".table-container");
    if (!container) return;

    let notice = container.querySelector(".table-error");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "table-error";
      container.insertBefore(notice, table);
    }
    notice.textContent = message;
  }

  async function loadPrerenderedStockPages() {
    const safeSymbols = new Set();
    try {
      const resp = await fetch("sitemap.xml", { cache: "no-store" });
      if (!resp.ok) return safeSymbols;
      const xml = await resp.text();
      const matches = xml.matchAll(/stocks\/([A-Za-z0-9._-]+)\.html/g);
      for (const match of matches) {
        if (match && match[1]) safeSymbols.add(match[1].toUpperCase());
      }
    } catch (_err) {
      // Keep graceful fallback to stock-details route.
    }
    return safeSymbols;
  }

  function formatPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : "--";
  }

  function extractPolicyMetrics(payload) {
    if (!payload || typeof payload !== "object") return {};
    const source =
      payload.metrics && typeof payload.metrics === "object"
        ? payload.metrics
        : payload;
    return {
      cagr: source.cagr,
      annualized_volatility: source.annualized_volatility,
      max_drawdown: source.max_drawdown,
    };
  }

  function hasPolicyMetrics(metrics) {
    return (
      metrics &&
      ["cagr", "annualized_volatility", "max_drawdown"].some((key) =>
        Number.isFinite(Number(metrics[key]))
      )
    );
  }

  async function loadPolicyMetricsFallback() {
    try {
      const resp = await fetch("rank_companies/current_policy_metrics.json", {
        cache: "no-store",
      });
      if (!resp.ok) return {};
      return extractPolicyMetrics(await resp.json());
    } catch (_err) {
      return {};
    }
  }

  function updatePolicyMetricCards(metrics) {
    const fields = [
      ["current-policy-cagr", "cagr"],
      ["current-policy-volatility", "annualized_volatility"],
      ["current-policy-max-drawdown", "max_drawdown"],
    ];
    fields.forEach(([elementId, metricKey]) => {
      const element = document.getElementById(elementId);
      if (element) element.textContent = formatPercent(metrics?.[metricKey]);
    });
  }

  function formatCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value) {
    if (!value) return "--";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function initCurrentHoldings() {
    const status = document.getElementById("current-portfolio-status");
    const table = document.getElementById("current-holdings-table");
    if (!table) return;

    const tbody = table.querySelector("tbody");
    try {
      const resp = await fetch("rank_companies/current_holdings.json", {
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const holdings = Array.isArray(data.holdings) ? data.holdings : [];
      const prerenderedSafeSymbols = await loadPrerenderedStockPages();

      document.getElementById("current-rebalance-date").textContent = formatDate(
        data.current_rebalance_date
      );
      document.getElementById("current-data-date").textContent = `Data as of ${formatDate(
        data.data_as_of_date
      )}`;
      document.getElementById("current-stock-exposure").textContent = formatPercent(
        data.stock_exposure
      );
      document.getElementById("current-cash-weight").textContent = `Cash ${formatPercent(
        data.cash_weight
      )}`;
      document.getElementById("current-holding-count").textContent =
        data.holding_count ?? holdings.length;
      document.getElementById("current-target-weight-sum").textContent =
        `Target sum ${formatPercent(data.target_weight_sum)}`;
      document.getElementById("current-policy-name").textContent =
        data.policy_name || "--";
      document.getElementById("current-policy-signature").textContent =
        data.policy_signature || "--";
      let policyMetrics = extractPolicyMetrics(data.policy_metrics);
      if (!hasPolicyMetrics(policyMetrics)) {
        policyMetrics = await loadPolicyMetricsFallback();
      }
      updatePolicyMetricCards(policyMetrics);

      tbody.innerHTML = "";
      holdings.forEach((row) => {
        const tr = document.createElement("tr");
        const symbol = normalizeSymbol(row.symbol || `${row.symbol_yf}:US`);
        const safe = sanitizeSymbolForPath(symbol);
        const href = prerenderedSafeSymbols.has(safe)
          ? `stocks/${safe}.html`
          : `stock-details.html?symbol=${encodeURIComponent(symbol)}`;

        const weightPercent = Math.max(
          0,
          Math.min(100, Number(row.target_weight || 0) * 100)
        );
        const cells = [
          row.rank ?? "--",
          "symbol",
          "target_weight",
          row.rank_value ?? "--",
          formatDate(row.current_price_date),
          formatCurrency(row.current_price),
        ];
        cells.forEach((value) => {
          const td = document.createElement("td");
          if (value === "symbol") {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = row.symbol_yf || symbol;
            td.appendChild(link);
          } else if (value === "target_weight") {
            const wrapper = document.createElement("div");
            wrapper.className = "target-weight-cell";
            const label = document.createElement("span");
            label.textContent = formatPercent(row.target_weight);
            const bar = document.createElement("span");
            bar.className = "target-weight-bar";
            const fill = document.createElement("span");
            fill.style.width = `${weightPercent}%`;
            bar.appendChild(fill);
            wrapper.append(label, bar);
            td.appendChild(wrapper);
          } else {
            td.textContent = value;
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      if (status) {
        status.textContent = `Updated ${formatDate(data.generated_at?.slice(0, 10))}`;
        status.classList.add("is-loaded");
      }
      makeSortable("current-holdings-table");
    } catch (err) {
      console.error("Unable to load current holdings:", err);
      if (status) {
        status.textContent = "Current holdings are not available yet.";
        status.classList.add("is-error");
      }
      showTableLoadError(
        "current-holdings-table",
        "Unable to load current portfolio holdings."
      );
    }
  }

  function updateRankingSnapshot(rows, stockDetailsHref) {
    const topSymbolEl = document.getElementById("snapshot-top-symbol");
    const topLinkEl = document.getElementById("snapshot-top-link");
    const topRow = Array.isArray(rows) ? rows[0] : null;
    const topSymbol = normalizeSymbol(topRow && topRow.symbol);

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

    if (typeof window.IntersectionObserver !== "function") {
      return;
    }

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

    if (typeof window.IntersectionObserver !== "function") {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

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

  /* ==================== 2. build the ranking table ==================== */
  if (typeof window.fetch !== "function") {
    showTableLoadError(
      "current-holdings-table",
      "Your browser is too old to load current holdings data. Please update it."
    );
    showTableLoadError(
      "rank-table",
      "Your browser is too old to load ranking data. Please update it."
    );
  } else {
    initCurrentHoldings();

  if (document.getElementById("rank-table")) {
    fetch("rank_companies/rank_companies.json", { cache: "no-store" })
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

      updateRankingSnapshot(rows, stockDetailsHref);

      const table = document.getElementById("rank-table");
      if (!table) return;
      const theadTr = table.querySelector("thead tr");
      const tbody = table.querySelector("tbody");

      const cols = Object.keys(rows[0]);
      cols.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.replace(/_/g, " ");
        theadTr.appendChild(th);
      });

      rows.forEach((row) => {
        const tr = document.createElement("tr");

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

        tbody.appendChild(tr);
      });

      attachSymbolFilter("rank-filter", "rank-table");
      initRankingQuickActions("rank-table", "rank-filter");
      makeSortable("rank-table");
    })
    .catch((err) => {
      console.error("Unable to load rank table:", err);
      showTableLoadError(
        "rank-table",
        "Unable to load ranking data on this device/network."
      );
    });
  }
  }

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

  function initRankingQuickActions(rankTableId, rankInputId) {
    const rankTable = document.getElementById(rankTableId);
    const rankInput = document.getElementById(rankInputId);
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

    const clearInputsAndHighlights = () => {
      if (rankInput && rankInput.value) {
        rankInput.value = "";
        rankInput.dispatchEvent(new Event("input"));
      }
    };

    const applyPreset = (preset, setActive = true) => {
      if (!preset) return;

      clearInputsAndHighlights();

      if (preset === "reset") {
        showAllRows(rankTable);
        if (setActive) setActivePreset("reset");
        return;
      }

      if (preset === "top10") {
        applyTopRows(10);
      }
      if (preset === "top25") {
        applyTopRows(25);
      }
      if (preset === "top50") {
        applyTopRows(50);
      }

      if (setActive) setActivePreset(preset);
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPreset(btn.dataset.preset, true);
      });
    });

    if (rankInput) rankInput.addEventListener("input", clearActivePreset);

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
          const A = a.children[idx] ? a.children[idx].innerText : "";
          const B = b.children[idx] ? b.children[idx].innerText : "";
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
