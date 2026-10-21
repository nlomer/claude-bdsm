// Adapter: load frozen corpora/prompts and reject silent dataset drift before a run.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashText } from '../core/parse.js';
import { parseFixtures } from '../fixtures/schema.js';
import { json } from '../runtime/files.js';
export interface DatasetLock { hashes: Record<string, string>; smoke: string[]; performancePanel: string[]; humanReview: string }
export async function corpus(root: string, split: 'dev' | 'holdout') {
  const lock = await json<DatasetLock>(resolve(root, 'fixtures/dataset.lock.json'));
  const content = await readFile(resolve(root, `fixtures/${split}.jsonl`), 'utf8');
  if (hashText(content) !== lock.hashes[split]) throw new Error('DATASET_HASH_MISMATCH');
  return { lock, fixtures: parseFixtures(content) };
}
export async function prompts(root: string) {
  return await Promise.all(['instruction', 'examples'].map(async id => {
    const text = await readFile(resolve(root, `prompts/${id}.txt`), 'utf8');
    return { id, text, sha256: hashText(text) };
  }));
}
