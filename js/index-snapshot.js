(() => {
  "use strict";

  function classify(score) {
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
    if (score < 25) return { state: "very-cheap", label: "Very cheap", detail: "A deep drawdown relative to its own history. A strong signal to investigate potential value." };
    if (score < 50) return { state: "cheap", label: "May be cheap", detail: "A deeper-than-usual drawdown. The index may offer an opportunity worth a closer look." };
    if (score === 50) return { state: "neutral", label: "Neutral", detail: "At the midpoint of its historical drawdown range. No cheap or expensive signal." };
    if (score <= 80) return { state: "expensive", label: "Expensive", detail: "A shallower-than-usual drawdown. The index offers less of a drawdown discount." };
    return { state: "very-expensive", label: "Very expensive", detail: "Near the high end of its historical drawdown range. Little drawdown discount is available." };
  }

  // Also available to the focused offline boundary checks.
  if (typeof module !== "undefined" && module.exports) module.exports = { classify };
  if (typeof document === "undefined") return;

  const card = document.getElementById("index-status-card");
  if (!card) return;
  const setText = (id, value) => { document.getElementById(id).textContent = value; };
  const marker = document.getElementById("index-score-marker");

  function unavailable() {
    card.dataset.state = "unavailable";
    setText("index-signal", "Signal unavailable");
    setText("index-score", "—");
    setText("index-signal-detail", "The index snapshot could not be loaded. View the source chart for context.");
    setText("index-snapshot-date", "Analysis date unavailable");
    marker.hidden = true;
    document.getElementById("index-score-scale").setAttribute("aria-label", "Index drawdown score unavailable");
  }

  async function load() {
    try {
      const response = await fetch("data/index_snapshot.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Snapshot fetch failed");
      const data = await response.json();
      const signal = classify(data.invquant_dd);
      const stamp = data.analysis_date;
      const parsed = new Date(`${stamp}T00:00:00Z`);
      if (data.schema_version !== 1 || data.symbol !== "CSSPX.MI" || !signal ||
          typeof stamp !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(stamp) ||
          !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== stamp) {
        throw new Error("Invalid index snapshot");
      }
      card.dataset.state = signal.state;
      setText("index-score", data.invquant_dd.toLocaleString("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 2 }));
      setText("index-signal", signal.label);
      setText("index-signal-detail", signal.detail);
      setText("index-snapshot-date", `Analysis date · ${parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`);
      marker.style.left = `${data.invquant_dd}%`;
      marker.hidden = false;
      document.getElementById("index-score-scale").setAttribute("aria-label", `Drawdown score ${data.invquant_dd} out of 100: ${signal.label}. Lower scores indicate deeper historical drawdown context.`);
    } catch (error) {
      unavailable();
    }
  }
  load();
})();
