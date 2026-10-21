// Service: verify exact bounded edits; this is not a general semantic correctness judge.
import { hashText, overlaps } from './parse.js';
import type { Edit, ProtectedSpan } from './types.js';
export function applyEdit(text: string, edit: Edit): string {
  if (!Number.isInteger(edit.start) || !Number.isInteger(edit.end) || edit.start < 0 ||
      edit.end <= edit.start || edit.end > text.length || !edit.replacement.trim()) throw new Error('INVALID_EDIT');
  return text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
}
export function validateEdit(text: string, candidate: string, edit: Edit, spans: ProtectedSpan[]): boolean {
  if (spans.some(s => overlaps(s, edit))) return false;
  if (candidate !== applyEdit(text, edit)) return false;
  const delta = edit.replacement.length - (edit.end - edit.start);
  return spans.every(s => {
    const shift = s.start >= edit.end ? delta : 0;
    const raw = candidate.slice(s.start + shift, s.end + shift);
    return raw === s.raw && hashText(raw) === s.sha256;
  });
}
