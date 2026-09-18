import { useEffect, useState } from 'react';
import { chapters, fieldLessons, fieldSource } from '../lib/curriculum';
import { lessons, sourceLinks, type Lesson } from '../lib/course';
import type { Progress } from '../lib/progress';
import { PhaseLab } from './PhaseLab';
export const KNOWLEDGE_KEY = 'inferno-tips-knowledge-v1';
export function LearningPath({
  launch,
  progress,
}: {
  launch: (lesson: Lesson) => void;
  progress: Progress;
}) {
  const [chapter, setChapter] = useState(chapters[0].id);
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
          <span className="eyebrow">A ROUTE THROUGH THE INFERNO</span>
          <h1>Learn the decision. Then the clicks.</h1>
          <p>
            Eight chapters, {fieldLessons.length} field lessons and{' '}
            {lessons.length} timing drills. Start with the essentials; explore
            optional techniques when you have room.
          </p>
        </div>
      </div>
      <div className="course-explainer">
        <p>
          <strong>
            {complete} / {fieldLessons.length} knowledge checks understood.
          </strong>{' '}
          Read the situation, choose a response, then practise the chapter’s
          mechanics. Drill mastery is tracked separately: two uninterrupted
          challenges at 90%.
        </p>
      </div>
      {storageError && (
        <p role="status">
          Your answers work for this visit but could not be saved.
        </p>
      )}
      <nav className="chapter-nav" aria-label="Course chapters">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            aria-current={chapter === c.id ? 'step' : undefined}
            onClick={() => setChapter(c.id)}
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
        {fieldLessons
          .filter((l) => l.chapter === chapter)
          .map((l) => {
            const source = fieldSource(l);
            const choice = answers[l.id];
            return (
              <article className="field-lesson" key={l.id}>
                <span className="eyebrow">FIELD LESSON</span>
                <h3>{l.title}</h3>
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
                    <p>{l.los}</p>
                    <a
                      className="button secondary"
                      href={sourceLinks.los}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open LoS tool ↗
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
          <span className="eyebrow">PUT IT INTO PRACTICE</span>
          <h3>Build this chapter’s skills</h3>
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
              . Match your gear and tab keys. For Zuk, use the simulator’s phase
              controls to repeat healers and enrage. These encounter mechanics
              need the full arena.
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
        <div className="chapter-actions">
          {chapters.indexOf(selected) > 0 && (
            <button
              className="button secondary"
              onClick={() => {
                setChapter(chapters[chapters.indexOf(selected) - 1].id);
                window.scrollTo(0, 0);
              }}
            >
              ← Previous chapter
            </button>
          )}
          {chapters.indexOf(selected) < chapters.length - 1 && (
            <button
              className="button primary"
              onClick={() => {
                setChapter(chapters[chapters.indexOf(selected) + 1].id);
                window.scrollTo(0, 0);
              }}
            >
              Next chapter →
            </button>
          )}
        </div>
      </section>
    </>
  );
}
