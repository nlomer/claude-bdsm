// Controller: load actual review files and measured performance before evaluating quality gates.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json } from '../runtime/files.js';
import type { Decision } from './human.js';
import type { BenchRow } from './types.js';
import { summarize } from './score.js';
import { gateMetrics } from './gate-metrics.js';
import { evaluateGates } from './gates.js';
export async function gateEvidence(root: string, folder: string, rows: BenchRow[]) {
  const decisions = await json<Decision[]>(resolve(folder, 'human-review.json')).catch(() => []);
  const annotations = await json<{ status: string; datasetHashes: unknown; importedAt: string }>(resolve(root, 'reports/annotation-review.json')).catch(() => undefined);
  const dataset = await json<{ hashes: unknown }>(resolve(root, 'fixtures/dataset.lock.json'));
  const manifest = await json<{ startedAt: string }>(resolve(folder, 'manifest.json'));
  const annotationsReviewed = annotations?.status === 'accepted' && JSON.stringify(annotations.datasetHashes) === JSON.stringify(dataset.hashes) && Date.parse(annotations.importedAt) <= Date.parse(manifest.startedAt);
  const speedPath = await json<{ folder: string }>(resolve(root, 'reports/latest-performance.json')).catch(() => undefined);
  const performanceRows = speedPath ? (await readFile(resolve(speedPath.folder, 'rows.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as BenchRow) : [];
  return Object.fromEntries([...new Set(rows.filter(r => r.model !== 'none').map(r => `${r.model}/${r.method}/${r.prompt}`))].map(key => {
    const subset = rows.filter(r => `${r.model}/${r.method}/${r.prompt}` === key);
    const measured = performanceRows.filter(r => `${r.model}/${r.method}/${r.prompt}` === key);
    const short = summarize(measured).latencyByLength.short;
    return [key, evaluateGates(gateMetrics(subset, decisions, annotationsReviewed, { p50: short?.p50 ?? null, p95: short?.p95 ?? null }))];
  }));
}
