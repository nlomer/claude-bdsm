// Controller: explicit setup networking; runtime operations never call this automatically.
import { resolve } from 'node:path';
import { installModels } from './runtime/installer.js';
import { registry } from './runtime/registry.js';
import { installRuntime } from './runtime/runtime-install.js';
const root = resolve(process.cwd());
const command = process.argv[2];
if (command === 'runtime') await installRuntime(root);
else if (command === 'models') await installModels(root, process.argv.includes('--all-benchmark')
  ? registry.map(m => m.id) : process.argv.slice(3));
else throw new Error('SETUP_USAGE: runtime | models <id> | models --all-benchmark');
