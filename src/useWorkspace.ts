import { useCallback, useEffect, useRef, useState } from 'react';
import type { Workspace } from './domain/types';
import { assertWorkspace } from './domain/workspace';
import { ConflictError, CorruptStorageError, readStored, recoverStored, saveStored } from './domain/storage';

export type SaveStatus = 'loading' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
export function useWorkspace(initial: Workspace) {
  const [workspace, setWorkspace] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [storageError, setStorageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const state = useRef(initial);
  const generation = useRef<number | null>(null);
  const lastSaved = useRef<Workspace | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const blocked = useRef(false);
  const locked = useRef(false);

  const assign = useCallback((value: Workspace) => { state.current = value; setWorkspace(value); }, []);
  const fail = useCallback((error: unknown) => {
    const conflict = error instanceof ConflictError;
    blocked.current = conflict || error instanceof CorruptStorageError;
    setStatus(conflict ? 'conflict' : 'error');
    setStorageError(error instanceof Error ? error.message : '浏览器存储失败，请导出备份。');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await readStored();
        if (cancelled) return;
        if (stored) { generation.current = stored.generation; lastSaved.current = stored.value; assign(stored.value); setStatus('saved'); }
        else {
          try {
            const gen = await saveStored(initial, null);
            if (cancelled) return;
            generation.current = gen; lastSaved.current = initial; assign(initial); setStatus('saved');
          } catch (e) {
            if (!(e instanceof ConflictError)) throw e;
            const latest = await readStored();
            if (cancelled || !latest) return;
            generation.current = latest.generation; lastSaved.current = latest.value; assign(latest.value); setStatus('saved');
          }
        }
      } catch (e) { if (!cancelled) fail(e); }
      finally { if (!cancelled) setReady(true); }
    })();
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [initial, assign, fail]);

  const persist = useCallback((value: Workspace) => {
    queue.current = queue.current.then(async () => {
      if (blocked.current) return false;
      if (lastSaved.current === value) return true;
      setStatus('saving');
      try {
        generation.current = await saveStored(value, generation.current);
        lastSaved.current = value;
        setStorageError(''); setStatus(state.current === value ? 'saved' : 'pending');
        return true;
      } catch (e) { fail(e); return false; }
    });
    return queue.current;
  }, [fail]);

  const update = useCallback((transform: (w: Workspace) => Workspace) => {
    if (!ready || locked.current) throw new Error('请等待当前存储操作完成。');
    if (blocked.current) throw new Error('存储存在冲突或损坏；请先导出本页备份并载入最新版本。');
    const next = transform(state.current);
    if (next === state.current) return;
    assertWorkspace(next);
    assign(next); setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void persist(state.current); }, 300);
  }, [ready, assign, persist]);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    await queue.current;
    return persist(state.current);
  }, [persist]);

  const transact = useCallback(async (transform: (w: Workspace) => Workspace) => {
    if (locked.current || !ready) throw new Error('请等待当前操作完成。');
    locked.current = true; setBusy(true);
    try {
      if (!await flush()) throw new Error('本地保存尚未成功，未提交批准或替换操作。请导出备份并重试。');
      const next = transform(state.current);
      assertWorkspace(next);
      try { generation.current = await saveStored(next, generation.current); }
      catch (e) { fail(e); throw e; }
      lastSaved.current = next; assign(next); setStorageError(''); setStatus('saved');
    } catch (e) { if (e instanceof ConflictError || e instanceof CorruptStorageError || (e instanceof DOMException)) fail(e); throw e; }
    finally { locked.current = false; setBusy(false); }
  }, [ready, flush, assign, fail]);

  const reload = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    locked.current = true; setBusy(true);
    try {
      await queue.current;
      const record = await readStored();
      if (!record) throw new Error('没有可恢复的本地记录。');
      generation.current = record.generation; lastSaved.current = record.value; blocked.current = false;
      assign(record.value); setStorageError(''); setStatus('saved');
    } catch (e) { fail(e); }
    finally { locked.current = false; setBusy(false); }
  }, [assign, fail]);
  const recover = useCallback(async (value: Workspace) => {
    locked.current = true; setBusy(true);
    try {
      generation.current = await recoverStored(value); lastSaved.current = value; blocked.current = false;
      assign(value); setStorageError(''); setStatus('saved');
    } catch (e) { fail(e); }
    finally { locked.current = false; setBusy(false); }
  }, [assign, fail]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (status !== 'saved') event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [status]);

  return { workspace, update, transact, flush, reload, recover, status, storageError, busy, ready, isBlocked: blocked.current };
}
