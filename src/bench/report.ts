// Controller: reproducible reports expose provisional metrics, denominators and unresolved quality gates.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
import { corpus } from './corpus.js';
import { summarize } from './score.js';
import { reviewHtml } from './review.js';
import { escapeHtml } from '../core/format.js';
import type { BenchRow } from './types.js';
import { paired } from './paired.js';
import { humanSummary } from './human.js';
import { detectorSummary } from './detector.js';
import { gateEvidence } from './gate-evidence.js';
import { hashText } from '../core/parse.js';
export async function report(root: string, folder: string): Promise<void> {
  const rows = (await readFile(resolve(folder, 'rows.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as BenchRow);
  const manifest = await json<Record<string, unknown>>(resolve(folder, 'manifest.json'));
  const groups = [...new Set(rows.map(r => `${r.model}/${r.method}/${r.prompt}`))];
  const summary = Object.fromEntries(groups.map(group => [group, summarize(rows.filter(r => `${r.model}/${r.method}/${r.prompt}` === group))]));
  for (const [key, value] of Object.entries(summary)) {
    const ids = rows.filter(r => r.result.output !== undefined && `${r.model}/${r.method}/${r.prompt}` === key).map(r => hashText(r.id).slice(0, 16));
    value.humanReview = await humanSummary(folder, ids.length, ids);
  }
  const files = await readdir(folder);
  const completed = files.includes('complete.json') && !files.some(f => f.endsWith('.failure.json'));
  const resources = Object.fromEntries(await Promise.all(files.filter(f => f.endsWith('.resources.json') || f.endsWith('.failure.json')).map(async name => [name, await json(resolve(folder, name))])));
  const { fixtures } = await corpus(root, manifest.suite === 'holdout' ? 'holdout' : 'dev');
  const review = reviewHtml(rows, fixtures);
  await writeFile(resolve(folder, 'review.html'), review.html);
  await saveJson(resolve(folder, 'review-key.json'), review.key);
  const examples = rows.filter(r => r.method === 'protected').slice(0, 6).map(r => ({ fixtureId: r.fixtureId,
    original: fixtures.find(f => f.id === r.fixtureId)?.input, model: r.model, result: r.result, candidate: r.candidate }));
  const severity = (r: BenchRow) => r.result.reasons.some(reason => /PLACEHOLDER|CONSTRAINT/.test(reason)) ? 3 : r.result.reasons.includes('TRUNCATED') ? 2 : 1;
  const worstFailures = rows.filter(r => r.candidate && r.result.output === undefined).sort((a, b) => severity(b) - severity(a) || b.elapsedMs - a.elapsedMs).slice(0, 12);
  const human = await humanSummary(folder, rows.length);
  const protectedRows = rows.filter(r => r.method === 'protected');
  const comparisons = [...new Set(protectedRows.map(r => r.prompt))].flatMap(prompt => ['smol-360m-q4km', 'qwen3-06b-q4km', 'qwen35-08b-q4km'].map(model => ({ prompt, comparison: paired(protectedRows.filter(r => r.prompt === prompt), 'smol-135m-q4km', model) })));
  const covered = new Set(rows.map(r => r.fixtureId));
  const result = { manifest, completed, summary, resources, examples, worstFailures, review: human, pairedComparisons: comparisons,
    detector: detectorSummary(fixtures.filter(f => covered.has(f.id))),
    qualityGates: manifest.suite === 'holdout' ? await gateEvidence(root, folder, rows) : { status: 'not_primary_quality_run' },
    worstFailureDefinition: 'Highest automatic structural-risk rejections, then latency; semantic worst failures await human review',
    decision: 'PREVIEW_ONLY_PENDING_HUMAN_REVIEW',
    caveats: ['Automatic exact-constraint and lexical tone proxies do not establish technical-intent fidelity.',
      'Synthetic template groups limit diversity; annotations are agent-authored and unreviewed.',
      'Repeated performance rows are correlated measurements, not new quality cases.',
      'Windows working set/private bytes and wrapper RSS are separately labelled. Sampled peaks may miss spikes.',
      'Combined resident budget includes Node + inference child; Windows measurement-helper memory is excluded. Production CLI disables that helper. Shared pages can be double-counted.',
      'CPU contention from other processes was not controlled. Process-cold does not mean filesystem-cold.',
      'Linux execution and live provider integration remain untested.'] };
  await saveJson(resolve(folder, 'report.json'), result);
  const lines = ['# Local tone benchmark', '', '**Provisional automatic results — human fidelity/tone review pending.**', '',
    `Run completeness: ${completed ? 'all loops finished without model-level exceptions' : 'INCOMPLETE / still running / model exception; inspect manifest and failure files'}.`, '',
    '| Model / method / prompt | Records | Rewrite proxy | Keep edits | Review/error | p50 / p95 ms |',
    '|---|---:|---:|---:|---:|---:|'];
  for (const [name, s] of Object.entries(summary)) lines.push(`| ${name} | ${s.records} | ${s.provisionalRewriteCoverage.numerator}/${s.provisionalRewriteCoverage.denominator} | ${s.falsePositiveEdits.numerator}/${s.falsePositiveEdits.denominator} | ${s.reviewOrError.numerator}/${s.reviewOrError.denominator} | ${s.latencyMs.p50?.toFixed(1)} / ${s.latencyMs.p95?.toFixed(1)} |`);
  lines.push('', 'Each report.json rate includes its denominator and Wilson 95% interval; quality intervals are for unique fixtures only. Performance repetitions must not be interpreted as independent quality samples.', '',
    'No accepted-output critical error rate is available: no outputs have human approval. Default recommendation: preview-only. Open review.html to collect blinded decisions.', '',
    'See manifest.json for hardware/settings/hashes; *.resources.json for memory; rows.jsonl for every observed result and raw synthetic candidate; startup.json in the reports root for five process restarts.', '', ...result.caveats.map(c => `- ${c}`));
  await writeFile(resolve(folder, 'report.md'), lines.join('\n') + '\n');
  await writeFile(resolve(folder, 'report.html'), `<!doctype html><meta charset="utf-8"><title>Tone benchmark</title><style>body{font:15px system-ui;max-width:1200px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Tone benchmark</h1><p><a href="review.html">Blinded human review</a></p><pre>${escapeHtml(lines.join('\n'))}</pre><details><summary>Evidence</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>`);
}
