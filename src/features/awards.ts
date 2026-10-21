// Service: playful aggregate achievement labels, without retaining personal message bodies.
import type { SanitizeResult, Tone } from '../core/types.js';
export function awards(text: string, result: SanitizeResult, tone: Tone): string[] {
  if (result.status !== 'rewritten') return [];
  return ['HR Incident Avoided', ...(tone === 'victorian' ? ['Victorian Restraint'] : []),
    ...(/\b(?:not|never|unless)\b/i.test(text) && result.validation.protectedSpansIntact ? ['Negation Preserved'] : [])];
}
