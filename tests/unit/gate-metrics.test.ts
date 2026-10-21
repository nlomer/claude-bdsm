// Tests: synthetic reviewer data exercises gate bookkeeping without creating any real review artifacts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateMetrics } from '../../src/bench/gate-metrics.js';
import { evaluateGates } from '../../src/bench/gates.js';
import { sanitize } from '../../src/core/sanitize.js';
import { hashText } from '../../src/core/parse.js';
import type { BenchRow } from '../../src/bench/types.js';
import type { Decision } from '../../src/bench/human.js';
test('distinct reviewers and unanimous ratings are required; critical flags remain blocking', () => {
  const row: BenchRow = { id: 'synthetic-row', fixtureId: 'synthetic-fixture', group: 'synthetic-group', category: 'direct_insult',
    expectedAction: 'rewrite_needed', model: 'synthetic-model', method: 'protected', prompt: 'instruction', promptHash: 'test', temperature: 0,
    repeat: 0, inputLength: 18, elapsedMs: 10, result: sanitize({ text: 'You idiot. Fix it.', tone: 'neutral', mode: 'rules' }),
    automatic: { protectedIntact: true, constraintsExact: true, toneProxy: true, changedKeep: false, provisionalRewriteSuccess: true } };
  const review = (reviewer: string): Decision => ({ id: hashText(row.id).slice(0, 16), reviewer,
    ratings: { fidelity: 'yes', tone: 'yes', acceptable: 'yes' }, critical: false, reason: 'Synthetic test data only' });
  const timing = { p50: 100, p95: 200 };
  assert.equal(gateMetrics([row], [], false, timing).rewriteCoverage, null);
  assert.equal(gateMetrics([row], [review('A'), review(' a ')], true, timing).stratifiedSecondReview, false);
  const evidence = gateMetrics([row], [review('A'), review('B')], true, timing);
  assert.equal(evidence.rewriteCoverage, 1); assert.equal(evidence.outputsReviewed, 1);
  assert.equal(evaluateGates(evidence).qualityEligible, true);
  assert.equal(evaluateGates(gateMetrics([row], [review('A'), { ...review('B'), critical: true }], true, timing)).qualityEligible, false);
});
