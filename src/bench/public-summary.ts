// Adapter: publish aggregate benchmark evidence, excluding local run paths and raw prompt rows.
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { saveJson } from '../runtime/files.js';
interface PublicEvidence {
  completedAt: string; evaluationComplete: boolean; releaseDecision: string; humanReview: string;
  runtimeDiskBytes: number; cold: unknown; terminal: unknown; baselineTimings: unknown; settings: unknown;
  hardware: unknown; rows: unknown; rules: unknown; pairedComparisons: unknown; qualityGates: unknown;
  matrix: unknown;
}
export function publicSummary(evidence: PublicEvidence) {
  return {
    schemaVersion: 1, completedAt: evidence.completedAt, evaluationComplete: evidence.evaluationComplete,
    releaseDecision: evidence.releaseDecision, humanReview: evidence.humanReview,
    runtimeDiskBytes: evidence.runtimeDiskBytes, processCold: evidence.cold,
    terminalDiagnostic: evidence.terminal,
    baselineTimings: evidence.baselineTimings, frozenSettings: evidence.settings,
    hardware: evidence.hardware, models: evidence.rows, rules: evidence.rules,
    pairedComparisons: evidence.pairedComparisons, qualityGates: evidence.qualityGates, tested: evidence.matrix,
    limitations: ['Agent-authored synthetic annotations; human fidelity review pending',
      'Warm latency excludes model startup; hybrid includes rule bypasses',
      'Windows measurements only; filesystem caches not cleared; uncontrolled CPU contention']
  };
}
export async function writePublicSummary(root: string, evidence: PublicEvidence): Promise<void> {
  await mkdir(resolve(root, 'docs'), { recursive: true });
  await saveJson(resolve(root, 'docs/benchmark-summary.json'), publicSummary(evidence));
}
