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
