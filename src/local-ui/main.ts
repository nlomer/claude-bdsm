// Controller: launch the loopback panel and release it on terminal shutdown.
import { spawn } from 'node:child_process';
import { startPanel } from './panel.controller.js';
const panel = await startPanel(process.cwd());
process.stdout.write(`\nclaude-bdsm · your local manners department\n${panel.url}\nKeep this terminal open. Ctrl+C stops the app.\n`);
if (!process.argv.includes('--no-open')) {
  const program = process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', panel.url] : [panel.url];
  const browser = spawn(program, args, { windowsHide: true, shell: false, stdio: 'ignore' });
  browser.on('error', () => { process.stderr.write('Browser did not open automatically. Open the local URL shown above.\n'); });
}
let stopping = false;
const stop = () => { if (!stopping) { stopping = true; void panel.close(); } };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
