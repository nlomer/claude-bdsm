// Service: paired group-bootstrap intervals for automatic rewrite proxies, not semantic-quality claims.
import type { BenchRow } from './types.js';
import { quantile } from './stats.js';
export function paired(rows: BenchRow[], reference: string, candidate: string) {
  const seen = new Set<string>();
  rows = rows.filter(row => { const key = `${row.model}/${row.prompt}/${row.fixtureId}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const key = (row: BenchRow) => `${row.fixtureId}/${row.prompt}`;
  const a = new Map(rows.filter(r => r.model === reference && r.expectedAction === 'rewrite_needed').map(r => [key(r), r]));
  const pairs = rows.filter(r => r.model === candidate && a.has(key(r))).map(r => ({ group: r.group,
    delta: Number(r.automatic.provisionalRewriteSuccess) - Number(a.get(key(r))!.automatic.provisionalRewriteSuccess) }));
  const groups = [...new Set(pairs.map(p => p.group))].map(group => pairs.filter(p => p.group === group));
  if (!groups.length) return null;
  let seed = 42;
  const draws = Array.from({ length: 500 }, () => {
    let sum = 0, n = 0;
    for (let j = 0; j < groups.length; j++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const group = groups[seed % groups.length]!;
      sum += group.reduce((total, p) => total + p.delta, 0); n += group.length;
    }
    return sum / n;
  });
  return { reference, candidate, pairs: pairs.length, groups: groups.length,
    difference: pairs.reduce((sum, p) => sum + p.delta, 0) / pairs.length,
    ci95: [quantile(draws, .025), quantile(draws, .975)], seed: 42, bootstrapReplicates: 500,
    metric: 'Paired provisional structural/lexical rewrite proxy; human intent unreviewed' };
}
