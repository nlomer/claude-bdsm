// Adapter: measure installed runtime disk bytes, including its retained verified archive.
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { json } from '../runtime/files.js';
import type { ModelLock, RuntimeLock } from '../runtime/registry.js';
import { quantile } from './stats.js';
export async function diskBytes(folder: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) bytes += await diskBytes(path);
    else if (entry.isFile()) bytes += (await stat(path)).size;
  }
  return bytes;
}
export async function researchFootprint(root: string, runtime: RuntimeLock, models: ModelLock[]) {
  const restarts = await json<{ rows: { model: string; launchToReadyMs?: number; setupToFirstResultMs?: number; firstValidResult?: boolean }[] }>(resolve(root, 'reports/startup.json'));
  const cold = models.map(m => { const records = restarts.rows.filter(r => r.model === m.id); return { model: m.id, restarts: records.length,
    readyP50Ms: quantile(records.flatMap(r => r.launchToReadyMs === undefined ? [] : [r.launchToReadyMs]), .5),
    validFirstResults: records.filter(r => r.firstValidResult).length,
    setupToValidFirstP50Ms: quantile(records.flatMap(r => r.firstValidResult && r.setupToFirstResultMs !== undefined ? [r.setupToFirstResultMs] : []), .5) }; });
  const runtimeDiskBytes = await diskBytes(resolve(root, '.tools', runtime.tag, process.platform));
  const baselineTimings = await json<{ summary: unknown }>(resolve(root, 'reports/baseline-performance.json'));
  return { cold, runtimeDiskBytes, baselineTimings };
}
