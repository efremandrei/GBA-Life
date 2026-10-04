# Kaplan Quest v0.11.0 / Petah Map Editor v1.4.0 checks

- All world character sprites normalize to 24x32, player and NPC alike. Original-avatar alpha bounds also supplied for WebViews that restrict canvas pixel reads.
- Town is 8192x4608, 32px grid, using the same stored Petah Tikva geography. 1673 source roads, 240 enterable houses, 707 scenery interactions, 1600 orthogonal NPC routes. All road and NPC segments are horizontal/vertical; scenery and building footprints align to grid cells.
- Houses 96x96, high buildings 96x128, trees 64x64, school 160x128. Editor stamps use matching footprints and collision protection.
- Grid acceptance: complete walking connectivity for start, markers, school, all house entrances; no diagonal segments or off-grid placements; uniform sprites; old-save character/quest/inventory and old-map import migration passed.
- Full adventure and editor smoke tests passed, including houses, interactions, battles, quest, save/resume, editor drag/undo/redo/import/export and collision integration.
- Release builds and lint vital passed. Same package IDs and SHA-256 signing certificate daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78. Game versionCode 11; editor versionCode 5. Android 8.0+; no native libraries.
- Android 15 emulator installed both as updates; game retained Maya selection and resumed on the new town. Game and editor screenshots inspected. No physical Samsung test.
- Old house locations/chest identifiers reset because the town is rebuilt. Quest, Buddy, character designs and carried inventory remain. Positions convert or fall back to start; old interior saves resume outdoors.
- APK SHA-256 game: a447023c639956f41d932025feae4a9d23af474685edfb01f3a7da0d863dd236.
- APK SHA-256 editor: 0be5b1a661b26e76aa9a9b4414bf42344716e06143969d1b7b5ebb83d9ddb5be.
