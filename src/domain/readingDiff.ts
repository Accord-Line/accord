export type ReadingLine = { kind: 'same' | 'add' | 'remove'; text: string };
// Bound LCS work. Large rewrites fall back to complete removed/added middle blocks.
export function readingDiff(before: string, after: string): ReadingLine[] {
  if (before === after) return [];
  const a = before.split('\n'), b = after.split('\n'); let prefix = 0, suffix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix++;
  const left = a.slice(prefix, a.length - suffix), right = b.slice(prefix, b.length - suffix);
  const result: ReadingLine[] = a.slice(Math.max(0, prefix - 2), prefix).map((text) => ({ kind: 'same', text }));
  if (left.length * right.length > 250_000) {
    for (const text of left) result.push({ kind: 'remove', text });
    for (const text of right) result.push({ kind: 'add', text });
  }
  else {
    const lengths = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
    for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) lengths[i][j] = left[i] === right[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    let i = 0, j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) { result.push({ kind: 'same', text: left[i++] }); j++; }
      else if (i < left.length && (j === right.length || lengths[i + 1][j] >= lengths[i][j + 1])) result.push({ kind: 'remove', text: left[i++] });
      else result.push({ kind: 'add', text: right[j++] });
    }
  }
  result.push(...a.slice(a.length - suffix, Math.min(a.length, a.length - suffix + 2)).map((text): ReadingLine => ({ kind: 'same', text })));
  return result;
}
