// Controller: dispatch explicit setup/research/local UI commands; no implicit inference networking.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { option, type Options } from './args.js';
import { doctor } from './doctor.js';
import { sanitizeCommand } from './sanitize.js';
import { installModels } from '../runtime/installer.js';
import { installRuntime } from '../runtime/runtime-install.js';
import { registry } from '../runtime/registry.js';
import { runBenchmark, freeze, type Suite } from '../bench/run.js';
import { smoke } from '../bench/smoke.js';
import { startup } from '../bench/startup.js';
import { loadConsent, setConsent } from '../features/consent.js';
import { dashboard } from '../features/dashboard.js';
import { loadStats } from '../features/stats.js';
import { hookDecision } from '../integrations/claude-hook.js';
import { readInput } from './input.js';
import { installation } from './installation.js';
import { reviewCommand } from './review.js';
import { installSkill } from '../integrations/skill-installer.js';
import { maintainSkill, skillStatus } from '../integrations/skill-maintenance.adapter.js';
import { appStatus } from '../app/status.controller.js';
export async function commands(root: string, args: Options): Promise<number> {
  if (['sanitize', 'chat'].includes(args.command)) return sanitizeCommand(root, args);
  if (args.command === 'doctor') { process.stdout.write(JSON.stringify({ ...doctor(), ...await installation(root) }, null, 2) + '\n'); return doctor().nodeSupported ? 0 : 1; }
  if (args.command === 'status') { const status = await appStatus(root); process.stdout.write(`${status.message}\n${status.claudeMessage}\nOpen the panel: npm start\n`); return 0; }
  if (args.command === 'runtime' && args.positional.join(' ') === 'install') { await installRuntime(root); return 0; }
  if (args.command === 'skills' && args.positional.join(' ') === 'install') {
    process.stdout.write(await installSkill(root, option(args, '--target')) + '\n'); return 0;
  }
  if (args.command === 'skills' && ['update', 'remove', 'status'].includes(args.positional.join(' '))) {
    const action = args.positional[0]!;
    const result = action === 'status' ? await skillStatus(root, option(args, '--target')) : await maintainSkill(root, action as 'update' | 'remove', option(args, '--target'));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n'); return 0;
  }
  if (args.command === 'models' && args.positional[0] === 'install') {
    await installModels(root, args.flags.has('--all-benchmark') ? registry.map(m => m.id) : args.positional.slice(1)); return 0;
  }
  if (args.command === 'bench') {
    if (option(args, '--backend', 'cpu') !== 'cpu') throw new Error('CPU_ONLY');
    const suite = option(args, '--suite', 'smoke')!;
    if (suite === 'smoke') await smoke(root);
    else if (suite === 'freeze') await freeze(root, option(args, '--set', 'instruction'));
    else if (suite === 'startup') await startup(root);
    else if (['dev', 'holdout', 'performance', 'oracle', 'sampling'].includes(suite)) await runBenchmark(root, suite as Suite);
    else throw new Error('UNKNOWN_SUITE');
    return 0;
  }
  if (['report', 'review'].includes(args.command)) return reviewCommand(root, args);
  if (args.command === 'config') {
    const update = option(args, '--set');
    if (update) await setConsent(root, { ...await loadConsent(root), ...JSON.parse(update) });
    process.stdout.write(JSON.stringify(await loadConsent(root), null, 2) + '\n'); return 0;
  }
  if (args.command === 'stats') {
    const stats = await loadStats(root);
    if (args.flags.has('--html')) { const path = resolve(root, '.local/dashboard.html'); await mkdir(resolve(root, '.local'), { recursive: true }); await writeFile(path, dashboard(stats)); process.stderr.write(path + '\n'); }
    process.stdout.write(JSON.stringify(stats, null, 2) + '\n'); return 0;
  }
  if (args.command === 'hook') {
    try { process.stdout.write(JSON.stringify(hookDecision(JSON.parse(await readInput(1048576)))) + '\n'); return 0; }
    catch { process.stderr.write('Local hook failed; block this turn.\n'); return 2; }
  }
  process.stderr.write('Usage: node dist/cli.js doctor|sanitize|chat|skills install|runtime install|models install|bench|review|report|config|stats|hook\n');
  return 2;
}
