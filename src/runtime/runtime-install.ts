// Adapter: pin a CPU-only official release archive and verify it before local extraction.
import { chmod, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { digest, download, fetchJson, json, saveJson } from './files.js';
import { runProcess } from './process.js';
import type { RuntimeLock } from './registry.js';
import { bundleHashes } from './bundle.js';
interface Asset { name: string; browser_download_url: string; size: number; digest: string }
interface Release { tag_name: string; target_commitish: string; assets: Asset[] }
export async function findExecutable(folder: string): Promise<string> {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.name === (process.platform === 'win32' ? 'llama-server.exe' : 'llama-server')) return path;
    if (entry.isDirectory()) { const nested = await findExecutable(path).catch(() => ''); if (nested) return nested; }
  }
  throw new Error('RUNTIME_NOT_INSTALLED');
}
export async function installRuntime(root: string): Promise<RuntimeLock> {
  if (process.arch !== 'x64' || !['win32', 'linux'].includes(process.platform)) throw new Error('PLATFORM_UNSUPPORTED');
  let lock = await json<RuntimeLock>(resolve(root, 'runtime.lock.json')).catch(() => undefined);
  if (!lock) {
    const releases = await fetchJson<Release[]>('https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=5');
    const release = releases.find(r => r.assets.some(a => /bin-win-cpu-x64.zip$/.test(a.name)));
    if (!release) throw new Error('NO_CPU_RELEASE');
    const ref = await fetchJson<{ object: { sha: string } }>(`https://api.github.com/repos/ggml-org/llama.cpp/git/ref/tags/${release.tag_name}`);
    lock = { tag: release.tag_name, revision: ref.object.sha, license: 'MIT', assets: {} };
    for (const [platform, suffix] of [['win32', 'bin-win-cpu-x64.zip'], ['linux', 'bin-ubuntu-x64.tar.gz']]) {
      const asset = release.assets.find(a => a.name.endsWith(suffix!));
      if (!asset?.digest?.startsWith('sha256:')) throw new Error('RUNTIME_CHECKSUM_UNAVAILABLE');
      lock.assets[platform!] = { name: asset.name, url: asset.browser_download_url, bytes: asset.size, advertisedSha256: asset.digest.slice(7) };
    }
    await saveJson(resolve(root, 'runtime.lock.json'), lock);
  }
  const asset = lock.assets[process.platform]!;
  const folder = resolve(root, '.tools', lock.tag, process.platform);
  await mkdir(folder, { recursive: true });
  const archive = resolve(folder, asset.name);
  asset.computedSha256 = await download(asset.url, archive, asset.bytes, asset.advertisedSha256);
  if (process.platform === 'win32') {
    // Paths are passed as process arguments, not interpolated into PowerShell code.
    const script = resolve(folder, 'extract.ps1');
    await writeFile(script, 'param([string]$Archive,[string]$Target)\nExpand-Archive -LiteralPath $Archive -DestinationPath $Target -Force\n');
    await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', script, '-Archive', archive, '-Target', folder], root);
  } else await runProcess('tar', ['-xzf', archive, '-C', folder], root);
  const executable = await findExecutable(folder);
  if (process.platform !== 'win32') await chmod(executable, 0o755);
  lock.executableSha256 = await digest(executable);
  lock.buildVersion = await runProcess(executable, ['--version'], root);
  lock.installedPlatform = process.platform;
  lock.bundleSha256 = await bundleHashes(folder);
  const license = await fetch(`https://raw.githubusercontent.com/ggml-org/llama.cpp/${lock.revision}/LICENSE`);
  if (!license.ok) throw new Error('RUNTIME_LICENSE_UNAVAILABLE');
  await writeFile(resolve(folder, 'LICENSE'), await license.text());
  await saveJson(resolve(root, 'runtime.lock.json'), lock);
  return lock;
}
