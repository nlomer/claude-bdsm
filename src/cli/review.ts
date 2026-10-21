// Controller: independent annotation review and blinded output-review commands.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { json } from '../runtime/files.js';
import { corpus } from '../bench/corpus.js';
import { annotationHtml } from '../bench/annotations.js';
import { importAnnotationDecisions } from '../bench/annotation-decisions.js';
import { importDecisions } from '../bench/human.js';
import { report } from '../bench/report.js';
import { option, type Options } from './args.js';
export async function reviewCommand(root: string, args: Options): Promise<number> {
  if (args.flags.has('--annotations')) {
    if (option(args, '--decisions')) await importAnnotationDecisions(root, resolve(option(args, '--decisions')!));
    const dev = await corpus(root, 'dev'), holdout = await corpus(root, 'holdout');
    const path = resolve(root, 'plans/local-tone-editor/annotations-review.html');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, annotationHtml([...dev.fixtures, ...holdout.fixtures], dev.lock.hashes));
    process.stdout.write(path + '\n'); return 0;
  }
  const run = option(args, '--run', 'latest');
  const folder = run === 'latest' ? (await json<{ folder: string }>(resolve(root, 'reports/latest-holdout.json')).catch(() => json<{ folder: string }>(resolve(root, 'reports/latest-dev.json')))).folder : resolve(root, 'reports', run!);
  if (option(args, '--decisions')) await importDecisions(folder, resolve(option(args, '--decisions')!));
  await report(root, folder);
  process.stdout.write(resolve(folder, args.command === 'review' ? 'review.html' : 'report.md') + '\n'); return 0;
}
