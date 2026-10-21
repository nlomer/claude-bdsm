// Adapter/service: import actual reviewer decisions; never infer human judgments from automatic scores.
import { resolve } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
export interface Decision { id: string; reviewer: string; ratings: Record<'fidelity' | 'tone' | 'acceptable', 'yes' | 'no' | 'uncertain' | 'unreviewed'>; critical: boolean; reason: string }
export async function importDecisions(folder: string, source: string) {
  const key = await json<Record<string, string>>(resolve(folder, 'review-key.json'));
  const file = await json<{ version: number; decisions: Decision[] }>(source);
  if (file.version !== 1 || !Array.isArray(file.decisions)) throw new Error('INVALID_REVIEW_FILE');
  const seen = new Set<string>();
  for (const decision of file.decisions) {
    if (!decision || typeof decision.id !== 'string' || !Object.hasOwn(key, decision.id) || typeof decision.reviewer !== 'string' || !decision.reviewer.trim() ||
      typeof decision.reason !== 'string' || typeof decision.critical !== 'boolean' ||
      !['fidelity', 'tone', 'acceptable'].every(field => ['yes', 'no', 'uncertain', 'unreviewed'].includes(decision.ratings?.[field as keyof Decision['ratings']])) ||
      seen.has(`${decision.id}/${decision.reviewer}`)) throw new Error('INVALID_REVIEW_DECISION');
    seen.add(`${decision.id}/${decision.reviewer}`);
  }
  const existing = await json<Decision[]>(resolve(folder, 'human-review.json')).catch(() => []);
  const merged = new Map(existing.map(d => [`${d.id}/${d.reviewer}`, d]));
  for (const d of file.decisions) merged.set(`${d.id}/${d.reviewer}`, d);
  await saveJson(resolve(folder, 'human-review.json'), [...merged.values()]);
}
export async function humanSummary(folder: string, total: number, allowedIds?: string[]) {
  let decisions = await json<Decision[]>(resolve(folder, 'human-review.json')).catch(() => []);
  if (allowedIds) decisions = decisions.filter(d => allowedIds.includes(d.id));
  const completed = decisions.filter(d => Object.values(d.ratings).every(r => !['unreviewed', 'uncertain'].includes(r)));
  const ids = [...new Set(completed.map(d => d.id))];
  const critical = completed.filter(d => d.critical);
  const secondReviewed = ids.filter(id => new Set(completed.filter(d => d.id === id).map(d => d.reviewer)).size >= 2);
  const disagreements = secondReviewed.filter(id => new Set(completed.filter(d => d.id === id).map(d => JSON.stringify(d.ratings))).size > 1);
  return { status: ids.length === total && total > 0 && !critical.some(d => !secondReviewed.includes(d.id)) && !disagreements.length ? 'reviewed_pending_release_decision' : 'pending',
    reviewed: ids.length, required: total, secondReviewed: secondReviewed.length, disagreements: disagreements.length,
    criticalFlags: critical.length, distinctReviewers: new Set(completed.map(d => d.reviewer)).size };
}
