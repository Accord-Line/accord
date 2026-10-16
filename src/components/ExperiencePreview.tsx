import { useState } from 'react';
import type { Experience } from '../domain/types';
export function ExperiencePreview({ experience }: { experience: Experience }) {
  const [hovered, setHovered] = useState(false);
  const card = experience.components.find((c) => c.type === 'card');
  if (!card) return <div className="section-note">此场景的运行器尚未实现。原始组件与动作完整保留；完整运行器将在 M2 加入。</div>;
  const lift = card.bindings?.hoverLiftPx ? experience.state[card.bindings.hoverLiftPx] : card.props.hoverLiftPx;
  const duration = card.bindings?.durationMs ? experience.state[card.bindings.durationMs] : card.props.durationMs;
  if (typeof lift !== 'number' || typeof duration !== 'number') return <p>此场景未提供可预览的抬升参数。</p>;
  return <div className="preview-area"><div className="preview-caption"><span>HOVER LIFT / 基线预览</span><code>{lift}px · {duration}ms</code></div><div className="preview-stage"><button className="hover-card" data-testid="hover-card" style={{ transform: hovered ? `translateY(-${lift}px)` : 'translateY(0)', transitionDuration: `${duration}ms` }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}><span className="hover-symbol" aria-hidden="true">↗</span><strong>{card.label}</strong><small>也可使用 Tab 聚焦预览</small></button></div><p className="fine-print">独立 CSS 基线演示，不修改规范。系统偏好减少动态时立即切换位置。</p></div>;
}
