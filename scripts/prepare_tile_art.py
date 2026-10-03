"""Cut both 4x4 town sprite sheets into a shared 4x8 game/editor atlas."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "town_sprite_sheet.png"
CITY_SOURCE = ROOT / "art" / "town_sprite_sheet_city.png"
NAMES = (
    "grass", "road", "path", "water",
    "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "lamp",
    "school", "market", "plaza", "fountain",
)
CITY_NAMES = (
    "sidewalk", "crossing", "high_building", "bus_stop",
    "tram_stop", "car", "bike", "tram",
    "playground_slide", "playground_swings", "gas_station", "shopping_mall",
    "hospital", "city_hall", "traffic_light", "bench",
)
SIZE = 96
TERRAIN = {"grass", "road", "path", "water", "plaza", "sidewalk", "crossing"}


def main() -> None:
    atlas = Image.new("RGBA", (SIZE * 4, SIZE * 8))
    tile_dir = ROOT / "art" / "tiles"
    tile_dir.mkdir(parents=True, exist_ok=True)
    for sheet_index, (sheet, names) in enumerate(((SOURCE, NAMES), (CITY_SOURCE, CITY_NAMES))):
        image = Image.open(sheet).convert("RGBA")
        for index, name in enumerate(names):
            col, row = index % 4, index // 4
            source = image.crop((round(col * image.width / 4),
                                 round(row * image.height / 4),
                                 round((col + 1) * image.width / 4),
                                 round((row + 1) * image.height / 4)))
            if name in TERRAIN:
                # Remove the transparent gutter so terrain fills a grid block.
                inset = round(source.width * 0.16)
                source = source.crop((inset, inset, source.width - inset,
                                      source.height - inset))
                tile = source.resize((SIZE, SIZE), Image.Resampling.NEAREST)
                background_color = ("#91dc78" if name == "grass" else
                                    "#2e91cd" if name == "water" else
                                    "#aeb9b5" if name == "crossing" else "#c7c5b5")
                background = Image.new("RGBA", tile.size, background_color)
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
            atlas.alpha_composite(tile, (col * SIZE, (sheet_index * 4 + row) * SIZE))
    app_assets = ROOT / "app" / "src" / "main" / "assets"
    editor_assets = ROOT / "editor" / "src" / "main" / "assets"
    atlas.save(app_assets / "tile_atlas.png", optimize=True)
    shutil.copyfile(app_assets / "tile_atlas.png", editor_assets / "tile_atlas.png")
    print(f"Prepared {len(NAMES) + len(CITY_NAMES)} art tiles and both app atlases.")


if __name__ == "__main__":
    main()
