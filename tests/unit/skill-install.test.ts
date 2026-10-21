// Tests: installable skill resolves its companion from another cwd and preserves existing user skills.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { installSkill } from '../../src/integrations/skill-installer.js';
test('skill installation is portable and never overwrites a pre-existing installation', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tone-skill-'));
  const target = join(temp, 'claude-bdsm');
  try {
    const path = await installSkill(process.cwd(), target);
    assert.equal(path, target);
    assert.equal(JSON.parse(await readFile(join(target, 'installation.json'), 'utf8')).applicationRoot, process.cwd());
    assert.equal(await readFile(join(target, 'LICENSE'), 'utf8'), await readFile('LICENSE', 'utf8'));
    await assert.rejects(installSkill(process.cwd(), target), /SKILL_ALREADY_EXISTS/);
    await access(join(target, 'SKILL.md'));
    assert.deepEqual((await readdir(temp)), ['claude-bdsm']);
    const helper = spawnSync(process.execPath, [join(target, 'scripts/manage.mjs'), 'doctor'], { cwd: temp, encoding: 'utf8' });
    assert.equal(helper.status, 0, helper.stderr);
    assert.equal(JSON.parse(helper.stdout).networkUsed, false);
    const privateInput = spawnSync(process.execPath, [join(target, 'scripts/manage.mjs'), 'chat'], { cwd: temp, input: 'synthetic private input', encoding: 'utf8' });
    assert.equal(privateInput.status, 2);
    assert.equal(privateInput.stdout, '');
  } finally { await rm(temp, { recursive: true, force: true }); }
});
