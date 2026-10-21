// Tests: public stdin/JSON contracts, output-hash approval and private default storage isolation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashText } from '../../src/core/parse.js';
const entry = fileURLToPath(new URL('../../src/cli.js', import.meta.url));
test('standalone text/JSON preview never sends an unapproved or unsuccessful result to stdout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-cli-'));
  const invoke = (args: string[], input: string | Buffer) => spawnSync(process.execPath, [entry, ...args], { cwd: root, input, encoding: 'utf8' });
  try {
    const original = 'You idiot. Fix src/auth.ts; do not change the API.';
    const output = "I'm frustrated with the previous result. Fix src/auth.ts; do not change the API.";
    const preview = invoke(['sanitize', '--stdin'], original);
    assert.equal(preview.status, 3); assert.equal(preview.stdout, '');
    assert.match(preview.stderr, /Approval SHA-256:/);
    const approved = invoke(['sanitize', '--approve', hashText(output)], original);
    assert.equal(approved.status, 0); assert.equal(approved.stdout, output);
    const stale = invoke(['sanitize', '--approve', hashText(original)], original);
    assert.equal(stale.status, 3); assert.equal(stale.stdout, '');
    const data = invoke(['sanitize', '--json'], original);
    assert.equal(data.status, 3); assert.equal(JSON.parse(data.stdout).output, output);
    const review = invoke(['sanitize', '--stdin'], 'You idiot, run npm test but never npm run deploy.');
    assert.equal(review.status, 3); assert.equal(review.stdout, '');
    assert.equal(invoke(['sanitize', '--tone', 'wrong'], 'text').status, 1);
    assert.equal(invoke(['sanitize'], Buffer.from([0xff])).status, 1);
    const missing = invoke(['sanitize', '--model', 'not-installed', '--json'], original);
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).status, 'error');
    assert.equal(JSON.parse(missing.stdout).output, undefined);
    const hybrid = invoke(['sanitize', '--model', 'smol-135m-q4km', '--json'], original);
    assert.equal(hybrid.status, 3);
    assert.equal(JSON.parse(hybrid.stdout).engine, 'rules');
    const cleanPreview = invoke(['sanitize', '--stdin'], 'Fix it.\r\n');
    assert.equal(cleanPreview.status, 3); assert.equal(cleanPreview.stdout, '');
    const clean = invoke(['sanitize', '--stdin', '--approve', hashText('Fix it.\r\n')], 'Fix it.\r\n');
    assert.equal(clean.status, 0); assert.equal(clean.stdout, 'Fix it.\r\n');
    assert.deepEqual(await readdir(join(root, '.local')), ['stats.json']);
    assert.ok(!(await readFile(join(root, '.local/stats.json'), 'utf8')).includes('src/auth.ts'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
