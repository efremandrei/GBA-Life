"""Cut both 4x4 town sprite sheets into a shared 4x20 game/editor atlas."""

from pathlib import Path
import shutil
from collections import deque

from PIL import Image
from grid_surfaces import surface


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


def isolate_sprite(source):
    """Keep the main connected sprite, excluding overflow from adjacent sheet cells."""
    alpha=source.getchannel('A'); width,height=source.size
    seen=set(); largest=[]
    for y in range(height):
        for x in range(width):
            if (x,y) in seen or alpha.getpixel((x,y))<=32:continue
            queue=deque([(x,y)]);seen.add((x,y));component=[]
            while queue:
                px,py=queue.popleft();component.append((px,py))
                for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                    if 0<=nx<width and 0<=ny<height and (nx,ny) not in seen and alpha.getpixel((nx,ny))>32:
                        seen.add((nx,ny));queue.append((nx,ny))
            if len(component)>len(largest):largest=component
    if not largest:raise ValueError('Empty sprite')
    clean=Image.new('RGBA',source.size)
    src,dst=source.load(),clean.load()
    for x,y in largest:dst[x,y]=src[x,y]
    return clean.crop(clean.getchannel('A').getbbox())

def main() -> None:
    atlas = Image.new("RGBA", (SIZE * 4, SIZE * 20))
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
                source = isolate_sprite(source)
                scale = min((SIZE - 4) / source.width, (SIZE - 4) / source.height)
                resized = source.resize((round(source.width * scale),
                                         round(source.height * scale)), Image.Resampling.NEAREST)
                tile = Image.new("RGBA", (SIZE, SIZE))
                tile.alpha_composite(resized, ((SIZE - resized.width) // 2,
                                               SIZE - resized.height - 2))
            tile.save(tile_dir / f"{name}.png", optimize=True)
            atlas.alpha_composite(tile, (col * SIZE, (sheet_index * 4 + row) * SIZE))
    for offset,kind in [(32,"road"),(48,"access"),(64,"sidewalk")]:
        for mask in range(16):
            tile=surface(mask,kind=="access",kind=="sidewalk").resize((SIZE,SIZE),Image.Resampling.NEAREST)
            name=f"{kind}_{mask}"
            tile.save(tile_dir/f'{name}.png',optimize=True)
            atlas.alpha_composite(tile,(((offset+mask)%4)*SIZE,((offset+mask)//4)*SIZE))
    app_assets = ROOT / "app" / "src" / "main" / "assets"
    editor_assets = ROOT / "editor" / "src" / "main" / "assets"
    atlas.save(app_assets / "tile_atlas.png", optimize=True)
    shutil.copyfile(app_assets / "tile_atlas.png", editor_assets / "tile_atlas.png")
    road_atlas=Image.new("RGBA",(512,512))
    for mask in range(256):
        road_atlas.paste(surface(mask),((mask%16)*32,(mask//16)*32))
    road_atlas.save(app_assets/"road_atlas.png",optimize=True)
    shutil.copyfile(app_assets/"road_atlas.png",editor_assets/"road_atlas.png")
    print("Prepared 80 shared tiles plus 256 seamless road variants for both apps.")


if __name__ == "__main__":
    main()
