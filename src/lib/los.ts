import setups from './losSetups.json';
import type { LessonId } from './course';

// Generated with the LoS tool's public IL2 encoder. See docs/los-setups.json
// and scripts/generate-los-setups.mjs for the editable positions and checks.
export const losSetups = setups;
export type LosSetupId = keyof typeof setups;
export const drillLosSetups: Partial<Record<LessonId, LosSetupId>> = {
  rhythm: 'mager',
  bat: 'bat',
  blob: 'blob',
  alternate: 'mager-blob',
  'anchor-range': 'ranger-blob',
  'double-blob': 'two-blobs',
  'stack-one': 'pillar-stack',
  stack: 'two-tick-stack',
  movement: 'two-tick-stack',
  food: 'mager',
  potions: 'mager',
  gauntlet: 'mager-blob',
  reverse: 'reverse',
  'melee-blob': 'melee-blob',
  flick: 'mager',
  'two-tick': 'mager-blob',
  'two-tick-repair': 'two-tick-repair',
};
