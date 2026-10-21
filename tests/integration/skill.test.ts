// Tests: installed Claude discovers the copied skill in an isolated profile, without a real provider.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { locateClaude } from '../../src/integrations/locate-claude.js';
import { installSkill } from '../../src/integrations/skill-installer.js';
import { json, saveJson } from '../../src/runtime/files.js';
import { stopChild } from '../../src/runtime/process.js';
const executable = await locateClaude().catch(() => undefined);
test('Claude registers and expands the installed local skill before any provider request', { skip: !executable, timeout: 30000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-skill-discovery-'));
  let requests = 0;
  const endpoint = createServer((_req, res) => { requests++; res.writeHead(400).end('OFFLINE_TEST_ONLY'); });
  await new Promise<void>(yes => endpoint.listen(0, '127.0.0.1', yes));
  const address = endpoint.address(); assert.ok(address && typeof address !== 'string');
  try {
    const config = join(root, 'profile');
    await installSkill(process.cwd(), join(config, 'skills/claude-bdsm'));
    const receipt = join(root, 'expanded.json'), settings = join(root, 'settings.json');
    await saveJson(settings, { hooks: { UserPromptExpansion: [{ hooks: [{ type: 'command', command: process.execPath,
      args: [resolve('tests/fixtures/skill-expansion-hook.mjs'), receipt], timeout: 5, onFailure: 'block' }] }] } });
    const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CONFIG_DIR: config, ANTHROPIC_API_KEY: 'offline-synthetic-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${address.port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' };
    delete env.ANTHROPIC_AUTH_TOKEN;
    const child = spawn(executable!, ['-p', '--output-format', 'json', '--settings', settings, '--setting-sources', 'user',
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence'],
    { cwd: root, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data.toString(); }); child.stderr.on('data', data => { output += data.toString(); });
    const timer = setTimeout(() => { void stopChild(child); }, 15000);
    const exited = once(child, 'close'); child.stdin.end('/claude-bdsm');
    const [code] = await exited; clearTimeout(timer);
    const expansion = await json<{ event: string; command: string }>(receipt).catch(() => undefined);
    await saveJson(resolve('reports/claude-skill-discovery.json'), { installedVersion: '2.1.305', exitCode: code,
      fakeProviderRequests: requests, expansion, markerSeen: output.includes('OFFLINE_SKILL_DISCOVERY_PROOF'), output });
    assert.equal(requests, 0); assert.match(output, /OFFLINE_SKILL_DISCOVERY_PROOF/);
    assert.equal(expansion?.event, 'UserPromptExpansion');
    assert.ok(expansion?.command.includes('claude-bdsm'));
  } finally {
    await new Promise<void>(yes => endpoint.close(() => yes()));
    await rm(root, { recursive: true, force: true });
  }
});
