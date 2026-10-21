// Adapter: validate and persist versioned preferences without storing message bodies.
import { resolve, isAbsolute } from 'node:path';
import { stat } from 'node:fs/promises';
import { json, saveJson } from '../runtime/files.js';
import { preferenceDefaults, profiles, type Preferences } from './preferences.types.js';
export function validatePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_PREFERENCES');
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(k => !Object.hasOwn(preferenceDefaults, k)) || item.version !== 1 ||
    typeof item.profile !== 'string' || !Object.hasOwn(profiles, item.profile) ||
    typeof item.project !== 'string' || typeof item.claudePath !== 'string' ||
    [item.project, item.claudePath].some(p => p.length > 4096 || /[\x00-\x1f]/.test(p) || !!p && !isAbsolute(p))) throw new Error('INVALID_PREFERENCES');
  return { version: 1, profile: item.profile as Preferences['profile'], project: item.project, claudePath: item.claudePath };
}
export async function loadPreferences(root: string): Promise<Preferences> {
  return json(resolve(root, '.local/preferences.json')).then(validatePreferences).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...preferenceDefaults }; throw error;
  });
}
export async function savePreferences(root: string, value: unknown): Promise<void> {
  const settings = validatePreferences(value);
  if (settings.project && !await stat(settings.project).then(s => s.isDirectory()).catch(() => false)) throw new Error('PROJECT_NOT_FOUND');
  if (settings.claudePath && (/\.(cmd|bat|ps1)$/i.test(settings.claudePath) || !await stat(settings.claudePath).then(s => s.isFile()).catch(() => false))) throw new Error('NATIVE_CLAUDE_NOT_FOUND');
  await saveJson(resolve(root, '.local/preferences.json'), settings);
}
