// Tests: checksum/size failures never publish partial downloads or replace a verified artifact.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { download } from '../../src/runtime/files.js';
import { hashText } from '../../src/core/parse.js';
import { inspectGguf } from '../../src/runtime/gguf.js';
test('atomic integrity verification handles valid, bad hash, partial, and oversized data', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'tone-download-'));
  const server = createServer((_req, res) => res.end('synthetic'));
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/artifact`, path = join(folder, 'model.gguf');
  try {
    await download(url, path, 9, hashText('synthetic'));
    assert.equal(await readFile(path, 'utf8'), 'synthetic');
    await assert.rejects(download(url, path, 9, '0'.repeat(64)), /CHECKSUM_MISMATCH/);
    await assert.rejects(download(url, path, 10, hashText('synthetic')), /SIZE_MISMATCH/);
    await assert.rejects(download(url, path, 8, hashText('synthetic')), /SIZE_MISMATCH/);
    assert.equal(await readFile(path, 'utf8'), 'synthetic');
    assert.deepEqual(await readdir(folder), ['model.gguf']);
    await assert.rejects(inspectGguf(path), /CORRUPT_GGUF/);
  } finally {
    await new Promise<void>(yes => server.close(() => yes()));
    await rm(folder, { recursive: true, force: true });
  }
});
