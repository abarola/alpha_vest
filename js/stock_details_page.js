document.addEventListener("DOMContentLoaded", function () {
  // If the HTML was pre-rendered (for SEO), do nothing.
  // This prevents duplicate score chips and metric wrappers.
  if (document.body?.dataset?.prerendered === "1") {
    return;
  }

  // If a prerendered page exists for this symbol (e.g. /stocks/AAPL-US.html),
  // prefer it before doing the XLSX fetch.
  function sanitizeSymbolForPath(symbol) {
    return String(symbol || "")
      .trim()
      .toUpperCase()
      .replace(/[:/\\\s]+/g, "-")
      .replace(/[^A-Z0-9._-]/g, "");
  }

  async function tryRedirectToPrerenderedPage(symbol) {
    const sym = String(symbol || "").trim();
    if (!sym) return false;

    // Allow manual opt-out: stock-details.html?symbol=...&no_prerender=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("no_prerender") === "1") return false;

    const safe = sanitizeSymbolForPath(sym);
    if (!safe) return false;

    // Avoid loops if we’re already on the prerendered page.
    if (window.location.pathname.includes(`/stocks/${safe}.html`)) {
      return false;
    }

    const candidates = [
      `stocks/${safe}.html`,
      `./stocks/${safe}.html`,
      `/stocks/${safe}.html`,
    ];

    for (const href of candidates) {
      try {
        // Some hosts don’t support HEAD reliably; try HEAD then fall back to GET.
        const headRes = await fetch(href, {
          method: "HEAD",
          cache: "no-store",
        });
        if (headRes.ok) {
          window.location.replace(href);
          return true;
        }
      } catch (_) {
        // ignore
      }

      try {
        const getRes = await fetch(href, { method: "GET", cache: "no-store" });
        if (getRes.ok) {
          window.location.replace(href);
          return true;
        }
      } catch (_) {
        // ignore
      }
    }

    return false;
  }

  // Function to get URL parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // MICRO-STEP (SEO): allow pages to ship with preloaded (static) data.
  // This lets you create ONE crawlable stock page (e.g. /stocks/AAPL.html)
  // without changing the whole site architecture.
  //
  // If present, set one of:
  //   - window.__STOCK_PAGE_DATA__ = { symbol, stockData, medians }
  //   - <script id="stock-page-data" type="application/json">{...}</script>
  //   - <body data-stock-symbol="AAPL">
  function getPreloadedPageData() {
    // 1) window global (easy to inject from a generated HTML file)
    if (
      window.__STOCK_PAGE_DATA__ &&
      typeof window.__STOCK_PAGE_DATA__ === "object"
    ) {
      return window.__STOCK_PAGE_DATA__;
    }

    // 2) JSON script tag (keeps the global namespace clean)
    const el = document.getElementById("stock-page-data");
    if (el && el.textContent) {
      try {
        const obj = JSON.parse(el.textContent);
        if (obj && typeof obj === "object") return obj;
      } catch (e) {
        console.warn("Failed to parse #stock-page-data JSON", e);
      }
    }

    return null;
  }

  function getStockSymbolFromPage() {
    // Prefer the existing query param (keeps backward compatibility)
    const fromQuery = getQueryParam("symbol");
    if (fromQuery) return fromQuery;

    // Optional: body attribute, useful for /stocks/SYMBOL.html
    // If you set <body data-stock-symbol="AAPL">, it becomes dataset.stockSymbol.
    const fromDataset = document.body?.dataset?.stockSymbol;
    if (fromDataset) return fromDataset;

    // Optional: preloaded JSON provides symbol
    const pre = getPreloadedPageData();
    if (pre && typeof pre.symbol === "string" && pre.symbol.trim())
      return pre.symbol.trim();

    return null;
  }

  // Helper function to calculate median
  function calculateMedian(values) {
    const sortedValues = values
      .filter((v) => typeof v === "number" && !isNaN(v))
      .sort((a, b) => a - b);
    if (sortedValues.length === 0) return null;
    const mid = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 0) {
      return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
  }

  // Helper function to format metric values
  function formatMetricValue(value, fieldId) {
    if (value === null || value === undefined || typeof value !== "number") {
      return "N/A";
    }

    let formattedValue;
    switch (fieldId) {
      case "tang_equity_over_tot_liab":
      case "capital_intensity_reverse":
      case "roic_over_wacc":
      case "price_to_earnings":
      case "peg":
      case "price_to_tangible_book":
      case "leverage_ratio":
      case "interest_coverage_ratio":
      case "relative_PE_vs_history":
      case "current_ratio":
      case "pe_times_pb": // NEW
        formattedValue = value.toFixed(2);
        break;

      case "negative_eps_count_5y":
        formattedValue = value.toFixed(0);
        break;

      case "cagr_tangible_book_per_share":
      case "cagr_cash_and_equiv":
      case "roe_tangible_equity":
      case "cash_conversion_ratio":
      case "earnings_yield":
      case "fcf_yield":
      case "avg_5years_eps_growth":
      case "avg_5years_revenue_growth":
      case "revenue_growth_acceleration":
      case "expected_growth_market_cap_10Y":
      case "avg_5years_roe_growth":
      case "implied_perpetual_growth_curr_market_cap":
      case "goodwill_to_assets":
      case "cagr_shares_diluted":
      case "eps_growth_5y_total":
        formattedValue = (value * 100).toFixed(2) + "%";
        break;

      case "final_earnings_for_10y_growth_10perc":
      case "final_earnings_for_10y_growth_15perc":
        formattedValue = (value / 1000000000).toFixed(2) + "B";
        break;

      case "rule_of_40":
        formattedValue = (value * 100).toFixed(2);
        break;

      default:
        formattedValue = value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        break;
    }
    return formattedValue;
  }

  // NEW: Threshold-based (absolute) rules for Graham indicators
  const thresholdIndicatorRules = {
    current_ratio: (value) => {
      if (typeof value !== "number" || isNaN(value)) return null;
      return value >= 1.5
        ? { icon: "▲", class: "better" }
        : { icon: "▼", class: "worse" };
    },
    negative_eps_count_5y: (value) => {
      if (typeof value !== "number" || isNaN(value)) return null;
      return value === 0
        ? { icon: "▲", class: "better" }
        : { icon: "▼", class: "worse" };
    },
    eps_growth_5y_total: (value) => {
      if (typeof value !== "number" || isNaN(value)) return null;
      return value > 1
        ? { icon: "▲", class: "better" } // green
        : { icon: "▼", class: "worse" };
    },
    pe_times_pb: (value) => {
      if (typeof value !== "number" || isNaN(value)) return null;
      return value < 30
        ? { icon: "▲", class: "better" } // green if below 30
        : { icon: "▼", class: "worse" }; // red otherwise
    },
  };

  function hasThresholdRule(fieldId) {
    return Object.prototype.hasOwnProperty.call(
      thresholdIndicatorRules,
      fieldId
    );
  }

  const MEDIAN_MARGIN_OF_SAFETY = 0.15; // 15%

  // Get comparison indicator
  function getComparisonIndicator(
    value,
    medianValue,
    fieldId,
    higherIsBetter,
    lowerIsBetter
  ) {
    // override median comparison if a threshold rule exists
    if (hasThresholdRule(fieldId)) {
      const res = thresholdIndicatorRules[fieldId](value);
      return res ?? { icon: "▬", class: "equal" };
    }

    if (
      typeof value !== "number" ||
      isNaN(value) ||
      typeof medianValue !== "number" ||
      isNaN(medianValue)
    ) {
      return { icon: "▬", class: "equal" };
    }

    // If median is 0 (or extremely close), fall back to simple comparison
    // because percentage-based bands become meaningless.
    const EPS = 1e-12;
    const medianAbs = Math.abs(medianValue);
    if (medianAbs < EPS) {
      if (higherIsBetter.includes(fieldId)) {
        if (value > medianValue) return { icon: "▲", class: "better" };
        if (value < medianValue) return { icon: "▼", class: "worse" };
        return { icon: "▬", class: "equal" };
      }
      if (lowerIsBetter.includes(fieldId)) {
        if (value < medianValue) return { icon: "▲", class: "better" };
        if (value > medianValue) return { icon: "▼", class: "worse" };
        return { icon: "▬", class: "equal" };
      }
      return { icon: "▬", class: "equal" };
    }

    const upperBand = medianValue * (1 + MEDIAN_MARGIN_OF_SAFETY);
    const lowerBand = medianValue * (1 - MEDIAN_MARGIN_OF_SAFETY);

    if (higherIsBetter.includes(fieldId)) {
      if (value >= upperBand) return { icon: "▲", class: "better" };
      if (value <= lowerBand) return { icon: "▼", class: "worse" };
      return { icon: "▬", class: "equal" }; // within ±15%
    }

    if (lowerIsBetter.includes(fieldId)) {
      if (value <= lowerBand) return { icon: "▲", class: "better" };
      if (value >= upperBand) return { icon: "▼", class: "worse" };
      return { icon: "▬", class: "equal" }; // within ±15%
    }

    return { icon: "▬", class: "equal" };
  }

  // Calculate section score
  function calculateSectionScore(
    sectionFields,
    stockData,
    allMedians,
    higherIsBetter,
    lowerIsBetter
  ) {
    let aboveMedian = 0;
    let total = 0;

    sectionFields.forEach((fieldId) => {
      const value = stockData[fieldId];
      const medianValue = allMedians[fieldId];

      // NEW: For threshold metrics, don't require a median to score it
      if (hasThresholdRule(fieldId)) {
        if (typeof value === "number" && !isNaN(value)) {
          total++;
          const indicator = getComparisonIndicator(
            value,
            medianValue,
            fieldId,
            higherIsBetter,
            lowerIsBetter
          );
          if (indicator.class === "better") aboveMedian++;
        }
        return;
      }

      // Existing median-based scoring
      if (
        typeof value === "number" &&
        !isNaN(value) &&
        typeof medianValue === "number" &&
        !isNaN(medianValue)
      ) {
        total++;
        const indicator = getComparisonIndicator(
          value,
          medianValue,
          fieldId,
          higherIsBetter,
          lowerIsBetter
        );
        if (indicator.class === "better") {
          aboveMedian++;
        }
      }
    });

    return { aboveMedian, total };
  }

  // Get score chip class
  function getScoreChipClass(aboveMedian, total) {
    if (total === 0) return "mixed";
    const ratio = aboveMedian / total;
    if (ratio >= 0.7) return "good";
    if (ratio >= 0.4) return "mixed";
    return "poor";
  }

  // Get the stock symbol (query param OR static page attribute OR preloaded data)
  const stockSymbol = getStockSymbolFromPage();

  // Section field mappings
  const sectionFields = {
    "balance-sheet-strength": [
      "tang_equity_over_tot_liab",
      "capital_intensity_reverse",
      "cagr_tangible_book_per_share",
      "cagr_cash_and_equiv",
      "goodwill_to_assets",
    ],
    "debt-service": ["leverage_ratio", "interest_coverage_ratio"],
    profitability: [
      "roe_tangible_equity",
      "roic_over_wacc",
      "rule_of_40",
      "cash_conversion_ratio",
      "avg_5years_roe_growth",
    ],
    valuation: [
      "earnings_yield",
      "price_to_earnings",
      "fcf_yield",
      "peg",
      "price_to_tangible_book",
      "relative_PE_vs_history",
    ],
    growth: [
      "avg_5years_eps_growth",
      "avg_5years_revenue_growth",
      "revenue_growth_acceleration",
      "cagr_shares_diluted",
      "expected_growth_market_cap_10Y",
      "final_earnings_for_10y_growth_10perc",
      "final_earnings_for_10y_growth_15perc",
      "implied_perpetual_growth_curr_market_cap",
    ],

    // NEW
    "graham-value-investor-indicator": [
      "current_ratio",
      "negative_eps_count_5y",
      "eps_growth_5y_total",
      "pe_times_pb", // NEW
    ],
  };

  // Column names mapping to HTML element IDs
  const dataFields = [
    "tang_equity_over_tot_liab",
    "capital_intensity_reverse",
    "cagr_tangible_book_per_share",
    "cagr_cash_and_equiv",
    "goodwill_to_assets",
    "leverage_ratio",
    "interest_coverage_ratio",
    "roe_tangible_equity",
    "roic_over_wacc",
    "rule_of_40",
    "cash_conversion_ratio",
    "earnings_yield",
    "price_to_earnings",
    "fcf_yield",
    "peg",
    "price_to_tangible_book",
    "relative_PE_vs_history",
    "avg_5years_eps_growth",
    "avg_5years_revenue_growth",
    "revenue_growth_acceleration",
    "cagr_shares_diluted",
    "expected_growth_market_cap_10Y",
    "final_earnings_for_10y_growth_10perc",
    "final_earnings_for_10y_growth_15perc",
    "avg_5years_roe_growth",
    "implied_perpetual_growth_curr_market_cap",

    // NEW
    "current_ratio",
    "negative_eps_count_5y",
    "eps_growth_5y_total",
    "pe_times_pb", // NEW
  ];

  const higherIsBetterMetrics = [
    "tang_equity_over_tot_liab",
    "capital_intensity_reverse",
    "cagr_tangible_book_per_share",
    "cagr_cash_and_equiv",
    "roe_tangible_equity",
    "roic_over_wacc",
    "rule_of_40",
    "cash_conversion_ratio",
    "earnings_yield",
    "fcf_yield",
    "avg_5years_eps_growth",
    "avg_5years_revenue_growth",
    "revenue_growth_acceleration",
    "expected_growth_market_cap_10Y",
    "avg_5years_roe_growth",
    "interest_coverage_ratio",

    // NEW
    "current_ratio",
  ];

  const lowerIsBetterMetrics = [
    "price_to_earnings",
    "peg",
    "price_to_tangible_book",
    "final_earnings_for_10y_growth_10perc",
    "final_earnings_for_10y_growth_15perc",
    "implied_perpetual_growth_curr_market_cap",
    "leverage_ratio",
    "goodwill_to_assets",
    "relative_PE_vs_history",
    "cagr_shares_diluted",

    // NEW
    "negative_eps_count_5y",
  ];

  if (stockSymbol) {
    // Update page title and header
    document.title = `Stock Details - ${stockSymbol}`;
    document.getElementById("stock-symbol-header").textContent = stockSymbol;

    const preloaded = getPreloadedPageData();

    function renderStockPage(stockData, allMedians) {
      // Add section scores
      Object.keys(sectionFields).forEach((sectionId) => {
        const score = calculateSectionScore(
          sectionFields[sectionId],
          stockData,
          allMedians,
          higherIsBetterMetrics,
          lowerIsBetterMetrics
        );

        const chipClass = getScoreChipClass(score.aboveMedian, score.total);

        // 1. Update Section Header
        const section = document.getElementById(sectionId);
        if (section) {
          const h2 = section.querySelector("h2");
          if (h2) {
            const scoreChip = document.createElement("span");
            scoreChip.className = `section-score ${chipClass}`;
            scoreChip.textContent = `${score.aboveMedian}/${score.total} above median`;
            h2.appendChild(scoreChip);
          }
        }

        // 2. Update Scorecard
        const scoreValEl = document.getElementById(`score-val-${sectionId}`);
        const scoreBarEl = document.getElementById(`score-bar-${sectionId}`);
        const scoreLabelEl = document.getElementById(
          `score-label-${sectionId}`
        );
        const cardEl = document.getElementById(`card-${sectionId}`);

        if (scoreValEl && scoreBarEl && scoreLabelEl && cardEl) {
          scoreValEl.textContent = `${score.aboveMedian}/${score.total}`;
          const percentage =
            score.total > 0 ? (score.aboveMedian / score.total) * 100 : 0;
          scoreBarEl.style.width = `${percentage}%`;

          cardEl.classList.remove("status-good", "status-mixed", "status-poor");
          cardEl.classList.add(`status-${chipClass}`);

          let labelText = "Neutral";
          if (chipClass === "good") labelText = "Strong";
          if (chipClass === "mixed") labelText = "Mixed";
          if (chipClass === "poor") labelText = "Weak";
          scoreLabelEl.textContent = labelText;
        }
      });

      dataFields.forEach((fieldId) => {
        const element = document.getElementById(fieldId);
        const medianElement = document.getElementById(fieldId + "_median");

        if (element) {
          const value = stockData[fieldId];
          const medianValue = allMedians[fieldId];

          const indicator = getComparisonIndicator(
            value,
            medianValue,
            fieldId,
            higherIsBetterMetrics,
            lowerIsBetterMetrics
          );

          const wrapper = document.createElement("div");
          wrapper.className = "metric-value-wrapper";

          const indicatorSpan = document.createElement("span");
          indicatorSpan.className = `metric-indicator ${indicator.class}`;
          indicatorSpan.textContent = indicator.icon;
          indicatorSpan.setAttribute("aria-label", indicator.class);

          const valueSpan = document.createElement("span");
          valueSpan.className = "metric-value";
          valueSpan.textContent = formatMetricValue(value, fieldId);

          if (indicator.class === "better")
            valueSpan.classList.add("metric-better");
          else if (indicator.class === "worse")
            valueSpan.classList.add("metric-worse");

          wrapper.appendChild(indicatorSpan);
          wrapper.appendChild(valueSpan);

          element.parentNode.replaceChild(wrapper, element);
        }

        if (medianElement) {
          const medianValue = allMedians[fieldId];
          medianElement.textContent = formatMetricValue(medianValue, fieldId);
        }
      });
    }

    // Otherwise: original behavior (JS fetches and computes everything)
    // Path note:
    // - If the site is hosted at the domain root, the file is typically /data/...
    // - If the site is hosted under a subfolder (e.g. /HTML_portfolio/), the file is typically ./data/...
    // - If you're on a nested page, ../data may be needed.
    function fetchArrayBufferWithFallback(urls) {
      const tryOne = (i) => {
        if (i >= urls.length) {
          throw new Error("Unable to fetch XLSX from any known path");
        }
        return fetch(urls[i])
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
          })
          .catch(() => tryOne(i + 1));
      };
      return tryOne(0);
    }

    fetchArrayBufferWithFallback([
      "data/financials_analysis_dashboard_offset_0.xlsx",
      "../data/financials_analysis_dashboard_offset_0.xlsx",
      "/data/financials_analysis_dashboard_offset_0.xlsx",
    ])
      .then((arrayBuffer) => {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Calculate medians for all fields
        const allMedians = {};
        dataFields.forEach((fieldId) => {
          const columnValues = jsonData.map((row) => row[fieldId]);
          allMedians[fieldId] = calculateMedian(columnValues);
        });

        const stockData = jsonData.find((row) => row.symbol === stockSymbol);

        if (stockData) {
          renderStockPage(stockData, allMedians);
        } else {
          tryRedirectToPrerenderedPage(stockSymbol).then((redirected) => {
            if (redirected) return;
            console.error(`Stock data not found for symbol: ${stockSymbol}`);
            dataFields.forEach((fieldId) => {
              const element = document.getElementById(fieldId);
              if (element) element.textContent = "Data not found";
              const medianElement = document.getElementById(
                fieldId + "_median"
              );
              if (medianElement) medianElement.textContent = "N/A";
            });
          });
        }
      })
      .catch((error) => {
        tryRedirectToPrerenderedPage(stockSymbol).then((redirected) => {
          if (redirected) return;

          // Last-resort: if the page shipped preloaded JSON (rare for stock-details.html), render it.
          if (preloaded && preloaded.stockData && preloaded.medians) {
            renderStockPage(preloaded.stockData, preloaded.medians);
            return;
          }

          console.error("Error loading or processing stock data:", error);
          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            if (element) element.textContent = "Error loading data";
            const medianElement = document.getElementById(fieldId + "_median");
            if (medianElement) medianElement.textContent = "Error";
          });
        });
      });
  } else {
    console.error("No stock symbol provided in URL.");
    document.getElementById("stock-symbol-header").textContent = "N/A";
    dataFields.forEach((fieldId) => {
      const element = document.getElementById(fieldId);
      if (element) element.textContent = "No symbol";
      const medianElement = document.getElementById(fieldId + "_median");
      if (medianElement) medianElement.textContent = "N/A";
    });
  }
});
