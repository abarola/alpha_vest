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

    images.forEach((file, idx) => {
      const card = document.createElement("div");
      card.className = "metric-card si-card";

      const img = document.createElement("img");
      img.src = `${folder}/${file}`;
      img.alt = toTitle(file);
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = idx < 2 ? "high" : "low";
      img.tabIndex = 0; // keyboard open support

      const caption = document.createElement("div");
      caption.className = "metric-title";
      caption.textContent = toTitle(file);

      card.appendChild(img);
      card.appendChild(caption);
      frag.appendChild(card);
    });

    container.appendChild(frag);

    // Mobile: collapse long lists with "Show more"
    applyMobileCollapse(container, 4);

    // Wire lightbox (click or keyboard)
    wireLightbox(container);
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

/* ===== Helpers: mobile collapse + lightbox ===== */

function applyMobileCollapse(container, limit = 4) {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const cards = Array.from(container.querySelectorAll(".si-card"));
  if (!isMobile || cards.length <= limit) return;

  cards.slice(limit).forEach((c) => c.classList.add("hidden-mobile"));

  const btn = document.createElement("button");
  btn.className = "show-more-btn";
  btn.textContent = `Show ${cards.length - limit} more`;
  btn.addEventListener("click", () => {
    cards.slice(limit).forEach((c) => c.classList.remove("hidden-mobile"));
    btn.remove();
  });
  container.appendChild(btn);
}

function wireLightbox(container) {
  const backdrop = document.getElementById("lightbox");
  const imgEl = document.getElementById("lightbox-img");
  const captionEl = document.getElementById("lightbox-caption");
  const closeBtn = backdrop?.querySelector(".lightbox-close");

  const open = (src, caption = "") => {
    if (!backdrop || !imgEl) return;
    imgEl.src = src;
    imgEl.alt = caption;
    if (captionEl) captionEl.textContent = caption;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (imgEl) imgEl.src = "";
  };

  // Click to open
  container.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.tagName === "IMG") {
      open(target.src, target.alt || "");
    }
  });

  // Keyboard open (Enter/Space on image)
  container.addEventListener("keydown", (e) => {
    const t = e.target;
    if ((e.key === "Enter" || e.key === " ") && t?.tagName === "IMG") {
      e.preventDefault();
      open(t.src, t.alt || "");
    }
  });

  // Close interactions
  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  closeBtn?.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}
