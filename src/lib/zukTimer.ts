export const SET_MS = 210_000;
export const JAD_EXTENSION_MS = 105_000;
export const ZUK_TIMER_KEY = 'inferno-tips-zuk-timer-v1';
export type ZukPhase =
  'idle' | 'pre-jad' | 'paused' | 'jad' | 'pre-healers' | 'healers' | 'done';
export interface ZukTimerState {
  phase: ZukPhase;
  deadline: number | null;
  remaining: number;
  setPending: boolean;
}
export type ZukAction = 'next' | 'sync' | 'controlled' | 'earlier' | 'later';
export const initialZukTimer = (): ZukTimerState => ({
  phase: 'idle',
  deadline: null,
  remaining: SET_MS,
  setPending: false,
});

// Advance from the deadline, not the number of animation/interval callbacks.
// A predicted spawn stays unconfirmed until the player controls the set.
export function advanceZukTimer(
  state: ZukTimerState,
  now: number,
): ZukTimerState {
  if (state.deadline === null || now < state.deadline) return state;
  const periods = Math.floor((now - state.deadline) / SET_MS) + 1;
  return {
    ...state,
    deadline: state.deadline + periods * SET_MS,
    setPending: true,
  };
}
export function remainingZukMs(state: ZukTimerState, now: number) {
  return Math.max(
    0,
    state.deadline === null ? state.remaining : state.deadline - now,
  );
}
export function changeZukTimer(
  raw: ZukTimerState,
  action: ZukAction,
  now: number,
): ZukTimerState {
  const state = advanceZukTimer(raw, now);
  if (action === 'next') {
    switch (state.phase) {
      case 'idle':
        return {
          phase: 'pre-jad',
          deadline: now + SET_MS,
          remaining: SET_MS,
          setPending: true,
        };
      case 'pre-jad':
        return {
          ...state,
          phase: 'paused',
          remaining: remainingZukMs(state, now),
          deadline: null,
        };
      case 'paused':
        return {
          ...state,
          phase: 'jad',
          deadline: now + state.remaining + JAD_EXTENSION_MS,
        };
      case 'jad':
        return { ...state, phase: 'pre-healers' };
      case 'pre-healers':
        return { ...state, phase: 'healers' };
      case 'healers':
        return {
          ...state,
          phase: 'done',
          remaining: remainingZukMs(state, now),
          deadline: null,
        };
      default:
        return state;
    }
  }
  if (state.phase === 'idle' || state.phase === 'done') return state;
  if (action === 'controlled') return { ...state, setPending: false };
  // Set spawns cannot occur during the 600–480 HP pause.
  if (action === 'sync')
    return state.deadline === null
      ? state
      : { ...state, deadline: now + SET_MS, setPending: true };
  const delta = action === 'earlier' ? -5_000 : 5_000;
  // Corrections do not accidentally roll the clock over into another set.
  const remaining = Math.max(
    1_000,
    Math.min(SET_MS + JAD_EXTENSION_MS, remainingZukMs(state, now) + delta),
  );
  return {
    ...state,
    remaining,
    deadline: state.deadline === null ? null : now + remaining,
  };
}
export const phaseNames: Record<ZukPhase, string> = {
  idle: 'Waiting for the first set',
  'pre-jad': 'Before Jad',
  paused: '600–480 HP · timer paused',
  jad: 'Jad is alive',
  'pre-healers': 'Before healers',
  healers: 'Healers & enrage',
  done: 'Zuk defeated',
};
export const nextActions: Record<ZukPhase, string> = {
  idle: 'First set spawned',
  'pre-jad': 'Below 600 HP',
  paused: 'Jad spawned',
  jad: 'Jad defeated',
  'pre-healers': 'Healers spawned',
  healers: 'Zuk defeated',
  done: 'Run finished',
};
export function healerAdvice(
  state: ZukTimerState,
  now: number,
  windowSeconds: number,
) {
  if (state.phase !== 'pre-healers') return null;
  if (state.setPending)
    return {
      caution: true,
      title: 'Don’t spawn healers yet — control the set.',
      text: 'Hold above 240 HP. Deal with the ranger and control the mager while staying behind the shield. Mark the set under control when you are ready to reassess.',
    };
  if (remainingZukMs(state, now) <= windowSeconds * 1000)
    return {
      caution: true,
      title: 'Next set is close — hold above 240 HP.',
      text: 'For a learner run, wait for the set and get it under control before starting healers. Avoid taking on both at once.',
    };
  return {
    caution: false,
    title: 'Check your setup before healers.',
    text: 'Check the set timer, health, prayer, boosts and shield position before crossing 240 HP. Time needed depends on your gear and execution; this countdown cannot tell you a send is safe.',
  };
}
export function formatZukTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function restoreZukTimer(
  raw: string | null,
  now: number,
): ZukTimerState | null {
  try {
    const saved = JSON.parse(raw || 'null');
    if (
      !saved ||
      saved.version !== 1 ||
      !Number.isFinite(saved.savedAt) ||
      Math.abs(now - saved.savedAt) > 86_400_000
    )
      return null;
    const s = saved.state;
    if (
      !s ||
      !Object.hasOwn(phaseNames, s.phase) ||
      typeof s.setPending !== 'boolean' ||
      !Number.isFinite(s.remaining) ||
      s.remaining < 0 ||
      s.remaining > SET_MS + JAD_EXTENSION_MS
    )
      return null;
    const active = ['pre-jad', 'jad', 'pre-healers', 'healers'].includes(
      s.phase,
    );
    if (
      active
        ? !Number.isFinite(s.deadline) ||
          Math.abs(now - s.deadline) > 86_400_000
        : s.deadline !== null
    )
      return null;
    return advanceZukTimer(
      {
        phase: s.phase,
        deadline: s.deadline,
        remaining: s.remaining,
        setPending: s.setPending,
      },
      now,
    );
  } catch {
    return null;
  }
}
