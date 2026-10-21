// Adapter: checksum native runtime libraries as well as the launcher before loading any model.
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { digest } from './files.js';
export async function bundleHashes(folder: string, base = folder): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) Object.assign(hashes, await bundleHashes(path, base));
    else if (/\.(?:dll|so(?:\.\d+)*|exe)$/.test(entry.name) || entry.name === 'llama-server') hashes[relative(base, path).replaceAll('\\', '/')] = await digest(path);
  }
  return hashes;
}
