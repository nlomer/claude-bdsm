// Adapter: locate the separately installed local companion and run setup/configuration without shell interpolation.
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
let root;
try { root = JSON.parse(await readFile(new URL('../installation.json', import.meta.url), 'utf8')).applicationRoot; }
catch { root = fileURLToPath(new URL('../../../', import.meta.url)); }
const commands = new Set(['doctor', 'config', 'stats', 'runtime', 'models', 'status', 'skills', 'start', 'setup']);
const args = process.argv.slice(2);
if (!commands.has(args[0])) { process.stderr.write('Use start, setup, status, doctor, config, stats, skills, runtime, or models. Private messages belong in the local panel.\n'); process.exit(2); }
const script = ['start', 'setup'].includes(args[0]);
const cli = resolve(root, script ? `scripts/${args[0]}.mjs` : 'dist/cli.js');
await access(cli).catch(() => { process.stderr.write('Install/build the local companion, then run its skills install command. See https://github.com/nlomer/claude-bdsm#install\n'); process.exit(1); });
if (args[0] === 'start') {
  process.chdir(root); await import(pathToFileURL(cli).href);
} else {
const child = spawn(process.execPath, [cli, ...(script ? args.slice(1) : args)], { cwd: root, shell: false, windowsHide: true, stdio: 'inherit' });
const cancel = () => child.kill();
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
child.once('error', () => { process.stderr.write('LOCAL_COMPANION_FAILED\n'); process.exitCode = 1; });
child.once('close', code => { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); process.exitCode = code ?? 130; });
}
