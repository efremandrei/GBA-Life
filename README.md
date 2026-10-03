# GBA-Life: Kaplan Quest and Petah Map Editor

[Download Kaplan Quest v0.5.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.5.0/KaplanQuest-v0.5.0.apk) · [Download Petah Map Editor v1.2.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.5.0/PetahMapEditor-v1.2.0.apk) · [Download the source ZIP](https://github.com/efremandrei/GBA-Life/releases/download/v0.5.0/KaplanQuest-source-v0.5.0.zip)

![Petah Map Editor on Android](docs/editor_emulator.png)

[Scrolled tile sidebar](docs/editor_emulator_scrolled_v1.1.0.png) · [Full-height town view on Android](docs/game_emulator_play_v0.5.0.png) · [House interior](docs/preview_house_v5.png)

An offline, original pixel-art walking game for Android. Explore a stylized part of **Petah Tikva** with a street network based on real map data. Start near Khen Street, collect markers at Khen, Tzahal, and HaTsoarim streets, and reach Kaplan School. The map covers approximately **32.081–32.096° N, 34.858–34.889° E** around the school; it is a game map of this area, not the entire city or a navigation map. Buildings, parks, and characters are decorative interpretations.

## Map sources

The design was visually checked against [Google Maps near Kaplan School](https://www.google.com/maps/@32.0898811,34.8696697,16z) to confirm the relationships among Jabotinsky, Kaplan, HaTsoarim, Tzahal, and Khen streets. The reusable road and landmark geometry comes from [OpenStreetMap](https://www.openstreetmap.org/#map=16/32.0899/34.8697), downloaded through Overpass on 2026-10-03 and stored in `data/`. **© OpenStreetMap contributors**, available under the [Open Database License](https://www.openstreetmap.org/copyright). No Google map tiles or screenshots are included in the app.

Run `python scripts/prepare_tile_art.py` and `python scripts/build_town_map.py` with Pillow installed to regenerate the tile atlas, pixel map, collision data, and town geometry. The 16 original scenery tiles in `art/` follow the supplied visual references: lush trees, textured streets, cream houses with colored roofs, and small street details. The map uses a fixed decorative scenery seed; new games generate new people separately. The supplied avatar's beard, blue shirt, and red backpack remain on the player sprite.

## Play

Install `KaplanQuest-v0.5.0.apk` on Android 8.0 or later. The town view fills most of a phone screen; the translucent D-pad and **A** button sit over its lower corners. Tap **Map** for the overview or **☰** for New game, Import, Original map, Sound, and About. On a computer, use arrow keys or WASD and E/Enter/Space.

Approach a house entrance and press **A** to go inside. All 304 generated town houses have a furnished room, with a bed that restores Buddy, a chest that can hold a snack, and furniture to examine. Press **A** at the door or use Android Back to leave. Houses placed with Petah Map Editor also open into rooms. Outside, **A** talks to townspeople and examines trees, flowers, lamps, street signs, and the fountain. Around 145 varied townspeople move along the street paths; each new game randomizes their looks, positions, and dialogue. Two original creature encounters guard route markers. Progress, opened chests, the current room, and the chosen light or dark skin save locally.

Version 0.5.0 keeps package ID `com.efremandrei.kaplanquest` and the original release signing key, increments `versionCode` to 5, and preserves saves from earlier versions. Existing 0.1.0 players are relocated to the Khen Street starting point because the map coordinates changed. The APK has no native libraries and supports arm64 Samsung devices in the supported Android range.

## Edit the map in the separate app

1. Install `PetahMapEditor-v1.2.0.apk` alongside Kaplan Quest. It has its own launcher icon and package ID, `com.efremandrei.kaplanquest.editor`.
2. Scroll the tile sidebar beside the map to choose terrain, trees, flowers, fences, red/blue/teal houses, lamps, a school, market, or fountain. Tap or drag over 32 × 32 pixel grid blocks. Select **Hand** to pan, use +/− to zoom, or tap the town overview to jump elsewhere.
3. Changes save automatically on that device. **Undo**, **Redo**, and **Clear edits** are available. The start, school, and marker paths are protected from blocking tiles.
4. Tap **Export map** and save `PetahTikva-Map.json` in Android's file picker. Open Kaplan Quest and tap **Import edited map**, then choose that file. **Original map** removes the imported overlay without deleting the JSON file or game progress.

The JSON is a compact list of changed blocks (`kaplan-grid-v1`). Each changed block is drawn over the original art; road, path, and plaza blocks become walkable, while grass and decorative blocks block walking. Place house blocks beside a walkable block to make their interiors reachable. The base street image remains available under the edits. The editor does not modify real map data or the rest of the city. The game checks that the starting point, school entrance, and three markers stay walkable when importing. Existing editor drafts and exported JSON files remain compatible.

The editor's local draft and the game's imported map are stored separately by Android. **Export the JSON file before moving to another device**; installing the editor does not transfer its draft into the game automatically.

## Build and checks

The project uses Java, Android Gradle Plugin 8.6.1, Gradle 8.7, and Android SDK 35. With `ANDROID_HOME` set, run `gradlew.bat :app:assembleRelease :editor:assembleRelease`. A signed release requires private `keystore.properties` and `kaplan-quest.keystore` in the repository root; neither is in Git or the source ZIP. Preserve this key for install-in-place updates to both apps. `scripts/build_town_map.py` regenerates and syncs the base map artwork and editor configuration.

`smoke_test.cjs` checks the phone layout, all house entrances, room interactions and persistence, scenery interaction, and the game quest. `editor_smoke_test.cjs` checks the scrollable side palette, paint/drag, undo/redo, editor persistence, JSON export/import, game collision integration, and mobile layout. Both use Playwright and Chrome with `NODE_PATH` pointing to a `playwright-core` installation. Android emulator screenshots are in `docs/`.

The encounter creatures, scenery renderer, and game code are original. This project does not package Pokémon names or game artwork and does not yet include creature capture, a party system, or multiple towns.
