# v0.21.0 / editor v1.12.0 checks

- New-game start is Hen 14 house 59 entrance [3856,2224], selected from an address-specific map point. See data/hen14_source.md for placement limits.
- All 388 houses have ten detailed furniture objects, mirrored layouts and color variation. Kitchen, sofa, TV and wardrobe interactions added; existing bed/chest/radio behavior retained.
- home_interior_test.cjs passes for all 388 houses at four sizes: furniture/exit reachability, clear spawn, home start, sofa recovery, save/resume and repair of old positions overlapping new furniture.
- smoke_test.cjs passes including quest victory, bed/chest, custom-house imports, save/exit/resume, walking and migration. Walking uses a clear road instead of walking north into the home facade; migration checks the current configured start.
- grid_town_test.cjs, editor_smoke_test.cjs and map_streaming_test.cjs pass. Geometry and house IDs/entries preserved; start metadata/address label updated.
- Both signed release builds/lint and Android 15 emulator install -r succeed. Physical Samsung not tested.
- Game versionCode 21 / 0.21.0; editor versionCode 13 / 1.12.0. Same packages/signing keys, saved progress and edited map format preserved.
