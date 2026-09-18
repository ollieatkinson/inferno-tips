import { describe, expect, it } from 'vitest';
import { advance, initialState } from './engine';

describe('physical attack feedback', () => {
  it('locks protection at the attack tick, despite later prayer changes', () => {
    const launch = advance(initialState(), 'rhythm', 'magic', 12);
    const later = advance(launch, 'rhythm', 'off', 12);
    expect(later.attackResults).toEqual(launch.attackResults);
    expect(later.attackResults[0]).toMatchObject({
      tick: 1,
      enemy: 'mager',
      blocked: true,
      damage: 0,
    });
    const missed = advance(initialState(), 'rhythm', 'off', 12);
    const tooLate = advance(missed, 'rhythm', 'magic', 12);
    expect(tooLate.attackResults[0].blocked).toBe(false);
    expect(tooLate.attackResults[0].damage).toBeGreaterThan(0);
  });
  it('does not turn pattern checks or blob reads into incoming hits', () => {
    let state = advance(initialState(), 'alternate', 'magic', 12);
    expect(state.attackResults).toHaveLength(1);
    state = advance(state, 'alternate', 'range', 12);
    state = advance(state, 'alternate', 'magic', 12);
    expect(state.attackResults).toHaveLength(1);
    state = advance(state, 'alternate', 'range', 12);
    expect(state.attackResults[1]).toMatchObject({
      tick: 4,
      enemy: 'blob',
      style: 'range',
      blocked: true,
      damage: 0,
    });
  });
  it('shows the unprotected bat even when mitigation priorities score correctly', () => {
    const state = advance(initialState(12), 'reverse', 'magic', 12);
    expect(state.checks.every((check) => check.correct)).toBe(true);
    expect(state.attackResults[0]).toMatchObject({
      enemy: 'mager',
      blocked: true,
      damage: 0,
    });
    expect(state.attackResults[1]).toMatchObject({
      enemy: 'bat',
      blocked: false,
    });
    expect(state.attackResults[1].damage).toBeGreaterThan(0);
    expect(
      advance(initialState(12), 'reverse', 'magic', 12).attackResults,
    ).toEqual(state.attackResults);
  });
  it('leaves the blowpipe coordination drill free of invented enemy attacks', () => {
    expect(
      advance(initialState(), 'blowpipe', 'off', 12).attackResults,
    ).toEqual([]);
  });
});
