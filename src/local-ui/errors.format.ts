// Utils: public recovery guidance never includes raw exceptions or private input bodies.
import { publicErrorCode } from '../cli/error.js';
const messages: Record<string, string> = {
  APP_BUSY: 'One thing at a time, hothead. Wait for the current job, or cancel it.',
  PREVIEW_EXPIRED: 'That preview changed or expired. Preview again before approving.',
  PREVIEW_NOT_APPROVABLE: 'This needs a human rewrite. Edit the input, then preview again.',
  PROJECT_REQUIRED: 'Choose your Claude project folder in Settings before sending.',
  PROJECT_NOT_FOUND: 'That project folder does not exist. Paste an existing absolute folder path.',
  NATIVE_CLAUDE_NOT_FOUND: 'Claude was not found. Copy your text, or set the native Claude executable in Advanced.',
  MODEL_NOT_INSTALLED: 'Install the selected AI in Settings, or switch to Instant for zero downloads.',
  MODEL_INTEGRITY_FAILED: 'The model file failed verification. Use Install selected AI to repair it.',
  RUNTIME_INTEGRITY_FAILED: 'The CPU runtime failed verification. Use Install selected AI to repair it.',
  RUNTIME_BUNDLE_INTEGRITY_FAILED: 'A CPU runtime library failed verification. Use Install selected AI to repair it.',
  RUNTIME_NOT_INSTALLED: 'The CPU runtime is missing. Use Install selected AI, or choose Instant.',
  SKILL_ALREADY_EXISTS: 'A skill already exists. Use Update only if this clone owns it; other installations are left alone.',
  SKILL_NOT_OWNED: 'This skill belongs to another location. Its files have been left alone.',
  INVALID_PREFERENCES: 'Check the settings. Folder and executable paths must be absolute.',
  INVALID_CONSENT: 'Those advanced settings are not valid. Reset settings and try again.',
  RUNTIME_ALREADY_OWNED: 'Another local editor or benchmark owns the AI runtime. Close it and try again.'
};
export function friendlyError(error: unknown) {
  const code = publicErrorCode(error);
  return { code, message: error instanceof Error && error.name === 'AbortError' ? 'Cancelled. A send that already started may have reached Claude; check its result before retrying.' : messages[code] ?? `Could not finish (${code}). Check Settings → status, then try again. Your original was not forwarded as a fallback.` };
}
