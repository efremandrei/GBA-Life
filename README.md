# GBA-Life: Kaplan Quest and Petah Map Editor

[Download Kaplan Quest v0.12.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.12.0/KaplanQuest-v0.12.0.apk) · [Download Petah Map Editor v1.4.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.11.0/PetahMapEditor-v1.4.0.apk) · [Download the source ZIP](https://github.com/efremandrei/GBA-Life/releases/download/v0.12.0/KaplanQuest-source-v0.12.0.zip)

![Petah Map Editor on Android](docs/editor_emulator.png)

[Splash screen](docs/preview_splash_v8.png) · [Character chooser](docs/chooser_emulator_v10.png) · [32-tile editor sidebar](docs/editor_sidebar_scrolled_v1.4.0.png) · [Updated grid town](docs/preview_grid_town_v11.png) · [Exit Game menu](docs/preview_exit_menu_v7.png) · [House interior](docs/preview_house_v6.png) · [City sprite sheet](art/town_sprite_sheet_city.png)

An offline, original pixel-art walking game for Android. Explore a stylized part of **Petah Tikva** with a street network based on real map data. Start near Khen Street, collect markers at Khen, Tzahal, and HaTsoarim streets, and reach Kaplan School. The map covers approximately **32.081–32.096° N, 34.858–34.889° E** around the school; it is a game map of this area, not the entire city or a navigation map. Buildings, parks, and characters are decorative interpretations.

## Grid and scale

Version 0.11.0 uses an 8192 x 4608 world on 32px cells. All players and NPCs occupy the same 24 x 32 sprite rectangle, with transparent gutters normalized. Houses occupy 3 x 3 cells (96 x 96px), high buildings 3 x 4, trees 2 x 2, and the school 5 x 4. Every road and NPC route segment is horizontal or vertical. Park and water boundaries are rectangular grid regions. Named streets, landmark geography and road connections come from the stored real map snapshot; diagonal streets become orthogonal turns. This is a stylized geographic adaptation.

The editor shares this map and uses matching object footprints. Its hover outline shows the full stamp; erase its anchor cell to remove it. Imports check the complete footprint against protected quest paths. Older 4096 x 2304 editor drafts and JSON exports convert automatically: positions double, terrain patches expand to four cells, and objects become correctly scaled stamps.

Old game saves retain character designs, markers, Buddy and inventory. Positions convert to the new scale or relocate to the start if blocked. Because houses were regenerated, old room locations and chest identities reset; carried snacks remain. Old map edits that obstruct new quest anchors are kept under the local pre-grid backup key and disabled. Exported originals remain available for revision and re-import.

## Map sources

The design was visually checked against [Google Maps near Kaplan School](https://www.google.com/maps/@32.0898811,34.8696697,16z) to confirm the relationships among Jabotinsky, Kaplan, HaTsoarim, Tzahal, and Khen streets. The reusable road and landmark geometry comes from [OpenStreetMap](https://www.openstreetmap.org/#map=16/32.0899/34.8697), downloaded through Overpass on 2026-10-03 and stored in `data/`. **© OpenStreetMap contributors**, available under the [Open Database License](https://www.openstreetmap.org/copyright). No Google map tiles or screenshots are included in the app.

Run `python scripts/prepare_tile_art.py` and `python scripts/build_town_map.py` with Pillow installed to regenerate the tile atlas, pixel map, collision data, and town geometry. The 16 original scenery tiles remain in [`art/town_sprite_sheet.png`](art/town_sprite_sheet.png). A matching 16-sprite companion, [`art/town_sprite_sheet_city.png`](art/town_sprite_sheet_city.png), adds sidewalk, crossing, high building, bus stop, light rail stop, car, bicycle, tram, slide, swings, gas station, shopping mall, hospital, city hall, traffic light, and bench. Its [generation prompt](art/city_sprite_prompt.md) records the exact grid order and style constraints. Both sheets feed a 32-tile atlas and the editor's grouped, scrollable palette. The map uses a fixed decorative scenery seed; new games generate new people separately. The supplied avatar's beard, blue shirt, and red backpack remain on the player sprite.

The launch flow has a branded splash screen and ten playable presets and a character designer. Andrei is the original supplied avatar. Maya, Amir, and Dana are new four-direction pixel sprites; their [art prompts](art/character_sprite_prompts.md) describe the shared style and each design. The selected character is stored with progress, and older saves without a character selection use Andrei.

The refreshed base map adds walkable sidewalks and crossings, high buildings with rooms, roadside vehicles, playgrounds, and benches. Hospital sites and transit platforms come from the stored OpenStreetMap snapshot; the [NTA Red Line overview](https://www.nta.co.il/en/petah-tikva/) confirms the city's light rail context. Gas stations, shopping malls, and city hall are available in the editor palette for deliberate placement instead of being assigned invented locations. The base street network and quest destinations are unchanged.

The chooser uses equal-width action buttons with a consistent 12px gap. All ten preset boxes are complete; smaller screens scroll the entire card, including custom characters and actions.

## Character designer

Open **Design character** on the chooser, or **Character designer** in the game menu. The game pauses while the studio is open. Change the name, skin, top, trousers/skirt, backpack, hair, eyes, glasses, hairstyle, facial hair, outfit, and accessory visibility. The preview shows four directions and alternating walking poses. **Save character** applies the design; **Add character** creates another entry in the scrollable chooser. Closing without saving discards the draft. Designs persist locally across updates and restarts. Headphones have a color picker and eight choices: None, Over Ear, On Ear, Wired Earbuds, Wireless Earbuds, Neckband, Bone Conduction, and Gaming Headset. They appear in the chooser, preview, and game in every direction. Adding headphones alone retains original character artwork. Older designs default to None.

Defaults: Andrei retains his supplied artwork; Lihi has brown shoulder-length hair and black glasses; Thomas has short black hair, brown eyes, and no facial hair; Emily has long blonde hair, pink glasses, blue eyes, and a pink skirt. Maya, Amir, Dana, Noa, Eli, and Yael provide six more presets. Original Andrei/Maya/Amir/Dana sprites remain until appearance controls are edited; name-only changes preserve their artwork. Edited appearances use the modular pixel renderer shared by new presets and street people. Restore a preset with **Reset to preset**, then **Save character**.

Street people have seeded haircuts, skin tones, outfits, eyes, facial hair, glasses, and backpacks. They face their walking direction and alternate legs. Their appearance repeats when a saved adventure resumes. NPCs mostly stand still. After an initial 12-40 second wait, each occasionally walks one adjacent walkable tile, stands there for 3-8 seconds, and returns to its origin. Subsequent outings are 15-45 seconds apart. NPCs avoid blocked tiles and other reserved home/target cells; walking poses only animate during movement. Resuming a save restores their seeded appearances and origin tiles. Developers can add preset data in `character_design.js` without new rendering code.

[Phone designer](docs/designer_emulator_v9.png) · [Walking poses](docs/preview_walk_cycle_v9.png)

## Play

Install `KaplanQuest-v0.12.0.apk` on Android 8.0 or later. After the splash, choose from ten characters or create your own, then tap **Start adventure**. **Continue saved game** restores the character used in that save. The town view fills most of a phone screen; the translucent D-pad and **A** button sit over its lower corners. Tap **Map** for the overview or **☰** for New game, Import, Original map, Sound, About, and **Exit Game**. New game opens character selection before replacing the current save. Exit Game saves the current position, quest, room, inventory, and battle before closing the Android app. The game also saves when it goes into the background. On a computer, use arrow keys or WASD and E/Enter/Space.

Approach a house entrance and press **A** to go inside. All 240 generated town houses, including the new high buildings, have a furnished room, with a bed that restores Buddy, a chest that can hold a snack, and furniture to examine. Press **A** at the door or use Android Back to leave. Houses placed with Petah Map Editor also open into rooms. Outside, **A** talks to townspeople and examines trees, flowers, lamps, street signs, transit stops, vehicles, playground equipment, hospitals, and the fountain. Around 145 varied townspeople mainly stand on their own grid tiles; each new game randomizes their looks, positions, and dialogue. Two original creature encounters guard route markers. Progress, opened chests, the current room, and the chosen light or dark skin save locally.

Version 0.12.0 keeps package ID `com.efremandrei.kaplanquest` and the original release signing key, increments `versionCode` to 12, and preserves saves from earlier versions. Existing 0.1.0 players are relocated to the Khen Street starting point because the map coordinates changed. The APK has no native libraries and supports arm64 Samsung devices in the supported Android range.

## Edit the map in the separate app

1. Install `PetahMapEditor-v1.4.0.apk` alongside Kaplan Quest. It has its own launcher icon and package ID, `com.efremandrei.kaplanquest.editor`.
2. Scroll the grouped tile sidebar beside the map to choose from 32 terrain, nature, building, transit, and park tiles. Tap or drag over 32 × 32 pixel grid blocks. Select **Hand** to pan, use +/− to zoom, or tap the town overview to jump elsewhere.
3. Changes save automatically on that device. **Undo**, **Redo**, and **Clear edits** are available. The start, school, and marker paths are protected from blocking tiles.
4. Tap **Export map** and save `PetahTikva-Map.json` in Android's file picker. Open Kaplan Quest and tap **Import edited map**, then choose that file. **Original map** removes the imported overlay without deleting the JSON file or game progress.

The JSON is a compact list of changed blocks (`kaplan-grid-v1`). Each changed block is drawn over the original art; road, path, plaza, sidewalk, and crossing blocks become walkable, while grass and decorative blocks block walking. Place house or high-building blocks beside a walkable block to make their interiors reachable. The base street image remains available under the edits. The editor does not modify real map data or the rest of the city. The game checks that the starting point, school entrance, and three markers stay walkable when importing. Existing editor drafts and exported JSON files remain compatible.

The editor's local draft and the game's imported map are stored separately by Android. **Export the JSON file before moving to another device**; installing the editor does not transfer its draft into the game automatically.

## Build and checks

The project uses Java, Android Gradle Plugin 8.6.1, Gradle 8.7, and Android SDK 35. With `ANDROID_HOME` set, run `gradlew.bat :app:assembleRelease :editor:assembleRelease`. A signed release requires private `keystore.properties` and `kaplan-quest.keystore` in the repository root; neither is in Git or the source ZIP. Preserve this key for install-in-place updates to both apps. `scripts/build_town_map.py` regenerates and syncs the base map artwork and editor configuration.

`smoke_test.cjs` checks the splash, four character choices, chosen sprite persistence, phone layout, all house entrances, city interactions, Exit Game saving before Android closes, room persistence, and the game quest. `editor_smoke_test.cjs` checks the 32-tile scrollable side palette, paint/drag, undo/redo, editor persistence, JSON export/import, new crossing collision behavior, and mobile layout. `character_test.cjs` checks ten presets, custom creation, field persistence, saved-character resume, designer pause, and street-person variety. `headphones_test.cjs` checks complete grid rows and equal button gaps at four viewport sizes, all seven headphone styles and colors, original artwork preservation, saved accessories, and v0.9 design migration. `npc_behavior_test.cjs` checks idle timing, all four directions, blocked neighbours, pauses, exact returns, and 120 seconds of live NPC simulation. `grid_town_test.cjs` verifies orthogonal geometry, aligned object footprints, one reachable walking network for all destinations and entrances, uniform character sizing, and map/save migration. These tests use Playwright and Chrome with `NODE_PATH` pointing to a `playwright-core` installation. Android emulator screenshots are in `docs/`.

The encounter creatures, scenery renderer, and game code are original. This project does not package Pokémon names or game artwork and does not yet include creature capture, a party system, or multiple towns.
