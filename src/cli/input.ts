// Adapter: bounded stdin and explicit interactive input; original text never enters child argv/env.
import { createInterface } from 'node:readline/promises';
export async function readInput(maxBytes = 131072): Promise<string> {
  if (process.stdin.isTTY) {
    const terminal = createInterface({ input: process.stdin, output: process.stderr });
    try {
      const text = await terminal.question('Message (one turn): ');
      if (Buffer.byteLength(text) > maxBytes) throw new Error('INPUT_LIMIT');
      return text;
    } finally { terminal.close(); }
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > maxBytes) throw new Error('INPUT_LIMIT');
    chunks.push(Buffer.from(chunk));
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
export async function confirm(prompt: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const terminal = createInterface({ input: process.stdin, output: process.stderr });
  try { return (await terminal.question(prompt)).trim().toLowerCase() === 'yes'; }
  finally { terminal.close(); }
}
