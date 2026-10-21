// Service: narrowly bounded neutral replacements; no arbitrary task reconstruction.
import type { Edit } from './types.js';
export const attackWords = /\b(?:idiot|moron|stupid|useless|worthless|incompetent|piece of shit)\b/i;
const isolated = /^you (?:(?:useless|worthless|stupid) )?(?:idiot|moron|piece of shit)[.!](?=\s|$)/i;
export function ruleEdit(text: string): Edit | undefined {
  const match = isolated.exec(text);
  if (!match) return undefined;
  return { start: 0, end: match[0].length, replacement: "I'm frustrated with the previous result." };
}
