import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { execFileSync } from 'node:child_process';
import baseline from '../examples/intentkit/project.spec.json';
import sample from '../examples/intentkit/custom-recipe.proposal.json';
import { approveDraft, approveProposal, assertWorkspace, createWorkspace, editDraft, stageProposal, undoDraft } from '../src/domain/workspace';
import { documentMarkdown, editMarkdown, parseDocument, setDocumentText } from '../src/domain/document';
import { validateProject } from '../src/domain/validation';
import { simulateApply } from '../src/domain/proposal';
import { handoffFiles } from '../src/domain/handoff';
import { importWorkspaceFile, parseProposalJSON } from '../src/domain/portability';
import { componentNumber, runEvent } from '../src/domain/experience';
import { chat, createPKCE, endpointURL, exchangeCode, listModels, readLimited, unwrapJSON, type ProviderSettings } from '../src/byok/client';
import { collaborationMessages } from '../src/byok/prompt';
function start() { const c = validateProject(baseline); if (!c.valid) throw Error('fixture'); return createWorkspace(c.value); }
const settings: ProviderSettings = { provider: 'tokendance', endpoint: 'https://tokendance.space/gateway/v1', model: 'test-model', appUrl: 'app://psw-test' };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('free Markdown and proposal concurrency', () => {
  it('preserves free prose, tables, code and nonstandard sections verbatim', () => {
    const md = '# 自由规范\n\n无需选择字段\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\n## 需求\n### 这是代码\n```';
    const w = editMarkdown(start(), md);
    expect(documentMarkdown(w.draft)).toBe(md); expect(w.draft.requirements).toEqual(baseline.requirements); expect(w.approved).toEqual(baseline); assertWorkspace(w);
    expect(documentMarkdown(undoDraft(w).draft)).not.toBe(md);
  });
  it('adds five editable requirements, keeps IDs after rename and reorder, removes with undo', () => {
    let w = start(); let md = documentMarkdown(w.draft);
    // Insert before the supplementary notes so all five belong to the requirements area.
    md = md.replace('## 补充说明', Array.from({ length: 5 }, (_, i) => `### 自由需求 ${i + 1}\n\n说明 ${i + 1}\n\n#### 验收标准\n- 能完整保存\n`).join('\n') + '\n## 补充说明');
    w = editMarkdown(w, md); expect(w.draft.requirements.map((r) => r.id)).toEqual(['REQ-IK-001','REQ-101','REQ-102','REQ-103','REQ-104','REQ-105']);
    w = editMarkdown(w, md.replace('自由需求 3', '已改第三条')); expect(w.draft.requirements[3].id).toBe('REQ-103');
    const before = structuredClone(w.draft); w = editMarkdown(w, '# 空白\n\n## 需求与验收\n');
    expect(w.draft.requirements).toEqual([]); expect(w.draft.tests).toEqual([]); expect(w.draft.experiences[0].requirementIds).toEqual([]);
    w = undoDraft(w); expect(w.draft).toEqual(before); assertWorkspace(w);
  });
  it('raw keystrokes do not delete indices until blur synchronization', () => {
    const w = editDraft(start(), (d) => setDocumentText(d, '## 需求与验收\n##'));
    expect(w.draft.requirements).toEqual(baseline.requirements); expect(w.draft.tests).toEqual(baseline.tests);
  });
  it('incomplete structured blocks persist but cannot be approved', () => {
    const w = editMarkdown(start(), '# 产品\n## 需求与验收\n### 未完成\n');
    assertWorkspace(w); expect(() => approveDraft(w, '仍不完整')).toThrow();
  });
  it('ignores fake headings inside fences and parses constraints', () => {
    const p = parseDocument('# P\n## 产品目标\n目标\n## 需求与验收\n### R\n说明\n```\n### 假标题\n```\n#### 验收标准\n1. 有效果\n#### 约束\n- 不执行脚本');
    expect(p.blocks).toHaveLength(1); expect(p.blocks[0].constraints).toEqual(['不执行脚本']); expect(p.intent).toBe('目标');
  });
  it('applies AI changes on top of manual prose, rejects later edits and keeps approved intact', () => {
    let w = editMarkdown(start(), documentMarkdown(start().draft) + '\n人工补充');
    const projection = simulateApply(start().draft, sample); if (!projection.valid) throw Error('fixture'); const proposal = parseProposalJSON(JSON.stringify({ ...sample, operations: [...sample.operations, { op: 'updateDocument', markdown: documentMarkdown(projection.value) + '\n人工补充' }] })); w = { ...w, proposal, proposalBase: JSON.stringify(w.draft) };
    const changed = editDraft(w, (d) => setDocumentText(d, '后来的人工修改'));
    expect(() => approveProposal(changed, '禁止覆盖')).toThrow(/stale|过期|变化|变更/);
    const next = approveProposal(w, '接受新配方'); expect(next.approved.revision).toBe(2); expect(documentMarkdown(next.approved)).toContain('人工补充'); expect(w.approved).toEqual(baseline);
  });
  it('supports full-document updates without executing embedded text', () => {
    const p = { ...sample, operations: [{ op: 'updateDocument', markdown: '# 产品\n<script>danger()</script>' }] };
    const c = simulateApply(start().draft, p); expect(c.valid).toBe(true); if (c.valid) expect(documentMarkdown(c.value)).toBe(p.operations[0].markdown);
  });
  it('rejects AI edits that leave the human document and requirement index inconsistent', () => {
    const w = editMarkdown(start(), documentMarkdown(start().draft));
    expect(simulateApply(w.draft, sample).valid).toBe(false);
    expect(simulateApply(w.draft, { ...sample, operations: [...sample.operations, { op: 'updateDocument', markdown: documentMarkdown(w.draft) }] }).valid).toBe(false);
  });
  it('migrates original v0.1 proposal without changing any field', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', "import {migrateProposal} from './scripts/migrate-proposal-v01-v02.mjs'; import {readFile} from 'node:fs/promises'; process.stdout.write(JSON.stringify(await migrateProposal(JSON.parse(await readFile('examples/intentkit/custom-recipe.proposal.json','utf8')))));"], { encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual(sample);
  });
  it('stages a valid candidate for manual editing without approving and supports undo', () => {
    const w = { ...start(), proposal: parseProposalJSON(JSON.stringify(sample)) };
    const next = stageProposal(w); expect(next.approved).toEqual(baseline); expect(next.draft.requirements).toHaveLength(2); expect(next.proposal).toBeNull();
    expect(undoDraft(next).draft).toEqual(baseline); assertWorkspace(next);
  });
});
describe('declarative interaction runtime', () => {
  it('actually updates bound hover state and parameter values', () => {
    const exp = start().draft.experiences[0], card = exp.components.find((c) => c.type === 'card')!;
    const next = runEvent(exp, exp.state, card.id, 'hoverStart'); expect(next.state.isHovered).toBe(true); expect(exp.state.isHovered).toBe(false);
    expect(componentNumber(card, { ...next.state, lift_px: 18 }, 'hoverLiftPx')).toBe(18);
    expect(runEvent(exp, next.state, card.id, 'hoverEnd').state.isHovered).toBe(false);
  });
  it('invalid recipe blocks all success actions; valid input progresses', () => {
    const c = simulateApply(start().draft, sample); if (!c.valid) throw Error('fixture');
    const exp = c.value.experiences[1], button = exp.components.find((x) => x.type === 'button')!;
    const fail = runEvent(exp, { ...exp.state, recipeName: '' }, button.id, 'click');
    expect(Object.keys(fail.errors)).not.toHaveLength(0); expect(fail.state.isReady).toBe(false); expect(fail.message).not.toContain('已创建');
    const pass = runEvent(exp, { ...exp.state, recipeName: '我的配方' }, button.id, 'click'); expect(pass.errors).toEqual({}); expect(pass.state.isReady).toBe(true);
    expect(runEvent(exp, { ...exp.state, lift_px: 500 }, button.id, 'click').state.isReady).toBe(false);
  });
});
describe('approved Codex package', () => {
  it('exports exact approved data, required files and honest verification levels; imports identically', async () => {
    const w = approveProposal({ ...start(), proposal: parseProposalJSON(JSON.stringify(sample)) }, '接受自定义配方');
    const dirty = editMarkdown(w, '# 未批准的新标题\n人类自由草稿');
    const files = handoffFiles(dirty);
    expect(JSON.parse(files['product-spec/project.spec.json'])).toEqual(w.approved);
    expect(files['CODEX_TASK.md']).toContain('REQ-IK-002'); expect(files['CODEX_TASK.md']).toContain('必须重新读取实际仓库');
    expect(files['product-spec/requirements.md']).not.toContain('未批准的新标题'); expect(files['drafts/DRAFT.md']).toBeUndefined();
    expect(JSON.parse(files['product-spec/validation.json']).externalImplementation.status).toBe('not-run');
    const zip = new JSZip(); for (const [name, data] of Object.entries(files)) zip.file(name, data);
    const imported = await importWorkspaceFile('handoff.zip', await zip.generateAsync({ type: 'uint8array' }));
    expect(imported.approved).toEqual(w.approved); expect(imported.draft).toEqual(w.approved); expect(imported.snapshots).toEqual(w.snapshots);
    expect(handoffFiles(dirty, true)['drafts/DRAFT.md']).toContain('未批准的新标题');
  });
});
describe('browser BYOK protocol (fetch simulated, never real billing)', () => {
  it('builds bounded HTTPS requests, passes attribution, and separates connection tests', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }))); vi.stubGlobal('fetch', fetch);
    expect(await chat(settings, 'fake-test-key', [{ role: 'user', content: 'Only reply OK.' }], undefined, true)).toBe('OK');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]; expect(url).toBe(settings.endpoint + '/chat/completions'); expect(init.credentials).toBe('omit');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer fake-test-key', 'X-App-URL': settings.appUrl }); expect(JSON.parse(init.body as string).max_tokens).toBe(32);
  });
  it.each([400,401,402,403,429,500])('reports HTTP %s once without leaking provider response bodies', async (status) => {
    const fetch = vi.fn(async () => new Response('LEAK-KEY-SENTINEL', { status, headers: { 'TokenDance-Recovery-Action': 'reauthorize_api_key' } })); vi.stubGlobal('fetch', fetch);
    await expect(chat(settings, 'fake-key', [])).rejects.toThrow(/服务|凭据|额度|授权|频率/); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('handles network failure, malformed responses, cancellation and oversized streams', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw TypeError('LEAK-KEY-SENTINEL'); })); await expect(chat(settings, 'fake', [])).rejects.toThrow(/网络/);
    const ac = new AbortController(); ac.abort(); await expect(chat(settings, 'fake', [], ac.signal)).rejects.toThrow(/取消/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json'))); await expect(chat(settings, 'fake', [])).rejects.toThrow(/JSON/);
    await expect(readLimited(new Response('a'.repeat(100)), 20)).rejects.toThrow(/过大/);
  });
  it('rejects unsafe endpoints before any request', () => {
    for (const endpoint of ['http://example.com/v1','https://user:secret@example.com/v1','https://example.com/v1?key=secret','javascript:bad']) expect(() => endpointURL(endpoint, 'models')).toThrow();
    expect(endpointURL('http://localhost:9000/v1/', 'models')).toBe('http://localhost:9000/v1/models');
  });
  it('creates real SHA256 PKCE and exchanges only code plus verifier', async () => {
    const pkce = await createPKCE(); expect(pkce.verifier).toMatch(/^[a-zA-Z0-9_-]{43,128}$/); expect(pkce.challenge).toHaveLength(43);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pkce.verifier)); expect(Buffer.from(digest).toString('base64url')).toBe(pkce.challenge);
    const fetch = vi.fn(async () => new Response('{"key":"fake-returned-key"}')); vi.stubGlobal('fetch', fetch);
    expect(await exchangeCode('one-use-code', pkce.verifier)).toBe('fake-returned-key');
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]; expect(JSON.parse(init.body as string)).toEqual({ code: 'one-use-code', code_verifier: pkce.verifier, code_challenge_method: 'S256' });
  });
  it('reads live-format model IDs and accepts fenced JSON without evaluating code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"data":[{"id":"real-directory-shape","supported_protocols":["openai"]}]}')));
    expect(await listModels(settings)).toEqual([{ id: 'real-directory-shape', protocols: ['openai'] }]);
    expect(unwrapJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 }); expect(() => unwrapJSON('danger()')).toThrow();
  });
  it('shows the same context that is sent and omits unselected interaction data', () => {
    const w = start(), p = collaborationMessages(w, '新想法', false);
    expect(p[1].content).toContain(documentMarkdown(w.draft).split('\n')[0]); expect(p[1].content).toContain('"experiences":[]'); expect(p[1].content).not.toContain('"lift_px":6');
  });
  it('uses separate bounded waits, allows manual model wait and never sends a key to the public directory', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetch = vi.fn(async () => new Response('{"data":[]}')); vi.stubGlobal('fetch', fetch);
    await listModels(settings, 'fake-private-key'); expect(timeout).toHaveBeenLastCalledWith(20_000);
    expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({});
    fetch.mockImplementation(async () => new Response('{"key":"fake-oauth-key"}')); await exchangeCode('fake-code','x'.repeat(64)); expect(timeout).toHaveBeenLastCalledWith(30_000);
    fetch.mockImplementation(async () => new Response('{"choices":[{"message":{"content":"OK"}}]}')); await chat(settings,'fake-key',[]); expect(timeout).toHaveBeenLastCalledWith(180_000);
    await chat({...settings,timeoutSeconds:240},'fake-key',[]); expect(timeout).toHaveBeenLastCalledWith(240_000);
    await expect(chat({...settings,timeoutSeconds:601},'fake-key',[])).rejects.toThrow(/15–600/);
  });
  it('reports timeout and response interruption honestly with no paid retry', async () => {
    vi.spyOn(AbortSignal,'timeout').mockImplementation(() => AbortSignal.abort(new DOMException('test timeout','TimeoutError')));
    const fetch=vi.fn(async (_url: string, init: RequestInit) => { throw init.signal!.reason; }); vi.stubGlobal('fetch',fetch);
    await expect(chat(settings,'fake-key',[])).rejects.toMatchObject({code:'timeout',message:expect.stringContaining('180 秒')}); expect(fetch).toHaveBeenCalledTimes(1);
    const stream=new ReadableStream({start(controller){controller.error(new DOMException('test','TimeoutError'));}});
    await expect(readLimited(new Response(stream))).rejects.toMatchObject({code:'timeout'});
  });
  it('does not confuse a response with no visible output with a validated model generation', async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{"choices":[{"message":{"content":"","reasoning_content":"some reasoning"},"finish_reason":"length"}]}')));
    await expect(chat(settings,'fake-key',[],undefined,true)).rejects.toMatchObject({code:'empty-content',message:expect.stringContaining('服务已返回响应')});
  });
});
