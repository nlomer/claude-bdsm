// Utils: format measured hybrid gains separately from the broader protected-prose experiment.
import type { summarize } from './score.js';
type Summary = ReturnType<typeof summarize>;
export interface ComparisonRow {
  id: string; bytes: number; quality: Summary | undefined; hybrid: Summary | undefined;
  speed: Summary | undefined; hybridSpeed: Summary | undefined;
  memory: { samples?: number; childPeakBytes?: number | null } | undefined;
}
export const fraction = (r: { numerator: number; denominator: number; rate: number | null }): string =>
  `${r.numerator}/${r.denominator}${r.rate === null ? '' : ` (${(r.rate * 100).toFixed(1)}%)`}`;
export function comparisonMarkdown(rows: ComparisonRow[], rules: Summary | undefined): string[] {
  const lines = ['## Hybrid pipeline', '',
    '| Model | Weights MB | Rewrite proxy | Additional rewrites beyond rules | Short warm p50 / p95 ms | Sampled child peak MB |',
    '|---|---:|---:|---:|---:|---:|'];
  for (const row of rows) {
    const short = row.hybridSpeed?.latencyByLength.short;
    const memory = row.memory?.samples ? row.memory.childPeakBytes : null;
    const gain = row.hybrid && rules ? row.hybrid.provisionalRewriteCoverage.numerator - rules.provisionalRewriteCoverage.numerator : '?';
    lines.push(`| ${row.id} | ${(row.bytes / 1e6).toFixed(1)} | ${row.hybrid ? fraction(row.hybrid.provisionalRewriteCoverage) : 'unknown'} | ${gain} | ${short?.p50?.toFixed(1) ?? '?'} / ${short?.p95?.toFixed(1) ?? '?'} | ${memory ? (memory / 1e6).toFixed(1) : 'not sampled'} |`);
  }
  lines.push('', 'Hybrid includes rule bypasses. Its low median mainly measures rules, not model inference. Warm sidecar times exclude process startup; the production CLI loads lazily and unloads before approval/submission. Memory was sampled while the benchmark model was resident.', '',
    '## Whole protected-prose experiment', '', '| Model | Rewrite proxy | Keep edits | Review/error | Short warm p50 / p95 ms |', '|---|---:|---:|---:|---:|');
  for (const row of rows) {
    const s = row.quality, short = row.speed?.latencyByLength.short;
    lines.push(`| ${row.id} | ${s ? fraction(s.provisionalRewriteCoverage) : 'unknown'} | ${s ? fraction(s.falsePositiveEdits) : 'unknown'} | ${s ? fraction(s.reviewOrError) : 'unknown'} | ${short?.p50?.toFixed(1) ?? '?'} / ${short?.p95?.toFixed(1) ?? '?'} |`);
  }
  return lines;
}
