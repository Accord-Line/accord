import { documentMarkdown } from '../src/domain/document';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import baseline from '../examples/intentkit/project.spec.json';
import sample from '../examples/intentkit/custom-recipe.proposal.json';
import { approveDraft, approveProposal, assertWorkspace, beginRequirement, computeDiff, createWorkspace, deleteRequirement, editDraft, isDirty, moveRequirement, rejectChanges, rollback, saveRequirement, undoDraft } from '../src/domain/workspace';
import { exportWorkspaceZip, importWorkspaceFile, newProject, parseProposalJSON, parseWorkspaceJSON, requirementsMarkdown, workspaceJSON } from '../src/domain/portability';
import { validateDraft, validateProject } from '../src/domain/validation';
import type { Workspace } from '../src/domain/types';

function start(): Workspace {
  const check = validateProject(structuredClone(baseline));
  if (!check.valid) throw new Error('fixture');
  return createWorkspace(check.value);
}
function add(w: Workspace, title = '真实新需求'): Workspace {
  const next = beginRequirement(w);
  next.editor!.requirement.title = title;
  next.editor!.requirement.description = `${title}的独立描述`;
  next.editor!.requirement.acceptanceCriteria = ['能通过独立验收'];
  return saveRequirement(next);
}
describe('M1 structured editing and review', () => {
  it('creates a focused-form model without adding placeholders, and cancellation leaves no item', () => {
    const w = beginRequirement(start());
    expect(w.editor!.requirement.id).toBe('REQ-101'); expect(w.editor!.requirement.title).toBe('');
    expect(w.draft.requirements).toHaveLength(1);
    expect(isDirty({ ...w, editor: null })).toBe(false);
  });
  it('independently edits five requirements with stable IDs and preserves approved r1', () => {
    let w = start();
    for (let i = 1; i <= 5; i++) w = add(w, `需求 ${i}`);
    w = beginRequirement(w, 'REQ-103'); w.editor!.requirement.title = '第三条已修改'; w = saveRequirement(w);
    expect(w.draft.requirements.map((r) => r.id)).toEqual(['REQ-IK-001', 'REQ-101', 'REQ-102', 'REQ-103', 'REQ-104', 'REQ-105']);
    expect(w.draft.requirements[1].title).toBe('需求 1'); expect(w.draft.requirements[3].title).toBe('第三条已修改');
    expect(w.approved).toEqual(baseline); assertWorkspace(w);
  });
  it('persists incomplete drafts under a separate contract and blocks approval', () => {
    let w = beginRequirement(start()); w.editor!.requirement.acceptanceCriteria = []; w = saveRequirement(w);
    expect(validateDraft(w.draft).valid).toBe(true); expect(validateProject(w.draft).valid).toBe(false);
    expect(() => approveDraft(w, '仍不完整')).toThrow(); expect(w.approved.revision).toBe(1); assertWorkspace(w);
  });
  it('sorts without changing IDs, then supports undo and redo', () => {
    let w = add(add(start(), '甲'), '乙'); w = moveRequirement(w, 'REQ-102', -1);
    expect(w.draft.requirements[1].id).toBe('REQ-102');
    w = undoDraft(w); expect(w.draft.requirements[1].id).toBe('REQ-101');
    w = undoDraft(w, true); expect(w.draft.requirements[1].id).toBe('REQ-102'); assertWorkspace(w);
  });
  it('never reuses deleted or canceled requirement IDs, including after undo eviction', () => {
    let w = deleteRequirement(add(start()), 'REQ-101');
    w = { ...w, undo: [], redo: [] };
    const next = beginRequirement(w); expect(next.editor!.requirement.id).toBe('REQ-102');
    const canceled = { ...next, editor: null }; expect(beginRequirement(canceled).editor!.requirement.id).toBe('REQ-103');
    const legacy = start(); delete legacy.nextRequirementNumber;
    expect(beginRequirement(legacy).editor!.requirement.id).toBe('REQ-101');
  });
  it('maintains experience links and safely transfers test ownership', () => {
    let w = beginRequirement(add(start()), 'REQ-101');
    w.editor!.requirement.experienceIds = ['EXP-IK-001']; w.editor!.requirement.testIds = ['TEST-IK-001']; w = saveRequirement(w);
    expect(w.draft.tests[0].requirementId).toBe('REQ-101'); expect(w.draft.requirements[0].testIds).toEqual([]);
    expect(w.draft.experiences[0].requirementIds).toContain('REQ-101'); assertWorkspace(w);
  });
  it('deletes referenced objects without dangling links and undo restores them', () => {
    const w = deleteRequirement(start(), 'REQ-IK-001');
    expect(w.draft.tests).toEqual([]); expect(w.draft.experiences[0].requirementIds).toEqual([]);
    expect(w.approved).toEqual(baseline); expect(undoDraft(w).draft).toEqual(baseline); assertWorkspace(w);
  });
  it('approves once to r2, preserves requirement status, and rolls back as r3', () => {
    const w = approveDraft(add(start()), '新增需求已审阅');
    expect(w.approved.revision).toBe(2); expect(w.approved.requirements[1].status).toBe('draft');
    expect(w.snapshots[0]).toEqual(baseline); expect(w.undo).toEqual([]);
    const rolled = rollback(w, 1);
    expect(rolled.approved.revision).toBe(3); expect(rolled.approved.requirements).toEqual(baseline.requirements);
    expect(rolled.approved.history.map((h) => h.revision)).toEqual([1, 2, 3]); assertWorkspace(rolled);
  });
  it('requires explicit review, rejects no-op or unfinished edits, and preserves rejected records', () => {
    expect(() => approveDraft(start(), '无改动')).toThrow();
    expect(() => approveDraft(beginRequirement(add(start())), '未保存表单')).toThrow();
    const w = rejectChanges(add(start())); expect(w.approved).toEqual(baseline); expect(w.draft).toEqual(baseline); expect(w.reviews[0].source).toBe('rejected');
  });
  it('atomically accepts a proposal, rejects stale versions and protects dirty manual drafts', () => {
    let w = { ...start(), proposal: parseProposalJSON(JSON.stringify(sample)) };
    const accepted = approveProposal(w, '已审阅固定样例'); expect(accepted.approved.revision).toBe(2); expect(accepted.approved.experiences).toHaveLength(2);
    expect(accepted.approved.tests.every((t) => t.status === 'not-run')).toBe(true);
    expect(() => approveProposal({ ...accepted, proposal: w.proposal }, '陈旧提案')).toThrow(/stale/);
    w = { ...add(start()), proposal: w.proposal }; expect(() => approveProposal(w, '不能覆盖草稿')).toThrow();
  });
  it('diff addresses stable IDs, includes field changes and order changes', () => {
    let w = add(start()); const added = computeDiff(w.approved, w.draft); expect(added.some((d) => d.path === '/requirements/REQ-101' && d.kind === 'add')).toBe(true);
    w = moveRequirement(w, 'REQ-101', -1); expect(computeDiff(add(start()).draft, w.draft).some((d) => d.path.endsWith('/顺序'))).toBe(true);
    expect(computeDiff({ title: '前' }, { title: '后' })).toEqual([{ path: '/title', kind: 'change', before: '前', after: '后' }]);
  });
});

describe('M1 portable workspaces', () => {
  it('JSON round-trips approved, drafts, unfinished forms, undo, snapshots and review records', () => {
    const w = beginRequirement(add(approveDraft(add(start()), '第一版')));
    w.editor!.requirement.description = '未完成的输入也不丢';
    expect(parseWorkspaceJSON(workspaceJSON(w))).toEqual(w);
  });
  it('imports baseline JSON through the original Schema', () => expect(parseWorkspaceJSON(JSON.stringify(baseline)).approved).toEqual(baseline));
  it('ZIP round-trips all core state with consistent approved projection', async () => {
    const w = beginRequirement(add(approveDraft(add(start()), '审阅')));
    const zip = await exportWorkspaceZip(w);
    expect(await importWorkspaceFile('backup.zip', new Uint8Array(await zip.arrayBuffer()))).toEqual(w);
  });
  it('preserves unknown Markdown byte-for-byte in draft notes without claiming approval', async () => {
    const text = '# 未映射 PRD\n\n<script>alert(1)</script>\n\n原始说明。\n';
    const w = await importWorkspaceFile('notes.md', new TextEncoder().encode(text));
    expect(documentMarkdown(w.draft)).toEqual(text); expect(w.approved.unstructuredNotes).toEqual([]); expect(isDirty(w)).toBe(true);
  });
  it('exports approved Markdown with requirement statuses and acceptance criteria', () => {
    const md = requirementsMarkdown(start().approved); expect(md).toContain('REQ-IK-001'); expect(md).toContain('验收条件'); expect(md).toContain('不代表代码已实现');
  });
  it('rejects unknown formats, malicious keys, inconsistent snapshots and malformed editors', () => {
    expect(() => parseWorkspaceJSON('{"__proto__":{}}')).toThrow();
    expect(() => parseWorkspaceJSON(JSON.stringify({ ...start(), formatVersion: 99 }))).toThrow();
    expect(() => assertWorkspace({ ...start(), snapshots: [] })).toThrow();
    expect(() => assertWorkspace({ ...start(), editor: { isNew: true, requirement: { id: 'REQ-101' } } })).toThrow();
    expect(() => assertWorkspace({ ...start(), secretKey: 'not-a-real-key' })).toThrow();
  });
  it('rejects ZIP traversal, unknown entries, inconsistent approved data, and declared bombs', async () => {
    for (const name of ['../workspace.json', 'script.js']) {
      const zip = new JSZip().file(name, workspaceJSON(start()));
      await expect(importWorkspaceFile('bad.zip', await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow();
    }
    const zip = new JSZip().file('workspace.json', workspaceJSON(start())).file('product-spec/project.spec.json', JSON.stringify({ ...baseline, intent: '不同内容' }));
    await expect(importWorkspaceFile('bad.zip', await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/不一致/);
    const bytes = await new JSZip().file('workspace.json', '{}').generateAsync({ type: 'uint8array' });
    const view = new DataView(bytes.buffer); let central = 0;
    while (view.getUint32(central, true) !== 0x02014b50) central++;
    view.setUint32(central + 24, 100_000_000, true);
    await expect(importWorkspaceFile('bad.zip', bytes)).rejects.toThrow(/解压/);
  });
  it('new projects have stable project IDs and a valid empty approved revision', () => {
    const w = newProject('自己的产品'); expect(validateProject(w.approved).valid).toBe(true); expect(w.draft.requirements).toEqual([]); assertWorkspace(w);
  });
  it('supports 100 normal requirements without corrupting the model', () => {
    const w = editDraft(start(), (d) => {
      for (let i = 0; i < 100; i++) d.requirements.push({ id: `REQ-BULK-${i}`, title: `需求${i}`, description: '常规说明', status: 'draft', constraints: [], acceptanceCriteria: ['有效标准'], experienceIds: [], testIds: [] });
    });
    assertWorkspace(w); expect(validateProject(w.draft).valid).toBe(true);
  });
});
