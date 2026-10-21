// Service: collision-free placeholder masking with strict ordered restoration.
import { hashText } from './parse.js';
import type { ProtectedSpan } from './types.js';
export interface Protection { masked: string; prefix: string; spans: ProtectedSpan[]; tokens: string[] }
const placeholders = (text: string): string[] => text.match(/\[\[BDSM_[^\r\n]*?(?:\]\]|(?=\r?$))/gm) ?? [];

export function protect(text: string, spans: ProtectedSpan[]): Protection {
  let nonce = 0;
  while (text.includes(`[[BDSM_${nonce}_`)) nonce++;
  const prefix = `[[BDSM_${nonce}_`;
  const tokens = spans.map((_, i) => `${prefix}${i}]]`);
  let masked = '', cursor = 0;
  for (const [i, span] of spans.entries()) {
    if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < cursor ||
        span.end <= span.start || span.end > text.length ||
        text.slice(span.start, span.end) !== span.raw || hashText(span.raw) !== span.sha256) {
      throw new Error('INVALID_PROTECTED_SPAN');
    }
    masked += text.slice(cursor, span.start) + tokens[i]!;
    cursor = span.end;
  }
  return { masked: masked + text.slice(cursor), prefix, spans: spans.map(s => ({ ...s })), tokens };
}

export function restore(candidate: string, protection: Protection): string {
  // Existing lookalikes must also remain exact; newly invented namespaces are invalid.
  const expected = placeholders(protection.masked);
  const found = placeholders(candidate);
  if (found.length !== expected.length || found.some((t, i) => t !== expected[i])) {
    throw new Error('INVALID_PLACEHOLDERS');
  }
  const withoutValid = protection.tokens.reduce((s, t) => s.replace(t, ''), candidate);
  if (withoutValid.includes(protection.prefix)) throw new Error('INVALID_PLACEHOLDERS');
  let cursor = 0, restored = '';
  for (const [i, token] of protection.tokens.entries()) {
    const at = candidate.indexOf(token, cursor);
    const span = protection.spans[i]!;
    if (hashText(span.raw) !== span.sha256) throw new Error('CORRUPT_PROTECTION');
    restored += candidate.slice(cursor, at) + span.raw;
    cursor = at + token.length;
  }
  return restored + candidate.slice(cursor);
}
