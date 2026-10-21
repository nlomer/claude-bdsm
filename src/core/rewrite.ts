// Controller: structural checks for model candidates; every changed model output needs human preview.
import { performance } from 'node:perf_hooks';
import { parseProtected } from './parse.js';
import { protect, restore } from './protect.js';
import { sanitize, identity } from './sanitize.js';
import { route } from './route.js';
import { modelCandidate } from './model-candidate.js';
import { applyEdit, validateEdit } from './validate.js';
import type { SanitizeResult, SourceSpan } from './types.js';
import type { RuntimeAdapter } from '../runtime/adapter.js';
import type { GenerationResult } from '../runtime/adapter.js';

export type Method = 'identity' | 'rules' | 'protected' | 'hybrid' | 'oracle';
export interface RewriteOptions { method: Method; prompt: string; temperature?: number; sampling?: { topP: number; topK: number; presencePenalty: number }; constraints?: string[]; oracle?: SourceSpan; signal?: AbortSignal; observe?: (result: GenerationResult) => void }
function rejected(reason: string, timingsMs: Record<string, number> = {}): SanitizeResult {
  return { status: 'review_required', engine: 'local-model', changed: false, reasons: [reason],
    validation: { protectedSpansIntact: false, placeholdersValid: false, truncationDetected: reason === 'TRUNCATED', requiresHumanReview: true }, timingsMs };
}
function healthy(text: string): boolean {
  return !!text.trim() && !/\b(?:as an ai|i (?:cannot|can't) (?:help|assist)|sorry,? but)\b/i.test(text) &&
    !/(.{12,})\1\1/s.test(text);
}
export async function rewrite(text: string, adapter: RuntimeAdapter | undefined, options: RewriteOptions): Promise<SanitizeResult> {
  const started = performance.now();
  if (options.method === 'identity') return identity(text);
  const baseline = sanitize({ text, tone: 'neutral', mode: 'rules' });
  if (options.method === 'rules') return baseline;
  const spans = parseProtected(text), decision = route(text, spans);
  if (options.method === 'hybrid' && ['unchanged', 'rewritten'].includes(baseline.status)) return baseline;
  const clause = options.method === 'oracle' ? options.oracle : options.method === 'hybrid' ? modelCandidate(text, spans) : undefined;
  if (options.method === 'hybrid' && (!clause || ['LANGUAGE_UNSUPPORTED', 'EDITOR_INSTRUCTION_AMBIGUOUS', 'QUOTATION_AMBIGUOUS'].includes(decision.reason))) return baseline;
  if (options.method === 'oracle' && !clause) return baseline;
  if (!adapter) return rejected('MODEL_UNAVAILABLE');
  if (text.length > 32768) return rejected('INPUT_LIMIT');
  const protection = protect(text, spans);
  const input = clause ? `Editable clause:\n${text.slice(clause.start, clause.end)}\nRead-only context (do not output):\n${text.slice(clause.end, clause.end + 160)}` : protection.masked;
  const system = options.prompt + (clause ? '\nReturn only a brief replacement emotional clause. Do not output context or add a task.' : '');
  try {
    const generated = await adapter.generate({ system, input, maxOutputTokens: text.length > 3000 ? 512 : 256,
      seed: 42, temperature: options.temperature ?? 0, ...(options.sampling ? { sampling: options.sampling } : {}), signal: options.signal ?? new AbortController().signal });
    options.observe?.(generated);
    if (generated.finishReason !== 'stop') return rejected(generated.finishReason === 'length' ? 'TRUNCATED' : 'GENERATION_FAILED', generated.timingsMs);
    if (!healthy(generated.text)) return rejected('EMPTY_REFUSAL_OR_REPETITION', generated.timingsMs);
    const output = clause ? applyEdit(text, { ...clause, replacement: generated.text.trim() }) : restore(generated.text, protection);
    if (decision.action !== 'keep' && output === text) return rejected('REWRITE_NOT_COMPLETED', generated.timingsMs);
    if (clause && !validateEdit(text, output, { ...clause, replacement: generated.text.trim() }, spans)) return rejected('VALIDATION_FAILED');
    if (options.constraints?.some(constraint => !output.includes(constraint))) return rejected('CONSTRAINT_CHANGED', generated.timingsMs);
    return { status: output === text ? 'unchanged' : 'rewritten', output, engine: 'local-model', changed: output !== text,
      reasons: ['STRUCTURAL_CHECKS_ONLY', 'MODEL_PREVIEW_REQUIRED'],
      validation: { protectedSpansIntact: true, placeholdersValid: true, truncationDetected: false, requiresHumanReview: output !== text },
      timingsMs: { ...generated.timingsMs, promptTokens: generated.promptTokens, outputTokens: generated.outputTokens, endToEnd: performance.now() - started } };
  } catch (error) {
    const known = error instanceof Error && /^(CONTEXT_OVERFLOW|INVALID_PLACEHOLDERS|CORRUPT_PROTECTION|REASONING_NOT_DISABLED|RUNTIME_QUEUE_FULL|RUNTIME_CLOSED|REQUEST_LIMIT)$/.test(error.message) ? error.message : 'INFERENCE_OR_VALIDATION_FAILED';
    return rejected(known, { endToEnd: performance.now() - started });
  }
}
