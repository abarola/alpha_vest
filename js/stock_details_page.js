document.addEventListener("DOMContentLoaded", function () {
  // Function to get URL parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
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
    document.title = `Stock Details - ${stockSymbol}`; // Use document.title
    document.getElementById("stock-symbol-header").textContent = stockSymbol;

    // Fetch and process the Excel file
    fetch("../data/financials_analysis_dashboard_offset_0.xlsx") // Adjusted path
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Assuming your data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to JSON. Assumes first row is header.
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Find the stock data for the given symbol
        // Assumes your Excel has a column named 'symbol' (case-sensitive)
        const stockData = jsonData.find((row) => row.symbol === stockSymbol);

        if (stockData) {
          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            if (element) {
              if (
                stockData[fieldId] !== undefined &&
                stockData[fieldId] !== null
              ) {
                let value = stockData[fieldId];
                let formattedValue = value; // Default to original value if not a number or no specific format

                if (typeof value === "number") {
                  switch (fieldId) {
                    case "tang_equity_over_tot_liab":
                    case "capital_intensity_reverse":
                    case "roic_over_wacc":
                    case "price_to_earnings":
                    case "peg":
                    case "price_to_tangible_book": // Assuming two decimals as per common practice for ratios
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
                      formattedValue = (value * 100).toFixed(2); // Multiplied by 100, two decimals
                      break;
                    default:
                      // Default formatting for any other numbers if necessary
                      formattedValue = value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      break;
                  }
                } else {
                  // If value is not a number, display as is (or handle as needed)
                  formattedValue = value;
                }
                element.textContent = formattedValue;
              } else {
                element.textContent = "N/A"; // Or some other placeholder
              }
            } else {
              console.warn(`Element with ID '${fieldId}' not found.`);
            }
          });
        } else {
          console.error(`Stock data not found for symbol: ${stockSymbol}`);
          dataFields.forEach((fieldId) => {
            const element = document.getElementById(fieldId);
            if (element) element.textContent = "Data not found";
          });
        }
      })
      .catch((error) => {
        console.error("Error loading or processing stock data:", error);
        dataFields.forEach((fieldId) => {
          const element = document.getElementById(fieldId);
          if (element) element.textContent = "Error loading data";
        });
      });
  } else {
    console.error("No stock symbol provided in URL.");
    // Optionally, hide the sections or show a message on the page
    document.getElementById("stock-symbol-title").textContent = "N/A";
    document.getElementById("stock-symbol-header").textContent = "N/A";
    dataFields.forEach((fieldId) => {
      const element = document.getElementById(fieldId);
      if (element) element.textContent = "No symbol";
    });
  }
});
