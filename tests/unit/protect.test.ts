// Tests: strict placeholder restoration rejects damage instead of forwarding an unsafe candidate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashText, parseProtected } from '../../src/core/parse.js';
import { protect, restore } from '../../src/core/protect.js';

test('round trips preserve empty inputs, repeated literals, CRLF, Unicode, and collisions', () => {
  for (const text of ['', 'plain prose', '`x` `x`', '[[BDSM_0_0]] `x` [[BDSM_1_0]]',
    '😀 `e\u0301` שלום\r\n```js\r\n😈\r\n```\r\n']) {
    const protection = protect(text, parseProtected(text));
    assert.equal(restore(protection.masked, protection), text);
  }
  const protection = protect('[[BDSM_0_0]] `x` [[BDSM_1_0]]', parseProtected('[[BDSM_0_0]] `x` [[BDSM_1_0]]'));
  assert.equal(protection.prefix, '[[BDSM_2_');
});

test('missing, duplicated, reordered, unknown, and malformed placeholders are rejected', () => {
  const protection = protect('Use `a` then `b`.', parseProtected('Use `a` then `b`.'));
  const [a, b] = protection.tokens as [string, string];
  for (const candidate of [protection.masked.replace(a, ''), protection.masked + a,
    `Use ${b} then ${a}.`, protection.masked + '[[BDSM_999_0]]',
    protection.masked.replace(a, '[[BDSM_0_broken]]'), protection.masked.replace(a, '[[BDSM_0_0]'),
    protection.masked + '[[BDSM_bad', protection.masked + '[[BDSM_0_99]]']) {
    assert.throws(() => restore(candidate, protection), /INVALID_PLACEHOLDERS/);
  }
});

test('existing lookalikes must remain unchanged; protected literals restore into edited prose', () => {
  const text = '[[BDSM_0_0]] Use `value`.';
  const protection = protect(text, parseProtected(text).filter(s => s.kind === 'inline-code'));
  assert.throws(() => restore(protection.masked.replace('[[BDSM_0_0]]', '[[BDSM_99_0]]'), protection), /INVALID_PLACEHOLDERS/);
  assert.equal(restore(protection.masked.replace('Use', 'Keep'), protection), '[[BDSM_0_0]] Keep `value`.');
});

test('invalid source spans and corrupt protected contents fail before acceptance', () => {
  const text = 'Use `value`.';
  const spans = parseProtected(text);
  for (const span of [{ ...spans[0]!, start: -1 }, { ...spans[0]!, end: 100 },
    { ...spans[0]!, start: 4.5 }, { ...spans[0]!, raw: 'wrong' },
    { ...spans[0]!, sha256: hashText('wrong') }]) {
    assert.throws(() => protect(text, [span]), /INVALID_PROTECTED_SPAN/);
  }
  assert.throws(() => protect(text, [spans[0]!, spans[0]!]), /INVALID_PROTECTED_SPAN/);
  const protection = protect(text, spans);
  spans[0]!.raw = 'caller mutation';
  assert.equal(restore(protection.masked, protection), text);
  protection.spans[0]!.raw = 'corruption';
  assert.throws(() => restore(protection.masked, protection), /CORRUPT_PROTECTION/);
});
