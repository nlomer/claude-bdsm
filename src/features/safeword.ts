// Service: intercept the local command before any downstream or model invocation.
export function safeWord(input: string): { text: string; forcedNeutral: boolean } {
  const match = /^\/safeword(?:[ \t]*\r?\n|[ \t]+|$)/.exec(input);
  return match ? { text: input.slice(match[0].length), forcedNeutral: true } : { text: input, forcedNeutral: false };
}
