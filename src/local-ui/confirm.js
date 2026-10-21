// View/controller: accessible asynchronous confirmations stay inside the local panel.
import { $ } from './api.js';
let pending = false;
export function askConfirmation(message) {
  if (pending) return Promise.resolve(false);
  pending = true;
  return new Promise(resolve => {
    const dialog = $('confirm-dialog'); $('confirm-message').textContent = message;
    const finish = answer => { dialog.close(); pending = false; dialog.oncancel = null; $('confirm-yes').onclick = null; $('confirm-no').onclick = null; resolve(answer); };
    $('confirm-yes').onclick = () => finish(true); $('confirm-no').onclick = () => finish(false);
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.showModal(); $('confirm-no').focus();
  });
}
