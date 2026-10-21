// Tests: cancelling the panel's lazy model startup releases the real CPU sidecar and ownership lock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { previewMessage } from '../../src/app/preview.controller.js';
import { preferenceDefaults } from '../../src/app/preferences.types.js';
import { defaults } from '../../src/features/consent.js';
import { json } from '../../src/runtime/files.js';
import type { ModelLock } from '../../src/runtime/registry.js';
const lock = (await json<ModelLock[]>('models.lock.json')).find(m => m.id === 'smol-360m-q4km')!;
const installed = await Promise.all([access(`models/${lock.id}/${lock.file}`), access('.tools')]).then(() => true).catch(() => false);
test('panel model cancellation cleans up even when it arrives during startup verification', { skip: !installed, timeout: 100000 }, async () => {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 100);
  try {
    await assert.rejects(previewMessage(process.cwd(), 'You useless idiot, Fix src/auth.ts without changing the public API.',
      { preferences: { ...preferenceDefaults, profile: 'small' }, consent: { ...defaults } }, abort.signal), { name: 'AbortError' });
    await assert.rejects(access('.tools/active.lock'));
  } finally { clearTimeout(timer); }
});
