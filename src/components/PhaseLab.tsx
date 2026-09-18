import { useState } from 'react';
import { phaseTimeline, type PhasePattern } from '../lib/phase';
export function PhaseLab() {
  const [pattern, setPattern] = useState<PhasePattern>('two');
  const [scan, setScan] = useState(1);
  const rows = phaseTimeline(pattern, scan);
  const attacks = rows.filter((r) => r.attack);
  return (
    <section className="phase-lab" aria-label="Blob phase lab">
      <span className="eyebrow">TRY THE TIMELINE</span>
      <h3>Same clicks. Different blob phase.</h3>
      <p>
        Change when the blob first sees you. Watch which prayer it reads and
        what protects you three ticks later. The mager attacks on ticks 1, 5 and
        9.
      </p>
      <div className="lab-controls">
        <label>
          Prayer pattern
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value as PhasePattern)}
          >
            <option value="one">One tick: M R M R</option>
            <option value="two">Two ticks: M M R R</option>
            <option value="shifted">Shifted two ticks: M R R M</option>
          </select>
        </label>
        <label>
          First blob read
          <select
            value={scan}
            onChange={(e) => setScan(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Tick {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="phase-table">
        <table>
          <caption>
            {attacks.filter((r) => r.protected).length} / {attacks.length} blob
            attacks protected in this window
          </caption>
          <thead>
            <tr>
              <th>Tick</th>
              <th>Your prayer</th>
              <th>Blob event</th>
              <th>Mager</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.tick}
                className={r.attack && !r.protected ? 'phase-miss' : ''}
              >
                <th>{r.tick}</th>
                <td>{r.prayer === 'magic' ? 'Magic' : 'Ranged'}</td>
                <td>
                  {r.read
                    ? `Reads ${r.prayer}`
                    : r.attack
                      ? `Attacks ${r.attack}`
                      : '—'}
                </td>
                <td>{r.tick % 4 === 1 ? 'Magic attack' : '—'}</td>
                <td>
                  {r.attack
                    ? r.protected
                      ? 'Protected'
                      : 'EXPOSED'
                    : r.read
                      ? 'Chooses opposite'
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        At-range blob model. An exposed attack is not necessarily a damaging
        hit; damage rolls are not simulated. Shifting a live pattern can involve
        a transition hit. One-tick alternating covers all four scan phases shown
        here.
      </p>
    </section>
  );
}
