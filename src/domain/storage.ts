import type { Workspace } from './types';
import { assertWorkspace } from './workspace';

export const DB_NAME = 'psw-local-workspace';
const STORE = 'workspaces';
export interface StoredWorkspace { generation: number; value: Workspace }
export class ConflictError extends Error { constructor() { super('其他标签页已保存更新。本页停止写入，请先导出本页备份，再载入最新版本。'); this.name = 'ConflictError'; } }
export class CorruptStorageError extends Error { constructor() { super('本地记录损坏，原数据已保留。可导出损坏记录，或保留副本后恢复。'); this.name = 'CorruptStorageError'; } }

async function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) throw new Error('浏览器不支持 IndexedDB，当前只能在页面内编辑，请导出备份。');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    let expired = false;
    const timer = setTimeout(() => { expired = true; reject(new Error('打开本地存储超时，请关闭其他旧页面后重试。')); }, 5000);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => { clearTimeout(timer); reject(request.error ?? new Error('无法打开本地存储。')); };
    request.onblocked = () => { expired = true; clearTimeout(timer); reject(new Error('本地存储升级被旧页面阻止，请关闭旧标签页后重试。')); };
    request.onsuccess = () => { clearTimeout(timer); if (expired) request.result.close(); else resolve(request.result); };
  });
}

function isRecord(input: unknown): input is StoredWorkspace {
  if (!input || typeof input !== 'object') return false;
  const r = input as Record<string, unknown>;
  if (Object.keys(r).some((k) => !['generation', 'value'].includes(k)) || !Number.isSafeInteger(r.generation) || Number(r.generation) < 1) return false;
  try { assertWorkspace(r.value); return true; } catch { return false; }
}

export async function readRawStored(): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get('active');
    let value: unknown;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('无法读取本地存储。')); };
  });
}
export async function readStored(): Promise<StoredWorkspace | null> {
  const raw = await readRawStored();
  if (raw === undefined) return null;
  if (!isRecord(raw)) throw new CorruptStorageError();
  return raw;
}

// Comparison and entire workspace write happen in the SAME readwrite transaction.
// Concurrent tabs serialize here; neither draft saves nor approvals can overwrite stale data.
export async function saveStored(value: Workspace, expectedGeneration: number | null): Promise<number> {
  assertWorkspace(value);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
    const store = tx.objectStore(STORE);
    const request = store.get('active');
    let reason: Error | null = null;
    const generation = (expectedGeneration ?? 0) + 1;
    request.onsuccess = () => {
      const raw: unknown = request.result;
      if (raw !== undefined && !isRecord(raw)) { reason = new CorruptStorageError(); tx.abort(); return; }
      const current = raw === undefined ? null : (raw as StoredWorkspace).generation;
      if (current !== expectedGeneration) { reason = new ConflictError(); tx.abort(); return; }
      store.put({ generation, value }, 'active');
    };
    tx.oncomplete = () => { db.close(); resolve(generation); };
    tx.onabort = () => { db.close(); reject(reason ?? tx.error ?? new Error('本地保存失败，请导出备份后重试。')); };
  });
}

// Explicit recovery archives damaged bytes before replacing the active pointer.
export async function recoverStored(value: Workspace): Promise<number> {
  assertWorkspace(value);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
    const store = tx.objectStore(STORE);
    const request = store.get('active');
    let reason: Error | null = null;
    request.onsuccess = () => {
      if (request.result !== undefined && isRecord(request.result)) { reason = new ConflictError(); tx.abort(); return; }
      if (request.result !== undefined) store.put(request.result, `recovery-${Date.now()}-${crypto.randomUUID()}`);
      store.put({ generation: 1, value }, 'active');
    };
    tx.oncomplete = () => { db.close(); resolve(1); };
    tx.onabort = () => { db.close(); reject(reason ?? tx.error ?? new Error('恢复失败，原数据保留。')); };
  });
}
