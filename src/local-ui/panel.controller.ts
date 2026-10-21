// Controller: wire the generic loopback transport to the application; adapters do not import controllers.
import { Application } from '../app/application.controller.js';
import { route } from './routes.controller.js';
import { listenPanel } from './server.adapter.js';
export async function startPanel(root: string, app = new Application(root)) {
  return { ...await listenPanel(root, (path, value) => route(app, path, value), () => app.cancel()), app };
}
