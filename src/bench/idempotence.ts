// Controller: a frozen development-panel diagnostic measures real second-pass output behavior.
import { resolve } from 'node:path';
import { LlamaServer } from '../runtime/llama-server.js';
import { registry } from '../runtime/registry.js';
import { json, saveJson } from '../runtime/files.js';
import { corpus, prompts } from './corpus.js';
import { rewrite, type Method } from '../core/rewrite.js';
import type { GenerationResult } from '../runtime/adapter.js';
export async function idempotence(root: string): Promise<void> {
  const { fixtures, lock } = await corpus(root, 'dev');
  const frozen = await json<{ prompt: string }>(resolve(root, 'bench-settings.lock.json'));
  const prompt = (await prompts(root)).find(p => p.id === frozen.prompt)!;
  const panel = fixtures.filter(f => lock.performancePanel.includes(f.id));
  const rows = [];
  for (const model of registry) {
    process.stderr.write(`Idempotence: ${model.id}\n`);
    let server: LlamaServer | undefined;
    try {
      server = await LlamaServer.start(root, model.id);
      let completed = 0;
      for (const method of ['protected', 'hybrid'] as Method[]) for (const fixture of panel) {
        let firstCandidate: GenerationResult | undefined, secondCandidate: GenerationResult | undefined;
        const options = { method, prompt: prompt.text, constraints: fixture.task_constraints };
        const first = await rewrite(fixture.input, server, { ...options, observe: result => { firstCandidate = result; } });
        const second = first.output !== undefined ? await rewrite(first.output, server, { ...options, observe: result => { secondCandidate = result; } }) : undefined;
        rows.push({ model: model.id, method, fixtureId: fixture.id, firstStatus: first.status,
          secondStatus: second?.status ?? 'not_attempted', tested: !!second,
          idempotent: !!second && second.output === first.output, reasons: second?.reasons ?? first.reasons,
          first, second, firstCandidate, secondCandidate });
        if (++completed % 12 === 0) process.stderr.write(`Idempotence ${model.id}: ${completed}/48\n`);
      }
    } catch (error) { rows.push({ model: model.id, error: String(error) }); }
    finally { await server?.close(); }
    await saveJson(resolve(root, 'reports/idempotence.json'), { definition: 'Development panel diagnostic; failed first passes are untested, not idempotence successes', rows });
  }
}
