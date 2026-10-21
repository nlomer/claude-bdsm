// Adapter: authenticated loopback-only panel, strict origin/host checks and fixed local assets.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { friendlyError } from './errors.format.js';
const assets: Record<string, [string, string]> = {
  '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/settings.js': ['settings.js', 'text/javascript'],
  '/api.js': ['api.js', 'text/javascript'], '/confirm.js': ['confirm.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css']
};
async function body(req: IncomingMessage) {
  let bytes = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 262144) throw new Error('REQUEST_LIMIT'); chunks.push(chunk); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value));
}
export async function listenPanel(root: string, handle: (path: string, value: unknown) => Promise<unknown>, cancel: () => void) {
  const token = randomBytes(32).toString('hex'); let origin = '';
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (req.headers.host !== new URL(origin).host) { res.writeHead(403); res.end(); return; }
      const path = req.url ?? '';
      if (req.method === 'GET' && assets[path]) {
        const [file, type] = assets[path]; res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
        res.end(await readFile(resolve(root, 'src/local-ui', file))); return;
      }
      const auth = Buffer.from(req.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${token}`);
      if (req.method !== 'POST' || req.headers.origin !== origin || auth.length !== expected.length || !timingSafeEqual(auth, expected)) { json(res, 403, { message: 'Launch the app from npm start to open an authenticated local tab.' }); return; }
      if (req.headers['content-type'] !== 'application/json') throw new Error('INVALID_REQUEST');
      json(res, 200, { data: await handle(path, await body(req)) });
    } catch (error) { if (!res.headersSent) json(res, 400, friendlyError(error)); else res.end(); }
  });
  server.requestTimeout = 300000; server.headersTimeout = 10000; server.maxConnections = 16;
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('PANEL_START_FAILED');
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, token, url: `${origin}/#${token}`, close: async () => { cancel(); server.closeAllConnections(); await new Promise<void>(yes => server.close(() => yes())); } };
}
