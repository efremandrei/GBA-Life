# v0.15.0 character-quality checks

- Generated detailed templates with the built-in image tool using Maya as style reference. Both atlases and exact prompts are in art/. Original Andrei/Maya/Amir/Dana sheets are untouched.
- Compiled 56 transparent frames: seven hairstyles, four directions, with/without backpacks. Semantic masks recolor hair, clothes, trousers, backpacks, skin and eyes offline; skirts, facial hair, glasses and headphones remain supported.
- All NPCs and custom players use the new detailed renderer, including saved designs. World size remains 24x32. NPC shadows now match player ellipses.
- character_quality_test.cjs passed all 56 combinations: detailed palette/shading, hard transparent/opaque pixel edges, uniform world dimensions, alternating walking poses, color changes, facial hair, backpack removal and 145 NPCs. Actual original presets and NPCs were visually checked in the gallery.
- character_test.cjs passed ten preset features, all color fields, custom creation/persistence, resume, designer pause and street diversity. headphones_test.cjs passed all seven types/colors/four directions, original-art preservation, saved designs and earlier design migration.
- Release build/lint passed. Package com.efremandrei.kaplanquest, versionCode15, versionName0.15.0. Original signing certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78 retained.
- adb install -r succeeded in Android15 emulator. Continue restored Maya and previous progress. Detailed NPCs rendered correctly in Android WebView; docs/character_quality_emulator_v15.png inspected. No physical Samsung validation.
- APK SHA256 940e0cbba7e4f3ae32eb86bcd4e8fe9c277cd84588e6f7c09401b32b97b7abd9.
- Character data schema, save keys and map remain unchanged. Map editor stays v1.6.0.
