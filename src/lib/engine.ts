import { TOTAL_TICKS, type LessonId, type Prayer } from './course';
import {
  monsterEvents,
  jadStyleForTick,
  type MonsterEvent,
} from './encounters';
export type Supply = 'shark' | 'brew' | 'restore';
export interface Check {
  tick: number;
  kind: 'prayer' | 'movement' | 'read' | 'supply' | 'flick' | 'attack';
  expected: string;
  actual: string;
  correct: boolean;
  message: string;
}
export interface DrillState {
  tick: number;
  pending: Prayer;
  pendingB: Prayer;
  exposure: string;
  exposures: { tick: number; message: string }[];
  seed: number;
  checks: Check[];
  monsterEvents: MonsterEvent[];
  streak: number;
  bestStreak: number;
  consumed: Record<Supply, number>;
  lastConsumedTick: number;
  gapSupply: Supply | null;
  supplyMessage: string;
}
export const initialState = (seed = 0): DrillState => ({
  tick: 0,
  pending: 'off',
  pendingB: 'off',
  exposure: '',
  exposures: [],
  seed,
  checks: [],
  monsterEvents: [],
  streak: 0,
  bestStreak: 0,
  consumed: { shark: 0, brew: 0, restore: 0 },
  lastConsumedTick: -3,
  gapSupply: null,
  supplyMessage: '',
});
export const hasSupplies = (id: LessonId) => id === 'food' || id === 'potions';
export const supplyGoal = (id: LessonId, tick: number): Supply | null =>
  id === 'food'
    ? 'shark'
    : id === 'potions' && tick <= 32
      ? Math.floor((tick - 1) / 4) % 4 === 3
        ? 'restore'
        : 'brew'
      : null;
export const stock: Record<Supply, number> = { shark: 9, brew: 6, restore: 2 };
export const hasMovement = (id: LessonId) =>
  id === 'movement' || id === 'gauntlet' || id === 'blowpipe';
export const hasBlob = (id: LessonId) =>
  [
    'blob',
    'alternate',
    'gauntlet',
    'anchor-range',
    'double-blob',
    'two-tick',
    'two-tick-repair',
    'melee-blob',
  ].includes(id);
export const opposite = (p: Prayer): Prayer =>
  p === 'magic' ? 'range' : 'magic';
const targets = [8, 6, 16, 18, 12, 2, 22, 10, 14];
export const movementPeriod = (id: LessonId) => (id === 'blowpipe' ? 2 : 4);
export const targetAt = (tick: number, id: LessonId = 'movement') =>
  targets[
    Math.floor((Math.max(1, tick) - 1) / movementPeriod(id)) % targets.length
  ];
export const isJad = (id: LessonId) => id === 'jad' || id === 'triples';
export const jadPeriod = (id: LessonId) => (id === 'triples' ? 3 : 8);
export const jadStyle = jadStyleForTick;
export const blobScanPhase = (id: LessonId) =>
  id === 'two-tick-repair' ? 2 : 1;
export const isBlobScan = (id: LessonId, tick: number) =>
  hasBlob(id) && (tick - blobScanPhase(id)) % 6 === 0;
export const isBlobAttack = (id: LessonId, tick: number) =>
  hasBlob(id) &&
  tick >= blobScanPhase(id) + 3 &&
  (tick - blobScanPhase(id) - 3) % 6 === 0;
export interface TickInput {
  transitions?: Prayer[];
  attack?: boolean;
}
export function expectedPrayer(
  id: LessonId,
  tick: number,
  pending: Prayer,
  seed = 0,
): Prayer | null {
  if (id === 'bat') return tick % 3 === 1 ? 'range' : 'off';
  if (id === 'flick') return 'magic';
  if (id === 'anchor-range') return tick % 2 === 1 ? 'range' : 'magic';
  if (id === 'double-blob') return tick % 2 === 1 ? 'magic' : 'range';
  if (id === 'two-tick') return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  if (id === 'two-tick-repair') return tick % 4 < 2 ? 'magic' : 'range';
  if (id === 'stack-one')
    return tick % 4 === 1 ? 'magic' : tick % 4 === 2 ? 'range' : null;
  if (id === 'reverse') return tick % 4 === 1 ? 'magic' : 'range';
  if (id === 'melee-blob')
    return (['melee', 'range', 'magic', 'range'] as Prayer[])[(tick - 1) % 4];
  if (isJad(id))
    return (tick - 3) % jadPeriod(id) === 0 ? jadStyle(id, tick, seed) : null;
  if (id === 'blowpipe') return null;
  if (id === 'rhythm' || hasSupplies(id))
    return tick % 4 === 1 ? 'magic' : 'off';
  if (id === 'alternate') return tick % 2 === 1 ? 'magic' : 'range';
  if (id === 'stack' || id === 'movement')
    return tick % 4 === 1 ? 'magic' : tick % 4 === 3 ? 'range' : null;
  if (id === 'gauntlet' && tick % 4 === 1) return 'magic';
  if (id === 'blob' && isBlobAttack(id, tick)) return pending;
  return null;
}
export function advance(
  state: DrillState,
  id: LessonId,
  prayer: Prayer,
  tile: number,
  supply: Supply | null = null,
  input: TickInput = {},
): DrillState {
  if (state.tick >= TOTAL_TICKS) return state;
  const tick = state.tick + 1;
  const added: Check[] = [];
  let pending = state.pending;
  let pendingB = state.pendingB;
  let exposure = '';
  const consumed = { ...state.consumed };
  let lastConsumedTick = state.lastConsumedTick;
  let gapSupply = tick % 4 === 1 ? null : state.gapSupply;
  let supplyMessage = '';
  if (hasSupplies(id) && supply) {
    const available = id === 'food' ? supply === 'shark' : supply !== 'shark';
    if (!available) supplyMessage = 'That item is not in this exercise.';
    else if (consumed[supply] >= stock[supply])
      supplyMessage = 'No supplies of that type remain.';
    else if (tick - lastConsumedTick < 3)
      supplyMessage = `Still on cooldown. Wait ${3 - (tick - lastConsumedTick)} more tick(s).`;
    else {
      consumed[supply]++;
      lastConsumedTick = tick;
      // The lesson asks for a supply action after an attack, on a quiet tick.
      if (tick % 4 !== 1) gapSupply = supply;
      supplyMessage =
        tick % 4 === 1
          ? 'Consumed on an attack tick. Practise using the quiet gap after the attack.'
          : `${supply === 'shark' ? 'Shark eaten' : supply === 'brew' ? 'Brew dose taken' : 'Restore dose taken'}. Return to Prayers before the next attack.`;
    }
  }
  if (isBlobScan(id, tick)) {
    pending =
      prayer === 'melee'
        ? 'magic'
        : prayer === 'off'
          ? tick % 12 === 1
            ? 'range'
            : 'magic'
          : opposite(prayer);
    if (id === 'blob')
      added.push({
        tick,
        kind: 'read',
        expected: 'magic or range',
        actual: prayer,
        correct: prayer !== 'off',
        message:
          prayer === 'off'
            ? 'Give the blob a protection prayer to read. With prayer off, its style is not controlled.'
            : `The blob read ${prayer}. Prepare ${pending} by tick ${tick + 3}.`,
      });
  }
  const expected = expectedPrayer(id, tick, pending, state.seed);
  if (expected !== null)
    added.push({
      tick,
      kind: 'prayer',
      expected,
      actual: prayer,
      correct: prayer === expected,
      message:
        prayer === expected
          ? expected === 'off'
            ? 'Good: prayer off on a quiet tick.'
            : `Protected ${expected}.`
          : expected === 'off'
            ? 'That was a quiet tick. Turn prayer off between attacks.'
            : `You needed ${expected} at tick ${tick}; ${prayer === 'off' ? 'your prayer was off' : `${prayer} was active`}. Select it before the tick bar fills.`,
    });
  if (id === 'double-blob' && tick % 6 === 2) pendingB = opposite(prayer);
  const blobAttacks: { name: string; style: Prayer }[] = [];
  if (isBlobAttack(id, tick) && id !== 'blob')
    blobAttacks.push({ name: 'Blob A', style: pending });
  if (id === 'double-blob' && tick % 6 === 5)
    blobAttacks.push({ name: 'Blob B', style: pendingB });
  for (const attack of blobAttacks) {
    if (id === 'melee-blob') {
      exposure =
        attack.style === prayer
          ? 'Blob attack protected this time.'
          : `Blob ${attack.style} is unprotected. The pattern reduces damage; it cannot cover every attack.`;
    } else
      added.push({
        tick,
        kind: 'prayer',
        expected: attack.style,
        actual: prayer,
        correct: prayer === attack.style,
        message: `${attack.name} attacks ${attack.style}: ${prayer === attack.style ? 'protected.' : 'exposed. Its prayer read was three ticks earlier.'}`,
      });
  }
  if (id === 'reverse' && tick % 3 === 1)
    exposure =
      prayer === 'range'
        ? 'Bat attack protected.'
        : 'Bat attack unprotected: it collides with the mager. Keep Magic and work towards isolating or killing the bat.';
  if (id === 'flick' && tick > 1) {
    const clicks = input.transitions || [];
    const correct =
      clicks.length === 2 &&
      clicks[0] === 'off' &&
      clicks[1] === 'magic' &&
      prayer === 'magic';
    added.push({
      tick,
      kind: 'flick',
      expected: 'off → magic',
      actual: clicks.join(' → ') || 'no clicks',
      correct,
      message: correct
        ? 'Off–on pair completed between beats.'
        : 'Conservation check missed: make one off–on pair after each beat, finishing on Magic before the next. Holding prayer alone does not pass.',
    });
  }
  if (id === 'blowpipe') {
    const shouldAttack = tick % 2 === 1;
    const correct = !!input.attack === shouldAttack;
    added.push({
      tick,
      kind: 'attack',
      expected: shouldAttack ? 'attack' : 'move during cooldown',
      actual: input.attack ? 'attack queued' : 'no attack',
      correct,
      message: correct
        ? shouldAttack
          ? 'Shot on the two-tick rhythm.'
          : 'Used the weapon cooldown for movement.'
        : shouldAttack
          ? 'Missed a shot. Click Attack before an odd beat.'
          : 'Weapon is on cooldown. Use this beat to move, then attack on the next odd tick.',
    });
  }
  if (hasMovement(id) && tick % movementPeriod(id) === 0) {
    const target = targetAt(tick, id);
    added.push({
      tick,
      kind: 'movement',
      expected: String(target),
      actual: String(tile),
      correct: tile === target,
      message:
        tile === target
          ? 'Reached the marked tile on time.'
          : 'Missed the marked tile. Queue your prayer first, then use the quiet tick to move.',
    });
  }
  if (hasSupplies(id) && tick % 4 === 0) {
    const goal = supplyGoal(id, tick);
    if (goal)
      added.push({
        tick,
        kind: 'supply',
        expected: goal,
        actual: gapSupply || 'none',
        correct: gapSupply === goal,
        message:
          gapSupply === goal
            ? `Good: ${goal === 'shark' ? 'ate a shark' : `drank a ${goal} dose`} in the gap, before the next attack.`
            : `This gap needed ${goal === 'shark' ? 'a shark' : `a ${goal} dose`}; ${gapSupply ? `you used ${gapSupply}` : 'no item registered on a quiet tick'}. Switch to Inventory after the attack, click the item, then return to Prayers.`,
      });
  }
  let streak = state.streak;
  let bestStreak = state.bestStreak;
  for (const check of added) {
    streak = check.correct ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    tick,
    monsterEvents: [
      ...state.monsterEvents,
      ...monsterEvents(id, tick, pending, pendingB, state.seed),
    ],
    pending,
    pendingB,
    exposure,
    exposures: exposure.includes('unprotected')
      ? [...state.exposures, { tick, message: exposure }]
      : state.exposures,
    seed: state.seed,
    checks: [...state.checks, ...added],
    streak,
    bestStreak,
    consumed,
    lastConsumedTick,
    gapSupply,
    supplyMessage,
  };
}
export function accuracy(checks: Check[]) {
  return checks.length
    ? Math.round((checks.filter((c) => c.correct).length / checks.length) * 100)
    : 0;
}
export function coaching(checks: Check[]) {
  const missed = checks.filter((c) => !c.correct);
  if (missed.some((c) => c.kind === 'flick'))
    return 'Your next focus: a single off–on pair between beats. Protection at the boundary and conservation clicks are separate checks.';
  if (missed.some((c) => c.kind === 'attack'))
    return 'Your next focus: shoot on the attack beat and move during the two-tick weapon cooldown. Avoid leaving the next shot idle.';
  if (!missed.length)
    return 'Clean run. Repeat at game speed without hints to make the rhythm stick.';
  if (missed.filter((c) => c.kind === 'supply').length > missed.length / 2)
    return 'Your next focus: the inventory trip. After protecting the attack, toggle prayer off, switch tabs, use one supply, and return before the next attack.';
  const movement = missed.filter((c) => c.kind === 'movement').length;
  if (movement > missed.length / 2)
    return 'Your next focus: movement. Select the prayer first, then use the space between attacks to click your target.';
  if (missed.some((c) => c.kind === 'read'))
    return 'Your next focus: blob reads. Keep a protection prayer on for the scan, then prepare the opposite style.';
  if (missed.filter((c) => c.expected === 'off').length > missed.length / 2)
    return 'Your next focus: the quiet ticks. Protect on the attack, then turn prayer off until the next attack is due.';
  return 'Your next focus: prepare the prayer before the beat. Try guided mode and use the filling tick bar to find a steady rhythm.';
}
