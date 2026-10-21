// Controller: a visible preview/approval journey; edits invalidate tickets and sends are single-use.
import { api, $, notice } from './api.js';
import { bindSettings } from './settings.js';
import { askConfirmation } from './confirm.js';
let ticket, status, working = false, invalidation = Promise.resolve();
function buttons() {
  const approved = !!ticket?.canApprove && $('approve').checked && !working;
  $('copy').disabled = !approved;
  $('send').disabled = !approved || !status?.claude || !status?.settings.preferences.project;
  $('target').textContent = status?.settings.preferences.project ? `Claude project: ${status.settings.preferences.project}` : 'Choose a project folder in Settings to enable Send. Copy works without a project.';
}
function busy(value, cancellable = false) {
  working = value;
  for (const id of ['preview', 'example', 'message', 'refresh', 'profile', 'tone', 'project', 'claude-path', 'targeted', 'profanity', 'retention', 'install', 'reset']) $(id).disabled = value;
  for (const button of document.querySelectorAll('#settings-form button[type=submit]')) button.disabled = value;
  for (const action of ['install', 'update', 'remove']) $('skill-' + action).disabled = value || (action === 'install' ? !!status?.skill.installed : !status?.skill.owned);
  $('cancel').disabled = !value || !cancellable; buttons();
}
function invalidate() {
  ticket = undefined; $('approve').checked = false; $('approval').hidden = true; $('edited').hidden = true; $('empty').hidden = false;
  $('verdict').textContent = ''; $('awards').textContent = ''; $('technical').textContent = ''; $('response-section').hidden = true;
  buttons(); invalidation = invalidation.then(() => api('cancel')).catch(() => {}); return invalidation;
}
async function preview() {
  if (working) return;
  busy(true, true); const pending = invalidate(); notice('Drafting the peace treaty. Originals stay local.');
  try {
    await pending;
    if (settings.dirty) { await settings.save(); await invalidation; busy(true, true); }
    ticket = await api('preview', { text: $('message').value });
    const result = ticket.result;
    $('empty').hidden = result.output !== undefined; $('edited').hidden = result.output === undefined;
    $('edited').textContent = result.output ?? ''; $('technical').textContent = JSON.stringify(result, null, 2);
    $('approval').hidden = !ticket.canApprove;
    $('verdict').textContent = result.output === undefined ? 'This needs your rewrite. Edit the original and preview again. No fallback was forwarded.' : result.changed ? 'Changes are shown above; your original stays on the left. Read the whole result before approving.' : 'Already civil. Approval still belongs to you.';
    $('awards').textContent = ticket.forcedNeutral ? '' : `Playful spice score: ${ticket.rage}/100${ticket.awards.length ? ' · ' + ticket.awards.join(' · ') : ''}`;
    notice(ticket.canApprove ? 'Preview ready. Read it, then check the approval box.' : 'Manual rewrite needed. Your task deserves better than a guess.', !ticket.canApprove);
  } catch (error) { notice(error.message, true); } finally { busy(false); }
}
$('preview').onclick = preview; $('message').oninput = invalidate; $('approve').onchange = buttons;
$('message').onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void preview(); } };
$('example').onclick = () => { $('message').value = 'You idiot. Fix src/auth.ts; do not change the API.\nRun npm test after the fix.'; invalidate(); $('message').focus(); };
$('cancel').onclick = async () => { ticket = undefined; $('approve').checked = false; buttons(); try { const result = await api('cancel'); notice(result.message); } catch (error) { notice(error.message, true); } };
$('copy').onclick = async () => {
  if (!ticket || working) return; busy(true);
  try {
    const result = await api('copy', { id: ticket.id, approved: $('approve').checked });
    try { await navigator.clipboard.writeText(result.text); notice('Copied. Diplomacy is now your clipboard’s problem.'); }
    catch { const selection = getSelection(); selection.removeAllRanges(); const range = document.createRange(); range.selectNodeContents($('edited')); selection.addRange(range); notice('Clipboard permission unavailable. The approved text is selected—press Ctrl/Cmd+C.'); }
  } catch (error) { notice(error.message, true); } finally { busy(false); }
};
$('send').onclick = async () => {
  if (!ticket || working) return;
  const id = ticket.id; ticket = undefined; busy(true, true); $('approval').hidden = true; notice('Sending the approved text to Claude. This can use your existing account.');
  try {
    const result = await api('send', { id, approved: $('approve').checked });
    $('response-section').hidden = false; $('response').textContent = result.text; $('raw-response').textContent = result.raw;
    notice(result.successful ? 'Claude replied. The task lives to see another day.' : result.text, !result.successful);
  } catch (error) { notice(error.message + ' Preview again before another send attempt.', true); } finally { $('approve').checked = false; busy(false); }
};
$('quit').onclick = async () => {
  if (!await askConfirmation('Stop the local app? A Claude send already started may have reached the provider.')) return;
  try { const result = await api('quit', { confirmed: true }); busy(true); $('cancel').disabled = true; $('quit').disabled = true; notice(result.message); }
  catch (error) { notice(error.message, true); }
};
const settings = bindSettings(invalidate, busy, value => { status = value; busy(working); });
settings.refresh().then(value => { notice(value.message); busy(false); }).catch(error => notice(error.message, true));
