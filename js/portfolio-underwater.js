/* Original image plus verified aggregate statistics; no raw portfolio values in the browser. */
(() => {
  async function mountStatistics(card, img) {
    const section = document.createElement('section');
    section.className = 'underwater-statistics';
    section.setAttribute('aria-label', 'Portfolio historical drawdown statistics');
    section.innerHTML = '<p class="underwater-stat-status" role="status">Loading historical comparison…</p>';
    card.querySelector('.chart-reader-caption').after(section);
    try {
      const source = new URL(img.getAttribute('src'), document.baseURI);
      const summaryURL = new URL(source); summaryURL.pathname = summaryURL.pathname.replace(/\.png$/i, '.json');
      const [summaryResponse, imageResponse] = await Promise.all([
        fetch(summaryURL, { cache: 'no-cache' }), fetch(source, { cache: 'no-cache' })
      ]);
      if (!summaryResponse.ok || !imageResponse.ok) throw new Error('missing');
      const data = await summaryResponse.json();
      const digest = await crypto.subtle.digest('SHA-256', await imageResponse.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== data.image_sha256) throw new Error('mismatch');
      if (data.schema_version !== 1 || !Number.isInteger(data.current_days) || data.current_days < 0 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(data.as_of) || !/^\d{4}-\d{2}-\d{2}$/.test(data.start) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(data.reference_end) || data.start > data.reference_end || data.reference_end >= data.as_of ||
          !Number.isInteger(data.observations) || data.observations < 2) throw new Error('schema');
      for (const name of ['all', 'underwater']) {
        const sample = data.comparisons?.[name];
        if (!sample || !Number.isInteger(sample.count) || sample.count < 0 || sample.count >= data.observations) throw new Error('schema');
        for (const key of ['longer', 'deeper', 'same_duration', 'same_depth']) {
          const count = sample.counts?.[key], pct = sample.percentages?.[key];
          if (!Number.isInteger(count) || count < 0 || count > sample.count ||
              (sample.count === 0 ? pct !== null : typeof pct !== 'number' || !Number.isFinite(pct) || Math.abs(pct - 100 * count / sample.count) > .011)) throw new Error('schema');
        }
        for (const q of ['50', '75', '90', '95']) {
          const value = sample.duration_quantiles?.[q];
          if (sample.count === 0 ? value !== null : typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('schema');
        }
      }
      const date = value => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
      section.replaceChildren();
      section.innerHTML = `<div class="underwater-stat-head"><div><p class="underwater-kicker">YOUR PORTFOLIO · HISTORICAL CONTEXT</p><h4>How often was it worse?</h4><p class="underwater-stat-date"></p></div>
        <label>Compare with <select aria-label="Historical comparison sample"><option value="all">All earlier dates</option><option value="underwater">Only dates below a high</option></select></label></div>
        <div class="underwater-stat-results" aria-live="polite" aria-atomic="true"></div>
        <details class="underwater-stat-method"><summary>How these percentages are calculated</summary><p>Each observed date counts once. “Worse” means strictly longer time below a high, or a strictly larger monetary shortfall. Equal values are shown separately. The latest observation is excluded from its own comparison; days at a high are included unless you select only dates below a high.</p><p>Duration is elapsed calendar days since the most recent equal or higher portfolio close. The quantiles describe daily duration observations, not completed recovery lengths. Long episodes contribute many observations. The first available value anchors this history. No values are filled in for missing dates.</p><p>Depth uses the same monetary drawdown measure as the original graph; changing portfolio size affects comparisons. These are historical frequencies for the reconstructed portfolio, not independent-event probabilities or a forecast of recovery.</p></details>`;
      section.querySelector('.underwater-stat-date').textContent = `As of ${date(data.as_of)} · History from ${date(data.start)}`;
      const results = section.querySelector('.underwater-stat-results');
      function render() {
        const sample = data.comparisons[section.querySelector('select').value];
        const number = value => value.toLocaleString('en-GB', {maximumFractionDigits:1});
        results.replaceChildren();
        const grid = document.createElement('div'); grid.className = 'underwater-stat-grid';
        const current = document.createElement('div'); current.className = 'underwater-stat-card';
        const value = document.createElement('strong'); value.textContent = `${number(data.current_days)} days`;
        const label = document.createElement('span'); label.textContent = data.at_high ? 'At a previous high or above' : 'Current time below the high';
        current.append(value, label); grid.append(current);
        for (const [key, title, tie] of [['longer','of earlier dates had a longer duration','same_duration'], ['deeper','of earlier dates had a deeper drawdown','same_depth']]) {
          const cell = document.createElement('div'); cell.className = 'underwater-stat-card';
          const big = document.createElement('strong');
          big.textContent = sample.count ? `${number(sample.percentages[key])}%` : 'No prior sample';
          const text = document.createElement('span'); text.textContent = title;
          const detail = document.createElement('small');
          detail.textContent = sample.count ? `${number(sample.counts[key])} of ${number(sample.count)} dates · ${number(sample.percentages[tie])}% tied` : 'No earlier dates were below a high.';
          cell.append(big, text, detail); grid.append(cell);
        }
        results.append(grid);
        const hint = document.createElement('p'); hint.className = 'underwater-stat-hint';
        hint.textContent = `Lower percentages mean this state was less common in the selected history. Comparison ends ${date(data.reference_end)}.`;
        results.append(hint);
        if (sample.count) {
          const quantiles = document.createElement('div'); quantiles.className = 'underwater-quantiles';
          const title = document.createElement('p'); title.textContent = 'Time below high · historical duration quantiles'; quantiles.append(title);
          const levels = document.createElement('div');
          for (const [q, label] of [['50','Median'],['75','75th percentile'],['90','90th percentile'],['95','95th percentile']]) {
            const item = document.createElement('span');
            const name = document.createElement('small'); name.textContent = label;
            const value = document.createElement('strong'); value.textContent = `${number(sample.duration_quantiles[q])} days`;
            item.append(name,value); levels.append(item);
          }
          quantiles.append(levels);
          const explanation = document.createElement('small'); explanation.textContent = 'The 90th percentile is a duration at or below which roughly 90% of the selected observations fall.';
          quantiles.append(explanation); results.append(quantiles);
        }
      }
      section.querySelector('select').addEventListener('change',render); render();
    } catch (error) {
      section.replaceChildren();
      const status = document.createElement('p'); status.className = 'underwater-stat-status'; status.setAttribute('role','status');
      status.textContent = error.message === 'mismatch' ? 'Historical statistics do not match this chart version. Regenerate the chart and its statistics together. The original chart is still available below.' : 'Historical statistics could not be verified. The original chart is still available below; regenerate its statistics or refresh to try again.';
      section.append(status);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('chart-Portfolio_time_under_water_analysis');
    if (!card) return;
    const frame = card.querySelector('.chart-reader-frame');
    const img = frame?.querySelector('img');
    if (!img) return;
    card.classList.add('underwater-reader');
    const toolbar = card.querySelector('.chart-reader-toolbar');
    toolbar.hidden = true;
    const canvas = document.createElement('div');
    canvas.className = 'underwater-canvas';
    frame.append(canvas);
    canvas.append(img);
    frame.classList.add('underwater-frame');
    frame.setAttribute('aria-label', 'Portfolio drawdown chart. At higher zoom, scroll horizontally to explore dates.');
    frame.tabIndex = 0;
    const controls = document.createElement('div');
    controls.className = 'underwater-controls';
    controls.innerHTML = `<div class="underwater-modes" role="group" aria-label="Chart view">
      <button type="button" data-view="duration" aria-pressed="true">Time below high</button>
      <button type="button" data-view="depth" aria-pressed="false">Drawdown depth</button>
      <button type="button" data-view="both" aria-pressed="false">Both together</button>
    </div><label class="underwater-zoom">Zoom <input type="range" min="100" max="250" step="25" value="100" aria-label="Chart zoom"><output>100%</output></label>
    <button type="button" class="underwater-reset">Reset view</button>`;
    const insight = document.createElement('div');
    insight.className = 'underwater-insight';
    insight.setAttribute('aria-live', 'polite');
    const notes = {
      duration: ['How long has recovery taken?', 'Taller peaks mark longer stretches below a previous portfolio high. Compare their height to find the most prolonged episodes in the displayed history.'],
      depth: ['How large was the shortfall?', 'Deeper troughs mark larger monetary losses from a previous portfolio high. These are amounts, not percentage declines; portfolio size affects the comparison.'],
      both: ['Read duration and depth together', 'The longest recovery and the largest loss need not be the same episode. Match dates across the two panels to compare them.']
    };
    let mode = 'duration';
    function setMode(next) {
      mode = next;
      canvas.dataset.view = next;
      controls.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
      insight.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = notes[next][0];
      const text = document.createElement('p');
      text.textContent = notes[next][1];
      insight.append(title, text);
    }
    controls.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.view)));
    const zoom = controls.querySelector('input');
    function setZoom() {
      canvas.style.width = `max(${zoom.value}%, ${Number(zoom.value) * 7.2}px)`;
      controls.querySelector('output').value = `${zoom.value}%`;
    }
    zoom.addEventListener('input', setZoom);
    controls.querySelector('.underwater-reset').addEventListener('click', () => {
      zoom.value = '100'; setZoom(); setMode('duration'); frame.scrollTo(0, 0);
    });
    const footer = document.createElement('div');
    footer.className = 'underwater-footer';
    footer.innerHTML = '<span>Original portfolio chart · Zoom, then scroll to inspect dates.</span><button type="button">Open full original ↗</button>';
    footer.querySelector('button').addEventListener('click', () => {
      toolbar.querySelector('button:last-child').click();
      document.dispatchEvent(new CustomEvent('chart-reader-opener', { detail: footer.querySelector('button') }));
    });
    frame.before(controls, insight);
    frame.after(footer);
    setMode(mode);
    mountStatistics(card, img);
    img.addEventListener('error', () => {
      insight.textContent = 'The portfolio chart could not be loaded. Refresh the page to try again.';
      controls.querySelectorAll('button, input').forEach(el => { el.disabled = true; });
    });
  });
})();
