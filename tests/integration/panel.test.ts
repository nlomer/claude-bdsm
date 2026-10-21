// Tests: real loopback HTTP accepts only the launch token/origin and never sends on preview/copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { request as httpRequest } from 'node:http';
import { startPanel } from '../../src/local-ui/panel.controller.js';
import { Application } from '../../src/app/application.controller.js';
import { previewMessage } from '../../src/app/preview.controller.js';
test('panel protocol blocks cross-origin/stale/replayed actions and renders inert local assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'manners-panel-')); let calls = 0;
  await mkdir(join(root, 'src'), { recursive: true }); await cp(resolve('src/local-ui'), join(root, 'src/local-ui'), { recursive: true });
  const app = new Application(root, { preview: previewMessage, locate: async () => process.execPath,
    submit: async result => { calls++; assert.ok(!result.output?.includes('You idiot')); return { code: 0, stdout: JSON.stringify({ type: 'result', subtype: 'success', result: 'Synthetic reply.', usage: { input_tokens: 1 } }), stderr: '' }; } });
  const panel = await startPanel(root, app);
  const headers = { Origin: panel.origin, Authorization: `Bearer ${panel.token}`, 'Content-Type': 'application/json' };
  const request = (action: string, value: unknown = {}, extra = {}) => fetch(panel.origin + '/api/' + action, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(value) });
  try {
    const page = await fetch(panel.origin); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    assert.match(await page.text(), /Preview the peace treaty/);
    assert.equal((await request('status', {}, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('status', {}, { Authorization: 'Bearer wrong' })).status, 403);
    assert.equal((await fetch(panel.origin + '/api/status')).status, 403);
    const hostileHost = await new Promise<number>(yes => {
      const req = httpRequest(panel.origin + '/api/status', { method: 'POST', headers: { ...headers, Host: 'evil.example' } }, res => { res.resume(); yes(res.statusCode!); });
      req.end('{}');
    });
    assert.equal(hostileHost, 403);
    assert.equal((await fetch(panel.origin + '/../../package.json')).status, 403);
    assert.equal((await request('settings', {})).status, 400);
    assert.equal((await request('install', { confirmed: false })).status, 400);
    assert.equal((await request('skill', { action: 'remove', confirmed: false })).status, 400);
    const status = (await (await request('status')).json()).data;
    assert.equal(status.readiness.ready, true);
    status.settings.preferences.project = root;
    assert.equal((await request('settings', { settings: status.settings })).status, 200);
    const input = 'You idiot. Fix src/auth.ts; do not change the API.\nKeep <script>alert(1)</script> as literal sample text.';
    const first = (await (await request('preview', { text: input })).json()).data;
    assert.equal(first.canApprove, true); assert.equal(calls, 0);
    assert.equal((await request('copy', { id: first.id, approved: false })).status, 400);
    const copied = (await (await request('copy', { id: first.id, approved: true })).json()).data;
    assert.ok(copied.text.includes('<script>alert(1)</script>')); assert.equal(calls, 0);
    const sent = (await (await request('send', { id: first.id, approved: true })).json()).data;
    assert.equal(sent.successful, true); assert.equal(calls, 1);
    assert.equal((await request('send', { id: first.id, approved: true })).status, 400); assert.equal(calls, 1);
    const second = (await (await request('preview', { text: 'Fix the test.' })).json()).data;
    await request('cancel'); assert.equal((await request('copy', { id: second.id, approved: true })).status, 400);
    assert.equal((await request('preview', { text: 'a'.repeat(263000) })).status, 400);
  } finally { await panel.close(); await rm(root, { recursive: true, force: true }); }
});
