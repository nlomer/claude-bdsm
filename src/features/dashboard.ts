// UI: self-contained offline aggregate dashboard; no fonts/scripts/network or prompt bodies.
import type { Aggregate } from './stats.js';
import { escapeHtml } from '../core/format.js';
export function dashboard(stats: Aggregate): string {
  return `<!doctype html><meta charset="utf-8"><title>Emotional Damage Dashboard</title><style>body{font:17px system-ui;background:#141822;color:#e8ecf2;max-width:900px;margin:auto;padding:40px}pre{background:#202735;padding:24px;white-space:pre-wrap;border-radius:12px}</style><h1>Emotional Damage Dashboard</h1><p>Local aggregate counters. Awards and rage scores are playful heuristics.</p><h2>${stats.events} processed messages</h2><pre>${escapeHtml(JSON.stringify(stats, null, 2))}</pre><p>Personal message text is excluded. Statistics can miss updates while another statistics writer owns the lock.</p>`;
}
