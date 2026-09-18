import type { CSSProperties } from 'react';
import {
  nextBlowpipeTile,
  type BlowpipeCommand,
  type BlowpipeState,
} from '../lib/blowpipe';
import sprites from '../lib/monsterSprites.json';

export function BlowpipeScene({
  state,
  tick,
  status,
  guided,
  queued,
  onCommand,
}: {
  state: BlowpipeState;
  tick: number;
  status: string;
  guided: boolean;
  queued: BlowpipeCommand | null;
  onCommand: (command: BlowpipeCommand) => void;
}) {
  const enabled = status === 'running' || status === 'countdown';
  const ready = state.nextShotTick <= tick + 1;
  const next = nextBlowpipeTile(state);
  const shotX = (state.shotFrom + 0.5) * 100;
  return (
    <div className="blowpipe-scene">
      <button
        className="blowpipe-target"
        disabled={!enabled}
        onClick={() => onCommand({ type: 'attack' })}
        aria-label="Attack practice target"
        aria-pressed={queued?.type === 'attack'}
      >
        <strong>Practice target</strong>
        <span
          className="monster-sprite"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${sprites.mager.idle.src})`,
            backgroundSize: '800% 100%',
          }}
        />
        <span>Attack</span>
      </button>
      <p className="blowpipe-route">
        Run to the {state.goal === 6 ? 'right' : 'left'} end, then turn back{' '}
        <span aria-hidden="true">{state.goal === 6 ? '→' : '←'}</span>
      </p>
      <div className="blowpipe-lane" role="group" aria-label="Running lane">
        {Array.from({ length: 7 }, (_, tile) => (
          <button
            key={tile}
            disabled={!enabled}
            className={`blowpipe-tile ${tile === state.tile ? 'occupied' : ''} ${guided && !ready && tile === next ? 'suggested' : ''} ${queued?.type === 'move' && queued.tile === tile ? 'queued' : ''}`}
            aria-label={`Run to tile ${tile + 1}${tile === state.tile ? ', player' : ''}`}
            onClick={() => onCommand({ type: 'move', tile })}
          >
            <small>{tile + 1}</small>
            {tile === state.tile && (
              <img
                className="blowpipe-player"
                src="/icons/player.png"
                alt="Player"
              />
            )}
            {tile === state.goal && (
              <span className="route-flag" aria-label="End of route">
                ⚑
              </span>
            )}
          </button>
        ))}
      </div>
      {state.shotTick === tick && tick > 0 && status !== 'done' && (
        <svg
          className="blowpipe-projectile"
          viewBox="0 0 700 300"
          preserveAspectRatio="none"
          aria-hidden="true"
          key={state.shotTick}
        >
          <line
            x1={shotX}
            y1="245"
            x2="350"
            y2="90"
            strokeDasharray="12 1000"
            style={
              {
                '--dart-distance': `-${Math.hypot(350 - shotX, 155)}px`,
                animationPlayState: status === 'running' ? 'running' : 'paused',
              } as CSSProperties
            }
          />
        </svg>
      )}
    </div>
  );
}
