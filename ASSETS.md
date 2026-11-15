# Pixel Fantasy Arena asset register

All four fighter packs were downloaded as original ZIP files via the official free download flow on itch.io. The ZIPs are preserved in [vendor/luizmelo](vendor/luizmelo) outside Vite's public directory. Each pack is by LuizMelo and its official page lists **CC0 1.0 Universal**. Hero Knight, Martial Hero, and Martial Hero 3 also include a license notice inside their ZIP. Wizard Pack's license is listed on its source page.

| Fighter | Pack | Status | Native frame size | Native animation frames |
| --- | --- | --- | --- | --- |
| Kael | [Hero Knight](https://luizmelo.itch.io/hero-knight) | Downloaded / Integrated | 180 × 180 | Idle 11, Run 8, Jump 3, Fall 3, Attack 1 and 2 each 7, Hit 4, Death 11 |
| Ren | [Martial Hero 3](https://luizmelo.itch.io/martial-hero-3) | Downloaded / Integrated | 126 × 126 | Idle 10, Run 8, Jump 3, Fall 3, Attack 1/2/3 with 7/6/9, Hit 3, Death 11 |
| Aria | [Wizard Pack](https://luizmelo.itch.io/wizard-pack) | Downloaded / Integrated | 231 × 190 | Idle 6, Run 8, Jump and Fall each 2, Attack 1 and 2 each 8, Hit 4, Death 7 |
| Darius | [Martial Hero](https://luizmelo.itch.io/martial-hero) | Downloaded / Integrated | 200 × 200 | Idle 8, Run 8, Jump and Fall each 2, Attack 1 and 2 each 6, Hit 4, Death 6 |
| — | [Fantasy Martial Characters](https://luizmelo.itch.io/fantasy-martial-characters) | Requires Authorization | — | Paid pack with a listed USD 5 minimum. The four free packs above cover the roster. |

The frame counts above come from the downloaded PNGs. Aria's idle and Darius's jump and fall counts differ from the itch.io descriptions. Darius's and Ren's original sprites wield swords.

## Animation composition and fallbacks

- Walk and dash reuse run with separate playback rates. Landing uses fall. Victory uses idle. Knockdown uses death and recovery uses hit.
- Guard uses a dedicated four-frame sequence assembled from the first two native weapon wind-up frames. The renderer adds a defensive lean, guard arc and block-impact feedback. Crouch uses a two-frame weapon-ready pose with a grounded lean. These are documented pose-based fallbacks, because the downloaded packs have no dedicated guard or crouch drawings.
- Low, forward, retreating and aerial variants use native attack frames with distinct frame data, movement, hit levels and effects. Their pixels remain the source artist's work.
- Each ultimate has a distinct ordered native attack sequence. Kael combines alternating slashes, Ren uses attack 3 and fast slashes, Aria combines casting attacks, and Darius uses a heavy wind-up and strike. The engine synchronizes these sequences with distinct active windows, VFX and synthesized sound.
- The combat upgrade adds three distinct ultimates per fighter: projectile/cross/tempest for Kael, rush/clones/shadows for Ren, burst/rain/field for Aria, and crusher/travelling ground chain/area finisher for Darius. Move animations have unique registry keys and combine existing native clips; no new character drawings are claimed.
- Portraits are crops from idle sheets. The original Ren and Darius sprites wield swords. Their requested dagger/axe choreography would require new character artwork.

## Font

Noto Serif is bundled locally with full Vietnamese glyph coverage, loaded before Phaser starts, and rendered as NFC text without letter spacing in localized UI. Copyright belongs to The Noto Project Authors. The font uses SIL Open Font License 1.1, included at public/assets/fonts/OFL.txt. Official source is [Google Fonts Noto Serif](https://github.com/google/fonts/tree/main/ofl/notoserif).

## Rebuild the fighter assets

Run `pwsh -NoProfile -File tools/prepare-fighters.ps1` on Windows. The script expands the original ZIPs, validates per-pack frame dimensions and transparent bounds, crops shared padding, and exports an atlas PNG, a portrait PNG, and Phaser atlas metadata for each fighter. It keeps the source pixels and aligns the fighter using the first idle frame's base. The script writes contact sheets to `vendor/luizmelo/previews` outside production.

To replace or add a pack, register its ZIP, path, native frame size, and clip mapping in the script. Add the fighter definition and move data in `src/data`, regenerate the atlases, and run `npm test`. The Phaser loader registers clips from each fighter's local metadata.

The arena layers, menus, supplemental effects and music are built in the game. Their sources are under `src/game`. There are no runtime dependencies on itch.io.



## Combat effects and audio (2026-11-16)

- **RPG Sound Pack**, artisticdude, CC0: https://opengameart.org/content/rpg-sound-pack
  Original archive: vendor/rpg-sound-pack.zip. Seven selected WAVs are bundled in public/assets/audio: swing, swing2, swing3, magic1, spell, sword-unsheathe, metal-ringing. AudioContext decodes them once, uses the existing effects volume/mute bus, and varies ultimate pitch by tier. Synthesized accents remain for impact weight and character motifs.
- **Weapon Slash – Effect**, Cethiel, CC0: https://opengameart.org/content/weapon-slash-effect
  Original Classic.zip is retained as vendor/cethiel-slash.zip. All 30 transparent frames are packed without redrawing into public/assets/effects/slash.png and slash.json. Native dimensions fit 128 × 160 cells. Rebuild with pwsh -NoProfile -File tools/prepare-effects.ps1 after extracting the archive into vendor/cethiel-slash.
- Kenney Impact Sounds was researched (https://kenney.nl/assets/impact-sounds), but the download returned HTTP 403/HTML. It is not shipped.
- Beam, rain, ground spikes, barriers and storm paths use procedural effects synchronized to real hit windows. Shadow clones use the actual downloaded fighter atlas, not placeholder rectangles. These supplemental effects permit directional scaling, travel and variable active windows while keeping the original fantasy palette.
- Neither external audio nor VFX requires a network connection at runtime. CC0 sources permit redistribution and modification; source links are recorded here for provenance.
