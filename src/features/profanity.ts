// Service: optional narrow prose cleanup preserves all protected literals through masking.
import { parseProtected } from '../core/parse.js';
import { protect, restore } from '../core/protect.js';
export function cleanup(text: string): string {
  const protection = protect(text, parseProtected(text));
  return restore(protection.masked.replace(/\b(?:fucking|damn)[ \t]+/gi, ''), protection);
}
