// Service: narrow JSON request shapes prevent arbitrary command or filesystem endpoints.
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_REQUEST');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 131072): string {
  if (typeof value !== 'string' || Buffer.byteLength(value) > max) throw new Error('INVALID_REQUEST');
  return value;
}
export function approval(body: Record<string, unknown>) {
  return { id: text(body.id, 80), approved: body.approved === true };
}
