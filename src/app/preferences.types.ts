// Types/constants: friendly application choices are separate from message-rewriting consent.
export const profiles = {
  instant: { label: 'Instant', description: 'No download. No AI. Just a tiny manners department.', model: null, bytes: 0 },
  small: { label: 'Small local AI', description: 'Experimental · about 271 MB + runtime. Preview every result.', model: 'smol-360m-q4km', bytes: 270590880 },
  larger: { label: 'Larger local AI', description: 'Experimental · about 397 MB + runtime. Preview every result.', model: 'qwen3-06b-q4km', bytes: 396705472 }
} as const;
export interface Preferences { version: 1; profile: keyof typeof profiles; project: string; claudePath: string }
export const preferenceDefaults: Preferences = { version: 1, profile: 'instant', project: '', claudePath: '' };
