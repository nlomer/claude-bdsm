// Adapter: authenticated loopback JSON/SSE requests with caller deadlines and response limits.
export class LocalHttp {
  constructor(readonly base: string, private readonly key: string) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('NON_LOOPBACK_ENDPOINT');
  }
  async response(path: string, body: unknown, signal: AbortSignal): Promise<Response> {
    const response = await fetch(this.base + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal, redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`LOCAL_HTTP_${response.status}`); }
    return response;
  }
  async json<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
    const response = await this.response(path, body, signal);
    let text = '';
    const decoder = new TextDecoder();
    for await (const chunk of response.body!) {
      text += decoder.decode(chunk, { stream: true });
      if (text.length > 1048576) { await response.body?.cancel().catch(() => {}); throw new Error('RESPONSE_LIMIT'); }
    }
    return JSON.parse(text + decoder.decode()) as T;
  }
}
