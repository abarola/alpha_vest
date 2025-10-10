document.addEventListener("DOMContentLoaded", function () {
  // Function to get URL parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
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
        formattedValue = value.toFixed(2);
        break;
      case "cagr_tangible_book_per_share":
      case "cagr_cash_and_equiv":
      case "roe_tangible_equity":
      case "cash_conversion_ratio":
      case "earnings_yield":
      case "fcf_yield":
      case "avg_5years_eps_growth":
      case "avg_5years_revenue_growth":
      case "expected_growth_market_cap_10Y":
      case "avg_5years_roe_growth":
      case "implied_perpetual_growth_curr_market_cap":
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

  // Get comparison indicator
  function getComparisonIndicator(
    value,
    medianValue,
    fieldId,
    higherIsBetter,
    lowerIsBetter
  ) {
    if (
      typeof value !== "number" ||
      isNaN(value) ||
      typeof medianValue !== "number" ||
      isNaN(medianValue)
    ) {
      return { icon: "▬", class: "equal" };
    }

    const tolerance = 0.001; // Consider values within 0.1% as equal
    const diff = Math.abs(value - medianValue) / Math.abs(medianValue);

    if (diff < tolerance) {
      return { icon: "▬", class: "equal" };
    }

    if (higherIsBetter.includes(fieldId)) {
      return value > medianValue
        ? { icon: "▲", class: "better" }
        : { icon: "▼", class: "worse" };
    } else if (lowerIsBetter.includes(fieldId)) {
      return value < medianValue
        ? { icon: "▲", class: "better" }
        : { icon: "▼", class: "worse" };
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

  // Get the stock symbol from the URL
  const stockSymbol = getQueryParam("symbol");

  // Section field mappings
  const sectionFields = {
    "balance-sheet-strength": [
      "tang_equity_over_tot_liab",
      "capital_intensity_reverse",
      "cagr_tangible_book_per_share",
      "cagr_cash_and_equiv",
    ],
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
    ],
    growth: [
      "avg_5years_eps_growth",
      "avg_5years_revenue_growth",
      "expected_growth_market_cap_10Y",
      "final_earnings_for_10y_growth_10perc",
      "final_earnings_for_10y_growth_15perc",
      "implied_perpetual_growth_curr_market_cap",
    ],
  };

  // Column names mapping to HTML element IDs
  const dataFields = [
    "tang_equity_over_tot_liab",
    "capital_intensity_reverse",
    "cagr_tangible_book_per_share",
    "cagr_cash_and_equiv",
    "roe_tangible_equity",
    "roic_over_wacc",
    "rule_of_40",
    "cash_conversion_ratio",
    "earnings_yield",
    "price_to_earnings",
    "fcf_yield",
    "peg",
    "price_to_tangible_book",
    "avg_5years_eps_growth",
    "avg_5years_revenue_growth",
    "expected_growth_market_cap_10Y",
    "final_earnings_for_10y_growth_10perc",
    "final_earnings_for_10y_growth_15perc",
    "avg_5years_roe_growth",
    "implied_perpetual_growth_curr_market_cap",
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
    "expected_growth_market_cap_10Y",
    "avg_5years_roe_growth",
  ];

  const lowerIsBetterMetrics = [
    "price_to_earnings",
    "peg",
    "price_to_tangible_book",
    "final_earnings_for_10y_growth_10perc",
    "final_earnings_for_10y_growth_15perc",
    "implied_perpetual_growth_curr_market_cap",
  ];

  if (stockSymbol) {
    // Update page title and header
    document.title = `Stock Details - ${stockSymbol}`;
    document.getElementById("stock-symbol-header").textContent = stockSymbol;

    // Fetch and process the Excel file
    fetch("../data/financials_analysis_dashboard_offset_0.xlsx")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
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
          // Add section scores
          Object.keys(sectionFields).forEach((sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
              const h2 = section.querySelector("h2");
              if (h2) {
                const score = calculateSectionScore(
                  sectionFields[sectionId],
                  stockData,
                  allMedians,
                  higherIsBetterMetrics,
                  lowerIsBetterMetrics
                );

                const chipClass = getScoreChipClass(
                  score.aboveMedian,
                  score.total
                );
                const scoreChip = document.createElement("span");
                scoreChip.className = `section-score ${chipClass}`;
                scoreChip.textContent = `${score.aboveMedian}/${score.total} above median`;
                h2.appendChild(scoreChip);
              }
            }
          });

          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            const medianElement = document.getElementById(fieldId + "_median");

            if (element) {
              const value = stockData[fieldId];
              const medianValue = allMedians[fieldId];

              // Clear previous comparison classes
              element.classList.remove("metric-better", "metric-worse");

              // Get comparison indicator
              const indicator = getComparisonIndicator(
                value,
                medianValue,
                fieldId,
                higherIsBetterMetrics,
                lowerIsBetterMetrics
              );

              // Wrap value with indicator
              const wrapper = document.createElement("div");
              wrapper.className = "metric-value-wrapper";

              const indicatorSpan = document.createElement("span");
              indicatorSpan.className = `metric-indicator ${indicator.class}`;
              indicatorSpan.textContent = indicator.icon;
              indicatorSpan.setAttribute("aria-label", indicator.class);

              const valueSpan = document.createElement("span");
              valueSpan.className = "metric-value";
              valueSpan.textContent = formatMetricValue(value, fieldId);

              if (indicator.class === "better") {
                valueSpan.classList.add("metric-better");
              } else if (indicator.class === "worse") {
                valueSpan.classList.add("metric-worse");
              }

              wrapper.appendChild(indicatorSpan);
              wrapper.appendChild(valueSpan);

              // Replace element content
              element.parentNode.replaceChild(wrapper, element);
            } else {
              console.warn(`Element with ID '${fieldId}' not found.`);
            }

            if (medianElement) {
              const medianValue = allMedians[fieldId];
              medianElement.textContent = formatMetricValue(
                medianValue,
                fieldId
              );
            } else {
              console.warn(
                `Median element for ID '${fieldId}_median' not found.`
              );
            }
          });
        } else {
          console.error(`Stock data not found for symbol: ${stockSymbol}`);
          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            if (element) element.textContent = "Data not found";
            const medianElement = document.getElementById(fieldId + "_median");
            if (medianElement) medianElement.textContent = "N/A";
          });
        }
      })
      .catch((error) => {
        console.error("Error loading or processing stock data:", error);
        dataFields.forEach((fieldId) => {
          const element = document.getElementById(fieldId);
          if (element) element.textContent = "Error loading data";
          const medianElement = document.getElementById(fieldId + "_median");
          if (medianElement) medianElement.textContent = "Error";
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
