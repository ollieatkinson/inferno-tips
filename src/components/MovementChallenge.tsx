import { MOVEMENT_PASS_ROUNDS, MOVEMENT_ROUNDS } from '../lib/course';
import type { Check } from '../lib/engine';

export function MovementChallenge({
  checks,
  done,
  practice,
  canRetry,
  onRetry,
  onFinishPractice,
}: {
  checks: Check[];
  done: boolean;
  practice: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onFinishPractice: () => void;
}) {
  const rounds = checks.filter((check) => check.kind === 'round');
  const points = rounds.filter((check) => check.correct).length;
  const remaining = MOVEMENT_ROUNDS - rounds.length;
  const needed = Math.max(0, MOVEMENT_PASS_ROUNDS - points);
  const canPass = needed <= remaining;
  const last = rounds.at(-1);
  const lastChecks = last
    ? checks.filter(
        (check) => check.tick > last.tick - 4 && check.tick <= last.tick,
      )
    : [];
  const missedPrayers = lastChecks
    .filter((check) => check.kind === 'prayer' && !check.correct)
    .map((check) => (check.expected === 'range' ? 'Ranged' : 'Magic'));
  const missedTile = lastChecks.some(
    (check) => check.kind === 'movement' && !check.correct,
  );
  const feedback = !last
    ? 'Protect both attacks and reach the tile. One point per round.'
    : last.correct
      ? 'Both protected · tile reached · +1'
      : [
          missedTile ? 'Tile missed' : '',
          missedPrayers.length ? `Missed ${missedPrayers.join(' and ')}` : '',
          'no point',
        ]
          .filter(Boolean)
          .join(' · ');
  const outcome = practice
    ? `Practice · ${points}/${MOVEMENT_ROUNDS}`
    : done
      ? points === MOVEMENT_ROUNDS
        ? `Perfect: ${points}/${MOVEMENT_ROUNDS}`
        : points >= MOVEMENT_PASS_ROUNDS
          ? `Passed: ${points}/${MOVEMENT_ROUNDS}`
          : `Not passed: ${points}/${MOVEMENT_ROUNDS}`
      : `${points}/${MOVEMENT_ROUNDS} complete`;
  const requirement = practice
    ? done
      ? 'Practice complete. No challenge pass awarded.'
      : 'Finish the run for practice credit.'
    : done
      ? points === MOVEMENT_ROUNDS
        ? 'Every round complete.'
        : canPass
          ? 'Challenge pass earned.'
          : `${MOVEMENT_PASS_ROUNDS} complete rounds needed to pass.`
      : !canPass
        ? `${rounds.length - points} rounds missed. This run can no longer pass.`
        : needed === 0
          ? 'Pass secured. Go for a perfect run.'
          : needed === remaining
            ? 'Complete every remaining round to pass.'
            : `${needed} more needed · ${remaining} rounds left`;

  return (
    <section className="movement-challenge" aria-label="Challenge rounds">
      <div className="round-score">
        <strong>{outcome}</strong>
        <span>
          Target {MOVEMENT_PASS_ROUNDS}/{MOVEMENT_ROUNDS}
        </span>
      </div>
      <ol className="round-markers" aria-label="Nine challenge rounds">
        {Array.from({ length: MOVEMENT_ROUNDS }, (_, index) => {
          const round = rounds[index];
          const result = round
            ? round.correct
              ? 'complete'
              : 'missed'
            : index === rounds.length && !done
              ? 'current'
              : 'pending';
          return (
            <li
              key={index}
              data-result={result}
              aria-label={`Round ${index + 1}: ${result}`}
              aria-current={result === 'current' ? 'step' : undefined}
            >
              {round ? (round.correct ? '✓' : '×') : index + 1}
            </li>
          );
        })}
      </ol>
      <div
        className="round-update"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="round-requirement">{requirement}</p>
        <p className="round-feedback">
          {last && <span>Round {rounds.length}: </span>}
          {feedback}
        </p>
      </div>
      {!canPass && !practice && !done && canRetry && (
        <div className="round-actions">
          <button className="button secondary" onClick={onRetry}>
            Retry challenge
          </button>
          <button className="button secondary" onClick={onFinishPractice}>
            Finish as practice
          </button>
        </div>
      )}
    </section>
  );
}
