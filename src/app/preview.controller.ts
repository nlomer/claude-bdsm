// Controller: reuse the established editor, loading a model only when the rule pass needs one.
import { processMessage } from '../features/process.js';
import { LlamaServer } from '../runtime/llama-server.js';
import { modelPrompt } from '../cli/model-prompt.js';
import { profiles } from './preferences.types.js';
import { recordStats, retainDiagnostic } from '../features/stats.js';
import type { Settings } from './settings.adapter.js';
export async function previewMessage(root: string, text: string, settings: Settings, signal: AbortSignal) {
  const profile = profiles[settings.preferences.profile], consent = { ...settings.consent, preview: true };
  const options = { mode: profile.model ? 'hybrid' as const : 'rules' as const, signal };
  let server: LlamaServer | undefined;
  try {
    signal.throwIfAborted();
    let item = await processMessage(text, consent, options);
    if (profile.model && item.result.reasons.includes('MODEL_UNAVAILABLE')) {
      server = await LlamaServer.start(root, profile.model, false); signal.throwIfAborted();
      item = await processMessage(text, consent, { ...options, adapter: server, prompt: await modelPrompt(root) });
    }
    signal.throwIfAborted();
    await recordStats(root, item.result, item.awards).catch(() => {});
    if (consent.retention) await retainDiagnostic(root, item.text, item.result);
    return item;
  } finally { await server?.close(); }
}
