import type { LessonId, Prayer } from './course';
export type MonsterType = 'mager' | 'ranger' | 'blob' | 'bat' | 'melee' | 'jad';
export interface Enemy {
  id: string;
  type: MonsterType;
  label: string;
  period: number;
  first: number;
}
export interface MonsterEvent {
  tick: number;
  enemy: string;
  kind: 'attack' | 'read' | 'cue';
  style: Prayer;
}
const mager: Enemy = {
  id: 'mager',
  type: 'mager',
  label: 'Mager',
  period: 4,
  first: 1,
};
const blob: Enemy = {
  id: 'blob',
  type: 'blob',
  label: 'Blob',
  period: 6,
  first: 4,
};
const ranger: Enemy = {
  id: 'ranger',
  type: 'ranger',
  label: 'Ranger',
  period: 4,
  first: 1,
};
export function enemiesFor(id: LessonId): Enemy[] {
  if (id === 'blowpipe') return [];
  if (id === 'jad')
    return [{ id: 'jad', type: 'jad', label: 'Jad', period: 8, first: 3 }];
  if (id === 'triples')
    return [0, 1, 2].map((i) => ({
      id: `jad-${i}`,
      type: 'jad',
      label: `Jad ${i + 1}`,
      period: 9,
      first: 3 + i * 3,
    }));
  if (id === 'bat')
    return [{ id: 'bat', type: 'bat', label: 'Bat', period: 3, first: 1 }];
  if (id === 'blob') return [blob];
  if (id === 'anchor-range') return [ranger, blob];
  if (id === 'double-blob')
    return [
      mager,
      { ...blob, label: 'Blob A' },
      { ...blob, id: 'blob-b', label: 'Blob B', first: 5 },
    ];
  if (['alternate', 'gauntlet', 'two-tick'].includes(id)) return [mager, blob];
  if (id === 'two-tick-repair') return [mager, { ...blob, first: 5 }];
  if (['stack', 'movement', 'stack-one'].includes(id))
    return [mager, { ...ranger, first: id === 'stack-one' ? 2 : 3 }];
  if (id === 'reverse')
    return [
      mager,
      { id: 'bat', type: 'bat', label: 'Bat', period: 3, first: 1 },
    ];
  if (id === 'melee-blob')
    return [
      { id: 'melee', type: 'melee', label: 'Melee', period: 4, first: 1 },
      blob,
    ];
  return [mager];
}
export function jadStyleForTick(id: LessonId, tick: number, seed = 0): Prayer {
  const cycle = Math.floor(
    (Math.max(3, tick) - 3) / (id === 'triples' ? 3 : 8),
  );
  let value = Math.imul(cycle + seed + 7, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) & 1 ? 'magic' : 'range';
}
export function monsterEvents(
  id: LessonId,
  tick: number,
  pending: Prayer,
  pendingB: Prayer,
  seed: number,
): MonsterEvent[] {
  const events: MonsterEvent[] = [];
  for (const enemy of enemiesFor(id)) {
    if (
      enemy.type === 'blob' &&
      tick >= enemy.first - 3 &&
      (tick - (enemy.first - 3)) % 6 === 0
    )
      events.push({
        tick,
        enemy: enemy.id,
        kind: 'read',
        style: enemy.id === 'blob-b' ? pendingB : pending,
      });
    if (
      enemy.type === 'jad' &&
      tick >= enemy.first - 3 &&
      (tick - (enemy.first - 3)) % enemy.period === 0
    )
      events.push({
        tick,
        enemy: enemy.id,
        kind: 'cue',
        style: jadStyleForTick(id, tick + 3, seed),
      });
    if (tick < enemy.first || (tick - enemy.first) % enemy.period !== 0)
      continue;
    const style: Prayer =
      enemy.type === 'blob'
        ? enemy.id === 'blob-b'
          ? pendingB
          : pending
        : enemy.type === 'mager'
          ? 'magic'
          : enemy.type === 'melee'
            ? 'melee'
            : enemy.type === 'jad'
              ? jadStyleForTick(id, tick, seed)
              : 'range';
    events.push({ tick, enemy: enemy.id, kind: 'attack', style });
  }
  return events;
}
