import { mechanicGoals, passScore, type LessonId } from './course';
import { alternatingOutOfPhase, scoredChecks, type Check } from './engine';

type IssueKind =
  | 'quiet'
  | 'off'
  | 'wrong'
  | 'read'
  | 'supply'
  | 'flick'
  | 'movement'
  | 'attack';
export interface RunIssue {
  kind: IssueKind;
  title: string;
  ticks: number[];
  example: string;
  advice: string;
}
export interface RunFeedback {
  summary: string;
  issues: RunIssue[];
}

const prayerAdvice = (id: LessonId): string => {
  switch (id) {
    case 'blob':
      return 'Give the blob Magic or Ranged at its read, then switch to the opposite prayer before its attack three ticks later.';
    case 'alternate':
    case 'double-blob':
      return 'Hold Magic through tick 1, then switch to Ranged for tick 2. Switch once after each beat; use the guided prayer table to check the starting phase.';
    case 'anchor-range':
      return 'Start on Ranged for tick 1, then Magic for tick 2. Keep switching once per beat.';
    case 'two-tick':
      return 'Hold Magic for ticks 1–2 and Ranged for ticks 3–4. Repeat those pairs; use the guided table to check where each pair begins.';
    case 'two-tick-repair':
      return 'Use the shifted pattern: Magic on tick 1, Ranged on ticks 2–3, Magic on ticks 4–5. Follow the guided table to practise the offset.';
    case 'stack':
    case 'movement':
      return 'Protect Magic on beat 1 and Ranged on beat 3. Queue the next prayer after each attack, before doing anything else.';
    case 'stack-one':
      return 'Protect Magic on beat 1, then Ranged on beat 2. Switch immediately after the mager attack; the ranger follows one tick later.';
    case 'gauntlet':
      return 'Start on Magic and alternate every tick. Set the next prayer before clicking the marked tile.';
    case 'reverse':
      return 'Use Magic on beat 1, then return to Ranged for beats 2–4. Keep that priority even when the bat and mager attack together.';
    case 'melee-blob':
      return 'Repeat Melee → Ranged → Magic → Ranged. Follow the guided table; this priority pattern does not block every blob attack.';
    case 'jad':
    case 'triples':
      return 'Read each Jad’s animation, select its protection prayer before the attack check, and keep it through the check. Use guided practice to match the cues to the styles.';
    case 'flick':
      return 'Finish each off–on pair with Magic active before the next beat. Start the pair just after the previous beat.';
    case 'bat':
      return 'Protect Ranged on beat 1 of each three-tick cycle. Turn it off after the attack, then reactivate it before the next attack beat.';
    default:
      return 'Have Magic active before beat 1 of each four-tick cycle. After using the quiet gap, return to Prayers in time for the next attack.';
  }
};
const name = (value: string) =>
  ({
    magic: 'Magic',
    range: 'Ranged',
    melee: 'Melee',
    off: 'off',
    none: 'no item',
    shark: 'a shark',
    brew: 'a brew dose',
    restore: 'a restore dose',
  })[value] ?? value;

export function runFeedback(checks: Check[], id: LessonId): RunFeedback {
  const scored = scoredChecks(checks);
  const correct = scored.filter((c) => c.correct).length;
  const goal = mechanicGoals[id];
  const unit =
    id === 'blowpipe' ? 'scored attempts' : goal ? 'rounds' : 'checks';
  const summary = scored.length
    ? `${correct} / ${scored.length} ${unit} complete. ${goal && id !== 'blowpipe' ? `Practice target: ${goal.pass} / ${goal.total}.` : `Practice target: ${passScore(id)}%.`}`
    : 'No scored checks completed yet.';
  const groups = new Map<IssueKind, Check[]>();
  for (const check of checks) {
    // Aggregate round failures repeat the underlying mistakes. Diagnose only
    // the raw checks, including unscored requirements of a scored round.
    if (check.correct || check.kind === 'round') continue;
    const kind: IssueKind =
      check.kind === 'prayer'
        ? check.expected === 'off'
          ? 'quiet'
          : check.actual === 'off'
            ? 'off'
            : 'wrong'
        : check.kind;
    const group = groups.get(kind) ?? [];
    group.push(check);
    groups.set(kind, group);
  }
  const outOfPhase = id === 'alternate' && alternatingOutOfPhase(checks);
  const issues = [...groups].map(([kind, group]): RunIssue => {
    const first = group[0];
    const titles: Record<IssueKind, string> = {
      quiet: 'Prayer left on during quiet ticks',
      off: 'Prayer off at the check',
      wrong: outOfPhase
        ? 'Alternating one tick out of phase'
        : 'Wrong prayer at the check',
      read: 'Blob read not controlled',
      supply: 'Required supply missed in the gap',
      flick: 'Off–on pair not completed correctly',
      movement:
        id === 'blowpipe'
          ? 'Cooldown movement missed'
          : 'Marked tile not reached during its round',
      attack: 'Ready attack ticks lost',
    };
    const advice: Record<IssueKind, string> = {
      quiet:
        'Turn the active prayer off just after the attack check. Keep prayer off through the quiet ticks, then reactivate the required protection before the next attack. Holding protection alone does not complete this drill’s round.',
      off: prayerAdvice(id),
      wrong: outOfPhase
        ? 'Your switches were regular, but mostly on the opposite beat. Hold Magic through the first mager attack (tick 1), then switch to Ranged. After that, click the prayer whose circle just cleared.'
        : prayerAdvice(id),
      read: 'Have Magic or Ranged active when the blob reads. Off or Melee will not control this drill’s ranged/magic attack; switch to the opposite protection after the read.',
      supply: `After protecting the attack, turn prayer off, open Inventory and ${id === 'food' ? 'eat one shark' : 'drink the required dose in the brew–brew–brew–restore sequence'}. Use the quiet gap, then return to Prayers before the next attack.`,
      flick:
        'Click Magic off, then on once between each pair of beats, finishing on Magic. Holding it on, missing a click or adding extra toggles does not complete the pair.',
      movement:
        id === 'blowpipe'
          ? 'After each shot, click two tiles towards the flag during the cooldown. Then click the target to stop moving and fire again.'
          : 'Set your prayer first, then move onto the marked tile by beat 4. You must move during that round; waiting on a future target does not count.',
      attack:
        'Click the target when the blowpipe is ready. After the shot, use the one-tick cooldown to run two tiles, then click the target again so running does not delay the next shot.',
    };
    const example =
      first.kind === 'prayer'
        ? `Needed ${name(first.expected)}; ${first.actual === 'off' ? 'prayer was off' : `${name(first.actual)} was active`}.`
        : first.kind === 'read'
          ? `Needed Magic or Ranged at the read; ${name(first.actual)} was active.`
          : first.kind === 'supply'
            ? `Needed ${name(first.expected)}; ${name(first.actual)} registered in the gap.`
            : first.message;
    return {
      kind,
      title: titles[kind],
      ticks: [...new Set(group.map((c) => c.tick))],
      example: `Tick ${first.tick}: ${example}`,
      advice: advice[kind],
    };
  });
  // Start with the most frequent problem. Counts are affected ticks, never
  // points lost: multiple requirements can fail within the same scored round.
  issues.sort((a, b) => b.ticks.length - a.ticks.length);
  return { summary, issues };
}
