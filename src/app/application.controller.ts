// Controller: serialize work, bind approval to the current settings/output, and consume sends once.
import { randomUUID } from 'node:crypto';
import { hashText } from '../core/parse.js';
import { canSubmit } from '../integrations/approval.js';
import { submit } from '../integrations/claude-wrapper.js';
import { locateClaude } from '../integrations/locate-claude.js';
import { readableResponse } from '../integrations/claude-response.format.js';
import { loadSettings, saveSettings, settingsHash, type Settings } from './settings.adapter.js';
import { previewMessage } from './preview.controller.js';
type Item = Awaited<ReturnType<typeof previewMessage>>;
interface Ticket { id: string; item: Item; fingerprint: string; expires: number }
export interface ApplicationDeps { preview: typeof previewMessage; submit: typeof submit; locate: typeof locateClaude }
export class Application {
  private ticket: Ticket | undefined;
  private operation: AbortController | undefined;
  constructor(readonly root: string, private deps: ApplicationDeps = { preview: previewMessage, submit, locate: locateClaude }) {}
  get busy() { return !!this.operation; }
  cancel() { this.ticket = undefined; this.operation?.abort(); }
  async exclusive<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.operation) throw new Error('APP_BUSY');
    const operation = new AbortController(); this.operation = operation;
    try { return await work(operation.signal); } finally { this.operation = undefined; }
  }
  async settings(value?: Settings) {
    if (!value) return loadSettings(this.root);
    return this.exclusive(async () => { this.ticket = undefined; return saveSettings(this.root, value); });
  }
  async preview(text: string) {
    return this.exclusive(async signal => {
      this.ticket = undefined;
      const settings = await loadSettings(this.root);
      const item = await this.deps.preview(this.root, text, settings, signal); signal.throwIfAborted();
      const ticket = { id: randomUUID(), item, fingerprint: settingsHash(settings), expires: Date.now() + 300000 };
      this.ticket = ticket;
      return { id: ticket.id, result: item.result, rage: item.rage, awards: item.awards, forcedNeutral: item.forcedNeutral,
        canApprove: item.result.output !== undefined && canSubmit(item.result, hashText(item.result.output)), project: settings.preferences.project };
    });
  }
  private async approved(id: string, approved: boolean) {
    const ticket = this.ticket, settings = await loadSettings(this.root);
    if (!approved || !ticket || ticket !== this.ticket || ticket.id !== id || ticket.expires < Date.now() || ticket.fingerprint !== settingsHash(settings)) throw new Error('PREVIEW_EXPIRED');
    const hash = hashText(ticket.item.result.output ?? '');
    if (!canSubmit(ticket.item.result, hash)) throw new Error('PREVIEW_NOT_APPROVABLE');
    return { ticket, settings, hash };
  }
  async copy(id: string, approved: boolean) {
    return this.exclusive(async () => ({ text: (await this.approved(id, approved)).ticket.item.result.output! }));
  }
  async send(id: string, approved: boolean) {
    return this.exclusive(async signal => {
      const { ticket, settings, hash } = await this.approved(id, approved);
      if (!settings.preferences.project) throw new Error('PROJECT_REQUIRED');
      this.ticket = undefined;
      const response = await this.deps.submit(ticket.item.result, { approvedHash: hash,
        executable: await this.deps.locate(settings.preferences.claudePath || undefined), cwd: settings.preferences.project, signal });
      return readableResponse(response);
    });
  }
}
