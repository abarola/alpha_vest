/* Shared presentation for the existing chart images; source data stays unchanged. */
(() => {
  const descriptions = {
    portfolio_company_valuation_map_yahoo_ttm: ["Free cash flow yield vs. valuation", "Compare cash generation with price to tangible book value. Bubble size shows portfolio weight; dashed lines mark portfolio reference levels.", "Valuation map", "Valuation"],
    portfolio_company_roic_roe_wacc_dashboard: ["Profitability and the cost of capital", "Compare each company’s ROIC, ROE and WACC side by side, then use the detailed notes to interpret the gaps.", "Profitability", "Valuation"],
    stock_momentum_dashboard: ["Price momentum across the portfolio", "Read each company’s price alongside its 100-day and 200-day moving averages to compare the strength of its trend.", "Price momentum", "Momentum & signals"],
    Portfolio_time_under_water_analysis: ["Time below a previous high", "Compare how long each position has remained below its previous peak, alongside the depth of its drawdown.", "Time underwater", "Drawdowns"],
    return_required_for_all_time_high: ["The climb back to an all-time high", "Compare the percentage gain each stock would need to regain its previous high.", "Recovery to a high", "Drawdowns"],
    inverse_quantile_dd: ["Current drawdown in historical context", "Compare today’s drawdown with each stock’s historical drawdown distribution. Open the reading notes for the indicator’s interpretation.", "Historical drawdowns", "Drawdowns"],
    potential_buying_signals: ["Potential entry signals", "Review the highlighted signals alongside the underlying price history and moving averages.", "Entry signals", "Momentum & signals"],
    performance_oversold_strategy: ["Oversold strategy performance", "Follow the plotted performance history to assess how the oversold strategy behaved over time.", "Oversold strategy", "Return & risk"],
    bubble_chart_Average_CAGR_invquant_dd: ["Long-run return and drawdown context", "Compare average compound annual returns with the drawdown indicator across the plotted stocks.", "Average returns", "Return & risk"],
    bubble_chart_CAGR_for_Year_2021_invquant_dd: ["2021 returns and drawdown context", "Compare the plotted 2021 annual-return measure with the drawdown indicator for each stock.", "2021 returns", "Return & risk"],
    bubble_chart_CAGR_for_Year_2024_invquant_dd: ["2024 returns and drawdown context", "Compare the plotted 2024 annual-return measure with the drawdown indicator for each stock.", "2024 returns", "Return & risk"],
    distance_chart_Euclidean_Distances_from_VTI_Average_CAGR_vs_invquant_dd: ["Distance from VTI: average returns", "Compare each stock’s distance from VTI using the chart’s return and drawdown measures.", "VTI · average", "Return & risk"],
    distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2020_vs_invquant_dd: ["Distance from VTI: 2020 returns", "Compare the plotted distances from VTI using the 2020 return measure and drawdown indicator.", "VTI · 2020", "Return & risk"],
    distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2023_vs_invquant_dd: ["Distance from VTI: 2023 returns", "Compare the plotted distances from VTI using the 2023 return measure and drawdown indicator.", "VTI · 2023", "Return & risk"],
    composite_indicator_analysis: ["Combined portfolio signals", "Read the combined indicator alongside its component signals; the reading notes explain the calculation.", "Combined signals", "Momentum & signals"],
    relative_pe_analysis: ["Valuation relative to earnings history", "Compare the plotted price-to-earnings measures with their historical reference levels.", "Relative P/E", "Valuation"],
    implied_eps_growth_comparison: ["Earnings growth priced into valuations", "Compare earnings-growth demand gaps over one, three and five years, together with current and normalized P/E multiples.", "Earnings expectations", "Valuation"],
    CSSPX_Mi_CAGR: ["Index returns across holding periods", "Compare the annualized returns shown for different holding periods in the index’s history.", "Returns"],
    CSSPX_Mi_price_moving_averages: ["Index price and long-term trend", "Follow the index price against its moving averages to put short-term moves in context.", "Price trend"],
    sp500_real_price_bubble_indicator: ["Real S&P 500 price and trend bands", "Compare inflation-adjusted prices with the long-run trend and two-standard-deviation reference band.", "Valuation context"],
    macro_inflation_m1_treasuries: ["Inflation, money supply and Treasury rates", "Read the series together to compare changes in inflation, liquidity and interest rates."],
    ism_manufacturing_actual: ["US manufacturing activity", "Follow the ISM manufacturing series over time and compare its latest reading with earlier cycles."],
    usd_purchasing_power_depreciation: ["The dollar’s purchasing power over time", "Trace the change in purchasing power across the period shown."],
    gold_vol_quantiles: ["Gold volatility in historical context", "Compare the latest gold-volatility reading with its historical distribution."],
    vix_quantiles: ["Market volatility: the VIX", "Compare the latest VIX reading with its historical distribution."],
    unemployment_rate_US_quantiles: ["US unemployment in historical context", "Compare the latest unemployment reading with the historical levels shown."],
    "10Y_3M_treasury_spread_quantiles": ["The Treasury yield curve: 10 years vs. 3 months", "Follow the spread between long- and short-term Treasury yields and compare it with past observations."],
    copper_gold_ratio_quantiles: ["The copper-to-gold ratio", "Compare the copper-to-gold ratio over time and within its historical distribution."],
    equity_risk_premium_quantiles: ["Equity risk premium in context", "Compare the plotted equity risk premium with its historical reference levels."],
    high_yield_quantiles: ["High-yield credit conditions", "Compare the plotted high-yield measure with its historical distribution."],
    M1_change_quantiles: ["Changes in the money supply", "Follow changes in M1 and compare them with the historical distribution shown."],
    housing_price_index_and_debt_service: ["House prices and debt-service costs", "Compare the housing-price and debt-service series over time."],
    short_term_debt_cycle: ["The short-term debt cycle", "Use this cycle diagram as a framework for interpreting the accompanying economic indicators."],
    real_estate_cycle: ["The real estate cycle", "Use the illustrated phases to place housing-market observations in context."],
    coal_price_history: ["Coal prices over time", "Compare recent coal prices with the historical price path shown."],
    oil_price_quantiles: ["Oil prices in historical context", "Compare the latest oil-price observation with its historical distribution."],
    top_stocks_superinvestors_count: ["The stocks held by the most investors", "Compare the number of tracked investors holding each stock.", "Investor count"],
    top_stocks_superinvestors_weighted_top_position: ["Shared conviction in top positions", "Compare the ranking weighted by investors’ top positions.", "Top positions"],
    top_stocks_superinvestors_weighted_portfolio_value: ["Holdings weighted by portfolio value", "Compare stock exposure using the portfolio-value weighting shown in the chart.", "Portfolio value"],
    box_by_offset: ["Return distributions by offset", "Compare medians, ranges and outliers across selection offsets to see how variable the results are.", "Return ranges"],
    current_vs_next_scatter: ["Do strong returns persist?", "Compare returns in one holding period with the next. The scatter shows how closely successive results move together.", "Persistence"],
    heatmap_mean_return: ["Returns across years and offsets", "Read across years and offsets to see where average forward returns were stronger or weaker.", "Year-by-year"],
    return_histogram: ["The spread of forward returns", "Compare the shape of the distribution with its mean and median to see how much extreme outcomes matter.", "Distribution"],
    offset1_ytd_bars: ["Year-to-date returns of current selections", "Compare the YTD price returns of the latest offset-1 selections. These are stock returns, not returns since portfolio entry."],
    aggregate_ranking_power_law_multi_scale: ["Rankings across multiple timeframes", "Compare the aggregate ranking across the timeframes included in this analysis."],
  };
  for (let offset = 1; offset <= 8; offset++) {
    descriptions[`cumulative_return_BT_strategy_offset_${offset}`] = [
      `Strategy growth · rebalance offset ${offset}`,
      "Compare cumulative growth across the plotted strategies and reference series. Switch offsets to check how the result changes with rebalance timing.",
      `Offset ${offset}`,
    ];
  }

  const dimensions = {"sp500_real_price_bubble_indicator":[4764,3580],"cumulative_return_BT_strategy_offset_8":[1280,960],"CSSPX_Mi_price_moving_averages":[4771,2985],"cumulative_return_BT_strategy_offset_1":[1280,960],"cumulative_return_BT_strategy_offset_2":[1280,960],"cumulative_return_BT_strategy_offset_3":[1280,960],"cumulative_return_BT_strategy_offset_7":[1280,960],"cumulative_return_BT_strategy_offset_6":[1280,960],"cumulative_return_BT_strategy_offset_4":[1280,960],"cumulative_return_BT_strategy_offset_5":[1280,960],"CSSPX_Mi_CAGR":[1200,1000],"composite_indicator_analysis":[4771,3575],"distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2024_vs_invquant_dd":[4771,3575],"distance_chart_Euclidean_Distances_from_VTI_Average_CAGR_vs_invquant_dd":[4772,3575],"stock_momentum_dashboard":[2184,3033],"distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2021_vs_invquant_dd":[4772,3575],"portfolio_company_valuation_map_yahoo_ttm":[3260,2000],"performance_oversold_strategy":[1200,1000],"bubble_chart_CAGR_for_Year_2021_invquant_dd":[4769,3575],"portfolio_company_roic_roe_wacc_dashboard":[3440,2958],"bubble_chart_CAGR_for_Year_2024_invquant_dd":[4769,3575],"distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2023_vs_invquant_dd":[4771,3575],"return_required_for_all_time_high":[1280,960],"Portfolio_time_under_water_analysis":[1280,960],"inverse_quantile_dd":[1280,960],"relative_pe_analysis":[8981,2233],"compounding_effect_analysis":[4772,3544],"distance_chart_Euclidean_Distances_from_VTI_CAGR_for_Year_2020_vs_invquant_dd":[4772,3577],"potential_buying_signals":[1280,960],"bubble_chart_Average_CAGR_invquant_dd":[4769,3575],"implied_eps_growth_comparison":[3008,9646],"top_stocks_superinvestors_count":[1057,805],"top_stocks_superinvestors_weighted_top_position":[1056,805],"top_stocks_superinvestors_weighted_portfolio_value":[1058,805],"10Y_3M_treasury_spread_quantiles":[4769,3575],"ism_manufacturing_actual":[1800,1200],"asset_classes_levels":[4769,3575],"gold_vol_quantiles":[4769,3575],"real_estate_cycle":[4769,3575],"short_term_debt_cycle":[4769,3575],"vix_quantiles":[4766,3575],"asset_classes_returns":[4766,3575],"macro_environment_analysis":[4769,3552],"oil_price_quantiles":[4769,3575],"housing_price_index_and_debt_service":[4769,3552],"unemployment_rate_US_quantiles":[4766,3575],"usd_purchasing_power_depreciation":[4765,3579],"copper_gold_ratio_quantiles":[4769,3575],"M1_change_quantiles":[4769,3575],"coal_price_history":[1200,600],"macro_inflation_m1_treasuries":[4766,3575],"high_yield_quantiles":[4769,3575],"equity_risk_premium_quantiles":[4769,3575],"aggregate_ranking_power_law_multi_scale":[1492,901],"heatmap_mean_return":[1342,1048],"box_by_offset":[1491,876],"current_vs_next_scatter":[1492,899],"offset1_ytd_bars":[1788,935],"return_histogram":[1491,899]};

  const galleries = "#gallery-portfolio, #gallery-indext-stat, #gallery-strategy-return, #macro-gallery, #si-metrics, #pl-historical, #pl-ytd, #pl-multi-timeframe";
  let sequence = 0;
  const readers = new Map();

  function mount(root) {
    if (!root) return;
    const cards = Array.from(root.children).filter((el) => el.classList.contains("image-card") && el.querySelector("img"));
    if (!cards.length || cards.every((card) => card.dataset.readerReady)) return;
    root.querySelector(".chart-reader-controls")?.remove();
    root.classList.add("chart-reader");
    const id = root.id || `chart-reader-${++sequence}`;
    const items = cards.map((card, index) => {
      const img = card.querySelector("img");
      const filename = new URL(img.src).pathname.split("/").pop();
      const key = filename.replace(/\.[^.]+$/, "");
      const original = card.querySelector("figcaption");
      const fallback = original?.textContent.trim() || img.alt;
      const [title, summary, label = title, group = "Charts"] = descriptions[key] || [fallback, "Read the plotted series and reference levels together; enlarge the chart for finer detail."];
      card.id ||= `chart-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      card.dataset.readerReady = "true";
      card.classList.remove("hidden-mobile");
      const figure = card.tagName === "FIGURE" ? card : card.querySelector("figure");
      const caption = original || document.createElement("figcaption");
      caption.className = "chart-reader-caption";
      caption.replaceChildren();
      const heading = document.createElement("h3");
      heading.id = `${id}-title-${index}`;
      heading.textContent = title;
      const description = document.createElement("p");
      description.textContent = summary;
      caption.append(heading, description);
      figure.prepend(caption);
      img.alt = title;
      img.dataset.caption = title;
      const size = dimensions[key];
      if (size) {
        img.width = size[0];
        img.height = size[1];
        card.style.setProperty("--chart-reading-width", `${Math.min(1600, Math.max(960, Math.round(size[0] * 0.5)))}px`);
      }
      img.loading = index === 0 ? "eager" : "lazy";
      const frame = document.createElement("div");
      frame.className = "chart-reader-frame";
      frame.classList.toggle("is-fitted", window.matchMedia("(min-width: 769px)").matches);
      frame.setAttribute("role", "region");
      frame.setAttribute("aria-label", `${title} — scroll to read the full chart`);
      frame.tabIndex = 0;
      img.before(frame);
      frame.append(img);
      const toolbar = document.createElement("div");
      toolbar.className = "chart-reader-toolbar";
      const hint = document.createElement("span");
      hint.className = "chart-reader-hint";
      hint.textContent = "Scroll within the chart to read all labels.";
      const fit = document.createElement("button");
      fit.type = "button";
      fit.textContent = frame.classList.contains("is-fitted") ? "Reading size" : "Fit width";
      fit.addEventListener("click", () => {
        const fitted = frame.classList.toggle("is-fitted");
        fit.textContent = fitted ? "Reading size" : "Fit width";
        frame.scrollTo(0, 0);
        refreshHint();
      });
      const enlarge = document.createElement("button");
      enlarge.type = "button";
      enlarge.textContent = "Enlarge chart ↗";
      enlarge.addEventListener("click", () => img.click());
      toolbar.append(hint, fit, enlarge);
      frame.before(toolbar);
      const refreshHint = () => {
        if (card.hidden) return;
        const overflow = frame.scrollWidth > frame.clientWidth + 1 || frame.scrollHeight > frame.clientHeight + 1;
        hint.textContent = overflow ? "Scroll within the chart to read all labels." : "Full chart shown. Enlarge for finer detail.";
        frame.tabIndex = overflow ? 0 : -1;
      };
      img.addEventListener("load", refreshHint);
      img.addEventListener("error", () => {
        hint.textContent = "This chart could not be loaded. Try refreshing the page.";
        fit.disabled = true;
        enlarge.disabled = true;
      });
      if (typeof ResizeObserver === "function") new ResizeObserver(refreshHint).observe(frame);
      return { card, title, label, group, heading, img, refreshHint };
    });

    const controls = document.createElement("div");
    controls.className = "chart-reader-controls";
    root.prepend(controls);
    const overview = document.createElement("div");
    overview.className = "chart-overview";
    const modebar = document.createElement("div");
    modebar.className = "chart-reader-modebar";
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "← Back to overview";
    const overviewNote = document.createElement("p");
    overviewNote.textContent = `${items.length} charts · Scan the overview, then choose a chart to read in detail.`;
    modebar.append(overviewNote, back);
    root.prepend(modebar, overview);
    let overviewMode = items.length > 1;
    let returnPosition = null;
    let previewOpener = null;
    let activeIndex = 0;
    const useTabs = items.length > 1 && items.length <= 8 && root.id !== "macro-gallery";
    let select;
    let tabs = [];
    const counter = document.createElement("span");
    counter.className = "chart-reader-count";
    counter.setAttribute("aria-live", "polite");
    const activate = (index, updateURL = false) => {
      activeIndex = index;
      overview.hidden = !overviewMode;
      controls.hidden = overviewMode;
      overviewNote.hidden = !overviewMode;
      back.hidden = overviewMode || items.length === 1;
      modebar.hidden = items.length === 1;
      items.forEach((item, i) => {
        item.card.hidden = overviewMode || i !== index;
        if (tabs[i]) {
          tabs[i].setAttribute("aria-selected", String(i === index));
          tabs[i].tabIndex = i === index ? 0 : -1;
        }
      });
      if (select) select.value = String(index);
      counter.textContent = `Chart ${index + 1} of ${items.length}`;
      items[index].img.loading = "eager";
      items[index].refreshHint();
      if (updateURL) history.replaceState(null, "", `#${items[index].card.id}`);
    };
    items.forEach((item, index) => {
      const preview = document.createElement("article");
      preview.className = "chart-preview";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "chart-preview-open";
      open.setAttribute("aria-label", `Read chart: ${item.title}`);
      const title = document.createElement("span");
      title.className = "chart-preview-title";
      title.textContent = item.title;
      const thumbnail = item.img.cloneNode(false);
      thumbnail.removeAttribute("id");
      thumbnail.removeAttribute("tabindex");
      thumbnail.removeAttribute("fetchpriority");
      thumbnail.loading = "lazy";
      thumbnail.alt = "";
      const prompt = document.createElement("span");
      prompt.className = "chart-preview-prompt";
      prompt.textContent = "Read chart →";
      open.append(title, thumbnail, prompt);
      open.addEventListener("click", () => {
        returnPosition = window.scrollY;
        previewOpener = open;
        overviewMode = false;
        activate(index, true);
        back.focus({ preventScroll: true });
        root.scrollIntoView({ behavior: "instant", block: "start" });
      });
      const enlarge = document.createElement("button");
      enlarge.type = "button";
      enlarge.className = "chart-preview-enlarge";
      enlarge.textContent = "Enlarge ↗";
      enlarge.setAttribute("aria-label", `Enlarge chart: ${item.title}`);
      enlarge.addEventListener("click", () => {
        // Existing lightboxes open the original image, even while its reader is hidden.
        item.img.click();
        document.dispatchEvent(new CustomEvent("chart-reader-opener", { detail: enlarge }));
      });
      item.img.addEventListener("load", () => {
        if (thumbnail.src !== item.img.src) thumbnail.src = item.img.src;
      });
      preview.append(open, enlarge);
      overview.append(preview);
    });
    back.addEventListener("click", () => {
      overviewMode = true;
      activate(activeIndex);
      history.replaceState(null, "", `#${root.id}`);
      const target = previewOpener || overview.querySelectorAll(".chart-preview-open")[activeIndex];
      target?.focus({ preventScroll: true });
      if (returnPosition !== null) window.scrollTo({ top: returnPosition, behavior: "instant" });
      else target?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    if (useTabs) {
      const tablist = document.createElement("div");
      tablist.className = "chart-reader-tabs";
      tablist.setAttribute("role", "tablist");
      tablist.setAttribute("aria-label", "Chart views");
      tabs = items.map((item, index) => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.id = `${id}-tab-${index}`;
        tab.textContent = item.label;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", item.card.id);
        item.card.setAttribute("role", "tabpanel");
        item.card.setAttribute("aria-labelledby", tab.id);
        tab.addEventListener("click", () => activate(index, true));
        tab.addEventListener("keydown", (event) => {
          let next;
          if (event.key === "ArrowRight") next = (index + 1) % items.length;
          if (event.key === "ArrowLeft") next = (index + items.length - 1) % items.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = items.length - 1;
          if (next === undefined) return;
          event.preventDefault();
          activate(next, true);
          tabs[next].focus();
        });
        tablist.append(tab);
        return tab;
      });
      controls.append(tablist, counter);
    } else if (items.length > 1) {
      const label = document.createElement("label");
      label.htmlFor = `${id}-select`;
      label.textContent = "Choose a chart";
      select = document.createElement("select");
      select.id = label.htmlFor;
      const groups = new Map();
      items.forEach((item, i) => {
        if (!groups.has(item.group)) {
          const group = document.createElement("optgroup");
          group.label = item.group;
          groups.set(item.group, group);
          select.append(group);
        }
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = item.title;
        groups.get(item.group).append(option);
      });
      select.addEventListener("change", () => activate(Number(select.value), true));
      controls.append(label, select, counter);
    } else controls.remove();
    const restoreHash = () => {
      const index = items.findIndex((item) => `#${item.card.id}` === location.hash);
      if (index >= 0) {
        overviewMode = false;
        activate(index);
        requestAnimationFrame(() => items[index].card.scrollIntoView({ behavior: "instant", block: "start" }));
      } else if (location.hash === `#${root.id}`) {
        overviewMode = items.length > 1;
        activate(activeIndex);
      }
    };
    readers.set(root, restoreHash);
    activate(0);
    restoreHash();
  }

  window.ChartReader = { mount };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(galleries).forEach(mount);
    // Keep the existing lightboxes, with consistent focus handling for reader controls.
    const backdrop = document.querySelector(".lightbox-backdrop");
    if (!backdrop) return;
    let opener;
    document.addEventListener("chart-reader-opener", (event) => { opener = event.detail; });
    document.addEventListener("click", (event) => {
      if (event.target.closest(".chart-reader") &&
          (event.target.tagName === "IMG" || event.target.closest(".chart-reader-toolbar button:last-child"))) {
        opener = event.target.closest(".image-card")?.querySelector(".chart-reader-toolbar button:last-child");
      }
    }, true);
    new MutationObserver(() => {
      const open = backdrop.classList.contains("open");
      backdrop.setAttribute("aria-hidden", String(!open));
      if (open && opener) {
        backdrop.setAttribute("role", "dialog");
        backdrop.setAttribute("aria-modal", "true");
        backdrop.setAttribute("aria-label", "Enlarged chart");
        backdrop.querySelector(".lightbox-close")?.focus();
      } else if (opener) {
        opener.focus({ preventScroll: true });
        opener = null;
      }
    }).observe(backdrop, { attributes: true, attributeFilter: ["class"] });
    backdrop.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !backdrop.classList.contains("open")) return;
      const buttons = Array.from(backdrop.querySelectorAll("button:not(:disabled)")).filter((button) => button.getClientRects().length);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  });
  window.addEventListener("hashchange", () => readers.forEach((restore) => restore()));
  window.addEventListener("chart-layout-ready", () => readers.forEach((restore) => restore()));
})();
