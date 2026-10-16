import { useEffect, useRef, useState } from 'react';
import { MarkdownText } from './components/MarkdownText';
import { BRAND } from './brand';
import baseline from '../examples/intentkit/project.spec.json';
import specSchema from '../schemas/product-spec.schema.json';
import proposalSchema from '../schemas/ai-proposal.schema.json';
import { validateProject } from './domain/validation';
import { approveDraft, approveProposal, assertWorkspace, createWorkspace, editDraft, isDirty, rejectChanges, rollback, saveRequirement, stageProposal, undoDraft } from './domain/workspace';
import { downloadBlob, downloadJSON, exportWorkspaceZip, importWorkspaceFile, newProject, parseProposalJSON } from './domain/portability';
import { documentMarkdown, editMarkdown, setDocumentText, DOCUMENT_TAG } from './domain/document';
import { exportHandoff } from './domain/handoff';
import { readRawStored } from './domain/storage';
import { useWorkspace } from './useWorkspace';
import { useByok } from './byok/useByok';
import { ToolDialog } from './components/ToolDialog';
import { Collaboration } from './components/Collaboration';
import { Icon } from './components/Icon';
import { Atmosphere, useDecorativeMotion } from './components/Atmosphere';
import { ExperienceStudio } from './components/ExperienceStudio';
import { HistoryPanel, ReviewPanel, ValidationRows } from './components/WorkspacePanels';
import type { Proposal, Workspace } from './domain/types';

const fixture = validateProject(baseline);
if (!fixture.valid) throw new Error('Bundled fixture is invalid');
const initial = createWorkspace(fixture.value);
const sections = [['document', '规范', 'quill'], ['experience', '体验', 'play'], ['review', '审阅', 'review'], ['history', '历史', 'history']] as const;
const headings = { document: [BRAND.slogan, BRAND.description], experience: ['让纸上的想法，动起来。', '亲手试一试。把满意的交互写回同一份规范。'], review: ['看清变化，再向前一步。', '核对这一轮修改。由你决定，哪些想法成为新的共识。'], history: ['走过的每一步，都算数。', '回看决定的来处，也可以从旧版本重新出发。'] };
type Section = typeof sections[number][0];
const statuses = { loading: '读取中', pending: '待保存', saving: '保存中', saved: '已保存到本机', error: '保存失败', conflict: '冲突 · 已停止写入' };
export function App() {
  const c = useWorkspace(initial), b = useByok(), motion = useDecorativeMotion();
  const { workspace: w, ready, busy, status, storageError } = c;
  const [section, setSection] = useState<Section>('document'), [tool, setTool] = useState<'code' | 'data' | 'schema' | null>(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [section]);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [preview, setPreview] = useState(false);
  const [includeDraft, setIncludeDraft] = useState(false), [title, setTitle] = useState(''), [config, setConfig] = useState('');
  const file = useRef<HTMLInputElement>(null), proposalFile = useRef<HTMLInputElement>(null);
  const blocked = busy || !ready || c.isBlocked, dirty = isDirty(w), markdown = documentMarkdown(w.draft);
  function run(action: () => void) { setError(''); setMessage(''); try { action(); return true; } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); return false; } }
  async function task(action: () => Promise<void>) { setError(''); setMessage(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); } }
  function mutate(transform: (current: Workspace) => Workspace) { return run(() => c.update(transform)); }
  async function replace(next: Workspace) {
    if (!window.confirm('将替换当前工作空间和草稿。请先导出备份，是否继续？')) return;
    await c.transact(() => next); setSection('document'); setTool(null); setMessage('工作空间已载入。');
  }
  function receive(proposal: Proposal, fingerprint?: string) {
    if (c.isBlocked) throw new Error('本机存储不可写，请先处理保存问题。');
    if (w.proposal && !window.confirm('替换现有未批准提案？')) return;
    c.update((current) => ({ ...current, proposal, proposalBase: fingerprint })); setSection('review'); setTool(null);
  }
  async function backup(zip: boolean) { assertWorkspace(w); if (zip) downloadBlob('PSW-BACKUP.zip', await exportWorkspaceZip(w)); else downloadJSON('PSW-BACKUP.workspace.json', w); }
  return <div className="app-shell" data-motion={motion.allowed ? 'on' : 'off'}>
    <Atmosphere enabled={motion.allowed} />
    <aside className="sidebar"><a className="brand" href="#main"><span className="brand-symbol"><Icon name="quill" /></span><span>共识<span className="brand-caption">Accord</span></span></a><div className="project-label"><span className="section-kicker">手边的项目</span>{w.draft.project.title}<small>已批准 r{w.approved.revision}</small></div><nav aria-label="主导航">{sections.map(([id, label, icon]) => <button key={id} aria-label={label} aria-current={id === section ? 'page' : undefined} className={id === section ? 'active' : ''} onClick={() => setSection(id)}><Icon name={icon} />{label}{id === 'review' && (dirty || w.proposal) && <i aria-label="有待审变更" />}</button>)}</nav><div className="sidebar-foot"><span className="local-dot">想法留在本机</span><p>慢慢写，认真试。<br />记得导出一份备份。</p><span className="hand-note">a little more clarity.</span></div></aside>
    <div className="workspace"><header className="topbar"><span className="breadcrumb"><b>{BRAND.name}</b><span>/</span>{sections.find(([id]) => id === section)?.[1]}</span><div className="topbar-tools"><span data-testid="save-status" role="status">{statuses[status]}</span><span className="revision-badge" data-testid="approved-revision">r{w.approved.revision}</span><button className="icon-button motion-toggle" disabled={motion.reduced} title={motion.reduced ? '已遵循系统减少动态效果偏好' : motion.allowed ? '暂停装饰动效' : '开启装饰动效'} aria-label={motion.allowed ? '暂停装饰动效' : '开启装饰动效'} aria-pressed={motion.allowed} onClick={motion.toggle}><Icon name={motion.allowed ? 'rain' : 'pause'} /></button><span className="tool-separator" />{([['code','code','代码交接'],['data','archive','项目数据'],['schema','braces','JSON 规范']] as const).map(([id, icon, label]) => <button className="icon-button" key={id} title={label} aria-label={label} onClick={() => { setTool(id); if (id === 'data') setConfig(JSON.stringify(w.draft.experiences, null, 2)); }}><Icon name={icon} /></button>)}</div></header>
    <main id="main"><div className="page-heading"><div><span className="eyebrow">ACCORD · 一份规范，从想法到迭代</span><h1>{section === 'document' ? <><span className="headline-phrase">{BRAND.slogan.split('，')[0]}，</span><wbr /><span className="headline-phrase">{BRAND.slogan.split('，')[1]}</span></> : headings[section][0]}</h1><p>{headings[section][1]}</p></div><div className="margin-sketch" aria-hidden="true"><Icon name={section === 'document' ? 'quill' : section === 'experience' ? 'play' : section === 'review' ? 'review' : 'history'} /><span>make room<br />for good ideas.</span></div></div>
    {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}
    {storageError && <section className="notice error" role="alert"><strong>{statuses[status]}</strong><p>{storageError}</p><div className="action-row"><button onClick={() => void task(() => backup(false))}>导出本页完整备份</button><button disabled={busy} onClick={() => { if (window.confirm('载入最新版本会替换本页未保存内容，请先备份。继续？')) void c.reload(); }}>载入最新版本</button><button onClick={() => void c.flush()}>重试保存</button><button onClick={() => void task(async () => downloadJSON('psw-damaged-record.json', await readRawStored()))}>导出原始存储记录</button><button onClick={() => { if (window.confirm('原记录会保留副本，恢复示例？')) void c.recover(initial); }}>保留副本并恢复示例</button></div></section>}
    <Collaboration byok={b} workspace={w} disabled={blocked} receive={receive} />
    {!ready ? <p>正在读取本机规范…</p> : <>
    {section === 'document' && <section className="document-panel"><div className="document-toolbar"><div><h2>产品手记</h2><span>自由书写 · Markdown</span></div><div className="action-row"><button className="icon-button" title="撤销" aria-label="撤销" disabled={blocked || !w.undo.length} onClick={() => mutate((x) => undoDraft(x))}><Icon name="undo" /></button><button className="icon-button" title="重做" aria-label="重做" disabled={blocked || !w.redo.length} onClick={() => mutate((x) => undoDraft(x, true))}><Icon name="redo" /></button><button aria-pressed={preview} onClick={() => setPreview(!preview)}><Icon name={preview ? 'quill' : 'read'} />{preview ? '返回编辑' : '阅读预览'}</button></div></div>
    {w.editor && <div className="notice">检测到旧版未完成的需求表单，完整内容仍在备份中。<button onClick={() => mutate((x) => { const next = saveRequirement(x); next.draft.unstructuredNotes = next.draft.unstructuredNotes.filter((n) => !n.startsWith(DOCUMENT_TAG)); return next; })}>合并旧表单到正文</button><button onClick={() => mutate((x) => ({ ...x, editor: null }))}>放弃旧表单</button></div>}
    <details className="writing-guide"><summary>需要一点写作提示？</summary><p>可以直接粘贴或自由编写 Markdown。若希望同步需求索引，使用「## 产品目标」「## 需求与验收」「### 需求标题」「#### 验收标准」和列表；其他段落、表格与代码块也会完整保存。</p><p>正文是完整原文；结构化索引用于 AI 关联体验和测试。删除需求段落会同步解除其关联，可撤销并在批准前审阅。</p></details>
    <div className="document-split single">{!preview ? <div className="editor-column"><label className="section-kicker" htmlFor="prd-markdown">从这里开始写</label><textarea id="prd-markdown" aria-label="规范正文" className="markdown-editor" value={markdown} disabled={blocked || !!w.editor} spellCheck={false} onChange={(e) => mutate((x) => editDraft(x, (d) => setDocumentText(d, e.target.value)))} onBlur={(e) => mutate((x) => editMarkdown(x, e.target.value))} /></div> : <article className="markdown-preview"><div className="section-kicker">阅读预览</div><MarkdownText>{markdown}</MarkdownText></article>}</div><div className="document-foot"><span>{markdown.length.toLocaleString()} 字符 · {w.draft.requirements.length} 条需求</span><span>{dirty ? '草稿 · 等待审阅' : '已与批准版本对齐'}</span></div></section>}
    {section === 'experience' && <div className="stack"><div className="section-intro"><h2>让规范动起来</h2><p>调整参数后操作预览，确认满意再写入草稿。预览使用受控组件，不执行生成代码。</p></div>{w.draft.experiences.map((exp) => <ExperienceStudio key={exp.id} experience={exp} disabled={blocked} save={(next) => mutate((x) => editDraft(x, (d) => { d.experiences = d.experiences.map((e) => e.id === next.id ? next : e); }))} />)}{!w.draft.experiences.length && <section className="panel">在上方描述你想验证的交互，让 AI 提出一个体验场景；也可在“项目数据”导入声明式配置。</section>}</div>}
    {section === 'review' && <ReviewPanel w={w} disabled={blocked} revise={() => { if (mutate(stageProposal)) { setSection('document'); setMessage('候选已转入可编辑工作草稿；尚未批准，继续修改后再审阅。'); } }} edit={() => setSection('document')} approve={(summary) => void task(async () => { await c.transact((x) => x.proposal ? approveProposal(x, summary) : approveDraft(x, summary)); setMessage('已批准并保存为新版本。'); })} reject={() => void task(async () => { if (!window.confirm(w.proposal ? '拒绝候选提案？手动草稿会保留。' : '放弃本轮未批准草稿？')) return; await c.transact((x) => rejectChanges(x, !!x.proposal)); })} />}
    {section === 'history' && <HistoryPanel w={w} disabled={blocked} rollback={(revision) => void task(async () => { if (!window.confirm(`将 r${revision} 恢复为新版本？`)) return; await c.transact((x) => rollback(x, revision)); })} />}
    </>}<footer><span><a href={BRAND.website} target="_blank" rel="noopener noreferrer">共识 Accord 官网</a> · <a href={BRAND.repository} target="_blank" rel="noopener noreferrer">开源代码</a></span><span>规范获批不代表实现已验证。草稿保存在当前浏览器 · 刷新会清除模型 Key</span></footer></main></div>
    <input ref={file} type="file" hidden accept=".json,.zip,.md" aria-label="导入规范文件" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void task(async () => { if (f.size > 8 * 1024 * 1024) throw new Error('文件超过 8 MiB'); await replace(await importWorkspaceFile(f.name, new Uint8Array(await f.arrayBuffer()))); }); }} />
    <input ref={proposalFile} type="file" hidden accept=".json" aria-label="导入候选提案文件" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void task(async () => { if (f.size > 8 * 1024 * 1024) throw new Error('文件超过 8 MiB'); receive(parseProposalJSON(await f.text())); }); }} />
    {tool && <ToolDialog label={tool === 'code' ? '代码交接' : tool === 'data' ? '项目数据' : 'JSON 规范'} close={() => setTool(null)}>{error && <p className="notice error" role="alert">{error}</p>}<div className="panel-heading"><h2>{tool === 'code' ? '交给 Codex 继续实现' : tool === 'data' ? '项目数据' : '机器协议'}</h2><button autoFocus aria-label="关闭工具" onClick={() => setTool(null)}>×</button></div>
    {tool === 'code' && <><p>交接包默认只包含批准 r{w.approved.revision}，附有 Markdown、结构化规范、变更历史、验证状态和 Agent 工作约定。</p><label className="check-line"><input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />另附未批准草稿（明确放入 drafts/）</label><button className="primary" onClick={() => void task(async () => { downloadBlob(`PSW-HANDOFF-${w.approved.project.id}-r${w.approved.revision}.zip`, await exportHandoff(w, includeDraft)); setMessage('交接包已生成。打开 CODEX_TASK.md 后再进入真实目标仓库。'); })}>导出 Codex 交接包</button><p>不会自动修改、推送或部署目标仓库。请让 Codex 先阅读交接包，核实真实文件并给出实施计划。</p></>}
    {tool === 'data' && <div className="stack"><section><h3>备份与打开</h3><div className="action-row"><button onClick={() => void task(() => backup(true))}>导出完整 ZIP 备份</button><button onClick={() => void task(() => backup(false))}>导出完整 JSON 备份</button><button disabled={blocked} onClick={() => file.current?.click()}>导入 JSON / ZIP / Markdown</button><button onClick={() => downloadBlob('requirements.md', new Blob([documentMarkdown(w.approved)], { type: 'text/markdown' }))}>导出已批准 Markdown</button><button disabled={blocked} onClick={() => proposalFile.current?.click()}>导入候选提案</button></div></section><section><h3>新建项目</h3><label className="field">项目名称<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><div className="action-row"><button disabled={blocked || !title.trim()} onClick={() => void task(() => replace(newProject(title)))}>创建并打开</button><button disabled={blocked} onClick={() => void task(() => replace(createWorkspace(initial.approved)))}>打开 IntentKit 示例</button></div></section><details><summary>交互配置（白名单 JSON）</summary><p>完整编辑组件、状态、绑定、事件、动作与输入规则。提交后经过结构和引用校验，错误时保留原草稿。</p><textarea className="config-editor" aria-label="交互配置" value={config} onChange={(e) => setConfig(e.target.value)} /><button disabled={blocked} onClick={() => mutate((x) => editDraft(x, (d) => { d.experiences = JSON.parse(config); }))}>校验并写入交互草稿</button></details><ValidationRows w={w} /><details><summary>已批准规范数据</summary><pre aria-label="当前规范 JSON">{JSON.stringify(w.approved, null, 2)}</pre></details><details><summary>工作草稿数据</summary><pre aria-label="草稿 JSON">{JSON.stringify(w.draft, null, 2)}</pre></details></div>}
    {tool === 'schema' && <><p>这些协议用于 AI 和开发工具读取；日常写作直接使用规范正文。</p><details><summary>Product Spec Schema v0.1</summary><pre>{JSON.stringify(specSchema, null, 2)}</pre></details><details><summary>AI Proposal Schema v0.2（兼容 v0.1）</summary><pre>{JSON.stringify(proposalSchema, null, 2)}</pre></details></>}
    </ToolDialog>}
  </div>;
}
