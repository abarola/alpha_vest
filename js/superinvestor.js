document.addEventListener("DOMContentLoaded", () => {
  initInvestorSnapshot();
});

// Put your PNG filenames here (relative to the folder in data-folder)
const DEFAULT_IMAGES = [
  "top_stocks_superinvestors_count.png",
  "top_stocks_superinvestors_weighted_top_position.png",
  "top_stocks_superinvestors_weighted_portfolio_value.png",
];

async function initInvestorSnapshot() {
  const container = document.getElementById("si-metrics");
  if (!container) return;

  const folder = container.dataset.folder || "images/superinvestors";

  // Optional: allow inline list via data-images="a.png,b.png"
  const inline = (container.dataset.images || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  container.innerHTML = '<div class="loading">Loading images...</div>';

  try {
    const images = inline.length ? inline : await getImageList(folder);
    if (!images.length) throw new Error("No images found");

    container.innerHTML = "";
    const frag = document.createDocumentFragment();

    images.forEach((file) => {
      const card = document.createElement("div");
      card.className = "metric-card si-card";

      const img = document.createElement("img");
      img.src = `${folder}/${file}`;
      img.alt = toTitle(file);
      img.loading = "lazy";

      const caption = document.createElement("div");
      caption.className = "metric-title";
      caption.textContent = toTitle(file);

      card.appendChild(img);
      card.appendChild(caption);
      frag.appendChild(card);
    });

    container.appendChild(frag);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div class="error">Could not load investor images. Ensure manifest.json exists in the folder.</div>';
  }
}

async function getImageList(folder) {
  const url = `${folder}/manifest.json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Manifest not found at ${url}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.images;
    const filtered = (list || []).filter((name) => /\.png$/i.test(name));
    return filtered.length ? filtered : DEFAULT_IMAGES;
  } catch (e) {
    // Fallback to hardcoded list if manifest is missing/unreachable
    return DEFAULT_IMAGES;
  }
}

function toTitle(filename) {
  return filename
    .replace(/\.png$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
