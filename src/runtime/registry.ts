// Constants/types: exact requested Q4_K_M artifacts; never substitute another quantization.
export const registry = [
  { id: 'smol-135m-q4km', upstream: 'HuggingFaceTB/SmolLM2-135M-Instruct', repo: 'bartowski/SmolLM2-135M-Instruct-GGUF', file: 'SmolLM2-135M-Instruct-Q4_K_M.gguf' },
  { id: 'smol-360m-q4km', upstream: 'HuggingFaceTB/SmolLM2-360M-Instruct', repo: 'bartowski/SmolLM2-360M-Instruct-GGUF', file: 'SmolLM2-360M-Instruct-Q4_K_M.gguf' },
  { id: 'qwen3-06b-q4km', upstream: 'Qwen/Qwen3-0.6B', repo: 'unsloth/Qwen3-0.6B-GGUF', file: 'Qwen3-0.6B-Q4_K_M.gguf' },
  { id: 'qwen35-08b-q4km', upstream: 'Qwen/Qwen3.5-0.8B', repo: 'unsloth/Qwen3.5-0.8B-GGUF', file: 'Qwen3.5-0.8B-Q4_K_M.gguf' }
] as const;
export interface ModelLock {
  id: string; upstream: string; repo: string; file: string; revision: string; upstreamRevision: string;
  quantization: 'Q4_K_M'; url: string; bytes: number; advertisedSha256: string; computedSha256: string;
  license: string; licenseFiles: string[]; metadata: Record<string, unknown>;
}
export interface RuntimeLock {
  tag: string; revision: string; license: string; assets: Record<string, {
    name: string; url: string; bytes: number; advertisedSha256: string; computedSha256?: string;
  }>; executableSha256?: string; buildVersion?: string; installedPlatform?: string;
  bundleSha256?: Record<string, string>;
}
