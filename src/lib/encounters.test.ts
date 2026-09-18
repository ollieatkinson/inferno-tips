import { describe, expect, it } from 'vitest';
import { advance, initialState, targetAt } from './engine';
import { enemiesFor, monsterEvents } from './encounters';

describe('visible enemy timing', () => {
  it('shows both threats during alternating and movement drills', () => {
    for (const id of ['alternate', 'gauntlet', 'two-tick'] as const)
      expect(enemiesFor(id).map((e) => e.type)).toEqual(['mager', 'blob']);
    expect(enemiesFor('movement').map((e) => e.type)).toEqual([
      'mager',
      'ranger',
    ]);
    expect(enemiesFor('double-blob').map((e) => e.id)).toEqual([
      'mager',
      'blob',
      'blob-b',
    ]);
  });
  it('separates the mager attack, blob read and delayed blob attack', () => {
    let state = initialState();
    for (let tick = 1; tick <= 9; tick++)
      state = advance(
        state,
        'gauntlet',
        tick % 2 ? 'magic' : 'range',
        targetAt(tick),
      );
    expect(
      state.monsterEvents.filter((e) => e.enemy === 'mager').map((e) => e.tick),
    ).toEqual([1, 5, 9]);
    expect(
      state.monsterEvents
        .filter((e) => e.enemy === 'blob')
        .map((e) => [e.tick, e.kind, e.style]),
    ).toEqual([
      [1, 'read', 'range'],
      [4, 'attack', 'range'],
      [7, 'read', 'range'],
    ]);
  });
  it('uses what the blob actually read, including a mistaken anchor prayer', () => {
    let state = advance(initialState(), 'alternate', 'range', 12);
    for (let tick = 2; tick <= 4; tick++)
      state = advance(state, 'alternate', 'magic', 12);
    expect(state.monsterEvents.at(-1)).toMatchObject({
      tick: 4,
      enemy: 'blob',
      kind: 'attack',
      style: 'magic',
    });
  });
  it('distinguishes the two blob attack phases', () => {
    let state = initialState();
    for (let tick = 1; tick <= 5; tick++)
      state = advance(state, 'double-blob', tick % 2 ? 'magic' : 'range', 12);
    expect(
      state.monsterEvents.filter(
        (e) => e.kind === 'attack' && e.enemy.startsWith('blob'),
      ),
    ).toEqual([
      { tick: 4, enemy: 'blob', kind: 'attack', style: 'range' },
      { tick: 5, enemy: 'blob-b', kind: 'attack', style: 'magic' },
    ]);
  });
  it('shows physical attack intervals instead of every prayer-pattern check', () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      monsterEvents('reverse', i + 1, 'off', 'off', 0),
    ).flat();
    expect(events.filter((e) => e.enemy === 'bat').map((e) => e.tick)).toEqual([
      1, 4, 7, 10,
    ]);
    expect(
      events.filter((e) => e.enemy === 'mager').map((e) => e.tick),
    ).toEqual([1, 5, 9]);
    expect(monsterEvents('stack-one', 2, 'off', 'off', 0)).toEqual([
      { tick: 2, enemy: 'ranger', kind: 'attack', style: 'range' },
    ]);
  });
  it('gives each Jad its own cue three ticks before its check', () => {
    const events = Array.from({ length: 13 }, (_, i) =>
      monsterEvents('triples', i, 'off', 'off', 72),
    ).flat();
    for (const cue of events.filter((e) => e.kind === 'cue' && e.tick <= 9)) {
      expect(
        events.find(
          (e) =>
            e.enemy === cue.enemy &&
            e.kind === 'attack' &&
            e.tick === cue.tick + 3,
        )?.style,
      ).toBe(cue.style);
    }
    expect(
      events.filter((e) => e.kind === 'cue').map((e) => [e.tick, e.enemy]),
    ).toEqual([
      [0, 'jad-0'],
      [3, 'jad-1'],
      [6, 'jad-2'],
      [9, 'jad-0'],
      [12, 'jad-1'],
    ]);
  });
});
