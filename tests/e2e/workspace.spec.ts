import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import baseline from '../../examples/intentkit/project.spec.json' with { type: 'json' };
import proposal from '../../examples/intentkit/custom-recipe.proposal.json' with { type: 'json' };
import type { Workspace } from '../../src/domain/types';
async function saved(p: Page) { await expect(p.getByTestId('save-status')).toHaveText('已保存到本机'); }
async function nav(p: Page, name: string) { await p.getByRole('navigation').getByRole('button', { name, exact: true }).click(); }
async function stored(p: Page): Promise<Workspace> {
  return p.evaluate(() => new Promise<Workspace>((resolve, reject) => {
    const request = indexedDB.open('psw-local-workspace', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result, tx = db.transaction('workspaces'); const get = tx.objectStore('workspaces').get('active'); get.onsuccess = () => resolve(get.result.value); get.onerror = () => reject(get.error); tx.oncomplete = () => db.close(); };
  }));
}
async function importProposal(p: Page) { await p.getByLabel('导入候选提案文件', { exact: true }).setInputFiles({ name: 'candidate.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(proposal)) }); }
async function approve(p: Page) { await p.getByLabel('审批说明').fill('人工核对后接受这一轮'); await p.getByRole('button', { name: /批准并创建/ }).click(); await saved(p); }
async function keySetup(p: Page) {
  await p.getByRole('button', { name: '连接 TokenDance', exact: true }).click();
  await p.getByText('已有 Key 或使用其他兼容服务', { exact: true }).click();
  await p.getByLabel('临时 API Key', { exact: true }).fill('fake-e2e-secret-never-persist');
  await p.getByRole('button', { name: '仅在本页使用此 Key' }).click();
  await p.getByLabel('模型', { exact: true }).fill('fixture-model');
  await p.getByRole('button', { name: '关闭连接设置', exact: true }).click();
  await p.getByLabel('告诉 AI 你想修改什么').fill('创建自定义配方并提供交互和验收');
  await p.getByLabel('确认发送所示上下文，费用由我承担').check();
}
test.beforeEach(async ({ page }) => { page.on('dialog', (d) => void d.accept()); await page.goto('./'); await saved(page); });
test('four useful tabs, first-area BYOK, direct Markdown and corner tools; no automatic external calls', async ({ page }, info) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:4173/')) external.push(r.url()); });
  await page.reload(); await saved(page);
  await expect(page.getByRole('navigation').getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'AI 协作' })).toBeVisible();
  await expect(page.getByLabel('规范正文')).toBeEditable();
  for (const name of ['代码交接','项目数据','JSON 规范']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(400);
  if (info.project.name !== 'firefox') await page.screenshot({ path: `docs/m5-document-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
test('five free-written requirements, incomplete typing, edit and refresh preserve stable indices', async ({ page }) => {
  const editor = page.getByLabel('规范正文'); const initial = await editor.inputValue();
  let md = initial.replace('## 补充说明', Array.from({ length: 5 }, (_, i) => `### 独立需求 ${i + 1}\n\n完整描述 ${i + 1}\n\n#### 验收标准\n- 内容可以编辑并恢复\n`).join('\n') + '\n## 补充说明');
  await editor.fill(md); await editor.blur(); await saved(page);
  expect((await stored(page)).draft.requirements.map((r) => r.id)).toEqual(['REQ-IK-001','REQ-101','REQ-102','REQ-103','REQ-104','REQ-105']);
  await editor.fill('## 需求与验收\n###'); await saved(page);
  expect((await stored(page)).draft.requirements).toHaveLength(6);
  md = md.replace('独立需求 3', '第三条改过的真实需求'); await editor.fill(md); await editor.blur(); await saved(page); await page.reload(); await saved(page);
  await expect(editor).toHaveValue(md); expect((await stored(page)).draft.requirements[3].id).toBe('REQ-103'); expect((await stored(page)).approved).toEqual(baseline);
});
test('offline editing, undo/redo, explicit approval and rollback make real new revisions', async ({ page, context }) => {
  await context.setOffline(true); const editor = page.getByLabel('规范正文'); const md = await editor.inputValue();
  await editor.fill(md.replace('已有悬停抬升效果可调','离线修改也能保存')); await editor.blur(); await saved(page);
  await page.getByRole('button', { name: '撤销', exact: true }).click(); await page.getByRole('button', { name: '重做', exact: true }).click();
  await nav(page,'审阅'); await approve(page); await expect(page.getByTestId('approved-revision')).toHaveText('r2');
  await nav(page,'历史'); await page.getByRole('button', { name: '回退至 r1', exact: true }).click(); await saved(page);
  expect((await stored(page)).approved.revision).toBe(3); expect((await stored(page)).approved.requirements).toEqual(baseline.requirements);
});
test('real controls change hover transform, review data and handoff reimport keeps parameters', async ({ page }, info) => {
  await nav(page,'体验'); const slider = page.getByRole('slider').first(); await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  const card = page.getByTestId('runtime-card'); await card.focus();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -1)');
  await page.getByRole('button', { name: '将当前参数写入草稿', exact: true }).click(); await saved(page);
  expect((await stored(page)).draft.experiences[0].state.lift_px).toBe(1); expect((await stored(page)).approved.experiences[0].state.lift_px).toBe(6);
  if (info.project.name !== 'firefox') await page.screenshot({ path: `docs/m5-experience-${info.project.name}.png`, fullPage: true });
  await nav(page,'审阅'); await approve(page); await page.getByRole('button', { name: '代码交接', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出 Codex 交接包', exact: true }).click(); const d = await download;
  const bytes = await readFile((await d.path())!); const zip = await JSZip.loadAsync(bytes);
  const exported = JSON.parse(await zip.file('product-spec/project.spec.json')!.async('string')); expect(exported.experiences[0].state.lift_px).toBe(1); expect(zip.file('CODEX_TASK.md')).not.toBeNull();
  await page.getByRole('button', { name: '关闭工具' }).click();
  await page.getByLabel('导入规范文件', { exact: true }).setInputFiles({ name:'handoff.zip', mimeType:'application/zip', buffer:bytes }); await saved(page);
  expect((await stored(page)).approved).toEqual(exported);
});
test('fixed proposal is explicitly imported, recipe validation blocks success, approved r2 has complete links', async ({ page }) => {
  await importProposal(page); expect((await stored(page)).approved).toEqual(baseline); await approve(page);
  const w = await stored(page); expect(w.approved.revision).toBe(2); expect(w.approved.tests[1].status).toBe('not-run');
  await nav(page,'体验'); const recipe = page.locator('.experience-studio').nth(1);
  await recipe.getByRole('button', { name:'校验并预览', exact:true }).click(); await expect(recipe.getByRole('alert')).toBeVisible();
  expect((await stored(page)).approved.experiences[1].state.isReady).toBe(false);
  await recipe.getByRole('textbox').fill('自定义清晰配方'); await recipe.getByRole('button', { name:'校验并预览', exact:true }).click();
  await expect(recipe.locator('.runtime-message')).toContainText('校验通过'); await recipe.getByRole('button', { name:'将当前参数写入草稿' }).click(); await saved(page);
  expect((await stored(page)).draft.experiences[1].state.isReady).toBe(true);
});
test('simulated BYOK response creates a candidate only; Key absent from storage and exports, cleared after reload', async ({ page }) => {
  let calls = 0;
  await page.route('https://tokendance.space/gateway/v1/chat/completions', async (route) => { calls++; expect(route.request().headers().authorization).toBe('Bearer fake-e2e-secret-never-persist'); await route.fulfill({ json:{ choices:[{ message:{ content:JSON.stringify(proposal) } }] } }); });
  await keySetup(page); await page.getByRole('button', { name:'生成候选修改 ↑' }).click(); await expect(page.getByRole('heading', { name:/候选提案/ })).toBeVisible(); await saved(page);
  expect(calls).toBe(1); expect((await stored(page)).approved).toEqual(baseline); expect(JSON.stringify(await stored(page))).not.toContain('fake-e2e-secret');
  expect(await page.evaluate(() => JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]))).not.toContain('fake-e2e-secret');
  await page.getByRole('button', { name:'项目数据', exact:true }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name:'导出完整 JSON 备份' }).click(); expect(await readFile((await (await download).path())!,'utf8')).not.toContain('fake-e2e-secret');
  await page.getByRole('button', { name:'关闭工具' }).click(); await page.reload(); await saved(page); await expect(page.getByRole('button', { name:'生成候选修改 ↑' })).toBeDisabled();
});
for (const status of [401,429]) test(`simulated HTTP ${status} keeps text, sends once and shows useful failure`, async ({ page }) => {
  let calls = 0; await page.route('https://tokendance.space/gateway/v1/chat/completions', async (route) => { calls++; await route.fulfill({status,body:'fake-provider-secret-error'}); });
  const original = await page.getByLabel('规范正文').inputValue(); await keySetup(page); await page.getByRole('button', {name:'生成候选修改 ↑'}).click();
  await expect(page.getByRole('alert')).toContainText(status === 401 ? '凭据' : '频率'); expect(calls).toBe(1); await expect(page.getByLabel('规范正文')).toHaveValue(original); expect((await stored(page)).approved).toEqual(baseline);
});
test('simulated network and invalid proposal never replace manual prose or create false success', async ({ page }) => {
  await page.route('https://tokendance.space/gateway/v1/chat/completions', (route) => route.abort('failed')); await keySetup(page); await page.getByRole('button',{name:'生成候选修改 ↑'}).click(); await expect(page.getByRole('alert')).toContainText('网络');
  await page.unroute('https://tokendance.space/gateway/v1/chat/completions'); await page.route('https://tokendance.space/gateway/v1/chat/completions', (route) => route.fulfill({json:{choices:[{message:{content:'{"operations":[{"op":"executeJS"}]}'}}]}}));
  await page.getByRole('button',{name:'生成候选修改 ↑'}).click(); await expect(page.getByRole('alert')).toContainText('未通过规范检查'); expect((await stored(page)).proposal).toBeNull();
});
test('editing while a simulated model request is running makes candidate stale', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('https://tokendance.space/gateway/v1/chat/completions', async (route) => { await gate; await route.fulfill({json:{choices:[{message:{content:JSON.stringify(proposal)}}]}}); });
  await keySetup(page); await page.getByRole('button',{name:'生成候选修改 ↑'}).click(); await expect(page.getByRole('button',{name:'取消请求'})).toBeVisible();
  const editor=page.getByLabel('规范正文'); await editor.fill((await editor.inputValue())+'\n手动后续修改'); await editor.blur(); release();
  await expect(page.getByRole('alert').filter({hasText:'候选已过期'})).toContainText('候选已过期'); await page.getByLabel('审批说明').fill('不应能覆盖'); await expect(page.getByRole('button',{name:/批准并创建/})).toBeDisabled();
  await saved(page); expect((await stored(page)).draft.unstructuredNotes.join('')).toContain('手动后续修改');
});
test('simulated PKCE popup callback exchanges code and verifier without persisting credentials', async ({ page, context }) => {
  await context.route('https://tokendance.space/auth?**', (r) => r.fulfill({contentType:'text/html',body:'<p>SIMULATED authorization for automated test only</p>'}));
  await page.route('https://tokendance.space/portal/api/v1/auth/keys', async (r) => { const body=r.request().postDataJSON(); expect(body.code).toBe('fake-one-use-code'); expect(body.code_verifier).toMatch(/^[a-zA-Z0-9_-]{43,128}$/); await r.fulfill({json:{key:'fake-oauth-never-persist'}}); });
  await page.getByRole('button',{name:'连接 TokenDance',exact:true}).click(); const popupPromise=page.waitForEvent('popup'); await page.getByRole('button',{name:'授权 TokenDance 钱包'}).click(); const popup=await popupPromise;
  await expect.poll(()=>popup.url()).toContain('code_challenge_method=S256'); const url=new URL(popup.url()); const callback=url.searchParams.get('callback_url')!; expect(callback).toContain('/accord/oauth-callback.html?state=');
  await popup.evaluate((url) => { location.href = url; }, callback+'&code=fake-one-use-code'); await expect(page.getByText('TokenDance 授权完成。Key 仅在当前页面内存，下一步选择模型并测试连接。')).toBeVisible();
  expect(JSON.stringify(await stored(page))).not.toContain('fake-oauth'); await expect(page.getByLabel('临时 API Key',{exact:true})).toBeHidden();
});
test('malicious imports leave original data and do not execute Markdown scripts', async ({ page }) => {
  await page.getByLabel('导入规范文件',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"__proto__":{"polluted":true}}')}); await expect(page.getByRole('alert')).toContainText('危险'); expect((await stored(page)).approved).toEqual(baseline);
  await page.getByLabel('规范正文').fill('# 安全预览\n<script>window.PWNED=true</script>\n[坏链接](javascript:alert(1))'); await page.getByLabel('规范正文').blur(); await saved(page);
  await page.getByRole('button', { name: '阅读预览', exact: true }).click();
  expect(await page.evaluate(()=> 'PWNED' in window)).toBe(false); await expect(page.locator('.markdown-preview script')).toHaveCount(0); await expect(page.locator('.markdown-preview a[href^="javascript:"]')).toHaveCount(0);
});
test('two tabs detect CAS conflict and preserve the unsaved page for backup', async ({ page, context }) => {
  const other=await context.newPage(); await other.goto('./'); await saved(other);
  await page.getByLabel('规范正文').fill((await page.getByLabel('规范正文').inputValue())+'\n第一页修改'); await page.getByLabel('规范正文').blur(); await saved(page);
  await other.getByLabel('规范正文').fill((await other.getByLabel('规范正文').inputValue())+'\n第二页修改'); await other.getByLabel('规范正文').blur(); await expect(other.getByTestId('save-status')).toContainText('冲突');
  await expect(other.getByLabel('规范正文')).toHaveValue(/第二页修改/); await expect(other.getByRole('button',{name:'导出本页完整备份'})).toBeEnabled(); await other.close();
});
test('100 requirements stay directly editable and Markdown import becomes the actual document', async ({ page }) => {
  const md = '# 大项目\n\n## 产品目标\n可靠地编辑\n\n## 需求与验收\n\n' + Array.from({length:100},(_,i)=>`### 批量需求 ${i+1}\n\n完整说明 ${i+1}\n\n#### 验收标准\n- 可以保存和恢复\n\n`).join('');
  await page.getByLabel('导入规范文件',{exact:true}).setInputFiles({name:'large.md',mimeType:'text/markdown',buffer:Buffer.from(md)}); await saved(page); await expect(page.getByLabel('规范正文')).toHaveValue(md);
  expect((await stored(page)).draft.requirements).toHaveLength(100);
  await page.getByLabel('规范正文').fill(md.replace('批量需求 50','第50条已独立修改')); await page.getByLabel('规范正文').blur(); await saved(page); await page.reload(); await saved(page);
  expect((await stored(page)).draft.requirements[49].title).toBe('第50条已独立修改'); await expect(page.getByLabel('规范正文')).toHaveValue(/第50条已独立修改/);
});
test('component properties enter the real draft; unsupported data cannot replace it; keyboard dialog returns focus', async ({ page }) => {
  await nav(page,'体验'); await page.getByRole('button',{name:'编辑组件 悬停查看效果'}).click(); await page.getByLabel('显示文案').fill('更清楚的悬停说明'); await page.getByRole('button',{name:'更新组件'}).click(); await saved(page);
  expect((await stored(page)).draft.experiences[0].components[0].label).toBe('更清楚的悬停说明');
  const previous=(await stored(page)).draft; await page.getByRole('button',{name:'项目数据',exact:true}).click(); await page.getByText('交互配置（白名单 JSON）',{exact:true}).click(); await page.getByLabel('交互配置',{exact:true}).fill('[{"type":"executeJS"}]'); await page.getByRole('button',{name:'校验并写入交互草稿'}).click(); await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  expect((await stored(page)).draft).toEqual(previous); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('button',{name:'项目数据',exact:true})).toBeFocused();
});
test('reduced motion is explicit and imported image URLs require a user click', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'}); await nav(page,'体验'); await expect(page.locator('.motion-note').first()).toBeVisible(); await page.getByTestId('runtime-card').focus(); await expect.poll(()=>page.getByTestId('runtime-card').evaluate((e)=>getComputedStyle(e).transform)).toBe('none');
  let external=0; await page.route('https://tracking.invalid/**',r=>{external++;return r.abort();}); await nav(page,'规范'); await page.getByLabel('规范正文').fill('# 文档\n![导入图片](https://tracking.invalid/pixel)'); await page.getByLabel('规范正文').blur(); await saved(page); await page.getByRole('button',{name:'阅读预览',exact:true}).click(); await expect(page.getByRole('link',{name:'图片：导入图片'})).toBeVisible(); expect(external).toBe(0);
});
test('candidate can become editable prose before any approval and can still be rejected', async ({ page }) => {
  await importProposal(page); await page.getByRole('button',{name:'继续编辑候选'}).click(); await expect(page.getByLabel('规范正文')).toBeEditable(); await saved(page);
  expect((await stored(page)).draft.requirements).toHaveLength(2); expect((await stored(page)).approved).toEqual(baseline);
  const editor=page.getByLabel('规范正文'); await editor.fill((await editor.inputValue()).replace('通过自然语言或手动配置创建自定义配方','人工改写后的配方需求')); await editor.blur(); await saved(page);
  expect((await stored(page)).draft.requirements[1].id).toBe('REQ-IK-002'); await nav(page,'审阅'); await page.getByRole('button',{name:'放弃本轮草稿'}).click(); await saved(page); expect((await stored(page)).draft).toEqual(baseline);
});
test('cancelling a slow simulated request records its stage and elapsed time once without leaking a key', async ({ page }) => {
  let calls=0; await page.route('https://tokendance.space/gateway/v1/chat/completions',()=>{calls++;}); await keySetup(page);
  await page.getByRole('button',{name:'生成候选修改 ↑'}).click(); await expect(page.getByText(/生成候选 · 已等待/)).toBeVisible(); await expect.poll(() => calls).toBe(1); await page.getByRole('button',{name:'取消请求'}).click();
  await expect(page.getByRole('alert')).toContainText('生成候选失败'); await expect(page.getByRole('alert')).toHaveCount(1); expect(calls).toBe(1);
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'导出本次调用记录（无 Key）'}).click(); const record=JSON.parse(await readFile((await (await download).path())!,'utf8'));
  expect(record).toMatchObject({kind:'生成候选',status:'failed',serviceOrigin:'https://tokendance.space'}); expect(record.elapsedMs).toBeGreaterThanOrEqual(0); expect(JSON.stringify(record)).not.toContain('fake-e2e-secret'); expect((await stored(page)).approved).toEqual(baseline);
});

test('reading is a single view; review highlights changes and only expands full documents on request', async ({ page }, info) => {
  const editor=page.getByLabel('规范正文'); const original=await editor.inputValue();
  await editor.fill(original.replace('已有悬停抬升效果可调','键盘也能预览悬停效果')); await editor.blur(); await saved(page);
  await page.getByRole('button',{name:'阅读预览',exact:true}).click(); await expect(editor).toHaveCount(0); await expect(page.locator('.document-panel .markdown-preview')).toContainText('键盘也能预览悬停效果');
  await page.getByRole('button',{name:'返回编辑',exact:true}).click(); await expect(editor).toHaveValue(/键盘也能预览悬停效果/);
  await nav(page,'审阅'); await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0); await expect(page.locator('.reading-add')).toContainText('键盘也能预览悬停效果'); await expect(page.locator('.reading-remove')).toContainText('已有悬停抬升效果可调'); await expect(page.locator('.review-reading')).toBeHidden();
  await page.waitForTimeout(400); if(info.project.name!=='firefox') await page.screenshot({path:`docs/m5-review-${info.project.name}.png`,fullPage:true});
  await page.getByText('需要更多上下文？展开完整前后对照',{exact:true}).click(); await expect(page.locator('.review-reading')).toBeVisible();
  await expect(page.getByRole('button',{name:/批准并创建/})).toBeDisabled(); expect((await stored(page)).approved).toEqual(baseline);
});

test('rain and water effects expire, respect pause and reduced motion, and leave writing untouched', async ({ page }) => {
  const canvas=page.getByTestId('atmosphere'); await expect(canvas).toHaveAttribute('data-enabled','true');
  await page.locator('h1').click(); await expect.poll(()=>canvas.getAttribute('data-active-effects')).not.toBe('0');
  await page.waitForTimeout(1200); await expect(canvas).toHaveAttribute('data-active-effects','0');
  await page.getByLabel('规范正文').focus(); await page.mouse.wheel(0,250); await expect(canvas).toHaveAttribute('data-active-effects','0');
  await page.getByLabel('规范正文').blur(); await page.evaluate(()=>window.dispatchEvent(new Event('scroll'))); await expect.poll(()=>canvas.getAttribute('data-active-effects')).not.toBe('0');
  await page.getByRole('button',{name:'暂停装饰动效',exact:true}).click(); await expect(canvas).toHaveAttribute('data-enabled','false'); await expect(canvas).toHaveAttribute('data-active-effects','0');
  await page.locator('h1').click(); await expect(canvas).toHaveAttribute('data-active-effects','0');
  await page.getByRole('button',{name:'开启装饰动效',exact:true}).click(); await page.emulateMedia({reducedMotion:'reduce'}); await expect(canvas).toHaveAttribute('data-enabled','false'); await expect(canvas).toHaveAttribute('data-active-effects','0');
  await expect(page.getByRole('button',{name:'开启装饰动效',exact:true})).toBeDisabled();
});
