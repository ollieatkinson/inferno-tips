import { useEffect, useRef, useState } from 'react';
import {
  defaultSettings,
  readSettings,
  SETTINGS_KEY,
  type Settings,
} from '../lib/settings';
import {
  advanceZukTimer,
  changeZukTimer,
  formatZukTime,
  healerAdvice,
  initialZukTimer,
  nextActions,
  phaseNames,
  remainingZukMs,
  restoreZukTimer,
  ZUK_TIMER_KEY,
  type ZukAction,
  type ZukTimerState,
} from '../lib/zukTimer';

export default function ZukTimer() {
  const [state, setState] = useState(initialZukTimer);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [focus, setFocus] = useState(false);
  const [restored, setRestored] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [message, setMessage] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [history, setHistory] = useState<ZukTimerState[]>([]);
  const [lastAction, setLastAction] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const sounded = useRef<number | null>(null);
  const active = state.deadline !== null;
  const remaining = remainingZukMs(state, now);
  const advice = healerAdvice(state, now, settings.zukHealerWindow);
  const warning = active && remaining <= settings.zukWarning * 1000;

  useEffect(() => {
    const at = Date.now();
    setNow(at);
    setSettings(readSettings());
    setFocus(new URLSearchParams(location.search).get('focus') === '1');
    try {
      const saved = restoreZukTimer(sessionStorage.getItem(ZUK_TIMER_KEY), at);
      if (saved && saved.phase !== 'idle') {
        setState(saved);
        setRestored(true);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
    const refresh = () => setSettings(readSettings());
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setState((s) => advanceZukTimer(s, time));
    };
    const interval = window.setInterval(tick, 200);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', tick);
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        ZUK_TIMER_KEY,
        JSON.stringify({ version: 1, savedAt: Date.now(), state }),
      );
    } catch {
      setStorageError(true);
    }
  }, [state, ready]);

  async function unlockAudio() {
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === 'suspended') await audio.current.resume();
      return audio.current;
    } catch {
      setMessage('Sound could not start. The visual timer is still running.');
      return null;
    }
  }
  async function beep() {
    const context = await unlockAudio();
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    const at = context.currentTime;
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(
      (settings.zukVolume / 100) * 0.15,
      at + 0.015,
    );
    gain.gain.linearRampToValueAtTime(0, at + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.34);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  useEffect(() => {
    if (!settings.zukSound || !warning || sounded.current === state.deadline)
      return;
    sounded.current = state.deadline;
    void beep();
  }, [warning, state.deadline, settings.zukSound]);

  function act(action: ZukAction) {
    const at = Date.now();
    if (action === 'next' && at - lastAction < 400) return;
    if (action === 'next') setLastAction(at);
    setHistory((h) => [...h, state].slice(-20));
    setState(changeZukTimer(state, action, at));
    setNow(at);
    setMessage('');
    setResetOpen(false);
    setRestored(false);
    if (settings.zukSound) void unlockAudio();
  }
  function toggleFocus(value: boolean) {
    setFocus(value);
    const url = new URL(location.href);
    if (value) url.searchParams.set('focus', '1');
    else url.searchParams.delete('focus');
    historyReplace(url);
  }
  function historyReplace(url: URL) {
    window.history.replaceState(null, '', url);
  }
  function toggleSound() {
    const next: Settings = { ...readSettings(), zukSound: !settings.zukSound };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
    if (next.zukSound) void unlockAudio();
  }

  return (
    <div
      className={`zuk-shell ${focus ? 'zuk-focus' : ''}`}
      onClick={(event) => {
        if (
          !ready ||
          state.phase === 'done' ||
          resetOpen ||
          event.detail > 1 ||
          window.getSelection()?.toString() ||
          (event.target as Element).closest(
            'button, a, input, select, textarea, label, [role="button"], .zuk-toolbar, .zuk-corrections, .zuk-reset, .zuk-nav, .zuk-footer',
          )
        )
          return;
        act('next');
      }}
    >
      <nav className="zuk-nav" aria-label="Timer navigation">
        <a className="zuk-brand" href="/">
          <img src="/brand-mark.svg" alt="" width="28" height="28" />{' '}
          inferno.tips
        </a>
        <a href="/#lesson-zuk-thresholds">Zuk lessons</a>
        <a href="https://los.inferno.tips/">LoS tool ↗</a>
      </nav>
      <main className="zuk-main">
        <header className="zuk-heading">
          <p className="eyebrow">DURING YOUR RUN</p>
          <h1>Zuk set timer</h1>
          <p>
            Start on the first ranger and mager spawn. Mark each phase as it
            happens in game.
          </p>
        </header>
        <div className="zuk-toolbar" aria-label="Timer display and audio">
          <button
            className="button secondary"
            aria-pressed={focus}
            onClick={() => toggleFocus(!focus)}
          >
            {focus ? 'Exit focus mode' : 'Focus mode'}
          </button>
          <button
            className="text-button"
            aria-pressed={settings.zukSound}
            onClick={toggleSound}
          >
            Sound {settings.zukSound ? 'on' : 'off'}
          </button>
          <button className="text-button" onClick={() => void beep()}>
            Test sound
          </button>
          <a href="/#settings" target="_blank" rel="noreferrer">
            Settings ↗
          </a>
        </div>
        {restored && (
          <div className="zuk-notice" role="status">
            Timer restored. Check it against your current run; use “Set spawned
            now” to resynchronise.
            <button className="text-button" onClick={() => setRestored(false)}>
              Dismiss
            </button>
          </div>
        )}
        {storageError && (
          <p className="zuk-notice" role="status">
            Browser storage is unavailable. Keep this page open; changes may not
            survive a reload.
          </p>
        )}
        <div className="zuk-layout">
          <section
            className={`zuk-clock ${warning ? 'zuk-soon' : ''}`}
            aria-label="Set countdown"
          >
            <p className="zuk-phase" role="status">
              {phaseNames[state.phase]}
            </p>
            <p className="zuk-clock-label">
              {state.phase === 'paused'
                ? 'Time held until Jad'
                : state.phase === 'done'
                  ? 'Time left at finish'
                  : 'Next set · estimate'}
            </p>
            <div
              className="zuk-digits"
              role="timer"
              aria-live="off"
              aria-label="Time until next set"
            >
              {formatZukTime(remaining)}
            </div>
            <p className="zuk-clock-hint">
              {state.phase === 'idle'
                ? 'Ready when the first set appears.'
                : state.phase === 'paused'
                  ? 'At Jad spawn: resume and add 1:45 once.'
                  : state.phase === 'done'
                    ? 'Run complete.'
                    : warning
                      ? 'Set due soon — watch for the spawn.'
                      : 'Repeats every 3:30. Keep following the shield.'}
            </p>
            {state.phase !== 'done' && (
              <div>
                <button
                  className="button primary zuk-next"
                  disabled={!ready || now - lastAction < 400}
                  onClick={() => act('next')}
                >
                  {nextActions[state.phase]}
                </button>
                <p className="zuk-tap-hint">Tap anywhere to mark this phase.</p>
              </div>
            )}
            {state.setPending && state.phase !== 'done' && (
              <div className="zuk-set-status" role="status">
                <p>A set may still need attention.</p>
                <button
                  className="button secondary"
                  onClick={() => act('controlled')}
                >
                  Set under control
                </button>
              </div>
            )}
            {advice && (
              <aside
                className={`zuk-advice ${advice.caution ? 'caution' : ''}`}
                role="status"
              >
                <strong>{advice.title}</strong>
                <p>{advice.text}</p>
                <small>
                  Reminder window:{' '}
                  {formatZukTime(settings.zukHealerWindow * 1000)}. A planning
                  aid, not a fixed safe cutoff. Change it in Settings.
                </small>
              </aside>
            )}
            {state.phase === 'jad' && (
              <p className="zuk-phase-help">
                Mark Jad defeated when he dies. This does not reset or extend
                the set timer.
              </p>
            )}
            {state.phase === 'healers' && (
              <p className="zuk-phase-help">
                Follow the shield during enrage. Healers do not pause or reset
                set spawns.
              </p>
            )}
            <div className="zuk-corrections" aria-label="Timer corrections">
              <button
                className="button secondary"
                disabled={!active}
                onClick={() => act('sync')}
              >
                Set spawned now
              </button>
              <button
                className="text-button"
                disabled={state.phase === 'idle' || state.phase === 'done'}
                onClick={() => act('earlier')}
                aria-label="Subtract 5 seconds"
              >
                −5s
              </button>
              <button
                className="text-button"
                disabled={state.phase === 'idle' || state.phase === 'done'}
                onClick={() => act('later')}
                aria-label="Add 5 seconds"
              >
                +5s
              </button>
              <button
                className="text-button"
                disabled={!history.length}
                onClick={() => {
                  setState(advanceZukTimer(history.at(-1)!, Date.now()));
                  setHistory((h) => h.slice(0, -1));
                  setLastAction(0);
                  setMessage('Last action undone.');
                }}
              >
                Undo
              </button>
              <button
                className="text-button"
                onClick={() => setResetOpen(true)}
              >
                Reset
              </button>
            </div>
            {resetOpen && (
              <div
                className="zuk-reset"
                role="group"
                aria-label="Confirm timer reset"
              >
                <p>Reset this timer and start a new run?</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setHistory((h) => [...h, state].slice(-20));
                    setState(initialZukTimer());
                    setResetOpen(false);
                    setRestored(false);
                    setLastAction(0);
                    setMessage('Timer reset.');
                  }}
                >
                  Reset timer
                </button>
                <button
                  className="text-button"
                  onClick={() => setResetOpen(false)}
                >
                  Keep timer
                </button>
              </div>
            )}
            {message && <p role="status">{message}</p>}
          </section>
          <aside className="zuk-guide">
            <h2>Three timing inputs</h2>
            <ol>
              <li>
                <strong>First set spawned</strong>
                <p>
                  Click as the first ranger and mager appear. The countdown
                  starts at 3:30.
                </p>
              </li>
              <li>
                <strong>Below 600 HP</strong>
                <p>
                  Pause at the threshold. Use this window to finish your setup
                  for Jad.
                </p>
              </li>
              <li>
                <strong>Jad spawned · below 480 HP</strong>
                <p>
                  Resume with a one-time 1:45 extension. Sets then keep
                  repeating every 3:30.
                </p>
              </li>
            </ol>
            <h2>Before healers</h2>
            <p>
              After Jad, watch the set timer before crossing 240 HP. If a set is
              close, wait and get it under control first. Health, gear, shield
              position and execution still matter.
            </p>
            <p>
              “Jad defeated” and “Healers spawned” change the advice, not the
              clock. These are manual markers; the page cannot read the game.
            </p>
            <h2>Keep it beside the game</h2>
            <p>
              The timer keeps elapsed time when you switch tabs. Browsers can
              suspend background audio, especially on phones; test sound and
              keep the display visible when possible. Reloading restores this
              tab’s timer for up to 24 hours.
            </p>
            <p>
              <a href="/#lesson-healer-send">Read the healer lesson →</a>
            </p>
            <p className="fine-print">
              Mechanics:{' '}
              <a href="https://oldschool.runescape.wiki/w/Inferno/Strategies">
                OSRS Wiki
              </a>
              . Inspired by{' '}
              <a href="https://github.com/maxswa/inferno-timer">
                maxswa’s Inferno timer
              </a>
              ; implemented for Inferno Tips.
            </p>
          </aside>
        </div>
      </main>
      <footer className="zuk-footer">
        <span>Fan-made. Not affiliated with Jagex.</span>
        <span>
          <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a>
        </span>
      </footer>
    </div>
  );
}
