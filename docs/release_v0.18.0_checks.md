# Kaplan Quest v0.18.0 / Petah Map Editor v1.8.0 verification

- Open grass: 99 px/s (60%) versus 165 px/s on pavement. NPC terrain speed also scales to 60%; timers remain independent. Walking poses advance with distance traveled.
- Grass collision mask: 4,608 bytes; streaming pixel budget unchanged. Grass tiles imported from the editor are walkable and slow.
- Object footprints are removed from base walk mask, including old approach paths that traversed their own houses or shrubs. Water stays excluded from grass mask.
- grass_walking_test.cjs: half-second movement 49 px on grass versus 83 px on pavement (rounded), correct animation, house/tree/shrub/car blocking, and grass save/resume pass.
- grid_town_test.cjs and town_environment_test.cjs: all 240 house entrances and quest locations reachable. Apartments 80 and road cars 48 remain.
- npc_behavior_test.cjs: independent waits, one-tile out-and-back visits, no unsafe movement pass.
- editor_smoke_test.cjs, smoke_test.cjs and map_streaming_test.cjs pass.
- Both signed release builds and lint pass. Emulator install -r of game/editor succeeds; Continue preserved the saved character. Physical Samsung not tested.
- Game build 18 / 0.18.0; editor build 9 / 1.8.0; package names and signing configuration preserved.
