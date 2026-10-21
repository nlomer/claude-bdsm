// Service: derive candidate-specific gate evidence from real reviewer IDs/ratings, never proxy labels.
import type { BenchRow } from './types.js';
import type { Decision } from './human.js';
import type { GateEvidence } from './gates.js';
import { hashText } from '../core/parse.js';
export function gateMetrics(rows: BenchRow[], decisions: Decision[], annotationsReviewed: boolean,
  latency: { p50: number | null; p95: number | null }): GateEvidence {
  const outputs = rows.filter(r => r.result.output !== undefined);
  const rewrite = rows.filter(r => r.expectedAction === 'rewrite_needed');
  const keep = rows.filter(r => r.expectedAction === 'keep');
  let reviewed = 0, successes = 0, toneSuccess = 0, criticalFlags = 0, disagreements = 0;
  const twice = new Set<string>();
  for (const row of outputs) {
    const ratings = decisions.filter(d => d.id === hashText(row.id).slice(0, 16) &&
      ['fidelity', 'tone', 'acceptable'].every(field => ['yes', 'no'].includes(d.ratings[field as keyof Decision['ratings']])));
    if (!ratings.length) continue;
    reviewed++;
    const reviewers = new Set(ratings.map(d => d.reviewer.trim().toLowerCase()));
    const disagree = new Set(ratings.map(d => JSON.stringify(d.ratings))).size > 1;
    if (disagree) disagreements++;
    if (ratings.some(d => d.critical)) criticalFlags++;
    if (reviewers.size >= 2 && !disagree) twice.add(row.category);
    if (row.expectedAction === 'rewrite_needed' && ratings.every(d => d.ratings.tone === 'yes')) toneSuccess++;
    if (row.expectedAction === 'rewrite_needed' && row.result.status === 'rewritten' &&
      row.automatic.protectedIntact && row.automatic.constraintsExact && !disagree &&
      ratings.every(d => !d.critical && Object.values(d.ratings).every(value => value === 'yes'))) successes++;
  }
  return { annotationsReviewed, outputsReviewed: reviewed, outputsRequired: outputs.length,
    stratifiedSecondReview: new Set(outputs.map(r => r.category)).size > 0 && [...new Set(outputs.map(r => r.category))].every(c => twice.has(c)),
    unresolvedDisagreements: disagreements, criticalFlags, protectedErrors: outputs.filter(r => !r.automatic.protectedIntact).length,
    toneSuccess: reviewed === outputs.length && rewrite.length ? toneSuccess / rewrite.length : null,
    rewriteCoverage: reviewed === outputs.length && rewrite.length ? successes / rewrite.length : null,
    keepEditRate: keep.length ? keep.filter(r => r.automatic.changedKeep).length / keep.length : null,
    shortP50Ms: latency.p50, shortP95Ms: latency.p95 };
}
