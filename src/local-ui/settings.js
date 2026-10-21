// Controller: plain-language settings, explicit downloads and owned-skill maintenance selections.
import { api, $, notice } from './api.js';
import { askConfirmation } from './confirm.js';
let current, dirty = false;
const labels = { instant: 'No model. No download. Ready when you are.', small: 'Experimental · 271 MB weights plus ~24 MB runtime download.', larger: 'Experimental · 397 MB weights plus ~24 MB runtime download.' };
export function bindSettings(invalidate, busy, onStatus) {
  function fill(status) {
    current = status; dirty = false;
    const { preferences: p, consent: c } = status.settings;
    $('profile').value = p.profile; $('tone').value = c.personality; $('project').value = p.project; $('claude-path').value = p.claudePath;
    $('targeted').checked = c.targetedInsults; $('profanity').checked = c.profanityCleanup; $('retention').checked = c.retention;
    $('profile-description').textContent = labels[p.profile]; $('readiness').textContent = status.message;
    $('claude-status').textContent = status.claudeMessage;
    $('skill-status').textContent = status.skill.installed ? status.skill.owned ? 'Skill installed from this clone.' : 'An existing skill belongs to another location. It will be left alone.' : 'No skill installed. The local editor works without it.';
    onStatus(status);
  }
  async function refresh() { const status = await api('status'); fill(status); return status; }
  async function save() {
    if (!current) throw new Error('Check status first.');
    const settings = { preferences: { version: 1, profile: $('profile').value, project: $('project').value.trim(), claudePath: $('claude-path').value.trim() },
      consent: { ...current.settings.consent, personality: $('tone').value, targetedInsults: $('targeted').checked, profanityCleanup: $('profanity').checked, retention: $('retention').checked, preview: true } };
    if (settings.consent.retention && !current.settings.consent.retention && !await askConfirmation('Save original and edited private messages locally until you delete diagnostics?')) throw new Error('Diagnostic retention was not enabled.');
    invalidate(); await api('settings', { settings }); return refresh();
  }
  async function perform(work, message) {
    busy(true); try { const result = await work(); if (result !== false) notice(typeof result === 'string' ? result : message); } catch (error) { notice(error.message, true); } finally { busy(false); }
  }
  $('settings-form').addEventListener('input', () => { dirty = true; invalidate(); $('profile-description').textContent = labels[$('profile').value]; notice('Settings changed. They save on your next Preview, or use Save settings now.'); });
  $('settings-form').addEventListener('submit', event => { event.preventDefault(); void perform(save, 'Settings saved. Your future self says thanks.'); });
  $('refresh').onclick = () => perform(async () => { if (dirty && !await askConfirmation('Discard unsaved settings and reload the saved status?')) return false; return refresh(); }, 'Status checked.');
  $('install').onclick = () => perform(async () => {
    if ($('profile').value === 'instant') throw new Error('Instant needs no download. Select an experimental AI first.');
    if (!await askConfirmation(`${labels[$('profile').value]} Download and verify the selected AI only? This may take several minutes.`)) return false;
    await save(); notice('Downloading and verifying the selected AI. Keep the launcher open; interrupted downloads can be retried.');
    await api('install', { confirmed: true }); await refresh();
  }, 'Selected processing option is ready.');
  $('reset').onclick = () => perform(async () => { if (!await askConfirmation('Reset settings to Instant + neutral? Saved diagnostic files are not deleted.')) return false; invalidate(); await api('reset'); await refresh(); }, 'Settings reset.');
  for (const action of ['install', 'update', 'remove']) $('skill-' + action).onclick = () => perform(async () => {
    if (!await askConfirmation(`${action === 'remove' ? 'Disable' : action} the Claude skill? Previous owned files are preserved in a backup; unrelated settings are untouched.`)) return false;
    const result = await api('skill', { action, confirmed: true }); await refresh();
    if (result.backup) return `Previous skill preserved at ${result.backup}`;
  }, 'Skill action finished. Existing files are preserved when updating/removing.');
  return { refresh, save, get dirty() { return dirty; } };
}
