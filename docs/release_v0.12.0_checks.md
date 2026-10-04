# v0.12.0 checks

- NPCs have unique grid origins and mainly stand still. Initial wait 12-40 seconds; subsequent wait 15-45 seconds. Visits are one cardinal tile, pause 3-8 seconds, then exact return. Stationary characters use idle poses.
- npc_behavior_test.cjs passed: all four directions, blocked/restricted neighbours, phases and exact return. 145 live actors simulated for 120 seconds: 3.94% moving, maximum distance 32px, no unsafe positions, 145 unique grid origins, no browser errors.
- Full smoke_test.cjs passed: splash, character selection/persistence, house and city interactions, map, Exit Game saving, battles, old-save migration and victory.
- Signed release build and lint passed. Package com.efremandrei.kaplanquest, versionCode 12, versionName 0.12.0. Original certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78.
- Android 15 emulator install -r succeeded. Continue restored the previous character and game without clearing data. Inspected docs/npc_emulator_v12.png. No physical Samsung validation.
- APK SHA256 e7d191b794b9beb0e9729c0fe4ce057368646783cb85c73de2d7f991a85e0eb5.
- NPC transient motion resets to seeded origin on resume; game progress saving remains unchanged.
