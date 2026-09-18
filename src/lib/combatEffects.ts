import type { Prayer, LessonId } from './course';
import { enemiesFor, type MonsterEvent, type MonsterType } from './encounters';

export interface AttackResult {
  tick: number;
  enemy: string;
  label: string;
  type: MonsterType;
  style: Prayer;
  blocked: boolean;
  damage: number;
}

// These are feedback numbers, not gear-dependent combat rolls or an HP model.
export function resolveAttacks(
  id: LessonId,
  events: MonsterEvent[],
  prayer: Prayer,
  seed: number,
): AttackResult[] {
  const enemies = enemiesFor(id);
  return events
    .filter((e) => e.kind === 'attack')
    .map((event) => {
      const enemy = enemies.find((e) => e.id === event.enemy)!;
      const blocked = event.style === prayer;
      const roll =
        Math.imul(
          seed + event.tick * 31 + enemies.indexOf(enemy) * 7,
          0x45d9f3b,
        ) >>> 0;
      return {
        tick: event.tick,
        enemy: event.enemy,
        label: enemy.label,
        type: enemy.type,
        style: event.style,
        blocked,
        damage: blocked ? 0 : 1 + (roll % 18),
      };
    });
}

// Compact-scene presentation delays. Prayer checks remain at the recorded
// attack tick (Jad already has its three-tick reaction window in the engine).
export function effectTiming(hit: AttackResult) {
  const launch =
    hit.type === 'mager'
      ? 1200
      : hit.type === 'ranger'
        ? 1500
        : hit.type === 'melee'
          ? 0
          : 150;
  const flight = hit.type === 'melee' ? 300 : 450;
  return {
    launch,
    flight,
    impact: launch + flight,
    end: launch + flight + 900,
  };
}
