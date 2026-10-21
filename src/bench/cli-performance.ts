// Adapter: measure complete cold terminal turns, including integrity checks, lazy loading and cleanup.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { registry } from '../runtime/registry.js';
import { saveJson } from '../runtime/files.js';
import { quantile } from './stats.js';
import type { SanitizeResult } from '../core/types.js';
async function probe(root: string, model: string) {
  const started = performance.now();
  const child = spawn(process.execPath, [resolve(root, 'dist/cli.js'), 'sanitize', '--stdin', '--json',
    '--preview', '--model', model, '--mode', 'hybrid'], { cwd: root, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-65536); });
  child.stderr.resume();
  child.stdin.end('You useless idiot, Fix the failing test without changing the public API.');
  const deadline = setTimeout(() => child.kill(), 120000);
  try {
    const [code] = await once(child, 'close');
    const elapsedMs = performance.now() - started;
    const result = JSON.parse(output) as SanitizeResult;
    return { model, elapsedMs, exitCode: code, status: result.status, engine: result.engine,
      reasons: result.reasons, outputAvailable: result.output !== undefined,
      approvalBlocked: code === 3, providerInvoked: false };
  } finally { clearTimeout(deadline); }
}
export async function cliPerformance(root: string): Promise<void> {
  const rows: ((Awaited<ReturnType<typeof probe>> & { repeat: number }) | { repeat: number; model: string; error: string })[] = [];
  for (let repeat = 0; repeat < 3; repeat++) for (const model of registry) {
    process.stderr.write(`Cold terminal diagnostic: ${model.id}, repetition ${repeat + 1}/3\n`);
    try { rows.push({ repeat, ...await probe(root, model.id) }); }
    catch (error) { rows.push({ repeat, model: model.id, error: String(error) }); }
  }
  const summary = registry.map(model => {
    const subset = rows.filter(r => r.model === model.id);
    const timed = subset.flatMap(r => 'elapsedMs' in r ? [r.elapsedMs] : []);
    return { model: model.id, measurements: subset.length, completed: timed.length,
      p50Ms: quantile(timed, .5), p95Ms: quantile(timed, .95),
      candidates: subset.filter(r => 'outputAvailable' in r && r.outputAvailable).length,
      approvalBlocked: subset.filter(r => 'approvalBlocked' in r && r.approvalBlocked).length };
  });
  await saveJson(resolve(root, 'reports/cli-performance.json'), {
    definition: 'Three full CLI process-cold runs per model on one fixed synthetic comma-prefix case; caches not cleared. Includes Node, file verification, generation, aggregate stats and unload. Descriptive diagnostic, not a general latency distribution or human quality test.',
    summary, rows
  });
}
