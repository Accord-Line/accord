import { validateProject, validateProposal, validateDraft } from './validation';
import { setDocumentText, DOCUMENT_TAG, parseDocument } from './document';
import type { ProductSpec, DraftSpec, Proposal, Validation } from './types';

// Pure candidate simulation for contract validation. This is never an approval.
export function simulateApply(base: DraftSpec, input: unknown): Validation<ProductSpec> {
  const validBase = validateDraft(base);
  if (!validBase.valid) return validBase;
  const check = validateProposal(input);
  if (!check.valid) return check;
  const proposal: Proposal = check.value;
  if (base.unstructuredNotes.some((n) => n.startsWith(DOCUMENT_TAG)) && proposal.operations.some((op) => ['addRequirement', 'updateRequirement'].includes(op.op)) && !proposal.operations.some((op) => op.op === 'updateDocument')) {
    return { valid: false, issues: [{ path: '/operations', message: '本规范已有自由 Markdown 正文。修改需求的提案需同时提供 updateDocument，使阅读正文与需求索引保持一致。' }] };
  }
  if (proposal.baseRevision !== base.revision) return { valid: false, issues: [{ path: '/baseRevision', message: `stale：提案基于 r${proposal.baseRevision}，当前为 r${base.revision}。` }] };
  const candidate = structuredClone(base);
  for (const [index, operation] of proposal.operations.entries()) {
    switch (operation.op) {
      case 'updateDocument': {
        setDocumentText(candidate, operation.markdown);
        const parsed = parseDocument(operation.markdown);
        if (parsed.title) candidate.project.title = parsed.title;
        if (parsed.intent) candidate.intent = parsed.intent;
        break;
      }
      case 'addRequirement': candidate.requirements.push(structuredClone(operation.requirement)); break;
      case 'addExperience': candidate.experiences.push(structuredClone(operation.experience)); break;
      case 'addTest': candidate.tests.push(structuredClone(operation.test)); break;
      case 'updateRequirement': {
        const target = candidate.requirements.find((r) => r.id === operation.id);
        if (!target) return missing(index, operation.id);
        Object.assign(target, structuredClone(operation.fields));
        break;
      }
      case 'updateExperience': {
        const target = candidate.experiences.find((e) => e.id === operation.id);
        if (!target) return missing(index, operation.id);
        Object.assign(target, structuredClone(operation.fields));
        break;
      }
      case 'updateTest': {
        const target = candidate.tests.find((t) => t.id === operation.id);
        if (!target) return missing(index, operation.id);
        Object.assign(target, structuredClone(operation.fields), { status: 'not-run' });
        break;
      }
    }
  }
  const documentOperation = [...proposal.operations].reverse().find((op) => op.op === 'updateDocument');
  if (documentOperation?.op === 'updateDocument') {
    const parsed = parseDocument(documentOperation.markdown);
    const signature = (r: { title: string; description: string; acceptanceCriteria: string[]; constraints: string[] }) => JSON.stringify([r.title.trim(), r.description.trim(), r.acceptanceCriteria.map((s) => s.trim()), r.constraints.map((s) => s.trim())]);
    if (parsed.hasRequirements && JSON.stringify(parsed.blocks.map(signature).sort()) !== JSON.stringify(candidate.requirements.map(signature).sort())) return { valid: false, issues: [{ path: '/operations', message: '候选正文中的需求与结构化索引不一致，请让模型同步需求标题、描述、验收标准和约束后重试。' }] };
  }
  return validateProject(candidate);
}

function missing(index: number, id: string): Validation<ProductSpec> {
  return { valid: false, issues: [{ path: `/operations/${index}/id`, message: `更新目标不存在：${id}` }] };
}
