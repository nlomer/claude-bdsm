// Adapter: verify pinned artifacts and prepare CPU-only launch arguments plus a transient secret file.
import { randomBytes } from 'node:crypto';
import { stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { availableParallelism } from 'node:os';
import { digest, json } from './files.js';
import type { ModelLock, RuntimeLock } from './registry.js';
import { findExecutable } from './runtime-install.js';
import { freePort } from './ownership.js';
import { bundleHashes } from './bundle.js';
import { LocalHttp } from './http.js';
export interface LaunchConfig { executable: string; args: string[]; http: LocalHttp }
export async function prepareLaunch(root: string, id: string, keyFile: string): Promise<LaunchConfig> {
  const locks = await json<ModelLock[]>(resolve(root, 'models.lock.json'));
  const model = locks.find(m => m.id === id);
  if (!model) throw new Error('MODEL_NOT_INSTALLED');
  const path = resolve(root, 'models', id, model.file);
  const file = await stat(path).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('MODEL_NOT_INSTALLED'); throw error; });
  if (file.size !== model.bytes || await digest(path) !== model.advertisedSha256) throw new Error('MODEL_INTEGRITY_FAILED');
  const runtime = await json<RuntimeLock>(resolve(root, 'runtime.lock.json'));
  const executable = await findExecutable(resolve(root, '.tools', runtime.tag, process.platform));
  if (runtime.installedPlatform !== process.platform || await digest(executable) !== runtime.executableSha256) throw new Error('RUNTIME_INTEGRITY_FAILED');
  if (runtime.bundleSha256 && JSON.stringify(await bundleHashes(resolve(root, '.tools', runtime.tag, process.platform))) !== JSON.stringify(runtime.bundleSha256)) throw new Error('RUNTIME_BUNDLE_INTEGRITY_FAILED');
  const port = await freePort(), key = randomBytes(32).toString('hex');
  await writeFile(keyFile, key + '\n', { mode: 0o600, flag: 'wx' });
  const args = ['--model', path, '--host', '127.0.0.1', '--port', String(port), '--api-key-file', keyFile,
    '--n-gpu-layers', '0', '--ctx-size', '2048', '--parallel', '1', '--threads', String(Math.min(4, availableParallelism())),
    '--jinja', '--no-webui', '--offline', '--no-cache-prompt', '--cache-ram', '0', '--no-context-shift', '--log-verbosity', '3'];
  if (id === 'qwen3-06b-q4km') args.push('--chat-template-kwargs', '{"enable_thinking":false}');
  // Actual GGUF templates are authoritative: runtime auto-detection enabled thinking on Qwen3.5.
  if (id.startsWith('qwen')) args.push('--reasoning', 'off');
  return { executable, args, http: new LocalHttp(`http://127.0.0.1:${port}`, key) };
}
