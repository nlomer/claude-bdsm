// Adapter fixture: observe only synthetic skill-expansion metadata and stop before inference.
import { writeFile } from 'node:fs/promises';
let body = '';
for await (const chunk of process.stdin) body += chunk.toString();
const input = JSON.parse(body);
await writeFile(process.argv[2], JSON.stringify({ event: input.hook_event_name, command: input.command_name }));
process.stdout.write(JSON.stringify({ decision: 'block', reason: 'OFFLINE_SKILL_DISCOVERY_PROOF' }));
