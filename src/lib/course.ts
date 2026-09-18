export type LessonId =
  | 'rhythm'
  | 'blob'
  | 'alternate'
  | 'stack'
  | 'movement'
  | 'food'
  | 'potions'
  | 'gauntlet'
  | 'flick'
  | 'two-tick'
  | 'two-tick-repair'
  | 'anchor-range'
  | 'double-blob'
  | 'stack-one'
  | 'bat'
  | 'reverse'
  | 'melee-blob'
  | 'jad'
  | 'triples'
  | 'blowpipe';
export type Prayer = 'magic' | 'range' | 'melee' | 'off';
export type Mode = 'guided' | 'challenge';
export interface Lesson {
  source?: { creator: string; video: string; seconds: number };
  optional?: boolean;
  id: LessonId;
  title: string;
  tag: string;
  description: string;
  icon: string;
  level: string;
  objective: string;
  steps: string[];
  takeaway: string;
}
export const lessons: Lesson[] = [
  {
    id: 'rhythm',
    title: 'Flick the mager',
    tag: 'LAZY FLICKING',
    description: 'See the attack. Learn the four-tick cycle.',
    icon: 'protect-magic',
    level: 'Foundation',
    objective:
      'Protect the magic attack, then toggle the same prayer off during the three quiet ticks.',
    steps: [
      'Watch the attack countdown. The mager attacks on tick 1, then 5, 9, and so on. Each tick lasts 0.6 seconds.',
      'Click Magic before the attack beat. When the mager pulses, the prayer check has happened: click Magic again to turn it off.',
      'Leave prayer off for the quiet ticks. After the third quiet beat, activate Magic before the next attack. The filling bar shows when each tick will register.',
    ],
    takeaway:
      'This is lazy flicking: protect the attack, then toggle off. The attack pulse marks the prayer check, not a projectile landing. It scores the exercise pattern, not prayer-point drain.',
  },
  {
    id: 'blob',
    title: 'Read the blob',
    tag: 'BLOB READS',
    description: 'Understand the scan. Make the right switch.',
    icon: 'blob',
    level: 'Foundation',
    objective:
      'Let the blob read one protection prayer, then switch before its attack three ticks later.',
    steps: [
      'Begin on Magic or Ranged. The blob reads your prayer on tick 1, then every six ticks.',
      'It chooses the opposite style. If it reads Magic, its attack will be Ranged on tick 4.',
      'Switch after the read and before the attack. Holding that prayer until the next read is fine.',
    ],
    takeaway:
      'A blob is predictable when you control what it reads. The drill keeps it at a distance, so melee is excluded.',
  },
  {
    id: 'alternate',
    title: 'One-tick alternating',
    tag: 'ONE-TICK ALTERNATING',
    description: 'Switch between Magic and Ranged every game tick.',
    icon: 'protect-range',
    level: 'Developing',
    objective: 'Alternate Magic and Ranged on every tick, starting with Magic.',
    steps: [
      'Prepare Magic for tick 1, Ranged for tick 2, then repeat.',
      'The three-tick gap between a blob’s read and attack means the opposite prayer is active at its attack check. The projectile lands later.',
      'Keep the rhythm steady. This drill scores every tick of the pattern, even when no attack occurs.',
    ],
    takeaway:
      'Alternating protection prayers is different from double-clicking one prayer to conserve prayer points.',
  },
  {
    id: 'stack',
    title: 'Flick a two-tick stack',
    tag: 'OFFSET ATTACKS',
    description: 'Keep a mager and ranger on separate beats.',
    icon: 'mager',
    level: 'Developing',
    objective: 'Protect Magic on ticks 1, 5, 9… and Ranged on ticks 3, 7, 11…',
    steps: [
      'These enemies are already offset by two ticks. Each attacks every four ticks.',
      'Begin with Magic. Switch to Ranged after the magic attack, then back after the ranged attack.',
      'Quiet ticks give you room to act. Only the attack ticks count towards your score.',
    ],
    takeaway:
      'This setup is deliberately offset. Two enemies attacking on the same tick need a positioning solve in the LoS tool.',
  },
  {
    id: 'movement',
    title: 'Flick and move',
    tag: 'MOVEMENT',
    description: 'Keep your prayer while finding the next tile.',
    icon: 'player',
    level: 'Advanced',
    objective:
      'Protect against alternating attacks and reach the marked tile every four ticks.',
    steps: [
      'Magic attacks on tick 1; Ranged on tick 3. The pattern repeats every four ticks.',
      'Click the marked tile before tick 4, then follow the next target before tick 8.',
      'Use your mouse for both actions: click the prayer, then click the tile. Keep the same beat as you move.',
    ],
    takeaway:
      'Marked tiles are a coordination exercise, not an Inferno floor attack. Click movement is simplified; there is no pathfinding.',
  },
  {
    id: 'food',
    title: 'Eat between flicks',
    tag: 'FOOD',
    description: 'Protect, eat, and get back to your prayers.',
    icon: 'shark',
    level: 'Developing',
    objective:
      'Flick a four-tick mager and eat one shark in each gap between attacks.',
    steps: [
      'Protect Magic for ticks 1, 5, 9… Click the active prayer again to switch it off after the attack.',
      'Open Inventory, click a shark during the quiet ticks, then return to Prayers before the next attack.',
      'Tab keybinds only switch panels. You still click every prayer and item. Each shark has a three-tick eating cooldown.',
    ],
    takeaway:
      'This is supply-click practice with a metronome. Food can delay your own attacks in OSRS; player attack timing and HP are not simulated here.',
  },
  {
    id: 'potions',
    title: 'Brew and restore between flicks',
    tag: 'POTIONS',
    description: 'Fit a brew-and-restore sequence around flicks.',
    icon: 'brew',
    level: 'Advanced',
    objective:
      'Flick the mager while practising two sequences of three brew doses and one restore.',
    steps: [
      'Keep Magic on for ticks 1, 5, 9… and off on quiet ticks. Use a quiet tick to open Inventory and drink.',
      'Take one dose per four-tick gap: brew, brew, brew, restore. Repeat, then finish the last attack cycle.',
      'A dose registers on the next beat. Potions share a three-tick drink cooldown. Return to Prayers before each attack.',
    ],
    takeaway:
      'The fixed 3:1 sequence trains dose tracking. Actual brew/restore needs depend on your stats and situation; this drill does not calculate stats or HP.',
  },
  {
    id: 'gauntlet',
    title: 'Blob, mager and movement',
    tag: 'COMBINED PRACTICE',
    description: 'Alternate around a mager while moving every four ticks.',
    icon: 'ranger',
    level: 'Advanced',
    objective:
      'Combine blob reads, four-tick magic attacks, and a movement target every four ticks.',
    steps: [
      'Start on Magic and alternate every tick. The mager attacks on odd ticks 1, 5, 9…',
      'The blob reads on tick 1 and attacks three ticks later. Staying in rhythm covers both enemies.',
      'Reach each marked tile before the fourth tick without losing your prayer rhythm.',
    ],
    takeaway:
      'Take this rhythm into wave simulations next. This is a focused drill, not a full combat or Zuk simulator.',
  },
];
lessons.push({
  id: 'bat',
  title: 'Flick the bat',
  icon: 'protect-range',
  level: 'Foundation',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'Protect Ranged every three ticks, then toggle off.',
  objective: 'Protect Ranged every three ticks, then toggle off.',
  steps: [
    'Protect ticks 1, 4, 7… A bat is faster than a mager or ranger.',
    'Turn Ranged off for the two quiet ticks. Turn it back on before the next attack.',
    'The bat’s three-tick cycle does not fit a four-tick mager pattern. Isolate it or remove it when other threats are active.',
  ],
  takeaway:
    'This scores a three-tick lazy-flick pattern. It does not simulate run-energy or stat drain.',
  source: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 718 },
});
lessons.push({
  id: 'anchor-range',
  title: 'Anchor on the ranger',
  icon: 'ranger',
  level: 'Developing',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'Start Ranged, then alternate every tick while a blob attacks.',
  objective: 'Start Ranged, then alternate every tick while a blob attacks.',
  steps: [
    'The ranger attacks on ticks 1, 5, 9… Begin with Ranged, not Magic.',
    'Use the ranger’s attack as your anchor. Switch to Magic after its attack, then alternate every tick.',
    'The blob scans and attacks on its own six-tick cycle. Protecting the ranger while alternating covers both.',
  ],
  takeaway:
    'The fixed-style enemy sets your starting prayer. The blob does not need to share its attack tick.',
  source: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 2815 },
});
lessons.push({
  id: 'double-blob',
  title: 'Alternate with two blobs',
  icon: 'blob',
  level: 'Developing',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'Cover a mager and two blobs with different scan timings.',
  objective: 'Cover a mager and two blobs with different scan timings.',
  steps: [
    'Begin Magic for the mager on tick 1, then alternate Magic and Ranged every tick.',
    'Blob A reads on 1, 7, 13… Blob B reads on 2, 8, 14… Each attacks three ticks after reading.',
    'Stay with the mager’s four-tick cycle even when the blobs attack on different beats.',
  ],
  takeaway:
    'Every enemy’s prayer check is scored separately. One-tick alternating covers either blob phase at range.',
  source: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 2368 },
});
lessons.push({
  id: 'stack-one',
  title: 'A one-tick pillar stack',
  icon: 'mager',
  level: 'Developing',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'Cover the back mager, then the front ranger one tick later.',
  objective: 'Cover the back mager, then the front ranger one tick later.',
  steps: [
    'This stack is already set up: Magic on 1, 5, 9… Ranged on 2, 6, 10…',
    'Switch immediately after the mager’s attack. The two remaining beats give room to prepare.',
    'Use the LoS tool to practise creating the offset from the middle tile. A blob at the front can change the required route.',
  ],
  takeaway:
    'One tick apart is not two ticks apart. This drill starts after the positioning solve; it does not create the stack.',
  source: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 4388 },
});
lessons.push({
  id: 'flick',
  title: 'One-tick prayer flick',
  icon: 'protect-magic',
  level: 'Advanced',
  optional: true,
  tag: 'OPTIONAL TECHNIQUE',
  description:
    'Keep Magic active at every tick boundary, with an off–on pair between beats.',
  objective:
    'Keep Magic active at every tick boundary, with an off–on pair between beats.',
  steps: [
    'Activate Magic for the first beat. After each beat, click Magic twice: off, then on again before the next beat.',
    'Repeat one off–on pair per 0.6-second interval. A held prayer protects you, but does not pass the conservation check.',
    'In OSRS you can use a configured quick-prayer orb to include offensive prayers. Leaving another prayer continuously active defeats the zero-drain technique.',
  ],
  takeaway:
    'This checks click order and boundary protection, not exact OSRS drain or network timing. Conservation flicking is optional for a first cape.',
  source: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 958 },
});
lessons.push({
  id: 'two-tick',
  title: 'Two-tick alternating',
  icon: 'protect-range',
  level: 'Advanced',
  optional: true,
  tag: 'OPTIONAL TECHNIQUE',
  description:
    'Hold Magic for two ticks, Ranged for two, and repeat in an aligned setup.',
  objective:
    'Hold Magic for two ticks, Ranged for two, and repeat in an aligned setup.',
  steps: [
    'Prepare Magic on ticks 1–2, Ranged on 3–4, then repeat. The mager attacks on 1, 5, 9…',
    'The blob first reads on tick 1. Its later reads remain in a phase that this two-tick pattern covers.',
    'Use the extra interval for another click. Starting this pattern before a blob sees you can put it in the wrong phase.',
  ],
  takeaway:
    'This is an aligned example, not a universal blob solution. Next, try the shifted-scan exercise and the phase lab.',
  source: { creator: 'Hug my cat', video: 'zTQdupqm-lM', seconds: 86 },
});
lessons.push({
  id: 'two-tick-repair',
  title: 'Repair the two-tick phase',
  icon: 'blob',
  level: 'Advanced',
  optional: true,
  tag: 'OPTIONAL TECHNIQUE',
  description:
    'Protect the same mager with a blob that now reads one tick later.',
  objective:
    'Protect the same mager with a blob that now reads one tick later.',
  steps: [
    'The blob reads on 2, 8, 14… The previous Magic, Magic, Ranged, Ranged cycle fails here.',
    'Use Magic on 1, Ranged on 2–3, Magic on 4–5, Ranged on 6–7… Hold each prayer for two beats across the cycle boundary.',
    'You changed which side of the mager’s attack your Magic hold occupies. Keep Magic on every mager attack while changing the blob read.',
  ],
  takeaway:
    'In a live wave, protect the anchor and re-establish the phase, or return to one-tick alternating. Recovery can cost a blob hit; do not drop the dangerous anchor prayer.',
  source: { creator: 'Hug my cat', video: 'zTQdupqm-lM', seconds: 334 },
});
lessons.push({
  id: 'reverse',
  title: 'Reverse flick the bat',
  icon: 'bat',
  level: 'Advanced',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'Protect every mager attack; cover the bat during the gaps.',
  objective: 'Protect every mager attack; cover the bat during the gaps.',
  steps: [
    'Magic is needed on 1, 5, 9… Hold Ranged on all other ticks instead of switching off.',
    'The bat attacks on 1, 4, 7, 10… Its three-tick cycle sometimes collides with the mager.',
    'This is damage reduction while you isolate or kill the bat. When both attack together, prioritise Magic in this exercise.',
  ],
  takeaway:
    'The score measures the priority pattern. Collision messages explicitly show the unprotected bat; 100% here does not mean zero damage.',
  source: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 3654 },
});
lessons.push({
  id: 'melee-blob',
  title: 'Melee and blob triage',
  icon: 'melee',
  level: 'Advanced',
  optional: true,
  tag: 'OPTIONAL TECHNIQUE',
  description:
    'Protect the melee, then use Ranged, Magic, Ranged between its attacks.',
  objective:
    'Protect the melee, then use Ranged, Magic, Ranged between its attacks.',
  steps: [
    'Prepare Melee on 1, 5, 9… Then Ranged, Magic, Ranged on the following three ticks.',
    'The blob may choose either ranged style when it reads Melee. This model uses a repeatable mix so you can review the conflicts.',
    'Keep the melee protected while working towards separation. Some blob attacks remain unprotected.',
  ],
  takeaway:
    'This is a mitigation pattern, not a complete solve. Your score is adherence to the priority pattern, not all enemy attacks blocked.',
  source: { creator: 'OSRS Wiki', video: '', seconds: 0 },
});
lessons.push({
  id: 'jad',
  title: 'Read Jad, then pray',
  icon: 'jad',
  level: 'Developing',
  optional: false,
  tag: 'TIMING DRILL',
  description: 'React to the attack cue before the prayer check.',
  objective: 'React to the attack cue before the prayer check.',
  steps: [
    'Single Jad has an eight-tick attack cycle. Raised front legs signal Magic; a stomp signals Ranged.',
    'The first cue appears when the count-in ends; the prayer check follows three ticks later. Switch as soon as you recognise it; do not wait for a hitsplat.',
    'Keep the correct prayer active through the check. Repeated attacks can use the same style: do not toggle that prayer off.',
  ],
  takeaway:
    'Watch the Jad animation and its labelled cue, then protect the check three ticks later. Use the linked combat simulator to add healer management and positioning.',
  source: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 4904 },
});
lessons.push({
  id: 'triples',
  title: 'Triple Jad prayer cues',
  icon: 'jad',
  level: 'Advanced',
  optional: false,
  tag: 'TIMING DRILL',
  description:
    'Read a new Jad cue every three ticks without assuming alternating styles.',
  objective:
    'Read a new Jad cue every three ticks without assuming alternating styles.',
  steps: [
    'Three nine-tick cycles are staggered by three ticks. The next cue can match the last style.',
    'React to the current Jad, then return attention to the next cue. Protect first; fit just one extra action between checks in the real fight.',
    'When one Jad dies, the gaps change. Stay attentive through two Jads and one; the encounter is not finished yet.',
  ],
  takeaway:
    'This drill keeps three Jads alive for a 36-tick reaction block. Healer tagging and changing encounter phases belong in the full combat simulator.',
  source: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 5213 },
});
lessons.push({
  id: 'blowpipe',
  title: 'Blowpipe attack and movement',
  icon: 'player',
  level: 'Advanced',
  optional: false,
  tag: 'TIMING DRILL',
  description:
    'Click Attack on odd ticks and reach the marked tile on even ticks.',
  objective:
    'Click Attack on odd ticks and reach the marked tile on even ticks.',
  steps: [
    'A rapid blowpipe attacks every two ticks. Queue a shot, then spend the intervening tick moving.',
    'The tile changes every two ticks. Click it before the even beat, then return to Attack for the next shot.',
    'Keep a steady shoot–move rhythm. At Zuk, shield position always takes priority over an extra shot.',
  ],
  takeaway:
    'This scores attack-and-movement coordination on a small grid. It does not simulate a shield, weapon range, damage or healers. Use the Zuk simulator next.',
  source: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 8913 },
});
export const TOTAL_TICKS = 36;
export const PASS_SCORE = 90;
export const sourceLinks = {
  wiki: 'https://oldschool.runescape.wiki/w/Inferno/Strategies',
  gnomonkey: 'https://www.youtube.com/watch?v=2xviK0wGI-o',
  los: 'https://los.inferno.tips/',
  lola: 'https://www.youtube.com/watch?v=r3s4rbTd4QU',
  twoTick: 'https://www.youtube.com/watch?v=zTQdupqm-lM',
  combat: 'https://inferno.colosim.com/',
};

export function lessonSource(lesson: Lesson) {
  const source =
    lesson.source ||
    (
      {
        rhythm: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 4116 },
        blob: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 466 },
        alternate: {
          creator: 'dearlola1',
          video: 'r3s4rbTd4QU',
          seconds: 1351,
        },
        stack: { creator: 'Hug my cat', video: 'zTQdupqm-lM', seconds: 385 },
        movement: { creator: 'Hug my cat', video: 'zTQdupqm-lM', seconds: 174 },
        food: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 5161 },
        potions: { creator: 'Gnomonkey', video: '2xviK0wGI-o', seconds: 6361 },
        gauntlet: { creator: 'dearlola1', video: 'r3s4rbTd4QU', seconds: 3770 },
      } as Partial<Record<LessonId, Lesson['source']>>
    )[lesson.id];
  return source?.video
    ? {
        label: `${source.creator} · ${Math.floor(source.seconds / 60)}:${String(source.seconds % 60).padStart(2, '0')}`,
        href: `https://www.youtube.com/watch?v=${source.video}&t=${source.seconds}s`,
      }
    : { label: 'OSRS Wiki · prayer strategies', href: sourceLinks.wiki };
}
