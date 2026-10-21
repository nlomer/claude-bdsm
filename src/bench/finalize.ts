// Controller: wait for this finite research process, verify remaining local gates and publish evidence.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { report } from './report.js';
import { idempotence } from './idempotence.js';
import { conclusion } from './conclusion.js';
import { json, saveJson } from '../runtime/files.js';
import { runProcess } from '../runtime/process.js';
import { baselinePerformance } from './baseline-performance.js';
import { cliPerformance } from './cli-performance.js';
const root = process.cwd(), ownerPid = Number(process.argv[2]);
let done = false;
while (!done) {
  done = await json<{ complete: boolean }>(resolve(root, 'reports/research-complete.json')).then(r => r.complete).catch(() => false);
  if (!done && ownerPid) { try { process.kill(ownerPid, 0); } catch { throw new Error('RESEARCH_PROCESS_ENDED_WITHOUT_COMPLETION'); } }
  if (!done) await pause(5000);
}
process.stderr.write('Research loops finished; running idempotence diagnostic and final verification.\n');
await idempotence(root);
await baselinePerformance(root);
for (const suite of ['dev', 'sampling', 'oracle', 'holdout', 'performance']) {
  const { folder } = await json<{ folder: string }>(resolve(root, `reports/latest-${suite}.json`));
  await report(root, folder);
}
const receipts: Record<string, unknown> = {};
for (const [name, args] of [
  ['build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit']],
  ['testCompile', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.test.json']],
  ['unit', ['--test', 'dist-tests/tests/unit/*.test.js']],
  ['integration', ['--test', '--test-concurrency=1', 'dist-tests/tests/integration/*.test.js']]
] as [string, string[]][]) {
  process.stderr.write(`Final verification: ${name}\n`);
  receipts[name] = { exitCode: 0, output: await runProcess(process.execPath, args, root) };
  await saveJson(resolve(root, 'reports/verification.json'), { at: new Date().toISOString(), platform: process.platform, receipts });
}
await cliPerformance(root);
await conclusion(root);
const evidence = await json<{ evaluationComplete: boolean }>(resolve(root, 'plans/local-tone-editor/final-evidence.json'));
if (!evidence.evaluationComplete) throw new Error('EVALUATION_INCOMPLETE_INSPECT_FAILURE_FILES');
const path = resolve(root, 'plans/local-tone-editor/plan.md');
let plan = await readFile(path, 'utf8').catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw error; });
if (plan) {
for (const step of ['2.2', '3.2', '3.3', '3.4', '4.3', '5.3']) plan = plan.replace(`- ${step} Status: ❌`, `- ${step} Status: ✅`);
plan += '\n## Final automated execution receipt\n- All research loops, extra second-pass idempotence, reports, build/typecheck/unit/integration gates completed. See `reports/verification.json`, `BENCHMARK-RESULTS.md` and `plans/local-tone-editor/final-evidence.json`.\n- Step 3.5 remains pending actual owner annotation/output review. No human judgment or automatic model release was fabricated. Default remains rules with preview; models are preview-only.\n- Linux, live providers and visual browser rendering remain unverified as explicitly reported. Global Claude settings and OS caches remain unchanged. Publication to public nlomer/claude-bdsm under MIT is owner-authorized; Phase 6 tracks commit/push/remote verification separately. Owner reminder: complete manual annotation/output review before model qualification.\n';
await writeFile(path, plan);
}
await saveJson(resolve(root, 'reports/delivery-complete.json'), { automatedWorkComplete: true, humanReview: 'pending', completedAt: new Date().toISOString() });
process.stderr.write('Automated delivery complete; human review remains pending.\n');
