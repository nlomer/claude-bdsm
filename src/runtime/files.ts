// Adapter: bounded metadata I/O, streaming integrity checks and atomic artifact downloads.
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;
export async function saveJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n');
  await rename(temp, path);
}
export async function digest(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`METADATA_HTTP_${response.status}`);
  return await response.json() as T;
}
export async function download(url: string, path: string, bytes: number, sha256: string): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(sha256) || !Number.isSafeInteger(bytes) || bytes < 1) throw new Error('INVALID_INTEGRITY');
  try { if ((await stat(path)).size === bytes && await digest(path) === sha256) return sha256; } catch { /* absent */ }
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.partial`;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 1800000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`DOWNLOAD_HTTP_${response.status}`);
    let received = 0;
    const hash = createHash('sha256');
    async function* checked() {
      for await (const chunk of Readable.fromWeb(response.body! as never)) {
        const data = chunk as Buffer;
        received += data.length;
        if (received > bytes) throw new Error('SIZE_MISMATCH');
        hash.update(data);
        yield data;
      }
    }
    await pipeline(checked(), createWriteStream(temp, { flags: 'wx' }));
    if (received !== bytes) throw new Error('SIZE_MISMATCH');
    if (hash.digest('hex') !== sha256) throw new Error('CHECKSUM_MISMATCH');
    await rename(temp, path);
    return sha256;
  } finally { clearTimeout(deadline); controller.abort(); await rm(temp, { force: true }); }
}
