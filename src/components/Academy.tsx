import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LearningPath, KNOWLEDGE_KEY } from './LearningPath';
import { chapters } from '../lib/curriculum';
import {
  lessons,
  PASS_SCORE,
  sourceLinks,
  lessonSource,
  TOTAL_TICKS,
  type Lesson,
  type LessonId,
  type Mode,
  type Prayer,
} from '../lib/course';
import {
  accuracy,
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
  stock,
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
    flame:
      'M13 2c2 6-4 6-2 10 2-1 3-3 3-5 7 7 4 13-2 13S3 14 7 8c0 4 2 3 3 2 2-3 1-5 3-8Z',
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

type Page = 'overview' | 'course' | 'drills' | 'progress' | 'resources';

export default function Academy() {
  const [page, setPage] = useState<Page>('overview');
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
  const mastered = lessons.filter(
    (l) => (progress[l.id]?.passes || 0) >= 2,
  ).length;
  const next =
    learningOrder.find((l) => (progress[l.id]?.passes || 0) < 2) ||
    lessons[lessons.length - 1];
  function navigate(p: Page) {
    setPage(p);
    setActive(null);
    window.scrollTo(0, 0);
  }
  function launch(l: Lesson) {
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
        <button
          className="brand"
          onClick={() => navigate('overview')}
          aria-label="Inferno Tips home"
        >
          <span className="brand-mark">
            <Icon name="flame" size={27} />
          </span>
          <span>
            inferno<span className="muted">.tips</span>
            <small>THE PRACTICE GROUNDS</small>
          </span>
        </button>
        <div className="nav-label">YOUR TRAINING</div>
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
              className={`nav-item ${page === id && !active ? 'active' : ''}`}
              aria-current={page === id && !active ? 'page' : undefined}
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
        <div className="nav-label resources-label">GO A LITTLE DEEPER</div>
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
        <div className="sidebar-bottom">
          <div className="cape-badge">
            <Icon name="flame" size={22} />
          </div>
          <strong>One tick closer.</strong>
          <p>
            Every good run starts
            <br />
            with a little practice.
          </p>
          <div className="fan-label">
            <span /> Made for the OSRS community
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            The practice grounds <span>/</span>{' '}
            <b>
              {active
                ? active.title
                : {
                    overview: 'Overview',
                    course: 'Learning path',
                    drills: 'Practice drills',
                    progress: 'Your progress',
                    resources: 'Guides & resources',
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
              lesson={active}
              progress={progress[active.id]}
              onExit={() => setActive(null)}
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
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        LESS PANIC. MORE PRACTICE.
                      </span>
                      <h1>Your cape starts here.</h1>
                      <p>
                        Break the Inferno down. Build the muscle memory. Go
                        again.
                      </p>
                    </div>
                    <span className="small-tag">
                      <span className="orange-dot" /> OLD SCHOOL RUNESCAPE
                    </span>
                  </div>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="eyebrow">
                        <span className="orange-dot" /> SMALL DRILLS. BIG
                        DIFFERENCE.
                      </span>
                      <h2>
                        A little practice.
                        <br />A better run.
                      </h2>
                      <p>
                        That blob doesn’t have to end your run.
                        <br />
                        Learn one mechanic at a time, in a place
                        <br className="desktop-break" /> where mistakes cost
                        nothing.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => launch(next)}
                      >
                        {Object.keys(progress).length
                          ? 'Continue learning'
                          : 'Start learning'}
                        <Icon name="arrow" size={18} />
                      </button>
                      <span className="hero-note">
                        {lessons.length} drills <span>·</span> Bite-sized
                        practice <span>·</span> Zero supplies
                      </span>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="arena-glow" />
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="isometric-floor" />
                      <div className="lava-crack crack-one" />
                      <div className="lava-crack crack-two" />
                      <img className="hero-blob" src="/icons/blob.png" alt="" />
                      <div className="float-prayer magic">
                        <GameIcon name="protect-magic" />
                      </div>
                      <div className="float-prayer ranged">
                        <GameIcon name="protect-range" />
                      </div>
                      <div className="mob-label">
                        <span />
                        JAL-AK<span className="muted"> / </span> THE BLOB
                      </div>
                      <div className="tick-caption">
                        <i />
                        <i />
                        <i className="lit" />
                        <i />
                        <i />
                        <i />
                        <span>READ. SWITCH. REPEAT.</span>
                      </div>
                    </div>
                  </section>
                  <div className="stat-strip">
                    <div>
                      <span className="stat-icon">
                        <Icon name="book" />
                      </span>
                      <p>
                        <strong>Learn the why</strong>
                        <span>Understand before you click.</span>
                      </p>
                    </div>
                    <div>
                      <span className="stat-icon">
                        <Icon name="target" />
                      </span>
                      <p>
                        <strong>Practise the how</strong>
                        <span>Short drills. Instant feedback.</span>
                      </p>
                    </div>
                    <div>
                      <span className="stat-icon">
                        <Icon name="chart" />
                      </span>
                      <p>
                        <strong>Make it second nature</strong>
                        <span>Build consistency, not just a score.</span>
                      </p>
                    </div>
                  </div>
                  <div className="overview-columns">
                    <section className="path-section">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">
                            A PLAN, NOT A PLAYLIST
                          </span>
                          <h2>Your learning path</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate('course')}
                        >
                          View course
                          <Icon name="arrow" size={16} />
                        </button>
                      </div>
                      <p className="section-intro">
                        Start simple. Add a little pressure when you’re ready.
                      </p>
                      <div className="compact-lessons">
                        {lessons.slice(0, 3).map((l, i) => (
                          <button
                            className="lesson-row"
                            key={l.id}
                            onClick={() => launch(l)}
                          >
                            <span
                              className={`lesson-number ${progress[l.id]?.passes === 2 ? 'complete' : ''}`}
                            >
                              {progress[l.id]?.passes === 2 ? (
                                <Icon name="check" size={16} />
                              ) : (
                                `0${i + 1}`
                              )}
                            </span>
                            <span className="lesson-row-copy">
                              <strong>{l.title}</strong>
                              <small>{l.description}</small>
                            </span>
                            <span className="row-level">{l.level}</span>
                            <Icon name="arrow" size={17} />
                          </button>
                        ))}
                      </div>
                      <div className="path-footer">
                        <span>YOUR PROGRESS</span>
                        <div className="mini-progress">
                          <i
                            style={{
                              width: `${(mastered / lessons.length) * 100}%`,
                            }}
                          />
                        </div>
                        <b>
                          {mastered} / {lessons.length} mastered
                        </b>
                      </div>
                    </section>
                    <aside className="coach-card">
                      <span className="eyebrow">
                        <Icon name="flame" size={16} /> THE RIGHT MINDSET
                      </span>
                      <h3>
                        You don’t need to
                        <br />
                        learn it all at once.
                      </h3>
                      <p>
                        Pick one mechanic. Find the beat. Repeat until it feels
                        familiar.
                        <br />
                        That’s when it’s starting to stick.
                      </p>
                      <div className="coach-rule" />
                      <span className="coach-tip">Today’s goal</span>
                      <strong>One drill. A little more confidence.</strong>
                      <button
                        className="text-button"
                        onClick={() => launch(next)}
                      >
                        Let’s do it
                        <Icon name="arrow" size={16} />
                      </button>
                    </aside>
                  </div>
                  <div className="section-heading practice-heading">
                    <div>
                      <span className="eyebrow">STRAIGHT INTO THE ACTION</span>
                      <h2>Pick something to practise</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate('drills')}
                    >
                      All drills
                      <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  <div className="drill-grid">
                    {[lessons[1], lessons[3], lessons[4]].map((l) => (
                      <DrillCard
                        key={l.id}
                        lesson={l}
                        onClick={() => launch(l)}
                        progress={progress}
                      />
                    ))}
                  </div>
                </>
              )}
              {page === 'course' && (
                <LearningPath launch={launch} progress={progress} />
              )}
              {page === 'drills' && (
                <DrillLibrary launch={launch} progress={progress} />
              )}
              {page === 'progress' && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">CONSISTENCY IS THE GOAL</span>
                      <h1>Every rep counts.</h1>
                      <p>
                        Your progress stays in this browser. No account, no
                        leaderboard pressure.
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
                  <div className="progress-table">
                    {lessons.map((l) => (
                      <div key={l.id}>
                        <GameIcon name={l.icon} />
                        <strong>{l.title}</strong>
                        <span>
                          {progress[l.id]?.attempts
                            ? `${progress[l.id]?.best || 0}% challenge · ${progress[l.id]?.practiceBest || 0}% practice`
                            : 'Ready when you are'}
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
                    Mastery requires two completed, uninterrupted challenges at
                    90% or above. Guided and paused runs count as practice.
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
            </>
          )}
          <footer>
            <span className="footer-brand">
              <Icon name="flame" size={18} />
              inferno.tips <span>Made for the climb.</span>
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
      <h3>{lesson.title}</h3>
      <p>{lesson.description}</p>
      <div className="drill-card-bottom">
        <span>
          <Icon name="clock" size={14} />
          {lesson.id === 'blob'
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
          <span className="eyebrow">REPEAT THE SKILL YOU NEED</span>
          <h1>Welcome to the practice grounds.</h1>
          <p>
            Every drill is open. Filter by skill, pick a weak spot and start a
            36-tick run. Both modes use the real 0.6-second beat.
          </p>
        </div>
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
          <h1>Good practice. Great teachers.</h1>
          <p>A few places to go when you want to see the bigger picture.</p>
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
          <h2>Two-tick timing, made visible.</h2>
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
          <h2>Make the wave simpler.</h2>
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
          <h2>A full run, explained.</h2>
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
          <h2>Your reference, between runs.</h2>
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
          <h2>Make sense of a messy wave.</h2>
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
        <h2>A better practice loop.</h2>
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

const tabKeyOptions = [
  'Escape',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
];
const tabKeyLabel = (key: string) => (key === 'Escape' ? 'Esc' : key);

function readTabKeys() {
  const defaults = { inventory: 'Escape', prayers: 'F1' };
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = JSON.parse(
      localStorage.getItem('inferno-tips-tab-keys-v1') || 'null',
    );
    if (
      stored &&
      tabKeyOptions.includes(stored.inventory) &&
      tabKeyOptions.includes(stored.prayers) &&
      stored.inventory !== stored.prayers
    )
      return {
        inventory: String(stored.inventory),
        prayers: String(stored.prayers),
      };
  } catch {
    /* Invalid or blocked storage keeps the default keys. */
  }
  return defaults;
}

function Trainer({
  lesson,
  progress,
  onExit,
  onComplete,
  onNext,
}: {
  lesson: Lesson;
  progress: { passes: number; best: number } | undefined;
  onExit: () => void;
  onComplete: (
    id: LessonId,
    score: number,
    mode: Mode,
    ticks: number,
    interrupted: boolean,
  ) => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<Mode>('guided');
  const [status, setStatus] = useState<
    'ready' | 'countdown' | 'running' | 'paused' | 'done'
  >('ready');
  const [state, setState] = useState<DrillState>(initialState);
  const [prayer, setPrayer] = useState<Prayer>('off');
  const [tile, setTile] = useState(12);
  const [countdown, setCountdown] = useState(3);
  const [interrupted, setInterrupted] = useState(false);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const [panel, setPanel] = useState<'prayers' | 'inventory'>('prayers');
  const [tabKeys, setTabKeys] = useState(readTabKeys);
  const [keyError, setKeyError] = useState(false);
  const [queuedSupply, setQueuedSupply] = useState<Supply | null>(null);
  const supplyRef = useRef<Supply | null>(null);
  const transitionsRef = useRef<Prayer[]>([]);
  const attackRef = useRef(false);
  const [attackQueued, setAttackQueued] = useState(false);
  const prayerRef = useRef<Prayer>('off');
  const tileRef = useRef(12);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const completeRef = useRef(onComplete);
  const savedRef = useRef(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const ms = 600;
  const cycleLength = isJad(lesson.id)
    ? jadPeriod(lesson.id)
    : lesson.id === 'bat'
      ? 3
      : hasBlob(lesson.id)
        ? 6
        : 4;
  const nextTick = Math.min(TOTAL_TICKS, state.tick + 1);
  const expected = expectedPrayer(
    lesson.id,
    nextTick,
    state.pending,
    state.seed,
  );
  const target = targetAt(nextTick, lesson.id);
  const score = accuracy(state.checks);
  const supplyTarget = supplyGoal(lesson.id, nextTick);
  const nextMagicAttack = nextTick + ((1 - (nextTick % 4) + 4) % 4);
  const magerLesson = lesson.id === 'rhythm' || hasSupplies(lesson.id);
  const busy =
    status === 'running' || status === 'countdown' || status === 'paused';
  completeRef.current = onComplete;
  soundRef.current = sound;
  function selectPrayer(p: Prayer) {
    if (status === 'running' && p !== prayerRef.current)
      transitionsRef.current.push(p);
    prayerRef.current = p;
    setPrayer(p);
  }
  function move(t: number) {
    tileRef.current = t;
    setTile(t);
  }
  function begin() {
    setState(initialState(Math.floor(Math.random() * 100000)));
    transitionsRef.current = [];
    attackRef.current = false;
    setAttackQueued(false);
    selectPrayer('off');
    move(12);
    setPanel('prayers');
    supplyRef.current = null;
    setQueuedSupply(null);
    setCountdown(3);
    setInterrupted(false);
    savedRef.current = false;
    setStatus('countdown');
  }
  function changeTabKey(tab: 'inventory' | 'prayers', key: string) {
    const other = tab === 'inventory' ? 'prayers' : 'inventory';
    const updated = {
      ...tabKeys,
      [tab]: key,
      ...(tabKeys[other] === key ? { [other]: tabKeys[tab] } : {}),
    };
    setTabKeys(updated);
    try {
      localStorage.setItem('inferno-tips-tab-keys-v1', JSON.stringify(updated));
      setKeyError(false);
    } catch {
      setKeyError(true);
    }
  }
  function pause() {
    setInterrupted(true);
    setStatus('paused');
  }
  function beep() {
    const ctx = audioRef.current;
    if (!soundRef.current || !ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
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
    if (status !== 'countdown') return;
    const timer = window.setTimeout(() => {
      beep();
      if (countdown === 1) {
        transitionsRef.current = [];
        setStatus('running');
      } else setCountdown((c) => c - 1);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [status, countdown, ms]);
  useEffect(() => {
    if (status !== 'running') return;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      if (performance.now() - started > ms + 250) {
        pause();
        return;
      }
      const supply = supplyRef.current;
      supplyRef.current = null;
      setQueuedSupply(null);
      const input = {
        transitions: transitionsRef.current,
        attack: attackRef.current,
      };
      transitionsRef.current = [];
      attackRef.current = false;
      setAttackQueued(false);
      beep();
      setState((prev) =>
        advance(
          prev,
          lesson.id,
          prayerRef.current,
          tileRef.current,
          supply,
          input,
        ),
      );
    }, ms);
    return () => window.clearTimeout(timer);
  }, [status, state.tick, ms, lesson.id]);
  useEffect(() => {
    if (state.tick === TOTAL_TICKS && !savedRef.current) {
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
    if (status === 'done') resultRef.current?.focus();
  }, [status]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && (status === 'running' || status === 'countdown'))
        pause();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [status]);
  useLayoutEffect(() => {
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
      nextTick % 2
        ? 'Queue Attack before this beat.'
        : 'Weapon cooldown: click the marked tile before this beat.';
  if (isJad(lesson.id) && !expected)
    hint = 'Read the current Jad cue. Keep protection through its check.';
  const recent = state.checks.at(-1);
  const source = lessonSource(lesson);
  const startPrayer =
    lesson.id === 'anchor-range' || lesson.id === 'bat'
      ? 'Ranged'
      : lesson.id === 'melee-blob'
        ? 'Melee'
        : 'Magic';
  return (
    <div className="trainer-page">
      <button className="text-button back-button" onClick={onExit}>
        ← Back to practice grounds
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            DRILL {String(lessons.indexOf(lesson) + 1).padStart(2, '0')} /{' '}
            {lesson.level.toUpperCase()}
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.objective}</p>
        </div>
        <GameIcon name={lesson.icon} className="lesson-heading-icon" />
      </div>
      <div className="trainer-layout">
        <section className="training-panel" aria-label="Interactive practice">
          <div className="training-toolbar">
            <div className="mode-switch" aria-label="Training mode">
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
            <span>{ms / 1000}s / tick</span>
          </div>
          <div className="run-stats">
            <div>
              <small>TICK</small>
              <strong>
                {state.tick}
                <span> / {TOTAL_TICKS}</span>
              </strong>
            </div>
            <div>
              <small>ACCURACY</small>
              <strong>{state.checks.length ? `${score}%` : '—'}</strong>
            </div>
            <div>
              <small>STREAK</small>
              <strong>
                {state.streak}
                <span> checks</span>
              </strong>
            </div>
          </div>
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
            <div className="attack-cycle" aria-label="Mager attack cycle">
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
                      {mode === 'guided' ? label : i === 0 ? 'Attack' : 'Quiet'}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
          <div
            className={`training-arena ${hasMovement(lesson.id) ? 'with-movement' : ''}`}
          >
            {hasMovement(lesson.id) ? (
              <>
                <div
                  className="movement-grid"
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
                        <GameIcon name="player" />
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
                <div className="enemy-line">
                  {(isJad(lesson.id)
                    ? ['jad']
                    : lesson.id === 'bat'
                      ? ['bat']
                      : lesson.id === 'reverse'
                        ? ['mager', 'bat']
                        : lesson.id === 'melee-blob'
                          ? ['melee', 'blob']
                          : ['stack', 'stack-one'].includes(lesson.id)
                            ? ['mager', 'ranger']
                            : lesson.id === 'anchor-range'
                              ? ['ranger', 'blob']
                              : lesson.id === 'double-blob'
                                ? ['mager', 'blob', 'blob']
                                : ['two-tick', 'two-tick-repair'].includes(
                                      lesson.id,
                                    )
                                  ? ['mager', 'blob']
                                  : hasBlob(lesson.id)
                                    ? ['blob']
                                    : ['mager']
                  ).map((n, index) => (
                    <div
                      className={`enemy ${magerLesson && state.tick > 0 && state.tick % 4 === 1 ? 'attacking' : ''}`}
                      key={`${n}-${index}-${magerLesson ? state.tick : 0}`}
                    >
                      <GameIcon name={n} />
                      <span>
                        {n === 'blob'
                          ? 'JAL-AK'
                          : n === 'mager'
                            ? 'JAL-ZEK'
                            : n === 'ranger'
                              ? 'JAL-XIL'
                              : n === 'jad'
                                ? 'JALTOK-JAD'
                                : n === 'bat'
                                  ? 'JAL-MEJRAH'
                                  : 'JAL-IMKOT'}
                      </span>
                      {magerLesson &&
                        state.tick > 0 &&
                        state.tick % 4 === 1 && (
                          <b className="attack-flash">MAGIC ATTACK</b>
                        )}
                    </div>
                  ))}
                </div>
                <div className="player-avatar">
                  <div className="overhead">
                    {prayer !== 'off' && (
                      <GameIcon name={`protect-${prayer}`} />
                    )}
                  </div>
                  <GameIcon name="player" />
                </div>
              </>
            )}
            {status === 'countdown' && (
              <div className="arena-overlay">
                <strong>{countdown}</strong>
                <span>
                  {isJad(lesson.id)
                    ? 'Get ready · watch the attack cue'
                    : lesson.id === 'blowpipe'
                      ? 'Get ready · shoot, then step'
                      : `Get ready · select ${startPrayer} to start`}
                </span>
              </div>
            )}
            {status === 'paused' && (
              <div className="arena-overlay">
                <Icon name="clock" size={35} />
                <h3>Take a breath.</h3>
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
                        : 'Choose your prayer before each beat'}
              </span>
              <span>GAME SPEED · 0.6s</span>
            </div>
            <div className="tick-meter">
              <i
                key={`${state.tick}-${status}`}
                className={status === 'running' ? 'ticking' : ''}
                style={{ animationDuration: `${ms}ms` }}
              />
            </div>
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
          </div>
          {lesson.id === 'blowpipe' && (
            <div className="attack-controls">
              <button
                className="button primary"
                disabled={status !== 'running'}
                aria-pressed={attackQueued}
                onClick={() => {
                  attackRef.current = true;
                  setAttackQueued(true);
                }}
              >
                Attack target
              </button>
              <span>
                {attackQueued
                  ? 'Shot queued for next beat'
                  : 'Rapid blowpipe · one shot every two ticks'}
              </span>
            </div>
          )}
          {state.exposure && (
            <p className="exposure-note" role="status">
              {state.exposure}
            </p>
          )}
          <div
            className="game-panel-tabs"
            role="group"
            aria-label="Game panels"
          >
            <button
              aria-pressed={panel === 'prayers'}
              onClick={() => setPanel('prayers')}
            >
              <GameIcon name="protect-magic" />
              Prayers <kbd>{tabKeyLabel(tabKeys.prayers)}</kbd>
            </button>
            <button
              aria-pressed={panel === 'inventory'}
              onClick={() => setPanel('inventory')}
            >
              <Icon name="grid" size={17} />
              Inventory <kbd>{tabKeyLabel(tabKeys.inventory)}</kbd>
            </button>
            <span>
              Active:{' '}
              {prayer === 'off'
                ? 'None'
                : prayer === 'magic'
                  ? 'Magic'
                  : prayer === 'melee'
                    ? 'Melee'
                    : 'Ranged'}
            </span>
          </div>
          {panel === 'prayers' ? (
            <div className="prayer-controls" aria-label="Prayer panel">
              {(lesson.id === 'melee-blob'
                ? (['magic', 'range', 'melee'] as const)
                : (['magic', 'range'] as const)
              ).map((p) => (
                <button
                  key={p}
                  aria-pressed={prayer === p}
                  className={`prayer-button ${prayer === p ? 'selected' : ''}`}
                  onClick={() =>
                    selectPrayer(prayerRef.current === p ? 'off' : p)
                  }
                >
                  <GameIcon name={`protect-${p}`} />
                  <span>
                    {p === 'range'
                      ? 'Ranged'
                      : p === 'melee'
                        ? 'Melee'
                        : 'Magic'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="inventory-panel" aria-label="Inventory panel">
              {hasSupplies(lesson.id) ? (
                <>
                  <div className="inventory-items">
                    {(lesson.id === 'food'
                      ? (['shark'] as Supply[])
                      : (['brew', 'restore'] as Supply[])
                    ).map((item) => (
                      <button
                        className={`supply-button ${queuedSupply === item ? 'queued' : ''}`}
                        key={item}
                        disabled={
                          status !== 'running' ||
                          state.consumed[item] >= stock[item]
                        }
                        onClick={() => {
                          supplyRef.current = item;
                          setQueuedSupply(item);
                        }}
                        aria-label={`${item === 'shark' ? 'Eat shark' : item === 'brew' ? 'Drink Saradomin brew' : 'Drink super restore'}, ${stock[item] - state.consumed[item]} ${item === 'shark' ? 'remaining' : 'doses remaining'}`}
                      >
                        <GameIcon name={item} />
                        <strong>
                          {item === 'shark'
                            ? 'Shark'
                            : item === 'brew'
                              ? 'Saradomin brew'
                              : 'Super restore'}
                        </strong>
                        <small>
                          {stock[item] - state.consumed[item]}{' '}
                          {item === 'shark' ? 'remaining' : 'doses'}
                        </small>
                      </button>
                    ))}
                  </div>
                  <p className="inventory-status" role="status">
                    {queuedSupply
                      ? `${queuedSupply === 'shark' ? 'Eat shark' : `Drink ${queuedSupply}`} queued for the next tick.`
                      : state.supplyMessage ||
                        'Click an item during the gap after an attack. It registers on the next tick.'}
                  </p>
                </>
              ) : (
                <p className="empty-inventory">
                  No supplies needed for this lesson.
                  <br />
                  Try “Eat between flicks” for inventory practice.
                </p>
              )}
            </div>
          )}
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
                : 'Prayer hints are hidden. Trust your rhythm.'}
              {mode === 'guided' && recent && <small>{recent.message}</small>}
            </p>
          </div>
          <div className="training-actions">
            {status === 'ready' || status === 'done' ? (
              <button className="button primary" onClick={begin}>
                <Icon name="play" size={15} />
                {status === 'done'
                  ? 'Try again'
                  : mode === 'guided'
                    ? 'Start guided practice'
                    : 'Start challenge'}
              </button>
            ) : (
              <>
                <button
                  className="button secondary"
                  onClick={
                    status === 'paused'
                      ? () =>
                          setStatus(state.tick === 0 ? 'countdown' : 'running')
                      : pause
                  }
                >
                  {status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setState(initialState());
                    setStatus('ready');
                  }}
                >
                  End run
                </button>
              </>
            )}
            <label className="sound-toggle">
              <input
                type="checkbox"
                checked={sound}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  setSound(enabled);
                  if (enabled) {
                    try {
                      audioRef.current ||= new AudioContext();
                      await audioRef.current.resume();
                      setSoundError(false);
                    } catch {
                      setSound(false);
                      setSoundError(true);
                    }
                  }
                }}
              />
              Tick sound
            </label>
          </div>
          {soundError && (
            <p className="fine-print" role="status">
              Audio is unavailable in this browser. The visual tick bar still
              works.
            </p>
          )}
          <p className="control-note">
            Click a prayer to activate it; click it again to turn it off.{' '}
            {hasMovement(lesson.id) ? 'Click the marked tile to move. ' : ''}Use
            the Pause button to take a break.
          </p>
          <details className="tab-key-settings">
            <summary>Configure tab keys</summary>
            <p>
              Choose Esc or F1–F12 to match your OSRS tab settings. Keys only
              open a tab; they never activate a prayer or consume an item.
              Changes save on this browser. Choosing the other tab’s key swaps
              the two bindings.
            </p>
            <div>
              {(['inventory', 'prayers'] as const).map((tab) => (
                <label key={tab}>
                  {tab === 'inventory' ? 'Inventory key' : 'Prayer tab key'}
                  <select
                    aria-label={
                      tab === 'inventory' ? 'Inventory key' : 'Prayer tab key'
                    }
                    value={tabKeys[tab]}
                    onChange={(e) => changeTabKey(tab, e.target.value)}
                  >
                    {tabKeyOptions.map((key) => (
                      <option key={key} value={key}>
                        {tabKeyLabel(key)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {keyError && (
              <p role="status">
                Tab keys work for this visit, but could not be saved.
              </p>
            )}
          </details>
        </section>
        <aside className="lesson-notes">
          <span className="eyebrow">BEFORE YOU BEGIN</span>
          <h2>What to practise.</h2>
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
                ? 'Rehearse real attack animations, healer tags and shield movement in the full combat simulator.'
                : 'Use the LoS tool to explore pillar routes, enemy exposure and the positioning that creates your prayer cycle.'}
            </p>
            <a
              className="button secondary"
              href={
                isJad(lesson.id) || lesson.id === 'blowpipe'
                  ? sourceLinks.combat
                  : sourceLinks.los
              }
              target="_blank"
              rel="noreferrer"
            >
              {isJad(lesson.id) || lesson.id === 'blowpipe'
                ? 'Open combat simulator'
                : 'Open LoS tool'}{' '}
              ↗
            </a>
          </div>
          <div className="mastery-note">
            <span className="eyebrow">MAKE IT STICK</span>
            <h3>90% twice. Then move on.</h3>
            <p>
              Finish two uninterrupted challenges at 90% or above. Guided runs
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
      {status === 'done' && (
        <section className="results" aria-label="Run results">
          <div className="result-header">
            <div>
              <span className="eyebrow">
                {mode === 'challenge' && !interrupted
                  ? 'CHALLENGE COMPLETE'
                  : 'PRACTICE COMPLETE'}
              </span>
              <h2 ref={resultRef} tabIndex={-1}>
                {score >= PASS_SCORE
                  ? 'That’s a rhythm worth keeping.'
                  : 'Another rep. Another step forward.'}
              </h2>
              <p>{coaching(state.checks)}</p>
            </div>
            <strong className="result-score">
              {score}
              <span>%</span>
            </strong>
          </div>
          <div className="result-details">
            <span>
              {state.checks.filter((c) => c.correct).length} /{' '}
              {state.checks.length} checks correct
            </span>
            <span>Best streak: {state.bestStreak}</span>
            <span>
              {mode === 'challenge' && !interrupted && score >= PASS_SCORE
                ? '✓ Mastery pass earned'
                : interrupted
                  ? 'Paused run · practice credit'
                  : mode === 'guided'
                    ? 'Guided run · practice credit'
                    : `${PASS_SCORE}% earns a mastery pass`}
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
                    {c.kind === 'read'
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
          <div className="result-actions">
            <button className="button primary" onClick={begin}>
              Repeat this drill
              <Icon name="reset" size={16} />
            </button>
            {mode === 'guided' && (
              <button
                className="button secondary"
                onClick={() => {
                  setMode('challenge');
                  setStatus('ready');
                  setState(initialState());
                  window.scrollTo({ top: 0 });
                }}
              >
                Try without hints
                <Icon name="arrow" size={16} />
              </button>
            )}
            <button className="text-button" onClick={onNext}>
              Explore next lesson
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      )}
      <p className="fine-print">
        A local timing model: 36 ticks per run, no damage rolls, network
        latency, or prayer-point calculation. Hidden tabs and long browser
        stalls pause the drill. Scores reflect these exercises, not readiness to
        complete the Inferno.
      </p>
    </div>
  );
}
