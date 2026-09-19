# Verification — 18 September 2026

- `npm test`: 83 passing tests. Includes all 20 intended drill techniques, independent attack schedules, all four blob scan phases, bad two-tick alignment, conservation false positives, mitigation exposure, Jad check delay, finite supplies and saved progress.
- `npm run test:production`: static Astro build/check passed with no diagnostics; all 44 Playwright tests passed against the built preview. Every drill completed through the visible controls. Coverage includes mistakes, mastery persistence, corrupt/blocked storage, mouse prayer toggles, Esc/F1 defaults, saved tab keys and collision swaps, knowledge checks, bookmarkable lesson links, troubleshooting shortcuts, filters, mobile layout and pause behaviour.
- Real-clock production run completed 36 ticks plus count-in in approximately 23.9 seconds. Other timing tests use a controlled browser clock to check specific boundaries without flaky mouse scheduling.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `git diff --check`: passed.

## Chrome DevTools session

Used the official Chrome DevTools MCP in an isolated Chromium session. The preconfigured connection closed its target; an isolated MCP server made the same DevTools tools available without changing user configuration.

- Clicked through Learning path and tested an incorrect knowledge answer followed by the correct answer.
- Inspected the desktop chapter layout and the persistent, prominent LoS link.
- Played the two-tick repair drill at wall-clock speed through DOM button clicks driven by DevTools, without advancing a fake clock or editing engine state. Used the old phase for the first 12 ticks, then the corrected hold: 81%, 34/42 checks correct, ending with a 28-check clean streak. Both early blob attacks were reported as exposed; later attacks were protected.
- Resized to 390 × 844 and inspected the mager trainer: prayer controls remained visible with the tick bar and attack countdown, with no horizontal page overflow.
- Tested the built production phase lab: two-tick M/M/R/R with the second-tick blob read showed 0/2 protected; shifting to M/R/R/M showed 2/2. Reviewed screenshots on mobile and desktop. The mobile table scrolls inside its container.
- Played a guided run with the updated defaults: Esc opened Inventory and F1 returned to Prayers, without pausing.
- Checked the production browser console: no warnings or errors.

A production-only saved-tab-key race was found and fixed: keys are read on trainer creation and the key listener is attached before paint. The final full production suite includes the reload-and-immediate-key test and passes.

Screenshots and raw DevTools output are temporary verification artifacts, not shipped game assets. The app remains a timing/decision trainer. The later monster-animation update below adds rendered game-model attack clips; full pathfinding, damage, HP/stat arithmetic and Zuk shield simulation remain in the linked companion tools.

## Guide and layout review

- Six additional source-linked decision lessons bring the course to 28 lessons; all 20 timing drills still pass through their visible controls.
- Chrome DevTools: inspected the revised overview and course at 1440 × 1000 and 390 × 844. The mobile overview, expanded troubleshooting entry and directly opened weapon-drag lesson had no horizontal overflow.
- Followed the production Zuk shortcut and confirmed the destination heading receives focus. Clicked an incorrect set-targeting answer, then the correct answer; feedback and saved state updated as expected. No browser warnings or errors.
- New browser regressions cover a troubleshooting-to-lesson link, reload with a retained answer, a troubleshooting-to-drill link, mobile chapter contents, end-of-wave preparation and the Zuk set check.
- Production build/check: no diagnostics. Full suite: 47 unit tests and 35 browser tests pass, including the real-clock 600 ms drill and saved Esc/F1 tab bindings.

## Site preferences and guided-to-challenge flow

- Settings is a general navigation page. Inventory/Prayer keys, default practice mode, tick sound and volume apply to every drill and persist locally. Existing tab-key saves are migrated; malformed values fall back safely. Restoring preferences preserves learning progress.
- Removed keybind and sound configuration from individual trainers. Chrome DevTools confirmed actual audio context startup from the Start button and a gain of 0.0175 at 25% volume. Inspected Settings at desktop and mobile sizes; no console warnings or errors.
- Guided results make **Start challenge** the primary action, explain the mode difference, and begin a fresh count-in in one click. **Repeat guided practice** remains available. The results scroll into view; starting the challenge returns focus to the practice panel.
- Browser regressions cover saved preferences across reloads and different drills, old keybind migration, default reset without lost scores, blocked storage, and completing guided practice followed immediately by a challenge that earns exactly one pass. The new challenge action is checked in the mobile viewport.
- Final full verification: 55 unit tests, 38 production browser tests, and a clean Astro check/build.

## Contextual LoS links

- Generated and simulator-validated 19 share links, covering all 10 spatial assignments and 17 non-boss drill companions. The ordinary build remains independent of the companion checkout.
- Chrome DevTools loaded every link on `https://los.inferno.tips/`: all 19 had the expected enemy roster and no import errors.
- Played the hidden-blob scene: selected Magic and stepped three times; the blob hit was protected on tick 3 while zero enemies could see the player.
- Played the pillar stack: moved two tiles south, selected Magic for tick 1 and Ranged for tick 2; the back mager and front ranger attacked in that order and both hits were protected.
- New browser coverage checks every lesson assignment’s scene URL, the overview’s direct blob-scene link, and representative single-blob, stack and double-blob drill links. Unit coverage requires a prepared scene for every non-boss drill.
- Inspected the blob assignment at 390 × 844: setup description, instructions and link fit without horizontal overflow; the hydrated page had no browser warnings or errors.

## Guided prayer preview

- Guided practice displays the next six ticks above the prayer controls, with prayer icons, click/hold actions, a next-tick highlight and blob/supply/movement reminders. Challenge mode hides it. Jad keeps cue-based guidance and the weapon drill has no invented prayer cycle.
- All 17 prayer-pattern previews lead to correct full runs when followed through the scoring engine. Additional unit checks cover real blob reads, queued-attack conflicts, off–on flicks and the end of a run. Forecasting leaves the running state unchanged.
- Browser regression covers initial two-tick holds, advancement, pause, off–on labels, challenge hiding and mobile width. Inspected the six-column table in Chrome DevTools at 390 × 844; all columns fit, with the prayer controls visible below, with no page overflow or console errors.
- Chrome DevTools live run: followed the two-tick preview through visible prayer buttons at real game speed, reaching tick 10 with 100% accuracy (12 checks); paused with tick 11 highlighted next.

## Stable preview dimensions

- The preview keeps six column slots as the run ends; unused slots are blank. Prayer icons and action notes reserve row space to keep the controls below steady.
- Production build/check passed with no diagnostics. Both guided-preview browser tests passed, including measured column width and table height on every tick through tick 35 at desktop and mobile widths (1280 and 390 px).

## Visible monsters and attack animations

- Added locally rendered attack clips for mager, ranger, blob (both ranged styles), bat, melee and Jad. All 19 prayer drills show their full monster roster; movement drills retain their tile grid beside the monsters. The weapon-only drill retains its shoot/step task.
- Enemy events distinguish physical attacks from pattern checks and blob prayer reads. Unit tests check four-tick anchors, three-tick bats, delayed blob attacks from actual reads, separate second-blob phases and each Jad’s cue/check pair.
- New browser coverage confirms mager attack and blob read on tick 1, the delayed blob hit, changing animation frames, frozen playback during pause, resumed playback, clean reset, visible enemies without countdown hints in challenge mode, mobile layout, and three independent Jads.
- Re-ran the standalone sprite generator successfully from the checked-in scripts. The normal build and runtime do not depend on its Three.js/Sharp tools or the source models.
- Final production checks passed for mobile layout, the mager cue, mixed movement attacks/pause, and triple Jad after the final sprite-render optimization and layout adjustment. Astro check reported no errors, warnings or hints.
- Chrome DevTools live mobile run: followed the gauntlet through tick 10 at real 600 ms timing with 100% accuracy. Observed mager attacks on 1/5/9, blob reads on 1/7 and blob attacks on 4/10; paused animation frames froze. No horizontal overflow or browser console errors.

## Homepage Zuk banner

- Replaced the small blob illustration and plain heading with official Jagex Zuk artwork, a shorter introduction and responsive desktop/mobile crops. Optimized local WebP sources are approximately 106 KB and 38 KB.
- Chrome DevTools screenshots reviewed at 1440 × 1000 and 390 × 844: Zuk and the heading remain legible, the next-drill action follows directly below, and the page has no horizontal overflow.
- Production build/check passed without diagnostics. Existing overview/artwork/credits, troubleshooting navigation and LoS-link browser checks all passed.

## Monster facing correction

- Compared all six models at eight camera-relative angles. The original 135° rotation showed their backs; a 30° rotation shows their faces and keeps attack movements visible.
- Regenerated all 14 idle/attack sheets and visually reviewed sampled frames from every clip. Frame counts and animation durations are unchanged.
- Chrome DevTools confirmed the corrected mager/blob sprites in the desktop drill and advancing attack frames on mobile, with no horizontal overflow or console errors.
- Production build/check and the three existing mager-cue, mixed-movement animation/pause, and triple-Jad browser tests passed.

## Game-style player controls and prayer sounds

- Moved the prayer/inventory panel beside the encounter on desktop, using original Jagex panel artwork and the five-column prayer layout. Protection prayers retain their game positions and toggle highlights; other prayers are dimmed. Instructions and companion links sit below the trainer, and run controls are in its top toolbar.
- Inventory uses 28 fixed slots. Food disappears from the clicked slot after an accepted action; potions retain per-bottle doses. Rejected cooldown clicks preserve items. Tab switching, pausing and resetting preserve or restore the appropriate state.
- Added the six original protection-prayer on/off clips, served locally. Prayer audio is enabled by default with separate site-wide mute and volume settings. Tab changes and automatic resets are silent; old preference saves receive the new defaults.
- Reviewed Chrome DevTools screenshots at 1440 × 1000 and 390 × 844. Mobile puts the guided cycle above the encounter and stacks the game panel below, retaining 46 px prayer targets and avoiding horizontal page overflow.
- Played a real-time eating sequence in Chrome: Magic on for tick 1, off afterwards, Esc to eat the shark in slot 5, then F1 back to prayers. At tick 2 the run had 100% accuracy, slot 5 was empty and eight sharks remained. Captured actual audio buffer starts for distinct activation/deactivation clips; no console warnings or errors.
- Production build/check passed without diagnostics; 84 unit tests and all 46 browser tests passed. New regressions cover right-side layout, protection positions, individual inventory slots, rejected cooldown actions, potion doses, resets, mobile target size, real audio playback, saved volume and mute.

## Prayer activation circles

- Replaced the translucent overlay with the original 34 px game highlight sprite behind a transparent protection icon. The icon retains its original colours.
- A prayer switch lights the new circle immediately and keeps the old circle until the shared game tick. Explicit off clicks clear their own circle; scoring still uses only the selected prayer. Count-in ticks reconcile highlights, pause freezes them, and a new run clears them.
- The browser regression switches 100 ms into a tick, checks both circles at 599 ms, and confirms only the selected circle at 600 ms. It also covers tab switching, off/on clicks, pause/resume and restarting.
- Production build/check and five relevant browser tests passed, including full alternation and one-tick flick challenges, player controls, prayer audio and the new highlight test.
- Chrome DevTools: inspected the original sprite on mobile and observed Magic and Ranged lit together after switching, then only Ranged after the next tick. No console warnings or errors.

## Overheads, projectiles and player hitsplats

- Overhead protection changes on the shared tick, including countdown ticks and the movement-grid player. Clicking another prayer within a tick keeps the current overhead until that tick completes.
- Physical enemy attacks record their protected/unprotected outcome once. Projectiles and hitsplats use that recorded result, so switching prayer during flight cannot change the landing feedback. Blob reads and quiet pattern checks do not create hits; mitigation drills can correctly show an unprotected secondary attacker.
- Added original red/blue hitsplat sprites and local renders of mager, ranger and Jad projectiles. Ranger volleys use two shots; Jad's ranged rocks fall toward the player. Blob and bat use simplified coloured orbs. Melee creates a hitsplat without a projectile.
- Blue zero means protected; red 1–18 numbers are labelled simulated damage. These are illustrative feedback numbers without HP, armour or combat-roll simulation. Compact-screen flight times are presentation delays and do not alter prayer-check timing.
- Effects follow the player, separate enemy hitsplats into distinct positions, freeze on pause and clear on reset. Reduced-motion mode omits projectile travel and shows impacts on tick updates.
- Chrome DevTools: observed live projectiles and red impacts on desktop; inspected paused projectile and blue-zero frames at 390 × 844 with the pause overlay temporarily hidden. The overhead and hit align with the player, with no horizontal overflow or console warnings/errors.
- Production build/check passed without diagnostics; 88 unit tests passed. All 48 browser tests passed across batches, including every full challenge, real-clock timing, projectile pause/resume, immutable hit outcomes, overhead tick boundaries and movement. The active-prayer label follows the committed overhead rather than a pending click.

## Site correctness and usability review

- Reviewed homepage, course, drill library, settings and trainer in Chrome DevTools at desktop and 390 × 844 mobile sizes. No horizontal overflow or console warnings/errors were observed in the reviewed views.
- Added bookmarkable section/drill routes and descriptive return destinations. Three browser regressions cover refresh/history, returning to the originating lesson, and keeping mobile Pause, enemy cues and prayer buttons in view.
- Kept run controls visible while scrolling. Played two-tick alternating through visible prayer controls using the real browser clock: tick 12, 14 correct checks, 100%, followed by pause. This verifies interaction behavior, not first-time learner comprehension.
- Spot-checked blob timing and single/triple Jad cadence against the Wiki, reviewed the existing research boundaries, and clarified prayer-check versus projectile-impact wording.
- Lighthouse snapshots exposed a skipped drill-card heading level, an invalid ARIA label on the effects container, a home-button name mismatch, and a skipped heading level in the paused state. Corrected these semantics. Snapshot audits are limited automated checks, not a complete accessibility assessment.
- `npm test`: 88 passing tests. Astro check/build: no diagnostics. Nineteen relevant production browser tests passed, including guided-to-challenge, settings, contextual LoS links, navigation, mobile controls and real-clock timing. Seven relevant tests passed again after the main semantic fixes; the real-clock run completed in 24 seconds including count-in.
- Remaining design priorities and review limits are recorded in `docs/site-review.md`.
- Final production Lighthouse snapshots for the drill library and paused trainer both reported accessibility 100 with no failed audits. Confirmed the paused heading and inspected the underlying report results, including the previously unscored name mismatch.

## Food and potion feedback

- Added original eating (2393) and drinking (2401) sounds. Audio is prepared on the item click and plays only when the engine accepts consumption on a tick. Rejected cooldown clicks, resets and empty vials are silent.
- Potion slots use the corresponding one-, two-, three- or four-dose sprite. The last dose leaves an empty vial. Food clears its clicked slot; inventory totals show remaining food/doses. New food/potion audio preferences live in Settings and migrate older saves with defaults.
- The new browser regression consumes both brew bottles and all restore doses, checks every sprite transition, exhausted vials, rejected cooldown clicks, pause, reset, food removal/counts, distinct decoded eating/drinking clips, volume and mute persistence.
- Chrome DevTools real-time run: consumed both doses in the second brew bottle. Observed the one-dose sprite, then the empty vial; two native audio buffer starts used the drinking clip. Other bottles were unchanged, the dose total fell from six to four, and no horizontal overflow or console errors/warnings were found. Reviewed the desktop inventory screenshot.
- `npm test`: 89 tests passed. Astro check/build: no diagnostics. All seven relevant production browser checks passed across the initial batch and focused rerun, including complete food/potion challenges and existing prayer audio. The new test's duration tolerance allows browser Vorbis decoder padding.

## Stable challenge start

- Removed the scheduled encounter scroll from ordinary starts and the competing scroll calls in the results actions. Starting in the trainer focuses it with `preventScroll`; starting from results returns to the trainer once after the results are removed.
- Kept the mode description and mobile toolbar layout in place during count-in/running. Disabled scroll anchoring within the trainer so the sticky toolbar does not introduce a one-pixel viewport adjustment.
- Four regressions assert identical scroll position, encounter position and control position before/after guided and challenge starts at 1440 px and 390 px, through the count-in. The results-to-challenge and manually scrolled mobile-control tests also pass: six production browser tests total. Astro check/build passed without diagnostics.
- Chrome DevTools real-clock challenge: desktop scroll stayed at 278 px and both encounter/control top positions remained 309.421875 px through count-in; trainer retained focus. Mobile likewise retained its scroll and control positions. No console errors or warnings.

## Guided-only enemy highlights

- Attack and blob-read outlines/backgrounds now appear only in guided practice. Challenge mode retains the monster animations without the coloured container highlight.
- Production build/check passed. The mixed-enemy browser regression confirms guided highlights, then starts a challenge and checks transparent borders/backgrounds during an actual mager attack and blob read while the attack animation plays.

## Blowpipe attack-and-move redesign

- Replaced the abstract attack button and instant movement with a clickable target and seven-tile running lane. Ground orders persist, running covers at most two tiles per tick, and retargeting stops movement and resumes automatic attacks. The two-tick weapon cooldown follows the last shot, including recovery after a missed attack tick.
- Guided practice marks the next step; challenge mode removes that suggestion. Both show shots, completed lengths and lost attack ticks. Removed unrelated prayer/inventory controls from this drill. The target stays in range; damage, shield movement, obstacles and full game pathfinding are outside this focused exercise.
- All 94 unit tests passed. Five relevant production browser checks passed, covering complete blowpipe, movement and gauntlet challenges, guided-only enemy highlights, persistent movement, last-click orders, cooldown recovery, pause/reset, projectiles and mobile layout.
- Chrome DevTools: reviewed desktop and 390 × 844 mobile screenshots. Played 12 ticks using the real browser clock: six shots, two lengths, no lost attack ticks and 100% accuracy. No horizontal overflow or console warnings/errors were observed. Mobile lane targets remained at least 40 px wide.
- Final Astro check/build passed with no errors, warnings or hints.

## Independent client prayer circles

- Researched the archived client prayer click/render scripts, separating local per-icon highlight bits from tick-committed protection. Corrected rapid repeat clicks on a still-lit previous prayer; accessible pressed states now follow the displayed circles. Added a short explanation to the alternating lesson and documented the source age and network-timing limits in `docs/research.md`.
- Eight production browser checks passed: complete one-tick alternating and conservation drills, normal toggles/settings, prayer audio, shared-boundary circles, independent repeat clicks in guided and challenge modes, and overhead/hitsplat timing. New cases verify that three local circles can briefly be lit, each can be toggled independently, reconciliation restores one circle, and intermediate highlights do not count as simultaneous protection.
- Chrome DevTools with the real clock showed Magic and Ranged lit together while the committed overhead remained Magic; after resuming for a tick, only Ranged remained lit and the overhead changed to Ranged. Reviewed the desktop screenshot. No console warnings or errors.
- All 94 unit tests passed. Astro check/build passed without errors, warnings or hints.

## Full-tick protection display and prayer-book artwork

- The committed protection remains visibly lit for the full tick in which it applies, including through an off–on flick. Local highlights can overlap it, while scoring and overheads still use one committed protection. Extended guided/challenge regressions cover a click at 599 ms, an off order held through the following tick, and exact boundary clearing.
- Replaced the baked-in prayer screenshot, inventory-texture button patches and circular dimming masks with 29 transparent prayer icons over one continuous panel. Only the unused icons are dimmed. Removed the obsolete screenshot asset and footer mask; original sprite provenance is recorded in `THIRD_PARTY.md`.
- Retrieved RS Mina's reference video and captions; reviewed the 23–26 second switching sequence frame by frame. Source observations and presentation limits are recorded in `docs/research.md`.
- Chrome DevTools real-clock play confirmed that Magic stays lit after an off click while its overhead remains active, and that switching to Ranged shows both circles. Reviewed the desktop screenshot. The DevTools connection stalled during mobile resizing; a separate Chromium/Playwright review confirmed all icons loaded and no horizontal overflow at 390 × 844, with no page errors. Reviewed that mobile screenshot too.
- All 94 unit tests and nine relevant production browser tests passed, including full alternating/conservation challenges, prayer audio, inventory controls, tick highlights and overhead/hitsplat checks. Astro check/build passed without diagnostics.

## Prayer timing before starting a drill

- Fixed the confirmed pre-start discrepancy: ready/results screens used immediate single-selection highlights because only running/countdown states had a tick clock. The prayer book now has a silent 600 ms display clock outside runs, using the same local highlights and committed overhead as the trainer. Starting a run clears the preview and replaces that clock; pausing still freezes tick reconciliation.
- Added a browser regression that switches before Start at two different offsets within a tick. The new prayer lights immediately, both circles remain until the existing boundary, and only the new circle remains afterwards. The encounter stays at tick zero with unchanged statistics. Existing tab-key coverage now checks pre-start overlap too.
- All 94 unit tests and nine relevant production browser tests passed. Astro check/build passed without diagnostics.
- Chrome DevTools real-clock pre-start check: Magic lit immediately with Active still None, switching showed Magic + Ranged with Active Magic, then the next tick showed only Ranged with Active Ranged. Statistics were unchanged and Start remained available; no console warnings/errors.

## Alternating accuracy and a stable game clock

- Reproduced a real timing defect before the fix: a fixed 600 ms click rhythm scored 38%, while tick 1 → tick 36 accumulated 237 ms of extra scheduling/render time. Each timer had been started after the previous render. This reproduces an unfair low score, not the user's unavailable 31% click trace; the user reported following circles.
- Countdown/run timers now use absolute 600 ms deadlines. The bar fills to the same deadline; prayer/tile inputs are captured once per tick for both the display and scoring. Long stalls still pause, and resume establishes a fresh interval.
- Two full real-clock production regressions passed: fixed-cadence clicking and selecting whichever prayer circle just cleared, both 100%. Both assert tick 1 → tick 36 remains within 100 ms of the intended 21 seconds, which fails the observed old clock.
- Independent Chrome DevTools circle-following run: 36 ticks, 100%, tick 1 → tick 36 measured 20,998.8 ms, with no console warnings/errors.
- Clarified the first switch beside the prayer book and in the lesson: hold Magic through tick 1's mager attack, then Ranged. Added specific feedback for a consistently alternating but reversed phase; the unit regression confirms that this still scores 14%, rather than silently accepting the wrong protection.
- All 95 unit tests passed. Astro check/build passed without errors, warnings or hints.
- Fifteen further production browser checks passed: complete alternating, movement, food, conservation, triple-Jad and blowpipe runs; paused-run credit; hidden-tab/stall handling; results-to-challenge reset; prayer/overhead timing; and stable starts on desktop/mobile. Together with the two real-clock regressions, 17 browser checks passed.

## Colosim SDK prayer input and sound timing

- Compared the SDK's click controller, prayer panel, per-prayer state, world clock and player tick at commit `04fdaee3d155238e54cf16c1ac259f6c2b210078`. Prayer panel presses bypass its delayed world-action queue. Primary pointer presses now register immediately rather than waiting for release; keyboard/assistive clicks remain supported without a second pointer toggle.
- Prayer sound flags now accumulate on presses and play on the shared game tick, with at most one off/on pair per prayer per tick, in that order. Presses unlock/decode audio; resets discard pending sounds and pause freezes their delivery. Existing volume and mute settings remain covered.
- Removed the extra committed-overhead highlight hold introduced in the earlier full-tick display change. Each local circle now toggles immediately on its own press; switching to another prayer can leave both lit until reconciliation. The overhead and scoring continue to use the single protection committed on the tick.
- Chrome DevTools comparison: on the live SDK's wave-one 2D view with audio enabled, a held Magic press activated protection and played the native activation clip before release. On our idle prayer book, the circle lit immediately, the overhead committed and audio started 268 ms after the press at the next tick, and release at 717 ms did not toggle it again. No console warnings/errors were found on our page.
- All 95 unit tests passed. Astro check/build passed without errors, warnings or hints. Thirteen relevant production browser checks passed across batches: normal tab keys, tick audio/coalescing/reset/pause/mute, idle and running circle boundaries, independent local toggles in both modes, overhead/hitsplat timing, complete alternating and conservation challenges, fixed-cadence and circle-following real-clock runs, held mouse presses with keyboard activation, and held touch presses without a release toggle.
- Boundary regressions press 50 ms before a tick and hold through it, confirming that protection counts before release. Both full real-clock alternating runs still score 100% with the stable 600 ms deadlines. These checks establish the tested input/feedback ordering, not equivalence with the SDK's entire combat engine or live-game network latency.

## Follow-up: circle overlap remains reported as different

- The user still reports that circle clearing/overlap differs from RS Mina's reference video. This remains unresolved; no further prayer behavior change was made without a reproduced discrepancy.
- Confirmed that both public domains serve the same Academy bundle as the tested production build. Reviewed the reference video at its native 24 fps, including prayer circles and overheads together. The sampled alternating sequence has sustained overlap interrupted by short single-circle gaps.
- Corrected a verification gap: the previous test named “clearing circles” scheduled its reactions from the drill counter, then selected an unlit prayer. It now observes actual circle changes after the initial mager anchor; only the first switch and run completion depend on the counter. A new pre-start regression reads the rendered pseudo-element visibility, uses primary pointer gestures, and follows each cleared circle without encounter hints or a tick counter.
- Both circle-driven production browser checks and the fixed-rhythm regression passed (three checks). The complete running drill scored 100%; the idle check verified sustained overlap with neither prayer unexpectedly disappearing together. This establishes that these interaction sequences work, not that the user's particular mismatch has been reproduced or fixed.
- Chrome DevTools on the public site: twelve consecutive switches driven only by disappearing circles remained stable. With a 100 ms response, circles overlapped for approximately 500 ms of each established 600 ms cycle. A separate recording using browser mouse clicks captured ten consecutive switches with both circles visible after every switch. The recording is a local diagnostic artifact, not a shipped asset.

## Visible prayer-clock phase

- Following clarification that the old circle sometimes seems to clear immediately or too soon, reproduced a near-boundary switch with only 50 ms of overlap. The pre-start circle clock had been running behind a stationary meter. Added a synchronized meter immediately below the prayer book and made the arena meter follow that same deadline in ready, countdown, running and results states.
- Idle ticks now use absolute deadlines, and animation frames only paint the clock's remaining fraction. Clicks still resolve on the existing game tick. Pause freezes the meter; resume establishes the normal full interval. Reduced motion paints quarter-tick steps. Updated the alternating lesson to explain the short overlap from a late switch.
- Extended the pre-start regression to check the visible phase at early/late presses and its reset with prayer reconciliation. Existing real-clock circle-following and fixed-rhythm complete runs still score 100%. All 13 relevant browser checks passed across batches, covering audio, idle/running circles, stalls, all four stable-start cases, mobile controls and blowpipe movement. Fixed an unrelated test setup race by freezing the start-layout tests' clock before loading the page.
- Chrome DevTools on the production build: reproduced an effectively immediate late switch and approximately 550 ms of overlap from an early switch. Both meters showed the same progress. Reviewed desktop and 390 × 844 mobile screenshots; the nearby meter remained visible with the prayer book, without horizontal overflow or console warnings/errors.
- Astro check/build passed without diagnostics; all 95 unit tests passed. The hidden timing cue is addressed. Whether it fully explains the user's reported mismatch remains unconfirmed.

## One tick meter and reliable touch presses

- The user reports that alternating now works much better, but mobile taps sometimes fail. Removed the duplicate arena bar from prayer drills, retaining the smaller clock below the prayer book. Blowpipe practice retains its sole arena meter.
- Reproduced a dropped second-finger press with Chromium's actual CDP touch input before the fix. The primary-pointer guard ignored it while the first finger remained down. Each touch-down is now accepted; mouse/pen filtering and keyboard activation remain intact. A complete 36-tick challenge using overlapping contacts now scores 100%, with both circles visible after each switch and one meter on the page.
- Reproduced a 55 px page shift from finger movement beginning on a prayer button. Restricted native panning/selection/callouts on the protection buttons. The regression now confirms a stationary page during the same gesture and normal scrolling when the gesture begins on unused book artwork.
- All 95 unit tests and 12 relevant production browser checks passed across batches, covering held touches, overlapping fingers, gestures, mouse/keyboard activation, tab settings, idle timing, desktop/mobile start stability, mobile viewport controls and blowpipe movement. The browser fixture was corrected to release the old CDP contact, and an existing mobile-layout test's clock setup race was fixed by freezing it before page load.
- Chrome DevTools mobile/touch emulation at 390 × 844 confirmed one meter, 46 px prayer targets, accepted non-primary touch input, no horizontal overflow and no console warnings/errors. Reviewed the mobile screenshot. Astro check/build passed without diagnostics. These are browser-emulated touch checks, not a physical iPhone/Android test.

## Site identity

- Replaced the generic flame tile with an original vector cape emblem, using an angular silhouette and orange/gold lava detail. Paired it with a compact serif wordmark and a clearer subtitle. The sidebar/mobile header and footer share the same asset; the favicon uses a simplified version with a versioned URL on both pages.
- Reviewed Chrome DevTools screenshots at 1280 px and 390 px, checked the 800 px sidebar fit, and inspected the favicon at 16/24/32/64 px against dark and light backgrounds. Branding stayed within its container, both logo images loaded, and no horizontal overflow or console warnings/errors were found.
- The existing artwork/resources and mobile navigation browser checks passed. Astro check/build passed without diagnostics. No new behavior tests were added for this visual change.

## Finish and retry without scrolling

- Removed the automatic results scroll/focus. Completion is announced without moving focus, and a compact Retry button beside the player controls starts a fresh run in the same mode. Blowpipe has Retry beside its tick cue. Detailed results remain below the trainer.
- Kept the guided pattern table and its header height stable at completion; excluded the trainer page from browser scroll anchoring. Desktop/mobile regressions verify unchanged scroll position and prayer-panel position through finish, Retry and countdown for both modes. The four existing start-position checks and the results-to-challenge flow also pass. Chrome DevTools mobile inspection confirmed the nearby Retry placement.
- Astro check/build succeeds without diagnostics. The companion LoS site also has Retry immediately beneath its prayers; its desktop/mobile finish-and-retry tests and production build pass.

## Flick and Move round scoring

- Each four-tick round awards one point only when both attacks are protected and the player moves to the marked tile by the deadline. Prayer/tile checks remain in the review as feedback; they no longer independently award points or build a streak. Standing still cannot earn a point when a later target matches the starting tile.
- Eight of nine complete rounds passes an uninterrupted challenge. Live points, separate prayer accuracy, round streaks, instructions, result details and saved mastery use the new requirement. Other drills keep their existing pass targets and scoring.
- All 100 unit tests pass, including partial rounds, missed prayer/tile checks, standing still, no prayer, seven/eight-round pass boundaries and guided/paused credit. Five browser checks pass: eight points with one missed tile, seven with a missed tile and prayer, zero with perfect prayer but no movement, a perfect Flick and Move run, and the existing mixed blob/mager/movement run. Saved scores/passes and Retry reset are verified.
- Chrome DevTools mobile inspection confirms the points/rules display fits at 390 px without horizontal overflow or console errors. Astro check/build passes without diagnostics.

## Flick and Move challenge feedback

- Challenge mode now has nine round markers beside the prayer controls, with numbered pending rounds, ticks for completed rounds and crosses for misses. A compact update identifies protected attacks, missed prayers or a missed tile after each completed round.
- The remaining requirement updates during the run: after one miss every remaining round is needed; eight completed rounds secures a pass; the finish distinguishes Passed (8/9) from Perfect (9/9). After a second miss, the player can retry immediately or continue from the current tick as practice. Continuing as practice does not grant a challenge pass or replace the challenge best score. Timing remains 600 ms.
- Six targeted browser checks cover a perfect run, eight/seven-point outcomes, no-movement failure, practice continuation and mobile retry. The continuation check finishes the last seven rounds correctly and saves 78% as practice best, with zero passes and no challenge best. Mobile retry preserves the viewport and prayer positions.
- Reviewed Chrome DevTools screenshots at 1280×1000 and touch-emulated 390×844. The controls and round panel fit without horizontal overflow; no console errors were reported. Astro check/build passes without diagnostics.
