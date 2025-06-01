// filepath: /Users/albertobarola/CloudStation/Python/HTML_portfolio/script.js
/**
 * Fetches the directory listing for /images and appends one <img>
 * element for every *.png file it finds. This requires the server
 * to expose a simple directory index (e.g., python -m http.server,
 * Apache autoindex, nginx autoindex, etc.).
 */
document.addEventListener("DOMContentLoaded", () => {
  fetch("images/")
    .then((response) => response.text())
    .then((text) => {
      // Parse the returned HTML directory listing
      const doc = new DOMParser().parseFromString(text, "text/html");
      const pngFiles = Array.from(doc.querySelectorAll("a"))
        .map((a) => a.getAttribute("href"))
        .filter((href) => href && href.toLowerCase().endsWith(".png"));

      // const gallery = document.getElementById("gallery"); // Old gallery
      const portfolioGallery = document.getElementById("gallery-portfolio");
      const indextStatGallery = document.getElementById("gallery-indext-stat");
      const strategyReturnGallery = document.getElementById(
        "gallery-strategy-return"
      );

      pngFiles.forEach((file) => {
        const img = document.createElement("img");
        img.src = file; // Assumes 'file' is like 'images/portfolio_image1.png'
        const fileName = file.split("/").pop().toLowerCase(); // e.g., portfolio_image1.png
        img.alt = fileName;

        // Determine category based on filename prefix
        if (fileName.startsWith("alberto_portfolio_")) {
          portfolioGallery.appendChild(img);
        } else if (fileName.startsWith("csspx_mi_cagr")) {
          indextStatGallery.appendChild(img);
        } else if (fileName.startsWith("cumulative_return")) {
          strategyReturnGallery.appendChild(img);
        } else {
          // Optional: Handle images that don't fit a category,
          // or create a default gallery for them.
          // For now, we'll log them.
          console.log("Image does not fit a category:", file);
        }
      });
    })
    .catch((err) => console.error("Unable to load image list:", err));

  /* ==================== 2. build the ranking table ==================== */
  fetch("rank_companies/rank_companies.json")
    .then((resp) => resp.json())
    .then((rows) => {
      if (!rows.length) return;

      const table = document.getElementById("rank-table");
      const theadTr = table.querySelector("thead tr");
      const tbody = table.querySelector("tbody");

      /* ---- header ---- */
      const cols = Object.keys(rows[0]);
      cols.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.replace(/_/g, " ");
        theadTr.appendChild(th);
      });

      /* ---- body ---- */
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        cols.forEach((col) => {
          const td = document.createElement("td");
          if (col.toLowerCase() === "symbol") {
            // Check if the current column is 'symbol'
            const link = document.createElement("a");
            link.href = `stock-details.html?symbol=${encodeURIComponent(
              row[col]
            )}`;
            link.textContent = row[col];
            // Optional: Add a class for styling the link if needed
            // link.classList.add('stock-symbol-link');
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

      /* ---- header ---- */
      const cols = Object.keys(rows[0]);
      cols.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.replace(/_/g, " ");
        theadTr.appendChild(th);
      });

      /* ---- body ---- */
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        cols.forEach((col) => {
          const td = document.createElement("td");
          td.textContent = row[col];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    })
    .catch((err) =>
      console.error("Unable to load historical analysis table:", err)
    );
});
