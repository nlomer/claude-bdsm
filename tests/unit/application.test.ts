// Tests: panel approvals survive neither changed input/settings nor cancellation; sends are single-use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Application } from '../../src/app/application.controller.js';
import { previewMessage } from '../../src/app/preview.controller.js';
import { preferenceDefaults } from '../../src/app/preferences.types.js';
import { defaults } from '../../src/features/consent.js';
test('exact panel approval, changed settings and single-use send never forward an original', async () => {
  const root = await mkdtemp(join(tmpdir(), 'manners-app-')); let calls = 0;
  const app = new Application(root, { preview: previewMessage, locate: async () => process.execPath, submit: async (result, options) => {
    calls++; assert.equal(options.cwd, root); assert.ok(options.approvedHash); assert.ok(!result.output?.includes('idiot'));
    return { code: 0, stdout: JSON.stringify({ type: 'result', subtype: 'success', result: 'Done.', usage: { input_tokens: 1 } }), stderr: '' };
  } });
  try {
    const original = 'You idiot. Fix src/auth.ts; do not change the API.\nRun npm test.';
    const first = await app.preview(original);
    await assert.rejects(app.copy(first.id, false), /PREVIEW_EXPIRED/); assert.equal(calls, 0);
    assert.equal((await app.copy(first.id, true)).text, first.result.output);
    await app.settings({ preferences: { ...preferenceDefaults, project: root }, consent: { ...defaults } });
    await assert.rejects(app.copy(first.id, true), /PREVIEW_EXPIRED/);
    const second = await app.preview(original);
    const sends = await Promise.allSettled([app.send(second.id, true), app.send(second.id, true)]);
    assert.equal(sends.filter(r => r.status === 'fulfilled').length, 1); assert.equal(calls, 1);
    await assert.rejects(app.send(second.id, true), /PREVIEW_EXPIRED/);
    const uncertain = await app.preview('You idiot, run npm test but never npm run deploy.');
    assert.equal(uncertain.canApprove, false);
    await assert.rejects(app.copy(uncertain.id, true), /PREVIEW_NOT_APPROVABLE/);
    const settings = await readFile(join(root, '.local/preferences.json'), 'utf8');
    assert.ok(!settings.includes('src/auth.ts'));
    const stats = await readFile(join(root, '.local/stats.json'), 'utf8'); assert.ok(!stats.includes('idiot'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('cancellation invalidates a pending preview and operation exclusivity is enforced', async () => {
  const root = await mkdtemp(join(tmpdir(), 'manners-cancel-'));
  let ready!: () => void; const started = new Promise<void>(yes => { ready = yes; });
  const app = new Application(root, { locate: async () => '', submit: async () => { throw new Error('MUST_NOT_SEND'); },
    preview: async (_root, _text, _settings, signal) => { ready(); await new Promise((_yes, no) => signal.addEventListener('abort', () => no(new Error('CANCELLED')), { once: true })); throw new Error('UNREACHABLE'); } });
  try {
    const pending = app.preview('synthetic'); await started;
    await assert.rejects(app.preview('another'), /APP_BUSY/);
    app.cancel(); await assert.rejects(pending, /CANCELLED/); assert.equal(app.busy, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
