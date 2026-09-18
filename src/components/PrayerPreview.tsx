import { prayerPreview } from '../lib/prayerPreview';
import { isJad, type DrillState } from '../lib/engine';
import type { LessonId, Prayer } from '../lib/course';

export function PrayerPreview({
  id,
  state,
  selected,
}: {
  id: LessonId;
  state: DrillState;
  selected: Prayer;
}) {
  if (isJad(id))
    return (
      <p className="prayer-preview-note">
        Jad has no repeating prayer pattern. Read each attack cue and keep that
        protection through the check.
      </p>
    );
  const beats = prayerPreview(id, state, selected);
  if (!beats.length) return null;
  return (
    <section className="prayer-preview" aria-label="Upcoming prayer pattern">
      <div className="prayer-preview-heading">
        <strong>Upcoming prayer pattern</strong>
        <span>Each column = 0.6s</span>
      </div>
      <div
        className="prayer-preview-scroll"
        tabIndex={0}
        role="region"
        aria-label="Prayer pattern table"
      >
        <table>
          <caption className="sr-only">
            Suggested prayer at each upcoming beat and clicks to prepare it
          </caption>
          <thead>
            <tr>
              <th scope="col">Tick</th>
              {beats.map((beat, i) => (
                <th
                  key={beat.tick}
                  scope="col"
                  className={i === 0 ? 'next-beat' : ''}
                  aria-current={i === 0 ? 'step' : undefined}
                >
                  {beat.tick}
                  {i === 0 && <small>Next</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Prayer</th>
              {beats.map((beat, i) => (
                <td key={beat.tick} className={i === 0 ? 'next-beat' : ''}>
                  {beat.prayer !== 'off' && (
                    <img
                      src={`/icons/protect-${beat.prayer}.png`}
                      alt=""
                      width="24"
                      height="24"
                    />
                  )}
                  <span>
                    {beat.prayer === 'range'
                      ? 'Ranged'
                      : beat.prayer === 'magic'
                        ? 'Magic'
                        : beat.prayer === 'melee'
                          ? 'Melee'
                          : 'Off'}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Action</th>
              {beats.map((beat, i) => (
                <td key={beat.tick} className={i === 0 ? 'next-beat' : ''}>
                  {beat.action}
                  {beat.note && <small>{beat.note}</small>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {id === 'flick'
          ? 'Off → on means two clicks between beats, ending on Magic.'
          : 'Prayer row = what should be active when the bar fills. Hold means no prayer click.'}
        {id === 'blob' &&
          ' The preview follows the blob’s actual read, then assumes you follow the shown prayers.'}
      </p>
    </section>
  );
}
