import { describe, expect, it } from 'vitest';
import {
  newSeries,
  updateSeries,
  stageLesson,
  stageValue,
  parseHighScores,
  saveHighScore,
} from './series';
import type { Check } from './engine';
const check = (tick: number, correct = true, scored = true): Check => ({
  tick,
  kind: 'prayer',
  correct,
  scored,
  expected: 'magic',
  actual: 'off',
  message: correct ? 'Protected.' : 'Magic missed.',
});
describe('survival circuits', () => {
  it('scores each beat once and charges only one life for simultaneous misses', () => {
    let run = newSeries('hard');
    run = updateSeries(run, {
      type: 'checks',
      stage: 0,
      tick: 1,
      checks: [check(1), check(1)],
    });
    expect(run.points).toBe(20);
    expect(
      updateSeries(run, {
        type: 'checks',
        stage: 0,
        tick: 1,
        checks: [check(1)],
      }),
    ).toBe(run);
    run = updateSeries(run, {
      type: 'checks',
      stage: 0,
      tick: 4,
      checks: [check(1), check(4), check(4, false), check(4, false)],
    });
    expect(run).toMatchObject({ points: 20, lives: 2, processedTick: 4 });
  });
  it('uses sequence results, ignoring diagnostic partial credit', () => {
    let run = newSeries('endless');
    run = updateSeries(run, {
      type: 'checks',
      stage: 0,
      tick: 4,
      checks: [
        check(1, true, false),
        check(2, false, false),
        { ...check(4, false), kind: 'round' },
      ],
    });
    expect(run).toMatchObject({ points: 0, lives: 2 });
  });
  it('ends on the third miss, ignores later checks and cannot advance', () => {
    const run = updateSeries(newSeries('hard'), {
      type: 'checks',
      stage: 0,
      tick: 5,
      checks: [
        check(1, false),
        check(2, false),
        check(3, false),
        check(4),
        check(5, false),
      ],
    });
    expect(run).toMatchObject({ points: 0, lives: 0, ended: true });
    expect(updateSeries(run, { type: 'next', stage: 0 })).toBe(run);
  });
  it('hard ends after five stages and rejects stale stage callbacks', () => {
    let run = newSeries('hard');
    for (let stage = 0; stage < 5; stage++)
      run = updateSeries(run, { type: 'next', stage });
    expect(run).toMatchObject({ stage: 4, cleared: true, ended: true });
    const next = updateSeries(newSeries('endless'), { type: 'next', stage: 0 });
    expect(
      updateSeries(next, {
        type: 'checks',
        stage: 0,
        tick: 36,
        checks: [check(36, false)],
      }),
    ).toBe(next);
  });
  it('endless increases to the hardest encounters and continues with bounded state', () => {
    let run = newSeries('endless');
    expect(stageLesson('endless', 0)).toBe('rhythm');
    for (let stage = 0; stage < 300; stage++) {
      run = updateSeries(run, {
        type: 'checks',
        stage,
        tick: 36,
        checks: [check(36)],
      });
      run = updateSeries(run, { type: 'next', stage });
      if (stage >= 6)
        expect(['gauntlet', 'double-blob', 'triples']).toContain(
          stageLesson('endless', stage),
        );
    }
    expect(run).toMatchObject({
      stage: 300,
      lives: 3,
      ended: false,
      processedTick: 0,
    });
    expect(stageValue('endless', 300)).toBe(60);
    expect(JSON.stringify(run).length).toBeLessThan(300);
  });
  it('keeps separate bests and excludes pauses, ongoing runs and lower scores', () => {
    let run = updateSeries(newSeries('hard'), {
      type: 'checks',
      stage: 0,
      tick: 1,
      checks: [check(1)],
    });
    expect(saveHighScore({}, run)).toEqual({});
    const ended = updateSeries(run, { type: 'finish' });
    const best = saveHighScore({}, ended);
    expect(best.hard?.points).toBe(20);
    expect(saveHighScore(best, { ...ended, points: 10 })).toBe(best);
    expect(saveHighScore(best, { ...ended, points: 999, practice: true })).toBe(
      best,
    );
    expect(saveHighScore(best, { ...ended, mode: 'endless' })).toEqual({
      hard: best.hard,
      endless: best.hard,
    });
    run = updateSeries(run, { type: 'pause' });
    expect(saveHighScore({}, updateSeries(run, { type: 'finish' }))).toEqual(
      {},
    );
  });
  it('validates stored scores', () => {
    for (const raw of ['broken', 'null', '[]', '{"hard":{"points":-1}}'])
      expect(parseHighScores(raw)).toEqual({});
    const best = { hard: { points: 123, stage: 2, cleared: false } };
    expect(parseHighScores(JSON.stringify(best))).toEqual(best);
    expect(
      parseHighScores('{"hard":{"points":1e99,"stage":2,"cleared":false}}'),
    ).toEqual({});
  });
});
