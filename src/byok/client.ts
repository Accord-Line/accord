export const TOKEN_ORIGIN = 'https://tokendance.space';
export const DEFAULT_APP_URL = 'https://accord-line.github.io/';
export type Model = { id: string; protocols: string[] };
export type ProviderSettings = { provider: 'tokendance' | 'compatible'; endpoint: string; model: string; appUrl: string; timeoutSeconds?: number };
export class ProviderError extends Error {
  constructor(public code: string, message: string, public recovery?: string) { super(message); this.name = 'ProviderError'; }
}
export function endpointURL(endpoint: string, path: string): string {
  let url: URL;
  try { url = new URL(endpoint.replace(/\/+$/, '') + '/' + path); } catch { throw new ProviderError('endpoint', '模型地址不是有效 URL。'); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new ProviderError('endpoint', '请使用不带凭据和查询参数的 HTTPS 地址；本机调试可用 HTTP。');
  return url.href;
}
export async function readLimited(response: Response, limit = 2 * 1024 * 1024): Promise<string> {
  if (!response.body) throw new ProviderError('empty', '服务没有返回内容。');
  const reader = response.body.getReader(), decoder = new TextDecoder(); let text = '', bytes = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > limit) { await reader.cancel(); throw new ProviderError('oversize', '模型返回内容过大，未应用任何修改。'); } text += decoder.decode(value, { stream: true }); } }
  catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Error && e.name === 'TimeoutError') throw new ProviderError('timeout', '读取响应超时，没有自动重试；请先核对服务商记录。');
    if (e instanceof Error && e.name === 'AbortError') throw new ProviderError('interrupted', '响应读取被中断，可能已取消或超时；没有自动重试。');
    throw new ProviderError('network', '响应传输中断，未应用修改；请检查网络并核对服务商记录。');
  } finally { reader.releaseLock(); }
  return text + decoder.decode();
}
async function request(url: string, init: RequestInit, signal?: AbortSignal, timeoutMs = 180_000): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { ...init, signal: combined, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      const recoveryHeader = response.headers.get('TokenDance-Recovery-Action');
      const recovery = recoveryHeader && ['top_up_balance', 'reauthorize_api_key', 'api_key_quota'].includes(recoveryHeader) ? recoveryHeader : undefined;
      const messages: Record<number, string> = { 400: '服务拒绝请求参数，请核对模型与协议。', 401: '凭据无效或已过期，请重新授权。', 402: '账户余额或额度不足。', 403: '授权码或模型权限无效，请重新授权。', 429: '请求频率或额度已达到限制，请稍后手动重试。' };
      throw new ProviderError(`http-${response.status}`, messages[response.status] ?? `模型服务返回 HTTP ${response.status}，没有自动重试。`, recovery);
    }
    return response;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (signal?.aborted) throw new ProviderError('cancelled', '请求已取消，没有自动重试。');
    if (timeout.aborted) throw new ProviderError('timeout', `等待超过 ${timeoutMs / 1000} 秒，客户端已取消，没有自动重试。服务商可能仍在处理，请先核对服务商记录再决定是否重试。`);
    throw new ProviderError('network', '网络、TLS 或跨域策略阻止了请求。请检查地址和网络，并确认服务允许浏览器直连。');
  }
}
export async function listModels(settings: ProviderSettings, key = '', signal?: AbortSignal): Promise<Model[]> {
  const response = await request(endpointURL(settings.endpoint, 'models'), { headers: settings.provider !== 'tokendance' && key ? { Authorization: `Bearer ${key}` } : {} }, signal, 20_000);
  let body: unknown;
  try { body = JSON.parse(await readLimited(response)); } catch (e) { if (e instanceof ProviderError) throw e; throw new ProviderError('format', '模型目录不是有效 JSON。'); }
  const rows = body && typeof body === 'object' && 'data' in body ? body.data : null;
  if (!Array.isArray(rows)) throw new ProviderError('format', '模型目录格式不受支持。');
  return rows.filter((r) => r && typeof r.id === 'string').map((r) => ({ id: r.id, protocols: Array.isArray(r.supported_protocols) ? r.supported_protocols.filter((p: unknown) => typeof p === 'string') : [] }));
}
export async function chat(settings: ProviderSettings, key: string, messages: { role: 'system' | 'user'; content: string }[], signal?: AbortSignal, connectionTest = false): Promise<string> {
  if (!key.trim()) throw new ProviderError('key', '请先连接 TokenDance 或在页面输入自己的 Key。');
  if (!settings.model.trim()) throw new ProviderError('model', '请先选择或填写模型。');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (settings.provider === 'tokendance') headers['X-App-URL'] = settings.appUrl;
  const wait = settings.timeoutSeconds ?? 180;
  if (!Number.isInteger(wait) || wait < 15 || wait > 600) throw new ProviderError('timeout-setting', '模型等待上限需为 15–600 秒的整数。');
  const response = await request(endpointURL(settings.endpoint, 'chat/completions'), { method: 'POST', headers, body: JSON.stringify({ model: settings.model, messages, stream: false, max_tokens: connectionTest ? 32 : 10000 }) }, signal, wait * 1000);
  let body: unknown;
  try { body = JSON.parse(await readLimited(response)); } catch (e) { if (e instanceof ProviderError) throw e; throw new ProviderError('format', '服务返回的不是 JSON，未应用任何修改。'); }
  if (!body || typeof body !== 'object' || !('choices' in body) || !Array.isArray(body.choices)) throw new ProviderError('format', '模型返回结构与 Chat Completions 不匹配。');
  const content: unknown = body.choices[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new ProviderError('empty-content', '服务已返回响应，但没有可见文本。推理模型可能耗尽输出预算或内容被截断；这不代表完整生成已验证，请核对所选模型与服务商记录。');
  return content;
}
export function unwrapJSON(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/, '$1').trim();
  try { return JSON.parse(clean); } catch { throw new ProviderError('format', '模型没有返回有效提案 JSON，原规范保持不变。请调整要求后手动重试。'); }
}
export async function createPKCE(): Promise<{ verifier: string; challenge: string; state: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const verifier = encode(bytes), digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: encode(new Uint8Array(digest)), state: crypto.randomUUID() };
}
export async function exchangeCode(code: string, verifier: string, signal?: AbortSignal): Promise<string> {
  const response = await request(`${TOKEN_ORIGIN}/portal/api/v1/auth/keys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }) }, signal, 30_000);
  let body: unknown;
  try { body = JSON.parse(await readLimited(response, 64 * 1024)); } catch { throw new ProviderError('format', '授权交换响应无效，请重新授权。'); }
  if (!body || typeof body !== 'object' || !('key' in body) || typeof body.key !== 'string' || !body.key) throw new ProviderError('format', '授权响应缺少 Key，请重新授权。');
  return body.key;
}
