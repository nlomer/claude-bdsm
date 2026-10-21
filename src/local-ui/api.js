// Adapter: authenticated same-origin requests; only the launch token is kept in tab storage.
let token = location.hash.slice(1);
if (token) { sessionStorage.setItem('bdsm-launch', token); history.replaceState(null, '', '/'); }
else token = sessionStorage.getItem('bdsm-launch') ?? '';
export async function api(action, body = {}) {
  if (!token) throw new Error('Open the panel using npm start. This tab has no local launch key.');
  const response = await fetch(`/api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), credentials: 'omit' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? 'The local app could not finish. Restart the launcher and try again.');
  return result.data;
}
export const $ = id => document.getElementById(id);
export function notice(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('error', error); }
