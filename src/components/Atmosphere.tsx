import { useEffect, useRef, useState } from 'react';

export function useDecorativeMotion() {
  const [enabled, setEnabled] = useState(true);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return { allowed: enabled && !reduced, reduced, toggle: () => setEnabled((value) => !value) };
}
type Effect = { x: number; y: number; born: number; kind: 'rain' | 'water'; strength: number };
// A transient decorative layer: no project state, network, storage or input interception.
export function Atmosphere({ enabled }: { enabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    const ctx = node.getContext('2d'); if (!ctx) return;
    let frame = 0, width = 0, height = 0, lastMove = 0, lastScroll = 0, lastX = -100, lastY = -100;
    let effects: Effect[] = [];
    const reset = () => { cancelAnimationFrame(frame); frame = 0; effects = []; ctx.clearRect(0, 0, width, height); node.dataset.activeEffects = '0'; };
    const resize = () => { const ratio = Math.min(devicePixelRatio || 1, 1.5); width = innerWidth; height = innerHeight; node.width = Math.round(width * ratio); node.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); reset(); };
    resize();
    if (!enabled) return reset;
    const editable = (target: EventTarget | null) => target instanceof Element && !!target.closest('input,textarea,select,option,[contenteditable],dialog,.markdown-preview,.markdown-editor,pre,[data-no-rain]');
    const draw = (now: number) => {
      frame = 0; ctx.clearRect(0, 0, width, height); effects = effects.filter((e) => now - e.born < 1050);
      for (const e of effects) {
        const t = (now - e.born) / 1050;
        ctx.lineWidth = .9; ctx.strokeStyle = `rgba(91,111,101,${(1 - t) * e.strength})`;
        for (let ring = 0; ring < 3; ring++) {
          const age = Math.max(0, t - ring * .1); if (!age) continue;
          const radius = 4 + (1 - Math.pow(1 - age, 3)) * (e.kind === 'rain' ? 55 : 100);
          ctx.beginPath(); ctx.ellipse(e.x, e.y, radius, radius * (e.kind === 'rain' ? .38 : .26), -.14, 0, Math.PI * 2); ctx.stroke();
        }
        if (e.kind === 'rain' && t < .4) {
          ctx.strokeStyle = `rgba(155,104,60,${(.4 - t) * .8})`;
          for (let i = 0; i < 7; i++) {
            const angle = i * 2.4, spread = 12 + i * 6, x = e.x + Math.cos(angle) * spread, y = e.y - 72 + i * 5 + t * 180;
            ctx.beginPath(); ctx.moveTo(x + 3, y - 11); ctx.lineTo(x, y); ctx.stroke();
          }
        }
      }
      node.dataset.activeEffects = String(effects.length);
      if (effects.length) frame = requestAnimationFrame(draw);
    };
    const emit = (x: number, y: number, kind: Effect['kind'], strength: number) => {
      if (document.hidden) return;
      effects.push({ x, y, kind, strength, born: performance.now() }); effects = effects.slice(-18); node.dataset.activeEffects = String(effects.length);
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const down = (e: PointerEvent) => { if (e.button === 0 && !editable(e.target)) emit(e.clientX, e.clientY, 'rain', .45); };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || editable(e.target) || performance.now() - lastMove < 110 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 55) return;
      lastMove = performance.now(); lastX = e.clientX; lastY = e.clientY; emit(e.clientX, e.clientY, 'water', .14);
    };
    const scroll = () => { if (performance.now() - lastScroll < 180 || document.activeElement?.matches('textarea,input,[contenteditable]')) return; lastScroll = performance.now(); emit(width - 36, height * .68, 'water', .25); };
    const keyboard = (e: KeyboardEvent) => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target; if (!(el instanceof HTMLElement) || !el.matches('button,a') || editable(el)) return; const rect = el.getBoundingClientRect(); emit(rect.x + rect.width / 2, rect.y + rect.height / 2, 'water', .3); };
    window.addEventListener('pointerdown', down, { passive: true }); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', resize); window.addEventListener('blur', reset); window.addEventListener('keydown', keyboard); document.addEventListener('visibilitychange', reset);
    return () => { reset(); window.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', resize); window.removeEventListener('blur', reset); window.removeEventListener('keydown', keyboard); document.removeEventListener('visibilitychange', reset); };
  }, [enabled]);
  return <canvas ref={canvas} className="atmosphere" aria-hidden="true" data-testid="atmosphere" data-enabled={enabled} />;
}
