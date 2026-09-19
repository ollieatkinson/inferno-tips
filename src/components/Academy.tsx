import { DeathOverlay } from './DeathOverlay';
import {
  newSeries,
  updateSeries,
  stageLesson,
  stageValue,
  seriesTitle,
  parseHighScores,
  saveHighScore,
  SERIES_KEY,
  type SeriesMode,
  type SeriesState,
  type SeriesAction,
  type HighScores,
} from '../lib/series';
import { BlowpipeScene } from './BlowpipeScene';
import { nextBlowpipeTile, type BlowpipeCommand } from '../lib/blowpipe';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LearningPath, KNOWLEDGE_KEY } from './LearningPath';
import { chapters, fieldLessons } from '../lib/curriculum';
import { Overview } from './Overview';
import { losSetups, drillLosSetups } from '../lib/los';
import { SettingsPage } from './SettingsPage';
import { PrayerPreview } from './PrayerPreview';
import { CombatEffects } from './CombatEffects';
import { EnemyScene } from './EnemyScene';
import { GamePanels } from './GamePanels';
import { MovementChallenge } from './MovementChallenge';
import { TickMeter } from './TickMeter';
import { usePrayerSounds } from './usePrayerSounds';
import { useSupplySounds } from './useSupplySounds';
import {
  readSettings,
  SETTINGS_KEY,
  LEGACY_TAB_KEYS,
  type Settings,
} from '../lib/settings';
import {
  lessons,
  passScore,
  sourceLinks,
  lessonSource,
  drillTicks,
  mechanicGoals,
  type Lesson,
  type LessonId,
  type Mode,
  type Prayer,
} from '../lib/course';
import {
  accuracy,
  scoredChecks,
  advance,
  coaching,
  expectedPrayer,
  movementPeriod,
  isJad,
  jadPeriod,
  jadStyle,
  isBlobScan,
  hasBlob,
  hasMovement,
  hasSupplies,
  initialState,
  supplyGoal,
  targetAt,
  type DrillState,
  type Supply,
} from '../lib/engine';
import {
  parseProgress,
  recordRun,
  STORAGE_KEY,
  type Progress,
} from '../lib/progress';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    book: 'M3 4h6c2 0 3 1 3 2 0-1 1-2 3-2h6v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3zM12 6v15',
    play: 'm8 4 12 8-12 8z',
    chart: 'M4 20V10m8 10V4m8 16v-7',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    external: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-7z',
    target:
      'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M12 10v4m-2-2h4',
    reset: 'M3 10a9 9 0 1 1 1 8M3 3v7h7',
    settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
function GameIcon({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  return (
    <img
      className={`game-icon ${className}`}
      src={`/icons/${name}.png`}
      alt=""
      draggable={false}
    />
  );
}
const learningOrder = chapters
  .flatMap((c) => c.drills)
  .map((id) => lessons.find((l) => l.id === id)!);

type Page =
  | 'overview'
  | 'course'
  | 'drills'
  | 'progress'
  | 'resources'
  | 'settings'
  | 'hard'
  | 'endless';

export default function Academy() {
  const [page, setPage] = useState<Page>('overview');
  const returnRoute = useRef('#drills');
  const [settings, setSettings] = useState(readSettings);
  const [settingsError, setSettingsError] = useState(false);
  function saveSettings(value: Settings) {
    setSettings(value);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
      // Older versions still read tab bindings from this key.
      localStorage.setItem(LEGACY_TAB_KEYS, JSON.stringify(value.tabKeys));
      setSettingsError(false);
    } catch {
      setSettingsError(true);
    }
  }
  const [courseEntry, setCourseEntry] = useState<string>();
  const [active, setActive] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [storageError, setStorageError] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  useEffect(() => {
    try {
      setProgress(parseProgress(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setStorageError(true);
    }
  }, []);
  useEffect(() => {
    const followRoute = () => {
      const route = window.location.hash.slice(1);
      const drill = lessons.find((l) => `drill-${l.id}` === route);
      if (drill) {
        setActive(drill);
        setPage('drills');
        setCourseEntry(undefined);
        window.scrollTo(0, 0);
        return;
      }
      if (
        [
          'overview',
          'course',
          'drills',
          'progress',
          'resources',
          'settings',
          'hard',
          'endless',
        ].includes(route)
      ) {
        setPage(route as Page);
        setCourseEntry(undefined);
        setActive(null);
        window.scrollTo(0, 0);
        return;
      }
      const id = window.location.hash.replace(/^#lesson-/, '');
      if (!window.location.hash) {
        setPage('overview');
        setCourseEntry(undefined);
        setActive(null);
        return;
      }
      if (!fieldLessons.some((l) => l.id === id)) return;
      setCourseEntry(id);
      setPage('course');
      setActive(null);
    };
    followRoute();
    window.addEventListener('hashchange', followRoute);
    return () => window.removeEventListener('hashchange', followRoute);
  }, []);
  useEffect(() => {
    const heading = document.querySelector('main h1');
    document.title = `${heading?.textContent || 'Prayer drills & wave-solving guide'} — Inferno Tips`;
    if (!courseEntry && heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [page, active, courseEntry]);
  const mastered = lessons.filter(
    (l) => (progress[l.id]?.passes || 0) >= 2,
  ).length;
  const next =
    learningOrder.find((l) => (progress[l.id]?.passes || 0) < 2) ||
    lessons[lessons.length - 1];
  function navigate(p: Page) {
    setCourseEntry(undefined);
    window.location.hash = p;
    setPage(p);
    setActive(null);
    window.scrollTo(0, 0);
  }
  function openField(id: string) {
    window.location.hash = `lesson-${id}`;
    setCourseEntry(id);
    setPage('course');
    setActive(null);
  }
  function launch(l: Lesson) {
    if (!active) returnRoute.current = window.location.hash || '#overview';
    window.location.hash = `drill-${l.id}`;
    setActive(l);
    window.scrollTo(0, 0);
  }
  function saveRun(
    id: LessonId,
    score: number,
    mode: Mode,
    ticks: number,
    interrupted: boolean,
  ) {
    setProgress((prev) => {
      const updated = recordRun(prev, id, score, mode, ticks, interrupted);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
      return updated;
    });
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('overview')}>
          <img
            className="brand-mark"
            src="/brand-mark.svg"
            width="44"
            height="44"
            alt=""
          />
          <span className="brand-wordmark">
            <span className="brand-name">
              inferno<span>.tips</span>
            </span>
            <small>OSRS guides &amp; practice</small>
          </span>
          <span className="sr-only">Home</span>
        </button>
        <div className="nav-label">PRACTICE</div>
        <nav aria-label="Main navigation">
          {(
            [
              ['overview', 'grid', 'Overview'],
              ['course', 'book', 'Learning path'],
              ['drills', 'bolt', 'Practice drills'],
              ['progress', 'chart', 'Your progress'],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={`nav-item ${(page === id && !active) || (id === 'drills' && ['hard', 'endless'].includes(page)) ? 'active' : ''}`}
              aria-current={
                (page === id && !active) ||
                (id === 'drills' && ['hard', 'endless'].includes(page))
                  ? 'page'
                  : undefined
              }
              onClick={() => navigate(id)}
            >
              <Icon name={icon} />
              {label}
              {id === 'course' && (
                <span className="nav-count">{chapters.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label resources-label">REFERENCE</div>
        <button
          className={`nav-item ${page === 'resources' ? 'active' : ''}`}
          onClick={() => navigate('resources')}
        >
          <Icon name="book" />
          Guides & resources
        </button>
        <a
          className="nav-item"
          href={sourceLinks.los}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="target" />
          Wave simulator
          <Icon name="external" size={14} />
        </a>
        <button
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          aria-current={page === 'settings' ? 'page' : undefined}
          onClick={() => navigate('settings')}
        >
          <Icon name="settings" /> Settings
        </button>
        <div className="sidebar-bottom">
          <p>Progress is saved in this browser.</p>
          <a href="/credits/">Sources & simulation limits ↗</a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Inferno Tips <span>/</span>{' '}
            <b>
              {active
                ? active.title
                : {
                    overview: 'Overview',
                    course: 'Learning path',
                    drills: 'Practice drills',
                    progress: 'Your progress',
                    resources: 'Guides & resources',
                    settings: 'Settings',
                    hard: 'Hard circuit',
                    endless: 'Endless gauntlet',
                  }[page]}
            </b>
          </div>
          <a
            className="topbar-los"
            href={sourceLinks.los}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="grid" size={18} /> Open LoS tool{' '}
            <Icon name="external" size={14} />
          </a>
        </header>
        <main id="main">
          {storageError && (
            <p className="storage-notice" role="status">
              Browser storage is unavailable. You can keep practising, but
              progress will only last for this visit.
            </p>
          )}
          {active ? (
            <Trainer
              key={active.id}
              settings={settings}
              lesson={active}
              progress={progress[active.id]}
              exitLabel={
                returnRoute.current.startsWith('#lesson-') ||
                returnRoute.current === '#course'
                  ? 'Back to learning path'
                  : returnRoute.current === '#overview'
                    ? 'Back to overview'
                    : returnRoute.current === '#progress'
                      ? 'Back to your progress'
                      : 'Back to practice drills'
              }
              onExit={() => {
                window.location.hash = returnRoute.current;
              }}
              onComplete={saveRun}
              onNext={() => {
                const index = learningOrder.findIndex(
                  (l) => l.id === active.id,
                );
                launch(learningOrder[(index + 1) % learningOrder.length]);
              }}
            />
          ) : (
            <>
              {page === 'overview' && (
                <Overview
                  next={next}
                  launch={launch}
                  openField={openField}
                  openDrills={() => navigate('drills')}
                />
              )}
              {page === 'course' && (
                <LearningPath
                  key={courseEntry || 'course'}
                  initialLesson={courseEntry}
                  launch={launch}
                  progress={progress}
                />
              )}
              {page === 'drills' && (
                <DrillLibrary launch={launch} progress={progress} />
              )}
              {(page === 'hard' || page === 'endless') && (
                <SeriesTrainer
                  key={page}
                  mode={page}
                  settings={settings}
                  onExit={() => navigate('drills')}
                />
              )}
              {page === 'progress' && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">SAVED RESULTS</span>
                      <h1>Your practice results</h1>
                      <p>
                        Challenge passes and best scores, saved in this browser.
                      </p>
                    </div>
                  </div>
                  <div className="progress-stats">
                    <div>
                      <strong>
                        {mastered}
                        <small> / {lessons.length}</small>
                      </strong>
                      <span>Drills mastered</span>
                    </div>
                    <div>
                      <strong>
                        {Object.values(progress).reduce(
                          (n, p) => n + (p?.attempts || 0),
                          0,
                        )}
                      </strong>
                      <span>Completed runs</span>
                    </div>
                    <div>
                      <strong>
                        {Math.max(
                          0,
                          ...Object.values(progress).map((p) => p?.best || 0),
                        )}
                        <small>%</small>
                      </strong>
                      <span>Best challenge score</span>
                    </div>
                  </div>
                  {Object.values(progress).some(
                    (entry) => entry?.previousScoring,
                  ) && (
                    <p className="fine-print">
                      Several drills now score complete sequences. Their new
                      scores and passes start fresh; earlier scores are kept
                      below for reference. Attempt counts are unchanged.
                    </p>
                  )}
                  <div className="progress-table">
                    {lessons.map((l) => (
                      <div key={l.id}>
                        <GameIcon name={l.icon} />
                        <strong>{l.title}</strong>
                        <span>
                          {progress[l.id]?.attempts
                            ? `${progress[l.id]?.best || 0}% challenge · ${progress[l.id]?.practiceBest || 0}% practice`
                            : 'Ready when you are'}
                          {progress[l.id]?.previousScoring && (
                            <small className="previous-score">
                              Earlier scoring:{' '}
                              {progress[l.id]!.previousScoring!.best}% challenge
                              · {progress[l.id]!.previousScoring!.practiceBest}%
                              practice ·{' '}
                              {progress[l.id]!.previousScoring!.passes}/2 passes
                            </small>
                          )}
                        </span>
                        <b>{progress[l.id]?.passes || 0}/2 passes</b>
                        <button
                          className="button secondary"
                          onClick={() => launch(l)}
                        >
                          Practise
                          <Icon name="arrow" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="fine-print">
                    Mastery requires meeting the drill’s pass target in two
                    completed, uninterrupted challenges. Guided and paused runs
                    count as practice.
                  </p>
                  <div className="reset-area">
                    {resetConfirm ? (
                      <>
                        <span>
                          Delete all scores and knowledge checks saved in this
                          browser?
                        </span>
                        <button
                          className="button secondary"
                          onClick={() => setResetConfirm(false)}
                        >
                          Keep progress
                        </button>
                        <button
                          className="button danger"
                          onClick={() => {
                            try {
                              localStorage.removeItem(STORAGE_KEY);
                              localStorage.removeItem(KNOWLEDGE_KEY);
                              localStorage.removeItem(SERIES_KEY);
                              setProgress({});
                              setResetConfirm(false);
                            } catch {
                              setStorageError(true);
                            }
                          }}
                        >
                          Delete progress
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button muted"
                        onClick={() => setResetConfirm(true)}
                      >
                        <Icon name="reset" size={15} />
                        Reset saved progress
                      </button>
                    )}
                  </div>
                </>
              )}
              {page === 'resources' && <Resources />}
              {page === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onChange={saveSettings}
                  saveError={settingsError}
                />
              )}
            </>
          )}
          <footer>
            <span className="footer-brand">
              <img src="/brand-mark.svg" width="22" height="22" alt="" />
              inferno.tips
            </span>
            <p>
              Fan-made. Not affiliated with Jagex.
              <br />
              RuneScape and game artwork © Jagex Ltd.{' '}
              <a href="/credits/">Credits & sources</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function DrillCard({
  lesson,
  onClick,
  progress,
  index,
}: {
  lesson: Lesson;
  onClick: () => void;
  progress: Progress;
  index?: number;
}) {
  return (
    <button className={`drill-card drill-${lesson.id}`} onClick={onClick}>
      <div className="drill-card-top">
        <span className="drill-art">
          <GameIcon name={lesson.icon} />
        </span>
        <span className="small-tag">
          {progress[lesson.id]?.passes === 2
            ? '✓ MASTERED'
            : lesson.level.toUpperCase()}
        </span>
      </div>
      <span className="eyebrow">
        {index !== undefined ? `0${index + 1} / ` : ''}
        {lesson.tag}
      </span>
      <h2>{lesson.title}</h2>
      <p>{lesson.description}</p>
      <div className="drill-card-bottom">
        <span>
          <Icon name="clock" size={14} />
          {lesson.id === 'blowpipe'
            ? 'Attack + movement'
            : lesson.id === 'blob'
              ? 'Read & react'
              : hasSupplies(lesson.id)
                ? 'Prayer + supplies'
                : hasMovement(lesson.id)
                  ? 'Prayer + movement'
                  : 'Prayer timing'}
        </span>
        <Icon name="arrow" size={18} />
      </div>
    </button>
  );
}

function DrillLibrary({
  launch,
  progress,
}: {
  launch: (lesson: Lesson) => void;
  progress: Progress;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const shown = lessons.filter(
    (l) =>
      (category === 'all' ||
        chapters.find((c) => c.id === category)?.drills.includes(l.id)) &&
      `${l.title} ${l.description} ${l.takeaway}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TIMING & CONTROLS</span>
          <h1>Practice drills</h1>
          <p>
            Every drill is open. Filter by skill, pick a weak spot and start a
            short run. Both modes use the real 0.6-second beat.
          </p>
        </div>
      </div>
      <div className="series-cards">
        <a href="#hard">
          <span className="eyebrow">FIVE STAGES · THREE LIVES</span>
          <h2>Hard circuit →</h2>
          <p>
            Stacks, movement, blobs and triple Jad. Carry your score and
            mistakes through every stage.
          </p>
        </a>
        <a href="#endless">
          <span className="eyebrow">SURVIVAL · PERSONAL BEST</span>
          <h2>Endless gauntlet →</h2>
          <p>
            Start with the mager and work up to the toughest combinations. How
            long can you keep going?
          </p>
        </a>
      </div>
      <div className="drill-filters">
        <label>
          Find a drill
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Try blob, movement or prayer…"
          />
        </label>
        <label>
          Skill
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All skills</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <span role="status">{shown.length} drills</span>
      </div>
      <div className="drill-grid full-grid">
        {shown.map((l) => (
          <DrillCard
            key={l.id}
            lesson={l}
            progress={progress}
            onClick={() => launch(l)}
          />
        ))}
      </div>
      {!shown.length && (
        <p className="empty-inventory">
          No drills match. Try another term or select All skills.
        </p>
      )}
      <div className="next-chapter">
        <div>
          <h3>Need the positioning as well as the clicks?</h3>
          <p>
            Build a wave, inspect line of sight and create your own offsets.
          </p>
        </div>
        <a
          className="button secondary"
          href={sourceLinks.los}
          target="_blank"
          rel="noreferrer"
        >
          Open LoS tool ↗
        </a>
      </div>
    </>
  );
}

function Resources() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEARN FROM THE COMMUNITY</span>
          <h1>Guides & tools</h1>
          <p>
            The demonstrations behind these lessons, plus tools for practising
            complete waves.
          </p>
        </div>
      </div>
      <div className="resource-grid">
        <a
          className="resource-card"
          href={sourceLinks.twoTick}
          target="_blank"
          rel="noreferrer"
        >
          <span className="resource-symbol video-symbol">▶</span>
          <span className="eyebrow">WATCH / HUG MY CAT</span>
          <h2>Hug my cat: two-tick guide</h2>
          <p>
            On-screen timelines explain blob scan phases, setting up an offset
            and recovering a misaligned cycle. This guide has visual
            instructions rather than captions.
          </p>
          <span className="text-button">Watch the two-tick guide ↗</span>
        </a>
        <a
          className="resource-card"
          href={sourceLinks.lola}
          target="_blank"
          rel="noreferrer"
        >
          <span className="resource-symbol video-symbol">▶</span>
          <span className="eyebrow">WATCH / DEARLOLA1</span>
          <h2>dearlola1: full Inferno guide</h2>
          <p>
            The 2026 any-gear guide covers corner traps, isolation, blob
            flinches, reverse flicking, melee digs, Jads and Zuk. Learn the
            decisions behind the clicks.
          </p>
          <span className="text-button">Watch DearLola’s guide ↗</span>
        </a>
        <a
          className="resource-card"
          href={sourceLinks.gnomonkey}
          target="_blank"
          rel="noreferrer"
        >
          <span className="resource-symbol video-symbol">▶</span>
          <span className="eyebrow">WATCH / GNOMONKEY</span>
          <h2>Gnomonkey: Golden Trio guide</h2>
          <p>
            Gnomonkey’s Golden Trio guide: modern supplies, wave priorities,
            one-tick alternating and a detailed Zuk damage comparison.
          </p>
          <span className="text-button">
            Watch the original guide
            <Icon name="external" size={16} />
          </span>
        </a>
        <a
          className="resource-card"
          href={sourceLinks.wiki}
          target="_blank"
          rel="noreferrer"
        >
          <span className="resource-symbol">
            <Icon name="book" size={30} />
          </span>
          <span className="eyebrow">READ / OSRS WIKI</span>
          <h2>OSRS Wiki: Inferno strategies</h2>
          <p>
            Monster details, equipment, supplies, and wave strategy. Keep the
            Wiki close for the details that don’t need another guide here.
          </p>
          <span className="text-button">
            Open the strategy guide
            <Icon name="external" size={16} />
          </span>
        </a>
        <a
          className="resource-card"
          href={sourceLinks.los}
          target="_blank"
          rel="noreferrer"
        >
          <span className="resource-symbol">
            <Icon name="grid" size={30} />
          </span>
          <span className="eyebrow">EXPLORE / INFERNO LOS</span>
          <h2>Inferno line of sight</h2>
          <p>
            Move enemies, inspect line of sight, and step through a stack. Bring
            your prayer rhythm into the companion wave simulator.
          </p>
          <span className="text-button">
            Try a wave layout
            <Icon name="external" size={16} />
          </span>
        </a>
      </div>
      <section className="tips-panel">
        <span className="eyebrow">BETWEEN ATTEMPTS</span>
        <h2>After a failed attempt</h2>
        <div>
          <article>
            <b>01</b>
            <h3>Name the mistake.</h3>
            <p>
              “I missed a prayer after moving” is something you can train. “I’m
              bad at Inferno” isn’t useful feedback.
            </p>
          </article>
          <article>
            <b>02</b>
            <h3>Remove one distraction.</h3>
            <p>
              Start in guided mode. Follow the beat without moving, then add the
              extra click once the rhythm settles.
            </p>
          </article>
          <article>
            <b>03</b>
            <h3>Take it back to a wave.</h3>
            <p>
              After two clean challenges, try the mechanic in the LoS simulator.
              Revisit the drill when it feels rusty.
            </p>
          </article>
        </div>
      </section>
      <p className="fine-print">
        Lessons and exercises are original. Linked videos belong to their
        creators; no endorsement is implied. See{' '}
        <a href="/credits/">sources and simulation limits</a>.
      </p>
    </>
  );
}

interface TrainerSession {
  run: SeriesState;
  panel: ReactNode;
  dispatch: (action: SeriesAction) => void;
  restart: () => void;
}
function SeriesTrainer({
  mode,
  settings,
  onExit,
}: {
  mode: SeriesMode;
  settings: Settings;
  onExit: () => void;
}) {
  const [run, setRun] = useState(() => newSeries(mode));
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [best, setBest] = useState<HighScores>({});
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      setBest(parseHighScores(localStorage.getItem(SERIES_KEY)));
    } catch {
      setStorageError(true);
    }
  }, []);
  useEffect(() => {
    if (!run.ended) return;
    const updated = saveHighScore(best, run);
    if (updated === best) return;
    setBest(updated);
    try {
      localStorage.setItem(SERIES_KEY, JSON.stringify(updated));
    } catch {
      setStorageError(true);
    }
  }, [run, best]);
  const dispatch = (action: SeriesAction) =>
    setRun((previous) => updateSeries(previous, action));
  const restart = () => {
    setRun(newSeries(mode));
    setAttempt((value) => value + 1);
    setStarted(true);
  };
  const lesson = lessons.find(
    (lesson) => lesson.id === stageLesson(mode, run.stage),
  )!;
  const panel = (
    <div className="series-score" aria-label="Survival score">
      <div className="series-score-numbers">
        <span>
          <small>SCORE</small>
          <strong>{run.points}</strong>
        </span>
        <span>
          <small>LIVES</small>
          <strong>{run.lives} / 3</strong>
        </span>
        <span>
          <small>BEST</small>
          <strong>{best[mode]?.points ?? '—'}</strong>
        </span>
      </div>
      <p className="series-feedback" role="status">
        {run.ended
          ? run.cleared
            ? 'Circuit cleared!'
            : 'Run complete'
          : `Stage ${run.stage + 1}${mode === 'hard' ? ' / 5' : ''} · ${stageValue(mode, run.stage)} points per clean check`}
      </p>
      <p>{run.feedback}</p>
      {run.practice && (
        <p className="storage-notice">
          Practice run — pausing disables high scores for this run.
        </p>
      )}
      {run.ended && (
        <>
          <p>
            {run.points} points · reached stage {run.stage + 1}.{' '}
            {run.practice
              ? 'Practice score only.'
              : run.points > 0 && best[mode]?.points === run.points
                ? 'Personal best in this browser.'
                : best[mode]
                  ? 'Your best is saved in this browser.'
                  : 'Complete a clean check to set a personal best.'}
          </p>
          <button className="button primary" onClick={restart}>
            Retry run
          </button>
        </>
      )}
      {storageError && (
        <p role="status">
          Scores cannot be saved in this browser. Your best lasts for this
          visit.
        </p>
      )}
    </div>
  );
  if (!started)
    return (
      <div className="series-intro">
        <button className="text-button back-button" onClick={onExit}>
          ← Back to practice drills
        </button>
        <div className="page-heading">
          <div>
            <span className="eyebrow">THREE LIVES · 0.6 SECOND TICKS</span>
            <h1>{seriesTitle(mode)}</h1>
            <p>
              {mode === 'hard'
                ? 'Clear five encounters without running out of lives.'
                : 'Survive increasingly demanding encounters and build your high score.'}
            </p>
          </div>
        </div>
        <ol className="series-route">
          {Array.from({ length: mode === 'hard' ? 5 : 6 }, (_, stage) => (
            <li key={stage}>
              <span>{stage + 1}</span>
              <strong>
                {
                  lessons.find(
                    (lesson) => lesson.id === stageLesson(mode, stage),
                  )!.title
                }
              </strong>
              <small>{stageValue(mode, stage)} points / clean check</small>
            </li>
          ))}
        </ol>
        <p>
          Each stage lasts 36 ticks, with a three-tick count-in before the next
          encounter. Prayer hints are hidden. A failed scored check or sequence
          costs one life; multiple misses on the same tick cost only one.
          Correct checks on that tick earn no points if another check fails.
        </p>
        {mode === 'endless' && (
          <p>
            After stage six, mager–blob movement, two blobs and triple Jad
            repeat. Difficulty and points per check cap there; the clock always
            stays at 0.6 seconds.
          </p>
        )}
        <p>
          Finish a run whenever you like to save your score. Pausing or leaving
          the tab turns it into practice. Personal bests are separate for each
          mode and saved in this browser; these runs do not award drill passes.
        </p>
        <p>
          <strong>
            Personal best:{' '}
            {best[mode]
              ? `${best[mode]!.points} points · stage ${best[mode]!.stage}`
              : 'No scored runs yet'}
          </strong>
        </p>
        {storageError && (
          <p>Browser storage is unavailable. Scores last for this visit.</p>
        )}
        <button className="button primary" onClick={restart}>
          Start {seriesTitle(mode).toLowerCase()}
        </button>
      </div>
    );
  return (
    <>
      <Trainer
        key={`${attempt}-${run.stage}`}
        settings={settings}
        lesson={lesson}
        progress={undefined}
        exitLabel="Back to practice drills"
        onExit={onExit}
        onComplete={() => {}}
        onNext={() => {}}
        session={{ run, panel, dispatch, restart }}
      />
      {run.ended && run.lives === 0 && (
        <DeathOverlay
          run={run}
          best={best[mode]}
          encounter={lesson.title}
          storageError={storageError}
          onRetry={restart}
          onExit={onExit}
        />
      )}
    </>
  );
}

function Trainer({
  settings,
  lesson,
  progress,
  onExit,
  exitLabel,
  onComplete,
  onNext,
  session,
}: {
  settings: Settings;
  lesson: Lesson;
  progress: { passes: number; best: number } | undefined;
  onExit: () => void;
  exitLabel: string;
  onComplete: (
    id: LessonId,
    score: number,
    mode: Mode,
    ticks: number,
    interrupted: boolean,
  ) => void;
  onNext: () => void;
  session?: TrainerSession;
}) {
  const [mode, setMode] = useState<Mode>(
    session ? 'challenge' : settings.defaultMode,
  );
  const [status, setStatus] = useState<
    'ready' | 'countdown' | 'running' | 'paused' | 'done'
  >('ready');
  const [state, setState] = useState<DrillState>(initialState);
  const [prayer, setPrayer] = useState<Prayer>('off');
  const [overheadPrayer, setOverheadPrayer] = useState<Prayer>('off');
  const [litPrayers, setLitPrayers] = useState<Prayer[]>([]);
  const litPrayersRef = useRef<Prayer[]>([]);
  const [tile, setTile] = useState(12);
  const [countdown, setCountdown] = useState(3);
  const [interrupted, setInterrupted] = useState(false);
  const [finishingAsPractice, setFinishingAsPractice] = useState(false);
  const sound = settings.tickSound;
  const [soundError, setSoundError] = useState(false);
  const [panel, setPanel] = useState<'prayers' | 'inventory'>('prayers');
  const tabKeys = settings.tabKeys;
  const [queuedSupply, setQueuedSupply] = useState<Supply | null>(null);
  const supplyRef = useRef<Supply | null>(null);
  const transitionsRef = useRef<Prayer[]>([]);
  const attackRef = useRef<BlowpipeCommand | null>(null);
  const [attackQueued, setAttackQueued] = useState<BlowpipeCommand | null>(
    null,
  );
  const prayerRef = useRef<Prayer>('off');
  const tickDeadlineRef = useRef<number | null>(null);
  const tileRef = useRef(12);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const completeRef = useRef(onComplete);
  const savedRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const autoStarted = useRef(false);
  const trainingRef = useRef<HTMLElement>(null);
  const startFocus = useRef<'stay' | 'return' | null>(null);
  const ms = 600;
  const cycleLength =
    lesson.id === 'blowpipe'
      ? 2
      : isJad(lesson.id)
        ? jadPeriod(lesson.id)
        : lesson.id === 'bat'
          ? 3
          : hasBlob(lesson.id)
            ? 6
            : 4;
  const totalTicks = drillTicks(lesson.id);
  const goal = mechanicGoals[lesson.id];
  const nextTick = Math.min(totalTicks, state.tick + 1);
  const expected = expectedPrayer(
    lesson.id,
    nextTick,
    state.pending,
    state.seed,
  );
  const target = targetAt(nextTick, lesson.id);
  const score = accuracy(state.checks);
  const scoring = scoredChecks(state.checks);
  const roundPoints = scoring.filter((check) => check.correct).length;
  const prayerChecks = state.checks.filter((check) => check.kind === 'prayer');
  const prayerHits = prayerChecks.filter((check) => check.correct).length;
  const requiredScore = passScore(lesson.id);
  const passTarget = goal
    ? `${goal.pass} of ${goal.total} complete rounds`
    : `${requiredScore}%`;
  const supplyTarget = supplyGoal(lesson.id, nextTick);
  const nextMagicAttack = nextTick + ((1 - (nextTick % 4) + 4) % 4);
  const magerLesson = lesson.id === 'rhythm' || hasSupplies(lesson.id);
  const busy =
    status === 'running' || status === 'countdown' || status === 'paused';
  const displayedOverhead = overheadPrayer;
  completeRef.current = onComplete;
  soundRef.current = sound;
  const prayerSounds = usePrayerSounds(
    settings.prayerSound && lesson.id !== 'blowpipe',
    settings.prayerVolume,
    () => setSoundError(true),
  );
  const prepareSupplySound = useSupplySounds(
    state.consumed,
    settings.supplySound && hasSupplies(lesson.id),
    settings.supplyVolume,
    () => setSoundError(true),
  );
  function selectPrayer(p: Prayer, clicked?: Exclude<Prayer, 'off'>) {
    if (!clicked) setOverheadPrayer(p);
    // The client toggles only the clicked icon's bit, independently of the
    // server's mutually exclusive protection. Reconcile on the shared tick.
    // In particular, clicking a still-lit previous prayer clears its circle
    // even though that order will switch protection back at the next tick.
    const lit = litPrayersRef.current;
    litPrayersRef.current = clicked
      ? lit.includes(clicked)
        ? lit.filter((active) => active !== clicked)
        : [...lit, clicked]
      : p === 'off'
        ? []
        : [p];
    setLitPrayers(litPrayersRef.current);
    if (clicked) prayerSounds.queue(clicked, !lit.includes(clicked));
    else prayerSounds.reset();
    if (status === 'running' && p !== prayerRef.current)
      transitionsRef.current.push(p);
    prayerRef.current = p;
    setPrayer(p);
  }
  function commitPrayerFeedback(p: Prayer) {
    litPrayersRef.current = p === 'off' ? [] : [p];
    setLitPrayers(litPrayersRef.current);
    setOverheadPrayer(p);
    prayerSounds.flush();
  }
  function move(t: number) {
    tileRef.current = t;
    setTile(t);
  }
  async function prepareAudio() {
    if (!settings.tickSound) return;
    try {
      audioRef.current ||= new AudioContext();
      await audioRef.current.resume();
      setSoundError(false);
    } catch {
      setSoundError(true);
    }
  }
  function begin(fromResults = false) {
    tickDeadlineRef.current = performance.now() + ms;
    startFocus.current = fromResults ? 'return' : 'stay';
    void prepareAudio();
    setState(initialState(Math.floor(Math.random() * 100000)));
    transitionsRef.current = [];
    attackRef.current = null;
    setAttackQueued(null);
    selectPrayer('off');
    move(12);
    setPanel('prayers');
    supplyRef.current = null;
    setQueuedSupply(null);
    setCountdown(3);
    setInterrupted(false);
    setFinishingAsPractice(false);
    savedRef.current = false;
    setStatus('countdown');
  }
  useEffect(() => {
    if (sessionRef.current && !autoStarted.current) {
      autoStarted.current = true;
      begin();
    }
  }, []);
  useEffect(() => {
    if (session?.run.ended) setStatus('done');
  }, [session?.run.ended]);
  function beginChallenge(fromResults = false) {
    setMode('challenge');
    begin(fromResults);
  }
  useLayoutEffect(() => {
    if (status !== 'countdown' || !startFocus.current) return;
    const returnToTrainer = startFocus.current === 'return';
    startFocus.current = null;
    trainingRef.current?.focus({ preventScroll: true });
    // Results live below the trainer. Return once, after they are removed;
    // starting from the trainer itself must not move the viewport.
    if (returnToTrainer)
      trainingRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'instant',
      });
  }, [status]);
  function pause() {
    sessionRef.current?.dispatch({ type: 'pause' });
    tickDeadlineRef.current = null;
    setInterrupted(true);
    setStatus('paused');
  }
  function beep() {
    const ctx = audioRef.current;
    if (
      !soundRef.current ||
      !settings.volume ||
      !ctx ||
      ctx.state !== 'running'
    )
      return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime((0.07 * settings.volume) / 100, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.06);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.07);
  }
  useEffect(
    () => () => {
      void audioRef.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (status !== 'ready' && status !== 'done') return;
    if (lesson.id === 'blowpipe') {
      tickDeadlineRef.current = null;
      return;
    }
    // Keep the pre-start clock visible on the same deadline as the circles.
    // It resolves prayer feedback without advancing the encounter or score.
    let deadline = performance.now() + ms;
    tickDeadlineRef.current = deadline;
    let timer: number;
    const tick = () => {
      deadline += ms;
      // After an idle-tab stall, resume with a full interval rather than
      // playing a burst of old feedback ticks.
      if (deadline <= performance.now()) deadline = performance.now() + ms;
      tickDeadlineRef.current = deadline;
      commitPrayerFeedback(prayerRef.current);
      timer = window.setTimeout(
        tick,
        Math.max(0, deadline - performance.now()),
      );
    };
    timer = window.setTimeout(tick, ms);
    return () => window.clearTimeout(timer);
  }, [status, lesson.id, ms]);
  useEffect(() => {
    if (status !== 'countdown') return;
    const deadline = tickDeadlineRef.current ?? performance.now() + ms;
    tickDeadlineRef.current = deadline;
    const timer = window.setTimeout(
      () => {
        if (performance.now() - deadline > 250) {
          pause();
          return;
        }
        tickDeadlineRef.current = deadline + ms;
        beep();
        commitPrayerFeedback(prayerRef.current);
        if (countdown === 1) {
          transitionsRef.current = [];
          setStatus('running');
        } else setCountdown((c) => c - 1);
      },
      Math.max(0, deadline - performance.now()),
    );
    return () => window.clearTimeout(timer);
  }, [status, countdown, ms]);
  useEffect(() => {
    if (status !== 'running') return;
    const deadline = tickDeadlineRef.current ?? performance.now() + ms;
    tickDeadlineRef.current = deadline;
    const timer = window.setTimeout(
      () => {
        if (performance.now() - deadline > 250) {
          pause();
          return;
        }
        tickDeadlineRef.current = deadline + ms;
        const prayerAtTick = prayerRef.current;
        const tileAtTick = tileRef.current;
        const supply = supplyRef.current;
        supplyRef.current = null;
        setQueuedSupply(null);
        const input = {
          transitions: transitionsRef.current,
          blowpipe: attackRef.current,
        };
        transitionsRef.current = [];
        attackRef.current = null;
        setAttackQueued(null);
        beep();
        commitPrayerFeedback(prayerAtTick);
        setState((prev) =>
          advance(prev, lesson.id, prayerAtTick, tileAtTick, supply, input),
        );
      },
      Math.max(0, deadline - performance.now()),
    );
    return () => window.clearTimeout(timer);
  }, [status, state.tick, ms, lesson.id]);
  useEffect(() => {
    const current = sessionRef.current;
    if (current) {
      current.dispatch({
        type: 'checks',
        stage: current.run.stage,
        tick: state.tick,
        checks: state.checks,
      });
      if (state.tick === totalTicks && !savedRef.current) {
        savedRef.current = true;
        current.dispatch({ type: 'next', stage: current.run.stage });
      }
      return;
    }
    if (state.tick === totalTicks && !savedRef.current) {
      savedRef.current = true;
      setStatus('done');
      completeRef.current(
        lesson.id,
        accuracy(state.checks),
        mode,
        state.tick,
        interrupted,
      );
    }
  }, [state, mode, lesson.id, interrupted]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && (status === 'running' || status === 'countdown'))
        pause();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [status]);
  useLayoutEffect(() => {
    if (lesson.id === 'blowpipe') return;
    const keydown = (e: KeyboardEvent) => {
      if (
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.repeat ||
        (e.target instanceof HTMLElement &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName))
      )
        return;
      if (e.key === tabKeys.inventory) {
        e.preventDefault();
        setPanel('inventory');
      }
      if (e.key === tabKeys.prayers) {
        e.preventDefault();
        setPanel('prayers');
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [lesson.id, status, tabKeys]);
  let hint =
    expected === 'off'
      ? 'Quiet tick — turn prayer off.'
      : expected
        ? `Prepare ${expected === 'range' ? 'Ranged' : expected === 'melee' ? 'Melee' : 'Magic'} before the beat.`
        : 'No attack this tick. Hold your prayer or prepare the next one.';
  if (isBlobScan(lesson.id, nextTick))
    hint =
      lesson.id === 'blob'
        ? 'Blob scan next. Give it Magic or Ranged to read.'
        : `${hint} The blob also reads this beat.`;
  if (lesson.id === 'flick')
    hint =
      state.tick === 0
        ? 'Activate Magic for the first beat.'
        : 'Click Magic off, then on again before the next beat. One pair per tick.';
  if (lesson.id === 'blowpipe')
    hint =
      state.blowpipe.nextShotTick <= nextTick
        ? 'Click the target. The blowpipe is ready to fire.'
        : `Shot fired. Run to tile ${nextBlowpipeTile(state.blowpipe) + 1}, then click the target again.`;
  if (isJad(lesson.id) && !expected)
    hint = 'Read the current Jad cue. Keep protection through its check.';
  const recent = state.checks.at(-1);
  const source = lessonSource(lesson);
  const setupId = drillLosSetups[lesson.id];
  const losSetup = setupId ? losSetups[setupId] : undefined;
  const startPrayer =
    lesson.id === 'anchor-range' || lesson.id === 'bat'
      ? 'Ranged'
      : lesson.id === 'melee-blob'
        ? 'Melee'
        : 'Magic';
  return (
    <div className={`trainer-page ${session ? 'series-trainer' : ''}`}>
      <button className="text-button back-button" onClick={onExit}>
        ← {exitLabel}
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            DRILL {String(lessons.indexOf(lesson) + 1).padStart(2, '0')} /{' '}
            {lesson.level.toUpperCase()}
          </span>
          <h1>
            {session
              ? `${seriesTitle(session.run.mode)} · stage ${session.run.stage + 1}`
              : lesson.title}
          </h1>
          <p>{session ? lesson.title : lesson.objective}</p>
        </div>
        <GameIcon name={lesson.icon} className="lesson-heading-icon" />
      </div>
      <div className="trainer-layout">
        <section
          className="training-panel"
          data-busy={busy}
          aria-label="Interactive practice"
          ref={trainingRef}
          tabIndex={-1}
        >
          <div className="training-toolbar">
            {!session && (
              <div
                className="mode-switch"
                role="group"
                aria-label="Training mode"
              >
                <button
                  disabled={busy}
                  aria-pressed={mode === 'guided'}
                  className={mode === 'guided' ? 'selected' : ''}
                  onClick={() => {
                    setMode('guided');
                    setStatus('ready');
                    setState(initialState());
                  }}
                >
                  Guided practice
                </button>
                <button
                  disabled={busy}
                  aria-pressed={mode === 'challenge'}
                  className={mode === 'challenge' ? 'selected' : ''}
                  onClick={() => {
                    setMode('challenge');
                    setStatus('ready');
                    setState(initialState());
                  }}
                >
                  Challenge
                </button>
              </div>
            )}
            <div className="training-actions">
              {status === 'ready' || status === 'done' ? (
                <>
                  <button
                    className="button primary"
                    onClick={() => (session ? session.restart() : begin())}
                  >
                    <Icon name="play" size={15} />
                    {session
                      ? 'Retry run'
                      : status === 'done'
                        ? mode === 'guided'
                          ? 'Restart practice'
                          : 'Try challenge again'
                        : mode === 'guided'
                          ? 'Start guided practice'
                          : 'Start challenge'}
                  </button>
                  {status === 'done' && mode === 'guided' && (
                    <button
                      className="button secondary"
                      onClick={() => beginChallenge()}
                    >
                      Start challenge
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="button secondary"
                    onClick={
                      status === 'paused'
                        ? () =>
                            setStatus(
                              state.tick === 0 ? 'countdown' : 'running',
                            )
                        : pause
                    }
                  >
                    {status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (session) {
                        session.dispatch({ type: 'finish' });
                        return;
                      }
                      setState(initialState());
                      setStatus('ready');
                    }}
                  >
                    {session ? 'Finish run' : 'End run'}
                  </button>
                </>
              )}
            </div>
            <span>{ms / 1000}s / tick</span>
          </div>
          <p className="mode-description">
            {mode === 'guided'
              ? lesson.id === 'blowpipe'
                ? 'Guided practice marks the next two-tile step and explains each action.'
                : 'Guided practice shows prayer hints. Try the challenge after a run.'
              : lesson.id === 'blowpipe'
                ? 'Keep firing while running the route. The next-step hints are hidden.'
                : 'Challenge hides prayer hints. The timing stays at 0.6 seconds per tick.'}
          </p>
          <p className="sr-only" role="status">
            {status === 'done'
              ? `Run complete. ${score}% accuracy. Retry beside the controls, or review the results below.`
              : ''}
          </p>
          <div className="run-stats">
            <div>
              <small>TICK</small>
              <strong>
                {state.tick}
                <span> / {totalTicks}</span>
              </strong>
            </div>
            <div>
              <small>
                {session ? 'STAGE SCORE' : goal ? 'POINTS' : 'ACCURACY'}
              </small>
              <strong>
                {goal
                  ? `${roundPoints} / ${goal.total}`
                  : scoring.length
                    ? `${score}%`
                    : '—'}
              </strong>
            </div>
            <div>
              <small>STREAK</small>
              <strong>
                {state.streak}
                <span>{goal ? ' rounds' : ' checks'}</span>
              </strong>
            </div>
          </div>
          {goal && !session && (
            <p
              className={
                lesson.id === 'movement'
                  ? 'movement-scoring'
                  : 'mechanic-scoring'
              }
            >
              <strong>
                {goal.pass} of {goal.total} points to pass.
              </strong>{' '}
              {goal.rule}
              <span>
                {lesson.id === 'blowpipe' ? (
                  <>
                    {roundPoints}/{goal.total} shot–move pairs ·{' '}
                    {state.blowpipe.lostTicks} attack ticks lost
                  </>
                ) : (
                  <>
                    Prayer accuracy:{' '}
                    {prayerChecks.length
                      ? `${Math.round((100 * prayerHits) / prayerChecks.length)}% (${prayerHits}/${prayerChecks.length})`
                      : '—'}{' '}
                    · {scoring.length}/{goal.total} rounds checked
                  </>
                )}
              </span>
            </p>
          )}
          <div className={session ? 'series-cues' : undefined}>
            {session && !isJad(lesson.id) && !magerLesson && (
              <div className="series-stage-guide">
                <strong>{lesson.title}</strong>
                <p>{goal?.rule ?? lesson.objective}</p>
              </div>
            )}
            {isJad(lesson.id) && (
              <div
                className="jad-cue"
                data-style={
                  ['running', 'paused'].includes(status)
                    ? jadStyle(lesson.id, state.tick + 3, state.seed)
                    : ''
                }
              >
                <strong>
                  {!['running', 'paused'].includes(status)
                    ? status === 'done'
                      ? 'Reaction block complete'
                      : 'Watch for the first attack cue'
                    : `${lesson.id === 'triples' ? `Jad ${(Math.floor(state.tick / 3) % 3) + 1}: ` : ''}${jadStyle(lesson.id, state.tick + 3, state.seed) === 'magic' ? 'Front legs raised — MAGIC' : 'Stomp — RANGED'}`}
                </strong>
                <span>
                  {status === 'running' && state.tick % jadPeriod(lesson.id) < 3
                    ? 'React now · prayer check three ticks after the cue'
                    : 'Wait for the next cue · repeated styles are possible'}
                </span>
              </div>
            )}
            {lesson.id === 'flick' && (
              <p className="technique-banner">
                Magic stays on at each beat. Between beats: click off → on.
                Holding alone does not pass.
              </p>
            )}
            {(lesson.id === 'reverse' || lesson.id === 'melee-blob') && (
              <p className="technique-banner">
                Mitigation exercise: 100% means correct priorities, not every
                attack protected.
              </p>
            )}
            {magerLesson && (
              <div
                className="attack-cycle"
                role="group"
                aria-label="Mager attack cycle"
              >
                <div className="attack-countdown">
                  <GameIcon name="protect-magic" />
                  <strong>
                    {status === 'done'
                      ? 'Cycle complete'
                      : `Magic attack in ${nextMagicAttack - state.tick} tick${nextMagicAttack - state.tick === 1 ? '' : 's'}`}
                  </strong>
                  <span>Attacks every 4 ticks</span>
                </div>
                <div className="cycle-phases">
                  {['Protect', 'Toggle off', 'Quiet', 'Prepare'].map(
                    (label, i) => (
                      <span
                        key={label}
                        className={`${i === 0 ? 'attack-phase' : ''} ${state.tick > 0 && (state.tick - 1) % 4 === i ? 'current' : ''}`}
                      >
                        <b>{i + 1}</b>
                        {mode === 'guided'
                          ? label
                          : i === 0
                            ? 'Attack'
                            : 'Quiet'}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
          <div
            className={`practice-workspace ${lesson.id === 'blowpipe' ? 'blowpipe-workspace' : ''}`}
          >
            <div className="practice-main">
              <div
                className={`training-arena ${lesson.id === 'blowpipe' ? 'blowpipe-arena' : hasMovement(lesson.id) ? 'with-movement' : ''}`}
              >
                {lesson.id === 'blowpipe' ? (
                  <BlowpipeScene
                    state={state.blowpipe}
                    tick={state.tick}
                    status={status}
                    guided={mode === 'guided'}
                    queued={attackQueued}
                    onCommand={(command) => {
                      attackRef.current = command;
                      setAttackQueued(command);
                    }}
                  />
                ) : (
                  <>
                    <EnemyScene
                      id={lesson.id}
                      state={state}
                      status={status}
                      guided={mode === 'guided'}
                    />
                    {hasMovement(lesson.id) ? (
                      <>
                        <div
                          className="movement-grid"
                          role="group"
                          aria-label="Movement practice grid"
                        >
                          {Array.from({ length: 25 }, (_, i) => (
                            <button
                              key={i}
                              aria-label={`Tile ${(i % 5) + 1}, ${Math.floor(i / 5) + 1}${i === target ? ', target' : ''}${i === tile ? ', player' : ''}`}
                              className={`tile ${i === target ? 'target' : ''} ${i === tile ? 'player' : ''}`}
                              onClick={() => move(i)}
                            >
                              {i === tile ? (
                                <span className="movement-player" data-player>
                                  <span
                                    className="overhead"
                                    data-prayer={displayedOverhead}
                                  >
                                    {displayedOverhead !== 'off' && (
                                      <GameIcon
                                        name={`protect-${displayedOverhead}`}
                                      />
                                    )}
                                  </span>
                                  <GameIcon name="player" />
                                </span>
                              ) : i === target ? (
                                <span>◇</span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                        <p className="arena-caption">
                          ◇ Reach the marked tile by tick{' '}
                          {Math.ceil(nextTick / movementPeriod(lesson.id)) *
                            movementPeriod(lesson.id)}{' '}
                          · coordination drill
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="arena-floor" />
                        <div className="player-avatar" data-player>
                          <div
                            className="overhead"
                            data-prayer={displayedOverhead}
                          >
                            {displayedOverhead !== 'off' && (
                              <GameIcon name={`protect-${displayedOverhead}`} />
                            )}
                          </div>
                          <GameIcon name="player" />
                        </div>
                      </>
                    )}
                  </>
                )}
                <CombatEffects
                  id={lesson.id}
                  tick={state.tick}
                  hits={state.attackResults}
                  running={status === 'running'}
                  active={status === 'running' || status === 'paused'}
                />
                {status === 'countdown' && (
                  <div className="arena-overlay">
                    <strong>{countdown}</strong>
                    <span>
                      {isJad(lesson.id)
                        ? 'Get ready · watch the attack cue'
                        : lesson.id === 'blowpipe'
                          ? 'Get ready · click the target first'
                          : `Get ready · select ${startPrayer} to start`}
                    </span>
                  </div>
                )}
                {status === 'paused' && (
                  <div className="arena-overlay">
                    <Icon name="clock" size={35} />
                    <h2>Practice paused</h2>
                    <p>
                      Paused runs count as practice.
                      <br />
                      Your progress in this run is safe.
                    </p>
                    <button
                      className="button primary"
                      onClick={() =>
                        setStatus(state.tick === 0 ? 'countdown' : 'running')
                      }
                    >
                      Resume practice
                      <Icon name="play" size={15} />
                    </button>
                  </div>
                )}
              </div>
              {lesson.id !== 'blowpipe' && (
                <p className="combat-key">
                  <span>
                    <img src="/effects/hitsplat-miss.png" alt="" /> Blue 0:
                    protected
                  </span>
                  <span>
                    <img src="/effects/hitsplat-damage.png" alt="" /> Red:
                    simulated damage
                  </span>
                </p>
              )}
              <div className="tick-track">
                <div className="tick-label">
                  <span>
                    {status === 'running'
                      ? `Preparing tick ${nextTick}`
                      : status === 'done'
                        ? 'Run complete'
                        : status === 'countdown'
                          ? 'Count in…'
                          : status === 'paused'
                            ? 'Paused'
                            : lesson.id === 'blowpipe'
                              ? 'Click the target to fire, then run two tiles'
                              : 'Choose your prayer before each beat'}
                  </span>
                  {lesson.id === 'blowpipe' &&
                    (status === 'done' ? (
                      <button
                        className="button secondary nearby-retry"
                        onClick={() => begin()}
                      >
                        {mode === 'guided' ? 'Restart practice' : 'Retry'}
                      </button>
                    ) : (
                      <span>GAME SPEED · 0.6s</span>
                    ))}
                </div>
                {lesson.id === 'blowpipe' && (
                  <TickMeter
                    deadline={tickDeadlineRef}
                    paused={status === 'paused'}
                  />
                )}
                {lesson.id !== 'blowpipe' && (
                  <div className="beat-dots">
                    {Array.from({ length: cycleLength }, (_, i) => (
                      <span
                        key={i}
                        className={
                          state.tick > 0 && (state.tick - 1) % cycleLength === i
                            ? 'current'
                            : ''
                        }
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {lesson.id === 'blowpipe' && (
                <div
                  className="blowpipe-status"
                  role="group"
                  aria-label="Blowpipe results so far"
                >
                  <span>
                    <strong>{state.blowpipe.shots} / 18</strong> shots fired
                  </span>
                  <span>
                    <strong>{state.blowpipe.legs} / 6</strong> lengths run
                  </span>
                  <span>
                    <strong>{state.blowpipe.lostTicks}</strong> attack ticks
                    lost
                  </span>
                  <p>
                    {attackQueued?.type === 'attack'
                      ? 'Target selected'
                      : attackQueued?.type === 'move'
                        ? `Run to tile ${attackQueued.tile + 1} queued`
                        : state.blowpipe.attacking
                          ? 'Attacking target'
                          : state.blowpipe.destination !== null
                            ? `Running to tile ${state.blowpipe.destination + 1}`
                            : 'No action queued'}{' '}
                    ·{' '}
                    {state.blowpipe.nextShotTick <= nextTick
                      ? 'Weapon ready'
                      : 'One tick of cooldown'}
                  </p>
                </div>
              )}
              {state.exposure && (
                <p className="exposure-note" role="status">
                  {state.exposure}
                </p>
              )}
              {mode === 'guided' && (
                <PrayerPreview id={lesson.id} state={state} selected={prayer} />
              )}
            </div>
            {lesson.id !== 'blowpipe' && (
              <GamePanels
                id={lesson.id}
                prayerInstruction={
                  lesson.id === 'alternate' && state.tick === 0
                    ? 'Start on Magic. Hold through the first mager attack (tick 1), then switch to Ranged.'
                    : undefined
                }
                onRetry={
                  status === 'done' && !session ? () => begin() : undefined
                }
                retryLabel={mode === 'guided' ? 'Restart practice' : 'Retry'}
                score={score}
                activePrayer={displayedOverhead}
                tickDeadline={tickDeadlineRef}
                paused={status === 'paused'}
                litPrayers={litPrayers}
                panel={panel}
                tabKeys={tabKeys}
                running={status === 'running'}
                consumed={state.consumed}
                queuedSupply={queuedSupply}
                supplyMessage={state.supplyMessage}
                onPanel={setPanel}
                onPrayer={(p) =>
                  selectPrayer(prayerRef.current === p ? 'off' : p, p)
                }
                onSupply={(item) => {
                  prepareSupplySound();
                  supplyRef.current = item;
                  setQueuedSupply(item);
                }}
              >
                {session?.panel}
                {!session &&
                  lesson.id === 'movement' &&
                  mode === 'challenge' && (
                    <MovementChallenge
                      checks={state.checks}
                      done={status === 'done'}
                      practice={interrupted && status !== 'ready'}
                      canRetry={status === 'running' || status === 'paused'}
                      onRetry={() => begin()}
                      onFinishPractice={() => {
                        setFinishingAsPractice(true);
                        setInterrupted(true);
                      }}
                    />
                  )}
              </GamePanels>
            )}
          </div>
          {hasSupplies(lesson.id) && (
            <div className="supply-objective">
              <Icon name="target" size={15} />
              <span>
                {supplyTarget ? (
                  <>
                    This gap:{' '}
                    <strong>
                      {supplyTarget === 'shark'
                        ? 'eat one shark'
                        : `drink ${supplyTarget}`}
                    </strong>{' '}
                    by tick {Math.ceil(nextTick / 4) * 4}
                  </>
                ) : (
                  'Supply sequence finished. Protect the final attack.'
                )}
              </span>
              {state.gapSupply && nextTick % 4 !== 1 && (
                <b>✓ Used {state.gapSupply}</b>
              )}
            </div>
          )}

          <div
            className={`live-coach ${recent && !recent.correct ? 'miss' : ''}`}
          >
            <Icon
              name={recent && !recent.correct ? 'target' : 'bolt'}
              size={18}
            />
            <p>
              {mode === 'guided'
                ? hint
                : lesson.id === 'blowpipe'
                  ? recent?.message ||
                    'Click the target, then run between shots.'
                  : 'Prayer hints are hidden. Trust your rhythm.'}
              {mode === 'guided' && recent && <small>{recent.message}</small>}
            </p>
          </div>
          {soundError && (
            <p className="fine-print" role="status">
              Audio is unavailable in this browser. The visual tick bar still
              works.
            </p>
          )}
          <p className="control-note">
            {lesson.id === 'blowpipe' ? (
              'Click the monster to attack. Ground clicks stop attacking; target clicks stop running. Your last click before the tick is the order that registers.'
            ) : (
              <>
                Click a prayer to activate it; click it again to turn it off.{' '}
                {hasMovement(lesson.id)
                  ? 'Click the marked tile to move. '
                  : ''}
                Use the Pause button to take a break.
              </>
            )}
          </p>
        </section>
        <aside className="lesson-notes">
          <span className="eyebrow">BEFORE YOU BEGIN</span>
          <h2>Drill instructions</h2>
          <ol>
            {lesson.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="takeaway">
            <Icon name="book" size={20} />
            <p>{lesson.takeaway}</p>
          </div>
          <a
            className="source-link"
            href={source.href}
            target="_blank"
            rel="noreferrer"
          >
            Watch the example · {source.label} ↗
          </a>
          <div className="los-assignment">
            <strong>
              {isJad(lesson.id) || lesson.id === 'blowpipe'
                ? 'Practise the encounter next'
                : 'Add the real wave layout'}
            </strong>
            <p>
              {isJad(lesson.id) || lesson.id === 'blowpipe'
                ? lesson.id === 'blowpipe'
                  ? 'Take the shoot–move rhythm to Zuk’s healers in the full combat simulator. This lane has no incoming damage, shield or pathfinding obstacles.'
                  : 'Rehearse real attack animations, healer tags and shield movement in the full combat simulator.'
                : 'Use the LoS tool to explore pillar routes, enemy exposure and the positioning that creates your prayer cycle.'}
            </p>
            {losSetup && (
              <p className="setup-description">{losSetup.description}</p>
            )}
            <a
              className="button secondary"
              href={
                isJad(lesson.id) || lesson.id === 'blowpipe'
                  ? sourceLinks.combat
                  : losSetup?.href || sourceLinks.los
              }
              target="_blank"
              rel="noreferrer"
            >
              {isJad(lesson.id) || lesson.id === 'blowpipe'
                ? 'Open combat simulator'
                : 'Open this setup'}{' '}
              ↗
            </a>
          </div>
          {!session && (
            <div className="mastery-note">
              <span className="eyebrow">CHALLENGE PASSES</span>
              <h3>Two passes at {passTarget}</h3>
              <p>
                Meet the target in two uninterrupted challenges. Guided runs
                help you get there.
              </p>
              <div className="mastery-stamps">
                {[1, 2].map((n) => (
                  <span
                    key={n}
                    className={(progress?.passes || 0) >= n ? 'earned' : ''}
                  >
                    <Icon name="check" size={18} />
                    Pass {n}
                  </span>
                ))}
              </div>
            </div>
          )}
          <a
            className="text-button"
            href={sourceLinks.wiki}
            target="_blank"
            rel="noreferrer"
          >
            Mechanics on the OSRS Wiki
            <Icon name="external" size={14} />
          </a>
        </aside>
      </div>
      {status === 'done' && !session && (
        <section className="results" aria-label="Run results">
          <div className="result-header">
            <div>
              <span className="eyebrow">
                {mode === 'challenge' && !interrupted
                  ? 'CHALLENGE COMPLETE'
                  : 'PRACTICE COMPLETE'}
              </span>
              <h2>
                {finishingAsPractice
                  ? 'Practice complete'
                  : mode === 'guided'
                    ? 'Guided practice complete'
                    : !interrupted && score >= requiredScore
                      ? 'Challenge passed'
                      : 'Challenge complete'}
              </h2>
              <p>{coaching(state.checks, lesson.id)}</p>
            </div>
            <strong className="result-score">
              {score}
              <span>%</span>
            </strong>
          </div>
          {mode === 'guided' && (
            <p className="challenge-next-step">
              Restart practice with hints, or try the challenge with{' '}
              {lesson.id === 'blowpipe' ? 'step' : 'prayer'} hints hidden. Same
              drill, same timing. Reach {passTarget} without pausing to earn a
              challenge pass.
            </p>
          )}
          <div className="result-actions">
            <button className="button primary" onClick={() => begin(true)}>
              {mode === 'guided' ? 'Restart practice' : 'Try challenge again'}
              <Icon name="reset" size={16} />
            </button>
            {mode === 'guided' && (
              <button
                className="button secondary"
                onClick={() => beginChallenge(true)}
              >
                Start challenge <Icon name="arrow" size={16} />
              </button>
            )}
            <button className="text-button" onClick={onNext}>
              Next drill <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="result-details">
            <span>
              {roundPoints} / {scoring.length}{' '}
              {lesson.id === 'blowpipe'
                ? 'scored attempts complete'
                : goal
                  ? 'rounds complete'
                  : 'checks correct'}
            </span>
            <span>Best streak: {state.bestStreak}</span>
            <span>
              {mode === 'challenge' && !interrupted && score >= requiredScore
                ? '✓ Mastery pass earned'
                : finishingAsPractice
                  ? 'Finished as practice · practice credit'
                  : interrupted
                    ? 'Paused run · practice credit'
                    : mode === 'guided'
                      ? 'Guided run · practice credit'
                      : `${passTarget} earns a mastery pass`}
            </span>
          </div>
          {state.exposures.length > 0 && (
            <div className="exposure-note">
              <strong>{state.exposures.length} attacks left unprotected</strong>
              <p>
                Correct priorities reduce damage; they do not block every
                attack. Exposure on ticks{' '}
                {state.exposures.map((e) => e.tick).join(', ')}. In a wave, use
                this pattern while isolating or removing the remaining threat.
              </p>
            </div>
          )}
          <details>
            <summary>Review all {state.checks.length} checks</summary>
            <div className="review-list">
              {state.checks.map((c, i) => (
                <div key={i} className={c.correct ? 'correct' : 'incorrect'}>
                  <b>
                    {c.correct ? '✓' : '×'} Tick {c.tick}
                  </b>
                  <span>
                    {c.kind === 'round'
                      ? 'Round score'
                      : c.kind === 'read'
                        ? 'Blob read'
                        : c.kind === 'movement'
                          ? 'Movement'
                          : c.kind === 'supply'
                            ? 'Supply'
                            : c.kind === 'flick'
                              ? 'Off–on pair'
                              : c.kind === 'attack'
                                ? 'Weapon timing'
                                : 'Prayer'}
                  </span>
                  <p>{c.message}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
      <p className="fine-print">
        A local timing model: {totalTicks} ticks per {session ? 'stage' : 'run'}
        , no damage rolls, network latency, or prayer-point calculation. Hidden
        tabs and long browser stalls pause the drill. Scores reflect these
        exercises, not readiness to complete the Inferno.
      </p>
    </div>
  );
}
