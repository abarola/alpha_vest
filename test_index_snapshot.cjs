const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {classify} = require(require('node:path').join(__dirname, 'js/index-snapshot.js'));
const cases = [[0,'very-cheap'],[24.999,'very-cheap'],[25,'cheap'],[49.999,'cheap'],[50,'neutral'],[50.001,'expensive'],[80,'expensive'],[80.001,'very-expensive'],[100,'very-expensive']];
for (const [score,state] of cases) assert.equal(classify(score).state,state);
for(const score of [null,undefined,'', '25',true,NaN,Infinity,-1,101]) assert.equal(classify(score),null);
const script = fs.readFileSync(require('node:path').join(__dirname, 'js/index-snapshot.js'),'utf8');
const payload = {schema_version:1,symbol:'CSSPX.MI',invquant_dd:77.97351619768267,analysis_date:'2026-10-01'};
async function render(data,ok=true,reject=false){
 const elements={};
 const document={getElementById(id){return elements[id]??=( {textContent:'',dataset:{},style:{},hidden:false,setAttribute(name,value){this[name]=value}})}};
 vm.runInNewContext(script,{document,fetch:async()=>{if(reject)throw Error('network');return {ok,json:async()=>data}},Date,Number});
 await new Promise(resolve=>setImmediate(resolve));
 return elements;
}
(async()=>{
 let el=await render(payload); assert.equal(el['index-status-card'].dataset.state,'expensive');assert.equal(el['index-score'].textContent,'77.97');assert.match(el['index-snapshot-date'].textContent,/1 Oct 2026/);assert.equal(el['index-score-marker'].style.left,'77.97351619768267%');
 for(const [score,state] of cases){el=await render({...payload,invquant_dd:score});assert.equal(el['index-status-card'].dataset.state,state);assert.equal(el['index-score-marker'].hidden,false)}
 for (const data of [{...payload,invquant_dd:null},{...payload,symbol:'VTI'},{...payload,schema_version:2},{...payload,analysis_date:'2026-02-30'},{}]){el=await render(data);assert.equal(el['index-status-card'].dataset.state,'unavailable');assert.equal(el['index-score'].textContent,'—');assert.equal(el['index-score-marker'].hidden,true)}
 for(const [ok,reject] of [[false,false],[true,true]]){el=await render(payload,ok,reject);assert.equal(el['index-status-card'].dataset.state,'unavailable')}
 console.log('PASS: 18 classification cases; valid render/date/marker; 9 boundary renders; 7 schema/fetch failures');
})();
