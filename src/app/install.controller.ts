// Controller: install only the explicitly selected optional model and its verified CPU runtime.
import { profiles } from './preferences.types.js';
import { loadPreferences } from './preferences.adapter.js';
import { profileReady } from './status.controller.js';
import { installRuntime } from '../runtime/runtime-install.js';
import { installModels } from '../runtime/installer.js';
export async function installSelected(root: string, confirmed: boolean) {
  if (!confirmed) throw new Error('DOWNLOAD_CONFIRMATION_REQUIRED');
  const settings = await loadPreferences(root), selected = profiles[settings.profile];
  if (!selected.model) return { message: 'Instant needs no downloads. A rare win for your disk.' };
  const readiness = await profileReady(root, settings.profile);
  if (!readiness.runtime) await installRuntime(root);
  if (!readiness.model) await installModels(root, [selected.model]);
  return { message: 'Selected AI installed. No other models were invited.' };
}
