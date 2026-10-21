// Controller: thin application entrypoint; operational errors never print personal input bodies.
import { commands } from './cli/commands.js';
import { parseArgs } from './cli/args.js';
import { errorResult, publicErrorCode } from './cli/error.js';
try { process.exitCode = await commands(process.cwd(), parseArgs(process.argv.slice(2))); }
catch (error) {
  const code = publicErrorCode(error);
  if (process.argv[2] === 'sanitize' && process.argv.includes('--json')) process.stdout.write(JSON.stringify(errorResult(code)) + '\n');
  process.stderr.write(code + '\n'); process.exitCode = 1;
}
