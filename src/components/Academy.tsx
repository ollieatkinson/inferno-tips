import { useEffect, useRef, useState } from 'react';
import { lessons, PASS_SCORE, sourceLinks, TOTAL_TICKS, type Lesson, type LessonId, type Mode, type Prayer } from '../lib/course';
import { accuracy, advance, coaching, expectedPrayer, hasBlob, hasMovement, initialState, targetAt, type DrillState } from '../lib/engine';
import { parseProgress, recordRun, STORAGE_KEY, type Progress } from '../lib/progress';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    flame: 'M13 2c2 6-4 6-2 10 2-1 3-3 3-5 7 7 4 13-2 13S3 14 7 8c0 4 2 3 3 2 2-3 1-5 3-8Z',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    book: 'M3 4h6c2 0 3 1 3 2 0-1 1-2 3-2h6v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3zM12 6v15',
    play: 'm8 4 12 8-12 8z',
    chart: 'M4 20V10m8 10V4m8 16v-7',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    external: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-7z',
    target: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M12 10v4m-2-2h4',
    reset: 'M3 10a9 9 0 1 1 1 8M3 3v7h7',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}
function GameIcon({ name, className = '' }: { name: string; className?: string }) { return <img className={`game-icon ${className}`} src={`/icons/${name}.png`} alt="" draggable={false} />; }
type Page = 'overview' | 'course' | 'drills' | 'progress' | 'resources';

export default function Academy() {
  const [page, setPage] = useState<Page>('overview');
  const [active, setActive] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [storageError, setStorageError] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  useEffect(() => { try { setProgress(parseProgress(localStorage.getItem(STORAGE_KEY))); } catch { setStorageError(true); } }, []);
  const mastered = lessons.filter(l => (progress[l.id]?.passes || 0) >= 2).length;
  const next = lessons.find(l => (progress[l.id]?.passes || 0) < 2) || lessons[5];
  function navigate(p: Page) { setPage(p); setActive(null); window.scrollTo(0, 0); }
  function launch(l: Lesson) { setActive(l); window.scrollTo(0, 0); }
  function saveRun(id: LessonId, score: number, mode: Mode, ticks: number, interrupted: boolean) {
    setProgress(prev => {
      const updated = recordRun(prev, id, score, mode, ticks, interrupted);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setStorageError(false); } catch { setStorageError(true); }
      return updated;
    });
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('overview')} aria-label="Inferno Tips home"><span className="brand-mark"><Icon name="flame" size={27} /></span><span>inferno<span className="muted">.tips</span><small>THE PRACTICE GROUNDS</small></span></button>
      <div className="nav-label">YOUR TRAINING</div>
      <nav aria-label="Main navigation">{([
        ['overview', 'grid', 'Overview'], ['course', 'book', 'Learning path'], ['drills', 'bolt', 'Practice drills'], ['progress', 'chart', 'Your progress'],
      ] as const).map(([id, icon, label]) => <button key={id} className={`nav-item ${page === id && !active ? 'active' : ''}`} aria-current={page === id && !active ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={icon} />{label}{id === 'course' && <span className="nav-count">6</span>}</button>)}</nav>
      <div className="nav-label resources-label">GO A LITTLE DEEPER</div>
      <button className={`nav-item ${page === 'resources' ? 'active' : ''}`} onClick={() => navigate('resources')}><Icon name="book" />Guides & resources</button>
      <a className="nav-item" href={sourceLinks.los} target="_blank" rel="noreferrer"><Icon name="target" />Wave simulator<Icon name="external" size={14} /></a>
      <div className="sidebar-bottom"><div className="cape-badge"><Icon name="flame" size={22} /></div><strong>One tick closer.</strong><p>Every good run starts<br />with a little practice.</p><div className="fan-label"><span /> Made for the OSRS community</div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">The practice grounds <span>/</span> <b>{active ? active.title : { overview: 'Overview', course: 'Learning path', drills: 'Practice drills', progress: 'Your progress', resources: 'Guides & resources' }[page]}</b></div><span className="local-badge"><span />No login. Just practice.</span></header>
      <main id="main">
        {storageError && <p className="storage-notice" role="status">Browser storage is unavailable. You can keep practising, but progress will only last for this visit.</p>}
        {active ? <Trainer key={active.id} lesson={active} progress={progress[active.id]} onExit={() => setActive(null)} onComplete={saveRun} onNext={() => { const index = lessons.findIndex(l => l.id === active.id); launch(lessons[(index + 1) % lessons.length]); }} /> : <>
          {page === 'overview' && <>
            <div className="page-heading"><div><span className="eyebrow">LESS PANIC. MORE PRACTICE.</span><h1>Your cape starts here.</h1><p>Break the Inferno down. Build the muscle memory. Go again.</p></div><span className="small-tag"><span className="orange-dot" /> OLD SCHOOL RUNESCAPE</span></div>
            <section className="hero">
              <div className="hero-copy"><span className="eyebrow"><span className="orange-dot" /> SMALL DRILLS. BIG DIFFERENCE.</span><h2>A little practice.<br />A better run.</h2><p>That blob doesn’t have to end your run.<br />Learn one mechanic at a time, in a place<br className="desktop-break" /> where mistakes cost nothing.</p><button className="button primary" onClick={() => launch(next)}>{Object.keys(progress).length ? 'Continue learning' : 'Start learning'}<Icon name="arrow" size={18} /></button><span className="hero-note">6 lessons <span>·</span> Bite-sized practice <span>·</span> Zero supplies</span></div>
              <div className="hero-art" aria-hidden="true"><div className="arena-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="isometric-floor" /><div className="lava-crack crack-one" /><div className="lava-crack crack-two" /><img className="hero-blob" src="/icons/blob.png" alt="" /><div className="float-prayer magic"><GameIcon name="protect-magic" /></div><div className="float-prayer ranged"><GameIcon name="protect-range" /></div><div className="mob-label"><span />JAL-AK<span className="muted"> / </span> THE BLOB</div><div className="tick-caption"><i /><i /><i className="lit" /><i /><i /><i /><span>READ. SWITCH. REPEAT.</span></div></div>
            </section>
            <div className="stat-strip"><div><span className="stat-icon"><Icon name="book" /></span><p><strong>Learn the why</strong><span>Understand before you click.</span></p></div><div><span className="stat-icon"><Icon name="target" /></span><p><strong>Practise the how</strong><span>Short drills. Instant feedback.</span></p></div><div><span className="stat-icon"><Icon name="chart" /></span><p><strong>Make it second nature</strong><span>Build consistency, not just a score.</span></p></div></div>
            <div className="overview-columns"><section className="path-section"><div className="section-heading"><div><span className="eyebrow">A PLAN, NOT A PLAYLIST</span><h2>Your learning path</h2></div><button className="text-button" onClick={() => navigate('course')}>View course<Icon name="arrow" size={16} /></button></div><p className="section-intro">Start simple. Add a little pressure when you’re ready.</p><div className="compact-lessons">{lessons.slice(0, 3).map((l, i) => <button className="lesson-row" key={l.id} onClick={() => launch(l)}><span className={`lesson-number ${progress[l.id]?.passes === 2 ? 'complete' : ''}`}>{progress[l.id]?.passes === 2 ? <Icon name="check" size={16} /> : `0${i + 1}`}</span><span className="lesson-row-copy"><strong>{l.title}</strong><small>{l.description}</small></span><span className="row-level">{l.level}</span><Icon name="arrow" size={17} /></button>)}</div><div className="path-footer"><span>YOUR PROGRESS</span><div className="mini-progress"><i style={{ width: `${mastered / 6 * 100}%` }} /></div><b>{mastered} / 6 mastered</b></div></section><aside className="coach-card"><span className="eyebrow"><Icon name="flame" size={16} /> THE RIGHT MINDSET</span><h3>You don’t need to<br />learn it all at once.</h3><p>Pick one mechanic. Slow it down. Repeat until it feels boring.<br />That’s when it’s starting to stick.</p><div className="coach-rule" /><span className="coach-tip">Today’s goal</span><strong>One drill. A little more confidence.</strong><button className="text-button" onClick={() => launch(next)}>Let’s do it<Icon name="arrow" size={16} /></button></aside></div>
            <div className="section-heading practice-heading"><div><span className="eyebrow">STRAIGHT INTO THE ACTION</span><h2>Pick something to practise</h2></div><button className="text-button" onClick={() => navigate('drills')}>All drills<Icon name="arrow" size={16} /></button></div>
            <div className="drill-grid">{[lessons[1], lessons[3], lessons[4]].map(l => <DrillCard key={l.id} lesson={l} onClick={() => launch(l)} progress={progress} />)}</div>
          </>}
          {(page === 'course' || page === 'drills') && <><div className="page-heading"><div><span className="eyebrow">{page === 'course' ? 'YOUR FIRST CAPE IS A SERIES OF SMALL WINS' : 'A FEW MINUTES WELL SPENT'}</span><h1>{page === 'course' ? 'One mechanic at a time.' : 'Welcome to the practice grounds.'}</h1><p>{page === 'course' ? 'Learn with hints. Test at game speed. Score 90% twice to master a lesson.' : 'Every drill is open. Pick your weak spot and turn it into a strength.'}</p></div></div><div className="course-explainer"><Icon name="target" /><p><strong>Learn → practise → prove it.</strong> Guided mode runs at 0.9 seconds per tick. Challenges use the game’s 0.6-second beat, with prayer hints hidden. Two uninterrupted challenge passes earn mastery; you can explore any lesson at any time.</p></div><div className="drill-grid full-grid">{lessons.map((l, i) => <DrillCard key={l.id} lesson={l} index={i} progress={progress} onClick={() => launch(l)} />)}</div><div className="next-chapter"><Icon name="external" size={28} /><div><h3>Then, put it into a real wave layout.</h3><p>Explore pillars, line of sight, and enemy positioning in the companion tool.</p></div><a className="button secondary" href={sourceLinks.los} target="_blank" rel="noreferrer">Open wave simulator<Icon name="external" size={16} /></a></div></>}
          {page === 'progress' && <><div className="page-heading"><div><span className="eyebrow">CONSISTENCY IS THE GOAL</span><h1>Every rep counts.</h1><p>Your progress stays in this browser. No account, no leaderboard pressure.</p></div></div><div className="progress-stats"><div><strong>{mastered}<small> / 6</small></strong><span>Lessons mastered</span></div><div><strong>{Object.values(progress).reduce((n, p) => n + (p?.attempts || 0), 0)}</strong><span>Completed runs</span></div><div><strong>{Math.max(0, ...Object.values(progress).map(p => p?.best || 0))}<small>%</small></strong><span>Best challenge score</span></div></div><div className="progress-table">{lessons.map(l => <div key={l.id}><GameIcon name={l.icon} /><strong>{l.title}</strong><span>{progress[l.id]?.attempts ? `${progress[l.id]?.best || 0}% challenge · ${progress[l.id]?.practiceBest || 0}% practice` : 'Ready when you are'}</span><b>{progress[l.id]?.passes || 0}/2 passes</b><button className="button secondary" onClick={() => launch(l)}>Practise<Icon name="arrow" size={15} /></button></div>)}</div><p className="fine-print">Mastery requires two completed, uninterrupted challenges at 90% or above. Guided and paused runs count as practice.</p><div className="reset-area">{resetConfirm ? <><span>Delete all scores saved in this browser?</span><button className="button secondary" onClick={() => setResetConfirm(false)}>Keep progress</button><button className="button danger" onClick={() => { try { localStorage.removeItem(STORAGE_KEY); setProgress({}); setResetConfirm(false); } catch { setStorageError(true); } }}>Delete progress</button></> : <button className="text-button muted" onClick={() => setResetConfirm(true)}><Icon name="reset" size={15} />Reset saved progress</button>}</div></>}
          {page === 'resources' && <Resources />}
        </>}
        <footer><span className="footer-brand"><Icon name="flame" size={18} />inferno.tips <span>Made for the climb.</span></span><p>Fan-made. Not affiliated with Jagex.<br />RuneScape and game artwork © Jagex Ltd. <a href="/credits/">Credits & sources</a></p></footer>
      </main>
    </div>
  </div>;
}

function DrillCard({ lesson, onClick, progress, index }: { lesson: Lesson; onClick: () => void; progress: Progress; index?: number }) {
  return <button className={`drill-card drill-${lesson.id}`} onClick={onClick}><div className="drill-card-top"><span className="drill-art"><GameIcon name={lesson.icon} /></span><span className="small-tag">{progress[lesson.id]?.passes === 2 ? '✓ MASTERED' : lesson.level.toUpperCase()}</span></div><span className="eyebrow">{index !== undefined ? `0${index + 1} / ` : ''}{lesson.tag}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="drill-card-bottom"><span><Icon name="clock" size={14} />{lesson.id === 'blob' ? 'Read & react' : hasMovement(lesson.id) ? 'Prayer + movement' : 'Prayer timing'}</span><Icon name="arrow" size={18} /></div></button>;
}

function Resources() {
  return <><div className="page-heading"><div><span className="eyebrow">LEARN FROM THE COMMUNITY</span><h1>Good practice. Great teachers.</h1><p>A few places to go when you want to see the bigger picture.</p></div></div><div className="resource-grid"><a className="resource-card" href={sourceLinks.gnomonkey} target="_blank" rel="noreferrer"><span className="resource-symbol video-symbol">▶</span><span className="eyebrow">WATCH / GNOMONKEY</span><h2>A full run, explained.</h2><p>Gnomonkey’s Bowfa Inferno guide. Watch how an experienced player reads a wave, then return here to practise one part at a time.</p><span className="text-button">Watch the original guide<Icon name="external" size={16} /></span></a><a className="resource-card" href={sourceLinks.wiki} target="_blank" rel="noreferrer"><span className="resource-symbol"><Icon name="book" size={30} /></span><span className="eyebrow">READ / OSRS WIKI</span><h2>Your reference, between runs.</h2><p>Monster details, equipment, supplies, and wave strategy. Keep the Wiki close for the details that don’t need another guide here.</p><span className="text-button">Open the strategy guide<Icon name="external" size={16} /></span></a><a className="resource-card" href={sourceLinks.los} target="_blank" rel="noreferrer"><span className="resource-symbol"><Icon name="grid" size={30} /></span><span className="eyebrow">EXPLORE / INFERNO LOS</span><h2>Make sense of a messy wave.</h2><p>Move enemies, inspect line of sight, and step through a stack. Bring your prayer rhythm into the companion wave simulator.</p><span className="text-button">Try a wave layout<Icon name="external" size={16} /></span></a></div><section className="tips-panel"><span className="eyebrow">BETWEEN ATTEMPTS</span><h2>A better practice loop.</h2><div><article><b>01</b><h3>Name the mistake.</h3><p>“I missed a prayer after moving” is something you can train. “I’m bad at Inferno” isn’t useful feedback.</p></article><article><b>02</b><h3>Remove one distraction.</h3><p>Start in guided mode. Follow the beat without moving, then add the extra click once the rhythm settles.</p></article><article><b>03</b><h3>Take it back to a wave.</h3><p>After two clean challenges, try the mechanic in the LoS simulator. Revisit the drill when it feels rusty.</p></article></div></section><p className="fine-print">Lessons and exercises are original. Linked videos belong to their creators; no endorsement is implied. See <a href="/credits/">sources and simulation limits</a>.</p></>;
}

function Trainer({ lesson, progress, onExit, onComplete, onNext }: { lesson: Lesson; progress: { passes: number; best: number } | undefined; onExit: () => void; onComplete: (id: LessonId, score: number, mode: Mode, ticks: number, interrupted: boolean) => void; onNext: () => void }) {
  const [mode, setMode] = useState<Mode>('guided');
  const [status, setStatus] = useState<'ready' | 'countdown' | 'running' | 'paused' | 'done'>('ready');
  const [state, setState] = useState<DrillState>(initialState);
  const [prayer, setPrayer] = useState<Prayer>('off');
  const [tile, setTile] = useState(12);
  const [countdown, setCountdown] = useState(3);
  const [interrupted, setInterrupted] = useState(false);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const prayerRef = useRef<Prayer>('off');
  const tileRef = useRef(12);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const completeRef = useRef(onComplete);
  const savedRef = useRef(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const ms = mode === 'guided' ? 900 : 600;
  const nextTick = Math.min(TOTAL_TICKS, state.tick + 1);
  const expected = expectedPrayer(lesson.id, nextTick, state.pending);
  const target = targetAt(nextTick);
  const score = accuracy(state.checks);
  const busy = status === 'running' || status === 'countdown' || status === 'paused';
  completeRef.current = onComplete;
  soundRef.current = sound;
  function selectPrayer(p: Prayer) { prayerRef.current = p; setPrayer(p); }
  function move(t: number) { tileRef.current = t; setTile(t); }
  function begin() { setState(initialState()); selectPrayer('off'); move(12); setCountdown(3); setInterrupted(false); savedRef.current = false; setStatus('countdown'); }
  function pause() { setInterrupted(true); setStatus('paused'); }
  function beep() {
    const ctx = audioRef.current;
    if (!soundRef.current || !ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    oscillator.start(); oscillator.stop(ctx.currentTime + 0.07);
  }
  useEffect(() => () => { void audioRef.current?.close(); }, []);
  useEffect(() => {
    if (status !== 'countdown') return;
    const timer = window.setTimeout(() => { beep(); if (countdown === 1) setStatus('running'); else setCountdown(c => c - 1); }, ms);
    return () => window.clearTimeout(timer);
  }, [status, countdown, ms]);
  useEffect(() => {
    if (status !== 'running') return;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      if (performance.now() - started > ms + 250) { pause(); return; }
      beep(); setState(prev => advance(prev, lesson.id, prayerRef.current, tileRef.current));
    }, ms);
    return () => window.clearTimeout(timer);
  }, [status, state.tick, ms, lesson.id]);
  useEffect(() => {
    if (state.tick === TOTAL_TICKS && !savedRef.current) {
      savedRef.current = true; setStatus('done'); completeRef.current(lesson.id, accuracy(state.checks), mode, state.tick, interrupted);
    }
  }, [state, mode, lesson.id, interrupted]);
  useEffect(() => { if (status === 'done') resultRef.current?.focus(); }, [status]);
  useEffect(() => {
    const visibility = () => { if (document.hidden && (status === 'running' || status === 'countdown')) pause(); };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [status]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat || (e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName))) return;
      const p = ({ '1': 'magic', '2': 'range', '0': 'off' } as Record<string, Prayer>)[e.key];
      if (p) { e.preventDefault(); selectPrayer(p); }
      if (e.key === 'Escape' && (status === 'running' || status === 'countdown')) { e.preventDefault(); pause(); }
      if (hasMovement(lesson.id) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault(); const t = tileRef.current; const x = t % 5, y = Math.floor(t / 5);
        move(e.key === 'ArrowLeft' ? y * 5 + Math.max(0, x - 1) : e.key === 'ArrowRight' ? y * 5 + Math.min(4, x + 1) : e.key === 'ArrowUp' ? Math.max(0, y - 1) * 5 + x : Math.min(4, y + 1) * 5 + x);
      }
    };
    document.addEventListener('keydown', keydown); return () => document.removeEventListener('keydown', keydown);
  }, [lesson.id, status]);
  let hint = expected === 'off' ? 'Quiet tick — turn prayer off.' : expected ? `Prepare ${expected === 'range' ? 'Ranged' : 'Magic'} before the beat.` : 'No attack this tick. Hold your prayer or prepare the next one.';
  if (hasBlob(lesson.id) && nextTick % 6 === 1) hint = lesson.id === 'blob' ? 'Blob scan next. Give it Magic or Ranged to read.' : 'Blob scan next. Start this beat on Magic.';
  const recent = state.checks.at(-1);
  return <div className="trainer-page">
    <button className="text-button back-button" onClick={onExit}>← Back to practice grounds</button>
    <div className="page-heading"><div><span className="eyebrow">LESSON 0{lessons.indexOf(lesson) + 1} / {lesson.level.toUpperCase()}</span><h1>{lesson.title}</h1><p>{lesson.objective}</p></div><GameIcon name={lesson.icon} className="lesson-heading-icon" /></div>
    <div className="trainer-layout"><section className="training-panel" aria-label="Interactive practice">
      <div className="training-toolbar"><div className="mode-switch" aria-label="Training mode"><button disabled={busy} aria-pressed={mode === 'guided'} className={mode === 'guided' ? 'selected' : ''} onClick={() => { setMode('guided'); setStatus('ready'); setState(initialState()); }}>Guided practice</button><button disabled={busy} aria-pressed={mode === 'challenge'} className={mode === 'challenge' ? 'selected' : ''} onClick={() => { setMode('challenge'); setStatus('ready'); setState(initialState()); }}>Challenge</button></div><span>{ms / 1000}s / tick</span></div>
      <div className="run-stats"><div><small>TICK</small><strong>{state.tick}<span> / {TOTAL_TICKS}</span></strong></div><div><small>ACCURACY</small><strong>{state.checks.length ? `${score}%` : '—'}</strong></div><div><small>STREAK</small><strong>{state.streak}<span> checks</span></strong></div></div>
      <div className={`training-arena ${hasMovement(lesson.id) ? 'with-movement' : ''}`}>
        {hasMovement(lesson.id) ? <><div className="movement-grid" aria-label="Movement practice grid">{Array.from({ length: 25 }, (_, i) => <button key={i} aria-label={`Tile ${i % 5 + 1}, ${Math.floor(i / 5) + 1}${i === target ? ', target' : ''}${i === tile ? ', player' : ''}`} className={`tile ${i === target ? 'target' : ''} ${i === tile ? 'player' : ''}`} onClick={() => move(i)}>{i === tile ? <GameIcon name="player" /> : i === target ? <span>◇</span> : null}</button>)}</div><p className="arena-caption">◇ Reach the marked tile by tick {Math.ceil(nextTick / 4) * 4} · coordination drill</p></> : <><div className="arena-floor" /><div className="enemy-line">{(lesson.id === 'stack' ? ['mager', 'ranger'] : hasBlob(lesson.id) ? ['blob'] : ['mager']).map(n => <div className="enemy" key={n}><GameIcon name={n} /><span>{n === 'blob' ? 'JAL-AK' : n === 'mager' ? 'JAL-ZEK' : 'JAL-XIL'}</span></div>)}</div><div className="player-avatar"><div className="overhead">{prayer !== 'off' && <GameIcon name={`protect-${prayer}`} />}</div><GameIcon name="player" /></div></>}
        {status === 'countdown' && <div className="arena-overlay"><strong>{countdown}</strong><span>Get ready · select Magic to start</span></div>}
        {status === 'paused' && <div className="arena-overlay"><Icon name="clock" size={35} /><h3>Take a breath.</h3><p>Paused runs count as practice.<br />Your progress in this run is safe.</p><button className="button primary" onClick={() => setStatus(state.tick === 0 ? 'countdown' : 'running')}>Resume practice<Icon name="play" size={15} /></button></div>}
      </div>
      <div className="tick-track"><div className="tick-label"><span>{status === 'running' ? `Preparing tick ${nextTick}` : status === 'done' ? 'Run complete' : status === 'countdown' ? 'Count in…' : status === 'paused' ? 'Paused' : 'Choose your prayer before each beat'}</span><span>{mode === 'guided' ? 'SLOW & STEADY' : 'GAME SPEED'}</span></div><div className="tick-meter"><i key={`${state.tick}-${status}`} className={status === 'running' ? 'ticking' : ''} style={{ animationDuration: `${ms}ms` }} /></div><div className="beat-dots">{Array.from({ length: 6 }, (_, i) => <span key={i} className={state.tick > 0 && (state.tick - 1) % 6 === i ? 'current' : ''}>{i + 1}</span>)}</div></div>
      <div className="prayer-controls">{(['magic', 'range', 'off'] as const).map(p => <button key={p} aria-pressed={prayer === p} className={`prayer-button ${prayer === p ? 'selected' : ''}`} onClick={() => selectPrayer(p)}>{p === 'off' ? <span className="off-icon">○</span> : <GameIcon name={`protect-${p}`} />}<span>{p === 'range' ? 'Ranged' : p === 'magic' ? 'Magic' : 'Off'}</span><kbd>{p === 'magic' ? '1' : p === 'range' ? '2' : '0'}</kbd></button>)}</div>
      <div className={`live-coach ${recent && !recent.correct ? 'miss' : ''}`}><Icon name={recent && !recent.correct ? 'target' : 'bolt'} size={18} /><p>{mode === 'guided' ? hint : 'Prayer hints are hidden. Trust your rhythm.'}{mode === 'guided' && recent && <small>{recent.message}</small>}</p></div>
      <div className="training-actions">{status === 'ready' || status === 'done' ? <button className="button primary" onClick={begin}><Icon name="play" size={15} />{status === 'done' ? 'Try again' : mode === 'guided' ? 'Start guided practice' : 'Start challenge'}</button> : <><button className="button secondary" onClick={status === 'paused' ? () => setStatus(state.tick === 0 ? 'countdown' : 'running') : pause}>{status === 'paused' ? 'Resume' : 'Pause'}</button><button className="text-button" onClick={() => { setState(initialState()); setStatus('ready'); }}>End run</button></>}<label className="sound-toggle"><input type="checkbox" checked={sound} onChange={async e => { const enabled = e.target.checked; setSound(enabled); if (enabled) { try { audioRef.current ||= new AudioContext(); await audioRef.current.resume(); setSoundError(false); } catch { setSound(false); setSoundError(true); } } }} />Tick sound</label></div>
      {soundError && <p className="fine-print" role="status">Audio is unavailable in this browser. The visual tick bar still works.</p>}
      <p className="control-note">Click prayers or use 1 / 2 / 0. {hasMovement(lesson.id) ? 'Click tiles or use arrow keys. ' : ''}Esc pauses. Keyboard shortcuts are practice aids, not OSRS controls.</p>
    </section><aside className="lesson-notes"><span className="eyebrow">BEFORE YOU BEGIN</span><h2>The idea is simple.</h2><ol>{lesson.steps.map(s => <li key={s}>{s}</li>)}</ol><div className="takeaway"><Icon name="book" size={20} /><p>{lesson.takeaway}</p></div><div className="mastery-note"><span className="eyebrow">MAKE IT STICK</span><h3>90% twice. Then move on.</h3><p>Finish two uninterrupted challenges at 90% or above. Guided runs help you get there.</p><div className="mastery-stamps">{[1, 2].map(n => <span key={n} className={(progress?.passes || 0) >= n ? 'earned' : ''}><Icon name="check" size={18} />Pass {n}</span>)}</div></div><a className="text-button" href={sourceLinks.wiki} target="_blank" rel="noreferrer">Mechanics on the OSRS Wiki<Icon name="external" size={14} /></a></aside></div>
    {status === 'done' && <section className="results" aria-label="Run results"><div className="result-header"><div><span className="eyebrow">{mode === 'challenge' && !interrupted ? 'CHALLENGE COMPLETE' : 'PRACTICE COMPLETE'}</span><h2 ref={resultRef} tabIndex={-1}>{score >= PASS_SCORE ? 'That’s a rhythm worth keeping.' : 'Another rep. Another step forward.'}</h2><p>{coaching(state.checks)}</p></div><strong className="result-score">{score}<span>%</span></strong></div><div className="result-details"><span>{state.checks.filter(c => c.correct).length} / {state.checks.length} checks correct</span><span>Best streak: {state.bestStreak}</span><span>{mode === 'challenge' && !interrupted && score >= PASS_SCORE ? '✓ Mastery pass earned' : interrupted ? 'Paused run · practice credit' : mode === 'guided' ? 'Guided run · practice credit' : `${PASS_SCORE}% earns a mastery pass`}</span></div><details><summary>Review all {state.checks.length} checks</summary><div className="review-list">{state.checks.map((c, i) => <div key={i} className={c.correct ? 'correct' : 'incorrect'}><b>{c.correct ? '✓' : '×'} Tick {c.tick}</b><span>{c.kind === 'read' ? 'Blob read' : c.kind === 'movement' ? 'Movement' : 'Prayer'}</span><p>{c.message}</p></div>)}</div></details><div className="result-actions"><button className="button primary" onClick={begin}>Repeat this drill<Icon name="reset" size={16} /></button>{mode === 'guided' && <button className="button secondary" onClick={() => { setMode('challenge'); setStatus('ready'); setState(initialState()); window.scrollTo({ top: 0 }); }}>Try at game speed<Icon name="arrow" size={16} /></button>}<button className="text-button" onClick={onNext}>Explore next lesson<Icon name="arrow" size={16} /></button></div></section>}
    <p className="fine-print">A local timing model: 36 ticks per run, no damage rolls, network latency, or prayer-point calculation. Hidden tabs and long browser stalls pause the drill. Scores reflect these exercises, not readiness to complete the Inferno.</p>
  </div>;
}
