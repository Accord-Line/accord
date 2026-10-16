import { useEffect, useRef } from 'react';
import type { DraftRequirement, Workspace } from '../domain/types';

export function RequirementEditor({ workspace: w, update, save, cancel, disabled }: {
  workspace: Workspace;
  update: (requirement: DraftRequirement) => void;
  save: () => void;
  cancel: () => void;
  disabled: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const editor = w.editor;
  useEffect(() => {
    if (titleRef.current?.value.trim() && !descriptionRef.current?.value.trim()) descriptionRef.current?.focus();
    else titleRef.current?.focus();
  }, [editor?.requirement.id]);
  if (!editor) return null;
  const r = editor.requirement;
  const patch = (fields: Partial<DraftRequirement>) => update({ ...r, ...fields });
  const toggle = (field: 'experienceIds' | 'testIds', id: string, checked: boolean) => patch({ [field]: checked ? [...r[field], id] : r[field].filter((value) => value !== id) });
  const invalid = !r.title.trim() || !r.description.trim() || !r.acceptanceCriteria.length || r.acceptanceCriteria.some((v) => !v.trim());
  return <section className="panel editor-panel" aria-label="需求编辑表单">
    <div className="panel-heading"><h2>{editor.isNew ? '新增需求' : '编辑需求'}</h2><code>{r.id}</code></div>
    <p>表单自动保存在本机。点击“保存到草稿”才加入需求列表；取消新增不会留下占位条目。</p>
    <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      <fieldset disabled={disabled}>
        <label className="field">需求标题<input ref={titleRef} value={r.title} onChange={(e) => patch({ title: e.target.value })} placeholder="用一句话说明用户能做什么" /></label>
        <label className="field">需求描述<textarea ref={descriptionRef} aria-label="需求描述" value={r.description} onChange={(e) => patch({ description: e.target.value })} rows={4} placeholder="描述目标用户、场景和预期行为" /></label>
        <label className="field">条目状态<select value={r.status} onChange={(e) => patch({ status: e.target.value as DraftRequirement['status'] })}><option value="draft">草稿</option><option value="approved">需求已确定</option><option value="deprecated">已归档</option></select></label>
        <StringList label="验收条件" values={r.acceptanceCriteria} onChange={(acceptanceCriteria) => patch({ acceptanceCriteria })} />
        <StringList label="约束" values={r.constraints} onChange={(constraints) => patch({ constraints })} />
        <fieldset className="reference-picker"><legend>关联体验</legend>{w.draft.experiences.length ? w.draft.experiences.map((e) => <label key={e.id}><input type="checkbox" checked={r.experienceIds.includes(e.id)} onChange={(event) => toggle('experienceIds', e.id, event.target.checked)} />{e.title} <code>{e.id}</code></label>) : <p>暂无可关联体验。</p>}</fieldset>
        <fieldset className="reference-picker"><legend>关联测试</legend>{w.draft.tests.length ? w.draft.tests.map((t) => <label key={t.id}><input type="checkbox" checked={r.testIds.includes(t.id)} onChange={(event) => toggle('testIds', t.id, event.target.checked)} />{t.title} <code>{t.id}</code></label>) : <p>暂无可关联测试，可通过结构化提案补充。</p>}<p>移除本需求的测试关联将删除该测试定义；选择其他需求的测试会转移归属。保存前会提示影响。</p></fieldset>
        {invalid && <p className="field-hint">允许保存未完成草稿；批准前必须填写标题、描述和至少一条有效验收条件。</p>}
        <div className="action-row"><button className="primary" type="submit">保存到草稿</button><button type="button" onClick={cancel}>取消编辑</button></div>
      </fieldset>
    </form>
  </section>;
}
function StringList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return <fieldset className="string-list"><legend>{label}</legend>
    {values.map((value, index) => <div className="string-row" key={index}><textarea aria-label={`${label} ${index + 1}`} rows={2} value={value} onChange={(e) => onChange(values.map((v, at) => at === index ? e.target.value : v))} /><button type="button" aria-label={`删除${label} ${index + 1}`} onClick={() => onChange(values.filter((_, at) => at !== index))}>移除</button></div>)}
    <button type="button" onClick={() => onChange([...values, ''])}>＋ 添加{label}</button>
  </fieldset>;
}
