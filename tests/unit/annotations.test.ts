// Tests: real-review import bookkeeping merges batches and rejects stale hashes; synthetic test ratings stay temporary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { corpus } from '../../src/bench/corpus.js';
import { importAnnotationDecisions } from '../../src/bench/annotation-decisions.js';
import { json, saveJson } from '../../src/runtime/files.js';
test('annotation batches preserve earlier reviews without modifying the frozen corpus', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-annotations-'));
  try {
    await mkdir(join(root, 'fixtures'));
    for (const name of ['dev.jsonl', 'holdout.jsonl', 'dataset.lock.json']) await copyFile(resolve('fixtures', name), join(root, 'fixtures', name));
    const { fixtures, lock } = await corpus(root, 'dev');
    const input = join(root, 'synthetic-test-decisions.json');
    for (const fixture of fixtures.slice(0, 2)) {
      await saveJson(input, { version: 1, datasetHashes: lock.hashes, decisions: [{ id: fixture.id, reviewer: 'synthetic-test-only', decision: 'accept', notes: '' }] });
      await importAnnotationDecisions(root, input);
    }
    const result = await json<{ accepted: number; status: string }>(join(root, 'reports/annotation-review.json'));
    assert.equal(result.accepted, 2); assert.equal(result.status, 'pending');
    await saveJson(input, { version: 1, datasetHashes: { dev: 'wrong', holdout: 'wrong' }, decisions: [] });
    await assert.rejects(importAnnotationDecisions(root, input), /ANNOTATION_FILE_HASH_MISMATCH/);
    assert.equal((await corpus(root, 'dev')).lock.hashes.dev, lock.hashes.dev);
  } finally { await rm(root, { recursive: true, force: true }); }
});
