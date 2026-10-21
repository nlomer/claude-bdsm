// Types: synthetic benchmark records keep routing/candidate/final validation evidence separate.
import type { Fixture } from '../fixtures/types.js';
import type { SanitizeResult } from '../core/types.js';
import type { Method } from '../core/rewrite.js';
import type { GenerationResult } from '../runtime/adapter.js';
export interface BenchRow {
  id: string; fixtureId: string; group: string; category: string; expectedAction: Fixture['expected_action'];
  model: string; method: Method; prompt: string; promptHash: string; temperature: number;
  repeat: number; inputLength: number; result: SanitizeResult; elapsedMs: number;
  candidate?: GenerationResult;
  automatic: { protectedIntact: boolean; constraintsExact: boolean; toneProxy: boolean; changedKeep: boolean; provisionalRewriteSuccess: boolean };
}
