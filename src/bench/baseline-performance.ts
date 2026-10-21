// Controller: ten warm baseline repetitions, measured separately from model-loading costs.
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { corpus } from './corpus.js';
import { shuffle, quantile } from './stats.js';
import { rewrite, type Method } from '../core/rewrite.js';
import { saveJson } from '../runtime/files.js';
import type { SanitizeResult } from '../core/types.js';
export async function baselinePerformance(root: string): Promise<void> {
  const { fixtures, lock } = await corpus(root, 'dev');
  const panel = fixtures.filter(f => lock.performancePanel.includes(f.id));
  const rows: { method: Method; repeat: number; fixtureId: string; result: SanitizeResult; elapsedMs: number }[] = [];
  for (const method of ['identity', 'rules'] as Method[]) {
    await rewrite('You idiot. Fix the synthetic test.', undefined, { method, prompt: '' });
    const jobs = Array.from({ length: 10 }, (_, repeat) => panel.map(fixture => ({ repeat, fixture }))).flat();
    for (const { repeat, fixture } of shuffle(jobs)) {
      const start = performance.now();
      const result = await rewrite(fixture.input, undefined, { method, prompt: '' });
      rows.push({ method, repeat, fixtureId: fixture.id, result, elapsedMs: performance.now() - start });
    }
  }
  const summary = Object.fromEntries(['identity', 'rules'].map(method => {
    const times = rows.filter(row => row.method === method).map(row => row.elapsedMs);
    return [method, { measurements: times.length, uniqueFixtures: panel.length, p50: quantile(times, .5), p95: quantile(times, .95) }];
  }));
  await saveJson(resolve(root, 'reports/baseline-performance.json'), { definition: 'Ten warm repetitions per development-panel case; no model loaded', summary, rows });
}
