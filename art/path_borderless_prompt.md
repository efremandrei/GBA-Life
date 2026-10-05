# Borderless path asset

Generated with the built-in image_gen tool, editing art/tiles/path.png.

Prompt: Remove the distinct vertical curb strip on the left edge and all outer tile borders. Fill the square edge to edge with the same warm beige paving slabs in the center. Preserve the palette, pixel-art grout, stone speckles and flat top-down view. Uniform thin slab grout; no curb, frame, shadow, perspective, text or margins. Seamlessly repeatable horizontally and vertically; reduced with nearest-neighbor for gameplay.

Source: art/path_borderless_source.png. prepare_tile_art.py packs its 96px version into both app atlases; build_town_map.py consumes art/tiles/path.png at 32px. Do not restore the old sprite sheet path cell over this override.

Final refinement prompt: Remove grout along all four outer edges. Cut through slab interiors at each boundary, with matching light beige opposing edges; no dark band or frame within the outermost 3 percent. Preserve thin internal grout and subtle speckles.
