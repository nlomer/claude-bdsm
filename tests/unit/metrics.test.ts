// Tests: repeated measurements and unmatched prompts must not inflate quality uncertainty or paired evidence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../../src/bench/score.js';
import { paired } from '../../src/bench/paired.js';
import type { BenchRow } from '../../src/bench/types.js';
import { sanitize } from '../../src/core/sanitize.js';
function row(model: string, success: boolean, repeat: number): BenchRow {
  const result = sanitize({ text: 'You idiot. Fix it.', tone: 'neutral', mode: 'rules' });
  return { id: `${model}-${repeat}`, fixtureId: 'one-fixture', group: 'one-group', category: 'direct_insult',
    expectedAction: 'rewrite_needed', model, method: 'protected', prompt: 'instruction', promptHash: 'test',
    temperature: 0, repeat, inputLength: 18, elapsedMs: 10, result,
    automatic: { protectedIntact: true, constraintsExact: true, toneProxy: success, changedKeep: false, provisionalRewriteSuccess: success } };
}
test('ten repetitions retain a one-fixture denominator for quality and group comparisons', () => {
  const a = Array.from({ length: 10 }, (_, n) => row('a', false, n));
  const b = Array.from({ length: 10 }, (_, n) => row('b', true, n));
  const summary = summarize(b);
  assert.equal(summary.records, 10);
  assert.equal(summary.provisionalRewriteCoverage.denominator, 1);
  assert.equal(summary.reviewOrError.denominator, 1);
  assert.equal(summary.measurementReviewOrError.denominator, 10);
  assert.equal(summary.measurementReviewOrError.confidenceInterval, null);
  const comparison = paired([...a, ...b], 'a', 'b');
  assert.equal(comparison?.pairs, 1); assert.equal(comparison?.groups, 1);
  assert.equal(comparison?.difference, 1);
  assert.equal(paired([a[0]!, { ...b[0]!, prompt: 'examples' }], 'a', 'b'), null);
});
