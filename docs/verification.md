# Verification — 18 September 2026

- `npm test`: 77 passing tests. Includes all 20 intended drill techniques, independent attack schedules, all four blob scan phases, bad two-tick alignment, conservation false positives, mitigation exposure, Jad check delay, finite supplies and saved progress.
- `npm run test:production`: static Astro build/check passed with no diagnostics; all 41 Playwright tests passed against the built preview. The preview test passed again after the final mobile CSS adjustment. Every drill completed through the visible controls. Coverage includes mistakes, mastery persistence, corrupt/blocked storage, mouse prayer toggles, Esc/F1 defaults, saved tab keys and collision swaps, knowledge checks, bookmarkable lesson links, troubleshooting shortcuts, filters, mobile layout and pause behaviour.
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

Screenshots and raw DevTools output are temporary verification artifacts, not shipped game assets. The app remains a timing/decision trainer: exact game animation recognition, full pathfinding, damage, HP/stat arithmetic and Zuk shield simulation are practised in the linked companion tools.

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
