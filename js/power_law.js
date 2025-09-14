document.addEventListener("DOMContentLoaded", () => {
  const basePath = "images/power_law/";
  const historicalContainer = document.getElementById("pl-historical");
  const ytdContainer = document.getElementById("pl-ytd");

  // Utility: prettify filename for captions
  const toCaption = (filename) =>
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Utility: create a figure card for an image
  function createImageCard(src, alt, caption) {
    const figure = document.createElement("figure");
    figure.className = "image-card";

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || caption || "";
    img.loading = "lazy";

    const figcaption = document.createElement("figcaption");
    figcaption.textContent = caption || alt || "";

    figure.appendChild(img);
    figure.appendChild(figcaption);
    return figure;
  }

  // Lightbox wiring
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");
  const lbClose = lb.querySelector(".lightbox-close");

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbCaption.textContent = caption || "";
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    lbCaption.textContent = "";
  }
  lbClose.addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  function enableLightbox(container) {
    container.addEventListener("click", (e) => {
      const img = e.target.closest("img");
      if (!img) return;
      const fig = img.closest("figure");
      const caption =
        fig?.querySelector("figcaption")?.textContent || img.alt || "";
      openLightbox(img.src, caption);
    });
  }

  // Remove loading helper
  function clearLoading(container) {
    const loading = container.querySelector(".loading");
    if (loading) loading.remove();
  }

  // 1) Historical Backtest images (fixed list)
  const historicalFiles = [
    "box_by_offset.png",
    "current_vs_next_scatter.png",
    "heatmap_mean_return.png",
    "return_histogram.png",
  ];

  (function renderHistorical() {
    clearLoading(historicalContainer);
    let rendered = 0;

    historicalFiles.forEach((file) => {
      const src = basePath + file;
      const caption = toCaption(file);
      const card = createImageCard(src, caption, caption);

      // Handle missing files gracefully
      card.querySelector("img").addEventListener("error", () => {
        card.remove();
        if (--rendered === 0 && historicalContainer.children.length === 0) {
          const p = document.createElement("p");
          p.textContent = "No historical images found.";
          historicalContainer.appendChild(p);
        }
      });

      historicalContainer.appendChild(card);
      rendered++;
    });

    enableLightbox(historicalContainer);
  })();

  // 2) Current year strategy return (try multiple extensions for offset1_ytd_bars)
  const ytdBase = "offset1_ytd_bars";
  const tryExts = [".png", ".svg", ".webp", ".jpg", ".jpeg"];

  function tryLoadSequential(base, exts, onSuccess, onFail) {
    let i = 0;
    function attempt() {
      if (i >= exts.length) return onFail?.();
      const testImg = new Image();
      const src = basePath + base + exts[i++];
      testImg.onload = () => onSuccess(src);
      testImg.onerror = attempt;
      testImg.src = src;
    }
    attempt();
  }

  (function renderYtd() {
    clearLoading(ytdContainer);

    tryLoadSequential(
      ytdBase,
      tryExts,
      (src) => {
        const caption = "Offset1 YTD Bars";
        const card = createImageCard(src, caption, caption);
        ytdContainer.appendChild(card);
        enableLightbox(ytdContainer);
      },
      () => {
        const p = document.createElement("p");
        p.textContent =
          "YTD chart not found (looked for offset1_ytd_bars.{png,svg,webp,jpg,jpeg}).";
        ytdContainer.appendChild(p);
      }
    );
  })();
});
