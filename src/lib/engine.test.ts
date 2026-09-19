import { nextBlowpipeTile } from './blowpipe';
import { describe, expect, it } from 'vitest';
import {
  accuracy,
  scoredChecks,
  advance,
  coaching,
  initialState,
  targetAt,
  supplyGoal,
  jadStyle,
} from './engine';
import { lessons, TOTAL_TICKS, type LessonId, type Prayer } from './course';
import { parseProgress, recordRun } from './progress';

function perfectPrayer(id: LessonId, tick: number): Prayer {
  if (['rhythm', 'food', 'potions'].includes(id))
    return tick % 4 === 1 ? 'magic' : 'off';
  if (id === 'bat') return tick % 3 === 1 ? 'range' : 'off';
  if (id === 'flick') return 'magic';
  if (id === 'two-tick') return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  if (id === 'two-tick-repair') return tick % 4 < 2 ? 'magic' : 'range';
  if (id === 'anchor-range') return tick % 2 ? 'range' : 'magic';
  if (id === 'stack-one') return tick % 4 === 1 ? 'magic' : 'range';
  if (id === 'reverse') return tick % 4 === 1 ? 'magic' : 'range';
  if (id === 'melee-blob')
    return (['melee', 'range', 'magic', 'range'] as Prayer[])[(tick - 1) % 4];
  if (id === 'jad' || id === 'triples') return jadStyle(id, tick);
  if (id === 'blob')
    return Math.floor((tick - 1) / 3) % 2 === 0 ? 'magic' : 'range';
  if (id === 'stack' || id === 'movement')
    return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  return tick % 2 === 1 ? 'magic' : 'range';
}
describe('drill mechanics', () => {
  it('explains an alternating rhythm that starts on the wrong phase', () => {
    let state = initialState();
    for (let tick = 1; tick <= TOTAL_TICKS; tick++)
      state = advance(state, 'alternate', tick % 2 ? 'range' : 'magic', 12);
    expect(accuracy(state.checks)).toBe(14);
    expect(coaching(state.checks, 'alternate')).toContain(
      'one tick out of phase',
    );
    expect(coaching(state.checks, 'alternate')).toContain('first mager attack');
  });
  it.each(lessons)(
    '$id accepts its intended technique for a complete run',
    ({ id }) => {
      let state = initialState();
      for (let tick = 1; tick <= TOTAL_TICKS; tick++)
        state = advance(
          state,
          id,
          perfectPrayer(id, tick),
          targetAt(tick, id),
          tick % 4 === 2 ? supplyGoal(id, tick) : null,
          {
            transitions: tick > 1 ? ['off', 'magic'] : [],
            blowpipe:
              tick % 2 === 1
                ? { type: 'attack' }
                : { type: 'move', tile: nextBlowpipeTile(state.blowpipe) },
          },
        );
      expect(state.tick).toBe(36);
      expect(accuracy(state.checks)).toBe(100);
      expect(state.checks.length).toBe(
        {
          rhythm: 36,
          blob: 12,
          alternate: 42,
          stack: 18,
          movement: 36,
          food: 45,
          potions: 44,
          gauntlet: 24,
          bat: 36,
          flick: 71,
          'two-tick': 42,
          'two-tick-repair': 42,
          'anchor-range': 42,
          'double-blob': 48,
          'stack-one': 18,
          reverse: 36,
          'melee-blob': 36,
          jad: 5,
          triples: 12,
          blowpipe: 36,
        }[id],
      );
      expect(advance(state, id, 'off', 0)).toBe(state);
    },
  );
  it('blob scan chooses the opposite prayer and retains it for three ticks', () => {
    let state = advance(initialState(), 'blob', 'magic', 12);
    expect(state.pending).toBe('range');
    state = advance(state, 'blob', 'range', 12);
    state = advance(state, 'blob', 'magic', 12);
    expect(state.checks).toHaveLength(1);
    state = advance(state, 'blob', 'range', 12);
    expect(state.checks[1]).toMatchObject({
      tick: 4,
      expected: 'range',
      correct: true,
    });
    for (let tick = 5; tick <= 7; tick++)
      state = advance(state, 'blob', 'range', 12);
    expect(state.pending).toBe('magic');
    expect(state.checks.at(-1)?.tick).toBe(7);
  });
  it('holding one prayer cannot defeat a blob', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'blob', 'magic', 12);
    expect(accuracy(state.checks)).toBe(50);
    expect(
      state.checks.filter((c) => c.kind === 'prayer').every((c) => !c.correct),
    ).toBe(true);
  });
  it('no prayer fails controlled blob reads and all attack checks', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'blob', 'off', 12);
    expect(accuracy(state.checks)).toBe(0);
    expect(coaching(state.checks)).toContain('blob reads');
  });
  it('stack attacks remain two ticks apart on four-tick cycles', () => {
    let state = initialState();
    for (let tick = 1; tick <= 12; tick++)
      state = advance(state, 'stack', 'magic', 12);
    expect(state.checks.map((c) => [c.tick, c.expected])).toEqual([
      [1, 'magic'],
      [3, 'range'],
      [5, 'magic'],
      [7, 'range'],
      [9, 'magic'],
      [11, 'range'],
    ]);
  });
  it('correct prayers earn no movement points when the tile is missed', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'movement', perfectPrayer('movement', tick), 0);
    expect(accuracy(state.checks)).toBe(0);
    expect(state.checks.filter((c) => c.kind === 'movement')).toHaveLength(9);
    expect(
      state.checks
        .filter((c) => c.kind === 'movement')
        .every((c) => !c.correct),
    ).toBe(true);
    expect(coaching(state.checks, 'movement')).toContain('movement');
  });
  it('does not award a point before the movement deadline', () => {
    let state = initialState();
    for (let tick = 1; tick <= 3; tick++)
      state = advance(
        state,
        'movement',
        perfectPrayer('movement', tick),
        targetAt(tick),
      );
    expect(scoredChecks(state.checks)).toEqual([]);
    expect(state.streak).toBe(0);
    state = advance(state, 'movement', 'range', targetAt(4));
    expect(scoredChecks(state.checks)).toHaveLength(1);
    expect(accuracy(state.checks)).toBe(100);
    expect(state.streak).toBe(1);
  });
  it('a missed prayer or a late move loses the whole round', () => {
    for (const mistake of ['prayer', 'movement']) {
      let state = initialState();
      for (let tick = 1; tick <= 8; tick++) {
        const prayer =
          mistake === 'prayer' && tick === 3
            ? 'magic'
            : perfectPrayer('movement', tick);
        const tile = mistake === 'movement' && tick <= 4 ? 12 : targetAt(tick);
        state = advance(state, 'movement', prayer, tile);
      }
      expect(scoredChecks(state.checks).map((check) => check.correct)).toEqual([
        false,
        true,
      ]);
      expect(accuracy(state.checks)).toBe(50);
      expect(state.streak).toBe(1);
    }
  });
  it('standing still never scores, even when a later target is the starting tile', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'movement', perfectPrayer('movement', tick), 12);
    expect(accuracy(state.checks)).toBe(0);
    expect(scoredChecks(state.checks)).toHaveLength(9);
  });
  it('reaching every tile without protecting the attacks scores zero', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'movement', 'off', targetAt(tick));
    expect(accuracy(state.checks)).toBe(0);
  });
  it('awards a movement pass at eight complete rounds, but not seven or paused practice', () => {
    for (const successes of [7, 8]) {
      let state = initialState();
      for (let tick = 1; tick <= 36; tick++)
        state = advance(
          state,
          'movement',
          tick <= successes * 4 ? perfectPrayer('movement', tick) : 'off',
          targetAt(tick),
        );
      const score = accuracy(state.checks);
      expect(
        scoredChecks(state.checks).filter((check) => check.correct),
      ).toHaveLength(successes);
      expect(
        recordRun({}, 'movement', score, 'challenge', 36, false).movement
          ?.passes,
      ).toBe(successes === 8 ? 1 : 0);
      expect(
        recordRun({}, 'movement', score, 'guided', 36, false).movement?.passes,
      ).toBe(0);
      expect(
        recordRun({}, 'movement', score, 'challenge', 36, true).movement
          ?.passes,
      ).toBe(0);
    }
  });
  it('target stays available for a full four ticks and changes afterwards', () => {
    expect([1, 2, 3, 4].map((t) => targetAt(t))).toEqual([8, 8, 8, 8]);
    expect(targetAt(5)).toBe(6);
    expect(targetAt(36)).toBe(14);
  });
  it('misses reset the current streak while preserving the best streak', () => {
    let state = advance(initialState(), 'alternate', 'magic', 12);
    state = advance(state, 'alternate', 'range', 12);
    state = advance(state, 'alternate', 'range', 12);
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(2);
  });
  it('supply actions respect the three-tick cooldown and do not change prayer protection', () => {
    let state = advance(initialState(), 'food', 'magic', 12);
    state = advance(state, 'food', 'off', 12, 'shark');
    expect(state.consumed.shark).toBe(1);
    state = advance(state, 'food', 'off', 12, 'shark');
    expect(state.consumed.shark).toBe(1);
    expect(state.supplyMessage).toContain('cooldown');
    state = advance(state, 'food', 'off', 12);
    expect(state.checks.at(-1)).toMatchObject({
      kind: 'supply',
      correct: true,
    });
    state = advance(state, 'food', 'off', 12, 'shark');
    expect(state.consumed.shark).toBe(2);
    expect(state.checks.at(-1)).toMatchObject({
      kind: 'prayer',
      expected: 'magic',
      correct: false,
    });
  });
  it('an item on the attack tick does not count as eating in the gap', () => {
    let state = advance(initialState(), 'food', 'magic', 12, 'shark');
    for (let tick = 2; tick <= 4; tick++)
      state = advance(state, 'food', 'off', 12);
    expect(state.checks.at(-1)).toMatchObject({
      kind: 'supply',
      correct: false,
      actual: 'none',
    });
  });
  it('wrong potion order loses the supply check even with perfect prayer flicks', () => {
    let state = initialState();
    for (let tick = 1; tick <= 4; tick++)
      state = advance(
        state,
        'potions',
        perfectPrayer('potions', tick),
        12,
        tick === 2 ? 'restore' : null,
      );
    expect(state.checks.at(-1)).toMatchObject({
      kind: 'supply',
      expected: 'brew',
      actual: 'restore',
      correct: false,
    });
    expect(
      state.checks.filter((c) => c.kind === 'prayer').every((c) => c.correct),
    ).toBe(true);
  });
  it('supplies are finite and brew and restore share the potion cooldown', () => {
    let state = advance(initialState(), 'potions', 'magic', 12, 'brew');
    state = advance(state, 'potions', 'off', 12, 'restore');
    expect(state.consumed).toEqual({ shark: 0, brew: 1, restore: 0 });
    for (let tick = 3; tick <= 36; tick++)
      state = advance(state, 'potions', 'off', 12, 'brew');
    expect(state.consumed.brew).toBe(6);
    expect(state.supplyMessage).toContain('No supplies');
  });
});
describe('progress and mastery', () => {
  it('requires two complete challenges at 90% and caps earned passes at two', () => {
    let progress = recordRun({}, 'blob', 90, 'challenge', 36, false);
    expect(progress.blob?.passes).toBe(1);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, false);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, false);
    expect(progress.blob).toEqual({
      attempts: 3,
      best: 100,
      passes: 2,
      practiceBest: 0,
    });
  });
  it('does not award challenge credit for guided, interrupted, or incomplete runs', () => {
    let progress = recordRun({}, 'blob', 100, 'guided', 36, false);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, true);
    progress = recordRun(progress, 'blob', 100, 'challenge', 35, false);
    progress = recordRun(progress, 'blob', 89, 'challenge', 36, false);
    expect(progress.blob).toEqual({
      attempts: 3,
      best: 89,
      passes: 0,
      practiceBest: 100,
    });
  });
  it('loads only known, valid records and tolerates corrupt storage', () => {
    expect(parseProgress('broken')).toEqual({});
    expect(parseProgress('null')).toEqual({});
    expect(
      parseProgress(
        JSON.stringify({
          fake: { attempts: 2 },
          blob: { attempts: 1, best: 1000, passes: 2, practiceBest: 100 },
        }),
      ),
    ).toEqual({});
    const progress = recordRun({}, 'blob', 95, 'challenge', 36, false);
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });
});
