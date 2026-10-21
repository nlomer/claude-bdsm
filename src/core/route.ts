// Service: conservative English baseline router; ambiguous language and clauses require review.
import { overlaps } from './parse.js';
import { attackWords, ruleEdit } from './rules.js';
import type { Edit, ProtectedSpan } from './types.js';
export interface Route { action: 'keep' | 'rewrite_needed' | 'review'; reason: string; edit?: Edit }

export function route(text: string, spans: ProtectedSpan[], language?: string): Route {
  if ((language && !/^en(?:-|$)/i.test(language)) || /[^\u0000-\u024f\u2000-\u206f\uFE00-\uFE0F]/u.test(text)) {
    return { action: 'review', reason: 'LANGUAGE_UNSUPPORTED' };
  }
  if (/ignore (?:the |all |previous )?(?:editor|instructions)|system prompt|<\|(?:system|assistant)|\[INST\]/i.test(text)) {
    return { action: 'review', reason: 'EDITOR_INSTRUCTION_AMBIGUOUS' };
  }
  const discussed = /\b(?:string|fixture|test data|error message|quot(?:e|ed|ation)|dialogue)\b/i.test(text);
  const quotes = spans.filter(s => s.kind === 'quote' && attackWords.test(s.raw));
  if (quotes.length && !discussed) return { action: 'review', reason: 'QUOTATION_AMBIGUOUS' };
  let prose = text;
  for (const span of [...spans].reverse()) {
    if (span.kind !== 'constraint') prose = prose.slice(0, span.start) + ' '.repeat(span.end - span.start) + prose.slice(span.end);
  }
  const edit = ruleEdit(text);
  if (edit && !spans.some(s => overlaps(s, edit)) && !attackWords.test(prose.slice(edit.end))) {
    return { action: 'rewrite_needed', reason: 'ISOLATED_DIRECT_INSULT', edit };
  }
  if (attackWords.test(prose) || /\byou(?:'re| are)\b.*\b(?:suck|sh[i1*]t|dumb|fool)|\bi[d0][i1][o0]t\b/i.test(prose)) {
    return { action: 'review', reason: 'CLAUSE_AMBIGUOUS' };
  }
  return { action: 'keep', reason: 'NO_KNOWN_REWRITE' };
}
