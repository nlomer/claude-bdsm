// Service: locate literal regions using source offsets, never Markdown serialization.
import { createHash } from 'node:crypto';
import type { ProtectedSpan, SourceSpan } from './types.js';

export const hashText = (text: string): string => createHash('sha256').update(text).digest('hex');
export const overlaps = (a: SourceSpan, b: SourceSpan): boolean => a.start < b.end && b.start < a.end;

function fencedSpans(text: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const lines = [...text.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)];
  let open: { start: number; char: string; width: number } | undefined;
  for (const line of lines) {
    const mark = /^ {0,3}(`{3,}|~{3,})(.*?)(?:\r?\n|\r)?$/.exec(line[0]);
    if (!mark) continue;
    const fence = mark[1]!;
    if (!open) open = { start: line.index!, char: fence[0]!, width: fence.length };
    else if (fence[0] === open.char && fence.length >= open.width && !mark[2]!.trim()) {
      spans.push({ start: open.start, end: line.index! + line[0].length });
      open = undefined;
    }
  }
  if (open) spans.push({ start: open.start, end: text.length });
  return spans;
}

export function parseProtected(text: string): ProtectedSpan[] {
  const spans: Array<SourceSpan & { kind: string }> = fencedSpans(text).map(s => ({ ...s, kind: 'fence' }));
  const add = (pattern: RegExp, kind: string): void => {
    for (const match of text.matchAll(pattern)) {
      const span = { start: match.index!, end: match.index! + match[0].length, kind };
      if (!spans.some(s => overlaps(s, span))) spans.push(span);
    }
  };
  add(/^(?:\s*(?:ERROR|WARN|INFO|DEBUG|TRACE)\b|\s*at\s+).+$/gm, 'log');
  for (const span of inlineSpans(text)) {
    if (!spans.some(s => overlaps(s, span))) spans.push({ ...span, kind: 'inline-code' });
  }
  // Apostrophes inside words are not quotation delimiters.
  add(/"[^"\r\n]*"|“[^”\r\n]*”|(?<![\p{L}\p{N}])'[^'\r\n]*'(?![\p{L}\p{N}])/gu, 'quote');
  add(/https?:\/\/[^\s<>"']+/g, 'url');
  add(/\b(?:npm|pnpm|yarn|git|node)[ \t]+(?:(?:run|exec)[ \t]+)?[\w/-]+(?:\.[\w/-]+)*(?:[ \t]+--?[\w=-]+)*/g, 'command');
  add(/(?:[A-Za-z]:\\|\.{0,2}\/|\b[\w.-]+\/)[\w./\\-]+|\b[\w-]+\.(?:ts|tsx|js|json|py|md|log)\b/g, 'path');
  add(/\b\d+(?:\.\d+)?\s*(?:(?:ms|s|seconds?|MB|GB|KB|Hz|px)\b|%(?!\w))/g, 'quantity');
  add(/\b\w+(?:_\w+)+\b|\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g, 'identifier');
  // Fill uncovered portions of explicit constraints without discarding inner literals.
  for (const match of text.matchAll(/\b(?:do not|don't|never|unless|only if|must|before|after)\b[^\r\n]*/gi)) {
    let cursor = match.index!;
    const end = cursor + match[0].length;
    for (const span of [...spans].sort((a, b) => a.start - b.start)) {
      if (span.end <= cursor || span.start >= end) continue;
      if (span.start > cursor) spans.push({ start: cursor, end: span.start, kind: 'constraint' });
      cursor = Math.max(cursor, span.end);
    }
    if (cursor < end) spans.push({ start: cursor, end, kind: 'constraint' });
  }
  return spans.sort((a, b) => a.start - b.start).map(s => {
    const raw = text.slice(s.start, s.end);
    return { ...s, raw, sha256: hashText(raw) };
  });
}

function inlineSpans(text: string): SourceSpan[] {
  const runs = [...text.matchAll(/`+/g)];
  const spans: SourceSpan[] = [];
  for (let i = 0; i < runs.length; i++) {
    const open = runs[i]!;
    const close = runs.findIndex((run, j) => j > i && run[0].length === open[0].length);
    if (close < 0) continue;
    spans.push({ start: open.index!, end: runs[close]!.index! + open[0].length });
    i = close;
  }
  return spans;
}
