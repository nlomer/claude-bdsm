// Controller: research sequence only; no product/default decision can bypass pending human review.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { smoke } from './smoke.js';
import { runBenchmark, freeze } from './run.js';
import { startup } from './startup.js';
import { summarize } from './score.js';
import type { BenchRow } from './types.js';
import { saveJson } from '../runtime/files.js';
const root = process.cwd();
while (await stat(resolve(root, '.tools/active.lock')).then(() => true).catch(() => false)) await pause(1000);
if (!process.argv.includes('--skip-smoke')) await smoke(root);
const development = await runBenchmark(root, 'dev');
const rows = (await readFile(resolve(development, 'rows.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line) as BenchRow);
const comparison = ['instruction', 'examples'].map(prompt => ({ prompt,
  summary: summarize(rows.filter(r => r.method === 'protected' && r.prompt === prompt)) }));
const winner = [...comparison].sort((a, b) => (b.summary.provisionalRewriteCoverage.rate ?? 0) - (a.summary.provisionalRewriteCoverage.rate ?? 0))[0]!.prompt;
await saveJson(resolve(root, 'reports/development-selection.json'), { comparison, winner,
  policy: 'Shared prompt with better provisional structural rewrite coverage; ties retain instruction. Human fidelity unreviewed.' });
await runBenchmark(root, 'sampling');
await freeze(root, winner);
await runBenchmark(root, 'oracle');
await runBenchmark(root, 'holdout');
await runBenchmark(root, 'performance');
await startup(root);
await saveJson(resolve(root, 'reports/research-complete.json'), { complete: true, humanReview: 'pending', recommendation: 'preview-only; automatic release pending review' });
