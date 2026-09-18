import { describe, expect, it } from 'vitest';
import { advanceBlowpipe, initialBlowpipe, nextBlowpipeTile } from './blowpipe';

describe('blowpipe walking', () => {
  it('fires 18 shots and runs six lengths with alternating target and ground clicks', () => {
    let state = initialBlowpipe();
    for (let tick = 1; tick <= 36; tick++) {
      const result = advanceBlowpipe(
        state,
        tick,
        tick % 2
          ? { type: 'attack' }
          : { type: 'move', tile: nextBlowpipeTile(state) },
      );
      expect(result.check.correct).toBe(true);
      state = result.state;
    }
    expect(state).toMatchObject({ shots: 18, legs: 6, tile: 0, lostTicks: 0 });
  });
  it('keeps attacking automatically but holding the target misses every movement check', () => {
    let state = initialBlowpipe();
    let correct = 0;
    for (let tick = 1; tick <= 36; tick++) {
      const result = advanceBlowpipe(
        state,
        tick,
        tick === 1 ? { type: 'attack' } : null,
      );
      correct += Number(result.check.correct);
      state = result.state;
    }
    expect(state).toMatchObject({ shots: 18, tile: 0, legs: 0 });
    expect(correct).toBe(18);
  });
  it('runs at most two tiles per tick and continued movement costs ready attack ticks', () => {
    const shot = advanceBlowpipe(initialBlowpipe(), 1, {
      type: 'attack',
    }).state;
    const move = advanceBlowpipe(shot, 2, { type: 'move', tile: 6 });
    expect(move.state).toMatchObject({
      tile: 2,
      attacking: false,
      destination: 6,
    });
    const running = advanceBlowpipe(move.state, 3);
    expect(running.state).toMatchObject({ tile: 4, shots: 1, lostTicks: 1 });
    expect(running.check.correct).toBe(false);
    expect(running.check.message).toContain('kept running');
    const recover = advanceBlowpipe(running.state, 4, { type: 'attack' });
    expect(recover.state).toMatchObject({
      tile: 4,
      shots: 2,
      nextShotTick: 6,
      destination: null,
    });
    expect(recover.check.correct).toBe(true);
    const step = advanceBlowpipe(recover.state, 5, { type: 'move', tile: 6 });
    expect(step.check.correct).toBe(true);
    expect(
      advanceBlowpipe(step.state, 6, { type: 'attack' }).check.correct,
    ).toBe(true);
  });
  it('does not fire twice when clicking the target during cooldown', () => {
    const shot = advanceBlowpipe(initialBlowpipe(), 1, {
      type: 'attack',
    }).state;
    const early = advanceBlowpipe(shot, 2, { type: 'attack' });
    expect(early.state.shots).toBe(1);
    expect(early.check.kind).toBe('movement');
    expect(early.check.correct).toBe(false);
    expect(advanceBlowpipe(early.state, 3).state.shots).toBe(2);
  });
  it('does not teleport, accept invalid tiles, or mutate the previous state', () => {
    const before = Object.freeze(initialBlowpipe());
    expect(
      advanceBlowpipe(before, 1, { type: 'move', tile: 6 }).state.tile,
    ).toBe(2);
    for (const tile of [-1, 7, 1.5, NaN])
      expect(
        advanceBlowpipe(before, 1, { type: 'move', tile }).state.tile,
      ).toBe(0);
    expect(before).toEqual(initialBlowpipe());
  });
});
