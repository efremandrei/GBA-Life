# v0.17.0 game / v1.7.0 editor verification

- Source house_blue and house_teal crops contained detached strips from adjacent houses. Main-connected-component extraction removes these from every object tile. Compiled house/car alpha components verified clean.
- Apartments: 24 -> 80. All 240 house IDs and entrance coordinates preserved; upgrades expand northward into free cells. Road cells and NPC routes equal previous version.
- 48 added road cars: 24 horizontal and 24 vertical, fitted within straight road cells with two adjacent sidewalks. Crossings, junctions and house/quest anchors excluded. Cars are parked. Existing roadside decorative cars remain.
- town_environment_test.cjs: road placement, orientation, collision and reachability of all 240 houses and all quest destinations pass; screenshots inspected.
- grid_town_test.cjs, npc_behavior_test.cjs, map_streaming_test.cjs, editor_smoke_test.cjs and smoke_test.cjs pass. Streaming remains bounded to four loaded blocks / 16 MiB map pixels at phone viewport; missing block recovery passes.
- Both assembleRelease and lintRelease pass. Signing configuration unchanged.
- Android 15 emulator: both APKs install -r successfully. Continue saved game works. Physical Samsung not tested.
- Game com.efremandrei.kaplanquest versionCode 17 / 0.17.0; editor com.efremandrei.kaplanquest.editor versionCode 8 / 1.7.0.
