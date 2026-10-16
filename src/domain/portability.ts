import JSZip from 'jszip';
import type { ProductSpec, Workspace } from './types';
import { assertWorkspace, createWorkspace } from './workspace';
import { inspectInput, validateProject, validateProposal } from './validation';
import type { Proposal } from './types';
import { documentMarkdown, editMarkdown } from './document';

const FILE_LIMIT = 8 * 1024 * 1024;
const ZIP_LIMIT = 16 * 1024 * 1024;
const allowedZipNames = new Set(['workspace.json', 'product-spec/project.spec.json', 'product-spec/project.json', 'requirements.md', 'README.md', 'AGENTS.md', 'CODEX_TASK.md', 'product-spec/requirements.md', 'product-spec/experiences.json', 'product-spec/changes.json', 'product-spec/decisions.json', 'product-spec/evidence.json', 'product-spec/validation.json', 'schemas/product-spec.schema.json', 'schemas/ai-proposal.schema.json', 'drafts/workspace.draft.json', 'drafts/DRAFT.md']);

export function newProject(title: string): Workspace {
  if (!title.trim()) throw new Error('请填写项目名称。');
  const project: ProductSpec = {
    schemaVersion: '0.1.0', project: { id: `project-${crypto.randomUUID()}`, title: title.trim(), description: '', sourceUrl: '' },
    revision: 1, intent: `明确「${title.trim()}」的产品目标与验收标准。`, requirements: [], experiences: [], tests: [], decisions: [], evidence: [], unstructuredNotes: [],
    history: [{ revision: 1, summary: '新建空白项目', source: 'manual' }],
  };
  return createWorkspace(project);
}
export function parseWorkspaceJSON(text: string): Workspace {
  if (new TextEncoder().encode(text).byteLength > FILE_LIMIT) throw new Error('JSON 文件不能超过 8 MiB。');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('JSON 格式错误。'); }
  if (inspectInput(raw).length) throw new Error('文件包含危险键或过深的数据。');
  if (raw && typeof raw === 'object' && 'format' in raw) { assertWorkspace(raw); return raw; }
  const check = validateProject(raw);
  if (!check.valid) throw new Error(check.issues.slice(0, 6).map((i) => `${i.path} ${i.message}`).join('；'));
  return createWorkspace(check.value);
}
export function parseProposalJSON(text: string): Proposal {
  if (new TextEncoder().encode(text).byteLength > FILE_LIMIT) throw new Error('提案文件不能超过 8 MiB。');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('提案 JSON 格式错误。'); }
  const check = validateProposal(raw);
  if (!check.valid) throw new Error(check.issues.slice(0, 6).map((i) => `${i.path} ${i.message}`).join('；'));
  return check.value;
}
export function workspaceJSON(w: Workspace): string { assertWorkspace(w); return `${JSON.stringify(w, null, 2)}\n`; }
export function requirementsMarkdown(spec: ProductSpec): string {
  const lines = [`# ${spec.project.title}`, '', `> 已批准规范 revision ${spec.revision}；条目状态见各需求。规范获批不代表代码已实现。`, '', spec.intent, ''];
  for (const req of spec.requirements) {
    lines.push(`## ${req.id} · ${req.title}`, '', `状态：${req.status}`, '', req.description, '', '### 验收条件', ...req.acceptanceCriteria.map((c) => `- ${c}`), '', '### 约束', ...req.constraints.map((c) => `- ${c}`), '', `体验：${req.experienceIds.join(', ') || '无'}`, `测试：${req.testIds.join(', ') || '无'}`, '');
  }
  lines.push('## 未映射笔记', ...spec.unstructuredNotes.flatMap((n) => ['', n, '']));
  return `${lines.join('\n')}\n`;
}
export async function exportWorkspaceZip(w: Workspace): Promise<Blob> {
  assertWorkspace(w);
  const zip = new JSZip();
  zip.file('workspace.json', workspaceJSON(w));
  zip.file('product-spec/project.spec.json', JSON.stringify(w.approved, null, 2));
  zip.file('requirements.md', documentMarkdown(w.approved));
  zip.file('README.md', '# 共识 Accord 完整工作空间备份\n\nworkspace.json 包含未批准草稿、旧版未完成表单、撤销记录和版本快照。\nproduct-spec/project.spec.json 与 requirements.md 仅包含当前已批准规范。\n这是备份，Codex 交接请使用专门的交接包。浏览器存储可能被清理，请保留备份。\n');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  if (blob.size > FILE_LIMIT) throw new Error('ZIP 备份超过 8 MiB，请使用完整 JSON 备份。');
  return blob;
}

// Bound central directory metadata BEFORE loading or inflating entries.
export function checkZipEnvelope(bytes: Uint8Array): void {
  if (bytes.byteLength > FILE_LIMIT || bytes.byteLength < 22) throw new Error('ZIP 体积无效，上限 8 MiB。');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (view.getUint32(p, true) === 0x06054b50 && p + 22 + view.getUint16(p + 20, true) === bytes.length) { eocd = p; break; }
  }
  if (eocd < 0 || view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) throw new Error('ZIP 目录无效；不支持分卷。');
  const count = view.getUint16(eocd + 10, true), offset = view.getUint32(eocd + 16, true), size = view.getUint32(eocd + 12, true);
  if (count > 32 || count === 0 || count !== view.getUint16(eocd + 8, true) || offset + size > eocd) throw new Error('ZIP 条目过多或目录损坏。');
  let pos = offset, total = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (pos + 46 > eocd || view.getUint32(pos, true) !== 0x02014b50) throw new Error('ZIP 中央目录损坏。');
    const flags = view.getUint16(pos + 8, true), method = view.getUint16(pos + 10, true);
    const unpacked = view.getUint32(pos + 24, true), packed = view.getUint32(pos + 20, true);
    const len = view.getUint16(pos + 28, true), extra = view.getUint16(pos + 30, true), comment = view.getUint16(pos + 32, true);
    if (pos + 46 + len + extra + comment > offset + size) throw new Error('ZIP 条目长度损坏。');
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + len));
    if ((flags & 1) || ![0, 8].includes(method) || unpacked > FILE_LIMIT || packed > FILE_LIMIT || total + unpacked > ZIP_LIMIT) throw new Error('ZIP 加密、算法或解压大小不受支持。');
    if (names.has(name) || name.includes('..') || name.includes('\\') || name.startsWith('/') || (!name.endsWith('/') && !allowedZipNames.has(name))) throw new Error(`ZIP 含未知、重复或不安全条目：${name}`);
    names.add(name); total += unpacked; pos += 46 + len + extra + comment;
  }
  if (pos !== offset + size) throw new Error('ZIP 目录大小不匹配。');
}
async function boundedText(entry: JSZip.JSZipObject): Promise<string> {
  // JSZip 3.10 exposes this stream API but omits it from JSZipObject's .d.ts.
  if (!hasInternalStream(entry)) throw new Error('当前 ZIP 库不支持有界流式读取。');
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []; let size = 0; let failed = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', (data: Uint8Array) => {
      size += data.byteLength;
      if (size > FILE_LIMIT) { failed = true; stream.pause(); reject(new Error('ZIP 实际解压大小超出限制。')); return; }
      chunks.push(data);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      if (failed) return;
      const all = new Uint8Array(size); let at = 0;
      for (const chunk of chunks) { all.set(chunk, at); at += chunk.length; }
      try { resolve(new TextDecoder('utf-8', { fatal: true }).decode(all)); } catch { reject(new Error('ZIP 文本不是有效 UTF-8。')); }
    });
    stream.resume();
  });
}
function hasInternalStream(entry: JSZip.JSZipObject): entry is JSZip.JSZipObject & { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> } {
  return 'internalStream' in entry && typeof entry.internalStream === 'function';
}
export async function importWorkspaceFile(name: string, bytes: Uint8Array): Promise<Workspace> {
  if (bytes.byteLength > FILE_LIMIT) throw new Error('导入文件上限为 8 MiB。');
  if (name.toLowerCase().endsWith('.zip')) {
    checkZipEnvelope(bytes);
    const zip = await JSZip.loadAsync(bytes, { createFolders: false });
    const backup = zip.file('workspace.json');
    const canonical = zip.file('product-spec/project.spec.json') ?? zip.file('product-spec/project.json');
    if (!backup && !canonical) throw new Error('ZIP 缺少 workspace.json 或 product-spec/project.spec.json。');
    const workspace = parseWorkspaceJSON(await boundedText((backup ?? canonical)!));
    if (backup && canonical) {
      const check = validateProject(JSON.parse(await boundedText(canonical)) as unknown);
      if (!check.valid || JSON.stringify(check.value) !== JSON.stringify(workspace.approved)) throw new Error('ZIP 的已批准规范与备份内容不一致。');
    }
    return workspace;
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/\.md$/i.test(name)) {
    const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || name.replace(/\.md$/i, '') || '导入项目';
    return editMarkdown(newProject(title), text);
  }
  if (!/\.json$/i.test(name)) throw new Error('仅支持 .json、.zip、.md 文件。');
  return parseWorkspaceJSON(text);
}
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadJSON(name: string, value: unknown): void {
  downloadBlob(name, new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
}
