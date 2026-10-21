// Adapter: shell-free child execution and bounded cleanup, shared by installers and integrations.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
export async function runProcess(executable: string, args: string[], cwd: string): Promise<string> {
  const child = spawn(executable, args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-262144); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  const timer = setTimeout(() => child.kill(), 120000);
  try {
    const [code] = await once(child, 'close');
    if (code !== 0) throw new Error(`CHILD_EXIT_${code}`);
    return output;
  } finally { clearTimeout(timer); }
}
export async function stopChild(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = once(child, 'exit').catch(() => []);
  child.kill();
  const force = setTimeout(() => child.kill('SIGKILL'), 2000);
  try { await stopped; } finally { clearTimeout(force); }
}
