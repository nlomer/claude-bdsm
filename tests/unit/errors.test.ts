// Tests: useful operational codes never expose a private error body or source text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicErrorCode, errorResult } from '../../src/cli/error.js';
test('runtime diagnostics retain stable codes and remove private details', () => {
  assert.equal(publicErrorCode(new Error('RUNTIME_LOAD_FAILED: private path or native output')), 'RUNTIME_LOAD_FAILED');
  assert.equal(publicErrorCode(new Error('untrusted private text')), 'OPERATION_FAILED');
  const result = errorResult('MODEL_NOT_INSTALLED');
  assert.equal(result.output, undefined); assert.equal(result.status, 'error');
  assert.equal(result.validation.requiresHumanReview, true);
});
