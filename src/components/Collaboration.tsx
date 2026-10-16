import { useEffect, useState } from 'react';
import type { Workspace, Proposal } from '../domain/types';
import type { ByokController } from '../byok/useByok';
import { collaborationMessages } from '../byok/prompt';
import { downloadJSON } from '../domain/portability';
import { ToolDialog } from './ToolDialog';
import { Icon } from './Icon';

export function Collaboration({ byok: b, workspace: w, receive, disabled }: { byok: ByokController; workspace: Workspace; receive: (proposal: Proposal, fingerprint: string) => void; disabled: boolean }) {
  const [instruction, setInstruction] = useState(''), [settingsOpen, setSettingsOpen] = useState(false), [key, setKey] = useState(''), [code, setCode] = useState('');
  const [confirmedContext, setConfirmedContext] = useState(''), [includeExperiences, setIncludeExperiences] = useState(true), [failure, setFailure] = useState('');
  const payload = collaborationMessages(w, instruction, includeExperiences);
  const context = JSON.stringify([payload, b.settings]);
  const confirmed = confirmedContext === context;
  const setConfirmed = (value: boolean) => setConfirmedContext(value ? context : '');
  const characters = payload.reduce((n, m) => n + m.content.length, 0);
  async function submit() {
    setFailure('');
    const fingerprint = JSON.stringify(w.draft);
    let returned = false;
    try { const proposal = await b.generate(w, instruction, includeExperiences); returned = true; receive(proposal, fingerprint); }
    catch (e) { if (returned) setFailure(e instanceof Error ? e.message : '候选无法载入，正文已保留。'); }
  }
  const feedback = <>{b.busy && <><RequestProgress operation={b.activeOperation} />{settingsOpen && <button onClick={b.cancel}>取消请求</button>}</>}{b.note && <p className={`provider-note ${b.lastResult?.status === 'failed' ? 'field-error' : ''}`} role={b.lastResult?.status === 'failed' ? 'alert' : 'status'}>{b.note}</p>}{b.lastResult && <button className="quiet" onClick={() => downloadJSON('byok-validation.json', { ...b.lastResult, scope: '单次请求的脱敏记录；失败不证明服务商未执行或未计费；不代表原项目实现已验证' })}>导出本次调用记录（无 Key）</button>}{failure && <p className="notice error" role="alert">{failure}</p>}</>;
  return <section className="collaboration" aria-label="AI 协作">
    <div className="collaboration-head"><div><span className="spark"><Icon name="spark" /></span><strong>和 AI 一起写清楚</strong></div><button className={`connection-button ${b.connected ? 'connected' : ''}`} onClick={() => setSettingsOpen(true)}><span className="connection-dot" />{b.connected ? '连接设置' : '连接 TokenDance'}<Icon name="arrow" /></button></div>
    {settingsOpen && <ToolDialog label="模型连接" close={() => setSettingsOpen(false)}><div className="panel-heading"><div><span className="section-kicker">BYOK · 带上自己的模型</span><h2>让 AI，参与每一步。</h2></div><button className="icon-button" autoFocus aria-label="关闭连接设置" onClick={() => setSettingsOpen(false)}><Icon name="close" /></button></div><div className="connection-settings">
      <div className="action-row"><button disabled={b.busy} className="primary" onClick={() => void b.authorize()}>授权 TokenDance 钱包</button>{b.connected && <button onClick={b.disconnect}>断开并清除 Key</button>}</div>
      <p>在服务商页面确认 Key 额度与有效期；授权后 Key 仅保留到当前页面刷新。模型费用由你的服务商账户承担。</p>
      {b.authURL && <div className="oauth-fallback"><a href={b.authURL} target="_blank" rel="noopener noreferrer">未弹出窗口？打开授权页</a><label className="field">一次性授权码<input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" /></label><button disabled={!code.trim() || b.busy} onClick={() => { void b.finishCode(code); setCode(''); }}>交换授权码</button></div>}
      <details><summary>已有 Key 或使用其他兼容服务</summary><label className="field">服务商<select value={b.settings.provider} onChange={(e) => b.configure({ provider: e.target.value as 'tokendance' | 'compatible', endpoint: e.target.value === 'tokendance' ? 'https://tokendance.space/gateway/v1' : '' })}><option value="tokendance">TokenDance</option><option value="compatible">自定义兼容服务</option></select></label><label className="field">模型服务地址<input type="url" value={b.settings.endpoint} onChange={(e) => b.configure({ endpoint: e.target.value })} /></label><label className="field">临时 API Key<input aria-label="临时 API Key" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} /></label><button disabled={b.busy || !key.trim()} onClick={() => { b.applyKey(key); setKey(''); }}>仅在本页使用此 Key</button><label className="field">应用归因地址<input value={b.settings.appUrl} onChange={(e) => b.configure({ appUrl: e.target.value })} /></label></details>
      <div className="model-row"><label className="field">模型<input list="model-options" value={b.settings.model} onChange={(e) => b.configure({ model: e.target.value })} placeholder="从目录选择，或填写实际模型 ID" /></label><datalist id="model-options">{b.models.map((m) => <option value={m.id} key={m.id}>{m.protocols.join(', ')}</option>)}</datalist><button disabled={b.busy} onClick={() => void b.loadModels().catch(() => undefined)}>读取模型目录</button><button disabled={b.busy || !b.connected || !b.settings.model} onClick={() => void b.testConnection().catch(() => undefined)}>测试连接（少量计费）</button></div>
      <details><summary>等待时间与超时说明</summary><label className="field">模型等待上限（秒）<input type="number" min={15} max={600} step={1} disabled={b.busy} value={b.settings.timeoutSeconds ?? 180} onChange={(e) => b.configure({ timeoutSeconds: Number(e.target.value) })} /></label><p>模型默认最多等待 180 秒，可随时取消。目录读取上限 20 秒，授权交换 30 秒。超时仅表示客户端停止等待，服务商可能仍在处理或计费；重试前请先核对服务商记录。</p></details>
      <p className="provider-source">首个适配依据 <a href="https://tokendance.space/docs/api-key-oauth" target="_blank" rel="noopener noreferrer">TokenDance PKCE 文档</a>，由浏览器直连，无官方中转。</p>
    </div>{feedback}</ToolDialog>}
    <label className="visually-hidden" htmlFor="ai-intent">告诉 AI 你想修改什么</label><textarea id="ai-intent" className="intent-input" value={instruction} onChange={(e) => { setInstruction(e.target.value); setConfirmed(false); }} placeholder="有个想法？让 AI 帮你补全需求、打磨交互，或改好这一段。" rows={2} />
    <div className="send-context"><details><summary>将发送当前规范与索引 · 约 {characters.toLocaleString()} 字符</summary><p>接收方：{b.settings.endpoint || '尚未设置'} · 模型：{b.settings.model || '尚未选择'}。包含当前 Markdown 正文、需求、产品元信息及白名单协议，不读取其他本地文件。Token 约 {Math.ceil(characters / 3).toLocaleString()}，仅估算。</p><label><input type="checkbox" checked={includeExperiences} onChange={(e) => { setIncludeExperiences(e.target.checked); setConfirmed(false); }} />附带当前交互与测试定义</label><pre className="context-preview">{payload.map((m) => `${m.role}\n${m.content}`).join('\n\n')}</pre></details><label className="send-consent"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />确认发送所示上下文，费用由我承担</label></div>
    <div className="collaboration-actions"><span>{b.connected ? '模型已连接 · 建议由你审阅后生效' : '用自己的模型。也可以直接在下方自由书写。'}</span><div>{b.busy ? <button onClick={b.cancel}>取消请求</button> : <button className="primary" aria-label="生成候选修改 ↑" disabled={disabled || !b.connected || !b.settings.model || !instruction.trim() || !confirmed} onClick={() => void submit()}>一起改一改<Icon name="arrow" /></button>}</div></div>
    {!settingsOpen && feedback}
  </section>;
}
function RequestProgress({ operation }: { operation: string }) {
  const [start] = useState(Date.now), [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  return <p className="provider-note" role="status">{operation} · 已等待 {Math.floor((now - start) / 1000)} 秒。可以取消，不会自动发起下一次请求。</p>;
}
