// filepath: /Users/albertobarola/CloudStation/Python/HTML_portfolio/script.js
/**
 * Fetches the directory listing for /images and appends one <img>
 * element for every *.png file it finds. This requires the server
 * to expose a simple directory index (e.g., python -m http.server,
 * Apache autoindex, nginx autoindex, etc.).
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1) Fixed lists per gallery (edit these to match files in /images)
  const IMAGES_DIR = "images/";
  const GALLERY_DIRS = {
    "gallery-portfolio": "images/portfolio_performance/",
    "gallery-indext-stat": "images/",
    "gallery-strategy-return": "images/",
  };

  const imageLists = {
    "gallery-portfolio": [
      "Alberto_portfolio_time_under_water_analysis.png",
      "return_required_for_htm.png",
      "potential_buying_signals.png",
      "performance_oversold_strategy.png",
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

  function appendImages(galleryId, files) {
    const gallery = document.getElementById(galleryId);
    if (!gallery || !Array.isArray(files)) return;

    const baseDir = GALLERY_DIRS[galleryId] || IMAGES_DIR;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const collapseLimit = 4; // show first N on mobile, collapse the rest

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
      gallery.appendChild(fig);
    });

    // Collapse long galleries on mobile with a "Show more" button
    if (isMobile && files.length > collapseLimit) {
      const figures = Array.from(gallery.querySelectorAll("figure.image-card"));
      figures
        .slice(collapseLimit)
        .forEach((f) => f.classList.add("hidden-mobile"));

      const btn = document.createElement("button");
      btn.className = "show-more-btn";
      btn.textContent = `Show ${files.length - collapseLimit} more`;
      btn.addEventListener("click", () => {
        figures
          .slice(collapseLimit)
          .forEach((f) => f.classList.remove("hidden-mobile"));
        btn.remove();
      });
      gallery.appendChild(btn);
    }
  }

  Object.entries(imageLists).forEach(([galleryId, files]) =>
    appendImages(galleryId, files)
  );

  // Lightbox setup (tap image to open)
  const lightbox = setupLightbox();
  [
    "gallery-portfolio",
    "gallery-indext-stat",
    "gallery-strategy-return",
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;

    node.addEventListener("click", (e) => {
      const target = e.target;
      if (target && target.tagName === "IMG") {
        lightbox.open(target.src, target.dataset.caption || target.alt || "");
      }
    });
    node.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target?.tagName === "IMG") {
        e.preventDefault();
        const t = e.target;
        lightbox.open(t.src, t.dataset.caption || t.alt || "");
      }
    });
  });

  function setupLightbox() {
    const backdrop = document.querySelector(".lightbox-backdrop");
    const image = backdrop?.querySelector(".lightbox-image");
    const caption = backdrop?.querySelector(".lightbox-caption");
    const closeBtn = backdrop?.querySelector(".lightbox-close");

    function open(src, text) {
      if (!backdrop || !image) return;
      image.src = src;
      image.alt = text || "";
      if (caption) caption.textContent = text || "";
      backdrop.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      if (!backdrop) return;
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
      if (image) image.src = "";
    }

    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    closeBtn?.addEventListener("click", close);
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
    })
    .catch((err) =>
      console.error("Unable to load historical analysis table:", err)
    );

  // Scroll-to-top behavior
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
