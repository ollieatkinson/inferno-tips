import { drillTicks, type LessonId, type Prayer } from './course';
import {
  advance,
  expectedPrayer,
  hasMovement,
  hasSupplies,
  isBlobScan,
  isJad,
  supplyGoal,
  targetAt,
  type DrillState,
} from './engine';

export interface PrayerBeat {
  tick: number;
  prayer: Prayer;
  action: string;
  note: string;
}

// Forecast from the actual reads already made, then assume the learner follows
// the displayed pattern. This never mutates the running drill or reveals Jad RNG.
export function prayerPreview(
  id: LessonId,
  state: DrillState,
  selected: Prayer,
): PrayerBeat[] {
  if (isJad(id) || id === 'blowpipe') return [];
  const beats: PrayerBeat[] = [];
  let forecast = state;
  let previous = selected;
  for (
    let tick = state.tick + 1;
    tick <= Math.min(drillTicks(id), state.tick + 6);
    tick++
  ) {
    const fallback: Prayer =
      id === 'gauntlet'
        ? tick % 2
          ? 'magic'
          : 'range'
        : id === 'stack' || id === 'movement'
          ? (tick - 1) % 4 < 2
            ? 'magic'
            : 'range'
          : id === 'stack-one'
            ? 'range'
            : previous === 'off'
              ? 'magic'
              : previous;
    const prayer =
      expectedPrayer(id, tick, forecast.pending, state.seed) ?? fallback;
    const action =
      id === 'flick' && tick > 1
        ? 'Off → on'
        : prayer === previous
          ? prayer === 'off'
            ? 'Stay off'
            : 'Hold'
          : prayer === 'off'
            ? 'Toggle off'
            : 'Select';
    const notes: string[] = [];
    if (isBlobScan(id, tick)) notes.push('Blob reads');
    if (id === 'double-blob' && tick % 6 === 2) notes.push('Blob B reads');
    if (hasSupplies(id) && tick % 4 === 2) {
      const supply = supplyGoal(id, tick);
      if (supply)
        notes.push(
          supply === 'shark' ? 'Eat' : supply === 'brew' ? 'Brew' : 'Restore',
        );
    }
    if (hasMovement(id) && tick % 4 === 0) notes.push('Move');
    const next = advance(forecast, id, prayer, targetAt(tick, id));
    if (
      next.checks
        .slice(forecast.checks.length)
        .some((c) => c.kind === 'prayer' && !c.correct)
    )
      notes.push('Queued blob conflicts');
    beats.push({ tick, prayer, action, note: notes.join(' · ') });
    forecast = next;
    previous = prayer;
  }
  return beats;
}
