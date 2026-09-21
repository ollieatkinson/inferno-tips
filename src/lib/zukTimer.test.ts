import { describe, expect, it } from 'vitest';
import {
  advanceZukTimer,
  changeZukTimer,
  formatZukTime,
  healerAdvice,
  initialZukTimer,
  JAD_EXTENSION_MS,
  SET_MS,
  restoreZukTimer,
} from './zukTimer';

describe('Zuk set clock', () => {
  it('starts at the first set, preserves time while paused, and adds the Jad extension once', () => {
    let s = changeZukTimer(initialZukTimer(), 'next', 1000);
    expect(s.deadline).toBe(211000);
    s = changeZukTimer(s, 'next', 11000);
    expect(s).toMatchObject({
      phase: 'paused',
      deadline: null,
      remaining: 200000,
    });
    expect(advanceZukTimer(s, 120000)).toBe(s);
    s = changeZukTimer(s, 'next', 120000);
    expect(s.deadline).toBe(120000 + 200000 + JAD_EXTENSION_MS);
    const deadline = s.deadline;
    s = changeZukTimer(s, 'next', 130000);
    expect(s.phase).toBe('pre-healers');
    expect(s.deadline).toBe(deadline);
    s = changeZukTimer(s, 'next', 140000);
    expect(s.phase).toBe('healers');
    expect(s.deadline).toBe(deadline);
  });
  it('catches up multiple background cycles without drift and keeps the set pending', () => {
    const start = changeZukTimer(initialZukTimer(), 'next', 1000);
    const controlled = changeZukTimer(start, 'controlled', 2000);
    const s = advanceZukTimer(controlled, 1000 + 3 * SET_MS + 12000);
    expect(s.deadline).toBe(1000 + 4 * SET_MS);
    expect(s.setPending).toBe(true);
    expect(advanceZukTimer(s, 1000 + 3 * SET_MS + 12001)).toBe(s);
  });
  it('rolls at the exact deadline and resynchronises from the observed spawn', () => {
    let s = changeZukTimer(initialZukTimer(), 'next', 1000);
    s = advanceZukTimer(s, 211000);
    expect(s.deadline).toBe(421000);
    s = changeZukTimer(s, 'sync', 215000);
    expect(s.deadline).toBe(425000);
    s = changeZukTimer(s, 'next', 216000);
    expect(changeZukTimer(s, 'sync', 220000)).toEqual(s);
  });
  it('warns only before healers, with an adjustable window and no automatic safe signal', () => {
    const s = {
      ...initialZukTimer(),
      phase: 'pre-healers' as const,
      deadline: 120000,
      setPending: false,
    };
    expect(healerAdvice(s, 0, 90)?.caution).toBe(false);
    expect(healerAdvice(s, 30000, 90)?.title).toContain('hold above 240');
    expect(healerAdvice(s, 30000, 60)?.caution).toBe(false);
    expect(healerAdvice({ ...s, phase: 'jad' }, 30000, 90)).toBeNull();
    expect(healerAdvice({ ...s, phase: 'healers' }, 30000, 90)).toBeNull();
    const spawned = advanceZukTimer(s, 120000);
    expect(healerAdvice(spawned, 120000, 90)?.title).toContain(
      'control the set',
    );
    const controlled = changeZukTimer(spawned, 'controlled', 122000);
    expect(healerAdvice(controlled, 122000, 90)?.text).toContain(
      'cannot tell you a send is safe',
    );
  });
  it('adjusts paused and running clocks without creating a fake spawn', () => {
    let s = changeZukTimer(initialZukTimer(), 'next', 1000);
    s = changeZukTimer(s, 'earlier', 210000);
    expect(s.deadline).toBe(211000);
    s = changeZukTimer(s, 'later', 210000);
    expect(s.deadline).toBe(216000);
    s = changeZukTimer(s, 'next', 210000);
    expect(changeZukTimer(s, 'later', 220000).remaining).toBe(11000);
  });
  it('restores deadlines after reload and rejects malformed or stale state', () => {
    const state = changeZukTimer(initialZukTimer(), 'next', 1000);
    const saved = JSON.stringify({ version: 1, savedAt: 1000, state });
    expect(restoreZukTimer(saved, 100000)?.deadline).toBe(211000);
    expect(restoreZukTimer(saved, 500000)?.deadline).toBe(631000);
    expect(restoreZukTimer(saved, 90000000)).toBeNull();
    for (const raw of [
      '{bad',
      'null',
      '[]',
      JSON.stringify({
        version: 1,
        savedAt: 0,
        state: { ...state, deadline: null },
      }),
    ])
      expect(restoreZukTimer(raw, 2000)).toBeNull();
  });
  it('can undo a phase transition using its prior deadline without losing elapsed time', () => {
    const before = changeZukTimer(initialZukTimer(), 'next', 1000);
    const paused = changeZukTimer(before, 'next', 5000);
    expect(paused.phase).toBe('paused');
    const undone = advanceZukTimer(before, 220000);
    expect(undone.phase).toBe('pre-jad');
    expect(undone.deadline).toBe(421000);
  });
  it('formats countdowns without rounding a partial second down', () => {
    expect(formatZukTime(210000)).toBe('3:30');
    expect(formatZukTime(104999)).toBe('1:45');
    expect(formatZukTime(1)).toBe('0:01');
    expect(formatZukTime(0)).toBe('0:00');
  });
});
