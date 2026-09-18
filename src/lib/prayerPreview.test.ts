import { describe, expect, it } from 'vitest';
import { lessons } from './course';
import { advance, initialState, supplyGoal, targetAt } from './engine';
import { prayerPreview } from './prayerPreview';

describe('guided prayer preview', () => {
  it.each(
    lessons.filter((l) => !['jad', 'triples', 'blowpipe'].includes(l.id)),
  )('$id preview leads to a correct full run', ({ id }) => {
    let state = initialState();
    let selected: import('./course').Prayer = 'off';
    while (state.tick < 36) {
      const before = structuredClone(state);
      const beats = prayerPreview(id, state, selected);
      expect(state).toEqual(before);
      expect(beats.length).toBe(Math.min(6, 36 - state.tick));
      const beat = beats[0];
      expect(beat.tick).toBe(state.tick + 1);
      selected = beat.prayer;
      state = advance(
        state,
        id,
        selected,
        targetAt(beat.tick, id),
        beat.tick % 4 === 2 ? supplyGoal(id, beat.tick) : null,
        { transitions: beat.tick > 1 ? ['off', 'magic'] : [] },
      );
    }
    expect(state.checks.every((c) => c.correct)).toBe(true);
    expect(prayerPreview(id, state, selected)).toEqual([]);
  });
  it('uses the actual blob read even when the learner starts with Ranged', () => {
    const state = advance(initialState(), 'blob', 'range', 12);
    expect(
      prayerPreview('blob', state, 'range')
        .slice(0, 3)
        .map((b) => b.prayer),
    ).toEqual(['range', 'range', 'magic']);
  });
  it('flags queued blob conflicts instead of promising a safe fixed pattern', () => {
    const state = advance(initialState(), 'alternate', 'range', 12);
    expect(
      prayerPreview('alternate', state, 'range').find((b) => b.tick === 4)
        ?.note,
    ).toContain('Queued blob conflicts');
  });
  it('distinguishes a held prayer from the off–on pair', () => {
    expect(
      prayerPreview('flick', initialState(), 'off').map((b) => b.action),
    ).toEqual([
      'Select',
      'Off → on',
      'Off → on',
      'Off → on',
      'Off → on',
      'Off → on',
    ]);
    expect(
      prayerPreview('two-tick', initialState(), 'off')
        .slice(0, 4)
        .map((b) => b.action),
    ).toEqual(['Select', 'Hold', 'Select', 'Hold']);
  });
  it('does not invent a prayer cycle for Jad or the weapon drill', () => {
    for (const id of ['jad', 'triples', 'blowpipe'] as const)
      expect(prayerPreview(id, initialState(), 'off')).toEqual([]);
  });
});
