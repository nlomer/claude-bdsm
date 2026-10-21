// Tests: report escaping, JavaScript syntax and rate denominators protect offline review integrity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { escapeHtml, safeJson, terminalText } from '../../src/core/format.js';
import { reviewHtml } from '../../src/bench/review.js';
import { rate, quantile, shuffle } from '../../src/bench/stats.js';
test('untrusted HTML/control characters cannot execute in rendered report content', () => {
  const attack = '</script><img src=x onerror=alert(1)>\u001b[31m';
  assert.ok(!escapeHtml(attack).includes('<img'));
  assert.ok(!safeJson({ attack }).includes('</script>'));
  assert.ok(!terminalText(attack).includes('\u001b'));
  const review = reviewHtml([], []).html;
  const script = /<script>([\s\S]*)<\/script>/.exec(review)![1]!;
  assert.doesNotThrow(() => new Script(script));
});
test('Wilson intervals retain absolute denominators and empty rates stay unknown', () => {
  assert.equal(rate(0, 0).rate, null);
  const result = rate(0, 20);
  assert.equal(result.numerator, 0); assert.equal(result.denominator, 20);
  assert.ok(result.ci95![1]! > 0);
  assert.equal(quantile([3, 1, 2], .5), 2);
  assert.deepEqual(shuffle([1, 2, 3, 4]), shuffle([1, 2, 3, 4]));
});
