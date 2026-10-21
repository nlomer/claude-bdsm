// Controller: explain only the selected profile's readiness and the optional Claude integration.
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { profiles } from './preferences.types.js';
import { loadSettings } from './settings.adapter.js';
import { locateClaude } from '../integrations/locate-claude.js';
import { skillStatus } from '../integrations/skill-maintenance.adapter.js';
import { digest, json } from '../runtime/files.js';
import type { ModelLock, RuntimeLock } from '../runtime/registry.js';
import { findExecutable } from '../runtime/runtime-install.js';
import { bundleHashes } from '../runtime/bundle.js';
async function verified(path: string, hash: string, size?: number) {
  return stat(path).then(async file => (size === undefined || file.size === size) && await digest(path) === hash).catch(() => false);
}
export async function profileReady(root: string, profile: keyof typeof profiles) {
  const model = profiles[profile].model;
  if (!model) return { ready: true, runtime: false, model: false };
  const locks = await json<ModelLock[]>(resolve(root, 'models.lock.json'));
  const lock = locks.find(m => m.id === model)!;
  const runtime = await json<RuntimeLock>(resolve(root, 'runtime.lock.json'));
  const folder = resolve(root, '.tools', runtime.tag, process.platform);
  const executable = await findExecutable(folder).catch(() => '');
  const runtimeReady = runtime.installedPlatform === process.platform && !!executable && !!runtime.executableSha256 && await verified(executable, runtime.executableSha256) &&
    (!runtime.bundleSha256 || JSON.stringify(await bundleHashes(folder)) === JSON.stringify(runtime.bundleSha256));
  const modelReady = !!lock && await verified(resolve(root, 'models', lock.id, lock.file), lock.advertisedSha256, lock.bytes);
  return { ready: runtimeReady && modelReady, runtime: runtimeReady, model: modelReady };
}
export async function appStatus(root: string) {
  const settings = await loadSettings(root);
  const readiness = await profileReady(root, settings.preferences.profile);
  const claude = await locateClaude(settings.preferences.claudePath || undefined).then(() => true).catch(() => false);
  return { settings, profiles, readiness, claude, skill: await skillStatus(root),
    message: readiness.ready ? 'Ready. Your keyboard may now enter anger management.' : 'This optional model needs installation. Choose Install selected AI, or switch to Instant.',
    claudeMessage: claude ? 'Claude found. Sending uses your existing account and permissions.' : 'Claude was not found. Copy still works; install Claude Code or set its native executable in Advanced.' };
}
