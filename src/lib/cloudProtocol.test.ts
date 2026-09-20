import { describe, expect, it } from 'vitest';
import {
  CLOUD_SCORING_VERSION,
  initialVerified,
  replayBatch,
  stageSeed,
  validBatch,
  weekOf,
  type InputBatch,
  type RunTick,
} from './cloudProtocol';
import { advance, initialState, jadStyle, targetAt } from './engine';
import {
  newSeries,
  stageLesson,
  updateSeries,
  type SeriesMode,
} from './series';
import type { Prayer } from './course';
function ticks(stage: number, mode: SeriesMode, seed: number): RunTick[] {
  const id = stageLesson(mode, stage);
  return Array.from({ length: 36 }, (_, i) => {
    const tick = i + 1;
    const prayer: Prayer =
      id === 'rhythm'
        ? tick % 4 === 1
          ? 'magic'
          : 'off'
        : ['stack', 'movement'].includes(id)
          ? (tick - 1) % 4 < 2
            ? 'magic'
            : 'range'
          : id === 'triples'
            ? jadStyle(id, tick, stageSeed(seed, stage))
            : tick % 2
              ? 'magic'
              : 'range';
    return {
      tick,
      prayer,
      tile: targetAt(tick),
      supply: null,
      transitions: [],
      blowpipe: null,
    };
  });
}
describe('cloud replay protocol', () => {
  it.each(['hard', 'endless'] as SeriesMode[])(
    'replays %s stages with the same seeds, scores and lives as the UI engine',
    (mode) => {
      const seed = 731;
      let verified = initialVerified(mode, seed),
        series = newSeries(mode);
      for (let stage = 0; stage < (mode === 'hard' ? 5 : 10); stage++) {
        const input = ticks(stage, mode, seed);
        let state = initialState(stageSeed(seed, stage));
        for (const t of input) {
          state = advance(
            state,
            stageLesson(mode, stage),
            t.prayer,
            t.tile,
            null,
            t,
          );
          series = updateSeries(series, {
            type: 'checks',
            stage,
            tick: t.tick,
            checks: state.checks,
          });
        }
        series = updateSeries(series, { type: 'next', stage });
        verified = replayBatch(
          verified,
          { stage, sequence: stage, ticks: input },
          seed,
        );
        expect(verified.series).toEqual(series);
        expect(verified.series.lives).toBe(3);
      }
      if (mode === 'hard') {
        expect(verified.series.cleared).toBe(true);
        expect(verified.series.points).toBe(3510);
      }
    },
  );
  it('rejects skipped ticks, invalid tiles, oversized input and ticks after death', () => {
    const batch: InputBatch = {
      sequence: 0,
      stage: 0,
      ticks: ticks(0, 'hard', 0),
    };
    expect(() =>
      replayBatch(
        initialVerified('hard', 0),
        { ...batch, ticks: batch.ticks.slice(1) },
        0,
      ),
    ).toThrow();
    expect(
      validBatch({ ...batch, ticks: [{ ...batch.ticks[0], tile: -1 }] }),
    ).toBe(false);
    expect(
      validBatch({ ...batch, ticks: [...batch.ticks, batch.ticks[0]] }),
    ).toBe(false);
    const missed = batch.ticks
      .slice(0, 5)
      .map((t) => ({ ...t, prayer: 'off' as const }));
    const dead = replayBatch(
      initialVerified('hard', 0),
      { ...batch, ticks: missed },
      0,
    );
    expect(dead.series.ended).toBe(true);
    expect(() =>
      replayBatch(dead, { ...batch, ticks: [batch.ticks[5]] }, 0),
    ).toThrow();
  });
  it('supports partial final stages and rejects wrong stage numbers', () => {
    const input = ticks(0, 'hard', 0).slice(0, 3);
    const state = replayBatch(
      initialVerified('hard', 0),
      { sequence: 0, stage: 0, ticks: input },
      0,
    );
    expect(state.series.points).toBe(40);
    expect(state.drill.tick).toBe(3);
    expect(() =>
      replayBatch(state, { sequence: 1, stage: 1, ticks: input }, 0),
    ).toThrow();
    expect(CLOUD_SCORING_VERSION).toBe(1);
  });
  it('rejects arbitrary stored fields at every input level', () => {
    const batch: InputBatch = {
      sequence: 0,
      stage: 0,
      ticks: ticks(0, 'hard', 0).slice(0, 1),
    };
    expect(validBatch({ ...batch, padding: 'untrusted' })).toBe(false);
    expect(
      validBatch({
        ...batch,
        ticks: [{ ...batch.ticks[0], padding: 'untrusted' }],
      }),
    ).toBe(false);
    expect(
      validBatch({
        ...batch,
        ticks: [
          {
            ...batch.ticks[0],
            blowpipe: { type: 'attack', padding: 'untrusted' },
          },
        ],
      }),
    ).toBe(false);
    expect(
      validBatch({
        ...batch,
        ticks: [
          {
            ...batch.ticks[0],
            blowpipe: { type: 'move', tile: 2, padding: 'untrusted' },
          },
        ],
      }),
    ).toBe(false);
    expect(validBatch(batch)).toBe(true);
  });
  it('uses Monday UTC across Sunday, year boundaries and British daylight saving', () => {
    expect(weekOf(Date.parse('2026-09-20T23:59:59Z'))).toBe('2026-09-14');
    expect(weekOf(Date.parse('2026-09-21T00:00:00Z'))).toBe('2026-09-21');
    expect(weekOf(Date.parse('2027-01-01T01:00:00Z'))).toBe('2026-12-28');
  });
});
