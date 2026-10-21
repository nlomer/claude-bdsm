// Tests: execute review controls against a network-free synthetic DOM; this is not visual browser QA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { readFileSync } from 'node:fs';
import { reviewHtml } from '../../src/bench/review.js';
import { parseFixtures } from '../../src/fixtures/schema.js';
import type { BenchRow } from '../../src/bench/types.js';
import { identity } from '../../src/core/sanitize.js';
test('review treats hostile HTML as text and navigation/save controls execute without networking', () => {
  const input = '</script><img src=x onerror="throw 1">';
  const fixture = { ...parseFixtures(readFileSync('fixtures/foundation-smoke.jsonl', 'utf8'))[0]!, input };
  const row: BenchRow = { id: 'synthetic-dom-row', fixtureId: fixture.id, group: fixture.group, category: fixture.category,
    expectedAction: 'keep', model: 'hidden', method: 'identity', prompt: 'instruction', promptHash: 'test', temperature: 0,
    repeat: 0, inputLength: input.length, result: identity(input), elapsedMs: 0,
    automatic: { protectedIntact: true, constraintsExact: true, toneProxy: true, changedKeep: false, provisionalRewriteSuccess: false } };
  const html = reviewHtml([row], [fixture]).html;
  assert.ok(!html.includes('<img src=x'));
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  interface Element { textContent: string; value: string; checked: boolean; onclick?: () => void; append: (...items: unknown[]) => void; click: () => void }
  const make = (): Element => ({ textContent: '', value: '', checked: false, append: () => {}, click: () => {} });
  const elements = new Map<string, Element>();
  const get = (id: string) => { if (!elements.has(id)) elements.set(id, make()); return elements.get(id)!; };
  let exported = false;
  new Script(script).runInNewContext({ document: { getElementById: get, createElement: make }, Blob,
    URL: { createObjectURL: () => { exported = true; return 'synthetic-blob'; }, revokeObjectURL: () => {} } });
  assert.equal(get('original').textContent, input);
  assert.equal(get('output').textContent, input);
  get('reviewer').value = 'synthetic-test-only';
  get('next').onclick!(); get('previous').onclick!(); get('save').onclick!();
  assert.equal(exported, true);
});
