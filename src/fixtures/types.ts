// Types/constants: provisional synthetic fixture annotations, using UTF-16 offsets.
import type { SourceSpan, Status } from '../core/types.js';
export const categories = ['neutral', 'benign_profanity', 'direct_insult', 'multiple_changes',
  'negation_and_scope', 'code_and_logs', 'quotation', 'frustration_only', 'obfuscation',
  'editor_manipulation', 'ambiguous', 'long_input'] as const;
export interface FixtureSpan extends SourceSpan { text: string }
export interface Fixture {
  id: string;
  group: string;
  category: typeof categories[number];
  input: string;
  expected_action: 'keep' | 'rewrite_needed' | 'review';
  expected_status: Status;
  editable_spans: FixtureSpan[];
  protected_spans: FixtureSpan[];
  protected_exact: string[];
  task_constraints: string[];
  atomic_task_constraints?: string[];
  forbidden_changes: string[];
  acceptable_examples: string[];
  severity: 'none' | 'low' | 'moderate' | 'high';
  annotation_review: 'pending';
}
