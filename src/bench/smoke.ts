// Controller: record real load/template/generation behavior for each exact candidate.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LlamaServer } from '../runtime/llama-server.js';
import { registry } from '../runtime/registry.js';
import { json, saveJson } from '../runtime/files.js';
import { parseFixtures } from '../fixtures/schema.js';
import { rewrite } from '../core/rewrite.js';
export async function smoke(root: string): Promise<void> {
  const lock = await json<{ smoke: string[] }>(resolve(root, 'fixtures/dataset.lock.json'));
  const fixtures = parseFixtures(await readFile(resolve(root, 'fixtures/dev.jsonl'), 'utf8')).filter(f => lock.smoke.includes(f.id));
  const prompt = await readFile(resolve(root, 'prompts/instruction.txt'), 'utf8');
  const folder = resolve(root, 'reports/smoke'); await mkdir(folder, { recursive: true });
  for (const model of registry) {
    let server: LlamaServer | undefined;
    try {
      process.stderr.write(`Smoke: ${model.id}\n`);
      server = await LlamaServer.start(root, model.id);
      await writeFile(resolve(folder, `${model.id}.startup.log`), server.startupLog);
      const props = await server.http.json('/props', undefined, AbortSignal.timeout(5000));
      const template = await server.http.json('/apply-template', { messages: [{ role: 'user', content: 'Hello' }] }, AbortSignal.timeout(5000));
      const rows = [];
      for (const fixture of fixtures) rows.push({ id: fixture.id, result: await rewrite(fixture.input, server,
        { method: 'protected', prompt, constraints: fixture.task_constraints }) });
      await saveJson(resolve(folder, `${model.id}.json`), { modelId: model.id, supported: true, startupMs: server.startupMs,
        props, template, rows, memory: server.memory.summary(), cpuOnlyRequested: true,
        cpuEvidence: server.startupLog.split('\n').filter(line => /CPU|offload|backend|n_gpu_layers/.test(line)), humanReview: 'pending' });
    } catch (error) {
      await saveJson(resolve(folder, `${model.id}.json`), { modelId: model.id, supported: false, error: String(error) });
    } finally { await server?.close(); }
  }
}
