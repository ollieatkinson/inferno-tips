import { advance, initialState, type DrillState, type Supply } from './engine';
import {
  newSeries,
  stageLesson,
  updateSeries,
  type SeriesMode,
  type SeriesState,
} from './series';
import type { Prayer } from './course';
import type { BlowpipeCommand } from './blowpipe';

// Keep prior versions available when rules change; never reinterpret old runs.
export const CLOUD_SCORING_VERSION = 1;
export interface RunTick {
  tick: number;
  prayer: Prayer;
  tile: number;
  supply: Supply | null;
  transitions: Prayer[];
  blowpipe: BlowpipeCommand | null;
}
export interface InputBatch {
  sequence: number;
  stage: number;
  ticks: RunTick[];
}
export interface VerifiedRun {
  series: SeriesState;
  drill: DrillState;
  ticks: number;
}
export interface CloudTicket {
  id: string;
  seed: number;
  version: number;
  mode: SeriesMode;
}
export interface CloudResult {
  points: number;
  stage: number;
  cleared: boolean;
  practice: boolean;
}
export interface LeaderboardEntry extends CloudResult {
  id: string;
  name: string;
  rank: number;
  publishedAt: number;
  mine: boolean;
}
export interface Board {
  entries: LeaderboardEntry[];
  version: number;
  versions: number[];
  week: string | null;
}
export const stageSeed = (seed: number, stage: number) =>
  ((seed + Math.imul(stage, 2654435761)) >>> 0) % 100000;
export const initialVerified = (
  mode: SeriesMode,
  seed: number,
): VerifiedRun => ({
  series: newSeries(mode),
  drill: initialState(stageSeed(seed, 0)),
  ticks: 0,
});
export const weekOf = (time: number) => {
  const date = new Date(time);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};
const prayers = ['off', 'magic', 'range', 'melee'];
// Reject unused fields instead of persisting attacker-controlled padding in D1.
const onlyKeys = (value: object, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
export function validBatch(value: unknown): value is InputBatch {
  if (!value || typeof value !== 'object') return false;
  const b = value as InputBatch;
  return (
    onlyKeys(b, ['sequence', 'stage', 'ticks']) &&
    Number.isSafeInteger(b.sequence) &&
    b.sequence >= 0 &&
    Number.isSafeInteger(b.stage) &&
    b.stage >= 0 &&
    Array.isArray(b.ticks) &&
    b.ticks.length > 0 &&
    b.ticks.length <= 36 &&
    b.ticks.every(
      (t) =>
        t &&
        typeof t === 'object' &&
        onlyKeys(t, [
          'tick',
          'prayer',
          'tile',
          'supply',
          'transitions',
          'blowpipe',
        ]) &&
        Number.isInteger(t.tick) &&
        t.tick >= 1 &&
        t.tick <= 36 &&
        prayers.includes(t.prayer) &&
        Number.isInteger(t.tile) &&
        t.tile >= 0 &&
        t.tile < 25 &&
        (t.supply === null ||
          ['shark', 'brew', 'restore'].includes(t.supply)) &&
        Array.isArray(t.transitions) &&
        t.transitions.length <= 32 &&
        t.transitions.every((p) => prayers.includes(p)) &&
        (t.blowpipe === null ||
          (t.blowpipe &&
            ((t.blowpipe.type === 'attack' && onlyKeys(t.blowpipe, ['type'])) ||
              (t.blowpipe.type === 'move' &&
                onlyKeys(t.blowpipe, ['type', 'tile']) &&
                Number.isInteger(t.blowpipe.tile) &&
                t.blowpipe.tile >= 0 &&
                t.blowpipe.tile <= 6)))),
    )
  );
}
export function replayBatch(
  previous: VerifiedRun,
  batch: InputBatch,
  seed: number,
): VerifiedRun {
  if (
    !validBatch(batch) ||
    previous.series.ended ||
    previous.series.stage !== batch.stage
  )
    throw new Error('Invalid stage or input batch.');
  let { series, drill, ticks } = previous;
  for (const [index, input] of batch.ticks.entries()) {
    if (
      series.ended ||
      series.stage !== batch.stage ||
      input.tick !== drill.tick + 1
    )
      throw new Error('Inputs must be consecutive and stop when the run ends.');
    const id = stageLesson(series.mode, series.stage);
    drill = advance(drill, id, input.prayer, input.tile, input.supply, {
      transitions: input.transitions,
      blowpipe: input.blowpipe,
    });
    ticks++;
    series = updateSeries(series, {
      type: 'checks',
      stage: batch.stage,
      tick: drill.tick,
      checks: drill.checks,
    });
    if (!series.ended && drill.tick === 36) {
      series = updateSeries(series, { type: 'next', stage: batch.stage });
      if (!series.ended) drill = initialState(stageSeed(seed, series.stage));
    }
    if (
      (series.ended || series.stage !== batch.stage) &&
      index !== batch.ticks.length - 1
    )
      throw new Error('Extra inputs after the stage ended.');
  }
  return { series, drill, ticks };
}
export const resultOf = (run: VerifiedRun): CloudResult => ({
  points: run.series.points,
  stage: run.series.stage + 1,
  cleared: run.series.cleared,
  practice: run.series.practice,
});
