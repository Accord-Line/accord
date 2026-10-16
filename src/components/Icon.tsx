export type IconName = 'quill' | 'play' | 'review' | 'history' | 'code' | 'archive' | 'braces' | 'rain' | 'pause' | 'spark' | 'close' | 'arrow' | 'read' | 'undo' | 'redo';
const paths: Record<IconName, string[]> = {
  quill: ['M5 20c2-6 5-12 13-16 3 5-2 11-8 12', 'm5 20 9-10', 'M4 21h7'],
  play: ['M7 4c5-2 12 0 13 6s-3 11-9 11S2 17 3 11', 'm10 8 6 4-6 4Z'],
  review: ['M4 7h14m-4-4 4 4-4 4', 'M20 17H6m4-4-4 4 4 4'],
  history: ['M4 10a8 8 0 1 1 1 8', 'M4 4v6h6', 'M12 7v5l4 2'],
  code: ['m8 6-6 6 6 6', 'm16 6 6 6-6 6', 'm14 3-4 18'],
  archive: ['M4 5c4-1 12-1 16 0v15H4Z', 'M3 5V2h18v3', 'M9 10h6m-3 0v6m-3-3 3 3 3-3'],
  braces: ['M9 3H7c-2 0-2 2-2 4v2c0 2-1 3-3 3 2 0 3 1 3 3v2c0 2 0 4 2 4h2', 'M15 3h2c2 0 2 2 2 4v2c0 2 1 3 3 3-2 0-3 1-3 3v2c0 2 0 4-2 4h-2'],
  rain: ['M5 9c-1-5 6-7 8-3 5-2 9 5 4 7H5c-4 0-4-5 0-5', 'm6 16-2 3m8-3-2 5m8-5-2 3'],
  pause: ['M8 4v16', 'M16 4v16', 'M3 22c4-2 14-2 18 0'],
  spark: ['M12 2c0 7 3 10 10 10-7 0-10 3-10 10 0-7-3-10-10-10 7 0 10-3 10-10Z', 'M20 2v4m-2-2h4'],
  close: ['m5 5 14 14', 'M19 5 5 19'],
  arrow: ['M3 17c5-1 10-5 16-12', 'M11 5h8v8'],
  read: ['M2 5c5-2 8-1 10 1 2-2 6-3 10-1v15c-4-2-8-2-10 0-2-2-5-2-10 0Z', 'M12 6v14'],
  undo: ['M7 7c9-7 18 5 11 12', 'M3 3v8h8'],
  redo: ['M17 7C8 0-1 12 6 19', 'M21 3v8h-8'],
};
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`ink-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name].map((d, i) => <path key={i} d={d} />)}</svg>;
}
