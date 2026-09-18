# Site review — 18 September 2026

The desktop site is usable and visually coherent. The Zuk banner, restrained colours and original game controls give it a clear identity. The learning path explains decisions; the drill library provides short, repeatable practice. Mobile reading works, but active practice still asks the user to manage more scrolling than it should.

## Correctness

Reviewed the existing video research and implementation boundaries, then spot-checked the [Inferno strategy reference](https://oldschool.runescape.wiki/w/Inferno/Strategies), [blob mechanics](https://oldschool.runescape.wiki/w/Inferno) and [JalTok-Jad cadence](https://oldschool.runescape.wiki/w/JalTok-Jad). The 600 ms tick, three-tick blob read delay, and eight-/nine-tick single/triple Jad schedules agree with these references. Existing tests cover the phase-dependent two-tick patterns and distinguish conservation from alternating.

Corrected an alternation instruction that called the blob's prayer check “impact”: the projectile lands later. The visual damage numbers remain illustrative, movement remains a coordination exercise, and passing a drill is not proof of readiness for a full encounter. These limits are already explained in the course and credits. This pass is a spot-check and interaction review, not a new frame-by-frame audit of all three source videos.

## Fixed during this review

- Added URLs for each site section and drill. Refresh, bookmarking and browser Back/Forward now retain the destination. Refreshing a drill starts a fresh run; it does not restore an active encounter.
- Replaced “Back to practice grounds” with a return label matching the launch location, including the originating lesson.
- Updated page titles and heading focus when navigating.
- Kept Pause and End run visible while scrolling within an active trainer. Narrow screens show the current mode as a compact label while the mode controls are locked during the run.
- Corrected the drill-card heading level and accessible grouping of encounter controls/effects. The home button uses its visible text as its accessible name.

## Next improvements, in priority order

1. **Mobile guided practice:** the preview, encounter and full game panel cannot all fit together at 390 × 844. Starting a run scrolls to the encounter, leaving the preview above it. Prayer targets, enemy cues and Pause are visible together, but consulting the full upcoming pattern still requires scrolling. A deliberately compact mobile practice layout deserves its own design pass.
2. **Lesson-to-drill access:** related drills appear at the end of each long chapter. Put a specific practice action alongside the relevant lesson so a learner does not have to finish or scroll past several knowledge checks first.
3. **Reduce duplicate guidance:** the mager trainer has an attack cycle, enemy countdown, tick bar, prayer table and coach text. Preserve the useful cues, but decide which belong before a run and which need to remain during it.
4. **Shorten the mobile course introduction:** site navigation and the chapter list occupy most of the first screen. A compact chapter selector could bring the first lesson into view sooner.

These are interaction-review findings. No first-time learner study was conducted; observed test success should not be treated as evidence that newcomers find every technique intuitive.
