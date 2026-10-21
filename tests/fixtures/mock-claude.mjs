// Adapter fixture: record only the synthetic stdin envelope used by offline integration tests.
let text = '';
for await (const chunk of process.stdin) text += chunk.toString();
if (process.argv.includes('--wait')) await new Promise(resolve => setTimeout(resolve, 30000));
process.stdout.write(JSON.stringify({ text, argv: process.argv.slice(2), cwd: process.cwd(),
  textInEnvironment: Object.values(process.env).some(value => value?.includes(text)) }));
