// Adapter: fresh templated streaming requests, token reservation and time-to-first-token sampling.
import { performance } from 'node:perf_hooks';
import type { GenerationRequest, GenerationResult } from './adapter.js';
import { LocalHttp } from './http.js';
interface Chunk {
  choices?: { delta?: { content?: string; reasoning_content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
  timings?: Record<string, number>;
}
export async function generate(http: LocalHttp, request: GenerationRequest): Promise<GenerationResult> {
  if (request.input.length > 32768 || request.system.length > 16384 ||
      !Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens < 1 || request.maxOutputTokens > 512) throw new Error('REQUEST_LIMIT');
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
  const started = performance.now();
  const messages = [{ role: 'system', content: request.system }, { role: 'user', content: request.input }];
  const template = await http.json<{ prompt: string }>('/apply-template', { messages }, signal);
  const tokenized = await http.json<{ tokens: number[] }>('/tokenize', { content: template.prompt, add_special: true }, signal);
  const tokenization = performance.now() - started;
  if (tokenized.tokens.length + request.maxOutputTokens > 2048) throw new Error('CONTEXT_OVERFLOW');
  const response = await http.response('/v1/chat/completions', { messages, temperature: request.temperature,
    seed: request.seed, max_tokens: request.maxOutputTokens, cache_prompt: false,
    stream: true, stream_options: { include_usage: true }, top_p: request.sampling?.topP ?? 1,
    top_k: request.sampling?.topK ?? 0, presence_penalty: request.sampling?.presencePenalty ?? 0, min_p: 0, repeat_penalty: 1 }, signal);
  let text = '', pending = '', finish = '', reasoning = '', first = -1, promptTokens = tokenized.tokens.length, outputTokens = 0;
  const decoder = new TextDecoder();
  let timings: Record<string, number> = {};
  for await (const bytes of response.body!) {
    pending += decoder.decode(bytes, { stream: true });
    if (pending.length + text.length > 1048576) throw new Error('RESPONSE_LIMIT');
    const lines = pending.split('\n'); pending = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
      const chunk = JSON.parse(line.slice(6)) as Chunk;
      const choice = chunk.choices?.[0];
      if (choice?.delta?.content && first < 0) first = performance.now() - started;
      text += choice?.delta?.content ?? ''; reasoning += choice?.delta?.reasoning_content ?? '';
      if (choice?.finish_reason) finish = choice.finish_reason;
      if (chunk.usage) { promptTokens = chunk.usage.prompt_tokens; outputTokens = chunk.usage.completion_tokens; }
      if (chunk.timings) timings = chunk.timings;
    }
  }
  if (reasoning || /<think>/i.test(text)) throw new Error('REASONING_NOT_DISABLED');
  return { text, finishReason: finish === 'stop' ? 'stop' : finish === 'length' ? 'length' : 'error',
    promptTokens, outputTokens, timingsMs: { ...timings, tokenization, ttft: first, total: performance.now() - started } };
}
