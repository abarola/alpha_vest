const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const {validate, number, validDate} = require('./js/eurusd-macro.js');
const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/eurusd_yield_spread.json'), 'utf8'));
assert.equal(validate(original), true);
let count = 1;
const invalid = change => {
  const data = structuredClone(original); change(data);
  assert.equal(validate(data), false); count++;
};
invalid(data => data.schema_version = 2);
invalid(data => data.as_of = '2026-02-30');
invalid(data => data.latest.eurusd = null);
invalid(data => data.latest.eurusd = '1.1165');
invalid(data => data.history.spread_bps[0] += 100);
invalid(data => data.history.us_10y_pct[0] = null);
invalid(data => data.dates[1] = data.dates[0]);
invalid(data => data.history.eurusd.pop());
invalid(data => data.quantiles[0].latest_percentile = null);
invalid(data => data.quantiles[0].latest_percentile = 101);
invalid(data => data.quantiles[0].latest_percentile = '50');
invalid(data => data.quantiles[0].p10 = data.quantiles[0].p90 + 1);
invalid(data => data.quantiles[0].window_end_inclusive = '2026-10-31');
invalid(data => data.quantiles[1] = data.quantiles[0]);
invalid(data => data.quantiles[0] = null);
invalid(data => data.sources[0].url = 'javascript:alert(1)');
invalid(data => data.sources[0].url = 'https://example.com/');
const zeros = structuredClone(original);
zeros.quantiles[0].latest_percentile = 0;
assert.equal(validate(zeros), true); count++;
const missing = structuredClone(original);
missing.quantiles[0].observations = 2;
for(const key of ['p10','p50','p90','latest_percentile']) missing.quantiles[0][key] = null;
assert.equal(validate(missing), true); count++;
assert.equal(number(null), '—');
assert.equal(number(0), '0.0');
assert.equal(number(-0.5), '-0.5');
assert.equal(validDate('2026-02-30'), false);
assert.equal(validDate('2024-02-29'), true);
console.log(`PASS: ${count} public schema/unit/null/date/quantile/source cases; zero/negative/unavailable formatting`);

const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, 'js/eurusd-macro.js'), 'utf8');
(async () => {
  for (const mode of ['network', 'http', 'schema']) {
    const elements = {
      'fx-content': {hidden:false,replaceChildren() { this.cleared = true; }},
      'fx-status': {textContent:''},
      'eurusd-macro': {dataset:{}}
    };
    vm.runInNewContext(script, {document:{getElementById:id=>elements[id]},URL,Date,Number,Set,
      fetch:async()=>{if(mode==='network')throw Error('fixture'); return {ok:mode!=='http',json:async()=>({})};}});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(elements['fx-content'].hidden,true);
    assert.equal(elements['eurusd-macro'].dataset.state,'unavailable');
    assert.match(elements['fx-status'].textContent,/unavailable/);
  }
  console.log('PASS: HTTP/network/schema failures render an unavailable state without stale/zero values');
})().catch(error => { console.error(error); process.exitCode = 1; });
