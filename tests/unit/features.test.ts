// Tests: thirty style fixtures preserve tasks and optional local controls never bypass validation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processMessage } from '../../src/features/process.js';
import { defaults, validateConsent } from '../../src/features/consent.js';
import { recordStats, loadStats } from '../../src/features/stats.js';
import { safeWord } from '../../src/features/safeword.js';
import { rage } from '../../src/features/rage.js';
import type { Tone } from '../../src/core/types.js';
const styles = readFileSync('fixtures/style.jsonl', 'utf8').trim().split('\n').map(line => JSON.parse(line) as { id: string; tone: Tone; input: string; expectedOutput: string });
for (const fixture of styles) test(fixture.id, async () => {
  const result = await processMessage(fixture.input, defaults, { tone: fixture.tone });
  assert.equal(result.result.output, fixture.expectedOutput);
  assert.equal(result.result.validation.requiresHumanReview, true);
});
test('safeword forces neutral and suppresses awards; command text never becomes downstream input', async () => {
  const item = await processMessage('/safeword You idiot. Fix src/auth.ts.', { ...defaults, personality: 'victorian' });
  assert.equal(item.tone, 'neutral'); assert.deepEqual(item.awards, []);
  assert.ok(!item.result.output?.includes('/safeword'));
  assert.equal(safeWord('Discuss /safeword').forcedNeutral, false);
  assert.equal((await processMessage('/safeword', defaults)).result.output, undefined);
});
test('consent can disable rewriting or explicitly clean prose, never raw-forward uncertain attacks', async () => {
  const disabled = await processMessage('You idiot. Fix it.', { ...defaults, targetedInsults: false });
  assert.equal(disabled.result.output, undefined);
  const cleaned = await processMessage('This fucking test fails. Keep `fucking value`.', { ...defaults, profanityCleanup: true });
  assert.equal(cleaned.result.output, 'This test fails. Keep `fucking value`.');
  assert.equal(cleaned.result.validation.requiresHumanReview, true);
  assert.throws(() => validateConsent({ uncertain: 'forward' }), /INVALID_CONSENT/);
  assert.throws(() => validateConsent({ retention: 'yes' }), /INVALID_CONSENT/);
  assert.ok(rage('YOU IDIOT!!!') >= rage('Please fix the test.'));
  assert.ok(rage('IDIOT '.repeat(100)) <= 100);
});
test('default aggregation stores no original or rewritten message bodies and works without networking', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-private-'));
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('external networking disabled'); };
  try {
    const text = 'You idiot. Fix UNIQUE_PRIVATE_MARKER.';
    const item = await processMessage(text, defaults);
    await recordStats(root, item.result, item.awards);
    assert.equal((await loadStats(root)).events, 1);
    const content = await readFile(join(root, '.local/stats.json'), 'utf8');
    assert.ok(!content.includes('UNIQUE_PRIVATE_MARKER'));
    assert.ok(!content.includes(text));
    assert.equal(defaults.retention, false);
  } finally { globalThis.fetch = previous; await rm(root, { recursive: true, force: true }); }
});
