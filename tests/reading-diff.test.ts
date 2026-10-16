import { describe, expect, it } from 'vitest';
import { readingDiff } from '../src/domain/readingDiff';

describe('human reading diff', () => {
  it('shows changes with a small amount of surrounding context', () => {
    const diff = readingDiff('a\nb\nc\nold\nd\ne\nf', 'a\nb\nc\nnew\nd\ne\nf');
    expect(diff).toEqual([{ kind:'same', text:'b' }, { kind:'same', text:'c' }, { kind:'remove', text:'old' }, { kind:'add', text:'new' }, { kind:'same', text:'d' }, { kind:'same', text:'e' }]);
  });
  it('keeps separated additions, deletions, blank lines and repeated lines', () => {
    const before = 'title\nkeep\nremove\nkeep\n\nlast', after = 'title\nkeep\nkeep\n\nadded\nlast';
    const diff = readingDiff(before, after);
    expect(diff.filter((l) => l.kind !== 'add').map((l) => l.text).join('\n')).toBe(before);
    expect(diff.filter((l) => l.kind !== 'remove').map((l) => l.text).join('\n')).toBe(after);
  });
  it('returns no repeated document when nothing changed', () => { expect(readingDiff('same', 'same')).toEqual([]); expect(readingDiff('', '')).toEqual([]); });
  it('preserves every changed line for large rewrites without a quadratic matrix', () => {
    const before = Array.from({length:900}, (_,i) => `old ${i}`).join('\n'), after = Array.from({length:900}, (_,i) => `new ${i}`).join('\n');
    const diff = readingDiff(before, after);
    expect(diff.filter((l) => l.kind === 'remove').map((l) => l.text).join('\n')).toBe(before);
    expect(diff.filter((l) => l.kind === 'add').map((l) => l.text).join('\n')).toBe(after);
  });
});
