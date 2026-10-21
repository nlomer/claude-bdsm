// Adapter: exclusive local sidecar ownership and random loopback port allocation.
import { createServer } from 'node:net';
import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('PORT_ALLOCATION_FAILED');
  await new Promise<void>((yes, no) => server.close(error => error ? no(error) : yes()));
  return address.port;
}
export async function ownRuntime(root: string): Promise<() => Promise<void>> {
  await mkdir(resolve(root, '.tools'), { recursive: true });
  const path = resolve(root, '.tools', 'active.lock');
  const owner = `${process.pid}:${Date.now()}`;
  const handle = await open(path, 'wx').catch(() => { throw new Error('RUNTIME_BUSY_OR_STALE_LOCK'); });
  await handle.writeFile(owner); await handle.close();
  return async () => { if (await readFile(path, 'utf8').catch(() => '') === owner) await rm(path, { force: true }); };
}
