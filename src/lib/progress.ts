import {
  lessons,
  passScore,
  drillTicks,
  revisedScoring,
  type LessonId,
  type Mode,
} from './course';
export interface RecordEntry {
  attempts: number;
  best: number;
  passes: number;
  practiceBest: number;
  scoringVersion?: number;
  previousScoring?: { best: number; passes: number; practiceBest: number };
}
export type Progress = Partial<Record<LessonId, RecordEntry>>;
export const STORAGE_KEY = 'inferno-tips-progress-v1';
export function parseProgress(raw: string | null): Progress {
  try {
    const parsed = JSON.parse(raw || '{}');
    const clean: Progress = {};
    for (const { id } of lessons) {
      const r = parsed?.[id];
      if (
        r &&
        ['attempts', 'best', 'passes', 'practiceBest'].every(
          (k) => Number.isFinite(r[k]) && r[k] >= 0,
        ) &&
        r.best <= 100 &&
        r.practiceBest <= 100
      )
        clean[id] = {
          attempts: Math.floor(r.attempts),
          ...(revisedScoring(id) && r.scoringVersion !== 2
            ? {
                previousScoring: {
                  best: r.best,
                  passes: Math.min(2, Math.floor(r.passes)),
                  practiceBest: r.practiceBest,
                },
              }
            : r.previousScoring &&
                ['best', 'practiceBest', 'passes'].every(
                  (k) =>
                    Number.isFinite(r.previousScoring[k]) &&
                    r.previousScoring[k] >= 0 &&
                    r.previousScoring[k] <= (k === 'passes' ? 2 : 100),
                )
              ? {
                  previousScoring: {
                    best: r.previousScoring.best,
                    passes: r.previousScoring.passes,
                    practiceBest: r.previousScoring.practiceBest,
                  },
                }
              : {}),
          best: revisedScoring(id) && r.scoringVersion !== 2 ? 0 : r.best,
          passes:
            revisedScoring(id) && r.scoringVersion !== 2
              ? 0
              : Math.min(2, Math.floor(r.passes)),
          practiceBest:
            revisedScoring(id) && r.scoringVersion !== 2 ? 0 : r.practiceBest,
          ...(revisedScoring(id) ? { scoringVersion: 2 } : {}),
        };
    }
    return clean;
  } catch {
    return {};
  }
}
export function recordRun(
  progress: Progress,
  id: LessonId,
  score: number,
  mode: Mode,
  tick: number,
  interrupted: boolean,
): Progress {
  if (tick !== drillTicks(id)) return progress;
  const prev = progress[id] || {
    attempts: 0,
    best: 0,
    passes: 0,
    practiceBest: 0,
  };
  const challenge = mode === 'challenge' && !interrupted;
  return {
    ...progress,
    [id]: {
      ...(revisedScoring(id) ? { scoringVersion: 2 } : {}),
      ...(prev.previousScoring
        ? { previousScoring: prev.previousScoring }
        : {}),
      attempts: prev.attempts + 1,
      best: challenge ? Math.max(prev.best, score) : prev.best,
      practiceBest: challenge
        ? prev.practiceBest
        : Math.max(prev.practiceBest, score),
      passes: Math.min(
        2,
        prev.passes + (challenge && score >= passScore(id) ? 1 : 0),
      ),
    },
  };
}
