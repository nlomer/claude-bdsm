// Service: apply the proposed gates only to actual human evidence; passing never bypasses preview.
export interface GateEvidence {
  annotationsReviewed: boolean; outputsReviewed: number; outputsRequired: number; stratifiedSecondReview: boolean;
  unresolvedDisagreements: number; protectedErrors: number; criticalFlags: number;
  toneSuccess: number | null; rewriteCoverage: number | null; keepEditRate: number | null;
  shortP50Ms: number | null; shortP95Ms: number | null;
}
export function evaluateGates(evidence: GateEvidence) {
  const missing = [
    ...(!evidence.annotationsReviewed ? ['ANNOTATIONS_UNREVIEWED'] : []),
    ...(evidence.outputsReviewed < evidence.outputsRequired || !evidence.outputsRequired ? ['OUTPUT_REVIEW_INCOMPLETE'] : []),
    ...(!evidence.stratifiedSecondReview ? ['SECOND_REVIEW_INCOMPLETE'] : []),
    ...(evidence.unresolvedDisagreements ? ['DISAGREEMENTS_UNRESOLVED'] : [])
  ];
  const failures = [
    ...(evidence.protectedErrors ? ['PROTECTED_CORRUPTION'] : []), ...(evidence.criticalFlags ? ['CRITICAL_FLAG_REQUIRES_RESOLUTION'] : []),
    ...(evidence.toneSuccess !== null && evidence.toneSuccess < .95 ? ['TONE_BELOW_95_PERCENT'] : []),
    ...(evidence.rewriteCoverage !== null && evidence.rewriteCoverage < .9 ? ['COVERAGE_BELOW_90_PERCENT'] : []),
    ...(evidence.keepEditRate !== null && evidence.keepEditRate > .01 ? ['KEEP_EDITS_ABOVE_1_PERCENT'] : [])
  ];
  const latencyTargetMet = evidence.shortP50Ms !== null && evidence.shortP95Ms !== null && evidence.shortP50Ms <= 2000 && evidence.shortP95Ms <= 5000;
  const qualityEligible = !missing.length && !failures.length && evidence.toneSuccess !== null && evidence.rewriteCoverage !== null;
  return { evidence, status: missing.length ? 'pending_human_evidence' : qualityEligible ? 'quality_eligible_start_in_preview' : 'quality_gate_failed',
    missing, failures, qualityEligible, latencyTargetMet, automaticSubmissionAuthorized: false };
}
