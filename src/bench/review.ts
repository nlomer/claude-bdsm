// UI: standalone blinded synthetic review with escaped text and local decision-file export.
import type { BenchRow } from './types.js';
import type { Fixture } from '../fixtures/types.js';
import { hashText } from '../core/parse.js';
import { safeJson } from '../core/format.js';
import { shuffle } from './stats.js';
export function reviewHtml(rows: BenchRow[], fixtures: Fixture[]): { html: string; key: unknown } {
  const byId = new Map(fixtures.map(f => [f.id, f]));
  const key = Object.fromEntries(rows.map(r => [hashText(r.id).slice(0, 16), r.id]));
  const data = shuffle(rows).map(r => ({ id: hashText(r.id).slice(0, 16), original: byId.get(r.fixtureId)?.input ?? '',
    constraints: byId.get(r.fixtureId)?.task_constraints ?? [], output: r.result.output ?? null,
    candidate: r.candidate?.text ?? null, status: r.result.status, reasons: r.result.reasons }));
  return { key, html: `<!doctype html><meta charset="utf-8"><title>Blinded tone review</title>
<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:24px;background:#141822;color:#eee}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#202735;padding:16px}button,select,input{padding:8px;margin:6px}label{display:inline-block}header{position:sticky;top:0;background:#141822;padding:12px}textarea{width:98%;height:70px}</style>
<header><h1>Blinded synthetic output review</h1><p>Provisional annotations. No human judgments are prefilled. Assess intent, tone, and acceptability independently. Use a second reviewer for critical failures and disagreements.</p><button id="previous">Previous</button><span id="position"></span><button id="next">Next</button><button id="save">Export decisions</button><input id="reviewer" placeholder="Reviewer identifier"></header>
<h2>Original</h2><pre id="original"></pre><h2>Task constraints</h2><pre id="constraints"></pre><h2>Validated output</h2><pre id="output"></pre><details><summary>Rejected/raw candidate and structural status</summary><pre id="candidate"></pre><pre id="status"></pre></details>
<div id="ratings"></div><label><input id="critical" type="checkbox">Critical reversal or invented dangerous action</label><textarea id="reason" placeholder="Reasons, disagreements, or annotation corrections"></textarea>
<script>const data=${safeJson(data)},decisions={};let index=0;const fields=['fidelity','tone','acceptable'];
for(const field of fields){const label=document.createElement('label');label.textContent=field+' ';const select=document.createElement('select');select.id=field;for(const value of ['unreviewed','yes','no','uncertain']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}label.append(select);document.getElementById('ratings').append(label)}
function store(){const item=data[index];decisions[item.id]={id:item.id,reviewer:document.getElementById('reviewer').value,ratings:Object.fromEntries(fields.map(f=>[f,document.getElementById(f).value])),critical:document.getElementById('critical').checked,reason:document.getElementById('reason').value}}
function show(){const item=data[index];if(!item)return;for(const field of ['original','output','candidate'])document.getElementById(field).textContent=item[field]??'(no validated output)';document.getElementById('constraints').textContent=item.constraints.join(String.fromCharCode(10));document.getElementById('status').textContent=JSON.stringify({status:item.status,reasons:item.reasons});document.getElementById('position').textContent=(index+1)+' / '+data.length;const saved=decisions[item.id];for(const field of fields)document.getElementById(field).value=saved?.ratings[field]??'unreviewed';document.getElementById('critical').checked=saved?.critical??false;document.getElementById('reason').value=saved?.reason??''}
document.getElementById('next').onclick=()=>{store();index=Math.min(data.length-1,index+1);show()};document.getElementById('previous').onclick=()=>{store();index=Math.max(0,index-1);show()};document.getElementById('save').onclick=()=>{store();const blob=new Blob([JSON.stringify({version:1,decisions:Object.values(decisions)},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='human-review.json';a.click();URL.revokeObjectURL(a.href)};show();</script>` };
}
