// Types: inference boundary; implementations must remain local and abortable.
export interface GenerationRequest {
  system: string;
  input: string;
  maxOutputTokens: number;
  seed: number;
  temperature: number;
  signal: AbortSignal;
  sampling?: { topP: number; topK: number; presencePenalty: number };
}
export interface GenerationResult {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  promptTokens: number;
  outputTokens: number;
  timingsMs: Record<string, number>;
}
export interface RuntimeAdapter {
  readonly modelId: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
  close(): Promise<void>;
}
