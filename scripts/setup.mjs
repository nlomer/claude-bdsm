// Controller: guided source setup; optional skill/model installation always requires a selection.
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { checkNode, npmPath, run } from './process.adapter.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
async function setup() {
  checkNode();
  console.log('\nclaude-bdsm · opening the manners department\n1/3 Installing locked development tools from npm (network required). No model downloads.');
  await run(process.execPath, [await npmPath(), 'ci', '--ignore-scripts'], root);
  console.log('\n2/3 Building the local app. Your CPU has been promoted to chaperone.');
  await run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], root);
  const { appStatus } = await import('../dist/app/status.controller.js');
  const status = await appStatus(root);
  console.log(`\n3/3 ${status.message}\n${status.claudeMessage}`);
  if (process.stdin.isTTY && !process.argv.includes('--yes')) await optionalSetup();
  console.log('\nReady! Run npm start, or double-click Start.cmd on Windows.\nPaste → Preview → Review → Copy or Send. Settings live in the panel.\nNo hooks were installed. No private messages were sent.\n');
}
async function optionalSetup() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ask = text => terminal.question(text);
    if (/^y(?:es)?$/i.test((await ask('Install/update the optional Claude setup skill? [y/N] ')).trim())) {
      const { maintainSkill, skillStatus } = await import('../dist/integrations/skill-maintenance.adapter.js');
      const existing = await skillStatus(root);
      if (existing.installed && !existing.owned) console.log('Existing skill belongs to another location; left untouched. Use the panel without it.');
      else { const result = await maintainSkill(root, existing.installed ? 'update' : 'install'); console.log(result.message ?? 'Skill installed. Restart Claude if needed, then use /claude-bdsm.'); if (result.backup) console.log(`Backup: ${result.backup}`); }
    }
    const choice = (await ask('Optional AI: Enter = no download, 1 = small (~271 MB), 2 = larger (~397 MB). Adds ~24 MB runtime download. Choice: ')).trim();
    if (choice === '1' || choice === '2') {
      const { savePreferences, loadPreferences } = await import('../dist/app/preferences.adapter.js');
      const { installSelected } = await import('../dist/app/install.controller.js');
      await savePreferences(root, { ...await loadPreferences(root), profile: choice === '1' ? 'small' : 'larger' });
      console.log('Downloading only the selected AI. Experimental: you still preview every result.');
      await installSelected(root, true);
    } else if (choice) console.log('No valid model choice selected; no download started. Choose a model later in Settings.');
  } finally { terminal.close(); }
}
setup().catch(error => { console.error(`\nSetup needs attention: ${error.message}\nRerun npm run setup after fixing the issue. No need to reclone.`); process.exitCode = 1; });
