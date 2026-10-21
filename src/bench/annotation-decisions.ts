// Controller: import actual frozen-corpus annotation decisions without modifying labels after evaluation.
import { resolve } from 'node:path';
import { corpus } from './corpus.js';
import { json, saveJson } from '../runtime/files.js';
interface AnnotationDecision { id: string; reviewer: string; decision: 'accept' | 'revise' | 'unreviewed'; notes: string }
export async function importAnnotationDecisions(root: string, source: string): Promise<void> {
  const dev = await corpus(root, 'dev'), holdout = await corpus(root, 'holdout');
  const ids = new Set([...dev.fixtures, ...holdout.fixtures].map(f => f.id));
  const file = await json<{ version: number; datasetHashes: Record<string, string>; decisions: AnnotationDecision[] }>(source);
  if (file.version !== 1 || !file.datasetHashes || !Object.entries(dev.lock.hashes).every(([key, hash]) => file.datasetHashes[key] === hash) || !Array.isArray(file.decisions)) throw new Error('ANNOTATION_FILE_HASH_MISMATCH');
  const seen = new Set<string>();
  for (const d of file.decisions) {
    if (!d || !ids.has(d.id) || seen.has(d.id) || typeof d.reviewer !== 'string' || !d.reviewer.trim() ||
      !['accept', 'revise', 'unreviewed'].includes(d.decision) || typeof d.notes !== 'string') throw new Error('INVALID_ANNOTATION_DECISION');
    seen.add(d.id);
  }
  const existing = await json<{ datasetHashes: Record<string, string>; decisions: AnnotationDecision[] }>(resolve(root, 'reports/annotation-review.json')).catch(() => undefined);
  const previous = existing && Object.entries(dev.lock.hashes).every(([key, hash]) => existing.datasetHashes[key] === hash) ? existing.decisions : [];
  const merged = new Map(previous.map(d => [d.id, d]));
  for (const decision of file.decisions) merged.set(decision.id, decision);
  const decisions = [...merged.values()];
  const accepted = decisions.filter(d => d.decision === 'accept').length;
  await saveJson(resolve(root, 'reports/annotation-review.json'), { status: accepted === ids.size ? 'accepted' : 'pending',
    accepted, required: ids.size, corrections: decisions.filter(d => d.decision === 'revise').length,
    importedAt: new Date().toISOString(), datasetHashes: dev.lock.hashes, decisions });
}
