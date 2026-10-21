// Adapter: one-turn shell-free stdin submission; no permission bypass flags or implicit session resume.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { stopChild } from '../runtime/process.js';
import { canSubmit } from './approval.js';
import type { SanitizeResult } from '../core/types.js';
export async function submit(result: SanitizeResult, options: { executable: string; cwd: string; approvedHash?: string; signal?: AbortSignal; prefixArgs?: string[] }) {
  if (!canSubmit(result, options.approvedHash)) throw new Error('SUBMISSION_NOT_APPROVED');
  if (/\.(?:cmd|bat|ps1)$/i.test(options.executable)) throw new Error('NATIVE_EXECUTABLE_REQUIRED');
  const child = spawn(options.executable, [...(options.prefixArgs ?? []), '-p', '--output-format', 'json'], {
    cwd: options.cwd, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe']
  });
  let stdout = '', stderr = '';
  const capture = (target: 'stdout' | 'stderr', data: Buffer) => {
    if (target === 'stdout') stdout += data.toString(); else stderr += data.toString();
    if (stdout.length + stderr.length > 1048576) child.kill();
  };
  child.stdout.on('data', chunk => capture('stdout', chunk)); child.stderr.on('data', chunk => capture('stderr', chunk));
  child.stdin.on('error', () => {});
  let interrupted = false;
  const abort = () => { interrupted = true; void stopChild(child); };
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 300000);
  try {
    if (options.signal?.aborted) { abort(); throw new Error('SUBMISSION_ABORTED'); }
    const exited = once(child, 'close');
    child.stdin.end(result.output);
    const [code] = await exited;
    return { code: interrupted ? 130 : typeof code === 'number' ? code : 130, stdout, stderr };
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
    await stopChild(child);
  }
}
