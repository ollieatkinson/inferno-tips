import { useEffect, useRef, useState } from 'react';
import {
  api,
  CloudRecorder,
  discardPending,
  getBoard,
  getCloudConfig,
  pendingRuns,
  type CloudConfig,
  type PendingRun,
} from '../lib/cloudClient';
import { weekOf, type Board } from '../lib/cloudProtocol';
import { seriesTitle, type SeriesMode } from '../lib/series';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export function Verification({
  siteKey,
  onToken,
  reset,
  action = 'publish-score',
}: {
  siteKey: string;
  onToken: (token: string) => void;
  reset: number;
  action?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false,
      widget: string | undefined;
    setError('');
    callback.current('');
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-inferno-turnstile]',
    );
    if (script?.dataset.failed === 'true') {
      script.remove();
      script = null;
    }
    if (!script) {
      script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.dataset.infernoTurnstile = 'true';
      document.head.appendChild(script);
    }
    const render = () => {
      if (disposed || widget || !window.turnstile || !container.current) return;
      widget = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        theme: 'dark',
        size: 'compact',
        callback: (token: string) => callback.current(token),
        'expired-callback': () => callback.current(''),
        'error-callback': () => {
          callback.current('');
          setError(
            'Verification could not load. Check your connection and retry.',
          );
        },
      });
    };
    const fail = () => {
      if (script) script.dataset.failed = 'true';
      setError('Verification could not load. Check your connection and retry.');
    };
    script.addEventListener('load', render);
    script.addEventListener('error', fail);
    render();
    return () => {
      disposed = true;
      script?.removeEventListener('load', render);
      script?.removeEventListener('error', fail);
      if (widget) window.turnstile?.remove(widget);
    };
  }, [siteKey, reset, action]);
  return (
    <>
      <div ref={container} />
      {error && <p role="status">{error}</p>}
    </>
  );
}
export function ScoreSubmission({
  recorder,
  siteKey,
}: {
  recorder: CloudRecorder;
  siteKey: string;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [token, setToken] = useState('');
  const [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(''),
    [reset, setReset] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (saved)
    return (
      <p className="cloud-score-note" role="status">
        Public score saved. <a href="#scores">View high scores →</a>
      </p>
    );
  return (
    <div className="score-submission">
      {!open ? (
        <button className="button secondary" onClick={() => setOpen(true)}>
          Save public score
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            setSaving(true);
            setError('');
            try {
              await recorder.publish(name, token);
              if (mounted.current) setSaved(true);
            } catch (err) {
              if (mounted.current) {
                setError((err as Error).message);
                setToken('');
                setReset((r) => r + 1);
              }
            } finally {
              if (mounted.current) setSaving(false);
            }
          }}
        >
          <label>
            Public display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={24}
              required
              autoComplete="nickname"
              disabled={saving}
            />
          </label>
          <p>
            Your name and score will be public. Guest names are not verified or
            reserved.
          </p>
          <Verification siteKey={siteKey} onToken={setToken} reset={reset} />
          {error && <p role="alert">{error}</p>}
          {!recorder.persistent && (
            <p role="status">
              Browser storage is unavailable. Keep this page open until saving
              completes.
            </p>
          )}
          <div className="score-save-actions">
            <button className="button primary" disabled={saving || !token}>
              {saving ? 'Saving…' : 'Save score'}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={saving}
              onClick={() => {
                setToken('');
                setReset((r) => r + 1);
              }}
            >
              Retry verification
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
function PendingSubmission({
  saved,
  siteKey,
  onRemove,
}: {
  saved: PendingRun;
  siteKey: string;
  onRemove: () => void;
}) {
  const [recorder] = useState(() => new CloudRecorder(saved.ticket, saved));
  return (
    <article className="pending-score">
      <h3>
        {seriesTitle(saved.ticket.mode)} ·{' '}
        {new Date(saved.updated).toLocaleDateString()}
      </h3>
      <p>
        {saved.result
          ? `${saved.result.points} points · stage ${saved.result.stage}`
          : 'Recorded run awaiting upload and validation.'}
      </p>
      <ScoreSubmission recorder={recorder} siteKey={siteKey} />
      <button
        className="text-button"
        onClick={() => {
          discardPending(saved.ticket.id);
          onRemove();
        }}
      >
        Discard this unsaved run
      </button>
    </article>
  );
}
export function HighScores() {
  const [config, setConfig] = useState<CloudConfig | null>(null);
  const [mode, setMode] = useState<SeriesMode>('hard'),
    [period, setPeriod] = useState<'all' | 'weekly'>('all');
  const [version, setVersion] = useState<number>(),
    [week, setWeek] = useState(weekOf(Date.now()));
  const [board, setBoard] = useState<Board | null>(null),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingRun[]>([]),
    [confirmDelete, setConfirmDelete] = useState(false),
    [deleting, setDeleting] = useState(false);
  useEffect(() => {
    void getCloudConfig().then(setConfig);
    setPending(pendingRuns().filter((r) => r.reason === 'finish'));
  }, [refresh]);
  useEffect(() => {
    if (!config?.enabled) return;
    let active = true;
    setLoading(true);
    setError('');
    setBoard(null);
    void getBoard(mode, period, version, week)
      .then((value) => {
        if (active) setBoard(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [config, mode, period, version, week, refresh]);
  return (
    <div className="high-scores-page">
      <div className="page-heading">
        <div>
          <h1>High scores</h1>
          <p>
            Hard circuit and Endless gauntlet. One best result per guest on each
            board.
          </p>
        </div>
      </div>
      <div className="board-filters">
        <label>
          Challenge
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SeriesMode)}
          >
            <option value="hard">Hard circuit</option>
            <option value="endless">Endless gauntlet</option>
          </select>
        </label>
        <label>
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'all' | 'weekly')}
          >
            <option value="all">All-time</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        {period === 'weekly' && (
          <label>
            Week starting (UTC)
            <input
              type="date"
              value={week}
              max={weekOf(Date.now())}
              onChange={(e) => {
                if (e.target.value) setWeek(weekOf(Date.parse(e.target.value)));
              }}
            />
          </label>
        )}
        {board && board.versions.length > 1 && (
          <label>
            Scoring rules
            <select
              value={version ?? config?.version}
              onChange={(e) => setVersion(Number(e.target.value))}
            >
              {board.versions.map((v) => (
                <option key={v} value={v}>
                  Version {v}
                  {v === config?.version ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="fine-print">
        Equal scores, completion and stage share a rank. Weeks begin Monday at
        00:00 UTC; runs belong to the week they started. Names are guest labels.
      </p>
      {!config ? (
        <p role="status">Loading high scores…</p>
      ) : !config.enabled ? (
        <p role="status">
          Public high scores are not available yet. Your personal bests and
          practice still work in this browser.
        </p>
      ) : (
        <>
          {loading && <p role="status">Loading board…</p>}
          {error && <p role="alert">{error}</p>}
          <button
            className="text-button"
            onClick={() => setRefresh((r) => r + 1)}
          >
            Refresh scores
          </button>
          {board &&
            (board.entries.length ? (
              <div
                className="leaderboard-scroll"
                tabIndex={0}
                role="region"
                aria-label="High scores table"
              >
                <table className="leaderboard">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Stage</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={entry.mine ? 'my-score' : ''}
                      >
                        <td>{entry.rank}</td>
                        <td>
                          {entry.name}
                          {entry.mine && ' (you)'}
                        </td>
                        <td>{entry.points.toLocaleString()}</td>
                        <td>{entry.cleared ? 'Cleared' : entry.stage}</td>
                        <td>
                          {new Date(entry.publishedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No scores yet. Finish a run to set the first one.</p>
            ))}
          <p>
            <a className="button secondary" href={`#${mode}`}>
              Play {seriesTitle(mode)}
            </a>
          </p>
          {pending.length > 0 && (
            <section aria-label="Unsaved public scores">
              <h2>Runs waiting to be saved</h2>
              {pending.map((saved) => (
                <PendingSubmission
                  key={saved.ticket.id}
                  saved={saved}
                  siteKey={config.siteKey}
                  onRemove={() => setRefresh((r) => r + 1)}
                />
              ))}
            </section>
          )}
          <details className="guest-score-settings">
            <summary>Manage this browser’s public scores</summary>
            <p>
              Clearing browser cookies loses ownership of guest records. Local
              practice progress is separate.
            </p>
            {!confirmDelete ? (
              <button
                className="button secondary"
                onClick={() => setConfirmDelete(true)}
              >
                Remove my public scores
              </button>
            ) : (
              <>
                <p>
                  Remove all public scores belonging to this browser? This does
                  not reset local progress.
                </p>
                <button
                  className="button secondary"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await api('/scores/mine', undefined, 'DELETE');
                      setConfirmDelete(false);
                      setRefresh((r) => r + 1);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  Confirm removal
                </button>
                <button
                  className="text-button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </>
            )}
          </details>
        </>
      )}
    </div>
  );
}
