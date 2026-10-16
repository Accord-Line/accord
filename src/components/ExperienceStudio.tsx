import { useState } from 'react';
import type { Component, Experience } from '../domain/types';
import { componentNumber, runEvent, validateFields, type RuntimeState } from '../domain/experience';
import { Icon } from './Icon';

export function ExperienceStudio({ experience: exp, save, disabled }: { experience: Experience; save: (next: Experience) => boolean; disabled: boolean }) {
  const [state, setState] = useState<RuntimeState>({ ...exp.state });
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Component | null>(null), [persisted, setPersisted] = useState('');
  function dispatch(id: string, event: Experience['events'][number]['event'], next = state) {
    const result = runEvent(exp, next, id, event); setState(result.state); setErrors(result.errors); setMessage(result.message);
  }
  function change(c: Component, value: RuntimeState[string]) {
    if (!c.stateKey) return;
    dispatch(c.id, 'change', { ...state, [c.stateKey]: value });
  }
  function input(c: Component) {
    const value = c.stateKey ? state[c.stateKey] : '';
    const common = { id: `preview-${c.id}`, 'aria-label': c.label, disabled: !c.stateKey };
    if (c.type === 'textInput') return <input {...common} value={String(value ?? '')} placeholder={c.props.placeholder} onChange={(e) => change(c, e.target.value)} />;
    if (c.type === 'slider' || c.type === 'numberInput') return <><input {...common} type={c.type === 'slider' ? 'range' : 'number'} min={c.props.min} max={c.props.max} step={c.props.step} value={typeof value === 'number' ? value : ''} onChange={(e) => change(c, e.target.value === '' ? null : Number(e.target.value))} /><output>{String(value ?? '')}</output></>;
    if (c.type === 'select') return <select {...common} value={String(value ?? '')} onChange={(e) => change(c, e.target.value)}>{c.props.options?.map((option) => <option key={option}>{option}</option>)}</select>;
    return <input {...common} type="checkbox" checked={value === true} onChange={(e) => change(c, e.target.checked)} />;
  }
  return <div className={`experience-studio ${selected ? 'has-inspector' : ''}`}><section className="experience-canvas"><div className="section-kicker">可操作预览</div><h2>{exp.title}</h2><p>{exp.description}</p><p className="preview-tip"><Icon name="quill" />组件旁的小笔，可以修改文案和属性。</p><p className="motion-note">已遵循减少动态偏好：保留参数与状态，关闭预览位移动画。</p><div className="runtime-components">
    {exp.components.map((c) => <div className={`runtime-component ${selected?.id === c.id ? 'selected' : ''}`} key={c.id}>
      <button className="component-edit" aria-label={`编辑组件 ${c.label}`} onClick={() => setSelected(structuredClone(c))}><Icon name="quill" /></button>
      {c.type === 'card' ? <div tabIndex={0} role="group" aria-label={c.label} className="runtime-card" data-testid="runtime-card" onMouseEnter={() => dispatch(c.id, 'hoverStart')} onMouseLeave={() => dispatch(c.id, 'hoverEnd')} onFocus={() => dispatch(c.id, 'hoverStart')} onBlur={() => dispatch(c.id, 'hoverEnd')} style={{ transform: c.stateKey && state[c.stateKey] ? `translateY(-${componentNumber(c, state, 'hoverLiftPx')}px)` : 'translateY(0)', transitionDuration: `${componentNumber(c, state, 'durationMs')}ms` }}><span>↗</span><strong>{c.label}</strong><small>{componentNumber(c, state, 'hoverLiftPx')}px · {componentNumber(c, state, 'durationMs')}ms</small></div>
        : c.type === 'text' ? <p>{c.label}{c.stateKey ? ` ${String(state[c.stateKey] ?? '')}` : ''}</p>
        : c.type === 'button' ? <button className="primary" onClick={() => dispatch(c.id, 'click')}>{c.label}</button>
        : c.type === 'statusMessage' ? <div role="status" className="runtime-status">{c.label}：{c.stateKey ? String(state[c.stateKey] ?? '') : message || '等待操作'}</div>
        : <label className="runtime-field" htmlFor={`preview-${c.id}`}><span>{c.label}</span>{input(c)}</label>}
      {errors[c.id] && <p role="alert" className="field-error">{errors[c.id]}</p>}
    </div>)}
    {exp.components.some((c) => c.type === 'slider' && c.stateKey === 'lift_px') && !exp.components.some((c) => c.type === 'card') && <div className="recipe-visual" style={{ transform: `translateY(-${Math.max(0, Math.min(24, Number(state.lift_px) || 0))}px)`, transitionDuration: `${Math.max(0, Math.min(1200, Number(state.duration_ms) || 0))}ms` }} data-testid="recipe-visual"><span>✧</span><strong>{String(state.recipeName || '你的配方预览')}</strong><small>{String(state.lift_px)}px · {String(state.duration_ms)}ms · 受控抬升演示</small></div>}
    </div>{message && <p className="runtime-message" role="status">{message}</p>}<div className="action-row"><button disabled={disabled} onClick={() => { const invalid = validateFields(exp, state, exp.components.filter((c) => c.stateKey).map((c) => c.stateKey!)); setErrors(invalid); if (Object.keys(invalid).length) { setMessage('当前输入尚未通过校验，未写入草稿。'); return; } if (!save({ ...exp, state: { ...state } })) return; setPersisted('当前参数已写入草稿，可在审阅中比较并批准。'); }}>将当前参数写入草稿</button><button onClick={() => { setState({ ...exp.state }); setErrors({}); setMessage(''); setPersisted(''); }}>重置预览</button></div>{persisted && <p role="status">{persisted}</p>}</section>
    <aside className="component-inspector"><div className="section-kicker">交互编辑</div>{selected ? <ComponentEditor key={selected.id} component={selected} exp={exp} disabled={disabled} cancel={() => setSelected(null)} apply={(next) => { if (save({ ...exp, components: exp.components.map((c) => c.id === next.id ? next : c) })) setSelected(next); }} /> : <><h3>直接操作预览</h3><p>点击组件旁的铅笔，可以修改文案、属性、状态绑定与输入规则。参数会影响真实视觉，写入草稿后进入审阅。</p><p>事件动作通过角落“项目数据”工具编辑；支持设置状态、切换、提示和校验，不执行脚本。</p></>}</aside>
  </div>;
}
function ComponentEditor({ component, exp, disabled, cancel, apply }: { component: Component; exp: Experience; disabled: boolean; cancel: () => void; apply: (next: Component) => void }) {
  const [form, setForm] = useState<Component>(component);
  return <form key={component.id} onSubmit={(e) => { e.preventDefault(); apply(form); }}><h3>编辑「{component.label}」</h3><label className="field">显示文案<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label><label className="field">组件形式<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Component['type'] })}>{['text','card','button','textInput','numberInput','select','slider','switch','statusMessage'].map((type) => <option key={type}>{type}</option>)}</select></label><label className="field">绑定的状态<select value={form.stateKey ?? ''} onChange={(e) => setForm({ ...form, stateKey: e.target.value || null })}><option value="">不绑定</option>{Object.keys(exp.state).map((key) => <option key={key}>{key}</option>)}</select></label>
    {['slider','numberInput'].includes(form.type) && (['min','max','step'] as const).map((property) => <label className="field" key={property}>{({ min: '最小值', max: '最大值', step: '步长' })[property]}<input type="number" value={form.props[property] ?? ''} onChange={(e) => { const props = { ...form.props }; if (e.target.value === '') delete props[property]; else props[property] = Number(e.target.value); setForm({ ...form, props }); }} /></label>)}
    {form.type === 'textInput' && <><label className="field">输入提示<input value={form.props.placeholder ?? ''} onChange={(e) => setForm({ ...form, props: { ...form.props, placeholder: e.target.value } })} /></label><label className="check-line"><input type="checkbox" checked={!!form.validation?.required} onChange={(e) => setForm({ ...form, validation: { ...form.validation, required: e.target.checked } })} />必填</label><label className="field">最少字符数<input type="number" min={0} value={form.validation?.minLength ?? 0} onChange={(e) => setForm({ ...form, validation: { ...form.validation, minLength: Number(e.target.value) } })} /></label></>}
    {form.type === 'select' && <label className="field">选项（每行一个）<textarea aria-label="选项（每行一个）" value={form.props.options?.join('\n') ?? ''} onChange={(e) => setForm({ ...form, props: { ...form.props, options: e.target.value.split('\n') } })} /></label>}
    {form.type === 'card' && (['hoverLiftPx','durationMs'] as const).map((property) => <div key={property}><label className="field">{property === 'hoverLiftPx' ? '抬升距离' : '动画时长'}<input type="number" min={0} max={property === 'hoverLiftPx' ? 24 : 1200} value={form.props[property] ?? 0} onChange={(e) => setForm({ ...form, props: { ...form.props, [property]: Number(e.target.value) } })} /></label><label className="field">从状态同步<select value={form.bindings?.[property] ?? ''} onChange={(e) => { const bindings = { ...form.bindings }; if (e.target.value) bindings[property] = e.target.value; else delete bindings[property]; setForm({ ...form, bindings }); }}><option value="">使用固定值</option>{Object.entries(exp.state).filter(([, value]) => typeof value === 'number').map(([key]) => <option key={key}>{key}</option>)}</select></label></div>)}
    <div className="action-row"><button type="submit" disabled={disabled} className="primary">更新组件</button><button type="button" onClick={cancel}>完成</button></div></form>;
}
