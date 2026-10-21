// Adapter: resolve immutable model revisions and install only verified requested artifacts.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { download, fetchJson, json, saveJson } from './files.js';
import { inspectGguf } from './gguf.js';
import { registry, type ModelLock } from './registry.js';
interface Repo { sha: string; cardData?: { license?: string }; siblings: { rfilename: string; size?: number; lfs?: { sha256: string; size: number } }[] }

export async function installModels(root: string, ids: readonly string[]): Promise<ModelLock[]> {
  let locks: ModelLock[] = await json<ModelLock[]>(resolve(root, 'models.lock.json')).catch(() => []);
  for (const id of ids) {
    const entry = registry.find(item => item.id === id);
    if (!entry) throw new Error('UNKNOWN_MODEL');
    const previous = locks.find(item => item.id === id);
    const info = await fetchJson<Repo>(`https://huggingface.co/api/models/${entry.repo}${previous ? `/revision/${previous.revision}` : ''}?blobs=true`);
    const source = await fetchJson<Repo>(`https://huggingface.co/api/models/${entry.upstream}${previous ? `/revision/${previous.upstreamRevision}` : ''}?blobs=true`);
    const file = info.siblings.find(s => s.rfilename === entry.file);
    if (!file?.lfs || !/^[a-f0-9]{40}$/.test(info.sha)) throw new Error('ARTIFACT_METADATA_UNAVAILABLE');
    const folder = resolve(root, 'models', id);
    await mkdir(folder, { recursive: true });
    const licenseFiles: string[] = [];
    for (const [repo, metadata, prefix] of [[entry.repo, info, 'quantized'], [entry.upstream, source, 'upstream']] as const) {
      for (const sibling of metadata.siblings.filter(s => /^(README\.md|LICENSE(?:\.\w+)?|COPYING)$/i.test(s.rfilename))) {
        const response = await fetch(`https://huggingface.co/${repo}/resolve/${metadata.sha}/${sibling.rfilename}`);
        if (!response.ok) throw new Error('LICENSE_FETCH_FAILED');
        const name = `${prefix}-${sibling.rfilename}`;
        await writeFile(resolve(folder, name), await response.text()); licenseFiles.push(`models/${id}/${name}`);
      }
    }
    const url = `https://huggingface.co/${entry.repo}/resolve/${info.sha}/${entry.file}`;
    process.stderr.write(`Installing ${id} (${file.lfs.size} bytes)\n`);
    const computedSha256 = await download(url, resolve(folder, entry.file), file.lfs.size, file.lfs.sha256);
    const record: ModelLock = { ...entry, revision: info.sha, upstreamRevision: source.sha, quantization: 'Q4_K_M', url,
      bytes: file.lfs.size, advertisedSha256: file.lfs.sha256, computedSha256,
      license: source.cardData?.license ?? 'not_declared', licenseFiles,
      metadata: await inspectGguf(resolve(folder, entry.file)) };
    locks = [...locks.filter(item => item.id !== id), record];
    await saveJson(resolve(root, 'models.lock.json'), locks);
  }
  return locks;
}
