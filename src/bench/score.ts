// Service: automatic structural/proxy scoring only; never substitute for human intent judgments.
import type { Fixture } from '../fixtures/types.js';
import type { SanitizeResult } from '../core/types.js';
import type { BenchRow } from './types.js';
import { attackWords } from '../core/rules.js';
import { rate, quantile } from './stats.js';
export function score(fixture: Fixture, result: SanitizeResult): BenchRow['automatic'] {
  const output = result.output;
  let cursor = 0;
  const protectedIntact = output !== undefined && fixture.protected_exact.every(raw => {
    const at = output.indexOf(raw, cursor); cursor = at + raw.length; return at >= 0;
  });
  const constraintsExact = output !== undefined && fixture.task_constraints.every(c => output.includes(c));
  let prose = output ?? '';
  for (const raw of fixture.protected_exact) prose = prose.split(raw).join('');
  const toneProxy = output !== undefined && !attackWords.test(prose);
  return { protectedIntact, constraintsExact, toneProxy,
    changedKeep: fixture.expected_action === 'keep' && output !== undefined && output !== fixture.input,
    provisionalRewriteSuccess: fixture.expected_action === 'rewrite_needed' && result.status === 'rewritten' && protectedIntact && constraintsExact && toneProxy };
}
export function summarize(rows: BenchRow[]) {
  const seen = new Set<string>();
  const unique = rows.filter(row => { const key = `${row.model}/${row.method}/${row.prompt}/${row.fixtureId}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const rewrite = unique.filter(r => r.expectedAction === 'rewrite_needed');
  const keep = unique.filter(r => r.expectedAction === 'keep');
  const outputs = unique.filter(r => r.result.output !== undefined);
  const failures = rows.filter(r => ['review_required', 'error'].includes(r.result.status));
  const generated = rows.flatMap(r => r.candidate ? [r.candidate] : []);
  const latencyByLength = Object.fromEntries(['short', 'medium', 'long'].map(bucket => {
    const subset = rows.filter(r => (r.inputLength < 300 ? 'short' : r.inputLength < 3000 ? 'medium' : 'long') === bucket);
    return [bucket, { measurements: subset.length, uniqueFixtures: new Set(subset.map(r => r.fixtureId)).size,
      p50: quantile(subset.map(r => r.elapsedMs), .5), p95: quantile(subset.map(r => r.elapsedMs), .95) }];
  }));
  return { records: rows.length, uniqueFixtures: new Set(rows.map(r => r.fixtureId)).size,
    qualityBasis: 'First observed result per model/method/prompt/fixture; repetitions are latency and stability measurements only',
    provisionalRewriteCoverage: rate(rewrite.filter(r => r.automatic.provisionalRewriteSuccess).length, rewrite.length),
    falsePositiveEdits: rate(keep.filter(r => r.automatic.changedKeep).length, keep.length),
    protectedFailures: rate(outputs.filter(r => !r.automatic.protectedIntact).length, outputs.length),
    exactConstraintFailures: rate(outputs.filter(r => !r.automatic.constraintsExact).length, outputs.length),
    reviewOrError: rate(unique.filter(r => ['review_required', 'error'].includes(r.result.status)).length, unique.length),
    measurementReviewOrError: { numerator: failures.length, denominator: rows.length, confidenceInterval: null, reason: 'Repeated measurements are correlated' },
    acceptedCriticalErrors: { numerator: null, denominator: 0, reason: 'No human-approved outputs; intent fidelity unreviewed' },
    humanReview: { reviewed: 0, required: outputs.length, status: 'pending' },
    latencyMs: { p50: quantile(rows.map(r => r.elapsedMs), .5), p95: quantile(rows.map(r => r.elapsedMs), .95) },
    latencyByLength,
    generation: { measurements: generated.length,
      outputTokensP50: quantile(generated.map(g => g.outputTokens), .5), outputCharactersP50: quantile(generated.map(g => g.text.length), .5),
      ttftMsP50: quantile(generated.map(g => g.timingsMs.ttft ?? -1).filter(n => n >= 0), .5),
      ttftMsP95: quantile(generated.map(g => g.timingsMs.ttft ?? -1).filter(n => n >= 0), .95),
      tokenizationMsP50: quantile(generated.map(g => g.timingsMs.tokenization ?? 0), .5),
      streamedTokensPerSecondP50: quantile(generated.map(g => g.outputTokens / Math.max(.001, ((g.timingsMs.total ?? 0) - (g.timingsMs.tokenization ?? 0)) / 1000)), .5),
      throughputDefinition: 'Generated tokens / streaming-request duration including network overhead; native server timings retained when available' },
    failuresByReason: Object.fromEntries([...new Set(failures.flatMap(r => r.result.reasons))].map(reason => [reason, failures.filter(r => r.result.reasons.includes(reason)).length])) };
}
