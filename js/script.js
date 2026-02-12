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

  /* ==================== 2. build the ranking table ==================== */
  fetch("rank_companies/rank_companies.json")
    .then((resp) => resp.json())
    .then((rows) => {
      if (!rows.length) return;

      const PRERENDERED_SYMBOLS = new Set(["AAPL:US"]);

      function sanitizeSymbolForPath(symbol) {
        return String(symbol || "")
          .trim()
          .toUpperCase()
          .replace(/[:/\\\s]+/g, "-")
          .replace(/[^A-Z0-9._-]/g, "");
      }

      function stockDetailsHref(symbol) {
        const sym = String(symbol || "")
          .trim()
          .toUpperCase();
        if (PRERENDERED_SYMBOLS.has(sym)) {
          const safe = sanitizeSymbolForPath(sym);
          return `stocks/${safe}.html`;
        }
        return `stock-details.html?symbol=${encodeURIComponent(sym)}`;
      }

      const table = document.getElementById("rank-table");
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
      th.classList.add("sortable");
      th.addEventListener("click", () => {
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        const asc = th.dataset.sort !== "asc";
        rows.sort((a, b) => {
          const A = a.children[idx].innerText;
          const B = b.children[idx].innerText;
          const nA = parseFloat(A.replace(/[%,$]/g, ""));
          const nB = parseFloat(B.replace(/[%,$]/g, ""));
          if (!isNaN(nA) && !isNaN(nB)) return asc ? nA - nB : nB - nA;
          return asc ? A.localeCompare(B) : B.localeCompare(A);
        });
        ths.forEach((h) => delete h.dataset.sort);
        th.dataset.sort = asc ? "asc" : "desc";
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
