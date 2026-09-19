import type { RunFeedback as Feedback } from '../lib/runFeedback';

export function PracticeFeedback({
  report,
  compact = false,
}: {
  report: Feedback;
  compact?: boolean;
}) {
  const focus = report.issues[0];
  if (compact)
    return (
      <div className="retry-feedback" aria-label="Next attempt advice">
        <p>{report.summary}</p>
        {focus ? (
          <>
            <strong>
              {focus.title} · {focus.ticks.length}{' '}
              {focus.ticks.length === 1 ? 'tick' : 'ticks'}
            </strong>
            <p>{focus.advice}</p>
          </>
        ) : (
          <p>
            No missed requirements recorded. Keep the same rhythm on your next
            attempt.
          </p>
        )}
      </div>
    );
  if (!focus) return null;
  return (
    <section className="practice-feedback" aria-label="What to work on">
      <h3>What to work on</h3>
      <p>
        Start with the first item on your next attempt. Counts are missed ticks,
        not lost points; several mistakes can affect the same round.
      </p>
      <ul>
        {report.issues.map((issue) => (
          <li key={issue.kind}>
            <h4>
              {issue.title}{' '}
              <span>
                {issue.ticks.length}{' '}
                {issue.ticks.length === 1 ? 'tick' : 'ticks'}
              </span>
            </h4>
            <p className="feedback-example">{issue.example}</p>
            <p>
              <strong>Next time:</strong> {issue.advice}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
