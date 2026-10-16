import type { DraftSpec, DraftRequirement, Workspace, ProductSpec, ReviewRecord } from './types';
import { validateDraft, validateProject, validateProposal, inspectInput } from './validation';
import { simulateApply } from './proposal';

export function createWorkspace(spec: ProductSpec): Workspace {
  const checked = validateProject(spec);
  if (!checked.valid) throw new Error('项目规范校验失败。');
  return { format: 'psw-workspace', formatVersion: 1, nextRequirementNumber: 101, approved: structuredClone(spec), draft: structuredClone(spec), baseRevision: spec.revision, snapshots: [structuredClone(spec)], undo: [], redo: [], editor: null, proposal: null, reviews: [] };
}

export function assertWorkspace(input: unknown): asserts input is Workspace {
  if (inspectInput(input).length || !input || typeof input !== 'object') throw new Error('工作空间格式不安全。');
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 8 * 1024 * 1024) throw new Error('工作空间超过 8 MiB 上限，请先备份并减少历史或内容。');
  const w = input as Record<string, unknown>;
  const keys = ['format', 'formatVersion', 'approved', 'draft', 'baseRevision', 'snapshots', 'undo', 'redo', 'editor', 'proposal', 'reviews'];
  if (Object.keys(w).some((k) => !keys.includes(k) && !['nextRequirementNumber', 'proposalBase'].includes(k)) || keys.some((k) => !Object.hasOwn(w, k)) || w.format !== 'psw-workspace' || w.formatVersion !== 1) throw new Error('不支持的工作空间格式或版本。');
  if (w.proposalBase !== undefined && typeof w.proposalBase !== 'string') throw new Error('提案工作草稿版本格式无效。');
  if (w.nextRequirementNumber !== undefined && (!Number.isSafeInteger(w.nextRequirementNumber) || Number(w.nextRequirementNumber) < 101)) throw new Error('需求 ID 分配计数无效。');
  const approved = validateProject(w.approved);
  const draft = validateDraft(w.draft);
  if (!approved.valid || !draft.valid) throw new Error('工作空间规范损坏或引用无效。');
  if (w.baseRevision !== approved.value.revision || draft.value.revision !== w.baseRevision || draft.value.project.id !== approved.value.project.id) throw new Error('草稿与批准版本不一致。');
  for (const field of ['snapshots', 'undo', 'redo'] as const) {
    const list = w[field];
    if (!Array.isArray(list) || list.length > (field === 'snapshots' ? 500 : 100)) throw new Error('版本列表格式错误或超出上限。');
    const revisions = new Set<number>();
    for (const item of list) {
      const checked = field === 'snapshots' ? validateProject(item) : validateDraft(item);
      if (!checked.valid || checked.value.project.id !== approved.value.project.id) throw new Error('版本内容或项目引用无效。');
      if (field === 'snapshots') {
        if (checked.value.revision > approved.value.revision || revisions.has(checked.value.revision)) throw new Error('快照版本重复或引用未来版本。');
        revisions.add(checked.value.revision);
      } else if (checked.value.revision !== w.baseRevision) throw new Error('撤销记录基础版本不符。');
    }
  }
  const snapshots = w.snapshots as ProductSpec[];
  if (!snapshots.some((s) => JSON.stringify(s) === JSON.stringify(approved.value))) throw new Error('缺少当前批准版本快照。');
  if (w.editor !== null) {
    const e = w.editor as Record<string, unknown>;
    if (!e || typeof e !== 'object' || typeof e.isNew !== 'boolean' || Object.keys(e).some((k) => !['isNew', 'requirement'].includes(k))) throw new Error('编辑表单格式错误。');
    const r = e.requirement as DraftRequirement;
    const checkSpec = structuredClone(draft.value);
    if (!r || typeof r !== 'object') throw new Error('编辑表单内容无效。');
    const current = checkSpec.requirements.findIndex((item) => item.id === r.id);
    if ((e.isNew && current >= 0) || (!e.isNew && current < 0)) throw new Error('编辑表单 ID 冲突。');
    // Validate form shape separately; partially selected references are reconciled on Save.
    const form = { ...structuredClone(r), experienceIds: [], testIds: [] };
    const isolated = { ...checkSpec, requirements: [form], experiences: [], tests: [], evidence: [] };
    if (!validateDraft(isolated).valid) throw new Error('编辑表单字段格式无效。');
    if (!Array.isArray(r.experienceIds) || !r.experienceIds.every((id) => typeof id === 'string' && checkSpec.experiences.some((x) => x.id === id)) || !Array.isArray(r.testIds) || !r.testIds.every((id) => typeof id === 'string' && checkSpec.tests.some((x) => x.id === id))) throw new Error('表单关联目标不存在。');
  }
  if (w.proposal !== null && !validateProposal(w.proposal).valid) throw new Error('候选提案格式错误。');
  if (!Array.isArray(w.reviews) || w.reviews.length > 2000) throw new Error('审阅记录格式错误。');
  for (const r of w.reviews as ReviewRecord[]) {
    if (!r || typeof r !== 'object' || Object.keys(r).some((k) => !['id', 'at', 'source', 'summary', 'revision'].includes(k)) || typeof r.id !== 'string' || typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at)) || !['manual', 'ai-approved', 'rollback', 'rejected'].includes(r.source) || typeof r.summary !== 'string' || !Number.isInteger(r.revision) || r.revision < 1 || r.revision > approved.value.revision) throw new Error('审阅记录字段错误。');
  }
}

export function isDirty(w: Workspace): boolean { return JSON.stringify(w.draft) !== JSON.stringify(w.approved); }
export function nextRequirementId(spec: DraftSpec, reserved: string[] = [], minimum = 101): string {
  const ids = new Set([...reserved, ...[...spec.requirements, ...spec.experiences, ...spec.tests, ...spec.evidence, ...spec.decisions, ...spec.experiences.flatMap((e) => e.components)].map((r) => r.id)]);
  const numbers = [...ids].map((id) => /^REQ-(\d+)$/.exec(id)?.[1]).filter((value) => value !== undefined).map(Number).filter(Number.isSafeInteger);
  let n = Math.max(minimum, 101, ...numbers.map((v) => v + 1));
  while (ids.has(`REQ-${n}`)) n++;
  if (!Number.isSafeInteger(n + 1)) throw new Error('需求 ID 计数超出范围。');
  return `REQ-${n}`;
}
export function beginRequirement(w: Workspace, id?: string): Workspace {
  if (w.editor) throw new Error('请先保存或取消当前表单。');
  const existing = id ? w.draft.requirements.find((r) => r.id === id) : null;
  if (id && !existing) throw new Error('需求不存在。');
  const reserved = [...w.snapshots, ...w.undo, ...w.redo].flatMap((s) => s.requirements.map((r) => r.id));
  const requirement: DraftRequirement = existing ? structuredClone(existing) : { id: nextRequirementId(w.draft, reserved, w.nextRequirementNumber ?? 101), title: '', description: '', status: 'draft', constraints: [], acceptanceCriteria: [''], experienceIds: [], testIds: [] };
  return { ...w, nextRequirementNumber: existing ? w.nextRequirementNumber : Number(requirement.id.slice(4)) + 1, editor: { requirement, isNew: !id } };
}
export function editDraft(w: Workspace, transform: (spec: DraftSpec) => void): Workspace {
  const draft = structuredClone(w.draft);
  transform(draft);
  const checked = validateDraft(draft);
  if (!checked.valid) throw new Error(checked.issues.map((i) => `${i.path} ${i.message}`).slice(0, 5).join('；'));
  if (JSON.stringify(draft) === JSON.stringify(w.draft)) return w;
  return { ...w, draft, undo: [...w.undo, structuredClone(w.draft)].slice(-100), redo: [] };
}
export function saveRequirement(w: Workspace): Workspace {
  if (!w.editor) return w;
  const { requirement: r, isNew } = w.editor;
  const result = editDraft(w, (draft) => {
    const index = draft.requirements.findIndex((x) => x.id === r.id);
    if (isNew && index !== -1) throw new Error('需求 ID 已存在。');
    if (!isNew && index === -1) throw new Error('需求已不存在。');
    if (isNew) draft.requirements.push(structuredClone(r)); else draft.requirements[index] = structuredClone(r);
    for (const exp of draft.experiences) {
      exp.requirementIds = exp.requirementIds.filter((id) => id !== r.id);
      if (r.experienceIds.includes(exp.id)) exp.requirementIds.push(r.id);
    }
    const removed = draft.tests.filter((t) => t.requirementId === r.id && !r.testIds.includes(t.id)).map((t) => t.id);
    draft.tests = draft.tests.filter((t) => !removed.includes(t.id));
    for (const t of draft.tests) if (r.testIds.includes(t.id)) t.requirementId = r.id;
    for (const other of draft.requirements) if (other.id !== r.id) other.testIds = other.testIds.filter((id) => !r.testIds.includes(id));
    pruneEvidence(draft, removed);
  });
  return { ...result, editor: null };
}
export function deleteRequirement(w: Workspace, id: string): Workspace {
  return editDraft(w, (d) => {
    if (!d.requirements.some((r) => r.id === id)) throw new Error('需求不存在。');
    const removedTests = d.tests.filter((t) => t.requirementId === id).map((t) => t.id);
    d.requirements = d.requirements.filter((r) => r.id !== id);
    d.tests = d.tests.filter((t) => !removedTests.includes(t.id));
    d.experiences.forEach((e) => { e.requirementIds = e.requirementIds.filter((r) => r !== id); });
    pruneEvidence(d, [id, ...removedTests]);
  });
}
function pruneEvidence(draft: DraftSpec, removedIds: string[]): void {
  const removed = new Set(removedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of draft.evidence) if (removed.has(e.relatedId) && !removed.has(e.id)) { removed.add(e.id); changed = true; }
  }
  draft.evidence = draft.evidence.filter((e) => !removed.has(e.id));
}
export function moveRequirement(w: Workspace, id: string, direction: -1 | 1): Workspace {
  return editDraft(w, (d) => {
    const at = d.requirements.findIndex((r) => r.id === id), next = at + direction;
    if (at < 0 || next < 0 || next >= d.requirements.length) return;
    [d.requirements[at], d.requirements[next]] = [d.requirements[next], d.requirements[at]];
  });
}
export function undoDraft(w: Workspace, redo = false): Workspace {
  if (w.editor) throw new Error('请先保存或取消表单。');
  const from = redo ? w.redo : w.undo;
  if (!from.length) return w;
  return { ...w, draft: structuredClone(from.at(-1)!), undo: redo ? [...w.undo, w.draft].slice(-100) : w.undo.slice(0, -1), redo: redo ? w.redo.slice(0, -1) : [...w.redo, w.draft].slice(-100) };
}
function review(w: Workspace, source: ReviewRecord['source'], summary: string): ReviewRecord {
  return { id: `REVIEW-${crypto.randomUUID()}`, at: new Date().toISOString(), source, summary, revision: w.approved.revision };
}
function commitRevision(w: Workspace, candidate: DraftSpec, summary: string, source: 'manual' | 'ai-approved' | 'rollback'): Workspace {
  if (!summary.trim()) throw new Error('请填写审批说明。');
  if (w.editor) throw new Error('请先保存或取消当前表单。');
  if (w.baseRevision !== w.approved.revision) throw new Error('stale：草稿基础版本过期。');
  if (w.snapshots.length >= 500) throw new Error('已达 500 个快照上限，请导出备份后新建工作空间。');
  const next = structuredClone(candidate);
  next.revision = w.approved.revision + 1;
  next.history = [...structuredClone(w.approved.history), { revision: next.revision, summary, source }];
  const checked = validateProject(next);
  if (!checked.valid) throw new Error(checked.issues.map((i) => `${i.path} ${i.message}`).slice(0, 8).join('；'));
  const record = review(w, source, summary); record.revision = next.revision;
  return { ...w, approved: checked.value, draft: structuredClone(checked.value), baseRevision: next.revision, snapshots: [...w.snapshots, structuredClone(checked.value)], undo: [], redo: [], editor: null, proposal: null, proposalBase: undefined, reviews: [...w.reviews, record] };
}
export function approveDraft(w: Workspace, summary: string): Workspace {
  if (!isDirty(w)) throw new Error('没有待批准的草稿变更。');
  if (w.proposal) throw new Error('请先处理候选提案。');
  return commitRevision(w, w.draft, summary, 'manual');
}
export function approveProposal(w: Workspace, summary: string): Workspace {
  if (!w.proposal) throw new Error('没有候选提案。');
  if ((isDirty(w) && !w.proposalBase) || w.editor) throw new Error('请先批准或放弃手动草稿，避免覆盖编辑。');
  if (w.proposalBase !== undefined && w.proposalBase !== JSON.stringify(w.draft)) throw new Error('stale：请求后正文或交互已变化，请重新生成提案。');
  const simulated = simulateApply(w.proposalBase ? w.draft : w.approved, w.proposal);
  if (!simulated.valid) throw new Error(simulated.issues.map((i) => `${i.path} ${i.message}`).join('；'));
  return commitRevision(w, simulated.value, summary, 'ai-approved');
}
export function stageProposal(w: Workspace): Workspace {
  if (!w.proposal || w.editor || (isDirty(w) && !w.proposalBase)) throw new Error('请先处理手动草稿或未完成表单。');
  if (w.proposalBase !== undefined && w.proposalBase !== JSON.stringify(w.draft)) throw new Error('stale：候选已过期，请重新生成。');
  const candidate = simulateApply(w.proposalBase ? w.draft : w.approved, w.proposal);
  if (!candidate.valid) throw new Error(candidate.issues.map((i) => `${i.path} ${i.message}`).join('；'));
  const next = editDraft(w, (d) => Object.assign(d, structuredClone(candidate.value)));
  return { ...next, proposal: null, proposalBase: undefined };
}
export function rejectChanges(w: Workspace, proposalOnly = false): Workspace {
  const summary = proposalOnly ? `拒绝提案 ${w.proposal?.proposalId ?? ''}` : '放弃未批准草稿';
  return { ...w, ...(proposalOnly ? {} : { draft: structuredClone(w.approved), undo: [], redo: [], editor: null }), proposal: null, proposalBase: undefined, reviews: [...w.reviews, review(w, 'rejected', summary)] };
}
export function rollback(w: Workspace, revision: number): Workspace {
  if (isDirty(w) || w.editor || w.proposal) throw new Error('请先处理未批准草稿和提案，再回退版本。');
  const snapshot = w.snapshots.find((s) => s.revision === revision);
  if (!snapshot || revision === w.approved.revision) throw new Error('请选择已有的历史版本。');
  return commitRevision(w, snapshot, `回退至 r${revision} 的内容（保留历史）`, 'rollback');
}

export interface DiffEntry { path: string; kind: 'add' | 'remove' | 'change'; before?: unknown; after?: unknown }
export function computeDiff(before: unknown, after: unknown, path = ''): DiffEntry[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before === undefined) return [{ path, kind: 'add', after }];
  if (after === undefined) return [{ path, kind: 'remove', before }];
  if (Array.isArray(before) && Array.isArray(after)) {
    const keyed = [...before, ...after].every((v) => v && typeof v === 'object' && typeof v.id === 'string');
    if (keyed && before.length + after.length > 0) {
      const left = new Map(before.map((v: { id: string }) => [v.id, v]));
      const right = new Map(after.map((v: { id: string }) => [v.id, v]));
      const entries = [...new Set([...left.keys(), ...right.keys()])].flatMap((id) => computeDiff(left.get(id), right.get(id), `${path}/${id}`));
      const commonBefore = [...left.keys()].filter((id) => right.has(id));
      const commonAfter = [...right.keys()].filter((id) => left.has(id));
      if (JSON.stringify(commonBefore) !== JSON.stringify(commonAfter)) entries.push({ path: `${path}/顺序`, kind: 'change', before: [...left.keys()], after: [...right.keys()] });
      return entries;
    }
    return [{ path, kind: 'change', before, after }];
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) => computeDiff(a[key], b[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`));
  }
  return [{ path, kind: 'change', before, after }];
}
