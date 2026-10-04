# v0.14.0 / editor v1.6.0 checks

- Sidewalk paving uses a consistent 24px width, matching house access paths. Sixteen seamless connection masks supply horizontal, vertical, four corners, T-junctions and crossroads.
- The 55-type editor sidebar includes auto-connect sidewalks and eleven explicit oriented pieces. Auto sidewalk joins respond to neighboring base/edited sidewalks, access paths and plaza/path paving; the grey roadway remains separate. Explicit pieces retain orientation through export/import. Existing sidewalk edits use the new art.
- sidewalk_surface_test.cjs passed all four automatic corners, base-neighbor additions/removals, road separation, plaza join, eleven explicit sidewalk JSON roundtrips, walkability, 55 types and 11239 base sidewalk cells. Phone screenshots inspected.
- scripts/check_grid_surfaces.py passed every connected edge of all 48 road/access/sidewalk masks and 24px paving width.
- Editor smoke passed paint/drag, undo/redo, persistence, export/import, game collision integration and mobile width. Grid town test passed orthogonal geometry, uniform characters, all 240 house/quest paths and earlier-save/map migrations.
- Previous/current town data comparison confirmed identical houses, walking mask, start, school, markers and NPC routes. Existing progress and editor drafts remain compatible.
- Both signed release builds and lint passed. Game package com.efremandrei.kaplanquest v0.14.0 build14; editor com.efremandrei.kaplanquest.editor v1.6.0 build7. Original SHA256 certificate daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78 retained.
- Both APKs installed with adb install -r in Android15 emulator. Game Continue restored Maya and previous progress. Physical Samsung testing remains unverified.
- APK SHA256: game f0029381d43e9a8020c1d4e8ebd7e162e5d8e5a1f099cd3a1af2ead2df21475b; editor 367da03a97b7612fd2812e7fb8d255cd9184a7ac7e29e87267692ff2d83f4d2d.
