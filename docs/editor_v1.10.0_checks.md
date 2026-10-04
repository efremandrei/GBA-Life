# Petah Map Editor v1.10.0 checks

- Tall live editing canvas replaces the fixed 4:3 window and large persistent overview.
- Scrollable tile palette matches the map height. Minimize tiles removes the sidebar; Show tiles restores it. Map center, zoom, selected tool and edits are preserved. Collapse preference saves independently of map JSON.
- Optional small Overview overlay retains tap-to-jump navigation. Square tiles remain square after resizing.
- editor_layout_test.cjs passes at 390x844, 360x740, 844x390 and 1280x900: dimensions, center/zoom, lower-map paint/undo, navigator, saved preference, rotation, no horizontal overflow or JavaScript errors.
- editor_smoke_test.cjs passes: paint/drag, undo/redo, save/theme, JSON import/export and game collision integration.
- :editor:assembleRelease and :editor:lintRelease pass.
- Android 15 emulator install -r succeeds; versionCode 11 / versionName 1.10.0, same package and signing certificate as v1.9.0. Both palette states inspected. Physical Samsung not tested.
- Game remains v0.19.0; no game rebuild is required for this editor layout update.
