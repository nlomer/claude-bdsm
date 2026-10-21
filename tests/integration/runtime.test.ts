// Tests: real installed CPU sidecar lifecycle; run separately after the serial benchmark releases ownership.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LlamaServer } from '../../src/runtime/llama-server.js';
import { json } from '../../src/runtime/files.js';
import type { ModelLock, RuntimeLock } from '../../src/runtime/registry.js';
const models = await json<ModelLock[]>('models.lock.json');
const runtime = await json<RuntimeLock>('runtime.lock.json');
const model = models.find(m => m.id === 'smol-135m-q4km')!;
const installed = await Promise.all([
  access(resolve('models', model.id, model.file)), access(resolve('.tools', runtime.tag, process.platform))
]).then(() => true).catch(() => false);
test('real CPU runtime authenticates, bounds requests, cancels, and cleans up its child', { skip: !installed }, async () => {
  const server = await LlamaServer.start(process.cwd(), 'smol-135m-q4km');
  const pid = server.child.pid!;
  try {
    const response = await fetch(server.http.base + '/props');
    assert.equal(response.status, 401);
    const request = { system: 'Copy exactly.', input: 'Hello.', seed: 42, temperature: 0, maxOutputTokens: 256, signal: new AbortController().signal };
    const first = server.generate(request);
    await assert.rejects(server.generate(request), /RUNTIME_QUEUE_FULL/);
    await first;
    await assert.rejects(server.generate({ ...request, signal: AbortSignal.abort() }));
    await assert.rejects(server.generate({ ...request, input: 'long '.repeat(6000) }), /CONTEXT_OVERFLOW/);
  } finally { await server.close(); }
  assert.throws(() => process.kill(pid, 0));
  await assert.rejects(access('.tools/active.lock'));
});
