// Tests: schema errors are actionable and all provisional smoke expectations are exercised.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFixtures, validateFixture } from '../../src/fixtures/schema.js';
import { sanitize } from '../../src/core/sanitize.js';
const source = readFileSync('fixtures/foundation-smoke.jsonl', 'utf8');
const fixtures = parseFixtures(source);

test('20 provisional fixtures contain valid UTF-16 annotations', () => {
  assert.equal(fixtures.length, 20);
  assert.equal(new Set(fixtures.map(f => f.id)).size, 20);
  assert.ok(fixtures.every(f => f.annotation_review === 'pending'));
});

for (const fixture of fixtures) {
  test(`smoke ${fixture.id}: ${fixture.expected_status}`, () => {
    const result = sanitize({ text: fixture.input, tone: 'neutral', mode: 'hybrid' });
    assert.equal(result.status, fixture.expected_status);
    if (result.status === 'unchanged') assert.equal(result.output, fixture.input);
    else if (result.status === 'rewritten') {
      assert.ok(fixture.acceptable_examples.includes(result.output!));
      for (const raw of fixture.protected_exact) assert.ok(result.output!.includes(raw));
      assert.equal(sanitize({ text: result.output!, tone: 'neutral', mode: 'rules' }).status, 'unchanged');
    } else {
      assert.equal(result.output, undefined);
      assert.equal(result.validation.requiresHumanReview, true);
    }
  });
}

test('invalid records identify line and field without exposing prompt bodies', () => {
  assert.throws(() => parseFixtures('{'), /line 1: invalid JSON/);
  assert.throws(() => parseFixtures(source + source), /line 21: invalid duplicate id/);
  assert.throws(() => validateFixture(null), /invalid record/);
  const base = fixtures[5]!;
  for (const [field, value] of Object.entries({ category: 'unknown', severity: 'critical',
    expected_action: 'pass', annotation_review: 'approved', task_constraints: [4],
    editable_spans: [{ start: 0, end: 2, text: 'wrong' }], protected_exact: ['wrong'] })) {
    assert.throws(() => validateFixture({ ...base, [field]: value }), new RegExp(`invalid ${field}`));
  }
  assert.throws(() => validateFixture({ ...base, protected_spans: base.editable_spans,
    protected_exact: base.editable_spans.map(s => s.text) }), /overlapping annotations/);
  assert.throws(() => validateFixture({ ...fixtures[0], expected_status: 'rewritten' }), /keep contract/);
});
