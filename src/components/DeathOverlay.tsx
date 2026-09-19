import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { seriesTitle, type SeriesState, type HighScore } from '../lib/series';

export function DeathOverlay({
  run,
  best,
  encounter,
  storageError,
  onRetry,
  onExit,
}: {
  run: SeriesState;
  best?: HighScore;
  encounter: string;
  storageError: boolean;
  onRetry: () => void;
  onExit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const modal = dialog.current!;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const gutter = root.style.scrollbarGutter;
    if (window.innerWidth > root.clientWidth)
      root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    modal.showModal();
    title.current?.focus({ preventScroll: true });
    return () => {
      modal.close();
      root.style.overflow = overflow;
      root.style.scrollbarGutter = gutter;
    };
  }, []);
  useEffect(() => {
    // A prayer tap already in flight must not accidentally start another run.
    const timer = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <dialog
      ref={dialog}
      className="death-overlay"
      aria-labelledby="death-title"
      aria-describedby="death-context"
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ),
        ];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === title.current)
        ) {
          event.preventDefault();
          last?.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }}
    >
      <div className="death-content">
        <p className="death-mode" id="death-context">
          {seriesTitle(run.mode)} · No lives remaining
        </p>
        <h2 id="death-title" ref={title} tabIndex={-1}>
          YOU DIED
        </h2>
        <div className="death-summary">
          <p className="death-encounter">{encounter}</p>
          <dl className="death-stats">
            <div>
              <dt>Score</dt>
              <dd>{run.points.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Stage reached</dt>
              <dd>{run.stage + 1}</dd>
            </div>
            <div>
              <dt>Personal best</dt>
              <dd>{best ? best.points.toLocaleString() : '—'}</dd>
            </div>
          </dl>
          <p className="death-record">
            {run.practice
              ? 'Practice run · score not recorded'
              : storageError
                ? 'Storage unavailable · score kept for this visit'
                : best && run.points > 0 && run.points === best.points
                  ? 'Personal best · saved in this browser'
                  : run.points > 0
                    ? 'Your best is saved in this browser'
                    : 'A clean check earns your first points'}
          </p>
          <div className="death-actions">
            <button
              className="button death-retry"
              disabled={!ready}
              onClick={() => {
                // Return native-dialog focus while its original control still
                // exists, before Retry replaces the encounter DOM.
                const { scrollX, scrollY } = window;
                dialog.current?.close();
                window.scrollTo({
                  left: scrollX,
                  top: scrollY,
                  behavior: 'instant',
                });
                onRetry();
              }}
            >
              Retry run
            </button>
            <button
              className="button death-exit"
              disabled={!ready}
              onClick={onExit}
            >
              Back to drills
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
