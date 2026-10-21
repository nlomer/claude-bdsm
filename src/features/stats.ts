// Adapter: bounded aggregate-only counters and optional explicitly enabled private diagnostic retention.
import { mkdir, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
import type { SanitizeResult } from '../core/types.js';
export interface Aggregate { events: number; statuses: Record<string, number>; methods: Record<string, number>; latencyBuckets: Record<string, number>; achievements: Record<string, number> }
export const emptyStats = (): Aggregate => ({ events: 0, statuses: {}, methods: {}, latencyBuckets: {}, achievements: {} });
export async function loadStats(root: string): Promise<Aggregate> {
  return json<Aggregate>(resolve(root, '.local/stats.json')).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStats(); throw error;
  });
}
export async function recordStats(root: string, result: SanitizeResult, earned: string[]): Promise<void> {
  const folder = resolve(root, '.local'); await mkdir(folder, { recursive: true });
  // Atomic exclusive lock prevents silent lost updates; busy statistics never block a sanitizer result.
  const { open, rm } = await import('node:fs/promises');
  const lock = await open(resolve(folder, 'stats.lock'), 'wx').catch(() => undefined);
  if (!lock) return;
  try {
    const stats = await loadStats(root);
    stats.events++;
    const increment = (map: Record<string, number>, key: string) => { map[key] = (map[key] ?? 0) + 1; };
    increment(stats.statuses, result.status); increment(stats.methods, result.engine);
    const ms = result.timingsMs.endToEnd ?? result.timingsMs.total ?? 0;
    increment(stats.latencyBuckets, ms < 100 ? '<100ms' : ms < 2000 ? '<2s' : ms < 5000 ? '<5s' : '>=5s');
    for (const award of earned) increment(stats.achievements, award);
    await saveJson(resolve(folder, 'stats.json'), stats);
  } finally { await lock.close(); await rm(resolve(folder, 'stats.lock'), { force: true }); }
}
export async function retainDiagnostic(root: string, text: string, result: SanitizeResult): Promise<void> {
  await mkdir(resolve(root, '.local/diagnostics'), { recursive: true });
  await appendFile(resolve(root, '.local/diagnostics/events.jsonl'), JSON.stringify({ at: new Date().toISOString(), text, result }) + '\n', { mode: 0o600 });
}
