# Pinch zoom release checks

- Kaplan Quest 0.22.0 (22); Petah Map Editor 1.13.0 (14).
- Native Chromium two-touch CDP test: pinch out/in in editor, outdoors and house; focal anchor; initial paint rollback; trailing finger suppression; cancellation; player position unchanged; stable camera; saved game zoom; phone decoded map blocks <=24 MiB. PASS.
- Existing home interior, editor smoke/layout, map streaming and game smoke tests. PASS.
- Android release build and release lint for both modules. PASS.
- apksigner verification: both retain certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- Android 15 emulator: adb install -r succeeded for both apps; launcher activities opened; installed version numbers verified.
- Physical Samsung multi-touch has not been tested. Native emulator multi-touch has not been tested; gesture behavior was verified in Chromium with actual multi-touch dispatch.
- Package IDs, signing key and existing save/draft formats preserved. Game zoom fields are optional for older saves.
