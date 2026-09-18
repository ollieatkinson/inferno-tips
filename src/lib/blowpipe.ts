export type BlowpipeCommand =
  { type: 'attack' } | { type: 'move'; tile: number };
export interface BlowpipeState {
  tile: number;
  destination: number | null;
  attacking: boolean;
  goal: number;
  nextShotTick: number;
  shots: number;
  shotTick: number;
  shotFrom: number;
  lostTicks: number;
  legs: number;
}
export const initialBlowpipe = (): BlowpipeState => ({
  tile: 0,
  destination: null,
  attacking: false,
  goal: 6,
  nextShotTick: 1,
  shots: 0,
  shotTick: 0,
  shotFrom: 0,
  lostTicks: 0,
  legs: 0,
});
export const nextBlowpipeTile = (state: BlowpipeState) =>
  state.tile +
  Math.sign(state.goal - state.tile) *
    Math.min(2, Math.abs(state.goal - state.tile));

// A straight, unobstructed practice lane entirely within rapid blowpipe range.
// Inputs are orders: movement persists and cancels attacking; clicking the
// target stops movement and resumes automatic attacks when the weapon is ready.
export function advanceBlowpipe(
  previous: BlowpipeState,
  tick: number,
  command?: BlowpipeCommand | null,
) {
  const state = { ...previous };
  if (command?.type === 'attack') {
    state.attacking = true;
    state.destination = null;
  } else if (
    command?.type === 'move' &&
    Number.isInteger(command.tile) &&
    command.tile >= 0 &&
    command.tile <= 6
  ) {
    state.attacking = false;
    state.destination = command.tile;
  }
  const ready = tick >= state.nextShotTick;
  if (state.destination !== null) {
    state.tile +=
      Math.sign(state.destination - state.tile) *
      Math.min(2, Math.abs(state.destination - state.tile));
    if (state.tile === state.destination) state.destination = null;
  }
  const moved = state.tile !== previous.tile;
  const correctStep = state.tile === nextBlowpipeTile(previous) && moved;
  if (state.tile === previous.goal) {
    state.legs++;
    state.goal = previous.goal === 6 ? 0 : 6;
  }
  if (ready && state.attacking) {
    state.shots++;
    state.shotTick = tick;
    state.shotFrom = state.tile;
    state.nextShotTick = tick + 2;
    return {
      state,
      check: {
        kind: 'attack' as const,
        correct: true,
        expected: 'fire when ready',
        actual: 'shot fired',
        message:
          'Shot fired. Use the cooldown to run two tiles along the route.',
      },
    };
  }
  if (ready) {
    state.lostTicks++;
    return {
      state,
      check: {
        kind: 'attack' as const,
        correct: false,
        expected: 'fire when ready',
        actual: moved ? 'still moving' : 'not attacking',
        message: moved
          ? 'Lost an attack tick: you kept running while the blowpipe was ready. Click the target to stop and fire.'
          : 'Lost an attack tick: the blowpipe was ready. Click the target to resume attacking.',
      },
    };
  }
  return {
    state,
    check: {
      kind: 'movement' as const,
      correct: correctStep,
      expected: `run to tile ${nextBlowpipeTile(previous) + 1}`,
      actual: `tile ${state.tile + 1}`,
      message: correctStep
        ? 'Two tiles covered during cooldown. Click the target for the next shot.'
        : moved
          ? 'Use the cooldown for a two-tile run towards the end of the route.'
          : 'You fired, but stayed still during the cooldown. Click the ground after the shot.',
    },
  };
}
