// Controller: resume after a source-diagnosed holdout replacement, reusing byte-identical development inputs.
import { resolve } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
import { corpus } from './corpus.js';
import { freeze, runBenchmark } from './run.js';
import { startup } from './startup.js';
const root = process.cwd();
const { lock } = await corpus(root, 'dev');
for (const suite of ['dev', 'sampling', 'oracle']) {
  const { folder } = await json<{ folder: string }>(resolve(root, `reports/latest-${suite}.json`));
  const manifest = await json<{ datasetHashes: Record<string, string> }>(resolve(folder, 'manifest.json'));
  if (manifest.datasetHashes.dev !== lock.hashes.dev) throw new Error('DEVELOPMENT_INPUTS_CHANGED');
}
const { winner } = await json<{ winner: string }>(resolve(root, 'reports/development-selection.json'));
await freeze(root, winner);
await runBenchmark(root, 'holdout');
await runBenchmark(root, 'performance');
await startup(root);
await saveJson(resolve(root, 'reports/research-complete.json'), { complete: true, humanReview: 'pending',
  datasetRevision: 3, recommendation: 'preview-only; automatic release pending human evidence' });
