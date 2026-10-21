// Tests: exact-output approval, shell-free stdin envelopes, cancellation and no bypass flags.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { sanitize, identity } from '../../src/core/sanitize.js';
import { hashText } from '../../src/core/parse.js';
import { submit } from '../../src/integrations/claude-wrapper.js';
import { canSubmit } from '../../src/integrations/approval.js';
import { hookDecision } from '../../src/integrations/claude-hook.js';
const mock = resolve('tests/fixtures/mock-claude.mjs');
test('only the exact approved final text reaches a mock Claude child through stdin', async () => {
  assert.equal(canSubmit(identity('You idiot.')), false);
  const original = 'You idiot. Fix src/auth.ts; do not change the API.';
  const baseline = sanitize({ text: original, tone: 'neutral', mode: 'rules' });
  const result = { ...baseline, validation: { ...baseline.validation, requiresHumanReview: true } };
  assert.equal(canSubmit(result), false); assert.equal(canSubmit(result, hashText(original)), false);
  await assert.rejects(submit(result, { executable: process.execPath, prefixArgs: [mock], cwd: process.cwd() }), /NOT_APPROVED/);
  const child = await submit(result, { executable: process.execPath, prefixArgs: [mock], cwd: process.cwd(), approvedHash: hashText(result.output!) });
  assert.equal(child.code, 0);
  const envelope = JSON.parse(child.stdout);
  assert.equal(envelope.text, result.output); assert.notEqual(envelope.text, original);
  assert.deepEqual(envelope.argv, ['-p', '--output-format', 'json']);
  assert.equal(envelope.textInEnvironment, false);
});
test('wrapper handles a missing executable and cancels an owned mock child', async () => {
  const result = sanitize({ text: 'Fix the test.', tone: 'neutral', mode: 'rules' });
  await assert.rejects(submit(result, { executable: resolve('missing-native-executable'), cwd: process.cwd() }));
  const child = await submit(result, { executable: process.execPath, prefixArgs: [mock, '--wait'], cwd: process.cwd(), signal: AbortSignal.timeout(200) });
  assert.notEqual(child.code, 0);
});
test('hook only blocks/suggests and cannot silently replace a prompt', () => {
  assert.deepEqual(hookDecision({ prompt: 'Fix the test.' }), {});
  const blocked = hookDecision({ prompt: 'You idiot. Fix src/auth.ts.' });
  assert.equal(blocked.decision, 'block');
  assert.ok(blocked.reason?.includes('Manual resubmission'));
  assert.equal(hookDecision({ prompt: '/safeword Fix it.' }).decision, 'block');
  assert.throws(() => hookDecision({ prompt: 2 }), /INVALID_HOOK_INPUT/);
});
