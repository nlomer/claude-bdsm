// Tests: loopback authentication, token budgeting, streaming timing, deadlines, and exclusive ownership.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalHttp } from '../../src/runtime/http.js';
import { generate } from '../../src/runtime/generate.js';
import { ownRuntime } from '../../src/runtime/ownership.js';

test('authenticated mock inference measures streaming TTFT and rejects overflow/reasoning/cancellation', async () => {
  let tokens = 20, reasoning = false;
  const server = createServer(async (req, res) => {
    if (req.headers.authorization !== 'Bearer secret') { res.writeHead(401).end(); return; }
    for await (const _chunk of req) { /* consume bounded synthetic test request */ }
    if (req.url === '/unicode') {
      const body = Buffer.from(JSON.stringify({ text: '😀e\u0301 שלום' }));
      res.write(body.subarray(0, 10));
      setTimeout(() => res.end(body.subarray(10)), 20); return;
    }
    if (req.url === '/apply-template') { res.end(JSON.stringify({ prompt: 'rendered' })); return; }
    if (req.url === '/tokenize') { res.end(JSON.stringify({ tokens: Array(tokens).fill(1) })); return; }
    res.setHeader('Content-Type', 'text/event-stream');
    res.write('data: ' + JSON.stringify({ choices: [{ delta: reasoning ? { reasoning_content: 'think' } : { content: 'Hello.' }, finish_reason: null }] }) + '\n\n');
    res.end('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 20, completion_tokens: 3 } }) + '\n\ndata: [DONE]\n\n');
  });
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`, http = new LocalHttp(base, 'secret');
  const request = { system: 'copy', input: 'Hello.', temperature: 0, maxOutputTokens: 256, seed: 42, signal: new AbortController().signal };
  try {
    assert.throws(() => new LocalHttp('https://remote.test', 'secret'), /NON_LOOPBACK/);
    await assert.rejects(new LocalHttp(base, 'wrong').json('/props', undefined, request.signal), /LOCAL_HTTP_401/);
    assert.equal((await http.json<{ text: string }>('/unicode', undefined, request.signal)).text, '😀e\u0301 שלום');
    const result = await generate(http, request);
    assert.equal(result.text, 'Hello.'); assert.equal(result.finishReason, 'stop');
    assert.equal(result.outputTokens, 3); assert.ok(result.timingsMs.ttft! >= 0);
    tokens = 2048;
    await assert.rejects(generate(http, request), /CONTEXT_OVERFLOW/);
    tokens = 20; reasoning = true;
    await assert.rejects(generate(http, request), /REASONING_NOT_DISABLED/);
    await assert.rejects(generate(http, { ...request, signal: AbortSignal.abort() }));
    await assert.rejects(generate(http, { ...request, input: 'x'.repeat(32769) }), /REQUEST_LIMIT/);
  } finally { await new Promise<void>(yes => server.close(() => yes())); }
});

test('exclusive runtime lock rejects concurrent owners and releases only its own lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-owner-'));
  try {
    const release = await ownRuntime(root);
    await assert.rejects(ownRuntime(root), /RUNTIME_BUSY/);
    await release();
    await (await ownRuntime(root))();
  } finally { await rm(root, { recursive: true, force: true }); }
});
