# Kaplan Quest v0.10.0 checks

- Chooser: all ten preset boxes are complete; no fixed-height inner clipping. Character list and actions scroll together on smaller displays; buttons use equal widths and 12px gaps. Tested 390x844, 360x780, 320x568 and 700x700 viewports.
- Headphones: over-ear, on-ear, wired earbuds, wireless earbuds, neckband, bone-conduction, gaming headset and None. Custom color, four directions, original artwork preservation, save/reload/resume, removal and older design migration passed.
- Full adventure smoke test passed: walking, houses, map, battles, interactions, exit saving, old-save migration and quest completion; no JavaScript errors.
- Signed release build and lint vital passed. Android 8.0+, package com.efremandrei.kaplanquest, versionCode 10, versionName 0.10.0. No native libraries.
- Release certificate SHA-256: daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78 (unchanged).
- APK SHA-256: 552981f34d58e37d3a2c905ba665219bbabade31cc1a6778550ab6f6af63e667.
- Android 15 emulator: install -r over v0.9.0 succeeded; previous Maya selection and Continue retained. Screenshot inspected: five complete rows and uniformly spaced action buttons. Physical Samsung not tested.
- Map editor remains v1.3.0.
