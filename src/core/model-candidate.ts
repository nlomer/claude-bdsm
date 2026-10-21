// Service: shared conservative editable-clause detector, identical for every model.
import { overlaps } from './parse.js';
import { attackWords } from './rules.js';
import type { ProtectedSpan, SourceSpan } from './types.js';
export function modelCandidate(text: string, spans: ProtectedSpan[]): SourceSpan | undefined {
  const match = /^you (?:(?:useless|worthless|stupid) )?(?:idiot|moron|piece of shit)[,.!](?=\s|$)/i.exec(text);
  if (!match) return undefined;
  const candidate = { start: 0, end: match[0].length };
  if (spans.some(s => overlaps(s, candidate)) || attackWords.test(text.slice(candidate.end))) return undefined;
  return candidate;
}
