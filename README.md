# inferno-tips

An Astro site for learning Old School RuneScape Inferno mechanics through short, repeatable exercises. Eight ordered chapters contain 28 field lessons with knowledge checks and 20 timed drills. The overview links common mistakes to specific lessons and drills. Learning path has chapter navigation, lesson contents and bookmarkable lesson links; Practice drills is a searchable, filterable exercise library.

## Run locally

Use Node.js 22.12 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:4321. The site is static; drills run in the browser and progress is saved locally. No account, API key, or backend is required.

## Cloudflare Pages

Connect `ollieatkinson/inferno-tips` with these settings:

| Setting                | Value             |
| ---------------------- | ----------------- |
| Production branch      | `trunk`           |
| Framework preset       | Astro             |
| Build command          | `npm run build`   |
| Build output directory | `dist`            |
| Root directory         | Leave blank       |
| Environment variable   | `NODE_VERSION=22` |

The repository includes `.nvmrc` with Node 22. No Cloudflare adapter is required because the output is static. After deployment, add `inferno.tips` under Custom domains if desired. The companion wave simulator is linked at https://los.inferno.tips/.

## Course and drills

The path covers attack cues, blobs, one-tick alternating, one- and two-tick stacks, positioning, melee digs, screen setup, early-wave rehearsal, weapon drag, inventory recovery, end-of-wave preparation and breaks, late-wave priorities, Jad/triples, Zuk set targeting and healer decisions. Optional techniques include two-tick alternating and phase repair, one-tick conservation, and melee–blob mitigation.

Twenty timed drills include the original mager, blob, stack, movement and supply exercises, plus bat timing, a ranger anchor, differently phased double blobs, off–on conservation, two-tick alignment/repair, reverse flicking, melee–blob triage, Jad/triple cue reactions and shoot–step coordination. The interactive phase lab shows why changing the blob’s first scan can make a two-tick pattern fail.

Each field lesson has a decision question and timestamped source link. Knowledge checks persist separately from timed-drill mastery. Spatial assignments and drill companion links open prepared LoS scenes with relevant enemies, positions and attack state; full Jad and Zuk practice links to the combat simulator.

Both modes use real 600 ms game ticks. Guided mode adds hints, a tick bar, a full tick counter and a six-tick prayer table above the controls. Challenges hide these and show one compact cycle digit beside the controls; movement drills count 1–4 to match the tile deadline. The table shows prayer icons, holds, off–on clicks, blob reads and supply/movement reminders. It advances with the run and uses actual pending blob reads. Jad drills teach cue reactions instead of a fixed cycle. Two uninterrupted challenges meeting the displayed pass target earn lesson mastery. All lessons remain open for practice. Completed runs show check-by-check feedback, accuracy, and best streak. Progress survives reloads and can be reset with confirmation.

Completed individual drills also explain missed requirements: prayer off or wrong at a check, quiet ticks left active, uncontrolled blob reads, supplies, off–on pairs, movement and lost weapon ticks. The main correction appears beside Retry; the result review groups mistakes with counts, an example tick and a concrete next attempt. Counts exclude duplicate round failures and are not presented as lost points. Regular alternating on the wrong phase gets a specific starting-beat correction.

Sequence drills award a point only when the whole mechanic is completed:

| Drill                              | Pass target | A point requires                                                                 |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| Mager / bat lazy flicking          | 8/9 · 11/12 | Protect the attack and switch off for the quiet ticks                            |
| Blob reads                         | 5/6         | Control the read with Magic/Ranged and protect its attack                        |
| Flick & Move / blob–mager movement | 8/9         | Protect every attack and actually move to the marked tile                        |
| Food / potions                     | 8/9 · 7/8   | Correct item with prayer off in the gap, with both surrounding attacks protected |
| One-tick flick                     | 32/35       | One off–on pair, finishing on Magic at the next boundary                         |
| Blowpipe movement                  | 17/18       | Shoot and run two tiles during cooldown; lost attack ticks count as misses       |

Food finishes on tick 37 and potions on tick 33 so the last supply action is tested against the following attack. Other drills last 36 ticks. Revised scoring starts new bests and pass counts; earlier scores remain visible on Your progress, and attempt counts are retained.

**Hard circuit** (`#hard`) and **Endless gauntlet** (`#endless`) are available from Practice drills. Both use three lives, hidden hints, 600 ms ticks and a three-tick count-in between stages. Hard has five stages: two-tick stack, Flick & Move, blob–mager movement, double blobs and triple Jad. Endless starts with mager flicking, follows that progression, then repeats the final three encounters indefinitely. Complexity and the points multiplier cap after the opening progression; tick speed never increases.

Correct scored beats/sequences earn 10–60 points depending on the stage. Multiple failures on one tick cost only one life, with no partial points on that tick. Finish manually, lose all three lives, or clear Hard to save a personal best. Each mode has its own browser-local high score. Pausing, hiding the tab or a long timing stall turns the entire run into practice without a high score. Circuit runs do not award individual drill passes. Retry remains beside the prayer controls, and stage changes keep their position stable.

Click a prayer to activate it; click the active prayer again to turn it off. Click tiles to move. Tab keys default to `Esc` for Inventory and `F1` for Prayers. Open **Settings** in the site navigation to choose Esc or F1–F12, a default practice mode, tick sound and volume. These preferences apply across drills and persist locally; existing keybinds carry over. Assigning an already-used key swaps the two bindings. They never activate prayers or items. After guided practice, **Start challenge** begins the same drill without prayer hints in one click. Use the Pause button to pause. Hidden tabs and long browser stalls pause the exercise; interrupted challenges count as practice.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run test:production
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium installation. Unit tests cover scan/attack timing, prayer patterns, movement scoring, streaks, storage validation, and mastery. Browser tests exercise full runs, persistence, mobile layout, failure feedback, and navigation.

## Sources and limits

The course draws on the three requested guides by [Hug my cat](https://www.youtube.com/watch?v=zTQdupqm-lM), [Gnomonkey](https://www.youtube.com/watch?v=2xviK0wGI-o) and [dearlola1](https://www.youtube.com/watch?v=r3s4rbTd4QU), with [OSRS Wiki mechanics references](https://oldschool.runescape.wiki/w/Inferno/Strategies). See [research and coverage](docs/research.md) for transcript acquisition, timestamped evidence, creator disagreements and model decisions. Full transcripts and videos are not republished.

This is a focused timing and coordination tool, not a full combat simulator. It does not model damage rolls, prayer drain, latency, gear, stat restoration, pathfinding or full encounters. Monsters show game-model attack animations on their own schedules, including beside the movement grid. Blob reads are separate from delayed attacks, and each Jad has its own animation and reaction cue; Zuk is taught through decisions and a weapon/movement drill, with full encounter practice linked externally. Mitigation exercises report unprotected attacks separately from correct-priority scores. Supply drills model finite exercise stock and a three-tick eating/drinking cooldown; the fixed dose sequence is not a personalized supply recommendation. Movement targets are an invented practice task, not an Inferno floor hazard. Scores and mastery are learning milestones, not a promise of a cape.

Game artwork and RuneScape trademarks belong to Jagex Ltd. This is an independent fan project. See [THIRD_PARTY.md](THIRD_PARTY.md) and the site’s `/credits/` page for attribution.

## Editing LoS setups

`docs/los-setups.json` contains the readable scene fixtures; `src/lib/losSetups.json` contains generated share links. After editing a fixture, run:

```sh
node scripts/generate-los-setups.mjs ../inferno-los
npx prettier --write src/lib/losSetups.json
```

The generator uses the companion repository’s public encoder and simulator, validates positions and link round-trips, and checks the demonstrated attack sequences. The normal site build and tests need no companion checkout. Lesson assignments select a setup in `curriculum.ts`; drill links are mapped in `los.ts`.

## Regenerating monster sprites

The runtime uses local WebP sheets (about 460 KB total), with no 3D renderer dependency. To re-render the game models, use the separate optional asset-preparation tools:

```sh
npm ci --prefix scripts/monster-sprites
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node scripts/monster-sprites/render.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node scripts/monster-sprites/render-projectiles.mjs
npx prettier --write src/lib/monsterSprites.json docs/monster-models.json docs/projectile-models.json
```

The script downloads six public model files to a temporary directory, captures the source attack clips at 20 fps with a fixed camera, and records their URLs and hashes. The projectile exporter captures four additional game models as compact static sprites. Normal development, builds and tests do not need these tools or source models.
