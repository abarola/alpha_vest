/**
 * BayesDemon front-end script
 * - Image galleries with captions + collapsible "How to read this" explainers
 * - Lightbox
 * - Rank & historical analysis tables (JSON-driven)
 * - Optional table filters and sorting (if inputs exist)
 * - Optional mobile nav toggle (if .menu-toggle + #primary-nav exist)
 * - Scroll-to-top button
 */
document.addEventListener("DOMContentLoaded", () => {
  /* ==================== 1. Image galleries ==================== */
  const IMAGES_DIR = "images/";
  const GALLERY_DIRS = {
    "gallery-portfolio": "images/portfolio_performance/",
    "gallery-indext-stat": "images/",
    "gallery-strategy-return": "images/",
  };

  // Substring keys → short explainers auto-attached under matching images
  const CHART_GUIDE = {
    time_under_water: {
      what: "Number of days and monetary amount the portfolio value sits below its previous peak.",
      how: "When the curves touch the x axis = new highs; below = underwater.",
      why: "Higher time or amount underwater may signal system off-balance and higher possibility of return to the mean.",
      caveats: "System can go further off balance before mean reversion.",
    },
    inverse_quantile_dd: {
      what: "Represent the quantile of the current drawdown in the historical distribution of drawdowns for each company (100 = no drawdown, 0 = max historical drawdown).",
      how: "Read lower bar as potential oversold condition.",
      why: "Sound companies in deep drawdowns may offer better risk/reward.",
      caveats: "Companies can go bankrupt without recovering.",
    },
    cumulative_return_BT_strategy_offset: {
      what: "Cumulative return across staggered start dates (offsets 1–8) by investing in companies with different rank threshold.",
      how: "Look for curves that remain above baseline across offsets.",
      why: "If ranking is effective higher rated companies shall beat the average and the index",
      caveats: "Trading costs/slippage depend on your backtest setup.",
    },
    composite_indicator_analysis: {
      what: "Composite score blending multiple metrics (return, time scale, DD). The higher the past return or the worst drawdown compare to the index the better the score.",
      how: "Higher composite → stronger multi-metric profile.",
      why: "Prevents single-metric tunnel vision.",
      caveats: "Choice of weights matters; test sensitivity.",
    },
    CSSPX_Mi_CAGR: {
      what: "CAGR snapshot for an S&P 500 UCITS tracker (baseline) in EUR.",
      how: "Compare CAGR levels and stability year-over-year.",
      why: "Baseline to judge strategy value-add.",
      caveats: "Past CAGR does not imply forward returns.",
    },
    return_required_for_all_time_high: {
      what: "Required gain to recover from drawdowns to the last all-time high assuming stress in recovery time",
      how: "Provides a conservative floor of expected return in a mean reverting market",
      why: "Good companies selling at a discount can provide a margin of safety",
      caveats: "Companies can go bankrupt without recovering",
    },
    potential_buying_signals: {
      what: "An adaptive CUSUM-based oversold detector that tracks cumulative downside pressure in daily prices and flags a buy when it breaches a data-driven threshold calibrated from historical 90-day forward returns.",
      how: "Validate signals vs. company fundamentals.",
      why: "Codifies discipline, reduces discretionary whipsaw and improves risk management.",
      caveats: "Past signals do not imply future performance.",
    },
  };

  const imageLists = {
    "gallery-portfolio": [
      "Alberto_portfolio_time_under_water_analysis.png",
      "return_required_for_all_time_high.png",
      "inverse_quantile_dd.png",
      "potential_buying_signals.png",
      "performance_oversold_strategy.png",
      "bubble_chart_Average_CAGR_invquant_dd.png",
      "bubble_chart_CAGR_for_Year_2020_invquant_dd.png",
      "bubble_chart_CAGR_for_Year_2023_invquant_dd.png",
      "distance_chart_Euclidean_Distances_from_VTI_Average_CAGR_vs_invquant_dd.png",
      "distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2020_vs_invquant_dd.png",
      "distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2023_vs_invquant_dd.png",
      "composite_indicator_analysis.png",
      // add more...
    ],
    "gallery-indext-stat": [
      "CSSPX_Mi_CAGR.png",
      // add more...
    ],
    "gallery-strategy-return": [
      "cumulative_return_BT_strategy_offset_1.png",
      "cumulative_return_BT_strategy_offset_2.png",
      "cumulative_return_BT_strategy_offset_3.png",
      "cumulative_return_BT_strategy_offset_4.png",
      "cumulative_return_BT_strategy_offset_5.png",
      "cumulative_return_BT_strategy_offset_6.png",
      "cumulative_return_BT_strategy_offset_7.png",
      "cumulative_return_BT_strategy_offset_8.png",
      // add more...
    ],
  };

  function filenameToCaption(name) {
    return name
      .replace(/\.\w+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  function findGuide(filename) {
    const base = filename.replace(/\.\w+$/, "");
    for (const key of Object.keys(CHART_GUIDE)) {
      if (base.includes(key)) return CHART_GUIDE[key];
    }
    return null;
  }

  function appendImages(galleryId, files) {
    const gallery = document.getElementById(galleryId);
    if (!gallery || !Array.isArray(files)) return;

    const baseDir = GALLERY_DIRS[galleryId] || IMAGES_DIR;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const collapseLimit = 4; // show first N (excluding explainer figures) on mobile

    files.forEach((name, idx) => {
      const fig = document.createElement("figure");
      fig.className = "image-card";
      fig.dataset.gallery = galleryId;

      const img = document.createElement("img");
      img.src = `${baseDir}${name}`;
      img.alt = filenameToCaption(name);
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = idx < 2 ? "high" : "low";
      img.dataset.caption = img.alt;
      img.tabIndex = 0;

      const cap = document.createElement("figcaption");
      cap.textContent = img.alt;

      fig.appendChild(img);
      fig.appendChild(cap);

      const guide = findGuide(name);
      if (guide) {
        const details = document.createElement("details");
        details.className = "chart-explainer";
        // Auto-open on mobile so users immediately see guidance
        if (isMobile) details.open = true;

        const summary = document.createElement("summary");
        summary.textContent = "How to read this";
        details.appendChild(summary);

        const wrap = document.createElement("div");
        wrap.className = "explainer-grid";
        wrap.innerHTML = `
          <div class="explainer-item"><h5>What this shows</h5><p>${guide.what}</p></div>
          <div class="explainer-item"><h5>How to read</h5><p>${guide.how}</p></div>
          <div class="explainer-item"><h5>Why it matters</h5><p>${guide.why}</p></div>
          <div class="explainer-item"><h5>Caveats</h5><p>${guide.caveats}</p></div>
        `;
        details.appendChild(wrap);
        fig.appendChild(details);
        fig.classList.add("has-explainer");
      }

      gallery.appendChild(fig);
    });

    // Mobile collapse logic (exclude figures that have an explainer)
    if (isMobile) {
      const figures = Array.from(gallery.querySelectorAll("figure.image-card"));
      const plainFigures = figures.filter(
        (f) => !f.classList.contains("has-explainer")
      );
      if (plainFigures.length > collapseLimit) {
        plainFigures
          .slice(collapseLimit)
          .forEach((f) => f.classList.add("hidden-mobile"));

        const btn = document.createElement("button");
        btn.className = "show-more-btn";
        const hiddenCount = plainFigures.length - collapseLimit;
        btn.textContent = `Show ${hiddenCount} more`;
        btn.addEventListener("click", () => {
          plainFigures.forEach((f) => f.classList.remove("hidden-mobile"));
          btn.remove();
        });
        gallery.appendChild(btn);
      }
    }
  }

  Object.entries(imageLists).forEach(([galleryId, files]) =>
    appendImages(galleryId, files)
  );

  /* ==================== 1b. Lightbox ==================== */
  const lightbox = initLightbox();

  // Delegate clicks for any dynamically added gallery image
  document.addEventListener("click", (e) => {
    const img = e.target;
    if (img && img.tagName === "IMG" && img.closest(".image-card")) {
      lightbox.open(img.src, img.dataset.caption || img.alt || "");
    }
  });
  // Keyboard open (Enter/Space) when focusing the image
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

  /* ==================== 2. build the ranking table ==================== */
  fetch("rank_companies/rank_companies.json")
    .then((resp) => resp.json())
    .then((rows) => {
      if (!rows.length) return;

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
            link.href = `stock-details.html?symbol=${encodeURIComponent(
              row[col]
            )}`;
            link.textContent = row[col];
            td.appendChild(link);
          } else {
            td.textContent = row[col];
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      // Optional: filter + sort
      attachTableFilter("rank-filter", "rank-table");
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
        cols.forEach((col) => {
          const td = document.createElement("td");
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

      // Optional: filter + sort
      attachTableFilter("analysis-filter", "historical-analysis-table");
      makeSortable("historical-analysis-table");
    })
    .catch((err) =>
      console.error("Unable to load historical analysis table:", err)
    );

  /* ==================== 4. Optional: table filter & sorting helpers ==================== */
  function attachTableFilter(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      table.querySelectorAll("tbody tr").forEach((tr) => {
        const text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(q) ? "" : "none";
      });
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
        const asc = th.dataset.sort !== "asc"; // toggle
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
