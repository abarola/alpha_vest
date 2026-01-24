document.addEventListener("DOMContentLoaded", () => {
  const basePath = "images/power_law/";
  const historicalContainer = document.getElementById("pl-historical");
  const ytdContainer = document.getElementById("pl-ytd");

  // User-provided descriptions for each graph
  const imageDescriptions = {
    "box_by_offset.png":
      "This box plot visualizes how forward returns vary across different investment horizons (offsets). Each offset represents the same holding period measured from stock selection dates at different times in the past. Stocks identified as over-performers in their respective cohort based on past yearly returns are grouped by their offset value (typically ranging from 2 to 8 fiscal years). For each offset group, we calculate the distribution of forward returns—the performance from selection to the next rebalancing period. The boxes show the interquartile range (25th to 75th percentile), with the line inside representing the median return. Whiskers extend to 1.5× the interquartile range, and outliers are shown as individual points. This chart helps identify whether certain investment horizons consistently produce better or more stable returns.",
    "current_vs_next_scatter.png": `This scatter plot examines the relationship between a stock's current forward return and its subsequent forward return, 
    testing whether past winners continue to outperform (momentum) or if there is mean reversion.

    **Computation:** For each stock pick, we plot its forward return for the current holding period (x-axis) against its forward return in the immediately following period (y-axis). The correlation coefficient quantifies the strength of this relationship. Red reference lines at x=0 and y=0 help identify quadrants of consecutive wins/losses.

    A positive correlation suggests momentum (good picks continue performing well), while a negative correlation would 
    indicate mean reversion. Low correlation suggests returns are largely independent across successive periods. The plot 
    is automatically zoomed to focus on the main distribution (1st to 100th percentile) while including all data points.`,

    "heatmap_mean_return.png":
      "This heatmap displays the average forward returns organized by fiscal year number and offset. Color intensity indicates performance, with red representing positive returns and blue representing negative returns.\n\nComputation: Each cell represents the mean forward return for all stocks selected during a specific fiscal year number with a particular offset value. Returns are calculated as the percentage change from the selection date's adjusted close price to the next rebalancing period's adjusted close price. The color scale is normalized symmetrically around zero to highlight both gains and losses with equal visual weight.\n\nThis visualization helps identify temporal patterns and whether the strategy performs consistently across different market periods and investment horizons.",

    "return_histogram.png":
      "This histogram shows the distribution of forward returns for all selected stocks across different years (offsets). The returns represent the performance of stocks picked by the power law strategy from their selection date to the subsequent rebalancing period. For each stock selected as a top pick at time t with offset k, we calculate the return from the adjusted close price at time t to the adjusted close price at the next rebalancing date (time t + offset k+1). The histogram aggregates these forward returns across all picks and offsets (filtered to offsets 2-8). The dashed vertical line indicates the mean return, while the dotted line shows the median. The hit rate displayed represents the percentage of picks that generated positive returns.",

    offset1_ytd_bars: `This bar chart shows the actual year-to-date (YTD) returns for stocks currently selected with offset=1, representing 
    the strategy's most recent recommendations.

    Computation: We identify all stocks with offset=1 in the most recent data files (representing current recommendations). 
    For each ticker, we download daily price data from January 1st of the current year to today and calculate the YTD return 
    as: (current adjusted close / January 1st adjusted close) - 1. The chart displays the top performers by absolute YTD 
    return magnitude.

    This represents real, realized performance of the strategy's current positions, providing a reality check on whether 
    historically-identified patterns are translating into actual gains in the current market environment. Note that these 
    are backward-looking YTD returns, not forward projections.`,
  };

  // Utility: prettify filename for captions
  const toCaption = (filename) =>
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Utility: create a figure card for an image with description (collapsible)
  function createImageCard(src, alt, caption, description) {
    // Single card container
    const imageCard = document.createElement("div");
    imageCard.className = "image-card";

    // Figure + Image + Caption
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || caption || "";
    img.loading = "lazy";
    
    // Wire up lightbox data attributes
    img.dataset.caption = caption || alt || "";

    const figcaption = document.createElement("figcaption");
    figcaption.textContent = caption || "Click to enlarge";

    figure.appendChild(img);
    figure.appendChild(figcaption);
    imageCard.appendChild(figure);

    // Collapsible Description (like main page)
    if (description) {
      const details = document.createElement("details");
      details.className = "chart-explainer";

      const summary = document.createElement("summary");
      summary.textContent = "Analysis Details";

      const content = document.createElement("div");
      content.className = "explainer-content";
      content.style.padding = "1rem";
      
      // Preserve newlines
      content.innerHTML = description.replace(/\n/g, "<br>");

      details.appendChild(summary);
      details.appendChild(content);
      
      imageCard.appendChild(details);
    }

    return imageCard;
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
      const description = imageDescriptions[file] || "";
      const card = createImageCard(src, caption, caption, description);

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
        const description = imageDescriptions["offset1_ytd_bars"] || "";
        const card = createImageCard(src, caption, caption, description);
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

  // 3) Multi Time Frame Analysis
  const multiTimeframeContainer = document.getElementById("pl-multi-timeframe");
  const multiTimeframeFile = "aggregate_ranking_power_law_multi_scale.png";

  (function renderMultiTimeframe() {
    clearLoading(multiTimeframeContainer);

    const src = basePath + multiTimeframeFile;
    const caption = "Aggregate Ranking Power Law Multi Scale";
    const description = imageDescriptions[multiTimeframeFile] || "";

    const card = createImageCard(src, caption, caption, description);

    // Handle missing file gracefully
    card.querySelector("img").addEventListener("error", () => {
      card.remove();
      const p = document.createElement("p");
      p.textContent = "Multi time frame analysis chart not found.";
      multiTimeframeContainer.appendChild(p);
    });

    multiTimeframeContainer.appendChild(card);
    enableLightbox(multiTimeframeContainer);
  })();
});
