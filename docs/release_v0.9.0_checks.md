# Kaplan Quest v0.9.0 checks

- Character studio: ten presets, custom addition, names and colors, saved custom selection, reload/continue, pausing while editing, 145 varied street people: browser acceptance test passed.
- Full existing game smoke test passed: splash, sprite selection, all four directional walking frames, movement cycle and idle, map, houses, interactions, quest, battles, save/resume and older save migration.
- Signed release build and Android lint vital checks passed.
- Version 0.9.0, versionCode 9, package com.efremandrei.kaplanquest, Android 8.0+.
- Release certificate SHA-256: daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- APK SHA-256: 0b2171b029b763a22cfe89ed2e8d4e16ca1e1e693074616d5ea56b1504ae421a.
- Installed with adb install -r over the previous release on Android 15 emulator. Existing Maya selection retained. Designer and native color picker opened successfully; screenshot inspected. No physical Samsung test performed.
- Editor remains v1.3.0. Existing map imports remain compatible.
