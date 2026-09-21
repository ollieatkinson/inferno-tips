import { chapters, fieldLessons, fieldSource } from '../lib/curriculum';
import { losSetups } from '../lib/los';
import {
  lessons,
  drillTicks,
  sourceLinks,
  type Lesson,
  type LessonId,
} from '../lib/course';

const fixes: {
  problem: string;
  check: string;
  try: string;
  field: string;
  drill?: LessonId;
}[] = [
  {
    problem: 'The ranger hits me through my alternating prayers',
    check:
      'A steady pattern can still be a tick out. Check which prayer is active when the ranger starts its attack, not when its projectile lands.',
    try: 'Start Ranged on the ranger’s attack, then alternate each tick. Add movement only after that attack stays protected.',
    field: 'blob-anchor',
    drill: 'anchor-range',
  },
  {
    problem: 'I take a blob hit after getting behind the pillar',
    check:
      'The blob may have read your prayer before you hid. Breaking line of sight does not cancel an attack already queued.',
    try: 'Keep track of the last read and cover the pending attack. Step through the same exposure in the LoS tool.',
    field: 'blob-flinch',
    drill: 'blob',
  },
  {
    problem: 'I lose the next prayer when I brew or eat',
    check:
      'Several inventory clicks can use up the window for the next prayer. Tab keys open the panel; they do not use the item.',
    try: 'Protect the attack, make one supply click, and return to Prayers. Repeat before trying another sip.',
    field: 'heal-window',
    drill: 'potions',
  },
  {
    problem: 'My safe tile stops being safe when I attack',
    check:
      'The target may be outside your current weapon’s range. An attack or spell click can move you and expose another enemy.',
    try: 'Compare your true tile before and after the click. Check the new line of sight, then rehearse the route with your intended weapon.',
    field: 'weapon-drag',
  },
  {
    problem: 'Two-tick alternating protects the mager but not the blob',
    check:
      'The blob can read the wrong half of a two-tick hold. Faster clicking does not fix the phase.',
    try: 'Compare the two holds in the phase lab. Keep the mager protected; use one-tick alternating if the blob phase is uncertain.',
    field: 'two-phase',
    drill: 'two-tick-repair',
  },
  {
    problem: 'Zuk’s shield keeps taking damage',
    check:
      'Look for an untagged set enemy or Jad. Attacking one enemy does not draw the others onto you.',
    try: 'Practise tagging each threat while staying with the shield. Use the full combat simulator for this; the timing drills do not model shield health.',
    field: 'zuk-sets',
  },
];

export function Overview({
  next,
  launch,
  openField,
  openDrills,
}: {
  next: Lesson;
  launch: (lesson: Lesson) => void;
  openField: (id: string) => void;
  openDrills: () => void;
}) {
  return (
    <>
      <section className="home-banner" aria-labelledby="home-title">
        <img
          className="home-banner-art"
          src="/images/zuk-banner.webp"
          srcSet="/images/zuk-banner-small.webp 800w, /images/zuk-banner.webp 1600w"
          sizes="(max-width: 650px) 800px, (max-width: 1100px) 100vw, calc(100vw - 320px)"
          width={1600}
          height={934}
          alt="TzKal-Zuk emerging from the lava of the Inferno."
          fetchPriority="high"
        />
        <div className="home-banner-copy">
          <h1 id="home-title">Inferno practice & notes</h1>
          <p>Learn the wave solves. Practise the prayer timing.</p>
        </div>
        <a className="home-banner-credit" href="/credits/">
          Artwork © Jagex
        </a>
      </section>
      <section className="practice-start" aria-label="Suggested practice">
        <div>
          <span className="eyebrow">NEXT DRILL</span>
          <h2>{next.title}</h2>
          <p>{next.objective}</p>
        </div>
        <div className="practice-start-actions">
          <button className="button primary" onClick={() => launch(next)}>
            Start drill →
          </button>
          <button className="text-button" onClick={openDrills}>
            Browse all {lessons.length} drills
          </button>
          <small>{drillTicks(next.id)} ticks · 0.6 seconds per tick</small>
        </div>
      </section>
      <div className="home-columns">
        <div>
          <section className="guide-index" aria-labelledby="guide-index-title">
            <div className="section-heading">
              <div>
                <h2 id="guide-index-title">Learn the wave solves</h2>
                <p>Read a situation, check your decision, then practise it.</p>
              </div>
            </div>
            <ol>
              {chapters.map((chapter) => {
                const first = fieldLessons.find(
                  (l) => l.chapter === chapter.id,
                )!;
                return (
                  <li key={chapter.id}>
                    <button onClick={() => openField(first.id)}>
                      <span>{chapter.title}</span>
                      <small>
                        {chapter.id === 'advanced'
                          ? 'Optional'
                          : `${fieldLessons.filter((l) => l.chapter === chapter.id).length} lessons`}{' '}
                        <span aria-hidden="true">↗</span>
                      </small>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="troubleshooting" aria-labelledby="fix-title">
            <h2 id="fix-title">What went wrong?</h2>
            <p>Start with the missed attack or unexpected movement.</p>
            {fixes.map((fix) => {
              const field = fieldLessons.find((l) => l.id === fix.field)!;
              const source = fieldSource(field);
              return (
                <details key={fix.field}>
                  <summary>{fix.problem}</summary>
                  <div>
                    <p>{fix.check}</p>
                    <p>
                      <strong>Try this:</strong> {fix.try}
                    </p>
                    <div className="fix-links">
                      <button
                        className="text-button"
                        onClick={() => openField(fix.field)}
                      >
                        Read the lesson →
                      </button>
                      {fix.drill && (
                        <button
                          className="text-button"
                          onClick={() =>
                            launch(lessons.find((l) => l.id === fix.drill)!)
                          }
                        >
                          Practise this →
                        </button>
                      )}
                      {field.los && (
                        <a
                          className="source-link"
                          href={losSetups[field.los.setup].href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open this LoS setup ↗
                        </a>
                      )}
                      <a
                        className="source-link"
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label} ↗
                      </a>
                    </div>
                  </div>
                </details>
              );
            })}
          </section>
        </div>
        <aside className="run-reference" aria-label="Between attempts">
          <section>
            <h2>Rebuild a bad spawn</h2>
            <p>
              Place the enemies in the LoS tool. Check who can see your starting
              tile, then compare one move at a time.
            </p>
            <a
              className="button secondary"
              href={sourceLinks.los}
              target="_blank"
              rel="noreferrer"
            >
              Open LoS tool ↗
            </a>
            <a
              className="source-link"
              href={sourceLinks.combat}
              target="_blank"
              rel="noreferrer"
            >
              Full combat simulator · Jad & Zuk ↗
            </a>
            <a className="source-link" href="/zuk-timer/">
              Zuk set timer →
            </a>
          </section>
          <section>
            <h2>Before the next wave</h2>
            <ul>
              <li>Heal while a safe target is still alive.</li>
              <li>Check prayer, restored stats and boosts.</li>
              <li>Choose the opening tile and spell.</li>
              <li>Leave room to retreat if the melee digs.</li>
            </ul>
            <button
              className="text-button"
              onClick={() => openField('between-waves')}
            >
              Preparing and taking a break →
            </button>
          </section>
          <section>
            <h2>Review the attempt</h2>
            <p>
              In a recording or recreated spawn, find the first decision that
              broke the solve:
            </p>
            <ol>
              <li>Which enemy checked the unprotected prayer?</li>
              <li>What click or movement came just before it?</li>
              <li>What one change will you rehearse?</li>
            </ol>
            <p className="reference-example">
              “I switched to the blowpipe and ran out from cover” gives you
              something to practise next time.
            </p>
          </section>
          <p className="reference-limit">
            Drills practise timing and clicks. Use the wave simulators for
            pathfinding, damage and full encounters.
          </p>
        </aside>
      </div>
    </>
  );
}
