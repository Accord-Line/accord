import type { Component, Experience } from './types';
export type RuntimeState = Experience['state'];
export interface RuntimeResult { state: RuntimeState; errors: Record<string, string>; message: string }
export function validateFields(exp: Experience, state: RuntimeState, keys: string[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const c of exp.components.filter((c) => c.stateKey !== null && keys.includes(c.stateKey))) {
    const value = state[c.stateKey!], text = value == null ? '' : String(value);
    if (c.validation?.required && (!text.trim() || (c.type === 'switch' && value === false))) errors[c.id] = `请填写${c.label}`;
    else if (c.validation?.minLength !== undefined && text.length < c.validation.minLength) errors[c.id] = `至少填写 ${c.validation.minLength} 个字符`;
    else if (c.validation?.maxLength !== undefined && text.length > c.validation.maxLength) errors[c.id] = `最多填写 ${c.validation.maxLength} 个字符`;
    else if (['numberInput', 'slider'].includes(c.type) && (typeof value !== 'number' || !Number.isFinite(value) || (c.props.min !== undefined && value < c.props.min) || (c.props.max !== undefined && value > c.props.max))) errors[c.id] = `请输入 ${c.props.min ?? '不限'} 到 ${c.props.max ?? '不限'} 范围内的数值`;
    else if (c.type === 'select' && c.props.options && !c.props.options.includes(text)) errors[c.id] = '请选择有效选项';
  }
  return errors;
}
export function runEvent(exp: Experience, original: RuntimeState, componentId: string, event: Experience['events'][number]['event']): RuntimeResult {
  const state = { ...original }; let message = '';
  for (const rule of exp.events.filter((r) => r.componentId === componentId && r.event === event)) {
    for (const action of rule.actions) {
      switch (action.kind) {
        case 'validateFields': { const errors = validateFields(exp, state, action.stateKeys); if (Object.keys(errors).length) return { state: original, errors, message: '请先修正输入，再继续预览。' }; break; }
        case 'setState': state[action.stateKey] = action.value; break;
        case 'toggleState': state[action.stateKey] = !state[action.stateKey]; break;
        case 'showMessage': message = action.message; break;
      }
    }
  }
  return { state, errors: {}, message };
}
export function componentNumber(c: Component, state: RuntimeState, property: 'hoverLiftPx' | 'durationMs'): number {
  const key = c.bindings?.[property], value = key ? state[key] : c.props[property];
  const max = property === 'hoverLiftPx' ? 24 : 1200;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
}
