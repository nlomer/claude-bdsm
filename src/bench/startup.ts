// Controller: five process-cold restarts; never label OS filesystem caches cold.
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { LlamaServer } from '../runtime/llama-server.js';
import { registry } from '../runtime/registry.js';
import { saveJson } from '../runtime/files.js';
export async function startup(root: string): Promise<void> {
  const rows = [];
  for (const model of registry) for (let repeat = 0; repeat < 5; repeat++) {
    let server: LlamaServer | undefined;
    const started = performance.now();
    try {
      server = await LlamaServer.start(root, model.id);
      const result = await server.generate({ system: 'Copy the user text exactly.', input: 'Hello.', maxOutputTokens: 256,
        seed: 42, temperature: 0, signal: AbortSignal.timeout(60000) });
      rows.push({ model: model.id, repeat, launchToReadyMs: server.startupMs, setupToFirstResultMs: performance.now() - started,
        firstValidResult: result.finishReason === 'stop' && result.text.trim() === 'Hello.',
        result, memory: server.memory.summary() });
    } catch (error) { rows.push({ model: model.id, repeat, error: String(error) }); }
    finally { await server?.close(); }
    await saveJson(resolve(root, 'reports/startup.json'), { definition: 'process-cold; filesystem caches not cleared; setup includes SHA-256 verification', rows });
  }
}
