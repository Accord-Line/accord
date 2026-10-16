import { useCallback, useEffect, useRef, useState } from 'react';
import { chat, createPKCE, DEFAULT_APP_URL, exchangeCode, listModels, ProviderError, TOKEN_ORIGIN, unwrapJSON, type Model, type ProviderSettings } from './client';
import { collaborationMessages } from './prompt';
import { validateProposal } from '../domain/validation';
import type { Workspace } from '../domain/types';
type CallRecord = { at: string; kind: string; status: 'real-success' | 'failed'; model: string; serviceOrigin: string; elapsedMs: number; errorCode?: string; recovery?: string };
function publicOrigin(endpoint: string) { try { return new URL(endpoint).origin; } catch { return 'invalid-endpoint'; } }

export function useByok() {
  const [settings, setSettings] = useState<ProviderSettings>({ provider: 'tokendance', endpoint: `${TOKEN_ORIGIN}/gateway/v1`, model: '', appUrl: DEFAULT_APP_URL, timeoutSeconds: 180 });
  const [connected, setConnected] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const [models, setModels] = useState<Model[]>([]), [authURL, setAuthURL] = useState('');
  const [lastResult, setLastResult] = useState<CallRecord | null>(null), [activeOperation, setActiveOperation] = useState('');
  // Credentials and PKCE verifier exist only in this mounted page. Never persist or export them.
  const secret = useRef(''), pending = useRef<{ verifier: string; state: string; at: number } | null>(null);
  const popup = useRef<Window | null>(null), abort = useRef<AbortController | null>(null);
  const applyKey = (key: string) => { secret.current = key.trim(); setConnected(!!key.trim()); setLastResult(null); setNote(key.trim() ? '凭据已设置；尚未验证模型调用。刷新页面会清除。' : '已断开连接。'); };
  const configure = (patch: Partial<ProviderSettings>) => {
    if (abort.current) abort.current.abort();
    setLastResult(null);
    if ((patch.endpoint !== undefined && patch.endpoint !== settings.endpoint) || (patch.provider && patch.provider !== settings.provider)) { secret.current = ''; setConnected(false); setModels([]); }
    setSettings((s) => ({ ...s, ...patch }));
  };
  const operation = async <T,>(kind: string, action: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    if (abort.current) throw new ProviderError('busy', '请等待或取消当前请求。');
    const controller = new AbortController(), started = Date.now(); abort.current = controller; setBusy(true); setActiveOperation(kind); setLastResult(null); setNote(`正在${kind}，不会自动重试…`);
    const metadata = () => ({ at: new Date().toISOString(), kind, model: secret.current ? settings.model.replaceAll(secret.current, '[redacted]') : settings.model, serviceOrigin: publicOrigin(settings.endpoint), elapsedMs: Date.now() - started });
    try {
      const value = await action(controller.signal);
      if (controller.signal.aborted) throw new ProviderError('cancelled', '请求已取消，没有自动重试。');
      setLastResult({ ...metadata(), status: 'real-success' }); return value;
    } catch (e) {
      const raw = e instanceof ProviderError ? e.message : '请求未完成，请检查网络或导出脱敏记录。';
      const message = `${kind}失败：${secret.current ? raw.replaceAll(secret.current, '[凭据已隐藏]') : raw}`;
      const errorCode = e instanceof ProviderError ? e.code : 'unexpected';
      setLastResult({ ...metadata(), status: 'failed', errorCode, recovery: e instanceof ProviderError ? e.recovery : undefined }); setNote(message);
      throw new ProviderError(errorCode, message);
    }
    finally { abort.current = null; setBusy(false); }
  };
  const finishCode = useCallback(async (code: string) => {
    const flow = pending.current;
    if (!flow || Date.now() - flow.at > 10 * 60_000) { setNote('授权流程已过期或页面已刷新，请重新连接。'); return; }
    if (abort.current) { setNote('请先取消当前请求，再交换授权码。'); return; }
    const controller = new AbortController(), started = Date.now(); abort.current = controller; setBusy(true); setActiveOperation('交换授权码'); setLastResult(null); setNote('正在交换授权码（最多 30 秒），尚未确认模型调用…');
    try {
      const key = await exchangeCode(code.trim(), flow.verifier, controller.signal);
      secret.current = key; pending.current = null; setConnected(true); setAuthURL('');
      setSettings((s) => ({ ...s, provider: 'tokendance', endpoint: `${TOKEN_ORIGIN}/gateway/v1` }));
      setNote('TokenDance 授权完成。Key 仅在当前页面内存，下一步选择模型并测试连接。');
    } catch (e) {
      setNote(`交换授权码失败：${e instanceof ProviderError ? e.message : '响应无法读取，请重新授权。'}`);
      setLastResult({ at: new Date().toISOString(), kind: '交换授权码', status: 'failed', model: '', serviceOrigin: TOKEN_ORIGIN, elapsedMs: Date.now() - started, errorCode: e instanceof ProviderError ? e.code : 'unexpected' });
    }
    finally { abort.current = null; setBusy(false); }
  }, []);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (event.origin !== location.origin || event.source !== popup.current || !data || typeof data !== 'object') return;
      if ('type' in data && data.type === 'psw-token-code' && 'state' in data && data.state === pending.current?.state && 'code' in data && typeof data.code === 'string') void finishCode(data.code);
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener); abort.current?.abort();
      if (secret.current || pending.current) { setConnected(false); setAuthURL(''); setLastResult(null); setNote('页面更新已清除内存连接，请重新授权。正文仍保存在本机。'); }
      secret.current = ''; pending.current = null;
    };
  }, [finishCode]);
  const authorize = async () => {
    if (busy) return;
    const authPopup = window.open('about:blank', 'psw-token-authorization', 'popup,width=540,height=760');
    popup.current = authPopup;
    try {
      const app = new URL(settings.appUrl);
      if (app.username || app.password || app.search || app.hash) throw new Error('应用归因地址不能包含凭据或查询参数。');
      const flow = await createPKCE(); pending.current = { verifier: flow.verifier, state: flow.state, at: Date.now() };
      const url = new URL('/auth', TOKEN_ORIGIN);
      url.searchParams.set('app_url', settings.appUrl); url.searchParams.set('key_name', '共识 Accord 产品协作');
      url.searchParams.set('code_challenge', flow.challenge); url.searchParams.set('code_challenge_method', 'S256');
      setAuthURL(url.href); // Headless fallback: no callback, user can paste a one-time code.
      if (authPopup) {
        const callback = new URL(`${import.meta.env.BASE_URL}oauth-callback.html`, location.href);
        callback.searchParams.set('state', flow.state); url.searchParams.set('callback_url', callback.href);
        authPopup.location.href = url.href;
      }
      setNote(authPopup ? '请在 TokenDance 窗口登录并确认额度，完成后自动返回。若未返回，也可粘贴一次性授权码。' : '浏览器阻止了弹窗，请打开下方授权链接，再粘贴一次性授权码。');
    } catch (e) { authPopup?.close(); setNote(e instanceof Error ? e.message : '无法发起授权。'); }
  };
  const loadModels = () => operation('读取模型目录', async (signal) => {
    const result = await listModels(settings, secret.current, signal); setModels(result);
    const choices = result.filter((m) => !m.protocols.length || m.protocols.some((p) => /chat|openai/i.test(p)));
    if (!settings.model && choices[0]) setSettings((s) => ({ ...s, model: choices[0].id }));
    setNote(`已读取 ${result.length} 个模型；请核对所选模型支持 Chat Completions。`);
  });
  const testConnection = () => operation('测试连接', async (signal) => {
    await chat(settings, secret.current, [{ role: 'user', content: 'Only reply OK.' }], signal, true);
    setNote('真实模型调用成功。此次仅发送连接测试短句，未发送 PRD。');
  });
  const generate = (w: Workspace, intent: string, includeExperiences: boolean) => operation('生成候选', async (signal) => {
    const result = await chat(settings, secret.current, collaborationMessages(w, intent, includeExperiences), signal);
    if (secret.current && result.includes(secret.current)) throw new ProviderError('secret', '模型响应包含当前凭据，已拒绝保存，请更换服务并检查 Key。');
    const parsed = unwrapJSON(result), check = validateProposal(parsed);
    if (!check.valid) throw new ProviderError('proposal', '模型返回的候选修改未通过规范检查，没有更改你的正文。请调整要求后手动重试。');
    setNote('真实模型已返回结构合法的候选修改。请在“审阅”中检查，批准前不改已批准版本。');
    return check.value;
  });
  return { settings, configure, connected, busy, note, models, authURL, authorize, finishCode, applyKey, loadModels, testConnection, generate, lastResult, activeOperation,
    disconnect: () => { abort.current?.abort(); secret.current = ''; pending.current = null; setConnected(false); setAuthURL(''); setLastResult(null); setNote('已断开，当前页面中的 Key 和授权状态已清除。'); },
    cancel: () => abort.current?.abort(),
  };
}
export type ByokController = ReturnType<typeof useByok>;
