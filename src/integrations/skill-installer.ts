// Adapter: install only a new Claude skill directory; never overwrite existing skills or global settings.
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { saveJson } from '../runtime/files.js';
export async function installSkill(root: string, target = resolve(process.env.CLAUDE_CONFIG_DIR ?? resolve(homedir(), '.claude'), 'skills/claude-bdsm')): Promise<string> {
  const destination = resolve(target);
  if (basename(destination) !== 'claude-bdsm' || destination === resolve(root)) throw new Error('INVALID_SKILL_TARGET');
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination).catch(() => { throw new Error('SKILL_ALREADY_EXISTS'); });
  try {
    await cp(resolve(root, 'skills/claude-bdsm'), destination, { recursive: true, force: false, errorOnExist: true,
      filter: source => basename(source) !== 'installation.json' });
    await saveJson(resolve(destination, 'installation.json'), { version: 1, applicationRoot: resolve(root) });
    return destination;
  } catch (error) {
    // The exact, newly created destination is owned by this attempt; no pre-existing directory is removed.
    await rm(destination, { recursive: true, force: true }); throw error;
  }
}
