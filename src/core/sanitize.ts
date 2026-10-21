// Controller: coordinate pure routing and validated rules; no I/O or model fallback.
import { performance } from 'node:perf_hooks';
import { parseProtected } from './parse.js';
import { route } from './route.js';
import { applyEdit, validateEdit } from './validate.js';
import type { SanitizeRequest, SanitizeResult } from './types.js';

function result(status: SanitizeResult['status'], reason: string, started: number, output?: string): SanitizeResult {
  const success = status === 'unchanged' || status === 'rewritten';
  return {
    status, ...(output !== undefined ? { output } : {}),
    engine: status === 'rewritten' ? 'rules' : 'none', changed: status === 'rewritten', reasons: [reason],
    validation: { protectedSpansIntact: success, placeholdersValid: success,
      truncationDetected: false, requiresHumanReview: !success },
    timingsMs: { total: performance.now() - started }
  };
}
export function identity(text: string): SanitizeResult {
  return result('unchanged', 'IDENTITY_CONTROL', performance.now(), text);
}
export function sanitize(request: SanitizeRequest): SanitizeResult {
  const started = performance.now();
  if (!request || typeof request.text !== 'string' || !['neutral', 'hr', 'victorian'].includes(request.tone) ||
      !['rules', 'model', 'hybrid'].includes(request.mode) ||
      (request.language !== undefined && typeof request.language !== 'string')) return result('error', 'INVALID_REQUEST', started);
  if (!request.text.trim()) return result('review_required', 'EMPTY_INPUT', started);
  if (request.text.length > 32768) return result('review_required', 'INPUT_LIMIT', started);
  if (request.tone !== 'neutral') return result('review_required', 'TONE_UNAVAILABLE', started);
  if (request.mode === 'model') return result('error', 'MODEL_UNAVAILABLE', started);
  const spans = parseProtected(request.text);
  const decision = route(request.text, spans, request.language);
  if (decision.action === 'keep') return result('unchanged', decision.reason, started, request.text);
  if (!decision.edit) return result('review_required', decision.reason, started);
  const output = applyEdit(request.text, decision.edit);
  if (!validateEdit(request.text, output, decision.edit, spans)) return result('review_required', 'VALIDATION_FAILED', started);
  return result('rewritten', decision.reason, started, output);
}
