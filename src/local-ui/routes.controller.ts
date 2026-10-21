// Controller: explicitly route authenticated panel actions to bounded application operations.
import { Application } from '../app/application.controller.js';
import { appStatus } from '../app/status.controller.js';
import { installSelected } from '../app/install.controller.js';
import { maintainSkill } from '../integrations/skill-maintenance.adapter.js';
import { preferenceDefaults } from '../app/preferences.types.js';
import { defaults } from '../features/consent.js';
import { approval, object, text } from './requests.validators.js';
import type { Settings } from '../app/settings.adapter.js';
export async function route(app: Application, path: string, value: unknown): Promise<unknown> {
  const body = object(value);
  if (path === '/api/status') return app.exclusive(() => appStatus(app.root));
  if (path === '/api/settings') return app.settings(object(body.settings) as unknown as Settings);
  if (path === '/api/reset') return app.settings({ preferences: { ...preferenceDefaults }, consent: { ...defaults } });
  if (path === '/api/preview') return app.preview(text(body.text));
  if (path === '/api/cancel') { app.cancel(); return { message: 'Cancellation requested. Startup verification may need a moment to finish.' }; }
  if (path === '/api/copy' || path === '/api/send') {
    const { id, approved } = approval(body);
    return path === '/api/copy' ? app.copy(id, approved) : app.send(id, approved);
  }
  if (path === '/api/install') return app.exclusive(() => installSelected(app.root, body.confirmed === true));
  if (path === '/api/skill') {
    if (body.confirmed !== true || !['install', 'update', 'remove'].includes(String(body.action))) throw new Error('INVALID_REQUEST');
    return app.exclusive(() => maintainSkill(app.root, body.action as 'install' | 'update' | 'remove'));
  }
  throw new Error('UNKNOWN_ACTION');
}
