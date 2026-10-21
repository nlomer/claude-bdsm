// Controller: verified CPU sidecar lifecycle; exclusive ownership, one request, explicit cleanup.
import { spawn, type ChildProcess } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as pause } from 'node:timers/promises';
import type { GenerationRequest, RuntimeAdapter } from './adapter.js';
import { ownRuntime } from './ownership.js';
import { sampleResources } from './resources.js';
import type { LocalHttp } from './http.js';
import { generate } from './generate.js';
import { stopChild } from './process.js';
import { prepareLaunch } from './launch-config.js';

export class LlamaServer implements RuntimeAdapter {
  private busy = false;
  private closed = false;
  readonly memory;
  private readonly terminate = () => { void this.close().finally(() => { process.exit(130); }); };
  private constructor(readonly modelId: string, readonly child: ChildProcess, readonly http: LocalHttp,
    readonly startupMs: number, readonly startupLog: string, private release: () => Promise<void>, measure: boolean) {
    this.memory = sampleResources(child.pid!, measure);
    process.once('SIGINT', this.terminate); process.once('SIGTERM', this.terminate);
  }
  static async start(root: string, id: string, measure = true): Promise<LlamaServer> {
    const release = await ownRuntime(root);
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
    let child: ChildProcess | undefined;
    const keyFile = resolve(root, '.tools', `key-${process.pid}.txt`);
    try {
      const { executable, args, http } = await prepareLaunch(root, id, keyFile);
      const started = performance.now();
      if (interrupted) throw new Error('STARTUP_CANCELLED');
      child = spawn(executable, args, { cwd: root, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      let logs = '', ready = false, failed = false;
      child.on('error', () => { failed = true; });
      const capture = (data: Buffer) => { if (!ready) logs = (logs + data.toString()).slice(-262144); };
      child.stdout!.on('data', capture); child.stderr!.on('data', capture);
      while (performance.now() - started < 90000) {
        if (interrupted) throw new Error('STARTUP_CANCELLED');
        if (failed || child.exitCode !== null) throw new Error(`RUNTIME_LOAD_FAILED:${logs.slice(-2000)}`);
        try {
          await http.json('/props', undefined, AbortSignal.timeout(500));
          ready = true;
          return new LlamaServer(id, child, http, performance.now() - started, logs, release, measure);
        } catch { await pause(100); }
      }
      throw new Error('RUNTIME_STARTUP_TIMEOUT');
    } catch (error) {
      if (child) await stopChild(child); await release();
      if (interrupted) { await rm(keyFile, { force: true }); process.exit(130); }
      throw error;
    } finally {
      process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
      await rm(keyFile, { force: true });
    }
  }
  async generate(request: GenerationRequest) {
    if (this.closed) throw new Error('RUNTIME_CLOSED');
    if (this.busy) throw new Error('RUNTIME_QUEUE_FULL');
    this.busy = true;
    try { return await generate(this.http, request); } finally { this.busy = false; }
  }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    process.removeListener('SIGINT', this.terminate); process.removeListener('SIGTERM', this.terminate);
    await stopChild(this.child);
    await this.memory.close();
    await this.release();
  }
}
