// Service: validate synthetic annotations with record/field errors; never echo input bodies.
import { overlaps } from '../core/parse.js';
import { categories, type Fixture, type FixtureSpan } from './types.js';

function fail(label: string, field: string): never { throw new Error(`${label}: invalid ${field}`); }
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim().length > 0);
}
function spans(value: unknown, input: string, label: string, field: string): FixtureSpan[] {
  if (!Array.isArray(value)) fail(label, field);
  let end = 0;
  return value.map((span: unknown) => {
    if (!span || typeof span !== 'object') fail(label, field);
    const s = span as FixtureSpan;
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < end ||
        s.end <= s.start || s.end > input.length || input.slice(s.start, s.end) !== s.text) fail(label, field);
    end = s.end;
    return { start: s.start, end: s.end, text: s.text };
  });
}
export function validateFixture(value: unknown, label = 'fixture'): Fixture {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label, 'record');
  const f = value as Fixture;
  for (const field of ['id', 'group', 'input'] as const) {
    if (typeof f[field] !== 'string' || !f[field].trim()) fail(label, field);
  }
  if (!categories.includes(f.category)) fail(label, 'category');
  if (!['keep', 'rewrite_needed', 'review'].includes(f.expected_action)) fail(label, 'expected_action');
  if (!['unchanged', 'rewritten', 'review_required', 'error'].includes(f.expected_status)) fail(label, 'expected_status');
  if (!['none', 'low', 'moderate', 'high'].includes(f.severity)) fail(label, 'severity');
  if (f.annotation_review !== 'pending') fail(label, 'annotation_review');
  for (const field of ['protected_exact', 'task_constraints', 'forbidden_changes', 'acceptable_examples'] as const) {
    if (!strings(f[field])) fail(label, field);
  }
  if (!f.acceptable_examples.length) fail(label, 'acceptable_examples');
  if (f.atomic_task_constraints !== undefined && !strings(f.atomic_task_constraints)) fail(label, 'atomic_task_constraints');
  const editable = spans(f.editable_spans, f.input, label, 'editable_spans');
  const protectedSpans = spans(f.protected_spans, f.input, label, 'protected_spans');
  if (editable.some(e => protectedSpans.some(p => overlaps(e, p)))) fail(label, 'overlapping annotations');
  if (f.protected_exact.length !== protectedSpans.length ||
      f.protected_exact.some((text, i) => text !== protectedSpans[i]!.text)) fail(label, 'protected_exact');
  if (f.expected_action === 'rewrite_needed' && !editable.length) fail(label, 'editable_spans');
  if (f.expected_action === 'keep' && (editable.length || f.expected_status !== 'unchanged')) fail(label, 'keep contract');
  if (f.expected_action === 'review' && f.expected_status !== 'review_required') fail(label, 'review contract');
  return { ...f, editable_spans: editable, protected_spans: protectedSpans };
}
export function parseFixtures(jsonl: string): Fixture[] {
  const ids = new Set<string>();
  return jsonl.split(/\r?\n/).flatMap((line, i) => {
    if (!line.trim()) return [];
    const label = `line ${i + 1}`;
    let value: unknown;
    try { value = JSON.parse(line); } catch { fail(label, 'JSON'); }
    const fixture = validateFixture(value, label);
    if (ids.has(fixture.id)) fail(label, 'duplicate id');
    ids.add(fixture.id);
    return [fixture];
  });
}
