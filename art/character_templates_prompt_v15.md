# Detailed character templates

Created with the built-in image generation tool, using `app/src/main/assets/avatar_maya_sprite_sheet.png` as the style reference. Original Andrei/Maya/Amir/Dana art is retained.

## Main atlas prompt

Production pixel-art sprite template atlas for the existing game. Reference image is Maya, whose QUALITY, pixel density, hand-crafted stepped silhouette, large expressive eyes, dark outlines, layered hair clusters, cloth folds, jacket collar, shaded face/ears/hands and boots must match exactly. Create a NEW transparent sprite sheet, no scenery, no text, no guides, no shadows. STRICT GRID: 7 equal-width columns and 4 equal-height rows, exactly 28 full-body sprites, generous transparent separation, centered within each cell, consistent body height and proportions. Columns, left to right: SHORT hair, BOB hair, SHOULDER-LENGTH hair, LONG hair, CURLY hair, PONYTAIL hair, BALD. Rows top to bottom: facing FRONT, facing BACK, facing LEFT, facing RIGHT. Every cell is the same clean-shaven adult explorer mannequin, no glasses or headphones, wearing a detailed zip jacket over a white undershirt, trousers, boots and a small backpack. Real authentic 16-bit handheld pixel artwork like Maya, NOT rectangular block people. For programmable recoloring use unambiguous template colors: all hair is violet/purple (#9955cc) with darker purple shadows and light purple clusters; jacket is cyan/teal (#28aeb7) with darker cyan shadows and bright cyan highlights; trousers are royal blue (#355ad0) with dark blue fold shadows; backpack and straps are crimson (#db3549) with lighter red highlights; skin is warm peach orange (#eaa066), several related peach shades; iris is bright green, white eyes and dark pupils. Brown boots, almost-black outlines. Keep purple exclusively in hair, cyan exclusively in jacket, royal blue exclusively in trousers, crimson exclusively in backpack and straps, green exclusively in irises. Maintain convincing front/back/profile anatomy, tapered torso, separate shaded legs, detailed shoes, individual fingers suggested by pixels, rounded stepped cheek and hair shapes. Back has backpack detail and no face. All views neutral standing with both feet on the same baseline, isolated entire full body visible. Pixel edges hard; no soft antialiasing, gradients, blur or checkerboard. This sheet is a reusable game asset, exact 7 by 4 layout matters.

## No-backpack variant

The main atlas was edited with the built-in tool to remove every crimson backpack and strap, redraw the jacket and shoulders beneath them, and retain the characters, seven-column/four-row arrangement, hairstyles, palette, and pixel detail. The ponytail tie becomes purple. Transparent background, no labels or scenery.

## Integration

`scripts/compile_character_templates.py` compiles the two generated sheets into 56 small embedded RGBA sprites and semantic color masks. This avoids file-origin canvas readback restrictions in Android WebView. The common template renderer applies saved colors, skirts, facial hair, glasses and accessories, and alternates lower-leg poses. All world sprites retain the shared 24x32 size.

Saved atlases: [with backpack](character_templates_v15.png) and [without backpack](character_templates_nobag_v15.png).
