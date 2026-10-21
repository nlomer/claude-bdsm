// Controller: locate this clone, explain missing setup, and launch the local panel from any cwd.
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { checkNode } from './process.adapter.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  checkNode();
  await access(new URL('../dist/local-ui/main.js', import.meta.url)).catch(() => { throw new Error('First date? Run npm run setup in this folder, then npm start.'); });
  process.chdir(root);
  await import('../dist/local-ui/main.js');
} catch (error) { console.error(error.message); process.exitCode = 1; }
