# Touch navigation checks

- Kaplan Quest 0.23.0, versionCode 23. Editor unchanged at 1.13.0.
- screen_navigation_test.cjs PASS: real Chromium multi-touch, all four directions, drag steering, release/cancel, zoomed sprite coordinates, house movement, neutral area, modal pause, pinch takeover and suppression of the remaining finger.
- pinch_zoom_test.cjs PASS: game/editor/house pinch in/out, focal position, paint rollback, cancel, saved zoom and phone map memory budget.
- smoke_test.cjs PASS: start/selection, save/resume, original keyboard movement, quest and battles.
- Android release build and lint PASS; signed APK retains certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- Android emulator install -r PASS; activity started, versionCode23/versionName0.23.0 confirmed.
- Physical Samsung touch behavior has not been tested; navigation gestures were verified using Chromium touch dispatch.
