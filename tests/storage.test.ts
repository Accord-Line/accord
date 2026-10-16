import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import baseline from '../examples/intentkit/project.spec.json';
import { createWorkspace, approveDraft, editDraft } from '../src/domain/workspace';
import { ConflictError, CorruptStorageError, DB_NAME, readRawStored, readStored, recoverStored, saveStored } from '../src/domain/storage';
import { validateProject } from '../src/domain/validation';

function start() { const check = validateProject(structuredClone(baseline)); if (!check.valid) throw new Error('fixture'); return createWorkspace(check.value); }
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); });
describe('M1 IndexedDB transactions', () => {
  it('saves and restores a complete workspace', async () => {
    expect(await readStored()).toBeNull(); const w = start(); expect(await saveStored(w, null)).toBe(1);
    expect(await readStored()).toEqual({ generation: 1, value: w });
  });
  it('two racing tabs cannot both commit the same base generation', async () => {
    const w = start(); await saveStored(w, null);
    const a = editDraft(w, (d) => { d.project.description = '标签页 A'; });
    const b = editDraft(w, (d) => { d.project.description = '标签页 B'; });
    const results = await Promise.allSettled([saveStored(a, 1), saveStored(b, 1)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected'); expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(ConflictError);
    expect((await readStored())!.generation).toBe(2);
  });
  it('stale approval cannot overwrite a saved draft or approved revision', async () => {
    const w = start(); await saveStored(w, null);
    const drafted = editDraft(w, (d) => { d.project.description = '最新草稿'; }); await saveStored(drafted, 1);
    const approved = approveDraft(drafted, '人工审阅');
    await expect(saveStored(approved, 1)).rejects.toBeInstanceOf(ConflictError);
    expect((await readStored())!.value.approved.revision).toBe(1);
  });
  it('rejects corrupt data without silently clearing it; explicit recovery archives it', async () => {
    await readStored();
    await new Promise<void>((resolve) => { const request = indexedDB.open(DB_NAME, 1); request.onsuccess = () => { const db = request.result; const tx = db.transaction('workspaces', 'readwrite'); tx.objectStore('workspaces').put({ damaged: 'original bytes' }, 'active'); tx.oncomplete = () => { db.close(); resolve(); }; }; });
    await expect(readStored()).rejects.toBeInstanceOf(CorruptStorageError);
    await expect(saveStored(start(), null)).rejects.toBeInstanceOf(CorruptStorageError);
    expect(await readRawStored()).toEqual({ damaged: 'original bytes' });
    await recoverStored(start()); expect((await readStored())!.generation).toBe(1);
    const count = await new Promise<number>((resolve) => { const r = indexedDB.open(DB_NAME, 1); r.onsuccess = () => { const db = r.result; const tx = db.transaction('workspaces'); const req = tx.objectStore('workspaces').count(); req.onsuccess = () => resolve(req.result); tx.oncomplete = () => db.close(); }; });
    expect(count).toBe(2);
  });
  it('does not force-recover over a valid project changed by another tab', async () => {
    await saveStored(start(), null); await expect(recoverStored(start())).rejects.toBeInstanceOf(ConflictError);
  });
  it('reports unavailable browser storage instead of claiming success', async () => {
    vi.stubGlobal('indexedDB', undefined); await expect(saveStored(start(), null)).rejects.toThrow(/IndexedDB/);
  });
});
