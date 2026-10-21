// Tests: source parsing preserves literal bytes and UTF-16 offsets without normalization.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashText, parseProtected } from '../../src/core/parse.js';
import { protect, restore } from '../../src/core/protect.js';

test('fences preserve CRLF, mixed languages, surrogate pairs, and combining marks', () => {
  const text = '😀 e\u0301 שלום\r\n```ts\r\nconst x = "😈 שלום";\r\n```\r\nFix src/auth.ts.';
  const spans = parseProtected(text);
  assert.equal(spans[0]!.start, text.indexOf('```'));
  assert.equal(spans[0]!.raw, '```ts\r\nconst x = "😈 שלום";\r\n```\r\n');
  for (const span of spans) {
    assert.equal(text.slice(span.start, span.end), span.raw);
    assert.equal(hashText(span.raw), span.sha256);
  }
  assert.equal(restore(protect(text, spans).masked, protect(text, spans)), text);
});

test('different fence widths, trailing text, and unclosed fences are conservative', () => {
  const text = '~~~~js\nA\n~~~\nB\n~~~~ comment\nC\n~~~~\n';
  assert.equal(parseProtected(text)[0]!.raw, text);
  assert.equal(parseProtected('```js\nunfinished')[0]!.raw, '```js\nunfinished');
});

test('inline delimiters use matching run widths and allow inner backticks', () => {
  const text = 'Use ``a ` b`` then `value`.';
  assert.deepEqual(parseProtected(text).map(s => s.raw), ['``a ` b``', '`value`']);
});

test('identifiers, URLs, commands, paths, units, and constraints retain source slices', () => {
  const text = 'Use authToken and user_id at https://example.test/api. Run npm test. ' +
    'Fix C:\\work\\auth.ts and src/main.ts in 500 ms at 90%; do not change the API.';
  const spans = parseProtected(text);
  for (const expected of ['authToken', 'user_id', 'npm test', 'C:\\work\\auth.ts',
    'src/main.ts', '500 ms', '90%', 'do not change the API.']) {
    assert.ok(spans.some(s => s.raw === expected), expected);
  }
  assert.ok(spans.some(s => s.kind === 'url'));
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i - 1]!.end <= spans[i]!.start);
});

test('full logs take precedence over their inner paths and attack words', () => {
  const text = 'ERROR src/auth.ts: you idiot\r\nInspect it.';
  assert.equal(parseProtected(text)[0]!.raw, 'ERROR src/auth.ts: you idiot');
});

test('apostrophes within words do not hide prose as quoted data', () => {
  assert.equal(parseProtected("You're useless and I'm unhappy.").filter(s => s.kind === 'quote').length, 0);
  assert.equal(parseProtected("Explain the string 'you idiot'.")[0]!.raw, "'you idiot'");
});
