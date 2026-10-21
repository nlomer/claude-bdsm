// Controller: serial, append-only synthetic benchmark runs with explicit failures and immutable settings.
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { cpus, release, totalmem } from 'node:os';
import { LlamaServer } from '../runtime/llama-server.js';
import { registry } from '../runtime/registry.js';
import { digest, json, saveJson } from '../runtime/files.js';
import { corpus, prompts } from './corpus.js';
import { shuffle } from './stats.js';
import { score } from './score.js';
import { rewrite, type Method } from '../core/rewrite.js';
import type { BenchRow } from './types.js';
import type { Fixture } from '../fixtures/types.js';
import type { GenerationResult } from '../runtime/adapter.js';
import { cardSampling } from './sampling.js';
export type Suite = 'dev' | 'holdout' | 'performance' | 'oracle' | 'sampling';
interface Frozen { prompt: string; promptHash: string; datasetHashes: Record<string, string>; modelLockHash: string; runtimeLockHash: string }

async function record(folder: string, fixture: Fixture, model: string, method: Method,
  prompt: { id: string; text: string; sha256: string }, server: LlamaServer | undefined, repeat: number, sampled = false): Promise<void> {
  const started = performance.now();
  let candidate: GenerationResult | undefined;
  const { temperature: variantTemperature, ...sampling } = cardSampling(model);
  const temperature = sampled ? variantTemperature : 0;
  const result = await rewrite(fixture.input, server, { method, prompt: prompt.text, constraints: fixture.task_constraints, temperature,
    ...(sampled ? { sampling } : {}),
    observe: result => { candidate = result; },
    ...(fixture.editable_spans[0] ? { oracle: fixture.editable_spans[0] } : {}) });
  const row: BenchRow = { id: `${model}-${method}-${prompt.id}-${fixture.id}-${repeat}`, fixtureId: fixture.id,
    group: fixture.group, category: fixture.category, expectedAction: fixture.expected_action, model, method,
    prompt: prompt.id, promptHash: prompt.sha256, temperature, repeat, inputLength: fixture.input.length,
    result, ...(candidate ? { candidate } : {}), elapsedMs: performance.now() - started, automatic: score(fixture, result) };
  await appendFile(resolve(folder, 'rows.jsonl'), JSON.stringify(row) + '\n');
}
export async function runBenchmark(root: string, suite: Suite): Promise<string> {
  const { fixtures: all, lock } = await corpus(root, suite === 'holdout' ? 'holdout' : 'dev');
  const availablePrompts = await prompts(root);
  const frozen = !['dev', 'sampling'].includes(suite) ? await json<Frozen>(resolve(root, 'bench-settings.lock.json')) : undefined;
  if (frozen && (await digest(resolve(root, 'models.lock.json')) !== frozen.modelLockHash ||
    await digest(resolve(root, 'runtime.lock.json')) !== frozen.runtimeLockHash ||
    JSON.stringify(lock.hashes) !== JSON.stringify(frozen.datasetHashes))) throw new Error('FROZEN_SETTINGS_MISMATCH');
  const selected = frozen ? availablePrompts.filter(p => p.id === frozen.prompt && p.sha256 === frozen.promptHash) : suite === 'sampling' ? availablePrompts.slice(0, 1) : availablePrompts;
  if (!selected.length) throw new Error('PROMPT_HASH_MISMATCH');
  const fixtures = ['performance', 'oracle', 'sampling'].includes(suite) ? all.filter(f => lock.performancePanel.includes(f.id)) : all;
  const id = `${suite}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const folder = resolve(root, 'reports', id); await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, 'rows.jsonl'), '');
  await saveJson(resolve(folder, 'manifest.json'), { id, suite, startedAt: new Date().toISOString(),
    datasetHashes: lock.hashes, modelLockHash: await digest(resolve(root, 'models.lock.json')),
    runtimeLockHash: await digest(resolve(root, 'runtime.lock.json')), prompts: selected.map(p => ({ id: p.id, sha256: p.sha256 })),
    backend: 'CPU', context: 2048, threads: Math.min(4, cpus().length), seed: 42, temperature: suite === 'sampling' ? 'per-model card variant' : 0,
    samplingProfiles: suite === 'sampling' ? Object.fromEntries(registry.map(m => [m.id, cardSampling(m.id)])) : { topP: 1, topK: 0, presencePenalty: 0 },
    cachePrompt: false, requestConcurrency: 1, outputBudget: '256 short / 512 long', humanReview: 'pending',
    hardware: { os: process.platform, osBuild: release(), arch: process.arch, cpu: cpus()[0]?.model, logicalCpus: cpus().length, ramBytes: totalmem(), node: process.version } });
  for (const method of ['identity', 'rules'] as Method[]) for (const fixture of shuffle(fixtures)) {
    await record(folder, fixture, 'none', method, selected[0]!, undefined, 0);
  }
  for (const model of registry) {
    let server: LlamaServer | undefined;
    try {
      process.stderr.write(`${suite}: ${model.id}\n`);
      server = await LlamaServer.start(root, model.id);
      await writeFile(resolve(folder, `${model.id}.startup.log`), server.startupLog);
      if (suite === 'performance') await rewrite('You idiot. Fix the test.', server, { method: 'protected', prompt: selected[0]!.text });
      const methods: Method[] = suite === 'oracle' ? ['oracle'] : ['protected', 'hybrid'];
      const jobs = selected.flatMap(prompt => methods.flatMap(method => Array.from({ length: suite === 'performance' ? 10 : 1 }, (_, repeat) => fixtures.map(fixture => ({ prompt, method, fixture, repeat }))).flat()));
      let done = 0;
      for (const job of shuffle(jobs)) {
        await record(folder, job.fixture, model.id, job.method, job.prompt, server, job.repeat, suite === 'sampling');
        if (++done % 20 === 0) process.stderr.write(`${model.id}: ${done}/${jobs.length}\n`);
      }
      await saveJson(resolve(folder, `${model.id}.resources.json`), { startupMs: server.startupMs, ...server.memory.summary() });
    } catch (error) { await saveJson(resolve(folder, `${model.id}.failure.json`), { error: String(error), incomplete: true }); }
    finally { await server?.close(); }
  }
  await saveJson(resolve(folder, 'complete.json'), { completedAt: new Date().toISOString() });
  await saveJson(resolve(root, 'reports', `latest-${suite}.json`), { folder });
  return folder;
}
export async function freeze(root: string, promptId = 'instruction'): Promise<void> {
  const { lock } = await corpus(root, 'dev');
  const prompt = (await prompts(root)).find(p => p.id === promptId);
  if (!prompt) throw new Error('UNKNOWN_PROMPT');
  await saveJson(resolve(root, 'bench-settings.lock.json'), { prompt: prompt.id, promptHash: prompt.sha256,
    datasetHashes: lock.hashes, modelLockHash: await digest(resolve(root, 'models.lock.json')),
    runtimeLockHash: await digest(resolve(root, 'runtime.lock.json')), temperature: 0, seed: 42,
    humanReview: 'pending', selectionPolicy: 'Shared primary; automatic structural evidence only; no release approval' });
}
