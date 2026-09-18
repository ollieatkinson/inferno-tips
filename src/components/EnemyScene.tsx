import { useEffect, useLayoutEffect, useRef } from 'react';
import sprites from '../lib/monsterSprites.json';
import {
  enemiesFor,
  monsterEvents,
  type MonsterEvent,
  type MonsterType,
} from '../lib/encounters';
import type { DrillState } from '../lib/engine';
import type { LessonId } from '../lib/course';

type Sprite = { frames: number; durationMs: number; src: string };
const sheets = sprites as Record<MonsterType, Record<string, Sprite>>;
function MonsterSprite({
  type,
  tick,
  event,
  running,
}: {
  type: MonsterType;
  tick: number;
  event?: MonsterEvent;
  running: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const progress = useRef({ tick: -1, fraction: 0, key: '' });
  const clip = event ? sheets[type][event.style] : undefined;
  const key = event ? `${event.tick}-${event.style}` : '';
  useLayoutEffect(() => {
    if (progress.current.tick !== tick || progress.current.key !== key)
      progress.current = { tick, fraction: 0, key };
    const start = performance.now(),
      fraction = progress.current.fraction;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let request = 0;
    let painted = '';
    const paint = (now: number) => {
      const part = Math.min(
        0.999,
        fraction + (running ? (now - start) / 600 : 0),
      );
      progress.current.fraction = part;
      const elapsed = event ? (tick - event.tick + part) * 600 : 0;
      const playing = clip && elapsed < clip.durationMs;
      const sheet = playing ? clip : sheets[type].idle;
      const frame = playing
        ? Math.min(sheet.frames - 1, Math.floor(elapsed / 50))
        : 0;
      const rows = Math.ceil(sheet.frames / 8);
      const frameKey = `${sheet.src}:${frame}`;
      if (node.current && painted !== frameKey) {
        painted = frameKey;
        node.current.style.backgroundImage = `url("${sheet.src}")`;
        node.current.style.backgroundSize = `800% ${rows * 100}%`;
        node.current.style.backgroundPosition = `${((frame % 8) / 7) * 100}% ${rows === 1 ? 0 : (Math.floor(frame / 8) / (rows - 1)) * 100}%`;
        node.current.dataset.frame = String(frame);
        node.current.dataset.animation = playing ? event!.style : 'idle';
      }
      if (running && !reduced && playing && part < 0.999)
        request = requestAnimationFrame(paint);
    };
    paint(start);
    return () => cancelAnimationFrame(request);
  }, [type, tick, key, running, clip, event?.tick]);
  return (
    <span
      ref={node}
      className="monster-sprite"
      aria-hidden="true"
      style={{
        backgroundImage: `url("${sheets[type].idle.src}")`,
        backgroundSize: '800% 100%',
      }}
    />
  );
}
const styleName = (style: string) =>
  style === 'magic' ? 'Magic' : style === 'range' ? 'Ranged' : 'Melee';
export function EnemyScene({
  id,
  state,
  status,
  guided,
}: {
  id: LessonId;
  state: DrillState;
  status: string;
  guided: boolean;
}) {
  const enemies = enemiesFor(id);
  const active = status === 'running' || status === 'paused';
  useEffect(() => {
    for (const type of new Set(enemies.map((e) => e.type)))
      for (const sheet of Object.values(sheets[type]))
        new Image().src = sheet.src;
  }, [id]);
  if (!enemies.length) return null;
  const events = [
    ...monsterEvents(id, 0, 'off', 'off', state.seed),
    ...state.monsterEvents,
  ];
  return (
    <div
      className={`enemy-scene ${enemies.length === 3 ? 'three-enemies' : ''}`}
      role="group"
      aria-label="Enemy attacks"
    >
      {enemies.map((enemy) => {
        const current = active
          ? events.filter((e) => e.enemy === enemy.id && e.tick === state.tick)
          : [];
        const attack = current.find((e) => e.kind === 'attack');
        const read = current.find((e) => e.kind === 'read');
        const cue = current.find((e) => e.kind === 'cue');
        const animation = active
          ? events.findLast(
              (e) =>
                e.enemy === enemy.id &&
                e.kind === (enemy.type === 'jad' ? 'cue' : 'attack'),
            )
          : undefined;
        const next =
          state.tick < enemy.first
            ? enemy.first
            : state.tick +
              (enemy.period - ((state.tick - enemy.first) % enemy.period));
        return (
          <div
            key={enemy.id}
            className={`enemy-unit ${guided && attack ? 'enemy-attacking' : ''} ${guided && read ? 'enemy-reading' : ''}`}
            data-enemy={enemy.id}
            data-event={
              attack ? 'attack' : read ? 'read' : cue ? 'cue' : 'idle'
            }
          >
            <strong className="enemy-name">{enemy.label}</strong>
            <MonsterSprite
              type={enemy.type}
              tick={state.tick}
              event={animation}
              running={status === 'running'}
            />
            <div className="enemy-event">
              {attack ? (
                <span className={`attack-label style-${attack.style}`}>
                  <img src={`/icons/protect-${attack.style}.png`} alt="" />
                  {styleName(attack.style)} attack
                </span>
              ) : read ? (
                <span className="read-label">Prayer read</span>
              ) : cue ? (
                <span className={`attack-label style-${cue.style}`}>
                  {styleName(cue.style)} cue
                </span>
              ) : (
                <span className="enemy-rest">
                  {status === 'done'
                    ? 'Finished'
                    : active
                      ? 'Recovering'
                      : 'Ready'}
                </span>
              )}
            </div>
            {guided && (
              <small className="enemy-countdown">
                {enemy.type === 'blob' && active && state.tick < enemy.first - 3
                  ? `Read in ${enemy.first - 3 - state.tick}`
                  : enemy.type === 'blob' && !active
                    ? 'Reads, then attacks 3 ticks later'
                    : status === 'done'
                      ? ''
                      : `Attack in ${next - state.tick} tick${next - state.tick === 1 ? '' : 's'}`}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}
