import { useEffect, useState } from 'react';
import {
  chapters,
  fieldLessons,
  fieldSource,
  type ChapterId,
} from '../lib/curriculum';
import { lessons, sourceLinks, type Lesson } from '../lib/course';
import type { Progress } from '../lib/progress';
import { PhaseLab } from './PhaseLab';
import { losSetups } from '../lib/los';
export const KNOWLEDGE_KEY = 'inferno-tips-knowledge-v1';
export function LearningPath({
  launch,
  progress,
  initialLesson,
}: {
  launch: (lesson: Lesson) => void;
  progress: Progress;
  initialLesson?: string;
}) {
  const [chapter, setChapter] = useState(
    fieldLessons.find((l) => l.id === initialLesson)?.chapter || chapters[0].id,
  );
  useEffect(() => {
    if (!initialLesson) return;
    const heading = document.getElementById(`lesson-${initialLesson}`);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [initialLesson]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '{}');
      const clean: Record<string, number> = {};
      for (const l of fieldLessons)
        if (
          Number.isInteger(value?.[l.id]) &&
          value[l.id] >= 0 &&
          value[l.id] < l.options.length
        )
          clean[l.id] = value[l.id];
      setAnswers(clean);
    } catch {
      /* A bad save never blocks learning. */
    }
  }, []);
  const selected = chapters.find((c) => c.id === chapter)!;
  const complete = fieldLessons.filter(
    (l) => answers[l.id] === l.answer,
  ).length;
  function selectChapter(id: ChapterId) {
    setChapter(id);
    const first = fieldLessons.find((l) => l.chapter === id)!;
    window.history.replaceState(null, '', `#lesson-${first.id}`);
    window.scrollTo(0, 0);
  }
  function answer(id: string, index: number) {
    const updated = { ...answers, [id]: index };
    setAnswers(updated);
    try {
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(updated));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Learning path</h1>
          <p>
            Work through the chapters or jump to the part of a run you’re
            learning. Optional techniques can wait until the basic solves are
            comfortable.
          </p>
        </div>
      </div>
      <div className="course-explainer">
        <p>
          <strong>
            {complete} / {fieldLessons.length} checks answered correctly.
          </strong>{' '}
          Answers save in this browser. Timing drills have their own results.
        </p>
      </div>
      {storageError && (
        <p role="status">
          Your answers work for this visit but could not be saved.
        </p>
      )}
      <div className="course-layout">
        <nav className="chapter-nav" aria-label="Course chapters">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              aria-current={chapter === c.id ? 'step' : undefined}
              onClick={() => {
                selectChapter(c.id);
              }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <b>{c.title}</b>
              <small>
                {
                  fieldLessons.filter(
                    (l) => l.chapter === c.id && answers[l.id] === l.answer,
                  ).length
                }
                /{fieldLessons.filter((l) => l.chapter === c.id).length} checks
              </small>
            </button>
          ))}
        </nav>
        <section className="chapter-content" aria-label={selected.title}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                CHAPTER {chapters.indexOf(selected) + 1}{' '}
                {chapter === 'advanced' ? '· OPTIONAL' : ''}
              </span>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
          </div>
          <nav className="lesson-contents" aria-label="In this chapter">
            <span>In this chapter</span>
            {fieldLessons
              .filter((l) => l.chapter === chapter)
              .map((l) => (
                <a key={l.id} href={`#lesson-${l.id}`}>
                  {l.title}
                </a>
              ))}
          </nav>
          {fieldLessons
            .filter((l) => l.chapter === chapter)
            .map((l) => {
              const source = fieldSource(l);
              const choice = answers[l.id];
              return (
                <article className="field-lesson" key={l.id}>
                  <h3 id={`lesson-${l.id}`} tabIndex={-1}>
                    {l.title}
                  </h3>
                  <p className="field-summary">{l.summary}</p>
                  {l.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <a
                    className="source-link"
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch the example · {source.label} ↗
                  </a>
                  {l.los && (
                    <div className="los-assignment">
                      <strong>Try this in the LoS tool</strong>
                      <p className="setup-description">
                        {losSetups[l.los.setup].description}
                      </p>
                      <p>{l.los.task}</p>
                      <a
                        className="button secondary"
                        href={losSetups[l.los.setup].href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open this setup ↗
                      </a>
                    </div>
                  )}
                  <fieldset className="knowledge-check">
                    <legend>{l.question}</legend>
                    {l.options.map((o, i) => (
                      <label key={o} className={choice === i ? 'chosen' : ''}>
                        <input
                          type="radio"
                          name={l.id}
                          checked={choice === i}
                          onChange={() => answer(l.id, i)}
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                    {choice !== undefined && (
                      <p
                        className={`knowledge-feedback ${choice === l.answer ? 'correct' : 'incorrect'}`}
                        role="status"
                      >
                        <strong>
                          {choice === l.answer
                            ? 'Correct. '
                            : 'Reconsider that choice. '}
                        </strong>
                        {l.explanation}
                      </p>
                    )}
                  </fieldset>
                </article>
              );
            })}
          {chapter === 'advanced' && <PhaseLab />}
          <section className="chapter-practice">
            <h3>Related drills</h3>
            <div>
              {selected.drills.map((id) => {
                const l = lessons.find((l) => l.id === id)!;
                return (
                  <button key={id} onClick={() => launch(l)}>
                    <img src={`/icons/${l.icon}.png`} alt="" />
                    <span>
                      <b>{l.title}</b>
                      <small>
                        {l.optional ? 'Optional · ' : ''}
                        {progress[id]?.passes || 0}/2 challenge passes
                      </small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                );
              })}
            </div>
          </section>
          {(chapter === 'jads' || chapter === 'zuk') && (
            <div className="los-assignment">
              <strong>Rehearse the full encounter</strong>
              <p>
                Select wave{' '}
                {chapter === 'jads'
                  ? '67 or 68 for Jad and triples'
                  : '69 for Zuk'}
                . Match your gear and tab keys. For Zuk, use the simulator’s
                phase controls to repeat healers and enrage. These encounter
                mechanics need the full arena.
              </p>
              <a
                className="button secondary"
                href={sourceLinks.combat}
                target="_blank"
                rel="noreferrer"
              >
                Open combat simulator ↗
              </a>
            </div>
          )}
          {chapter === 'zuk' && (
            <div className="los-assignment">
              <strong>Track sets during a run</strong>
              <p>
                Start at the first set, pause below 600 HP and resume at Jad.
                Includes a healer preparation reminder and Focus mode.
              </p>
              <a className="button secondary" href="/zuk-timer/?focus=1">
                Open Zuk timer →
              </a>
            </div>
          )}
          <div className="chapter-actions">
            {chapters.indexOf(selected) > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  selectChapter(chapters[chapters.indexOf(selected) - 1].id);
                }}
              >
                ← Previous chapter
              </button>
            )}
            {chapters.indexOf(selected) < chapters.length - 1 && (
              <button
                className="button primary"
                onClick={() => {
                  selectChapter(chapters[chapters.indexOf(selected) + 1].id);
                }}
              >
                Next chapter →
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
