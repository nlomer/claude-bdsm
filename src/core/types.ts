// Types: public sanitizer contract and UTF-16 source-span primitives.
export type Tone = 'neutral' | 'hr' | 'victorian';
export type Status = 'unchanged' | 'rewritten' | 'review_required' | 'error';
export interface SanitizeRequest {
  text: string;
  tone: Tone;
  mode: 'rules' | 'model' | 'hybrid';
  language?: string;
}
export interface SanitizeResult {
  status: Status;
  output?: string;
  engine: 'none' | 'rules' | 'local-model';
  changed: boolean;
  reasons: string[];
  validation: {
    protectedSpansIntact: boolean;
    placeholdersValid: boolean;
    truncationDetected: boolean;
    requiresHumanReview: boolean;
  };
  timingsMs: Record<string, number>;
}
export interface SourceSpan { start: number; end: number }
export interface ProtectedSpan extends SourceSpan {
  kind: string;
  raw: string;
  sha256: string;
}
export interface Edit extends SourceSpan { replacement: string }
