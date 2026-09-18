# Sources and artwork

RuneScape, Old School RuneScape, and game artwork are © Jagex Ltd. This fan-made tool is not affiliated with or endorsed by Jagex. No ownership of game assets is claimed.

The following files are served locally, copied from the adjacent `inferno-los` project with its recorded provenance:

- `public/icons/protect-magic.png`, `protect-range.png`, `protect-melee.png`: [Protect from Magic](https://oldschool.runescape.wiki/w/File:Protect_from_Magic.png), [Protect from Missiles](https://oldschool.runescape.wiki/w/File:Protect_from_Missiles.png), [Protect from Melee](https://oldschool.runescape.wiki/w/File:Protect_from_Melee.png) via the OSRS Wiki.
- `public/icons/blob.png`, `mager.png`, `ranger.png`, `bat.png`, `melee.png`, `healer.png`, `nibbler.png`: Jagex artwork via [OldSchoolSDK/InfernoTrainer](https://github.com/OldSchoolSDK/InfernoTrainer/tree/06fc103f70f1fa228678ca79910a8d3bb0798a7d/src/content/inferno/assets/images); see its [asset attribution](https://github.com/OldSchoolSDK/InfernoTrainer/blob/06fc103f70f1fa228678ca79910a8d3bb0798a7d/assets.md).
- `public/icons/shark.png`, `brew.png`, `restore.png`: [Shark](https://oldschool.runescape.wiki/w/File:Shark.png), [Saradomin brew](<https://oldschool.runescape.wiki/w/File:Saradomin_brew(4).png>), and [Super restore](<https://oldschool.runescape.wiki/w/File:Super_restore(4).png>) via the OSRS Wiki.
- `public/icons/jad.png`: [JalTok-Jad](https://oldschool.runescape.wiki/images/JalTok-Jad.png) via the OSRS Wiki.
- `public/icons/player.png`: game artwork via [Supalosa/osrs-colosseum](https://github.com/Supalosa/osrs-colosseum/blob/5b1734f06e0580bcc9cb8a0a681c93a13adaf3d3/public/player.png).

Homepage banner:

- `public/images/zuk-banner.webp` and `zuk-banner-small.webp`: resized WebP versions of [TzKal-Zuk artwork](https://oldschool.runescape.wiki/w/File:TzKal-Zuk_artwork.jpg), official Jagex artwork via the OSRS Wiki. Displayed with CSS cropping and text-legibility gradients.

Animated monster sprites:

- `public/monsters/*.webp`: Jagex NPC models and attack animations distributed by [OldSchoolSDK](https://github.com/OldSchoolSDK/InfernoTrainer/tree/804c23f4e5cd50c1f13e93b502d6893555196769) via `oldschool-cdn.com`. Rendered locally into transparent sprite sheets at 20 fps, keeping each clip’s native duration. [Source model URLs and SHA-256 hashes](docs/monster-models.json) record provenance. Attack clip indices follow that pinned trainer’s `JalZek`, `JalXil`, `JalAk`, `JalImKot`, `JalMejRah` and `JalTokJad` implementations. Renderer and regeneration instructions: `scripts/monster-sprites/`.

Additional local interface assets:

- `public/icons/inventory.png`: [Inventory tab icon](https://oldschool.runescape.wiki/w/File:Inventory.png), Jagex artwork via the OSRS Wiki.
- `public/icons/prayer.png`: Prayer skill icon, Jagex artwork via [RuneLite](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/resources/skill_icons/prayer.png).

The application code, course, CSS illustration, and feedback text are original. Mechanics references: [OSRS Wiki Inferno strategies](https://oldschool.runescape.wiki/w/Inferno/Strategies). Video sources: [Hug my cat’s two-tick guide](https://www.youtube.com/watch?v=zTQdupqm-lM), [Gnomonkey’s Golden Trio guide](https://www.youtube.com/watch?v=2xviK0wGI-o) and [dearlola1’s 2026 guide](https://www.youtube.com/watch?v=r3s4rbTd4QU), linked with timestamps without implying endorsement. Caption research and the lesson coverage map are documented in [docs/research.md](docs/research.md); transcripts and video frames are not published here. Companion positioning tool: [Inferno LoS](https://los.inferno.tips/).

DM Sans and Manrope fonts are loaded from Google Fonts under their respective open font licenses. npm packages retain their upstream licenses; exact dependencies are recorded in `package-lock.json`.

Supply timing references: [Food/Fast foods](https://oldschool.runescape.wiki/w/Food/Fast_foods) and [Potions](https://oldschool.runescape.wiki/w/Potions). The three-brew/one-restore practice sequence follows the common example in [Fight Cave strategies](https://oldschool.runescape.wiki/w/TzHaar_Fight_Cave/Strategies); real stat restoration is not simulated.

Game panels and prayer audio:

- `public/game-ui/prayer.png` and `inventory.png`: original Jagex panel artwork distributed by [OldSchoolSDK](https://github.com/OldSchoolSDK/osrs-sdk/tree/04fdaee3d155238e54cf16c1ac259f6c2b210078/src/assets/images/panels). The trainer overlays accessible protection-prayer buttons in the original five-column positions and a four-column, seven-row inventory. Unused prayers are dimmed; the baked-in prayer point counter is covered because drills do not model drain.
- `public/sounds/{mage,range,melee}-{on,off}.ogg`: the corresponding `mageOn`, `mageOff`, `rangeOn`, `rangeOff`, `meleeOn`, `meleeOff` Jagex sound effects from [OldSchoolSDK at the same revision](https://github.com/OldSchoolSDK/osrs-sdk/tree/04fdaee3d155238e54cf16c1ac259f6c2b210078/src/assets/sounds). Its README records extraction from the game cache. The [protection-prayer implementations](https://github.com/OldSchoolSDK/osrs-sdk/tree/04fdaee3d155238e54cf16c1ac259f6c2b210078/src/content/prayers) identify each activation/deactivation pair. These are served locally without modification.
