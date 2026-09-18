# inferno-tips

An Astro site for learning Old School RuneScape Inferno mechanics through short, repeatable exercises. Six lessons build from tick rhythm and blob reads to alternating prayers, offset stacks, movement, and a combined challenge.

## Run locally

Use Node.js 22.12 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:4321. The site is static; drills run in the browser and progress is saved locally. No account, API key, or backend is required.

## Cloudflare Pages

Connect `ollieatkinson/inferno-tips` with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `trunk` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave blank |
| Environment variable | `NODE_VERSION=22` |

The repository includes `.nvmrc` with Node 22. No Cloudflare adapter is required because the output is static. After deployment, add `inferno.tips` under Custom domains if desired. The companion wave simulator is linked at https://los.inferno.tips/.

## Exercises

1. **Find your rhythm:** lazy-flick a four-tick mager, including turning prayer off between attacks.
2. **Read the blob:** control the prayer scan and protect against the opposite attack three ticks later.
3. **One tick at a time:** practise alternating Magic and Ranged every tick.
4. **Handle the stack:** protect against a mager and ranger offset by two ticks.
5. **Switch & step:** maintain protection while clicking marked movement targets.
6. **Put it all together:** combine a blob, a mager, and movement targets.

Guided mode runs at 900 ms per tick with hints. Challenges use 600 ms ticks without prayer hints. Two uninterrupted challenges at 90% or higher earn lesson mastery. All lessons remain open for practice. Completed runs show check-by-check feedback, accuracy, and best streak. Progress survives reloads and can be reset with confirmation.

Use the prayer buttons or `1` (Magic), `2` (Ranged), `0` (Off). Click movement tiles or use arrow keys. `Escape` pauses. Keyboard prayer shortcuts are practice aids, not in-game controls. Hidden tabs and long browser stalls pause the exercise; interrupted challenges count as practice.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium installation. Unit tests cover scan/attack timing, prayer patterns, movement scoring, streaks, storage validation, and mastery. Browser tests exercise full runs, persistence, mobile layout, failure feedback, and navigation.

## Sources and limits

The original exercises use game facts from the [OSRS Wiki](https://oldschool.runescape.wiki/w/Inferno/Strategies) and link to [Gnomonkey’s Bowfa Inferno guide](https://www.youtube.com/watch?v=6trKOSUr4EM). They do not reproduce video transcripts or Wiki articles.

This is a focused timing and coordination tool, not a full combat simulator. It does not model damage rolls, prayer drain, latency, gear, pathfinding, Jad, or Zuk. Movement targets are an invented practice task, not an Inferno floor hazard. Scores and mastery are learning milestones, not a promise of a cape.

Game artwork and RuneScape trademarks belong to Jagex Ltd. This is an independent fan project. See [THIRD_PARTY.md](THIRD_PARTY.md) and the site’s `/credits/` page for attribution.
