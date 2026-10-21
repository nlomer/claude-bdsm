// Tests: beginner preferences reject dangerous/unknown shapes; successful replies need provider usage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferences } from '../../src/app/preferences.adapter.js';
import { preferenceDefaults } from '../../src/app/preferences.types.js';
import { readableResponse } from '../../src/integrations/claude-response.format.js';
test('preferences accept only known profiles and absolute paths without body fields', () => {
  assert.deepEqual(validatePreferences(preferenceDefaults), preferenceDefaults);
  for (const change of [{ profile: '__proto__' }, { profile: 'auto' }, { version: 2 }, { project: '../project' }, { claudePath: 'relative' }, { text: 'private' }, { project: 'bad\u0000path' }]) {
    assert.throws(() => validatePreferences({ ...preferenceDefaults, ...change }), /INVALID_PREFERENCES/);
  }
});
test('readable Claude replies do not turn block/zero-usage/unknown output into success', () => {
  const envelope = { type: 'result', subtype: 'success', result: '<script>plain text</script>', usage: { input_tokens: 2, output_tokens: 1 } };
  const convert = (value: unknown, code = 0) => readableResponse({ code, stdout: JSON.stringify(value), stderr: '' });
  assert.equal(convert(envelope).successful, true); assert.equal(convert(envelope).text, envelope.result);
  for (const value of [{ ...envelope, usage: {} }, { ...envelope, is_error: true }, { ...envelope, subtype: 'error_during_execution' }, { result: 'looks fine' }]) assert.equal(convert(value).successful, false);
  assert.equal(convert(envelope, 1).successful, false);
  assert.equal(readableResponse({ code: 0, stdout: 'not JSON', stderr: '' }).successful, false);
});
