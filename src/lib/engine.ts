import { TOTAL_TICKS, type LessonId, type Prayer } from './course';
export interface Check { tick: number; kind: 'prayer' | 'movement' | 'read'; expected: string; actual: string; correct: boolean; message: string; }
export interface DrillState { tick: number; pending: Prayer; checks: Check[]; streak: number; bestStreak: number; }
export const initialState = (): DrillState => ({ tick: 0, pending: 'off', checks: [], streak: 0, bestStreak: 0 });
export const hasMovement = (id: LessonId) => id === 'movement' || id === 'gauntlet';
export const hasBlob = (id: LessonId) => ['blob', 'alternate', 'gauntlet'].includes(id);
export const opposite = (p: Prayer): Prayer => p === 'magic' ? 'range' : 'magic';
const targets = [8, 6, 16, 18, 12, 2, 22, 10, 14];
export const targetAt = (tick: number) => targets[Math.floor((Math.max(1, tick) - 1) / 4) % targets.length];
export function expectedPrayer(id: LessonId, tick: number, pending: Prayer): Prayer | null {
  if (id === 'rhythm') return tick % 4 === 1 ? 'magic' : 'off';
  if (id === 'alternate') return tick % 2 === 1 ? 'magic' : 'range';
  if (id === 'stack' || id === 'movement') return tick % 4 === 1 ? 'magic' : tick % 4 === 3 ? 'range' : null;
  if (id === 'gauntlet' && tick % 4 === 1) return 'magic';
  if (hasBlob(id) && tick % 6 === 4) return pending;
  return null;
}
export function advance(state: DrillState, id: LessonId, prayer: Prayer, tile: number): DrillState {
  if (state.tick >= TOTAL_TICKS) return state;
  const tick = state.tick + 1;
  const added: Check[] = [];
  let pending = state.pending;
  if (hasBlob(id) && tick % 6 === 1) {
    pending = prayer === 'off' ? (tick % 12 === 1 ? 'range' : 'magic') : opposite(prayer);
    if (id === 'blob') added.push({ tick, kind: 'read', expected: 'magic or range', actual: prayer, correct: prayer !== 'off', message: prayer === 'off' ? 'Give the blob a protection prayer to read. With prayer off, its style is not controlled.' : `The blob read ${prayer}. Prepare ${pending} by tick ${tick + 3}.` });
  }
  const expected = expectedPrayer(id, tick, pending);
  if (expected !== null) added.push({ tick, kind: 'prayer', expected, actual: prayer, correct: prayer === expected, message: prayer === expected ? (expected === 'off' ? 'Good: prayer off on a quiet tick.' : `Protected ${expected}.`) : expected === 'off' ? 'That was a quiet tick. Turn prayer off between attacks.' : `You needed ${expected} at tick ${tick}; ${prayer === 'off' ? 'your prayer was off' : `${prayer} was active`}. Select it before the tick bar fills.` });
  if (hasMovement(id) && tick % 4 === 0) {
    const target = targetAt(tick);
    added.push({ tick, kind: 'movement', expected: String(target), actual: String(tile), correct: tile === target, message: tile === target ? 'Reached the marked tile on time.' : 'Missed the marked tile. Queue your prayer first, then use the quiet tick to move.' });
  }
  let streak = state.streak;
  let bestStreak = state.bestStreak;
  for (const check of added) { streak = check.correct ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); }
  return { tick, pending, checks: [...state.checks, ...added], streak, bestStreak };
}
export function accuracy(checks: Check[]) { return checks.length ? Math.round(checks.filter(c => c.correct).length / checks.length * 100) : 0; }
export function coaching(checks: Check[]) {
  const missed = checks.filter(c => !c.correct);
  if (!missed.length) return 'Clean run. Repeat at game speed without hints to make the rhythm stick.';
  const movement = missed.filter(c => c.kind === 'movement').length;
  if (movement > missed.length / 2) return 'Your next focus: movement. Select the prayer first, then use the space between attacks to click your target.';
  if (missed.some(c => c.kind === 'read')) return 'Your next focus: blob reads. Keep a protection prayer on for the scan, then prepare the opposite style.';
  if (missed.filter(c => c.expected === 'off').length > missed.length / 2) return 'Your next focus: the quiet ticks. Protect on the attack, then turn prayer off until the next attack is due.';
  return 'Your next focus: prepare the prayer before the beat. Try guided mode and use the filling tick bar to find a steady rhythm.';
}
