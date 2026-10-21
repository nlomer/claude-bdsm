// Tests: missing human evidence cannot become a passing gate or permission to submit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGates, type GateEvidence } from '../../src/bench/gates.js';
const complete: GateEvidence = { annotationsReviewed: true, outputsReviewed: 280, outputsRequired: 280,
  stratifiedSecondReview: true, unresolvedDisagreements: 0, protectedErrors: 0, criticalFlags: 0,
  toneSuccess: .96, rewriteCoverage: .92, keepEditRate: 0, shortP50Ms: 1500, shortP95Ms: 4000 };
test('gates stay pending without actual annotation/output/second-review evidence', () => {
  const result = evaluateGates({ ...complete, annotationsReviewed: false, outputsReviewed: 0, stratifiedSecondReview: false, toneSuccess: null, rewriteCoverage: null });
  assert.equal(result.status, 'pending_human_evidence'); assert.equal(result.qualityEligible, false);
  assert.equal(result.automaticSubmissionAuthorized, false);
});
test('critical failures and low coverage fail; a quality-eligible model still starts in preview', () => {
  assert.equal(evaluateGates({ ...complete, criticalFlags: 1 }).qualityEligible, false);
  assert.equal(evaluateGates({ ...complete, rewriteCoverage: .89 }).qualityEligible, false);
  assert.equal(evaluateGates({ ...complete, keepEditRate: .02 }).qualityEligible, false);
  const result = evaluateGates(complete);
  assert.equal(result.status, 'quality_eligible_start_in_preview'); assert.equal(result.latencyTargetMet, true);
  assert.equal(result.automaticSubmissionAuthorized, false);
});
