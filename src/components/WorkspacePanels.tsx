import { useState } from 'react';
import sampleProposal from '../../examples/intentkit/custom-recipe.proposal.json';
import type { Workspace } from '../domain/types';
import { computeDiff, isDirty } from '../domain/workspace';
import { simulateApply } from '../domain/proposal';
import { validateProject, validateReferences } from '../domain/validation';
import { documentMarkdown } from '../domain/document';
import { MarkdownText } from './MarkdownText';
import { readingDiff } from '../domain/readingDiff';

export function ReviewPanel({ w, disabled, approve, reject, edit, revise }: {
  w: Workspace; disabled: boolean; approve: (summary: string) => void; reject: () => void; edit: () => void; revise: () => void;
}) {
  const [summary, setSummary] = useState('');
  const dirty = isDirty(w), checked = validateProject(w.draft);
  const stale = w.proposalBase !== undefined && w.proposalBase !== JSON.stringify(w.draft);
  const candidate = w.proposal ? simulateApply(w.proposalBase ? w.draft : w.approved, w.proposal) : null;
  const target = w.proposal && candidate?.valid ? candidate.value : w.draft;
  const diff = computeDiff(w.approved, target);
  const reading = readingDiff(documentMarkdown(w.approved), documentMarkdown(target));
  const groups = reading.reduce<{ kind: 'same' | 'add' | 'remove'; lines: string[] }[]>((all, line) => { const last = all.at(-1); if (last?.kind === line.kind) last.lines.push(line.text); else all.push({ kind: line.kind, lines: [line.text] }); return all; }, []);
  const canApprove = !disabled && !w.editor && !stale && (w.proposal ? !!candidate?.valid && (!dirty || !!w.proposalBase) : dirty && checked.valid);
  return <section className="panel review-panel"><div className="panel-heading"><h2>{w.proposal ? '候选提案 · 等你过目' : '这一轮，改了什么'}</h2><span className="pill">当前已批准 r{w.approved.revision}</span></div>
    {w.proposal && <><p className="proposal-summary">{w.proposal.summary}</p><details className="proposal-reason"><summary>修改缘由与注意事项{w.proposal.risks.length ? ` · ${w.proposal.risks.length} 项` : ''}</summary><p>{w.proposal.rationale}</p><ul>{w.proposal.risks.map((risk, i) => <li key={i}>{risk}</li>)}</ul><small>提案编号：{w.proposal.proposalId}</small></details></>}
    {w.editor && <p className="field-hint">仍有未完成表单，请返回需求规范保存或取消。</p>}
    {w.proposal && dirty && !w.proposalBase && <p className="field-hint">存在手动草稿，请先处理草稿再批准导入提案。</p>}
    {stale && <p className="notice error" role="alert">生成期间正文发生变更。候选已过期，请保留正文并重新生成。</p>}
    {candidate && !candidate.valid && <div className="notice error" role="alert">{candidate.issues.map((i) => `${i.path} ${i.message}`).slice(0, 8).join('；')}</div>}
    {!w.proposal && !checked.valid && <div className="notice error" role="alert">草稿暂不能批准：{checked.issues.map((i) => `${i.path} ${i.message}`).slice(0, 8).join('；')}<button onClick={edit}>返回需求修改</button></div>}
    <div className="review-summary"><span>{reading.filter((l) => l.kind === 'add').length} 行新增</span><span>{reading.filter((l) => l.kind === 'remove').length} 行移除</span><span>{diff.length} 处数据变化</span></div>
    <div className="reading-changes" aria-label="正文变化">{groups.length ? groups.map((group, i) => group.kind === 'same' && group.lines.length > 6 ? <details className="unchanged-context" key={i}><summary>{group.lines.length} 行未变的上下文</summary><pre>{group.lines.join('\n')}</pre></details> : <article className={`reading-block reading-${group.kind}`} key={i}><span className="change-marker">{group.kind === 'add' ? '＋ 新增' : group.kind === 'remove' ? '－ 移除' : '上下文'}</span><div className="markdown-preview"><MarkdownText>{group.lines.join('\n')}</MarkdownText></div></article>) : <p className="section-note">{diff.length ? '正文保持原样，交互与数据的调整见下方。' : '还没有新的修改。写下想法，或去体验页试一试。'}</p>}</div>
    <ul className="human-changes">{target.experiences.flatMap((exp) => {
      const before = w.approved.experiences.find((e) => e.id === exp.id);
      if (!before) return <li key={exp.id}>新增交互「{exp.title}」：{exp.description}</li>;
      return Object.entries(exp.state).filter(([key, value]) => JSON.stringify(before.state[key]) !== JSON.stringify(value)).map(([key, value]) => <li key={`${exp.id}-${key}`}>「{exp.title}」{exp.components.find((c) => c.stateKey === key)?.label || key}：{String(before.state[key] ?? '未设置')} → {String(value ?? '空')}</li>);
    })}</ul>
    <details className="full-comparison"><summary>需要更多上下文？展开完整前后对照</summary><div className="review-reading"><article className="markdown-preview"><div className="section-kicker">修改前 · 已批准</div><MarkdownText>{documentMarkdown(w.approved)}</MarkdownText></article><article className="markdown-preview"><div className="section-kicker">修改后 · 待批准</div><MarkdownText>{documentMarkdown(target)}</MarkdownText></article></div></details>
    <details><summary>交互与测试定义 · {target.experiences.length} 个交互 / {target.tests.length} 项测试</summary><ul>{target.experiences.map((exp) => <li key={exp.id}>{exp.title}</li>)}</ul><ul>{target.tests.map((t) => <li key={t.id}>{t.title} · {({ 'not-run': '尚未运行', passed: '已通过', failed: '未通过' } as Record<string, string>)[t.status] || t.status}</li>)}</ul></details>
    <details><summary>开发者数据差异</summary><DiffList entries={w.proposal && !candidate?.valid ? [] : diff} /></details>
    <label className="field">审批说明<input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="描述为什么接受这一轮变更" /></label>
    <p>明确批准后创建 r{w.approved.revision + 1}；规范获批不代表代码实现或测试完成。</p>
    <div className="action-row"><button className="primary" disabled={!canApprove || !summary.trim()} onClick={() => approve(summary)}>批准并创建 r{w.approved.revision + 1}</button>{w.proposal && <button disabled={!canApprove} onClick={revise}>继续编辑候选</button>}<button disabled={disabled || (!dirty && !w.editor && !w.proposal)} onClick={reject}>{w.proposal ? '拒绝提案' : '放弃本轮草稿'}</button></div>
  </section>;
}

export function HistoryPanel({ w, disabled, rollback }: { w: Workspace; disabled: boolean; rollback: (revision: number) => void }) {
  const [comparison, setComparison] = useState<number | null>(null);
  return <div className="stack"><section className="panel"><h2>批准版本快照</h2><p>回退会复制历史内容形成新 revision，保留此前历史。当前 r{w.approved.revision}。</p>
    {[...w.snapshots].reverse().map((snapshot) => <div className="history-row" key={snapshot.revision}><div><strong>r{snapshot.revision}</strong><p>{snapshot.history.at(-1)?.summary}</p><small>{snapshot.requirements.length} 条需求 · {snapshot.experiences.length} 个体验</small></div><div className="action-row"><button onClick={() => setComparison(snapshot.revision)}>与当前比较 r{snapshot.revision}</button><button disabled={disabled || snapshot.revision === w.approved.revision || isDirty(w) || !!w.editor || !!w.proposal} onClick={() => rollback(snapshot.revision)}>回退至 r{snapshot.revision}</button></div></div>)}
    {comparison !== null && <><h3>r{comparison} → 当前 r{w.approved.revision}</h3><DiffList entries={computeDiff(w.snapshots.find((s) => s.revision === comparison), w.approved)} /></>}
  </section><section className="panel"><h2>审阅记录</h2>{!w.reviews.length && <p>尚无人工审阅记录。</p>}{[...w.reviews].reverse().map((r) => <div className="history-row" key={r.id}><div><strong>{r.summary}</strong><p>{new Date(r.at).toLocaleString()} · {r.source} · r{r.revision}</p></div></div>)}</section></div>;
}

export function AiPanel({ disabled, loadProposal, chooseFile }: { disabled: boolean; loadProposal: (text: string) => void; chooseFile: () => void }) {
  const [text, setText] = useState('');
  return <div className="stack"><section className="panel byok-panel"><div className="panel-heading"><h2>BYOK · 使用自己的模型</h2><span className="pill">M3 · 尚未接入</span></div><p>当前 M1 已接通手动需求编辑和审批。Provider、Endpoint、模型、仅内存 Key、发送上下文预览和真实请求将在 M3 实现。</p><p>当前没有模型请求，也没有 Key 输入。下方可导入外部 Agent 生成的结构化提案；固定样例明确标记，不冒充真实模型结果。</p><div className="phase-track"><span className="done">M1 编辑与审批</span><span>M2 交互编辑</span><span>M3 真实 BYOK</span><span>M4 Codex 交接</span></div></section><section className="panel"><h2>导入候选提案</h2><p>先校验 Proposal Schema，再在 Diff 页检查引用和 baseRevision；批准前不改 approved。</p><label className="field">提案 JSON<textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder="粘贴包含 proposalId、baseRevision、operations 的 JSON" /></label><div className="action-row"><button className="primary" disabled={disabled || !text.trim()} onClick={() => loadProposal(text)}>校验并审阅提案</button><button disabled={disabled} onClick={chooseFile}>导入提案 JSON 文件</button><button disabled={disabled} onClick={() => loadProposal(JSON.stringify(sampleProposal))}>载入固定样例（非模型）</button></div></section></div>;
}

export function FilesPanel({ disabled, backup, markdown, chooseFile, create, example }: {
  disabled: boolean; backup: (zip: boolean) => void; markdown: () => void; chooseFile: () => void; create: (title: string) => void; example: () => void;
}) {
  const [creating, setCreating] = useState(false), [title, setTitle] = useState('');
  return <div className="stack"><section className="panel"><h2>导出与恢复</h2><p>浏览器清理可能删除本地数据。完整备份包含草稿、正在编辑的表单、未批准提案、撤销栈与批准快照；普通规范导出只含 approved。</p><div className="action-row"><button className="primary" onClick={() => backup(true)}>导出完整 ZIP 备份</button><button onClick={() => backup(false)}>导出完整 JSON 备份</button><button onClick={markdown}>导出已批准 Markdown</button><button disabled={disabled} onClick={chooseFile}>导入 JSON / ZIP / Markdown</button></div><p className="fine-print">文件上限 8 MiB；受控 ZIP 最多 32 项，声明解压总量不超过 16 MiB，文本流实际读取上限 8 MiB。未知条目明确拒绝。M1 备份不是 M4 Codex 交接包。</p></section><section className="panel"><h2>新建或打开示例</h2><p>当前版本保存一个活动项目。更换前请导出完整备份，界面会要求确认。</p><div className="action-row"><button disabled={disabled} onClick={() => setCreating(true)}>新建项目</button><button disabled={disabled} onClick={example}>打开 IntentKit 示例</button></div>{creating && <form className="new-project-form" onSubmit={(e) => { e.preventDefault(); create(title); }}><label className="field">新项目名称<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></label><div className="action-row"><button className="primary" disabled={disabled || !title.trim()}>创建项目</button><button type="button" onClick={() => setCreating(false)}>取消新建</button></div></form>}</section></div>;
}

export function ValidationRows({ w }: { w: Workspace }) {
  const approved = validateProject(w.approved), references = validateReferences(w.draft, true);
  return <div className="validation-rows"><div><span>已批准数据结构 <small>SCHEMA</small></span><span className="check">{approved.valid ? '✓ 通过' : '× 未通过'}</span></div><div><span>草稿对象引用 <small>REFERENCES</small></span><span className="check">{!references.length ? '✓ 通过' : '× 未通过'}</span></div><div><span>本地交互场景</span><span className="pending">未在本页面验证</span></div><div><span>外部实现</span><span className="pending">实现未验证</span></div></div>;
}
export function DiffList({ entries }: { entries: ReturnType<typeof computeDiff> }) {
  if (!entries.length) return <p className="section-note">没有可显示的有效差异。</p>;
  return <div className="diff-list">{entries.map((entry, i) => <article className={`diff-entry diff-${entry.kind}`} key={`${entry.path}-${i}`}><div><span className="pill">{entry.kind === 'add' ? '新增' : entry.kind === 'remove' ? '删除' : '修改'}</span><code>{entry.path}</code></div><div className="diff-values">{entry.before !== undefined && <pre aria-label={`修改前 ${entry.path}`}>{typeof entry.before === 'string' ? entry.before : JSON.stringify(entry.before, null, 2)}</pre>}{entry.after !== undefined && <pre aria-label={`修改后 ${entry.path}`}>{typeof entry.after === 'string' ? entry.after : JSON.stringify(entry.after, null, 2)}</pre>}</div></article>)}</div>;
}
