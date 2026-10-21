// Controller: wire the generic loopback transport to the application; adapters do not import controllers.
import { Application } from '../app/application.controller.js';
import { route } from './routes.controller.js';
import { listenPanel } from './server.adapter.js';
import { object } from './requests.validators.js';
export async function startPanel(root: string, app = new Application(root)) {
  const transport = await listenPanel(root, (path, value) => {
    if (path !== '/api/quit') return route(app, path, value);
    if (object(value).confirmed !== true) throw new Error('INVALID_REQUEST');
    app.cancel(); setTimeout(() => { void transport.close(); }, 100).unref();
    return Promise.resolve({ message: 'App stopped. You can close this tab. A Claude send that already started may have reached the provider.' });
  }, () => app.cancel());
  return { ...transport, app };
}
