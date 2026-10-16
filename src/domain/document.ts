import type { DraftSpec, DraftRequirement, Workspace } from './types';
import { editDraft, nextRequirementId } from './workspace';

export const DOCUMENT_TAG = '<!-- psw:document:v1 -->\n';
export function documentMarkdown(spec: DraftSpec): string {
  const stored = spec.unstructuredNotes.find((note) => note.startsWith(DOCUMENT_TAG));
  if (stored !== undefined) return stored.slice(DOCUMENT_TAG.length);
  return [`# ${spec.project.title}`, '', '## 产品目标', '', spec.intent, '', '## 需求与验收', '',
    ...spec.requirements.flatMap((r) => [`### ${r.title}`, '', r.description, '', '#### 验收标准', ...r.acceptanceCriteria.map((a) => `- ${a}`), '', ...(r.constraints.length ? ['#### 约束', ...r.constraints.map((c) => `- ${c}`), ''] : [])]),
    ...(spec.unstructuredNotes.length ? ['## 补充说明', '', ...spec.unstructuredNotes.flatMap((n) => [n, ''])] : []),
  ].join('\n');
}
export function setDocumentText(spec: DraftSpec, markdown: string): void {
  spec.unstructuredNotes = [DOCUMENT_TAG + markdown, ...spec.unstructuredNotes.filter((n) => !n.startsWith(DOCUMENT_TAG))];
}

interface Block { title: string; description: string; acceptanceCriteria: string[]; constraints: string[] }
export function parseDocument(markdown: string): { title?: string; intent?: string; blocks: Block[]; hasRequirements: boolean } {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const blocks: Block[] = []; let hasRequirements = false, inRequirements = false, inIntent = false;
  let current: Block | null = null, part: 'description' | 'acceptanceCriteria' | 'constraints' = 'description';
  let fence: string | null = null, title: string | undefined; const intent: string[] = [];
  for (const line of lines) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) { if (!fence) fence = fenceMatch[1][0]; else if (fence === fenceMatch[1][0]) fence = null; }
    if (!fence && !fenceMatch) {
      const heading = /^(#{1,4})\s+(.*)$/.exec(line);
      if (heading) {
        const level = heading[1].length, text = heading[2].trim();
        if (level === 1 && !title) title = text || undefined;
        if (level <= 2) {
          inRequirements = level === 2 && /^(需求与验收|需求|功能需求|核心需求|用户需求)$/.test(text);
          inIntent = level === 2 && /^(产品目标|产品意图|目标|愿景)$/.test(text);
          if (inRequirements) hasRequirements = true;
          current = null;
          continue;
        }
        if (inRequirements && level === 3) { current = { title: text, description: '', acceptanceCriteria: [], constraints: [] }; blocks.push(current); part = 'description'; continue; }
        if (current && level === 4 && /验收/.test(text)) { part = 'acceptanceCriteria'; continue; }
        if (current && level === 4 && /约束|边界/.test(text)) { part = 'constraints'; continue; }
      }
    }
    if (inIntent) intent.push(line);
    if (current) {
      if (part === 'description') current.description += `${line}\n`;
      else {
        const item = /^\s*(?:[-*+]\s+|\d+\.\s+)(.*)$/.exec(line);
        if (item) current[part].push(item[1]);
        else if (line.trim() && current[part].length) current[part][current[part].length - 1] += `\n${line}`;
      }
    }
  }
  return { title, intent: intent.join('\n').trim() || undefined, blocks: blocks.map((b) => ({ ...b, description: b.description.trim() })), hasRequirements };
}

export function editMarkdown(w: Workspace, markdown: string): Workspace {
  if (markdown.length > 200_000) throw new Error('正文超过 20 万字符，请拆分文档。');
  const parsed = parseDocument(markdown);
  let nextNumber = w.nextRequirementNumber ?? 101;
  const next = editDraft(w, (draft) => {
    setDocumentText(draft, markdown);
    if (parsed.title) draft.project.title = parsed.title;
    if (parsed.intent) draft.intent = parsed.intent;
    if (!parsed.hasRequirements) return; // Free prose is preserved without silently dropping the existing index.
    const previous = draft.requirements;
    const claimed = new Set<string>();
    const matched = parsed.blocks.map((b) => {
      const match = previous.find((r) => r.title === b.title && !claimed.has(r.id));
      if (match) claimed.add(match.id);
      return match;
    });
    const requirements = parsed.blocks.map((block, index): DraftRequirement => {
      let old = matched[index];
      if (!old) { old = previous[index]; if (old && claimed.has(old.id)) old = undefined; if (old) claimed.add(old.id); }
      const id = old?.id ?? nextRequirementId(draft, [...claimed], nextNumber);
      if (!old) nextNumber = Number(id.slice(4)) + 1;
      claimed.add(id);
      return { id, title: block.title, description: block.description, status: old?.status ?? 'draft', acceptanceCriteria: block.acceptanceCriteria, constraints: block.constraints, experienceIds: [...old?.experienceIds ?? []], testIds: [...old?.testIds ?? []] };
    });
    // During heading edits, an empty title is still a recoverable, incomplete draft.
    draft.requirements = requirements;
    const remaining = new Set(requirements.map((r) => r.id));
    const removed = new Set(previous.filter((r) => !remaining.has(r.id)).map((r) => r.id));
    draft.tests = draft.tests.filter((t) => { if (remaining.has(t.requirementId)) return true; removed.add(t.id); return false; });
    draft.experiences.forEach((e) => { e.requirementIds = e.requirementIds.filter((id) => remaining.has(id)); });
    let change = true;
    while (change) { change = false; for (const e of draft.evidence) if (removed.has(e.relatedId) && !removed.has(e.id)) { removed.add(e.id); change = true; } }
    draft.evidence = draft.evidence.filter((e) => !removed.has(e.id));
  });
  return { ...next, nextRequirementNumber: nextNumber };
}
