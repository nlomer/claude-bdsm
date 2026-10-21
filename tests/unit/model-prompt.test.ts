// Tests: production follows the frozen prompt and rejects drift or path traversal before generation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { modelPrompt } from '../../src/cli/model-prompt.js';
import { hashText } from '../../src/core/parse.js';
test('production prompt follows the frozen selection with exact content integrity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tone-prompt-'));
  const settings = (prompt: string, text: string) => writeFile(join(root, 'bench-settings.lock.json'), JSON.stringify({ prompt, promptHash: hashText(text) }));
  try {
    await mkdir(join(root, 'prompts'));
    await writeFile(join(root, 'prompts/instruction.txt'), 'original');
    await writeFile(join(root, 'prompts/examples.txt'), 'selected\n');
    await settings('examples', 'selected\n');
    assert.equal(await modelPrompt(root), 'selected\n');
    await writeFile(join(root, 'prompts/examples.txt'), 'modified');
    await assert.rejects(modelPrompt(root), /PROMPT_HASH_MISMATCH/);
    await settings('../../private', 'anything');
    await assert.rejects(modelPrompt(root), /FROZEN_PROMPT_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
