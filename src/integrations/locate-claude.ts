// Adapter: locate a native Claude executable without running a shell shim or changing user settings.
import { access } from 'node:fs/promises';
import { resolve, delimiter } from 'node:path';
export async function locateClaude(explicit?: string): Promise<string> {
  const candidates = explicit ? [resolve(explicit)] : [
    ...(process.platform === 'win32' && process.env.APPDATA ? [resolve(process.env.APPDATA, 'npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe')] : []),
    ...(process.env.PATH ?? '').split(delimiter).map(folder => resolve(folder, process.platform === 'win32' ? 'claude.exe' : 'claude'))
  ];
  for (const path of candidates) if (!/\.(?:cmd|bat|ps1)$/i.test(path) && await access(path).then(() => true).catch(() => false)) return path;
  throw new Error('NATIVE_CLAUDE_NOT_FOUND');
}
