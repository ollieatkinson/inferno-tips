import { useEffect, useRef, type RefObject } from 'react';

// Paint the actual clock's phase. This display never advances or schedules a
// game tick, and a prayer click cannot restart it.
export function TickMeter({
  deadline,
  paused,
}: {
  deadline: RefObject<number | null>;
  paused: boolean;
}) {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (paused) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number;
    const paint = () => {
      const progress =
        deadline.current === null
          ? 0
          : Math.max(
              0,
              Math.min(1, 1 - (deadline.current - performance.now()) / 600),
            );
      const visible = reducedMotion.matches
        ? Math.floor(progress * 4) / 4
        : progress;
      if (bar.current) bar.current.style.transform = `scaleX(${visible})`;
      frame = window.requestAnimationFrame(paint);
    };
    paint();
    return () => window.cancelAnimationFrame(frame);
  }, [deadline, paused]);
  return (
    <div className="tick-meter" aria-hidden="true">
      <i ref={bar} style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}

export function CycleTick({
  tick,
  length,
  paused,
}: {
  tick: number;
  length: number;
  paused: boolean;
}) {
  const beat = tick > 0 ? ((tick - 1) % length) + 1 : null;
  const label = beat
    ? `Cycle tick ${beat} of ${length}${paused ? ', paused' : ''}`
    : 'Cycle not started';
  return (
    <span
      className="compact-cycle-tick"
      role="timer"
      aria-live="off"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{beat ?? '—'}</span>
    </span>
  );
}
