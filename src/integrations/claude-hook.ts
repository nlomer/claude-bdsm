// Controller: hook blocks or suggests manual resubmission; it never replaces or forwards the original turn.
import { sanitize } from '../core/sanitize.js';
import { safeWord } from '../features/safeword.js';
import { terminalText } from '../core/format.js';
export function hookDecision(value: unknown) {
  if (!value || typeof value !== 'object' || typeof (value as { prompt?: unknown }).prompt !== 'string') throw new Error('INVALID_HOOK_INPUT');
  const prompt = (value as { prompt: string }).prompt;
  const local = safeWord(prompt);
  const result = sanitize({ text: local.text, tone: 'neutral', mode: 'rules' });
  if (result.status === 'unchanged' && !local.forcedNeutral) return {};
  return { decision: 'block', hookSpecificOutput: { hookEventName: 'UserPromptSubmit', suppressOriginalPrompt: true }, reason: result.output !== undefined
    ? `Manual resubmission suggested:\n${terminalText(result.output)}`
    : `Local review required (${result.reasons.join(', ')}). No automatic replacement was submitted.` };
}
