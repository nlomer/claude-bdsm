// Adapter: coordinate app preferences and existing consent; every panel preview remains explicit.
import { loadConsent, setConsent, validateConsent, type Consent } from '../features/consent.js';
import { loadPreferences, savePreferences, validatePreferences } from './preferences.adapter.js';
import type { Preferences } from './preferences.types.js';
import { hashText } from '../core/parse.js';
export interface Settings { preferences: Preferences; consent: Consent }
export async function loadSettings(root: string): Promise<Settings> {
  return { preferences: await loadPreferences(root), consent: await loadConsent(root) };
}
export const settingsHash = (settings: Settings): string => hashText(JSON.stringify(settings));
export async function saveSettings(root: string, value: Settings): Promise<Settings> {
  const preferences = validatePreferences(value?.preferences), consent = validateConsent(value?.consent);
  if (!consent.preview) throw new Error('PANEL_REQUIRES_PREVIEW');
  await savePreferences(root, preferences); await setConsent(root, consent);
  return loadSettings(root);
}
