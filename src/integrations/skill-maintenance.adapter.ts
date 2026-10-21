// Adapter: preserve owned skill installations in backups before replacing or disabling them.
import { homedir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { lstat, mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { json } from '../runtime/files.js';
import { installSkill } from './skill-installer.js';
export const skillTarget = () => resolve(process.env.CLAUDE_CONFIG_DIR ?? resolve(homedir(), '.claude'), 'skills/claude-bdsm');
export async function skillStatus(root: string, target = skillTarget()) {
  const info = await lstat(target).catch(() => undefined);
  const record = await json<{ applicationRoot: string }>(resolve(target, 'installation.json')).catch(() => undefined);
  return { installed: !!info, owned: !!info && !info.isSymbolicLink() && record?.applicationRoot === resolve(root), target };
}
export async function maintainSkill(root: string, action: 'install' | 'update' | 'remove', target = skillTarget()) {
  if (action === 'install') return { target: await installSkill(root, target) };
  const status = await skillStatus(root, target);
  if (!status.owned || basename(target) !== 'claude-bdsm' || resolve(target) === resolve(root)) throw new Error('SKILL_NOT_OWNED');
  const config = resolve(dirname(target), '..');
  const backup = resolve(config, 'skill-backups', `claude-bdsm-${randomUUID()}`);
  if (!backup.startsWith(config + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('INVALID_SKILL_TARGET');
  await mkdir(dirname(backup), { recursive: true });
  await rename(target, backup);
  try { if (action === 'update') await installSkill(root, target); }
  catch (error) { await rename(backup, target); throw error; }
  return { target, backup, message: action === 'remove' ? 'Skill disabled. Your files are preserved in the backup.' : 'Skill updated. Previous files are preserved in the backup.' };
}
