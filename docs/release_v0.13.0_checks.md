# v0.13.0 / editor v1.5.0 checks

- House approach paving is 24px wide, including the short illustrated path below the doorway. The same entry treatment applies to editor house stamps.
- Grey roads use 16 connection masks, with horizontal/vertical sections, four corners, T-junctions and crossroads. The editor has 44 selectable types, including the auto-connect brush and explicit road pieces. Imports preserve explicit road orientation.
- python scripts/check_grid_surfaces.py passed: all connected pixel edges match, access width24.
- road_surface_test.cjs passed: automatic NE/ES corners, fixed corners, JSON roundtrip, walkable roads, 44 tile palette and phone screenshots.
- grid_town_test.cjs passed: orthogonal streets, NPC routes and footprints; connected school, markers and all 240 house entrances; uniform 24x32 characters; old save/map migration.
- Full smoke_test.cjs passed: splash, character choice, saved avatar, interactions, houses, map, exit save, battles and victory. Editor smoke passed paint/drag, undo/redo, persistence, JSON export/import and collision integration.
- Previous and new town data compared: walking mask, house bounds/entrances, start, school and marker coordinates are identical. Existing game and editor data are compatible; no map revision reset required.
- Both signed release builds and lint passed. Game com.efremandrei.kaplanquest v0.13.0 build13; editor com.efremandrei.kaplanquest.editor v1.5.0 build6. Both retain certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- Both installed with adb install -r in Android15 emulator. Game Continue retained Maya and prior progress. Game and editor screens inspected. Physical Samsung testing remains unverified.
- Final APK SHA256: game 90b22eb68741f714168c5c26d1522cc7388fcb09d07242cb8d2072ab70dbc155; editor e44fb7dd9828b025e0f3a934a7b93ca079f6810f760e8f080ac1cdfac5369b5b.
