# Kaplan Quest v0.20.0 / Petah Map Editor v1.11.0 checks

- Removed repeating beige corner islands inside wide roads. Road source tiles now account for all eight neighbors; generated city master, all 40 map blocks and overview were rebuilt.
- Shared 256-variant road atlas handles automatic and explicit edited road tiles; diagonal changes redraw the affected base corner. Map JSON schema unchanged.
- Town geometry/data, collision, 388 house IDs/entries, 178 apartments, 48 cars, 18 landmarks, 270 signs and tram service unchanged (town_data.js/editor_config.js have no diff).
- check_grid_surfaces.py and check_wide_roads.py pass: old access/sidewalk seam checks, uninterrupted asphalt in 2x12, 12x2, 3x12, 12x3 and 4x4 road regions.
- wide_road_test.cjs, road_surface_test.cjs, editor_layout_test.cjs, editor_smoke_test.cjs, map_streaming_test.cjs and town_environment_test.cjs pass.
- Both signed release builds/lint pass; signing certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78 retained.
- Both APKs install with install -r on Android 15 emulator. Editor rendered roads inspected. Physical Samsung not tested.
- Game versionCode 20 / 0.20.0; editor versionCode 12 / 1.11.0. Existing saves and map edits preserved.
