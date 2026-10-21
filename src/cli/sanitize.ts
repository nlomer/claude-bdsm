// Controller: preview/output approval, local statistics, and an optional single approved downstream turn.
import { resolve } from 'node:path';
import { loadConsent } from '../features/consent.js';
import { processMessage } from '../features/process.js';
import { recordStats, retainDiagnostic } from '../features/stats.js';
import { LlamaServer } from '../runtime/llama-server.js';
import { readInput, confirm } from './input.js';
import { option, type Options } from './args.js';
import { hashText } from '../core/parse.js';
import { terminalText } from '../core/format.js';
import { canSubmit } from '../integrations/approval.js';
import { submit } from '../integrations/claude-wrapper.js';
import { locateClaude } from '../integrations/locate-claude.js';
import type { Tone } from '../core/types.js';
import { registry } from '../runtime/registry.js';
import { modelPrompt } from './model-prompt.js';
export async function sanitizeCommand(root: string, args: Options): Promise<number> {
  if (args.positional.length) throw new Error('INPUT_MUST_USE_STDIN');
  if (args.command === 'chat' && args.flags.has('--json')) throw new Error('CHAT_JSON_OPTION_UNSUPPORTED');
  const tone = option(args, '--tone'), mode = option(args, '--mode', args.flags.has('--model') ? 'hybrid' : 'rules')!;
  if (tone && !['neutral', 'hr', 'victorian'].includes(tone) || !['rules', 'hybrid', 'model'].includes(mode)) throw new Error('INVALID_MODE_OR_TONE');
  const model = option(args, '--model');
  if (model && !registry.some(entry => entry.id === model)) throw new Error('UNKNOWN_MODEL');
  const config = await loadConsent(root);
  if (args.flags.has('--preview')) config.preview = true;
  const text = await readInput();
  let server: LlamaServer | undefined;
  try {
    const options = { ...(tone ? { tone: tone as Tone } : {}), mode: mode as 'rules' | 'hybrid' | 'model' };
    let item = await processMessage(text, config, options);
    if (model && item.result.reasons.includes('MODEL_UNAVAILABLE')) {
      server = await LlamaServer.start(root, model, false);
      item = await processMessage(text, config, { ...options, adapter: server,
        prompt: await modelPrompt(root) });
    }
    const result = item.result;
    await server?.close(); server = undefined;
    await recordStats(root, result, item.awards).catch(() => { process.stderr.write('Aggregate statistics unavailable.\n'); });
    if (config.retention) await retainDiagnostic(root, item.text, result);
    let approval = option(args, '--approve');
    if (result.output !== undefined && (!canSubmit(result, approval) || args.flags.has('--preview'))) {
      process.stderr.write(`Preview:\n${terminalText(result.output)}\nApproval SHA-256: ${hashText(result.output)}\n`);
      if (process.stdin.isTTY && await confirm('Approve this exact output? Type yes: ')) approval = hashText(result.output);
    }
    if (!item.forcedNeutral) process.stderr.write(`Playful rage heuristic: ${item.rage}/100${item.awards.length ? '; ' + item.awards.join(', ') : ''}\n`);
    if (args.flags.has('--json')) process.stdout.write(JSON.stringify(result) + '\n');
    if (!canSubmit(result, approval)) {
      process.stderr.write(`Local review required: ${result.reasons.join(', ')}\n`);
      return result.status === 'error' ? 1 : 3;
    }
    if (args.command === 'chat') {
      const response = await submit(result, { executable: await locateClaude(option(args, '--claude')),
        cwd: resolve(option(args, '--cwd', root)!), ...(approval ? { approvedHash: approval } : {}) });
      process.stdout.write(response.stdout); process.stderr.write(terminalText(response.stderr)); return response.code;
    }
    if (!args.flags.has('--json')) process.stdout.write(process.stdout.isTTY ? terminalText(result.output!) : result.output!);
    return 0;
  } finally { await server?.close(); }
}
