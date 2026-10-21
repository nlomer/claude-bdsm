// Adapter: small shell-free setup subprocesses; no prompt bodies are passed as arguments.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
export function checkNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 22 || minor < 16) throw new Error('Please install Node.js 22.16+ (22.x), then run setup again. The README lists requirements.');
}
export async function run(executable, args, root) {
  const child = spawn(executable, args, { cwd: root, shell: false, windowsHide: true, stdio: 'inherit' });
  const cancel = () => child.kill(); process.once('SIGINT', cancel);
  try { const [code] = await once(child, 'close'); if (code !== 0) throw new Error('This step did not finish. Check the message above, fix it, then rerun setup. Existing models and settings are kept.'); }
  finally { process.removeListener('SIGINT', cancel); }
}
export async function npmPath() {
  const path = process.env.npm_execpath || resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  await access(path).catch(() => { throw new Error('npm was not found. Run this through npm run setup using a full Node.js installation.'); });
  return path;
}
