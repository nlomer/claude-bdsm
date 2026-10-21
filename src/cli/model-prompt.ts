// Adapter: use the frozen benchmark prompt in production and reject missing or modified prompt files.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json } from '../runtime/files.js';
import { hashText } from '../core/parse.js';
export async function modelPrompt(root: string): Promise<string> {
  const settings = await json<{ prompt: string; promptHash: string }>(resolve(root, 'bench-settings.lock.json'));
  if (!['instruction', 'examples'].includes(settings.prompt)) throw new Error('FROZEN_PROMPT_INVALID');
  const text = await readFile(resolve(root, 'prompts', `${settings.prompt}.txt`), 'utf8');
  if (hashText(text) !== settings.promptHash) throw new Error('PROMPT_HASH_MISMATCH');
  return text;
}
