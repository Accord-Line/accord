import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import specSchema from '../../schemas/product-spec.schema.json';
import proposalSchema from '../../schemas/ai-proposal.schema.json';
import type { ProductSpec, Proposal, Issue, Validation, DraftSpec } from './types';

// The supplied addTest allOf refines status without repeating type: object.
// Keep the source contract unchanged; only disable AJV's extra schema-style lint.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false, ownProperties: true });
const projectCheck = ajv.compile<ProductSpec>(specSchema);
const proposalCheck = ajv.compile<Proposal>(proposalSchema);
// Drafts are a separate contract; the original approved Schema stays unchanged.
const draftSchema = structuredClone(specSchema);
draftSchema.$id = 'https://example.invalid/psw/schemas/draft-internal.schema.json';
draftSchema.$defs.requirement.properties.title.minLength = 0;
draftSchema.$defs.requirement.properties.description.minLength = 0;
draftSchema.$defs.requirement.properties.acceptanceCriteria.minItems = 0;
draftSchema.$defs.requirement.properties.acceptanceCriteria.items.minLength = 0;
const draftCheck = ajv.compile<DraftSpec>(draftSchema);
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

// Inspect untrusted JSON before validators or assignment; no scripts or expressions run.
export function inspectInput(input: unknown): Issue[] {
  const stack: { value: unknown; path: string; depth: number }[] = [{ value: input, path: '', depth: 0 }];
  const seen = new WeakSet<object>();
  let count = 0;
  while (stack.length) {
    const { value, path, depth } = stack.pop()!;
    if (++count > 100_000 || depth > 80) return [{ path, message: '数据过大或嵌套过深。' }];
    if (value && typeof value === 'object') {
      if (seen.has(value)) return [{ path, message: '不允许循环或共享对象引用，请使用 JSON 文件。' }];
      seen.add(value);
      if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
        return [{ path, message: '仅接受普通 JSON 对象。' }];
      }
      for (const [key, child] of Object.entries(value)) {
        if (forbiddenKeys.has(key)) return [{ path: `${path}/${key}`, message: '禁止的对象键。' }];
        stack.push({ value: child, path: `${path}/${key}`, depth: depth + 1 });
      }
    }
  }
  return [];
}

function schemaIssues(errors: ErrorObject[] | null | undefined): Issue[] {
  return (errors ?? []).map((e) => ({ path: e.instancePath || '/', message: `${e.message ?? e.keyword} ${JSON.stringify(e.params)}` }));
}

export function validateProjectSchema(input: unknown): Validation<ProductSpec> {
  const issues = inspectInput(input);
  if (issues.length) return { valid: false, issues };
  if (!projectCheck(input)) return { valid: false, issues: schemaIssues(projectCheck.errors) };
  return { valid: true, value: input, issues: [] };
}

export function validateProposal(input: unknown): Validation<Proposal> {
  const issues = inspectInput(input);
  if (issues.length) return { valid: false, issues };
  if (!proposalCheck(input)) return { valid: false, issues: schemaIssues(proposalCheck.errors) };
  return { valid: true, value: input, issues: [] };
}

export function validateReferences(spec: DraftSpec, allowIncomplete = false): Issue[] {
  const issues: Issue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const ids = new Set<string>();
  const register = (id: string, path: string) => {
    if (ids.has(id)) add(path, `重复 ID：${id}`);
    ids.add(id);
  };
  const requirements = new Map(spec.requirements.map((r) => [r.id, r]));
  const experiences = new Map(spec.experiences.map((e) => [e.id, e]));
  const tests = new Map(spec.tests.map((t) => [t.id, t]));
  for (const collection of ['requirements', 'experiences', 'tests', 'decisions', 'evidence'] as const) {
    spec[collection].forEach((item, i) => register(item.id, `/${collection}/${i}/id`));
  }
  spec.experiences.forEach((exp, ei) => {
    const path = `/experiences/${ei}`;
    const stateHas = (key: string, p: string) => {
      if (!Object.hasOwn(exp.state, key)) add(p, `不存在的 stateKey：${key}`);
    };
    const components = new Map(exp.components.map((c) => [c.id, c]));
    exp.requirementIds.forEach((id, i) => {
      if (!requirements.has(id)) add(`${path}/requirementIds/${i}`, `不存在的需求：${id}`);
      else if (!requirements.get(id)!.experienceIds.includes(exp.id)) add(`${path}/requirementIds/${i}`, `需求未反向关联体验：${id}`);
    });
    exp.components.forEach((cmp, ci) => {
      const p = `${path}/components/${ci}`;
      register(cmp.id, `${p}/id`);
      if (cmp.stateKey !== null) stateHas(cmp.stateKey, `${p}/stateKey`);
      for (const [property, key] of Object.entries(cmp.bindings ?? {})) {
        if (cmp.type !== 'card' || !['hoverLiftPx', 'durationMs'].includes(property)) add(`${p}/bindings/${property}`, '当前协议不支持此属性绑定。');
        stateHas(key, `${p}/bindings/${property}`);
        const v = exp.state[key];
        const maximum = property === 'hoverLiftPx' ? 24 : 1200;
        if (typeof v !== 'number' || v < 0 || v > maximum) add(`${p}/bindings/${property}`, `绑定值必须为 0–${maximum} 的数值。`);
      }
      if (cmp.props.min !== undefined && cmp.props.max !== undefined && cmp.props.min > cmp.props.max) add(`${p}/props`, 'min 不能大于 max。');
      if (cmp.validation?.minLength !== undefined && cmp.validation?.maxLength !== undefined && cmp.validation.minLength > cmp.validation.maxLength) add(`${p}/validation`, 'minLength 不能大于 maxLength。');
      if (cmp.stateKey !== null && Object.hasOwn(exp.state, cmp.stateKey)) {
        const v = exp.state[cmp.stateKey];
        if (['slider', 'numberInput'].includes(cmp.type)) {
          if (typeof v !== 'number' || (cmp.props.min !== undefined && v < cmp.props.min) || (cmp.props.max !== undefined && v > cmp.props.max)) add(`${p}/stateKey`, '输入初始值类型错误或超出范围。');
        }
        if (['textInput', 'select'].includes(cmp.type) && typeof v !== 'string') add(`${p}/stateKey`, '文字输入需要字符串状态。');
        if (cmp.type === 'switch' && typeof v !== 'boolean') add(`${p}/stateKey`, '开关需要布尔状态。');
        if (cmp.type === 'select' && cmp.props.options && !cmp.props.options.includes(String(v))) add(`${p}/stateKey`, '初始值不在选项列表中。');
      }
    });
    exp.events.forEach((event, index) => {
      const p = `${path}/events/${index}`;
      if (!components.has(event.componentId)) add(`${p}/componentId`, `不存在的场景组件：${event.componentId}`);
      event.actions.forEach((action, ai) => {
        const ap = `${p}/actions/${ai}`;
        if (action.kind === 'setState' || action.kind === 'toggleState') {
          stateHas(action.stateKey, `${ap}/stateKey`);
          const initial = exp.state[action.stateKey];
          if (action.kind === 'toggleState' && typeof initial !== 'boolean') add(ap, 'toggleState 只能切换布尔状态。');
          if (action.kind === 'setState' && initial !== null && typeof initial !== typeof action.value) add(ap, 'setState 值类型与状态声明不一致。');
          if (action.kind === 'setState') exp.components.forEach((component) => {
            const value = action.value;
            if (component.stateKey === action.stateKey && ['slider', 'numberInput'].includes(component.type)) {
              if (typeof value !== 'number' || (component.props.min !== undefined && value < component.props.min) || (component.props.max !== undefined && value > component.props.max)) add(ap, 'setState 值超出输入组件范围。');
            }
            for (const [property, key] of Object.entries(component.bindings ?? {})) {
              if (key !== action.stateKey) continue;
              const maximum = property === 'hoverLiftPx' ? 24 : 1200;
              if (typeof value !== 'number' || value < 0 || value > maximum) add(ap, 'setState 值超出绑定属性范围。');
            }
          });
        }
        if (action.kind === 'validateFields') action.stateKeys.forEach((key) => {
          stateHas(key, `${ap}/stateKeys`);
          if (!exp.components.some((c) => c.stateKey === key && ['textInput', 'numberInput', 'slider', 'select', 'switch'].includes(c.type))) add(ap, `校验目标没有输入组件：${key}`);
        });
      });
    });
  });
  spec.requirements.forEach((req, ri) => {
    const p = `/requirements/${ri}`;
    if (!allowIncomplete) {
      for (const field of ['title', 'description'] as const) if (!req[field].trim()) add(`${p}/${field}`, '内容不能为空白。');
      req.acceptanceCriteria.forEach((value, i) => { if (!value.trim()) add(`${p}/acceptanceCriteria/${i}`, '验收条件不能为空白。'); });
      if (req.title.trim() === '新的产品需求' || req.description.trim() === '请填写具体要求') add(p, '默认引导占位不能作为有效规范。');
    }
    req.experienceIds.forEach((id, i) => {
      if (!experiences.has(id)) add(`${p}/experienceIds/${i}`, `不存在的体验：${id}`);
      else if (!experiences.get(id)!.requirementIds.includes(req.id)) add(`${p}/experienceIds/${i}`, `体验未反向关联需求：${id}`);
    });
    req.testIds.forEach((id, i) => {
      if (!tests.has(id)) add(`${p}/testIds/${i}`, `不存在的测试：${id}`);
      else if (tests.get(id)!.requirementId !== req.id) add(`${p}/testIds/${i}`, `测试所属需求不一致：${id}`);
    });
  });
  spec.tests.forEach((test, i) => {
    if (!requirements.has(test.requirementId)) add(`/tests/${i}/requirementId`, `不存在的需求：${test.requirementId}`);
    else if (!requirements.get(test.requirementId)!.testIds.includes(test.id)) add(`/tests/${i}`, '需求未反向关联此测试。');
    if (test.status === 'external-verified' && !spec.evidence.some((e) => e.relatedId === test.id && e.category === 'external-implementation' && e.status === 'pass')) add(`/tests/${i}/status`, '外部实现验证状态缺少关联证据。');
  });
  spec.evidence.forEach((e, i) => { if (!ids.has(e.relatedId)) add(`/evidence/${i}/relatedId`, `不存在的证据目标：${e.relatedId}`); });
  const revisions = new Set<number>();
  spec.history.forEach((h, i) => {
    if (h.revision > spec.revision || revisions.has(h.revision)) add(`/history/${i}/revision`, '历史版本重复或高于当前版本。');
    revisions.add(h.revision);
  });
  spec.decisions.forEach((d, i) => { if (d.revision > spec.revision) add(`/decisions/${i}/revision`, '决策不能引用未来版本。'); });
  return issues;
}

export function validateProject(input: unknown): Validation<ProductSpec> {
  const schema = validateProjectSchema(input);
  if (!schema.valid) return schema;
  const issues = validateReferences(schema.value);
  return issues.length ? { valid: false, issues } : schema;
}

export function validateDraft(input: unknown): Validation<DraftSpec> {
  const unsafe = inspectInput(input);
  if (unsafe.length) return { valid: false, issues: unsafe };
  if (!draftCheck(input)) return { valid: false, issues: schemaIssues(draftCheck.errors) };
  const issues = validateReferences(input, true);
  return issues.length ? { valid: false, issues } : { valid: true, value: input, issues: [] };
}
