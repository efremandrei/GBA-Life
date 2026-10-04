# Kaplan Quest v0.19.0 / Petah Map Editor v1.9.0 verification

- 388 enterable homes, 178 apartment buildings; original 240 doorway coordinates and IDs verified against v0.18.0.
- 18 named real-data landmarks and 270 street/path signs; names linked to source OSM ways. No invented landmark coordinates. See data/city_sources_v19.md for source and projection details.
- Six mapped stations with visible rail beds/platforms: Shenkar, Shaham, Beilinson, Dankner, Krol, Pinsker. Rail corridor follows orthogonal game streets; exact engineering geometry is not claimed.
- TramService tests: every station receives a 10-second dwell at the correct position; identical stop repeats after exactly 180 seconds; departure and movement pass. Service clock persists across save/resume. Old saves default clock to zero. Separate directional generated sprites are integrated in runtime.
- city_transit_test.cjs, grid_town_test.cjs, town_environment_test.cjs, grass_walking_test.cjs, npc_behavior_test.cjs, editor_smoke_test.cjs, smoke_test.cjs and map_streaming_test.cjs pass.
- All 388 doorways and all quest anchors remain reachable. Original world scale, grass movement, NPC idle behavior and bounded map-block streaming retained.
- Both release builds/lint pass. Android 15 emulator installed both APKs via install -r and resumed saved character. Physical Samsung not tested. Three-minute scheduling verified by simulation, not a physical-device three-minute stopwatch test.
- Game versionCode 19 / 0.19.0; editor versionCode 10 / 1.9.0; same application IDs and signing configuration.
- Art generated with built-in imagegen; source art/tram_directional_sheet_v19.png, prompt art/tram_directional_prompt_v19.md, compiler scripts/compile_tram_art.py, runtime tram_{down,up,left,right}.png.
