// Tests: owned skill changes preserve custom files; foreign installations are never moved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { maintainSkill } from '../../src/integrations/skill-maintenance.adapter.js';
test('update and removal back up the full owned skill rather than deleting customizations', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'manners-maintenance-')), target = join(folder, 'skills/claude-bdsm');
  try {
    await maintainSkill(process.cwd(), 'install', target);
    await writeFile(join(target, 'custom.md'), 'my customization');
    const updated = await maintainSkill(process.cwd(), 'update', target);
    assert.equal(await readFile(join(updated.backup!, 'custom.md'), 'utf8'), 'my customization');
    await access(join(target, 'SKILL.md'));
    const removed = await maintainSkill(process.cwd(), 'remove', target);
    await access(join(removed.backup!, 'SKILL.md')); await assert.rejects(access(target));
    await maintainSkill(process.cwd(), 'install', target);
    await writeFile(join(target, 'installation.json'), JSON.stringify({ applicationRoot: 'some other clone' }));
    await assert.rejects(maintainSkill(process.cwd(), 'remove', target), /SKILL_NOT_OWNED/);
    await access(join(target, 'SKILL.md'));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
