import type { LessonId } from './course';
export type ChapterId =
  | 'foundation'
  | 'blobs'
  | 'position'
  | 'supplies'
  | 'late'
  | 'jads'
  | 'zuk'
  | 'advanced';
export interface FieldLesson {
  id: string;
  chapter: ChapterId;
  title: string;
  summary: string;
  paragraphs: string[];
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: 'gnome' | 'lola' | 'two';
  seconds: number;
  los?: string;
}
export const chapters: {
  id: ChapterId;
  title: string;
  description: string;
  drills: LessonId[];
}[] = [
  {
    id: 'foundation',
    title: 'Read the attack, protect the beat',
    description:
      'Start with a four-tick mager. Learn what the cue means before adding another enemy.',
    drills: ['rhythm', 'bat'],
  },
  {
    id: 'blobs',
    title: 'Blobs and your prayer anchor',
    description:
      'Understand the read, then use a fixed-style enemy to keep your alternating prayers in phase.',
    drills: ['blob', 'alternate', 'anchor-range', 'double-blob'],
  },
  {
    id: 'position',
    title: 'Make the wave simpler',
    description:
      'Line of sight, corner traps, pillar stacks and a plan for the next melee dig.',
    drills: ['stack-one', 'stack', 'movement'],
  },
  {
    id: 'supplies',
    title: 'Make room to recover',
    description:
      'Inventory clicks, stat restoration and healing without losing the next prayer.',
    drills: ['food', 'potions'],
  },
  {
    id: 'late',
    title: 'Solve the dangerous waves',
    description:
      'Choose priorities, manage respawns and keep a recovery plan under pressure.',
    drills: ['reverse', 'gauntlet'],
  },
  {
    id: 'jads',
    title: 'Jad, healers and triples',
    description:
      'Recognise the cue. Protect first. Add one deliberate action at a time.',
    drills: ['jad', 'triples'],
  },
  {
    id: 'zuk',
    title: 'Stay with the shield, keep shooting',
    description:
      'Know the thresholds, plan the healer send and understand why lost attacks matter.',
    drills: ['blowpipe'],
  },
  {
    id: 'advanced',
    title: 'Optional techniques, with tradeoffs',
    description:
      'Useful tools to explore after the essentials. These are not all requirements for a first cape.',
    drills: ['two-tick', 'two-tick-repair', 'flick', 'melee-blob'],
  },
];
export const fieldLessons: FieldLesson[] = [
  {
    id: 'prayer-choice',
    chapter: 'foundation',
    title: 'Choose a prayer strategy',
    summary:
      'Holding, lazy flicking, alternating and one-tick flicking solve different problems.',
    paragraphs: [
      'Holding the appropriate prayer is a sensible choice when you have supplies and need attention for movement or recovery. Lazy flicking switches it off between known attacks. Neither requires changing to the opposite protection prayer.',
      'Alternating changes protection style to cover different enemies. One-tick conservation flicking instead turns a prayer set off and back on between every beat. Both creators demonstrate more conservation than a learner necessarily needs; do not make extra clicks your goal.',
    ],
    question:
      'Two isolated magers are attacking and you have ample prayer. What is a reasonable low-workload choice?',
    options: [
      'Hold Protect from Magic while killing them.',
      'Alternate Magic and Ranged because there are two enemies.',
      'Turn all prayers off to save supplies.',
    ],
    answer: 0,
    explanation:
      'Both use Magic at range. Holding it lets you focus on the kill; alternating would create unnecessary exposure.',
    source: 'gnome',
    seconds: 4871,
  },
  {
    id: 'read-cues',
    chapter: 'foundation',
    title: 'An attack cue is not a hitsplat',
    summary: 'Know which event your prayer must cover.',
    paragraphs: [
      'For a mager or ranger, the prayer check occurs as the attack starts. A projectile arriving later is too late to choose protection. Use the mager’s flash or the ranger’s attack animation to anchor the following cycle.',
      'Jad is different: its wind-up tells you which protection to select before the later check. The attack timer metronome discussed by DearLola tracks your own weapon cycle; it is not an enemy attack predictor. True-tile indicators also show logical position rather than the trailing player model.',
    ],
    question:
      'The mager flashes while your prayer is off. Can switching before the projectile lands undo that check?',
    options: [
      'Yes, every prayer is checked on projectile impact.',
      'No. Re-establish the next four-tick attack without panicking.',
      'Only if you double-click Ranged.',
    ],
    answer: 1,
    explanation:
      'The mager has already checked protection. Recover the next attack; do not learn projectile arrival as the mager cue.',
    source: 'lola',
    seconds: 4116,
  },
  {
    id: 'blob-anchor',
    chapter: 'blobs',
    title: 'Watch the anchor, not every blob',
    summary:
      'A reliable four-tick reference makes one-tick alternating manageable.',
    paragraphs: [
      'At range a blob reads protection and chooses the opposite style three ticks later. Alternating every tick makes your protection opposite to the read by the attack. Two blobs can be at different points in their six-tick cycles.',
      'When a ranger is also attacking, Ranged must coincide with its attack; for a mager, Magic must. Begin from that enemy’s attack cue. A blob next to you can melee, so the at-range reasoning does not cover standing beside it.',
    ],
    question:
      'You are alternating perfectly, but every ranger attack is unprotected. What needs correcting?',
    options: [
      'Click twice as fast.',
      'Switch to two-tick alternating without checking the blob.',
      'Align Ranged with the ranger’s attack, then continue alternating.',
    ],
    answer: 2,
    explanation:
      'Steady clicks in the wrong phase still miss the anchor. The fixed-style enemy determines the alignment.',
    source: 'lola',
    seconds: 2815,
  },
  {
    id: 'blob-flinch',
    chapter: 'blobs',
    title: 'A blob can still hit after you hide',
    summary: 'Control its read, then protect the queued attack.',
    paragraphs: [
      'DearLola demonstrates stepping out with one protection, attacking, stepping back behind cover and preparing the opposite protection. Returning to cover does not mean the attack selected during exposure can be ignored.',
      'A flinch can reduce simultaneous threats when continuous alternating feels overloaded. Account for your weapon’s reach and where an attack click will move you. Start with a single blob before mixing in a ranger or mager.',
    ],
    question:
      'A blob read Ranged as you stepped out. You are back behind the pillar. What do you prepare?',
    options: [
      'Magic for its pending attack.',
      'Ranged because that was your starting prayer.',
      'Nothing: cover cancels every pending attack.',
    ],
    answer: 0,
    explanation:
      'Its read selected Magic. Protect that queued attack even after returning to cover.',
    source: 'lola',
    seconds: 846,
    los: 'Place one blob on the opposite side of a pillar. Step into sight with Ranged, return to cover and inspect the pending Magic attack three ticks after the read.',
  },
  {
    id: 'corner',
    chapter: 'position',
    title: 'Preserve the corner trap',
    summary: 'A step down and a step sideways can produce different outcomes.',
    paragraphs: [
      'A corner trap depends on the enemy’s footprint, pathing and your position. In DearLola’s examples, attacking from the north–south direction preserves a retreat; stepping sideways can let the enemy round the corner and remove it.',
      'Do not memorise “one tile away is safe” without looking at orientation. A melee’s reach differs from a ranged enemy’s. Use the LoS tool to compare adjacent candidate tiles and inspect enemy movement one tick at a time.',
    ],
    question: 'Before leaving a corner trap to attack, what should you check?',
    options: [
      'Whether the enemy has a colourful outline.',
      'Whether your move lets it round the corner, and whether returning still restores cover.',
      'Only your distance from the nearest pillar.',
    ],
    answer: 1,
    explanation:
      'The enemy may move when you expose yourself. Returning to your original tile does not always recreate the original trap.',
    source: 'lola',
    seconds: 1176,
    los: 'Place a bat west of a pillar corner and the player south of it. Compare moving south with moving east, then returning. Repeat with a melee and inspect the different reach.',
  },
  {
    id: 'dig-plan',
    chapter: 'position',
    title: 'Plan the next melee dig',
    summary: 'A safespot is temporary when a melee is alive.',
    paragraphs: [
      'Before settling into a flick, identify where you will go if the melee digs. Consider which ranged enemies will see the new tile, not just whether it escapes the melee. The two sides of the pillar are not interchangeable.',
      'Both guides repeatedly revisit this question while attacking. If the dig would destroy your solve, kill the melee first or arrange a protected attack and another trap. Do not rely on an unconditional countdown: attack history and digging state matter.',
    ],
    question:
      'You are safely alternating a mager and blob, but have no safe move if the melee digs. What is the next priority?',
    options: [
      'Ignore the melee until its animation begins.',
      'Turn prayer off to think.',
      'Choose a retreat or remove the melee before it breaks the solve.',
    ],
    answer: 2,
    explanation:
      'The current flick is only part of the plan. Remove or manage the upcoming positional threat.',
    source: 'gnome',
    seconds: 3470,
    los: 'Add a melee behind the north pillar, plus a mager on the other side. Step until the melee digs. Compare escape tiles while keeping the mager’s line of sight visible.',
  },
  {
    id: 'pillar-stack',
    chapter: 'position',
    title: 'Set up the stack before the flick',
    summary:
      'The back enemy attacks first in the standard one-tick pillar solve.',
    paragraphs: [
      'For the standard ranger–mager stack, begin from the middle tile behind the pillar, protect against the back enemy and use the appropriate two-tile step out. Then switch for the front enemy one tick later. Practise both enemy orders.',
      'A blob or bat at the front changes the geometry. Overlapping respawns and unusual stacks need their own solve. Clicking a distant target with a short-range blowpipe can drag you into danger; inspect the route with the weapon you intend to use.',
    ],
    question:
      'Your two-tick timing drill was perfect. Does that prove every pillar stack attacks two ticks apart?',
    options: [
      'No. The standard pillar exit can create a one-tick offset, and the layout matters.',
      'Yes. A ranger always attacks two ticks after a mager.',
      'Yes, provided you start Magic.',
    ],
    answer: 0,
    explanation:
      'Offset is created by exposure and movement. The drills deliberately name their starting offset; use the LoS tool to learn how to create it.',
    source: 'gnome',
    seconds: 4388,
    los: 'Build a ranger–mager stack, start from the middle tile behind the north pillar, and step two tiles west with run enabled. Inspect the back-first attack order. Reverse the stack, then add a blob at the front and compare routes.',
  },
  {
    id: 'heal-window',
    chapter: 'supplies',
    title: 'Prayer, one action, prayer',
    summary: 'Recover deliberately instead of racing through your inventory.',
    paragraphs: [
      'Keep the dangerous attack protected, make one inventory action, then return attention to the next cue. Practise the panel trip until it is comfortable. Tab keys only open panels: prayers and items still need clicks.',
      'The shark exercise isolates this coordination skill; it is not a recommended Inferno inventory. Saradomin brews are common run supplies, and can reduce combat stats. Healing without restoring the stats needed for the next cast or shot can create another problem.',
    ],
    question: 'You survived a Jad hit. What is the safer recovery sequence?',
    options: [
      'Drink several doses before looking at Jad again.',
      'Catch the next prayer, take one dose, then catch the next prayer.',
      'Immediately stop attacking and switch all prayers off.',
    ],
    answer: 1,
    explanation:
      'A surviving mistake is recoverable. Preserve the next protection check while making one deliberate action.',
    source: 'gnome',
    seconds: 5151,
  },
  {
    id: 'supply-purpose',
    chapter: 'supplies',
    title: 'Use each potion for its job',
    summary: 'Healing, restoring and boosting are separate decisions.',
    paragraphs: [
      'Gnomonkey treats Armadyl brew as a ranged boost that also heals, rather than a replacement for repeatedly drinking Saradomin brew. It lowers other combat stats: remember restoration before returning to magic. A fixed three-brew/one-restore drill trains counting; real stat deficits decide the actual doses.',
      'Prayer regeneration works gradually and does not replace an emergency restore or the stat restoration needed after brews. Gear, available items and run length change the supply plan. DearLola and Gnomonkey make different equipment choices; none of those preferences is a universal cape requirement.',
    ],
    question:
      'Your Ranged is already boosted, but you need healing and will cast again shortly. What should guide your doses?',
    options: [
      'Use Armadyl brews repeatedly because their name says brew.',
      'Always drink exactly three brews even if already healthy.',
      'Heal for the actual deficit and restore the stats needed for your next action.',
    ],
    answer: 2,
    explanation:
      'Know what the dose changes. Boosting, healing and restoring solve different problems; check stats rather than following a ratio blindly.',
    source: 'gnome',
    seconds: 5776,
  },
  {
    id: 'healing-tools',
    chapter: 'supplies',
    title: 'Leave yourself something to heal on',
    summary: 'Kill order can preserve a safe blood-barrage target.',
    paragraphs: [
      'An isolated ranger or arranged bloblets can give you a healing opportunity before the next wave. Before killing a blob, consider where its three children will appear and which child will see you. Protect the exposed style rather than assuming Ranged or Magic is always right.',
      'Gnomonkey also demonstrates a manual long-range blood-barrage recast on a dying target (“phantom barrage”). This depends on range and timing, is not an autocast effect and is not guaranteed healing. Learn ordinary safe blood barrage first; inspect the demonstration before attempting the optional technique.',
    ],
    question:
      'You are about to kill a blob beside a pillar. What should you plan before its death?',
    options: [
      'The children’s exposure, your next protection, and a safe healing position.',
      'Turn prayer off as soon as the large blob dies.',
      'Always run beside the bloblets to group them.',
    ],
    answer: 0,
    explanation:
      'The death changes the wave. A prepared position can isolate the children and provide healing; an unplanned move can expose several styles.',
    source: 'gnome',
    seconds: 615,
    los: 'Kill a blob from each side of the pillar and inspect the three bloblets. Compare which style sees you before stepping, then move to isolate one at a time.',
  },
  {
    id: 'wave-opening',
    chapter: 'late',
    title: 'One freeze, then read the wave',
    summary: 'Preserve your run before chasing a distant nibbler.',
    paragraphs: [
      'Early waves offer room to practise nibbler control and protect pillars. Later, a chase can expose you to a ranger and mager together. Start by protecting the dangerous visible threat, cast at the nibbler group when safe, and find a position where one large ranged enemy is isolated.',
      'Gnomonkey’s later-wave rule of thumb is one opening cast before solving the threats, with the north pillar needing particular attention. It is not a command to ignore every nibbler: pillar health, exposure and the actual spawn determine whether a follow-up cast is safe.',
    ],
    question:
      'A nibbler is on a healthy distant pillar, but chasing it exposes a mager and ranger. What is the priority?',
    options: [
      'Chase it immediately to save every pillar hit.',
      'Establish a survivable position, then reassess the nibbler.',
      'Turn on Ranged regardless of which enemy can see you.',
    ],
    answer: 1,
    explanation:
      'Trading the run for small pillar damage is a poor bargain. Solve the immediate threats and return when the route is safe.',
    source: 'gnome',
    seconds: 3724,
    los: 'Load a late wave with both a mager and ranger. Compare your opening tile with a route towards a distant nibbler. Find a tile where only one large ranged enemy can attack.',
  },
  {
    id: 'kill-order',
    chapter: 'late',
    title: 'Kill what changes the solve',
    summary: 'The nearest enemy is not always the best target.',
    paragraphs: [
      'A mager can resurrect fallen enemies, so killing it first often reduces later work. But an active bat or a melee about to break your position can take priority. Blowpipe special attacks and offensive prayers can remove that immediate threat as well as help you recover.',
      'Before removing the front enemy in a stack, ask what will gain line of sight next. A blob kill can create three new threats; a ranger killed before the mager may reappear in an awkward position. Choose the kill that makes the next state simpler.',
    ],
    question:
      'A melee will soon break your only safe position; the mager is controlled. Which plan makes sense?',
    options: [
      'Always kill the mager first, regardless of the melee.',
      'Kill the blob because it is closest.',
      'Remove the melee, accepting that a resurrection may need handling later.',
    ],
    answer: 2,
    explanation:
      'Immediate survival can outweigh avoiding a resurrection. Keep a plan for the respawn rather than treating kill priority as a fixed list.',
    source: 'gnome',
    seconds: 3247,
  },
  {
    id: 'collision',
    chapter: 'late',
    title: 'Recognise an impossible prayer check',
    summary:
      'Same-tick different styles need a positional or damage-management decision.',
    paragraphs: [
      'You cannot protect against Magic and Ranged simultaneously. If both attack on the same tick, faster alternating does not fix it. Isolate one, change their relative attack timing, or remove a threat while protecting the more dangerous one.',
      'Reverse flicking fills the gaps of a protected mager or melee with another prayer. Against a three-tick bat this reduces damage, but periodic collisions remain. The reverse-flick drill reports those exposures separately from your execution score.',
    ],
    question:
      'A mager and ranger attack on the same tick. What will perfect one-tick alternating do?',
    options: [
      'Still leave one attack unprotected until you change the setup.',
      'Protect both, because each prayer was active recently.',
      'Make the ranger delay automatically.',
    ],
    answer: 0,
    explanation:
      'Prayer state at the check matters. Reposition or otherwise solve the collision; extra click speed cannot supply two simultaneous protections.',
    source: 'lola',
    seconds: 3654,
    los: 'Place a mager and ranger with matching cooldowns. Step through the simultaneous check, then isolate one and expose it later to create an offset.',
  },
  {
    id: 'respawn',
    chapter: 'late',
    title: 'Keep the beat through a resurrection',
    summary:
      'A mager’s animation can change without changing its established phase.',
    paragraphs: [
      'Both guides point out that the mager’s resurrection action preserves the underlying four-tick alignment. Keep the rhythm instead of restarting from an arbitrary moment, while checking what the resurrected enemy can see.',
      'On wave 66, both magers can resurrect each other. Lower both before finishing them in quick succession where practical, keep Magic protected and give the collapsing pillars space at the end. A resurrection is something to handle, not evidence that the run is lost.',
    ],
    question:
      'A mager in your established alternating cycle resurrects a blob. What should you do?',
    options: [
      'Restart your pattern on Ranged no matter what.',
      'Maintain the established phase and inspect the new enemy’s exposure.',
      'Stop protecting Magic until its next projectile arrives.',
    ],
    answer: 1,
    explanation:
      'Do not reset a working anchor merely because its animation changed. Account for the extra enemy and preserve protection.',
    source: 'gnome',
    seconds: 4440,
  },
  {
    id: 'jad-actions',
    chapter: 'jads',
    title: 'Tag healers without losing Jad',
    summary: 'One action between protection checks is enough.',
    paragraphs: [
      'Watch the current attack, protect it, then tag one healer or take one dose. Return attention to Jad. Repeated styles do not require another prayer click, and clicking an already-active prayer turns it off.',
      'Positioning can reduce how many healers reach you. The guides demonstrate trapping healers behind the player or one another; those placements depend on spawn and geometry. Start with reliable individual tags. Blood-barrage tagging and running through Jad are extra techniques, not required learner actions.',
    ],
    question:
      'The next Jad cue is Magic again and Magic is already active. What should you do?',
    options: [
      'Click Magic again to confirm it.',
      'Switch Ranged because attacks must alternate.',
      'Keep Magic active and prioritise the next check before another healer action.',
    ],
    answer: 2,
    explanation:
      'Repeated styles are valid. Clicking Magic again would turn it off; use the time for a single safe action only after protection is settled.',
    source: 'gnome',
    seconds: 4904,
  },
  {
    id: 'triple-attention',
    chapter: 'jads',
    title: 'Three Jads become two, then one',
    summary: 'Do not let a quieter phase switch your attention off.',
    paragraphs: [
      'Each Jad has a nine-tick cycle, with three Jads staggered to present attacks three ticks apart. Read each cue instead of memorising Magic–Ranged alternation. Keep the camera and sound useful for recognising attacks.',
      'When one dies there is a longer gap in the sequence; the remaining Jads still need protection. Avoid trying to fill every gap with several actions. Practise the full encounter, including healer tags and the changing number of Jads, in the combat simulator.',
    ],
    question: 'One of the three Jads dies. What changes?',
    options: [
      'There is a gap in the sequence; the remaining attack cues still need attention.',
      'The remaining Jads now always alternate styles.',
      'You can focus only on healers until another Jad dies.',
    ],
    answer: 0,
    explanation:
      'Lower apparent pressure is not the end of the encounter. Keep reading the remaining attacks.',
    source: 'gnome',
    seconds: 5305,
  },
  {
    id: 'zuk-thresholds',
    chapter: 'zuk',
    title: 'Know what the next threshold starts',
    summary: '600, 480 and 240 HP mark different decisions.',
    paragraphs: [
      'At 600 HP, the set timer pauses; use that interval to finish the controlled mager and prepare. At 480 HP, Jad spawns and the timer resumes. Tag Jad promptly so it stops attacking the shield, while continuing shield movement.',
      'At 240 HP, healers spawn and Zuk’s attacks speed up. Set timing, health, boosts and shield position all matter before crossing that threshold. Do not copy “always wait a set” or “always send” without checking the state of your run.',
    ],
    question:
      'Zuk reaches 600 HP with a tagged, controlled mager still alive. What window have you gained?',
    options: [
      'Healers have spawned, so rush to tag them.',
      'The paused set timer gives a window to kill the mager and prepare for Jad.',
      'The shield becomes invulnerable for the rest of the fight.',
    ],
    answer: 1,
    explanation:
      'This is the interlude before Jad. The existing mager still matters, and the shield still needs protection.',
    source: 'gnome',
    seconds: 5905,
  },
  {
    id: 'zuk-dps',
    chapter: 'zuk',
    title: 'Make movement fit the weapon cycle',
    summary:
      'Repeatedly missing shots makes Zuk last longer and invites more sets.',
    paragraphs: [
      'Gnomonkey’s side-by-side comparison shows why waiting after each shot before moving costs so much damage over a fight. Move promptly during the weapon cooldown and shoot again when ready, while staying covered by the shield.',
      'Attack clicks can drag you because Bowfa, twisted bow and blowpipe have different ranges. A safe drag before enrage is not automatically safe afterwards. Rehearse with your intended weapon in the combat simulator. Shield cover takes priority when a shot is genuinely unsafe.',
    ],
    question:
      'Your weapon has just fired and a safe movement is needed. What is the useful habit?',
    options: [
      'Wait until the weapon is ready again, then move.',
      'Stop shooting whenever the shield moves.',
      'Move during the cooldown and resume attacks when ready, preserving shield cover.',
    ],
    answer: 2,
    explanation:
      'Use the cooldown for movement instead of spending the next available attack on movement. Do not take an unsafe shot just to avoid a lost tick.',
    source: 'gnome',
    seconds: 6405,
  },
  {
    id: 'healer-send',
    chapter: 'zuk',
    title: 'Prepare the healer send',
    summary: 'A well-timed start reduces healing and frantic movement.',
    paragraphs: [
      'Approach the healer threshold with health, prayer and ranged boosts ready. Aim to trigger healers at a useful side of the shield’s sweep so you can reach them promptly. A poorly timed send leaves healers restoring Zuk while you wait to reach them.',
      'Tag healers as you move with the shield. A newly tagged healer has a turning delay before it can be hit again, so another target may be the better next shot. Keep health out of danger; Redemption is a backup, not a reliable repeated healing plan.',
    ],
    question:
      'Zuk is near 240 HP, but the shield is in an awkward position and a set is imminent. What is the sensible decision?',
    options: [
      'Hold damage while you resolve the set and prepare a controlled send.',
      'Cross 240 immediately because all waiting is bad DPS.',
      'Rely on repeated Redemption instead of healing.',
    ],
    answer: 0,
    explanation:
      'Useful preparation is different from accidental lost attacks. Avoid stacking healer pressure with an imminent set and an awkward shield position.',
    source: 'gnome',
    seconds: 6093,
  },
  {
    id: 'enrage',
    chapter: 'zuk',
    title: 'After healers, follow the shield',
    summary: 'The earlier safe-spot rhythm no longer guarantees cover.',
    paragraphs: [
      'Zuk’s faster attack cycle after the healer threshold changes the relationship between his attacks and the shield. Stay with the shield rather than blindly repeating the earlier marked-tile sequence.',
      'Keep shooting when safe, but reassess for another set. DearLola’s guide ends with a death during this phase: it is a useful reminder that knowing the plan is not the same as executing the last movement and tag. Practise this specific phase repeatedly in the simulator.',
    ],
    question:
      'The healers are dead. Can you resume the pre-healer safe-spot clicks without checking the shield?',
    options: [
      'Yes, because Zuk is back to his original attack speed.',
      'No. Keep shield cover under the faster attack cycle.',
      'Only if your Ranged boost is active.',
    ],
    answer: 1,
    explanation:
      'The fight stays enraged. Damage matters, but moving out of shield cover can end the run immediately.',
    source: 'lola',
    seconds: 8970,
  },
  {
    id: 'two-phase',
    chapter: 'advanced',
    title: 'Two ticks needs the right phase',
    summary:
      'An extra free beat is useful only when the blob reads the right prayer.',
    paragraphs: [
      'Hug my cat’s timeline shows the trap: start alternating two ticks at a time before the blob sees you, and its read can fall on the wrong half of a hold. A pattern that protects a mager can still expose you to every blob attack.',
      'The repair shifts the hold to the other side of the anchor’s attack while preserving its protection. The phase lab below makes this visible. One-tick alternating is the simpler default when blob phases are unknown; two-tick alternating is an optional addition.',
    ],
    question:
      'The mager is protected, but a newly arriving blob hits through your two-tick pattern. What is wrong?',
    options: [
      'Two-tick alternating is always impossible.',
      'Your mouse is too slow even if every click landed.',
      'The blob’s scan phase may be misaligned; protect the anchor and re-establish or use one-tick alternating.',
    ],
    answer: 2,
    explanation:
      'Holding each prayer for two ticks only works for suitable scan phases. The guide explicitly demonstrates both misalignment and recovery.',
    source: 'two',
    seconds: 334,
  },
  {
    id: 'optional-tools',
    chapter: 'advanced',
    title: 'Use advanced tools for a reason',
    summary:
      'Conservation, splash offsets and melee–blob mitigation are not universal solves.',
    paragraphs: [
      'One-tick conservation can include protection and offensive prayers through quick prayers, but requires a reliable off–on pair every tick. Melee–blob mitigation prioritises Melee and fills the gaps with ranged protections; it intentionally leaves some blob attacks exposed.',
      'Gnomonkey demonstrates splash-based off-ticking as a situational trick and calls out failure cases, including a mager resurrection. DearLola sometimes freezes an enemy where Gnomonkey prefers to kill it. These are context-dependent choices: ordinary isolation, an attack-cue offset, or removing the threat remain options.',
    ],
    question: 'Which goal should decide whether to use an advanced technique?',
    options: [
      'Make the current wave safer or simpler without exceeding your attention budget.',
      'Use the highest number of clicks possible.',
      'Avoid every potion even if the run becomes unstable.',
    ],
    answer: 0,
    explanation:
      'The technique serves the solve. A manageable plan with sufficient supplies is more useful than unnecessary precision under pressure.',
    source: 'gnome',
    seconds: 4694,
  },
];
export function fieldSource(l: FieldLesson) {
  const id = { gnome: '2xviK0wGI-o', lola: 'r3s4rbTd4QU', two: 'zTQdupqm-lM' }[
    l.source
  ];
  const name = { gnome: 'Gnomonkey', lola: 'dearlola1', two: 'Hug my cat' }[
    l.source
  ];
  return {
    href: `https://www.youtube.com/watch?v=${id}&t=${l.seconds}s`,
    label: `${name} · ${Math.floor(l.seconds / 60)}:${String(l.seconds % 60).padStart(2, '0')}`,
  };
}
