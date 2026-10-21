// Service: replace only a validated emotional prefix; preserve all surrounding task text.
import { ruleEdit } from '../core/rules.js';
import { parseProtected } from '../core/parse.js';
import { applyEdit, validateEdit } from '../core/validate.js';
import type { SanitizeResult, Tone } from '../core/types.js';
const templates: Record<Tone, string> = {
  neutral: "I'm frustrated with the previous result.",
  hr: 'The previous result did not meet expectations.',
  victorian: 'I must express considerable dissatisfaction.'
};
export function personality(text: string, result: SanitizeResult, tone: Tone): SanitizeResult {
  if (tone === 'neutral' || result.status !== 'rewritten' || result.engine !== 'rules') return result;
  const original = ruleEdit(text);
  if (!original) return result;
  const edit = { ...original, replacement: templates[tone] };
  const output = applyEdit(text, edit);
  if (!validateEdit(text, output, edit, parseProtected(text))) throw new Error('STYLE_VALIDATION_FAILED');
  return { ...result, output, reasons: [...result.reasons, `STYLE_${tone.toUpperCase()}`] };
}
