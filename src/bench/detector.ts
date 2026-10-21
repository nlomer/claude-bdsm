// Service: report shared routing independently of generation and final candidate validation.
import type { Fixture } from '../fixtures/types.js';
import { route } from '../core/route.js';
import { parseProtected } from '../core/parse.js';
import { modelCandidate } from '../core/model-candidate.js';
export function detectorSummary(fixtures: Fixture[]) {
  const confusion: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  for (const fixture of fixtures) {
    const spans = parseProtected(fixture.input), decision = route(fixture.input, spans);
    const excluded = ['LANGUAGE_UNSUPPORTED', 'EDITOR_INSTRUCTION_AMBIGUOUS', 'QUOTATION_AMBIGUOUS'].includes(decision.reason);
    const action = decision.action === 'review' && !excluded && modelCandidate(fixture.input, spans) ? 'rewrite_needed' : decision.action;
    const key = `${fixture.expected_action} -> ${action}`;
    confusion[key] = (confusion[key] ?? 0) + 1; reasons[decision.reason] = (reasons[decision.reason] ?? 0) + 1;
  }
  return { fixtures: fixtures.length, confusion, reasons, annotations: 'provisional agent-authored expected actions' };
}
