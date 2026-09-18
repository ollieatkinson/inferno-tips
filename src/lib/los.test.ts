import { describe, expect, it } from 'vitest';
import { lessons } from './course';
import { fieldLessons } from './curriculum';
import { drillLosSetups, losSetups } from './los';

describe('contextual LoS links', () => {
  it('provides a prepared scene for every spatial assignment and non-boss drill', () => {
    const assignments = fieldLessons.flatMap((l) =>
      l.los ? [l.los.setup] : [],
    );
    const drills = lessons.filter(
      (l) => !['jad', 'triples', 'blowpipe'].includes(l.id),
    );
    for (const drill of drills) expect(drillLosSetups[drill.id]).toBeDefined();
    for (const id of [...assignments, ...Object.values(drillLosSetups)]) {
      const url = new URL(losSetups[id!].href);
      expect(url.origin).toBe('https://los.inferno.tips');
      expect(url.hash).toMatch(/^#IL2-[A-Za-z0-9_-]+$/);
    }
    expect(fieldLessons.find((l) => l.id === 'blob-flinch')?.los?.setup).toBe(
      'blob-flinch',
    );
    expect(losSetups['blob-flinch'].href).not.toBe(losSetups.blob.href);
  });
});
