// Tests: installed Claude hook dispatch against an isolated fake loopback provider, never a live account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { locateClaude } from '../../src/integrations/locate-claude.js';
import { saveJson } from '../../src/runtime/files.js';
import { stopChild } from '../../src/runtime/process.js';
const executable = await locateClaude().catch(() => undefined);
test('installed Claude blocks explicit denials, failed commands and timeouts before fake-provider requests', { skip: !executable, timeout: 60000 }, async () => {
  const folder = await mkdtemp(join(tmpdir(), 'tone-claude-offline-'));
  let requests = 0;
  const endpoint = createServer((_req, res) => { requests++; res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'OFFLINE_TEST_ONLY' } })); });
  await new Promise<void>(yes => endpoint.listen(0, '127.0.0.1', yes));
  const address = endpoint.address(); assert.ok(address && typeof address !== 'string');
  const receipts = [];
  try {
    await mkdir(join(folder, 'config'));
    for (const mode of ['block', 'missing', 'timeout', 'local-command']) {
      const settings = join(folder, `${mode}.json`);
      await saveJson(settings, { hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: process.execPath,
        args: mode === 'local-command' ? [resolve('dist/cli.js'), 'hook'] : [resolve(mode === 'missing' ? 'tests/fixtures/no-such-hook.mjs' : 'tests/fixtures/offline-hook.mjs'), mode], timeout: mode === 'local-command' ? 5 : 1, onFailure: 'block' }] }] } });
      const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CONFIG_DIR: join(folder, 'config'), ANTHROPIC_API_KEY: 'offline-synthetic-key',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${address.port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' };
      delete env.ANTHROPIC_AUTH_TOKEN;
      const child = spawn(executable!, ['-p', '--output-format', 'json', '--settings', settings,
        '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands', '--no-session-persistence'],
      { cwd: folder, env, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', data => { output += data.toString(); }); child.stderr.on('data', data => { output += data.toString(); });
      const timer = setTimeout(() => { void stopChild(child); }, 15000);
      const exited = once(child, 'close'); child.stdin.end(mode === 'local-command' ? 'You idiot. Fix the synthetic test.' : 'Hello.');
      const [code] = await exited; clearTimeout(timer);
      receipts.push({ mode, exitCode: code, fakeProviderRequests: requests, output });
      await saveJson(resolve('reports/claude-hook-offline.json'), { installedVersion: '2.1.305', provider: 'fake loopback endpoint; no live provider', receipts });
      assert.equal(requests, 0, `Hook ${mode} allowed a fake-provider request`);
      assert.match(output, mode === 'block' ? /OFFLINE_HOOK_BLOCK_PROOF/ : /block|timed out/i);
      if (mode === 'local-command') { assert.match(output, /Manual resubmission/); assert.ok(!output.includes('Original prompt:')); }
    }
  } finally {
    await new Promise<void>(yes => endpoint.close(() => yes()));
    await rm(folder, { recursive: true, force: true });
  }
});
