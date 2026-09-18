import { useLayoutEffect, useRef } from 'react';
import { enemiesFor } from '../lib/encounters';
import type { LessonId } from '../lib/course';
import { effectTiming, type AttackResult } from '../lib/combatEffects';

const keyFor = (hit: AttackResult) => `${hit.tick}-${hit.enemy}`;
function projectile(hit: AttackResult) {
  if (hit.type === 'melee') return null;
  if (hit.type === 'blob' || hit.type === 'bat') return null;
  return `/effects/projectile-${hit.type === 'jad' ? 'jad-' : ''}${hit.style}.webp`;
}

export function CombatEffects({
  id,
  tick,
  hits,
  running,
  active,
}: {
  id: LessonId;
  tick: number;
  hits: AttackResult[];
  running: boolean;
  active: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef({ tick: -1, fraction: 0 });
  const recent = hits.filter(
    (hit) => (tick - hit.tick) * 600 < effectTiming(hit).end,
  );
  useLayoutEffect(() => {
    if (progress.current.tick !== tick)
      progress.current = { tick, fraction: 0 };
    if (!active || !root.current || !recent.length) return;
    const arena = root.current.parentElement!;
    const started = performance.now(),
      fraction = progress.current.fraction;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let request = 0;
    const paint = (now: number) => {
      const part = Math.min(
        0.999,
        fraction + (running ? (now - started) / 600 : 0),
      );
      progress.current.fraction = part;
      const arenaRect = arena.getBoundingClientRect();
      const player = arena
        .querySelector('[data-player] > .game-icon')
        ?.getBoundingClientRect();
      if (!player) return;
      const target = {
        x: player.x + player.width / 2 - arenaRect.x,
        y: player.y + player.height * 0.45 - arenaRect.y,
      };
      recent.forEach((hit) => {
        const node = root.current?.querySelector<HTMLElement>(
          `[data-hit="${keyFor(hit)}"]`,
        );
        if (!node) return;
        const shot = node.querySelector<HTMLElement>('.enemy-projectile')!;
        const splat = node.querySelector<HTMLElement>('.player-hitsplat')!;
        const time = effectTiming(hit);
        const age = (tick - hit.tick + part) * 600;
        const source = arena
          .querySelector(`[data-enemy="${hit.enemy}"] .monster-sprite`)
          ?.getBoundingClientRect();
        const flying =
          age >= time.launch &&
          age < time.impact &&
          hit.style !== 'melee' &&
          !reduced;
        const landed = age >= time.impact && age < time.end;
        node.dataset.phase = landed
          ? 'impact'
          : flying
            ? 'projectile'
            : age < time.impact
              ? 'windup'
              : 'finished';
        shot.style.display = flying ? 'block' : 'none';
        splat.style.display = landed ? 'grid' : 'none';
        if (flying && source) {
          const ratio = Math.min(1, (age - time.launch) / time.flight);
          const falling = hit.type === 'jad' && hit.style === 'range';
          const start = falling
            ? { x: target.x, y: target.y - 110 }
            : {
                x: source.x + source.width / 2 - arenaRect.x,
                y: source.y + source.height * 0.45 - arenaRect.y,
              };
          const x = start.x + (target.x - start.x) * ratio;
          const y =
            start.y +
            (target.y - start.y) * ratio -
            (falling ? 0 : Math.sin(ratio * Math.PI) * 22);
          shot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        }
        if (landed) {
          // Offset simultaneous attacks so, for example, a blocked mager hit
          // cannot cover the red bat hitsplat in the reverse-flick drill.
          const roster = enemiesFor(id);
          const slot = roster.findIndex((enemy) => enemy.id === hit.enemy);
          const x = target.x + (slot - (roster.length - 1) / 2) * 30;
          const rise = reduced ? 0 : Math.min(10, (age - time.impact) / 90);
          splat.style.transform = `translate(${x}px, ${target.y - rise}px) translate(-50%, -50%)`;
        }
      });
      if (running && !reduced && part < 0.999)
        request = requestAnimationFrame(paint);
    };
    paint(started);
    return () => cancelAnimationFrame(request);
  }, [id, tick, hits, running, active]);
  return (
    <div
      className="combat-effects"
      ref={root}
      aria-label="Incoming attack effects"
    >
      {active &&
        recent.map((hit) => {
          const src = projectile(hit);
          return (
            <div
              key={keyFor(hit)}
              data-hit={keyFor(hit)}
              data-enemy-source={hit.enemy}
              data-blocked={hit.blocked}
            >
              <span
                className={`enemy-projectile projectile-${hit.type} projectile-${hit.style}`}
                role="img"
                aria-label={`${hit.label} ${hit.style} projectile`}
                style={{ display: 'none' }}
              >
                {src ? (
                  <img src={src} alt="" />
                ) : (
                  <i className="projectile-orb" />
                )}
                {hit.type === 'ranger' && src && (
                  <img className="second-projectile" src={src} alt="" />
                )}
              </span>
              <span
                className={`player-hitsplat ${hit.blocked ? 'blocked' : 'damage'}`}
                role="img"
                aria-label={`${hit.label}: ${hit.blocked ? 'blocked, 0 damage' : `${hit.damage} simulated damage`}`}
                title={`${hit.label}: ${hit.blocked ? 'blocked' : 'simulated damage'} · prayer checked on tick ${hit.tick}`}
                style={{ display: 'none' }}
              >
                {hit.damage}
              </span>
            </div>
          );
        })}
    </div>
  );
}
