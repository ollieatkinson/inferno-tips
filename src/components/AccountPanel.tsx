import { useCallback, useEffect, useRef, useState } from 'react';
import { Verification } from './CloudScores';
import { api } from '../lib/cloudClient';
import {
  ACCOUNT_CHANGED,
  accountChanged,
  discardDrill,
  emptyAccount,
  getAccount,
  pendingDrills,
  socialSignIn,
  syncDrill,
} from '../lib/accountClient';
import type { AccountView } from '../lib/accountProtocol';
import { lessons } from '../lib/course';
import { parseProgress, STORAGE_KEY } from '../lib/progress';

export function useAccount() {
  const [account, setAccount] = useState<AccountView>(emptyAccount);
  const [error, setError] = useState('');
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const next = await getAccount();
      if (request !== latestRequest.current) return;
      setAccount(next);
      setError('');
    } catch {
      if (request !== latestRequest.current) return;
      setError('Account sync is unavailable. Browser practice still works.');
    }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener(ACCOUNT_CHANGED, refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      latestRequest.current++;
      window.removeEventListener(ACCOUNT_CHANGED, refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  return { account, error, refresh };
}
export function AccountPanel({
  account,
  error,
  refresh,
}: {
  account: AccountView;
  error: string;
  refresh: () => Promise<void>;
}) {
  const [token, setToken] = useState(''),
    [reset, setReset] = useState(0),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  const [verification, setVerification] = useState(false);
  const staging =
    typeof location !== 'undefined' &&
    location.hostname === 'inferno-tips-api-staging.oliveratkinson.workers.dev';
  const pending = account.user ? pendingDrills(account.user.id) : [];
  const availableProviders = (['discord', 'google'] as const).filter(
    (provider) => account.providers[provider],
  );
  const providerReady = availableProviders.length > 0;
  const linkableProviders = availableProviders.filter(
    (provider) => !account.linkedProviders.includes(provider),
  );
  const signInOptions = availableProviders
    .map((provider) => (provider === 'discord' ? 'Discord' : 'Google'))
    .join(' or ');
  async function act(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      await task();
      setMessage(success);
      await refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Something went wrong. Please retry.',
      );
    } finally {
      setBusy(false);
      setToken('');
      setReset((n) => n + 1);
    }
  }
  async function start(provider: 'google' | 'discord') {
    await act(
      () => socialSignIn(provider, token, !!account.user),
      'Opening sign-in…',
    );
  }
  return (
    <section className="account-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>{account.user ? 'Your account' : 'Keep your progress'}</h1>
          <p>
            {account.user
              ? 'Your completed drills follow you between devices.'
              : `Sign in with ${signInOptions || 'Discord'} to save drill results across devices. You can keep practising without an account.`}
          </p>
        </div>
      </div>
      {staging && (
        <p className="storage-notice">
          Staging · Separate accounts and scores from inferno.tips.
        </p>
      )}
      {(error || !account.enabled) && (
        <p role="status">
          {error || 'Accounts are not available here yet.'}{' '}
          <button className="text-button" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {typeof location !== 'undefined' &&
        new URLSearchParams(location.search).has('auth-error') && (
          <p role="alert">
            Sign-in did not finish. Retry below.
            {availableProviders.length > 1 &&
              ' When linking a second provider, both providers must use the same email address.'}
          </p>
        )}
      {account.enabled && (
        <>
          <div className="account-card">
            {account.user ? (
              <>
                <h2>{account.user.name}</h2>
                <p>{account.user.email}</p>
                <p>
                  Connected:{' '}
                  {account.linkedProviders.length
                    ? account.linkedProviders
                        .map((p) => (p === 'google' ? 'Google' : 'Discord'))
                        .join(', ')
                    : 'Signed-in session'}
                </p>
                <div className="account-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => api('/auth/sign-out', {}),
                        'Signed out on this device.',
                      )
                    }
                  >
                    Sign out
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => api('/auth/revoke-sessions', {}),
                        'Signed out on all devices.',
                      )
                    }
                  >
                    Sign out on all devices
                  </button>
                </div>
              </>
            ) : (
              <h2>Sign in</h2>
            )}
            {!providerReady && (
              <p>
                Sign-in is not available here yet. Your browser progress remains
                available.
              </p>
            )}
            {providerReady &&
              !deleting &&
              (!account.user || linkableProviders.length > 0) && (
                <>
                  {account.user && (
                    <p>
                      Link another provider with the same email address, within
                      an hour of signing in. Accounts are never merged
                      automatically.
                    </p>
                  )}
                  <Verification
                    siteKey={account.siteKey}
                    action="sign-in"
                    onToken={setToken}
                    reset={reset}
                  />
                  <div className="account-actions">
                    {(account.user
                      ? linkableProviders
                      : availableProviders
                    ).map((provider) => (
                      <button
                        key={provider}
                        className="button primary"
                        disabled={busy || !token}
                        onClick={() => void start(provider)}
                      >
                        {account.user ? 'Link' : 'Continue with'}{' '}
                        {provider === 'google' ? 'Google' : 'Discord'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            <p className="fine-print">
              No password to create. Your name and email stay private unless you
              choose a public name for a high score.{' '}
              <a href="/privacy/">Privacy Policy</a> ·{' '}
              <a href="/terms/">Terms of Service</a>
            </p>
          </div>
          {staging && !providerReady && (
            <div className="account-card">
              <h2>Test account verification</h2>
              <p>
                Check that Cloudflare verification works in your browser while
                the sign-in providers are being configured.
              </p>
              {verification ? (
                <>
                  <Verification
                    siteKey={account.siteKey}
                    action="sign-in"
                    onToken={setToken}
                    reset={reset}
                  />
                  <button
                    className="button primary"
                    disabled={!token || busy}
                    onClick={() =>
                      void act(
                        () => api('/account/verify', { token }),
                        'Verification succeeded. Google and Discord still need their client credentials before sign-in can work.',
                      )
                    }
                  >
                    Check verification
                  </button>
                </>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => setVerification(true)}
                >
                  Start verification
                </button>
              )}
            </div>
          )}
          {account.user && (
            <>
              <div className="account-card">
                <h2>Saved drill results</h2>
                <p>
                  Account passes come from completed challenges checked by the
                  server. Guided and interrupted runs count as practice.
                </p>
                <a className="button secondary" href="#progress">
                  View your progress
                </a>
                {pending.length > 0 && (
                  <>
                    <h3>
                      {pending.length} run{pending.length === 1 ? '' : 's'}{' '}
                      waiting to sync
                    </h3>
                    <p>
                      These runs belong to this account. Retrying never counts a
                      result twice.
                    </p>
                    {pending.map((run) => (
                      <div className="account-pending" key={run.ticket.id}>
                        <span>
                          {lessons.find((l) => l.id === run.ticket.lesson)
                            ?.title || 'Drill'}{' '}
                          · {new Date(run.updated).toLocaleDateString()}
                        </span>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(() => syncDrill(run), 'Run synced.')
                          }
                        >
                          Retry sync
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            discardDrill(run);
                            void refresh();
                          }}
                        >
                          Discard upload
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="account-card">
                <h2>Earlier browser history</h2>
                {account.imported ? (
                  <>
                    <p>
                      Imported on{' '}
                      {new Date(
                        account.imported.importedAt,
                      ).toLocaleDateString()}{' '}
                      · Unverified personal history. This does not award account
                      passes or public scores.
                    </p>
                    <ul>
                      {Object.entries(account.imported.progress).map(
                        ([id, p]) => (
                          <li key={id}>
                            {lessons.find((l) => l.id === id)?.title}: {p?.best}
                            % challenge · {p?.practiceBest}% guided ·{' '}
                            {p?.attempts} attempts
                            {p?.previousScoring && (
                              <small className="previous-score">
                                Earlier scoring: {p.previousScoring.best}%
                                challenge · {p.previousScoring.practiceBest}%
                                guided · {p.previousScoring.passes}/2 passes
                              </small>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Keep a one-time copy of this browser’s earlier results. It
                      will be labelled unverified, separate from account mastery
                      and public scores.
                    </p>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            api('/account/import', {
                              progress: parseProgress(
                                localStorage.getItem(STORAGE_KEY),
                              ),
                            }),
                          'Browser history imported as personal history.',
                        )
                      }
                    >
                      Import browser history
                    </button>
                  </>
                )}
                <h3>Guest high scores</h3>
                <p>
                  Attach server-validated scores saved with this browser’s guest
                  session to your account. A display name alone cannot claim a
                  score.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () => api('/account/claim-scores', {}),
                      'This browser’s guest scores are attached to your account.',
                    )
                  }
                >
                  Claim my guest scores
                </button>
              </div>
              {account.history.length > 0 && (
                <div className="account-card">
                  <h2>Recent attempts</h2>
                  <div className="account-history">
                    {account.history.map((run) => (
                      <article key={run.id}>
                        <strong>
                          {lessons.find((l) => l.id === run.lesson)?.title}
                        </strong>
                        <span>
                          {run.score}% ·{' '}
                          {run.practice
                            ? 'Practice'
                            : run.passed
                              ? 'Challenge passed'
                              : 'Challenge missed'}{' '}
                          · {new Date(run.finishedAt).toLocaleString()}
                        </span>
                        <p>{run.feedback}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              <div className="account-card">
                <h2>Your data</h2>
                <p>
                  Download your account details, imported history, and up to
                  10,000 recent completed drill attempts. Keybinds and sound
                  settings stay on each device.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      const data = await api('/account/export');
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json',
                        }),
                      );
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'inferno-tips-account.json';
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }, 'Account export downloaded.')
                  }
                >
                  Download my data
                </button>
                <hr />
                {deleting ? (
                  <>
                    <p>
                      Delete your account, saved drill results, and linked
                      public scores permanently? Browser-only progress remains
                      on this device. You must have signed in within the last
                      hour.
                    </p>
                    <Verification
                      siteKey={account.siteKey}
                      action="delete-account"
                      onToken={setToken}
                      reset={reset}
                    />
                    <div className="account-actions">
                      <button
                        className="button danger"
                        disabled={busy || !token}
                        onClick={() =>
                          void act(async () => {
                            await api(
                              '/account',
                              { confirm: true, token },
                              'DELETE',
                            );
                            setDeleting(false);
                            accountChanged();
                          }, 'Account deleted.')
                        }
                      >
                        Permanently delete account
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => {
                          setDeleting(false);
                          setToken('');
                        }}
                      >
                        Keep account
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setDeleting(true);
                      setToken('');
                    }}
                  >
                    Delete account…
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
      {message && (
        <p className="account-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
