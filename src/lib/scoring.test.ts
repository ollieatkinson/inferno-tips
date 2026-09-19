import { describe, expect, it } from 'vitest';
import {
  accuracy,
  advance,
  initialState,
  scoredChecks,
  supplyGoal,
  targetAt,
} from './engine';
import {
  drillTicks,
  mechanicGoals,
  type LessonId,
  type Prayer,
} from './course';
import { parseProgress, recordRun } from './progress';

describe('complete mechanic scoring', () => {
  it.each([
    'rhythm',
    'bat',
    'flick',
    'blob',
    'food',
    'potions',
    'gauntlet',
    'blowpipe',
  ] as LessonId[])('%s gives no points for omitting its key mechanic', (id) => {
    let state = initialState();
    for (let tick = 1; tick <= drillTicks(id); tick++) {
      const prayer: Prayer =
        id === 'flick' || id === 'blob'
          ? 'magic'
          : id === 'gauntlet'
            ? tick % 2
              ? 'magic'
              : 'range'
            : id === 'food' || id === 'potions'
              ? tick % 4 === 1
                ? 'magic'
                : 'off'
              : 'off';
      state = advance(state, id, prayer, 12, null, {
        blowpipe: tick === 1 ? { type: 'attack' } : null,
      });
    }
    expect(accuracy(state.checks)).toBe(0);
  });
  it('missing three mager attacks earns six rounds, not a passing score for the quiet ticks', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(
        state,
        'rhythm',
        tick % 4 === 1 && tick > 9 ? 'magic' : 'off',
        12,
      );
    expect(scoredChecks(state.checks).filter((c) => c.correct)).toHaveLength(6);
    expect(accuracy(state.checks)).toBe(67);
  });
  it.each(['food', 'potions'] as const)(
    '%s settles every gap on the following attack',
    (id) => {
      let state = initialState();
      for (let tick = 1; tick <= drillTicks(id); tick++) {
        state = advance(
          state,
          id,
          tick === drillTicks(id) ? 'off' : tick % 4 === 1 ? 'magic' : 'off',
          12,
          tick % 4 === 2 ? supplyGoal(id, tick) : null,
        );
        if (tick === drillTicks(id) - 1)
          expect(scoredChecks(state.checks)).toHaveLength(
            mechanicGoals[id]!.total - 1,
          );
      }
      const rounds = scoredChecks(state.checks);
      expect(rounds).toHaveLength(mechanicGoals[id]!.total);
      expect(rounds.at(-1)?.correct).toBe(false);
      expect(rounds.filter((c) => c.correct)).toHaveLength(rounds.length - 1);
    },
  );
  it('five sharks cannot pass nine gaps even with perfect prayers', () => {
    let state = initialState();
    for (let tick = 1; tick <= 37; tick++)
      state = advance(
        state,
        'food',
        tick % 4 === 1 ? 'magic' : 'off',
        12,
        tick <= 18 && tick % 4 === 2 ? 'shark' : null,
      );
    expect(accuracy(state.checks)).toBe(56);
    expect(
      recordRun({}, 'food', accuracy(state.checks), 'challenge', 37, false).food
        ?.passes,
    ).toBe(0);
  });
  it('a correct move cannot cancel an unprotected gauntlet attack', () => {
    let state = initialState();
    for (let tick = 1; tick <= 4; tick++)
      state = advance(
        state,
        'gauntlet',
        tick === 4 ? 'magic' : tick % 2 ? 'magic' : 'range',
        targetAt(tick),
      );
    expect(state.checks.find((c) => c.kind === 'movement')?.correct).toBe(true);
    expect(accuracy(state.checks)).toBe(0);
  });
  it('retains attempt counts but does not compare old partial-credit scores with sequence scores', () => {
    const old = { attempts: 5, best: 100, passes: 2, practiceBest: 95 };
    const migrated = parseProgress(
      JSON.stringify({ blob: old, alternate: old }),
    );
    expect(migrated.blob).toEqual({
      attempts: 5,
      best: 0,
      passes: 0,
      practiceBest: 0,
      scoringVersion: 2,
      previousScoring: { best: 100, passes: 2, practiceBest: 95 },
    });
    expect(migrated.alternate).toEqual(old);
    expect(parseProgress(JSON.stringify(migrated))).toEqual(migrated);
  });
});
