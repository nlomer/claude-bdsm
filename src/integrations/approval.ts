// Service: approval is bound to the exact validated output, never to output presence alone.
import { hashText } from '../core/parse.js';
import type { SanitizeResult } from '../core/types.js';
export function canSubmit(result: SanitizeResult, approvedHash?: string): boolean {
  return !result.reasons.includes('IDENTITY_CONTROL') && ['unchanged', 'rewritten'].includes(result.status) && typeof result.output === 'string' && !!result.output.trim() &&
    result.validation.protectedSpansIntact && result.validation.placeholdersValid && !result.validation.truncationDetected &&
    (!result.validation.requiresHumanReview || approvedHash === hashText(result.output));
}
