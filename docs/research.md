# Video research and lesson coverage

Reviewed 18 September 2026. Lessons are original explanations and exercises, with links back to the demonstrations. Automatic captions are imperfect: names, numbers and spatial descriptions need checking against visuals and mechanics references. Creator preferences are presented as choices, not universal requirements.

## Sources and acquisition

- [Hug my cat — 2 Tick flick guide, step by step](https://www.youtube.com/watch?v=zTQdupqm-lM), 10:29. No caption track was exposed by the player. Downloaded the public video with yt-dlp, extracted frames with ffmpeg, read the on-screen instructions and checked OCR against the frames. The instructions at 2:30, 5:35 and 6:30 explicitly distinguish a bad scan phase, repairing the hold relative to the anchor, and creating an offset by exposure.
- [Gnomonkey — NEW Golden Trio for First Inferno Cape](https://www.youtube.com/watch?v=2xviK0wGI-o), 1:59:28. Retrieved the complete English automatic caption track with yt-dlp in JSON3 format: 3,094 timestamped entries, approximately 24,439 words. Reviewed the transcript from opening supplies through the end of the Zuk comparison.
- [dearlola1 — MY NEW OSRS INFERNO GUIDE (ANY GEAR), 2026](https://www.youtube.com/watch?v=r3s4rbTd4QU), approximately 2:33. Retrieved the complete English automatic caption track: 3,273 timestamped entries, approximately 26,193 words. Reviewed the opening setup, early-wave teaching, later wave examples, Jad/triples and the final Zuk attempt.

Public caption retrieval succeeded without account credentials. Direct timedtext requests returned empty responses, while yt-dlp's public player extraction succeeded. Temporary transcripts and video frames were kept outside the repository; full captions and video are not republished in the application.

Reproduction command (using an isolated Python environment with yt-dlp installed):

```sh
yt-dlp --skip-download --write-auto-subs --sub-langs en --sub-format json3 --js-runtimes node -o '/tmp/inferno-%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=2xviK0wGI-o' 'https://www.youtube.com/watch?v=r3s4rbTd4QU'
yt-dlp --skip-download --list-subs 'https://www.youtube.com/watch?v=zTQdupqm-lM'
```

## What the three guides contribute

Hug my cat makes two-tick timing concrete: practise the hold, acquire the blob in the correct phase, add movement, add a four-tick anchor, then repair a misaligned cycle. The recovery shifts which side of the anchor attack contains the two-tick prayer hold. This is not the same as simply clicking faster, and two-tick alternating is not a universal solution for unknown blob phases.

Gnomonkey emphasises a manageable first-cape toolkit: one-tick alternating, removing a time-sensitive melee, using blowpipe specials to remove threats, leaving dangerous nibbler chases, and maintaining damage during Zuk. He explicitly treats two-tick alternating as optional for a first cape. His Zuk comparison distinguishes needless idle time from useful waiting for a controlled healer send.

DearLola contributes detailed isolation, corner-trap and destacking examples, blob flinches, reverse flicking, preserving escape routes and planning for melee digs. He repeatedly notes that the amount of conservation flicking he demonstrates is not necessary with adequate supplies. His Zuk attempt ends in a death; the course uses that as a recovery/attention lesson, not as a successful completion claim.

The creators differ on gear, freezes, healer tags and preferred wave solves. The course teaches the decision and its conditions instead of silently combining incompatible recommendations. Examples: Gnomonkey usually prefers killing a melee over trying to freeze it; DearLola sometimes freezes threats. Gnomonkey demonstrates barrage healer tags; DearLola recommends individual bow tags for learners.

## Coverage map

| Skill / decision                          | Primary demonstration                                 | Application coverage                                                                           |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Four-tick mager cue and lazy flick        | DearLola 1:08:36                                      | First drill, visible attack countdown, 600 ms timing; cue-versus-hitsplat field lesson         |
| Bat's three-tick cycle                    | DearLola 11:58                                        | Separate bat drill; reverse-flick collision checks                                             |
| Blob read and three-tick delay            | Gnomonkey 7:46; DearLola 14:06                        | Read the blob, queued-attack/flinch lesson, LoS assignment                                     |
| One-tick alternating and correct anchor   | DearLola 22:31, 46:55; Gnomonkey 39:28                | Pattern drill, ranger anchor, differently phased double blobs, combined movement               |
| Two-tick hold and phase                   | Hug my cat 0:32, 1:26, 2:54                           | Aligned drill; 12-tick interactive phase lab with four scan phases                             |
| Two-tick recovery                         | Hug my cat 5:34                                       | Shifted-scan repair drill and explanation of the live transition risk                          |
| One-tick prayer conservation              | DearLola 15:58; OSRS Wiki Prayer                      | Separate click-trace drill; held prayer and click spam do not pass                             |
| Standard pillar stack                     | Gnomonkey 1:13:08; DearLola 1:59:50                   | One-tick stack drill; back-first explanation and LoS assignment                                |
| Two-tick offset by exposure               | Hug my cat 6:25; DearLola 53:32, 1:32:35              | Existing two-tick stack drill, positioning lesson, contextual source links                     |
| Flick and move                            | Hug my cat 2:54, 3:30; DearLola 1:02:50               | Flick and move; blob+mager+movement; LoS transfer tasks                                        |
| Corner traps, destacking, weapon drag     | DearLola 19:36, 36:11, 44:51                          | Field lessons and repeatable LoS assignments                                                   |
| Melee digs and next safe tile             | Gnomonkey 57:50; DearLola 1:27:58                     | Dig-plan scenario; different pillar sides and attack-history caveat                            |
| Inventory, healing and restoration        | Gnomonkey 1:25:51, 1:36:16, 1:46:01                   | Food and brew/restore drills; one-action recovery and potion-purpose lessons                   |
| Blood barrage and bloblets                | Gnomonkey 10:15; DearLola 14:49, 30:48                | Healing/kill-order lesson; bloblet LoS task; phantom barrage marked optional                   |
| Late-wave opening and nibblers            | Gnomonkey 1:02:04; DearLola 1:32:32                   | Wave-opening scenario: one opening cast then assess; no blanket instruction to abandon pillars |
| Kill priority and blowpipe specials       | Gnomonkey 54:07, 1:14:43                              | Conditional target-priority lesson; imminent melee versus controlled mager                     |
| Same-tick conflicts and reverse flick     | DearLola 1:00:54                                      | Collision lesson, mager+bat mitigation drill with explicit exposure messages                   |
| Melee+blob partial protection             | OSRS Wiki Inferno strategies                          | Melee/Range/Magic/Range drill; half of the selected blob attacks intentionally exposed         |
| Resurrection and wave 66                  | Gnomonkey 1:14:00, 1:21:11; DearLola 2:04:15, 2:12:16 | Maintain-phase lesson, lower both magers, collapse awareness                                   |
| Jad cues and one-action recovery          | Gnomonkey 1:21:44, 1:25:51                            | Randomised-style cue drill; healer-tag scenario; full-simulator transfer                       |
| Triple Jad attention and healers          | Gnomonkey 1:26:53, 1:28:25; DearLola 2:16:09          | Three staggered cycles, repeated styles, changing encounter gaps explained                     |
| Zuk thresholds and timer                  | Gnomonkey 1:38:25; DearLola 2:21:13                   | 600/480/240 field lesson and knowledge check                                                   |
| Weapon cooldown movement and lost shots   | Gnomonkey 1:46:45; DearLola 2:28:33                   | Shoot–step drill, Zuk DPS lesson, intended-gear simulator assignment                           |
| Healer send and turning delay             | Gnomonkey 1:41:33                                     | Preparation question, tag-order notes, Redemption caveat                                       |
| Enrage, shield and later sets             | DearLola 2:29:30; Gnomonkey 1:42:57                   | Dedicated final-phase field lesson and simulator transfer                                      |
| Splash offset and other situational tools | Gnomonkey 1:18:14                                     | Optional-tools lesson, failure conditions; no universal splash guarantee                       |

## Model boundaries and accuracy decisions

- All timed drills use 600 ms. Guided means hints, not slower ticks.
- Prayer controls are mouse toggles; F-keys only switch panels. There is no separate Off button.
- One-tick conservation checks both the boundary prayer and exactly one intervening off–on pair. This is a timing model, not an exact prayer-drain or network simulation.
- One-tick alternating covers all four at-range scan phases in the phase lab. Two-tick patterns fail on the incompatible phases; shifting the hold preserves mager protection while changing the blob outcome.
- Stack drills explicitly begin with a one- or two-tick offset. They do not claim to teach the positioning merely by playing the pattern. Actual setup is practised in LoS.
- Mitigation drills score correct priorities and separately report exposure. They never equate 100% with every attack blocked.
- The melee–blob drill chooses a deterministic adverse style when reading Melee; that read is not controlled in the real game. The chosen sequence demonstrates partial rather than complete protection.
- Jad uses labelled wind-up cues followed by a check three ticks later. Single Jad has an eight-tick period; triple Jads have nine-tick periods staggered by three ticks. The first cue appears at the end of the count-in, before tick 1. This teaches reaction and repeated styles, not exact animation frames, audio or healer combat.
- Movement is immediate placement on a small coordination grid. Blowpipe practice checks odd-tick attacks and even-tick movement; it does not model weapon range, pathfinding, damage or Zuk's shield.
- Food practice is not an Inferno inventory recommendation. Actual health, boost/restore arithmetic and player attack delays are not modelled.
- Neither transcript's loose melee-dig timer explanation was made an unconditional countdown. Geometry-dependent advice is sent to LoS instead of inventing coordinates from speech such as “this tile”.
- DearLola's spoken mager maximum in one passage conflicts with the mechanics reference. The course does not repeat that number or advise tanking based on it.
- Armadyl brew is a real distinct item in the Gnomonkey guide, not a transcription of Saradomin brew. The supply lesson preserves that distinction without hard-coding uncertain stat formulae.

Single/triple Jad cadence was cross-checked against [JalTok-Jad](https://oldschool.runescape.wiki/w/JalTok-Jad) and the companion simulator’s delayed-attack implementation.

Supporting references: [Inferno strategies](https://oldschool.runescape.wiki/w/Inferno/Strategies), [Prayer](https://oldschool.runescape.wiki/w/Prayer), [Ranged boosts](https://oldschool.runescape.wiki/w/Ranged), [Armadyl brew](https://oldschool.runescape.wiki/w/Armadyl_brew), [Potions](https://oldschool.runescape.wiki/w/Potions). Search-index excerpts were accessible where Wiki page fetching was blocked.

## Second review: practical gaps and navigation

Revisited both downloaded, timestamped transcripts and extracted the 2:54 movement instruction directly from Hug my cat’s video. This pass adds six decision lessons (28 total), keeping the 20 timing drills separate from full encounter practice:

- **Screen setup** — dearlola1, [2:18–5:06](https://www.youtube.com/watch?v=r3s4rbTd4QU&t=138s): prayer tick indicator, true tile, personal attack timer and weapon charges. The pre-entry checklist is our synthesis, not a prescribed plugin pack. The personal attack timer is explicitly not an enemy predictor.
- **Early-wave rehearsal** — Gnomonkey, [27:23–28:46](https://www.youtube.com/watch?v=2xviK0wGI-o&t=1643s): learn ranger–blob alternating early, including the action that interrupts it, instead of postponing the first attempt to a dangerous late wave. The course adds controlled practice conditions and a retreat.
- **Weapon drag** — dearlola1, [58:56–59:14](https://www.youtube.com/watch?v=r3s4rbTd4QU&t=3536s), also 32:48: a cast pulls the player out and exposes a blob. This expands the previous passing mention into an explicit route-and-range decision.
- **Between waves** — dearlola1, [2:11:45–2:13:42](https://www.youtube.com/watch?v=r3s4rbTd4QU&t=7905s): queued logout, preparing for Jad, and clearing the collapsing pillars. Cross-checked the end-of-wave logout request against the [Wiki strategy page](https://oldschool.runescape.wiki/w/Inferno/Strategies). It is not an instant pause while enemies remain.
- **Zuk set targeting** — Gnomonkey, [1:37:42–1:38:45](https://www.youtube.com/watch?v=2xviK0wGI-o&t=5862s): first-set management, deliberately delayed mager tag and returning damage to Zuk. The learner route distinguishes tagging each enemy from the creator’s optimised shield-health trade. Cross-checked shield targeting against [TzKal-Zuk](https://oldschool.runescape.wiki/w/TzKal-Zuk).
- **Movement during two-tick holds** — Hug my cat, [2:54 onward](https://www.youtube.com/watch?v=zTQdupqm-lM&t=174s): standalone blob, movement, then mager. The lesson separates fitting a click into the hold from the new line of sight and blob phase that the move may create.

The homepage’s six troubleshooting entries are original summaries of these and the existing lessons. Each links to the source demonstration and the relevant lesson; appropriate entries also launch the matching drill. The between-wave checklist and three-question attempt review are editorial practice aids. No new engine behavior or full combat simulation is claimed.

Removed the promotional hero, ornamental arena, motivational cards and duplicated drill cards from the overview. The course uses a compact chapter rail, lesson contents and readable sections instead of nested lesson cards. Drill titles now name the technique. Lesson hashes preserve access after a reload, and existing progress IDs and answer indices remain intact.

## Prepared LoS scenes

Lesson assignments now link to named IL2 scenes rather than the empty tool. The readable fixtures are in `docs/los-setups.json`; `scripts/generate-los-setups.mjs` uses the companion’s public encoder and simulator (verified against inferno-los commit `16bc4d1cad05fde52ee0def6c07cbad280cbeb21`). Each scene round-trips through the decoder and has legal NPC placement.

The hidden-blob example deliberately starts after the read, with a Magic attack pending in three ticks and the player already behind the north pillar. The pillar-stack example starts on the west face and uses a two-tile south exit: the back mager attacks first, followed by the front ranger one tick later. These sequences, corner exposure, weapon-range exposure, a same-tick attack collision, a preset melee dig and the hidden second blob are asserted against the companion simulator.

Assignments describe the tool’s actual capabilities: bloblets are pre-placed rather than killed in the simulator; weapon range is compared through manual player positioning; the late-wave opening is an illustrative fixed layout; the melee dig timer is a practice preset. Blood-barrage healing, player attack pathfinding and nibbler damage are not claimed as simulated features.
