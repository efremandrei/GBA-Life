# Kaplan Quest v0.16.0 checks

- Town split into 40 blocks of at most 1024 x 1024; all blocks match master PNG pixels exactly.
- APK includes 40 blocks and 640 x 360 overview; full 8192 x 4608 raster is excluded.
- map_streaming_test.cjs: six distant moves load correct player block and evict old blocks; maximum four blocks / 16,777,216 decoded bytes on 390 x 844 viewport. Stationary frames issue no requests. No full-raster request. One deliberately aborted block retries successfully.
- grid_town_test.cjs: orthogonal layout, all 240 house entrances, quest connectivity, uniform characters, old-save and imported-map migration pass.
- smoke_test.cjs: startup, character choice, save/resume, houses, battles, map overview, victory and mobile flow pass without JavaScript errors.
- :app:assembleRelease and :app:lintRelease pass.
- Android 15 emulator: install -r succeeds over v0.15.0; Continue saved game restores Maya. Native screenshot map_streaming_emulator_v16.png inspected.
- Same package and signing configuration; versionCode 16, versionName 0.16.0. Physical Samsung was not tested.
- Decoded pixel figures refer to application-held map images only, not browser caches or total process memory.
