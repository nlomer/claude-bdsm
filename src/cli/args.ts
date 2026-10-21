// Service: strict command options prevent silent ignored flags or prompt-bearing positional arguments.
export interface Options { command: string; positional: string[]; flags: Map<string, string | true> }
const booleans = new Set(['--stdin', '--json', '--preview', '--all-benchmark', '--html', '--annotations']);
const valued = new Set(['--tone', '--model', '--mode', '--approve', '--suite', '--backend', '--run', '--claude', '--cwd', '--set', '--decisions', '--target']);
export function parseArgs(args: string[]): Options {
  const command = args[0] ?? 'help', positional: string[] = [], flags = new Map<string, string | true>();
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    if (flags.has(arg)) throw new Error('DUPLICATE_OPTION');
    if (booleans.has(arg)) flags.set(arg, true);
    else if (valued.has(arg) && args[i + 1] && !args[i + 1]!.startsWith('--')) flags.set(arg, args[++i]!);
    else throw new Error('UNKNOWN_OR_INCOMPLETE_OPTION');
  }
  return { command, positional, flags };
}
export const option = (args: Options, name: string, fallback?: string): string | undefined => {
  const value = args.flags.get(name); return typeof value === 'string' ? value : fallback;
};
