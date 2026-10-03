"""Cut the original 4x4 town sprite sheet into game and editor tiles."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "town_sprite_sheet.png"
NAMES = (
    "grass", "road", "path", "water",
    "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "lamp",
    "school", "market", "plaza", "fountain",
)
SIZE = 96


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (SIZE * 4, SIZE * 4))
    tile_dir = ROOT / "art" / "tiles"
    tile_dir.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        col, row = index % 4, index // 4
        source = image.crop((round(col * image.width / 4),
                             round(row * image.height / 4),
                             round((col + 1) * image.width / 4),
                             round((row + 1) * image.height / 4)))
        if row == 0 or name == "plaza":
            # Terrain is cropped inside its irregular outside edge to make a
            # complete block; decorative objects retain their alpha channel.
            inset = round(source.width * 0.16)
            source = source.crop((inset, inset, source.width - inset,
                                  source.height - inset))
            tile = source.resize((SIZE, SIZE), Image.Resampling.NEAREST)
            if name == "grass":
                background = Image.new("RGBA", tile.size, "#91dc78")
                background.alpha_composite(tile)
                tile = background
            elif name in ("road", "path", "plaza"):
                background = Image.new("RGBA", tile.size, "#c7c5b5")
                background.alpha_composite(tile)
                tile = background
            elif name == "water":
                background = Image.new("RGBA", tile.size, "#2e91cd")
                background.alpha_composite(tile)
                tile = background
        else:
            bounds = source.getchannel("A").point(lambda value: 255 if value > 32 else 0).getbbox()
            if not bounds:
                raise ValueError(f"Empty sprite: {name}")
            source = source.crop(bounds)
            scale = min((SIZE - 4) / source.width, (SIZE - 4) / source.height)
            resized = source.resize((round(source.width * scale),
                                     round(source.height * scale)), Image.Resampling.NEAREST)
            tile = Image.new("RGBA", (SIZE, SIZE))
            tile.alpha_composite(resized, ((SIZE - resized.width) // 2,
                                           SIZE - resized.height - 2))
        tile.save(tile_dir / f"{name}.png", optimize=True)
        atlas.alpha_composite(tile, (col * SIZE, row * SIZE))
    app_assets = ROOT / "app" / "src" / "main" / "assets"
    editor_assets = ROOT / "editor" / "src" / "main" / "assets"
    atlas.save(app_assets / "tile_atlas.png", optimize=True)
    shutil.copyfile(app_assets / "tile_atlas.png", editor_assets / "tile_atlas.png")
    print(f"Prepared {len(NAMES)} original art tiles and both app atlases.")


if __name__ == "__main__":
    main()
