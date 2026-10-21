// Adapter: inspect local installation integrity without launching inference or using the network.
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { digest, json } from '../runtime/files.js';
import { findExecutable } from '../runtime/runtime-install.js';
import type { ModelLock, RuntimeLock } from '../runtime/registry.js';
export async function installation(root: string) {
  const locks = await json<ModelLock[]>(resolve(root, 'models.lock.json')).catch(() => []);
  const models = await Promise.all(locks.map(async model => {
    const path = resolve(root, 'models', model.id, model.file);
    const verified = await stat(path).then(async info => info.size === model.bytes && await digest(path) === model.advertisedSha256).catch(() => false);
    return { id: model.id, verified, bytes: model.bytes, revision: model.revision };
  }));
  const runtime = await json<RuntimeLock>(resolve(root, 'runtime.lock.json')).catch(() => undefined);
  const runtimeVerified = runtime ? await findExecutable(resolve(root, '.tools', runtime.tag, process.platform))
    .then(async path => runtime.installedPlatform === process.platform && await digest(path) === runtime.executableSha256).catch(() => false) : false;
  return { runtime: runtimeVerified ? 'installed_verified' : 'missing_or_invalid', models,
    inferenceReady: false, diagnostics: ['INFERENCE_NOT_PROBED', ...(!runtimeVerified ? ['RUNTIME_MISSING_OR_INVALID'] : []),
      ...(models.length ? models.filter(m => !m.verified).map(m => `MODEL_INVALID:${m.id}`) : ['MODELS_NOT_INSTALLED'])] };
}
