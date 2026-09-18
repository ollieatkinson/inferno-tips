import { describe, it, expect } from 'vitest';
import { phaseTimeline } from './phase';
import { advance, initialState, accuracy, jadStyle } from './engine';
import { chapters, fieldLessons, fieldSource } from './curriculum';
import { lessons, lessonSource, type Prayer } from './course';

describe('strategies reflect their limits', () => {
  it.each([1, 2, 3, 4])(
    'one-tick alternating covers blob scan phase %i',
    (phase) => {
      const attacks = phaseTimeline('one', phase).filter((r) => r.attack);
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.every((r) => r.protected)).toBe(true);
    },
  );
  it('two-tick phase matters and shifting the hold repairs the later read', () => {
    expect(
      phaseTimeline('two', 1)
        .filter((r) => r.attack)
        .every((r) => r.protected),
    ).toBe(true);
    expect(
      phaseTimeline('two', 2)
        .filter((r) => r.attack)
        .every((r) => !r.protected),
    ).toBe(true);
    expect(
      phaseTimeline('shifted', 2)
        .filter((r) => r.attack)
        .every((r) => r.protected),
    ).toBe(true);
    for (const pattern of ['two', 'shifted'] as const)
      expect(
        phaseTimeline(pattern, 2)
          .filter((r) => r.tick % 4 === 1)
          .every((r) => r.prayer === 'magic'),
      ).toBe(true);
  });
  it('real attack checks reject using the original two-tick pattern on the shifted blob', () => {
    let state = initialState();
    for (let tick = 1; tick <= 36; tick++)
      state = advance(
        state,
        'two-tick-repair',
        (tick - 1) % 4 < 2 ? 'magic' : 'range',
        12,
      );
    const blobChecks = state.checks.filter((c) =>
      c.message.startsWith('Blob A'),
    );
    expect(blobChecks).toHaveLength(6);
    expect(blobChecks.every((c) => !c.correct)).toBe(true);
  });
  it('holding prayer protects but cannot pass one-tick conservation', () => {
    let held = initialState(),
      flicked = initialState();
    for (let tick = 1; tick <= 36; tick++) {
      held = advance(held, 'flick', 'magic', 12);
      flicked = advance(flicked, 'flick', 'magic', 12, null, {
        transitions: ['off', 'magic'],
      });
    }
    expect(
      held.checks.filter((c) => c.kind === 'prayer').every((c) => c.correct),
    ).toBe(true);
    expect(
      held.checks.filter((c) => c.kind === 'flick').every((c) => !c.correct),
    ).toBe(true);
    expect(accuracy(held.checks)).toBeLessThan(90);
    expect(accuracy(flicked.checks)).toBe(100);
  });
  it('spamming clicks and an incomplete pair fail conservation', () => {
    const first = advance(initialState(), 'flick', 'magic', 12);
    for (const transitions of [
      ['off'],
      ['off', 'magic', 'off', 'magic'],
      ['magic', 'off'],
    ] as Prayer[][]) {
      const state = advance(first, 'flick', 'magic', 12, null, { transitions });
      expect(state.checks.at(-1)?.correct).toBe(false);
    }
  });
  it('reverse flicking exposes the bat at 12-tick collisions without penalising the correct priority', () => {
    let state = initialState();
    const exposures: number[] = [];
    for (let tick = 1; tick <= 36; tick++) {
      state = advance(state, 'reverse', tick % 4 === 1 ? 'magic' : 'range', 12);
      if (state.exposure.includes('unprotected')) exposures.push(tick);
    }
    expect(exposures).toEqual([1, 13, 25]);
    expect(accuracy(state.checks)).toBe(100);
  });
  it('melee–blob mitigation leaves half the attacks exposed', () => {
    let state = initialState();
    let exposed = 0,
      protectedCount = 0;
    for (let tick = 1; tick <= 36; tick++) {
      state = advance(
        state,
        'melee-blob',
        (['melee', 'range', 'magic', 'range'] as Prayer[])[(tick - 1) % 4],
        12,
      );
      if (state.exposure.includes('unprotected')) exposed++;
      if (state.exposure.includes('protected this time')) protectedCount++;
    }
    expect([exposed, protectedCount]).toEqual([3, 3]);
    expect(accuracy(state.checks)).toBe(100);
  });
  it('Jad checks are delayed after cues and triples keep separate nine-tick cycles', () => {
    for (const id of ['jad', 'triples'] as const) {
      let state = initialState(23);
      for (let tick = 1; tick <= 36; tick++)
        state = advance(state, id, jadStyle(id, tick, 23), 12);
      expect(state.checks.map((c) => c.tick)).toEqual(
        id === 'jad'
          ? [3, 11, 19, 27, 35]
          : [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
      );
      expect(accuracy(state.checks)).toBe(100);
    }
    expect(
      new Set(
        Array.from({ length: 12 }, (_, i) =>
          jadStyle('triples', i * 3 + 1, 23),
        ),
      ).size,
    ).toBe(2);
  });
  it('every drill belongs to one chapter and every lesson has a usable source', () => {
    const ids = chapters.flatMap((c) => c.drills);
    expect([...ids].sort()).toEqual(lessons.map((l) => l.id).sort());
    expect(new Set(fieldLessons.map((l) => l.id)).size).toBe(
      fieldLessons.length,
    );
    for (const l of fieldLessons) {
      expect(l.options[l.answer]).toBeTruthy();
      expect(fieldSource(l).href).toMatch(
        /^https:\/\/www.youtube.com\/watch\?v=/,
      );
    }
    for (const l of lessons) expect(lessonSource(l).href).toMatch(/^https:/);
  });
});

it('a Jad cue has three full 600ms intervals before its prayer check', () => {
  let state = initialState(21);
  const first = jadStyle('jad', 3, 21);
  state = advance(state, 'jad', 'off', 12);
  state = advance(state, 'jad', 'off', 12);
  expect(state.checks).toHaveLength(0);
  state = advance(state, 'jad', first, 12);
  expect(state.checks).toHaveLength(1);
  expect(state.checks[0]).toMatchObject({ tick: 3, correct: true });
  // The next single-Jad cue is at elapsed tick 8 and checks at 11.
  for (let tick = 4; tick <= 10; tick++)
    state = advance(state, 'jad', 'off', 12);
  expect(state.checks).toHaveLength(1);
  state = advance(state, 'jad', jadStyle('jad', 11, 21), 12);
  expect(state.checks.at(-1)).toMatchObject({ tick: 11, correct: true });
});
