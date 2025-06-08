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
      return "N/A"; // Return "N/A" if not a valid number
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
      case "roe_tangible_equity":
      case "cash_conversion_ratio":
      case "earnings_yield":
      case "fcf_yield":
      case "avg_5years_eps_growth":
      case "avg_5years_revenue_growth":
      case "expected_growth_market_cap_10Y":
        formattedValue = (value * 100).toFixed(2) + "%";
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

  // Get the stock symbol from the URL
  const stockSymbol = getQueryParam("symbol");

  // Column names mapping to HTML element IDs
  const dataFields = [
    "tang_equity_over_tot_liab",
    "capital_intensity_reverse",
    "cagr_tangible_book_per_share",
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
          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            const medianElement = document.getElementById(fieldId + "_median");

            if (element) {
              const value = stockData[fieldId];
              if (value !== undefined && value !== null) {
                element.textContent = formatMetricValue(value, fieldId);
              } else {
                element.textContent = "N/A";
              }
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
