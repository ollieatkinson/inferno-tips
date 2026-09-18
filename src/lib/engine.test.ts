import { describe, expect, it } from 'vitest';
import { accuracy, advance, coaching, initialState, targetAt } from './engine';
import { lessons, TOTAL_TICKS, type LessonId, type Prayer } from './course';
import { parseProgress, recordRun } from './progress';

function perfectPrayer(id: LessonId, tick: number): Prayer {
  if (id === 'rhythm') return tick % 4 === 1 ? 'magic' : 'off';
  if (id === 'blob') return Math.floor((tick - 1) / 3) % 2 === 0 ? 'magic' : 'range';
  if (id === 'stack' || id === 'movement') return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  return tick % 2 === 1 ? 'magic' : 'range';
}
describe('drill mechanics', () => {
  it.each(lessons)('$id accepts its intended technique for a complete run', ({ id }) => {
    let state = initialState();
    for (let tick = 1; tick <= TOTAL_TICKS; tick++) state = advance(state, id, perfectPrayer(id, tick), targetAt(tick));
    expect(state.tick).toBe(36);
    expect(accuracy(state.checks)).toBe(100);
    expect(state.checks.length).toBe({ rhythm: 36, blob: 12, alternate: 36, stack: 18, movement: 27, gauntlet: 24 }[id]);
    expect(advance(state, id, 'off', 0)).toBe(state);
  });
  it('blob scan chooses the opposite prayer and retains it for three ticks', () => {
    let state = advance(initialState(), 'blob', 'magic', 12);
    expect(state.pending).toBe('range');
    state = advance(state, 'blob', 'range', 12);
    state = advance(state, 'blob', 'magic', 12);
    expect(state.checks).toHaveLength(1);
    state = advance(state, 'blob', 'range', 12);
    expect(state.checks[1]).toMatchObject({ tick: 4, expected: 'range', correct: true });
    for (let tick = 5; tick <= 7; tick++) state = advance(state, 'blob', 'range', 12);
    expect(state.pending).toBe('magic');
    expect(state.checks.at(-1)?.tick).toBe(7);
  });
  it('holding one prayer cannot defeat a blob', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++) state = advance(state, 'blob', 'magic', 12);
    expect(accuracy(state.checks)).toBe(50);
    expect(state.checks.filter(c => c.kind === 'prayer').every(c => !c.correct)).toBe(true);
  });
  it('no prayer fails controlled blob reads and all attack checks', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++) state = advance(state, 'blob', 'off', 12);
    expect(accuracy(state.checks)).toBe(0);
    expect(coaching(state.checks)).toContain('blob reads');
  });
  it('stack attacks remain two ticks apart on four-tick cycles', () => {
    let state = initialState();
    for (let tick = 1; tick <= 12; tick++) state = advance(state, 'stack', 'magic', 12);
    expect(state.checks.map(c => [c.tick, c.expected])).toEqual([[1, 'magic'], [3, 'range'], [5, 'magic'], [7, 'range'], [9, 'magic'], [11, 'range']]);
  });
  it('movement is checked independently of correct prayers', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++) state = advance(state, 'movement', perfectPrayer('movement', tick), 0);
    expect(accuracy(state.checks)).toBe(67);
    expect(state.checks.filter(c => c.kind === 'movement')).toHaveLength(9);
    expect(state.checks.filter(c => c.kind === 'movement').every(c => !c.correct)).toBe(true);
    expect(coaching(state.checks)).toContain('movement');
  });
  it('target stays available for a full four ticks and changes afterwards', () => {
    expect([1,2,3,4].map(targetAt)).toEqual([8,8,8,8]);
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
});
describe('progress and mastery', () => {
  it('requires two complete challenges at 90% and caps earned passes at two', () => {
    let progress = recordRun({}, 'blob', 90, 'challenge', 36, false);
    expect(progress.blob?.passes).toBe(1);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, false);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, false);
    expect(progress.blob).toEqual({ attempts: 3, best: 100, passes: 2, practiceBest: 0 });
  });
  it('does not award challenge credit for guided, interrupted, or incomplete runs', () => {
    let progress = recordRun({}, 'blob', 100, 'guided', 36, false);
    progress = recordRun(progress, 'blob', 100, 'challenge', 36, true);
    progress = recordRun(progress, 'blob', 100, 'challenge', 35, false);
    progress = recordRun(progress, 'blob', 89, 'challenge', 36, false);
    expect(progress.blob).toEqual({ attempts: 3, best: 89, passes: 0, practiceBest: 100 });
  });
  it('loads only known, valid records and tolerates corrupt storage', () => {
    expect(parseProgress('broken')).toEqual({});
    expect(parseProgress('null')).toEqual({});
    expect(parseProgress(JSON.stringify({ fake: { attempts: 2 }, blob: { attempts: 1, best: 1000, passes: 2, practiceBest: 100 } }))).toEqual({});
    const progress = recordRun({}, 'blob', 95, 'challenge', 36, false);
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });
});
