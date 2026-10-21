// Service: distinguish actual successful replies from blocked, failed or unknown Claude envelopes.
export function readableResponse(response: { code: number; stdout: string; stderr: string }) {
  let envelope: Record<string, unknown> | undefined;
  try { envelope = JSON.parse(response.stdout); } catch { /* retain unknown output in Advanced only */ }
  const usage = envelope?.usage as Record<string, unknown> | undefined;
  const tokens = Number(usage?.input_tokens ?? 0) + Number(usage?.output_tokens ?? 0);
  const successful = response.code === 0 && envelope?.type === 'result' && envelope.subtype === 'success' && envelope.is_error !== true && typeof envelope.result === 'string' && tokens > 0;
  return { successful, text: successful ? envelope!.result as string : 'Claude did not return a verified successful reply. It may have been blocked, cancelled, or need attention. See technical details.',
    raw: response.stdout, exitCode: response.code };
}
