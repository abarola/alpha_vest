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
  const imageLists = {
    "gallery-portfolio": [
      "Alberto_portfolio_time_under_water_analysis.png",
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

  function appendImages(galleryId, files) {
    const gallery = document.getElementById(galleryId);
    if (!gallery || !Array.isArray(files)) return;
    files.forEach((name) => {
      const img = document.createElement("img");
      img.src = `${IMAGES_DIR}${name}`;
      img.alt = name;
      gallery.appendChild(img);
    });
  }

  Object.entries(imageLists).forEach(([galleryId, files]) =>
    appendImages(galleryId, files)
  );

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
});
