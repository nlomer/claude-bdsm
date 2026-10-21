// Controller: local consent, safeword, narrow templates and optional model preview coordination.
import { sanitize } from '../core/sanitize.js';
import { rewrite } from '../core/rewrite.js';
import type { SanitizeResult, Tone } from '../core/types.js';
import type { RuntimeAdapter } from '../runtime/adapter.js';
import type { Consent } from './consent.js';
import { safeWord } from './safeword.js';
import { personality } from './personalities.js';
import { cleanup } from './profanity.js';
import { rage } from './rage.js';
import { awards } from './awards.js';
export async function processMessage(input: string, config: Consent, options: { tone?: Tone; adapter?: RuntimeAdapter; prompt?: string; mode?: 'rules' | 'model' | 'hybrid'; signal?: AbortSignal } = {}) {
  const local = safeWord(input), tone = local.forcedNeutral ? 'neutral' : options.tone ?? config.personality;
  let result = sanitize({ text: local.text, tone: 'neutral', mode: 'rules' });
  if (!config.targetedInsults && result.status !== 'unchanged') result = {
    ...result, status: 'review_required', changed: false, reasons: ['CONSENT_REWRITE_DISABLED'],
    validation: { ...result.validation, requiresHumanReview: true }
  };
  if (!config.targetedInsults && result.status === 'review_required') delete result.output;
  const blocked = ['EMPTY_INPUT', 'INPUT_LIMIT', 'INVALID_REQUEST', 'LANGUAGE_UNSUPPORTED', 'EDITOR_INSTRUCTION_AMBIGUOUS', 'QUOTATION_AMBIGUOUS'].some(code => result.reasons.includes(code));
  if (!blocked && config.targetedInsults && options.mode && options.mode !== 'rules') {
    result = await rewrite(local.text, options.adapter, { method: options.mode === 'model' ? 'protected' : 'hybrid',
      prompt: options.prompt ?? '', ...(options.signal ? { signal: options.signal } : {}) });
  }
  result = personality(local.text, result, tone);
  if (config.profanityCleanup && result.output !== undefined) {
    const output = cleanup(result.output);
    if (output !== result.output) result = { ...result, output, changed: true, status: 'rewritten', engine: result.engine === 'none' ? 'rules' : result.engine,
      reasons: [...result.reasons, 'OPTIONAL_PROFANITY_CLEANUP'], validation: { ...result.validation, requiresHumanReview: true } };
  }
  if (config.preview && ['unchanged', 'rewritten'].includes(result.status)) result = { ...result, validation: { ...result.validation, requiresHumanReview: true } };
  return { result, text: local.text, tone, forcedNeutral: local.forcedNeutral, rage: rage(local.text), awards: local.forcedNeutral ? [] : awards(local.text, result, tone) };
}
