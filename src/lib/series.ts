import type { LessonId } from './course';
import { scoredChecks, type Check } from './engine';

export type SeriesMode = 'hard' | 'endless';
export const SERIES_KEY = 'inferno-tips-series-v1';
const hard: LessonId[] = [
  'stack',
  'movement',
  'gauntlet',
  'double-blob',
  'triples',
];
const opening: LessonId[] = ['rhythm', ...hard];
const repeat: LessonId[] = ['gauntlet', 'double-blob', 'triples'];
export const seriesTitle = (mode: SeriesMode) =>
  mode === 'hard' ? 'Hard circuit' : 'Endless gauntlet';
export function stageLesson(mode: SeriesMode, stage: number): LessonId {
  return mode === 'hard'
    ? hard[Math.min(stage, hard.length - 1)]
    : (opening[stage] ?? repeat[(stage - opening.length) % repeat.length]);
}
export const stageValue = (mode: SeriesMode, stage: number) =>
  10 * Math.min(6, stage + (mode === 'hard' ? 2 : 1));
export interface SeriesState {
  mode: SeriesMode;
  stage: number;
  points: number;
  lives: number;
  processedTick: number;
  practice: boolean;
  ended: boolean;
  cleared: boolean;
  feedback: string;
}
export function newSeries(mode: SeriesMode): SeriesState {
  return {
    mode,
    stage: 0,
    points: 0,
    lives: 3,
    processedTick: 0,
    practice: false,
    ended: false,
    cleared: false,
    feedback: 'Three lives. Each missed sequence costs one.',
  };
}
export type SeriesAction =
  | { type: 'checks'; stage: number; tick: number; checks: Check[] }
  | { type: 'next'; stage: number }
  | { type: 'pause' }
  | { type: 'finish' };
export function updateSeries(
  state: SeriesState,
  action: SeriesAction,
): SeriesState {
  if (state.ended) return state;
  if (action.type === 'pause') return { ...state, practice: true };
  if (action.type === 'finish') return { ...state, ended: true };
  if (action.stage !== state.stage) return state;
  if (action.type === 'next') {
    if (state.mode === 'hard' && state.stage === hard.length - 1)
      return {
        ...state,
        ended: true,
        cleared: true,
        feedback: 'All five stages cleared.',
      };
    return {
      ...state,
      stage: state.stage + 1,
      processedTick: 0,
      feedback: 'Stage cleared. Prepare for the next encounter.',
    };
  }
  if (action.tick <= state.processedTick) return state;
  let result = { ...state, processedTick: action.tick };
  // Several checks can share a beat (e.g. the pattern and a blob attack).
  // A single bad input costs one life, and cannot also earn partial points.
  const ticks = new Map<number, Check[]>();
  for (const check of scoredChecks(action.checks)) {
    if (check.tick <= state.processedTick || check.tick > action.tick) continue;
    ticks.set(check.tick, [...(ticks.get(check.tick) ?? []), check]);
  }
  for (const checks of [...ticks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, checks]) => checks)) {
    const miss = checks.find((check) => !check.correct);
    if (miss) {
      result.lives--;
      result.feedback = `Life lost. ${miss.message}`;
      if (!result.lives) {
        result.ended = true;
        break;
      }
    } else {
      const points = stageValue(state.mode, state.stage);
      result.points += points;
      result.feedback = `+${points} · ${checks.at(-1)!.message.replace(/ \+1 point\.$/, '')}`;
    }
  }
  return result;
}
export interface HighScore {
  points: number;
  stage: number;
  cleared: boolean;
}
export type HighScores = Partial<Record<SeriesMode, HighScore>>;
export function parseHighScores(raw: string | null): HighScores {
  try {
    const data = JSON.parse(raw ?? '{}');
    const scores: HighScores = {};
    for (const mode of ['hard', 'endless'] as const) {
      const s = data?.[mode];
      if (
        s &&
        Number.isSafeInteger(s.points) &&
        s.points >= 0 &&
        Number.isSafeInteger(s.stage) &&
        s.stage >= 1 &&
        typeof s.cleared === 'boolean'
      )
        scores[mode] = { points: s.points, stage: s.stage, cleared: s.cleared };
    }
    return scores;
  } catch {
    return {};
  }
}
export function saveHighScore(
  scores: HighScores,
  run: SeriesState,
): HighScores {
  if (!run.ended || run.practice || run.points === 0) return scores;
  const old = scores[run.mode];
  if (
    old &&
    (old.points > run.points ||
      (old.points === run.points &&
        (old.cleared || (!run.cleared && old.stage >= run.stage + 1))))
  )
    return scores;
  return {
    ...scores,
    [run.mode]: {
      points: run.points,
      stage: run.stage + 1,
      cleared: run.cleared,
    },
  };
}
