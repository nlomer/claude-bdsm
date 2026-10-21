// Utils: escape untrusted report content and terminal control sequences at display boundaries.
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const safeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const terminalText = (value: string): string => value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g,
  char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
