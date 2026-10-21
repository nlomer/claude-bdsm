// Service: operational failures preserve the JSON result contract without exposing input/error bodies.
import type { SanitizeResult } from '../core/types.js';
export function publicErrorCode(error: unknown): string {
  return error instanceof Error ? /^([A-Z_0-9]{3,64})(?=:|$)/.exec(error.message)?.[1] ?? 'OPERATION_FAILED' : 'OPERATION_FAILED';
}
export function errorResult(code: string): SanitizeResult {
  return { status: 'error', engine: 'none', changed: false, reasons: [code], timingsMs: {},
    validation: { protectedSpansIntact: false, placeholdersValid: false, truncationDetected: false, requiresHumanReview: true } };
}
