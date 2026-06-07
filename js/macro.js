// Macroeconomic gallery renderer.
// Images are expected under: images/macro
// Option A (automatic): provide images/macro/manifest.json with { "images": ["file1.png", ...], "tags": { "file1.png":["rates","inflation"] } }
// Option B (manual): edit DEFAULT_IMAGES below.

const MACRO_DIR = "images/macro";
const MACRO_SUMMARY_PATH = "data/macro_summary.json";

// Fallback images list (edit this if you don't use a manifest.json)
const DEFAULT_IMAGES = [
  "macro_inflation_m1_treasuries.png",
  "ism_manufacturing_actual.png",
  "usd_purchasing_power_depreciation.png",
  "gold_vol_quantiles.png",
  "vix_quantiles.png",
  "unemployment_rate_US_quantiles.png",
  "10Y_3M_treasury_spread_quantiles.png",
  "copper_gold_ratio_quantiles.png",
  "equity_risk_premium_quantiles.png",
  "high_yield_quantiles.png",
  "M1_change_quantiles.png",
  "housing_price_index_and_debt_service.png",
  "short_term_debt_cycle.png",
  "real_estate_cycle.png",
  "coal_price_history.png",
  "oil_price_quantiles.png",
];

const DEFAULT_TAGS = {
  "macro_inflation_m1_treasuries.png": [
    "overview",
    "rates",
    "inflation",
    "money_supply",
  ],
  "ism_manufacturing_actual.png": ["overview", "growth", "manufacturing"],
  "usd_purchasing_power_depreciation.png": ["overview", "inflation"],
  "gold_vol_quantiles.png": ["overview", "gold"],
  "vix_quantiles.png": ["overview", "vix"],
  "unemployment_rate_US_quantiles.png": ["overview", "unemployment"],
  "10Y_3M_treasury_spread_quantiles.png": ["overview", "rates"],
  "copper_gold_ratio_quantiles.png": ["overview", "commodities"],
  "equity_risk_premium_quantiles.png": ["overview", "equity"],
  "high_yield_quantiles.png": ["overview", "high_yield"],
  "M1_change_quantiles.png": ["overview", "money_supply"],
  "housing_price_index_and_debt_service.png": ["overview", "housing"],
  "short_term_debt_cycle.png": ["overview", "debt_cycle"],
  "real_estate_cycle.png": ["overview", "housing"],
  "coal_price_history.png": ["overview", "commodities"],
  "oil_price_quantiles.png": ["overview", "commodities"],
};

// Preferred tag order for UI (chips). Any other tags appear after these.
const TAG_ORDER = [
  "overview",
  "inflation",
  "growth",
  "labor",
  "housing",
  "rates",
  "liquidity",
  "commodities",
  "sentiment",
  "international",
];

async function loadManifest() {
  try {
    const res = await fetch(`${MACRO_DIR}/manifest.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("no manifest");
    const data = await res.json();
    const images = Array.isArray(data.images) ? data.images : [];
    const tags = typeof data.tags === "object" && data.tags ? data.tags : {};
    return { images, tags };
  } catch {
    return { images: DEFAULT_IMAGES, tags: DEFAULT_TAGS };
  }
}

async function loadMacroSummary() {
  try {
    const res = await fetch(MACRO_SUMMARY_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error("no macro summary");
    return await res.json();
  } catch {
    return null;
  }
}

function fileToCaption(name) {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return base
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildChips(allTags, currentTag) {
  const container = document.getElementById("macro-filters");
  if (!container) return;

  container.innerHTML = "";

  const tags = [
    "all",
    ...allTags.sort((a, b) => {
      const ia = TAG_ORDER.indexOf(a);
      const ib = TAG_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }),
  ];

  for (const tag of tags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip${currentTag === tag ? " active" : ""}`;
    chip.textContent = tag === "all" ? "All" : toTitle(tag);
    chip.dataset.tag = tag;
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGallery(window.__macroData.images, window.__macroData.tags, tag);
      const url = new URL(window.location.href);
      if (tag === "all") url.searchParams.delete("tag");
      else url.searchParams.set("tag", tag);
      window.history.replaceState({}, "", url.toString());
    });
    container.appendChild(chip);
  }
}

function toTitle(tag) {
  return tag.replace(/[_\-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(metric) {
  if (metric.value === null || metric.value === undefined) return "n/a";
  const decimals = Number.isInteger(metric.decimals) ? metric.decimals : 2;
  const value = Number(metric.value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (metric.unit === "$") return `$${value}`;
  return `${value}${metric.unit || ""}`;
}

function formatQuantile(metric) {
  if (metric.quantile === null || metric.quantile === undefined) return "";
  const quantile = Number(metric.quantile).toFixed(0);
  return `${quantile}th percentile`;
}

function renderMacroSummary(summary) {
  const root = document.getElementById("macro-summary");
  if (!root) return;

  if (!summary || !Array.isArray(summary.metrics)) {
    root.innerHTML =
      '<div class="macro-summary-empty">Macro summary data is not available.</div>';
    return;
  }

  root.innerHTML = "";

  const header = document.createElement("div");
  header.className = "macro-summary-header";

  const title = document.createElement("h3");
  title.textContent = "Macro Snapshot";

  const meta = document.createElement("div");
  meta.className = "macro-summary-meta";
  meta.textContent = summary.generated_at
    ? `Generated ${summary.generated_at}`
    : "Generated date unavailable";

  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "macro-summary-grid";

  for (const metric of summary.metrics) {
    const card = document.createElement("article");
    card.className = "macro-summary-card";

    const label = document.createElement("div");
    label.className = "macro-summary-label";
    label.textContent = metric.label;

    const value = document.createElement("div");
    value.className = "macro-summary-value";
    value.textContent = formatMetricValue(metric);

    const detail = document.createElement("div");
    detail.className = "macro-summary-detail";
    const parts = [];
    const quantile = formatQuantile(metric);
    if (quantile) parts.push(quantile);
    if (metric.date) parts.push(`as of ${metric.date}`);
    detail.textContent = parts.join(" · ");

    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(detail);
    grid.appendChild(card);
  }

  root.appendChild(grid);
}

function getAllTags(tagsMap) {
  const set = new Set();
  Object.values(tagsMap).forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach((t) => set.add(t));
  });
  return Array.from(set);
}

function renderGallery(images, tagsMap, activeTag = "all") {
  const root = document.getElementById("macro-gallery");
  if (!root) return;

  root.innerHTML = "";

  const filtered = images.filter((img) => {
    if (activeTag === "all") return true;
    const tags = tagsMap[img] || [];
    return tags.includes(activeTag);
  });

  if (filtered.length === 0) {
    const msg = document.createElement("p");
    msg.style.color = "var(--text-light)";
    msg.textContent =
      "No images to display. Add files to images/macro or update manifest.json / DEFAULT_IMAGES.";
    root.appendChild(msg);
    return;
  }

  for (const file of filtered) {
    const fig = document.createElement("figure");
    fig.className = "image-card";

    const img = document.createElement("img");
    img.src = `${MACRO_DIR}/${file}`;
    img.alt = fileToCaption(file);
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("click", () => openLightbox(img.src, img.alt));

    const cap = document.createElement("figcaption");
    cap.textContent = fileToCaption(file);

    fig.appendChild(img);
    fig.appendChild(cap);
    root.appendChild(fig);
  }
}

function openLightbox(src, caption) {
  const overlay = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const cap = document.getElementById("lightbox-caption");
  if (!overlay || !img || !cap) return;

  img.src = src;
  img.alt = caption || "";
  cap.textContent = caption || "";
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  const overlay = document.getElementById("lightbox");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
}

function setupLightbox() {
  const overlay = document.getElementById("lightbox");
  const btn = document.querySelector(".lightbox-close");

  if (btn) btn.addEventListener("click", closeLightbox);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      // Close when clicking the backdrop (not when clicking the image)
      if (e.target === overlay) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

(async function init() {
  const gallery = document.getElementById("macro-gallery");
  if (gallery)
    gallery.innerHTML = '<div class="loading">Loading macro images...</div>';

  setupLightbox();

  const summary = await loadMacroSummary();
  renderMacroSummary(summary);

  const data = await loadManifest();
  // Save for filter switching
  window.__macroData = data;

  // Determine active tag from URL
  const url = new URL(window.location.href);
  const activeTag = url.searchParams.get("tag") || "all";

  const allTags = getAllTags(data.tags);
  buildChips(allTags, activeTag);
  renderGallery(data.images, data.tags, activeTag);
})();
