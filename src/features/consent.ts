// Adapter: explicit local consent settings, validated conservatively without storing prompts.
import { resolve } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
import type { Tone } from '../core/types.js';
export interface Consent {
  targetedInsults: boolean; profanityCleanup: boolean; personality: Tone;
  preview: boolean; retention: boolean; uncertain: 'review';
}
export const defaults: Consent = { targetedInsults: true, profanityCleanup: false, personality: 'neutral', preview: true, retention: false, uncertain: 'review' };
export function validateConsent(value: unknown): Consent {
  if (!value || typeof value !== 'object') throw new Error('INVALID_CONSENT');
  const config = { ...defaults, ...value } as Consent;
  if (!['neutral', 'hr', 'victorian'].includes(config.personality) || config.uncertain !== 'review' ||
      ['targetedInsults', 'profanityCleanup', 'preview', 'retention'].some(key => typeof config[key as keyof Consent] !== 'boolean') ||
      Object.keys(config).some(key => !Object.hasOwn(defaults, key))) throw new Error('INVALID_CONSENT');
  return config;
}
export async function loadConsent(root: string): Promise<Consent> {
  try { return validateConsent(await json(resolve(root, '.local/config.json'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...defaults }; throw error; }
}
export async function setConsent(root: string, value: unknown): Promise<void> {
  await saveJson(resolve(root, '.local/config.json'), validateConsent(value));
}
