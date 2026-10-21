// Adapter fixture: synthetic block/timeout behavior for the installed CLI's local hook dispatcher.
if (process.argv[2] === 'timeout') await new Promise(resolve => setTimeout(resolve, 10000));
process.stdout.write(JSON.stringify({ decision: 'block', reason: 'OFFLINE_HOOK_BLOCK_PROOF' }));
