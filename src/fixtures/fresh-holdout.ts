// Service: materialize source-offset annotations for unseen full-task holdout families.
import { holdoutFamilies } from './holdout-families.js';
import { validateFixture } from './schema.js';
import type { Fixture, FixtureSpan } from './types.js';
function literals(input: string, path: string): FixtureSpan[] {
  const values = [path, ...[...input.matchAll(/`[^`]+`|"[^"\r\n]+"|^  at .+$/gm)].map(m => m[0])];
  const spans = values.map(text => ({ start: input.indexOf(text), end: input.indexOf(text) + text.length, text }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  return spans.filter((span, i) => !spans.slice(0, i).some(s => s.start <= span.start && s.end >= span.end));
}
export function freshHoldout(): Fixture[] {
  return holdoutFamilies.flatMap(family => Array.from({ length: family.count }, (_, n) => {
    const path = `src/holdout-v3/${family.name}/case-${n}.ts`;
    const body = family.body(path, n), input = family.prefix ? `${family.prefix} ${body}` : body;
    const protectedSpans = literals(input, path);
    return validateFixture({ id: `holdout-v3-${family.name}-${n}`, group: `holdout-v3-${family.name}`,
      category: family.category, input, expected_action: family.action,
      expected_status: family.action === 'keep' ? 'unchanged' : family.action === 'review' ? 'review_required' : 'rewritten',
      editable_spans: family.prefix ? [{ start: 0, end: family.prefix.length, text: family.prefix }] : [],
      protected_spans: protectedSpans, protected_exact: protectedSpans.map(s => s.text),
      task_constraints: family.prefix ? [body.trim()] : [],
      atomic_task_constraints: body.split(/;\s+/).map(clause => clause.trim()).filter(Boolean),
      forbidden_changes: ['Changing action, order, scope, negation or parameters', 'Inventing unrelated work', 'Changing protected literals'],
      acceptable_examples: [family.prefix ? `I'm frustrated with the previous result. ${body}` : body],
      severity: family.action === 'keep' ? 'none' : 'moderate', annotation_review: 'pending' });
  }));
}
