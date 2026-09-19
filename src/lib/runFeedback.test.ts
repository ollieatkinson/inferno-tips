import { describe, expect, it } from 'vitest';
import { runFeedback } from './runFeedback';
import { advance, initialState, targetAt } from './engine';
import { drillTicks, type LessonId, type Prayer } from './course';

describe('practice feedback from recorded mistakes', () => {
  it('explains why holding Magic protects attacks but earns no lazy-flick rounds', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'rhythm', 'magic', 12);
    const report = runFeedback(state.checks, 'rhythm');
    expect(report.summary).toBe(
      '0 / 9 rounds complete. Practice target: 8 / 9.',
    );
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      kind: 'quiet',
      example: 'Tick 2: Needed off; Magic was active.',
    });
    expect(report.issues[0].ticks).toHaveLength(27);
    expect(report.issues[0].advice).toContain(
      'Turn the active prayer off just after',
    );
  });

  it('reports both protection and movement mistakes without treating failed rounds as extra mistakes', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(
        state,
        'movement',
        tick <= 4 ? 'off' : (tick - 1) % 4 < 2 ? 'magic' : 'range',
        12,
      );
    const report = runFeedback(state.checks, 'movement');
    expect(
      report.issues.map((issue) => [issue.kind, issue.ticks.length]),
    ).toEqual([
      ['movement', 9],
      ['off', 2],
    ]);
    expect(report.issues[0].advice).toContain(
      'move onto the marked tile by beat 4',
    );
  });

  it('does not blame movement when all tiles were reached but prayers were missed', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'movement', 'off', targetAt(tick));
    expect(
      runFeedback(state.checks, 'movement').issues.map((issue) => issue.kind),
    ).toEqual(['off']);
  });

  it.each(['food', 'potions'] as LessonId[])(
    'identifies missing %s actions even with perfect prayers',
    (id) => {
      let state = initialState();
      for (let tick = 1; tick <= drillTicks(id); tick++)
        state = advance(state, id, tick % 4 === 1 ? 'magic' : 'off', 12);
      const report = runFeedback(state.checks, id);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].kind).toBe('supply');
      expect(report.issues[0].example).toContain(
        'no item registered in the gap',
      );
      expect(report.issues[0].advice).toContain(
        id === 'food' ? 'eat one shark' : 'brew–brew–brew–restore',
      );
    },
  );

  it('recognises a regular alternating rhythm on the wrong phase and deduplicates simultaneous checks', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'alternate', tick % 2 ? 'range' : 'magic', 12);
    const report = runFeedback(state.checks, 'alternate');
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].title).toContain('one tick out of phase');
    expect(report.issues[0].ticks).toHaveLength(36);
    expect(report.issues[0].advice).toContain(
      'Hold Magic through the first mager attack',
    );
  });

  it('explains why holding prayer does not count as one-tick flicking', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(state, 'flick', 'magic', 12);
    const report = runFeedback(state.checks, 'flick');
    expect(
      report.issues.map((issue) => [issue.kind, issue.ticks.length]),
    ).toEqual([['flick', 35]]);
    expect(report.issues[0].advice).toContain('off, then on once');
  });

  it('distinguishes stationary blowpipe shots from failing to fire at all', () => {
    for (const shoot of [true, false]) {
      let state = initialState();
      for (let tick = 1; tick <= 36; tick++)
        state = advance(state, 'blowpipe', 'off', 12, null, {
          blowpipe: shoot && tick === 1 ? { type: 'attack' } : null,
        });
      const report = runFeedback(state.checks, 'blowpipe');
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].kind).toBe(shoot ? 'movement' : 'attack');
      expect(report.issues[0].ticks).toHaveLength(shoot ? 18 : 36);
      expect(report.summary).toContain('Practice target: 94%');
    }
  });

  it('does not invent mistakes in a clean run or an empty run', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++) {
      const prayer: Prayer = tick % 4 === 1 ? 'magic' : 'off';
      state = advance(state, 'rhythm', prayer, 12);
    }
    expect(runFeedback(state.checks, 'rhythm').issues).toEqual([]);
    expect(runFeedback(state.checks, 'rhythm').summary).toContain('9 / 9');
    expect(runFeedback([], 'rhythm')).toEqual({
      summary: 'No scored checks completed yet.',
      issues: [],
    });
  });
});
