document.addEventListener("DOMContentLoaded", () => {
  const state = {
    companies: [],
    funds: [],
  };

  const elements = {
    status: document.getElementById("vc-status"),
    companyCount: document.getElementById("vc-company-count"),
    fundCount: document.getElementById("vc-fund-count"),
    sharedCount: document.getElementById("vc-shared-count"),
    maxOverlap: document.getElementById("vc-max-overlap"),
    recordCount: document.getElementById("vc-record-count"),
    topCompany: document.getElementById("vc-top-company"),
    topScore: document.getElementById("vc-top-score"),
    topFunds: document.getElementById("vc-top-funds"),
    distribution: document.getElementById("vc-distribution"),
    fundBars: document.getElementById("vc-fund-bars"),
    search: document.getElementById("vc-search"),
    minFunds: document.getElementById("vc-min-funds"),
    fundFilter: document.getElementById("vc-fund-filter"),
    sort: document.getElementById("vc-sort"),
    reset: document.getElementById("vc-reset"),
    resultsCount: document.getElementById("vc-results-count"),
    tableBody: document.querySelector("#vc-company-table tbody"),
    empty: document.getElementById("vc-empty"),
    updatedAt: document.getElementById("vc-updated-at"),
  };

  const formatNumber = new Intl.NumberFormat("en-US");

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderSummary(data) {
    const { summary } = data;
    setText(elements.companyCount, formatNumber.format(summary.company_count));
    setText(elements.fundCount, formatNumber.format(summary.fund_count));
    setText(elements.sharedCount, formatNumber.format(summary.co_invested_count));
    setText(elements.maxOverlap, `${summary.max_overlap} funds`);
    setText(elements.recordCount, formatNumber.format(summary.investment_records));

    const topCompany = state.companies[0];
    if (topCompany) {
      setText(elements.topCompany, topCompany.name);
      setText(elements.topScore, `${topCompany.total_invested} funds`);
      setText(elements.topFunds, topCompany.funds.join(" · "));
    }

    const updatedDate = new Date(data.generated_at);
    const displayDate = Number.isNaN(updatedDate.getTime())
      ? data.generated_at
      : updatedDate.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
    setText(elements.updatedAt, ` Dataset generated ${displayDate}.`);
    setText(elements.status, `Latest dataset · ${displayDate}`);
    elements.status?.classList.add("is-loaded");
  }

  function renderDistribution(distribution) {
    if (!elements.distribution) return;
    elements.distribution.replaceChildren();
    const maxCount = Math.max(...distribution.map((item) => item.company_count), 1);

    [...distribution].reverse().forEach((item) => {
      const row = createElement("div", "vc-distribution-row");
      const label = createElement(
        "span",
        "vc-distribution-label",
        `${item.investor_count} ${item.investor_count === 1 ? "fund" : "funds"}`,
      );
      const track = createElement("span", "vc-distribution-track");
      const bar = createElement("span", "vc-distribution-bar");
      bar.style.width = `${Math.max((item.company_count / maxCount) * 100, 2)}%`;
      track.appendChild(bar);
      const value = createElement(
        "strong",
        "vc-distribution-value",
        formatNumber.format(item.company_count),
      );
      row.append(label, track, value);
      elements.distribution.appendChild(row);
    });
  }

  function renderFundBars() {
    if (!elements.fundBars) return;
    elements.fundBars.replaceChildren();
    const maxCount = Math.max(...state.funds.map((fund) => fund.company_count), 1);

    state.funds.forEach((fund, index) => {
      const card = createElement("article", "vc-fund-card");
      const heading = createElement("div", "vc-fund-heading");
      const label = createElement("span", "vc-fund-name", fund.name);
      const value = createElement(
        "strong",
        "vc-fund-count",
        formatNumber.format(fund.company_count),
      );
      const track = createElement("div", "vc-fund-track");
      const bar = createElement("div", "vc-fund-bar");
      bar.style.setProperty("--fund-width", `${(fund.company_count / maxCount) * 100}%`);
      bar.style.setProperty("--fund-delay", `${index * 35}ms`);
      heading.append(label, value);
      track.appendChild(bar);
      card.append(heading, track);
      elements.fundBars.appendChild(card);
    });
  }

  function populateFundFilter() {
    state.funds
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((fund) => {
        const option = document.createElement("option");
        option.value = fund.name;
        option.textContent = fund.name;
        elements.fundFilter?.appendChild(option);
      });
  }

  function filteredCompanies() {
    const query = elements.search?.value.trim().toLocaleLowerCase() || "";
    const minimum = Number(elements.minFunds?.value || 1);
    const selectedFund = elements.fundFilter?.value || "";
    const sortMode = elements.sort?.value || "overlap";

    const filtered = state.companies.filter((company) => {
      const matchesName = company.name.toLocaleLowerCase().includes(query);
      const matchesMinimum = company.total_invested >= minimum;
      const matchesFund = !selectedFund || company.funds.includes(selectedFund);
      return matchesName && matchesMinimum && matchesFund;
    });

    filtered.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      return b.total_invested - a.total_invested || a.name.localeCompare(b.name);
    });
    return filtered;
  }

  function renderTable() {
    if (!elements.tableBody) return;
    const companies = filteredCompanies();
    const fragment = document.createDocumentFragment();

    companies.forEach((company, index) => {
      const row = document.createElement("tr");
      const rank = createElement("td", "vc-rank-cell", String(index + 1));
      const name = createElement("td", "vc-company-name", company.name);
      const overlap = createElement("td");
      const badge = createElement(
        "span",
        "vc-overlap-badge",
        String(company.total_invested),
      );
      if (company.total_invested >= 3) badge.classList.add("is-strong");
      overlap.appendChild(badge);
      const funds = document.createElement("td");
      const list = createElement("div", "vc-fund-list");
      company.funds.forEach((fundName) => {
        list.appendChild(createElement("span", "vc-fund-tag", fundName));
      });
      funds.appendChild(list);
      row.append(rank, name, overlap, funds);
      fragment.appendChild(row);
    });

    elements.tableBody.replaceChildren(fragment);
    setText(
      elements.resultsCount,
      `${formatNumber.format(companies.length)} ${companies.length === 1 ? "company" : "companies"}`,
    );
    if (elements.empty) elements.empty.hidden = companies.length !== 0;
  }

  function wireControls() {
    [elements.search, elements.minFunds, elements.fundFilter, elements.sort].forEach(
      (control) => {
        control?.addEventListener(control === elements.search ? "input" : "change", renderTable);
      },
    );

    elements.reset?.addEventListener("click", () => {
      if (elements.search) elements.search.value = "";
      if (elements.minFunds) elements.minFunds.value = "2";
      if (elements.fundFilter) elements.fundFilter.value = "";
      if (elements.sort) elements.sort.value = "overlap";
      renderTable();
      elements.search?.focus();
    });
  }

  async function loadData() {
    try {
      const response = await fetch("data/venture_capital.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data request failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.companies) || !Array.isArray(data.funds)) {
        throw new Error("The dataset has an unexpected format");
      }
      state.companies = data.companies;
      state.funds = data.funds;
      renderSummary(data);
      renderDistribution(data.distribution || []);
      renderFundBars();
      populateFundFilter();
      renderTable();
      wireControls();
    } catch (error) {
      console.error("Unable to load venture capital data", error);
      setText(
        elements.status,
        "Venture capital data is temporarily unavailable. Run the portfolio deployment to refresh it.",
      );
      elements.status?.classList.add("is-error");
    }
  }

  loadData();
});
