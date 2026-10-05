# Local map release checks

- Kaplan Quest 0.24.0, build24; editor unchanged at 1.13.0.
- local_map_test.cjs PASS: local chunk on open/reopen/indoors; all 40 chunks via arrow buttons; keyboard/Here; bounded edges; final row aspect; one local image <=4MiB and released on close; no player movement, full-city image request, overflow or JS errors.
- screen_navigation_test.cjs PASS after map changes: directions, zoomed position, interiors, pinch takeover and modal pause.
- smoke_test.cjs and map_streaming_test.cjs PASS: gameplay/save/quest regression and streamed world blocks; no full map request.
- Release build/lint PASS; signature verified with original SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- Android emulator install -r PASS; activity starts; versionCode24/versionName0.24.0 verified.
- Map interaction verified in Chromium; physical Samsung behavior remains unverified.
