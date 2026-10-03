# GBA-Life: Kaplan Quest and Petah Map Editor

[Download Kaplan Quest v0.3.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.3.0/KaplanQuest-v0.3.0.apk) · [Download Petah Map Editor v1.0.0](https://github.com/efremandrei/GBA-Life/releases/download/v0.3.0/PetahMapEditor-v1.0.0.apk) · [Download the source ZIP](https://github.com/efremandrei/GBA-Life/releases/download/v0.3.0/KaplanQuest-source-v0.3.0.zip)

![Petah Map Editor on Android](docs/editor_emulator.png)

An offline, original pixel-art walking game for Android. Explore a stylized part of **Petah Tikva** with a street network based on real map data. Start near Khen Street, collect markers at Khen, Tzahal, and HaTsoarim streets, and reach Kaplan School. The map covers approximately **32.081–32.096° N, 34.858–34.889° E** around the school; it is a game map of this area, not the entire city or a navigation map. Buildings, parks, and characters are decorative interpretations.

## Map sources

The design was visually checked against [Google Maps near Kaplan School](https://www.google.com/maps/@32.0898811,34.8696697,16z) to confirm the relationships among Jabotinsky, Kaplan, HaTsoarim, Tzahal, and Khen streets. The reusable road and landmark geometry comes from [OpenStreetMap](https://www.openstreetmap.org/#map=16/32.0899/34.8697), downloaded through Overpass on 2026-10-03 and stored in `data/`. **© OpenStreetMap contributors**, available under the [Open Database License](https://www.openstreetmap.org/copyright). No Google map tiles or screenshots are included in the app.

Run `python scripts/build_town_map.py` with Pillow installed to regenerate the pixel map, collision data, and town geometry. It uses a fixed decorative scenery seed; new games generate new people separately. The supplied avatar's beard, blue shirt, and red backpack remain on the player sprite.

## Play

Install `KaplanQuest-v0.3.0.apk` on Android 8.0 or later. Use the D-pad to walk and **A** to speak with a nearby person or enter the school. On a computer, use arrow keys or WASD and E/Enter/Space. The **Town map** button shows your position, remaining markers, and school. Around 145 varied townspeople move along the street paths; each new game randomizes their looks, positions, and dialogue. Two original creature encounters guard route markers. Progress and the chosen light or dark skin save locally.

Version 0.3.0 keeps package ID `com.efremandrei.kaplanquest` and the original release signing key, increments `versionCode` to 3, and preserves saves from 0.1.0 and 0.2.0. Existing 0.1.0 players are relocated to the Khen Street starting point because the map coordinates changed. The APK has no native libraries and supports arm64 Samsung devices in the supported Android range.

## Edit the map in the separate app

1. Install `PetahMapEditor-v1.0.0.apk` alongside Kaplan Quest. It has its own launcher icon and package ID, `com.efremandrei.kaplanquest.editor`.
2. Select **Grass**, **Road**, **Path**, **Tree**, **House**, **Water**, or **Erase**. Tap or drag over 32 × 32 pixel grid blocks. Select **Hand** to pan, use +/− to zoom, or tap the town overview to jump elsewhere.
3. Changes save automatically on that device. **Undo**, **Redo**, and **Clear edits** are available. The start, school, and marker paths are protected from blocking tiles.
4. Tap **Export map** and save `PetahTikva-Map.json` in Android's file picker. Open Kaplan Quest and tap **Import edited map**, then choose that file. **Original map** removes the imported overlay without deleting the JSON file or game progress.

The JSON is a compact list of changed blocks (`kaplan-grid-v1`). Each changed block is drawn over the original art; road and path blocks become walkable, while grass, tree, house, and water blocks block walking. The base street image remains available under the edits. The editor does not modify real map data or the rest of the city. The game checks that the starting point, school entrance, and three markers stay walkable when importing.

The editor's local draft and the game's imported map are stored separately by Android. **Export the JSON file before moving to another device**; installing the editor does not transfer its draft into the game automatically.

## Build and checks

The project uses Java, Android Gradle Plugin 8.6.1, Gradle 8.7, and Android SDK 35. With `ANDROID_HOME` set, run `gradlew.bat :app:assembleRelease :editor:assembleRelease`. A signed release requires private `keystore.properties` and `kaplan-quest.keystore` in the repository root; neither is in Git or the source ZIP. Preserve this key for install-in-place updates to both apps. `scripts/build_town_map.py` regenerates and syncs the base map artwork and editor configuration.

`smoke_test.cjs` checks the game quest. `editor_smoke_test.cjs` checks paint/drag, undo/redo, editor persistence, JSON export/import, game collision integration, and mobile layout. Both use Playwright and Chrome with `NODE_PATH` pointing to a `playwright-core` installation. The Android emulator was used to install both signed APKs, paint a block, export it through Android's document picker, and import it in the game. Screenshots are in `docs/`.

The encounter creatures, scenery renderer, and game code are original. This project does not package Pokémon names or game artwork and does not yet include creature capture, a party system, or multiple towns.
