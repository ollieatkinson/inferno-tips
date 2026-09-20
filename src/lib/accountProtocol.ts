import { lessons, revisedScoring, type LessonId, type Mode } from './course';
import type { Progress } from './progress';
import type { RunTick } from './cloudProtocol';
export const DRILL_SCORING_VERSION = 1;
export interface DrillTicket {
  id: string;
  userId: string;
  lesson: LessonId;
  mode: Mode;
  seed: number;
  version: number;
}
export interface DrillResult {
  score: number;
  passed: boolean;
  practice: boolean;
  bestStreak: number;
  feedback: string;
}
export interface AttemptSummary extends DrillResult {
  id: string;
  lesson: LessonId;
  mode: Mode;
  finishedAt: number;
}
export interface AccountView {
  enabled: boolean;
  providers: { google: boolean; discord: boolean };
  siteKey: string;
  user: { id: string; name: string; email: string } | null;
  progress: Progress;
  imported: { progress: Progress; importedAt: number } | null;
  history: AttemptSummary[];
  linkedProviders: string[];
}
export interface PendingDrill {
  ticket: DrillTicket;
  ticks: RunTick[];
  practice: boolean;
  updated: number;
}
export function validImport(value: unknown): value is Progress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, entry]) => {
    if (
      !lessons.some((l) => l.id === id) ||
      !entry ||
      typeof entry !== 'object'
    )
      return false;
    const r = entry as Record<string, unknown>;
    if (
      Object.keys(r).some(
        (k) =>
          ![
            'attempts',
            'best',
            'practiceBest',
            'passes',
            'scoringVersion',
            'previousScoring',
          ].includes(k),
      )
    )
      return false;
    if (
      !Number.isSafeInteger(r.attempts) ||
      (r.attempts as number) < 0 ||
      (r.attempts as number) > 100000
    )
      return false;
    for (const key of ['best', 'practiceBest', 'passes'])
      if (
        typeof r[key] !== 'number' ||
        !Number.isFinite(r[key]) ||
        (r[key] as number) < 0 ||
        (r[key] as number) > (key === 'passes' ? 2 : 100)
      )
        return false;
    if (!Number.isInteger(r.passes)) return false;
    if (r.scoringVersion !== undefined && r.scoringVersion !== 2) return false;
    if (r.previousScoring !== undefined) {
      const old = r.previousScoring as Record<string, unknown>;
      if (
        !old ||
        typeof old !== 'object' ||
        Object.keys(old).some(
          (k) => !['best', 'practiceBest', 'passes'].includes(k),
        )
      )
        return false;
      for (const key of ['best', 'practiceBest', 'passes'])
        if (
          typeof old[key] !== 'number' ||
          !Number.isFinite(old[key]) ||
          (old[key] as number) < 0 ||
          (old[key] as number) > (key === 'passes' ? 2 : 100)
        )
          return false;
    }
    return true;
  });
}
export function progressFromRows(
  rows: {
    lesson: string;
    attempts: number;
    best: number;
    practiceBest: number;
    passes: number;
  }[],
): Progress {
  const result: Progress = {};
  for (const row of rows)
    if (lessons.some((l) => l.id === row.lesson)) {
      const id = row.lesson as LessonId;
      result[id] = {
        attempts: row.attempts,
        best: row.best,
        practiceBest: row.practiceBest,
        passes: Math.min(2, row.passes),
        ...(revisedScoring(id) ? { scoringVersion: 2 } : {}),
      };
    }
  return result;
}
