"""Render an original pixel-art map over real Petah Tikva street geometry.

Source geometry: OpenStreetMap contributors, ODbL 1.0 (Overpass snapshot in
data/). Google Maps was consulted to verify the Kaplan School / Jabotinsky /
Kaplan / HaTsoarim / Tzahal / Hen street relationships. No Google map tiles are
stored in the game.
"""

from __future__ import annotations

import json
import base64
import math
import random
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app" / "src" / "main" / "assets"
BASE_W, BASE_H, SCALE = 2048, 1152, 2
WORLD_W, WORLD_H = BASE_W * SCALE, BASE_H * SCALE
SOUTH, WEST, NORTH, EAST = 32.081, 34.858, 32.096, 34.889
RNG = random.Random(1878)
TILES = ROOT / "art" / "tiles"


def sprite(name: str, width: int, height: int) -> Image.Image:
    return Image.open(TILES / f"{name}.png").convert("RGBA").resize(
        (width, height), Image.Resampling.NEAREST)


def tile_surface(source: Image.Image, width: int, height: int) -> Image.Image:
    surface = Image.new("RGB", (width, height))
    tile = source.convert("RGB")
    for y in range(0, height, tile.height):
        for x in range(0, width, tile.width):
            surface.paste(tile, (x, y))
    return surface

ROAD_WIDTH = {
    "primary": 22, "primary_link": 16,
    "secondary": 18, "secondary_link": 14,
    "tertiary": 16, "tertiary_link": 12,
    "residential": 13, "living_street": 12,
    "unclassified": 12, "service": 8,
    "pedestrian": 10, "footway": 6, "path": 6,
    "cycleway": 5, "steps": 5, "track": 7,
}


def px(lat: float, lon: float, scale: int = 1) -> tuple[int, int]:
    return (round((lon - WEST) / (EAST - WEST) * BASE_W * scale),
            round((NORTH - lat) / (NORTH - SOUTH) * BASE_H * scale))


def points(element: dict) -> list[tuple[int, int]]:
    return [px(p["lat"], p["lon"]) for p in element.get("geometry", [])]


def draw_roof(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int,
              color: str) -> None:
    draw.rectangle((x + 2, y + 4, x + w + 2, y + h + 4), fill="#566e68")
    draw.rectangle((x, y + 3, x + w, y + h), fill="#f3dbab", outline="#6b615a", width=1)
    draw.rectangle((x - 2, y, x + w + 2, y + h - 4), fill=color, outline="#354c58", width=2)
    draw.line((x, y + 4, x + w, y + 4), fill="#ffe3a7", width=2)
    draw.rectangle((x + w // 2 - 2, y + h - 3, x + w // 2 + 2, y + h + 2),
                   fill="#654b48")


def draw_tree(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int) -> None:
    draw.ellipse((x - radius, y - radius + 3, x + radius, y + radius + 3),
                 fill="#506953")
    draw.ellipse((x - radius, y - radius, x + radius, y + radius),
                 fill="#427a4d", outline="#315d49", width=2)
    draw.ellipse((x - radius + 3, y - radius + 2, x + 2, y + 2),
                 fill="#8fc66a")
    draw.point((x - 1, y - 2), fill="#c1df79")


def main() -> None:
    roads_raw = json.loads((ROOT / "data" / "petah_roads_raw.json").read_text(encoding="utf-8"))
    places_raw = json.loads((ROOT / "data" / "petah_landmarks_raw.json").read_text(encoding="utf-8"))
    roads = [e for e in roads_raw["elements"] if e["type"] == "way"
             and e.get("tags", {}).get("highway") in ROAD_WIDTH and len(e.get("geometry", [])) >= 2]
    places = [e for e in places_raw["elements"] if e["type"] == "way"
              and len(e.get("geometry", [])) >= 3]

    art = tile_surface(sprite("grass", 48, 48), BASE_W, BASE_H)
    draw = ImageDraw.Draw(art)
    zone = Image.new("L", (BASE_W, BASE_H), 0)
    zd = ImageDraw.Draw(zone)

    for place in places:
        tags = place.get("tags", {})
        shape = points(place)
        if tags.get("natural") == "water":
            draw.polygon(shape, fill="#5eb6ba", outline="#377f94", width=3)
            zd.polygon(shape, fill=3)
        elif tags.get("leisure") in ("park", "garden") or tags.get("landuse") == "grass":
            draw.polygon(shape, fill="#85c985", outline="#6bac72", width=2)
            zd.polygon(shape, fill=1)
        elif tags.get("amenity") == "hospital":
            draw.polygon(shape, fill="#c8dcb6", outline="#84a891", width=2)
            zd.polygon(shape, fill=2)
        elif tags.get("amenity") == "school":
            draw.polygon(shape, fill="#d9dda5", outline="#9aa77b", width=2)
            zd.polygon(shape, fill=2)

    mask = Image.new("L", (BASE_W, BASE_H), 0)
    md = ImageDraw.Draw(mask)
    # Draw every road's stone border first, then its surface, so junctions join.
    for road in roads:
        kind = road["tags"]["highway"]
        shape = points(road)
        width = ROAD_WIDTH[kind]
        draw.line(shape, fill="#718778", width=width + 5, joint="curve")
        walking_width = width + (8 if kind not in ("footway", "path", "pedestrian", "steps") else 5)
        md.line(shape, fill=255, width=walking_width, joint="curve")
        for x, y in (shape[0], shape[-1]):
            md.ellipse((x - width // 2 - 2, y - width // 2 - 2,
                        x + width // 2 + 2, y + width // 2 + 2), fill=255)
    for road in roads:
        kind = road["tags"]["highway"]
        shape = points(road)
        if kind in ("footway", "path", "pedestrian", "steps"):
            color = "#d3cba9"
        elif kind in ("primary", "secondary", "tertiary", "primary_link", "secondary_link", "tertiary_link"):
            color = "#aeb9b5"
        else:
            color = "#bdc8bd"
        draw.line(shape, fill=color, width=ROAD_WIDTH[kind], joint="curve")

    # Pattern the OSM street paths with the reference-inspired stone art.
    sidewalk_surface = Image.new("L", (BASE_W, BASE_H), 0)
    road_surface = Image.new("L", (BASE_W, BASE_H), 0)
    path_surface = Image.new("L", (BASE_W, BASE_H), 0)
    sd, rd, pd = ImageDraw.Draw(sidewalk_surface), ImageDraw.Draw(road_surface), ImageDraw.Draw(path_surface)
    for road in roads:
        kind = road["tags"]["highway"]
        surface_draw = pd if kind in ("footway", "path", "pedestrian", "steps") else rd
        surface_draw.line(points(road), fill=255, width=ROAD_WIDTH[kind], joint="curve")
        if surface_draw is rd:
            sd.line(points(road), fill=255, width=ROAD_WIDTH[kind] + 12, joint="curve")
    sidewalk_pattern = tile_surface(sprite("sidewalk", 48, 48).crop((9, 9, 39, 39)),
                                   BASE_W, BASE_H)
    road_pattern = tile_surface(sprite("road", 64, 64).crop((22, 20, 44, 42)),
                                BASE_W, BASE_H)
    path_pattern = tile_surface(sprite("path", 48, 48).crop((12, 12, 36, 36)),
                                BASE_W, BASE_H)
    art.paste(sidewalk_pattern, (0, 0), sidewalk_surface)
    art.paste(road_pattern, (0, 0), road_surface)
    art.paste(path_pattern, (0, 0), path_surface)

    # Crossings sit on selected vehicle streets; the road geometry itself is
    # still sourced from OSM and remains fully walkable.
    crossing_count = 0
    vehicle_roads = [road for road in roads if road["tags"]["highway"] in
                     ("primary", "secondary", "tertiary", "residential")]
    for road in vehicle_roads[::31]:
        shape = points(road)
        if len(shape) < 2:
            continue
        middle = len(shape) // 2
        x, y = shape[middle]
        if not (18 <= x < BASE_W - 18 and 18 <= y < BASE_H - 18):
            continue
        a, b = shape[middle - 1], shape[middle]
        crossing = sprite("crossing", 18, 18)
        if abs(b[0] - a[0]) > abs(b[1] - a[1]):
            crossing = crossing.rotate(90, expand=False, resample=Image.Resampling.NEAREST)
        art.paste(crossing, (x - 9, y - 9), crossing)
        crossing_count += 1

    occupied = Image.new("L", (BASE_W, BASE_H), 0)
    od = ImageDraw.Draw(occupied)
    school_area = next(e for e in places if e["id"] == 207885565)
    school_shape = points(school_area)
    school_cx = sum(p[0] for p in school_shape) // len(school_shape)
    school_cy = sum(p[1] for p in school_shape) // len(school_shape)
    od.rectangle((school_cx - 58, school_cy - 47, school_cx + 58, school_cy + 47), fill=255)

    roofs = ("house", "house_blue", "house_teal")
    houses = []
    scenery = []

    def road_connection(door_x: int, door_y: int) -> tuple[int, int] | None:
        """Find a short route from a new front door to the walkable street mask."""
        for radius in range(1, 39):
            for dx in range(-radius, radius + 1):
                for dy in (-radius, radius):
                    cx, cy = door_x + dx, door_y + dy
                    if 0 <= cx < BASE_W and door_y <= cy < BASE_H and mask.getpixel((cx, cy)):
                        return cx, cy
            for dy in range(-radius + 1, radius):
                for dx in (-radius, radius):
                    cx, cy = door_x + dx, door_y + dy
                    if 0 <= cx < BASE_W and door_y <= cy < BASE_H and mask.getpixel((cx, cy)):
                        return cx, cy
        return None

    def place_connected(kind: str, cx: int, cy: int, width: int, height: int) -> bool:
        """Place a building or park object beside a connected walkable path."""
        box = (cx - width // 2 - 2, cy - height // 2 - 2,
               cx + width // 2 + 3, cy + height // 2 + 3)
        if (box[0] < 8 or box[1] < 8 or box[2] >= BASE_W - 8 or box[3] >= BASE_H - 8 or
                occupied.crop(box).getbbox() or mask.crop(box).getbbox() or
                zone.getpixel((cx, cy)) == 3):
            return False
        door_x, door_y = cx, cy + height // 2 + 4
        connected = road_connection(door_x, door_y)
        if connected is None:
            return False
        draw.line(((door_x, door_y), connected), fill="#e0d5b7", width=5)
        md.line(((door_x, door_y), connected), fill=255, width=11)
        md.ellipse((door_x - 5, door_y - 5, door_x + 5, door_y + 5), fill=255)
        image = sprite(kind, width, height)
        art.paste(image, (cx - width // 2, cy - height // 2), image)
        od.rectangle(box, fill=255)
        scenery.append([door_x * SCALE, door_y * SCALE, kind])
        return True

    # The hospital polygons are the three hospitals in the downloaded OSM
    # snapshot. Other civic/commercial sprites stay in the editor palette
    # until a matching mapped site is available.
    hospitals = 0
    for place in places:
        if place.get("tags", {}).get("amenity") != "hospital":
            continue
        shape = points(place)
        cx = sum(x for x, _ in shape) // len(shape)
        cy = sum(y for _, y in shape) // len(shape)
        for dx, dy in ((0, 0), (-24, 0), (24, 0), (0, -24), (0, 24)):
            if place_connected("hospital", cx + dx, cy + dy, 36, 34):
                hospitals += 1
                break

    transit_stops = 0
    tram_platforms = []
    for platform in roads_raw["elements"]:
        tags = platform.get("tags", {})
        if tags.get("public_transport") != "platform" or not platform.get("geometry"):
            continue
        shape = points(platform)
        cx = sum(x for x, _ in shape) // len(shape)
        cy = sum(y for _, y in shape) // len(shape)
        if not (14 <= cx < BASE_W - 14 and 14 <= cy < BASE_H - 14):
            continue
        kind = "tram_stop" if tags.get("light_rail") == "yes" else "bus_stop"
        width, height = (23, 18) if kind == "tram_stop" else (19, 17)
        box = (cx - width // 2 - 2, cy - height // 2 - 2,
               cx + width // 2 + 3, cy + height // 2 + 3)
        if occupied.crop(box).getbbox():
            continue
        if not mask.getpixel((cx, cy)):
            connected = road_connection(cx, cy)
            if connected:
                draw.line(((cx, cy), connected), fill="#e0d5b7", width=4)
                md.line(((cx, cy), connected), fill=255, width=7)
        image = sprite(kind, width, height)
        art.paste(image, (cx - width // 2, cy - height // 2), image)
        od.rectangle(box, fill=255)
        scenery.append([cx * SCALE, cy * SCALE, kind])
        if kind == "tram_stop":
            tram_platforms.append((cx, cy))
        transit_stops += 1

    made = 0
    for _ in range(100000):
        if made >= 950:
            break
        x, y = RNG.randrange(18, BASE_W - 35), RNG.randrange(18, BASE_H - 35)
        w, h = RNG.randrange(16, 25), RNG.randrange(17, 25)
        box = (x - 3, y - 3, x + w + 5, y + h + 5)
        if mask.crop(box).getbbox() or occupied.crop(box).getbbox():
            continue
        if zone.getpixel((x + w // 2, y + h // 2)) in (1, 3):
            continue
        door_x, door_y = x + w // 2, y + h + 4
        connected = road_connection(door_x, door_y)
        if connected is None:
            continue
        draw.line(((door_x, door_y), connected), fill="#e0d5b7", width=5)
        md.line(((door_x, door_y), connected), fill=255, width=11)
        md.ellipse((door_x - 5, door_y - 5, door_x + 5, door_y + 5), fill=255)
        roof = RNG.choice(roofs)
        if made % 12 == 0:
            roof = "high_building"
        house = sprite(roof, w + 8, h + 8)
        art.paste(house, (x - 4, y - 4), house)
        od.rectangle(box, fill=255)
        houses.append({"entry": [door_x * SCALE, door_y * SCALE],
                       "door": [door_x * SCALE, door_y * SCALE], "roof": roof})
        made += 1

    playgrounds = 0
    for _ in range(12000):
        if playgrounds >= 12:
            break
        cx, cy = RNG.randrange(22, BASE_W - 22), RNG.randrange(22, BASE_H - 22)
        if zone.getpixel((cx, cy)) != 1:
            continue
        kind = "playground_slide" if playgrounds % 2 == 0 else "playground_swings"
        if place_connected(kind, cx, cy, 20, 18):
            playgrounds += 1

    benches = 0
    for _ in range(6000):
        if benches >= 10:
            break
        cx, cy = RNG.randrange(18, BASE_W - 18), RNG.randrange(18, BASE_H - 18)
        if zone.getpixel((cx, cy)) == 1 and place_connected("bench", cx, cy, 15, 10):
            benches += 1

    roadside_props = 0
    for road in vehicle_roads[::28]:
        shape = points(road)
        if len(shape) < 2:
            continue
        middle = len(shape) // 2
        a, b = shape[middle - 1], shape[middle]
        length = max(1, math.dist(a, b))
        side = -1 if roadside_props % 2 else 1
        offset = ROAD_WIDTH[road["tags"]["highway"]] // 2 + 12
        cx = round(b[0] + side * (a[1] - b[1]) / length * offset)
        cy = round(b[1] + side * (b[0] - a[0]) / length * offset)
        if not (15 <= cx < BASE_W - 15 and 15 <= cy < BASE_H - 15):
            continue
        kind = ("car" if roadside_props % 4 < 2 else
                "bike" if roadside_props % 4 == 2 else "traffic_light")
        width, height = {"car": (12, 18), "bike": (16, 12), "traffic_light": (9, 17)}[kind]
        box = (cx - width // 2 - 2, cy - height // 2 - 2,
               cx + width // 2 + 3, cy + height // 2 + 3)
        if occupied.crop(box).getbbox() or zone.getpixel((cx, cy)) == 3:
            continue
        image = sprite(kind, width, height)
        art.paste(image, (cx - width // 2, cy - height // 2), image)
        od.rectangle(box, fill=255)
        scenery.append([cx * SCALE, cy * SCALE, kind])
        roadside_props += 1

    tram_cars = 0
    for cx, cy in tram_platforms[::2]:
        for dx, dy in ((24, 0), (-24, 0), (0, 27), (0, -27)):
            x, y = cx + dx, cy + dy
            box = (x - 8, y - 15, x + 8, y + 15)
            if (box[0] < 0 or box[1] < 0 or box[2] >= BASE_W or box[3] >= BASE_H or
                    occupied.crop(box).getbbox() or zone.getpixel((x, y)) == 3):
                continue
            image = sprite("tram", 15, 27)
            art.paste(image, (x - 7, y - 13), image)
            od.rectangle(box, fill=255)
            scenery.append([x * SCALE, y * SCALE, "tram"])
            tram_cars += 1
            break

    trees = 0
    for _ in range(30000):
        if trees >= 1450:
            break
        x, y = RNG.randrange(10, BASE_W - 10), RNG.randrange(10, BASE_H - 10)
        r = RNG.randrange(6, 11)
        box = (x - r - 1, y - r - 1, x + r + 2, y + r + 4)
        if mask.crop(box).getbbox() or occupied.crop(box).getbbox():
            continue
        if zone.getpixel((x, y)) == 3:
            continue
        tree_kind = "tree" if RNG.random() < 0.74 else "shrub"
        tree = sprite(tree_kind,
                      r * 2 + 4, r * 2 + 4)
        art.paste(tree, (x - r - 2, y - r - 2), tree)
        od.ellipse(box, fill=255)
        scenery.append([x * SCALE, y * SCALE, tree_kind])
        trees += 1

    # The school is drawn over its OSM campus polygon. Its playable entry joins
    # the southern footpath/HaTsoarim road below the campus.
    school_mask = Image.new("L", (BASE_W, BASE_H), 0)
    ImageDraw.Draw(school_mask).polygon(school_shape, fill=255)
    plaza_pattern = tile_surface(sprite("plaza", 44, 44), BASE_W, BASE_H)
    art.paste(plaza_pattern, (0, 0), school_mask)
    draw.line(school_shape + [school_shape[0]], fill="#f3eed5", width=3)
    school_art = sprite("school", 74, 62)
    art.paste(school_art, (school_cx - 37, school_cy - 27), school_art)
    fountain = sprite("fountain", 20, 20)
    art.paste(fountain, (school_cx - 10, school_cy + 33), fountain)
    scenery.append([school_cx * SCALE, (school_cy + 43) * SCALE, "fountain"])
    door_base = px(32.08952, 34.86965)
    road_base = px(32.08943, 34.86965)
    draw.line((door_base, road_base), fill="#e5d9af", width=9)
    md.line((door_base, road_base), fill=255, width=13)
    md.ellipse((door_base[0] - 11, door_base[1] - 11,
                door_base[0] + 11, door_base[1] + 11), fill=255)

    # Flower beds and lamps add the small street details seen in the samples.
    for _ in range(400):
        x, y = RNG.randrange(12, BASE_W - 12), RNG.randrange(12, BASE_H - 12)
        box = (x - 5, y - 4, x + 7, y + 7)
        if mask.crop(box).getbbox() or occupied.crop(box).getbbox() or zone.getpixel((x, y)) == 3:
            continue
        flower = sprite("flowers", 12, 12)
        art.paste(flower, (x - 6, y - 6), flower)
        od.rectangle(box, fill=255)
        scenery.append([x * SCALE, y * SCALE, "flowers"])
    for road in roads[::18]:
        road_points = points(road)
        if not road_points:
            continue
        x, y = road_points[len(road_points) // 2]
        x += 9
        if not (12 <= x < BASE_W - 12 and 12 <= y < BASE_H - 12):
            continue
        box = (x - 3, y - 9, x + 4, y + 9)
        if occupied.crop(box).getbbox():
            continue
        lamp = sprite("lamp", 8, 18)
        art.paste(lamp, (x - 4, y - 9), lamp)
        scenery.append([x * SCALE, y * SCALE, "lamp"])

    try:
        font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 11)
        heading = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
        heading = font

    def label(name: str, lat: float, lon: float, big: bool = False) -> None:
        x, y = px(lat, lon)
        use_font = heading if big else font
        bbox = draw.textbbox((0, 0), name, font=use_font)
        width = bbox[2] - bbox[0]
        draw.rectangle((x - 4, y - 3, x + width + 4, y + 17),
                       fill="#fff7d6", outline="#344a58", width=2)
        draw.text((x, y), name, font=use_font, fill="#294159")

    label("KAPLAN SCHOOL", 32.09028, 34.86928, True)
    label("KHEN ST", 32.08880, 34.87318)
    label("TZAHAL ST", 32.09054, 34.87137)
    label("HATSOARIM ST", 32.08913, 34.86955)
    label("KAPLAN ST", 32.08795, 34.86810)
    label("JABOTINSKY", 32.09128, 34.87520)
    label("BEILINSON", 32.08833, 34.86520)
    label("ECO LAKE", 32.09390, 34.86980)
    scenery.extend([
        [*px(32.08880, 34.87318, SCALE), "sign", "Khen Street"],
        [*px(32.09054, 34.87137, SCALE), "sign", "Tzahal Street"],
        [*px(32.08913, 34.86955, SCALE), "sign", "HaTsoarim Street"],
        [*px(32.08795, 34.86810, SCALE), "sign", "Kaplan Street"],
    ])

    art.resize((WORLD_W, WORLD_H), Image.Resampling.NEAREST).save(
        ASSETS / "petah_tikva_town_map.png", optimize=True)
    mask.save(ASSETS / "walkmask.png", optimize=True)
    mask_pixels = mask.tobytes()
    mask_bits = bytearray((len(mask_pixels) + 7) // 8)
    for index, pixel in enumerate(mask_pixels):
        if pixel > 128:
            mask_bits[index >> 3] |= 1 << (index & 7)

    def world(lat: float, lon: float) -> list[int]:
        return list(px(lat, lon, SCALE))

    npc_paths = []
    for road in roads:
        if road["tags"]["highway"] not in (
                "residential", "living_street", "pedestrian", "footway",
                "path", "service", "tertiary"):
            continue
        shape = [list(px(p["lat"], p["lon"], SCALE)) for p in road["geometry"]]
        if not all(8 <= x < WORLD_W - 8 and 8 <= y < WORLD_H - 8
                   for x, y in shape):
            continue
        if sum(math.dist(a, b) for a, b in zip(shape, shape[1:])) < 35:
            continue
        npc_paths.append(shape)

    town = {
        "width": WORLD_W, "height": WORLD_H, "maskScale": SCALE,
        "maskWidth": BASE_W, "walkBits": base64.b64encode(mask_bits).decode("ascii"),
        "bounds": {"south": SOUTH, "west": WEST, "north": NORTH, "east": EAST},
        "start": world(32.08822, 34.87282),
        "school": world(32.08952, 34.86965),
        "markers": [
            {"point": world(32.08945, 34.87302), "name": "Khen Street"},
            {"point": world(32.09030, 34.87114), "name": "Tzahal Street"},
            {"point": world(32.08937, 34.87052), "name": "HaTsoarim Street"},
        ],
        "npcPaths": npc_paths,
        "houses": houses,
        "scenery": scenery,
        "osmTimestamp": roads_raw.get("osm3s", {}).get("timestamp_osm_base"),
    }
    (ASSETS / "town_data.js").write_text(
        "window.TOWN_DATA = " + json.dumps(town, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    editor_assets = ROOT / "editor" / "src" / "main" / "assets"
    if editor_assets.is_dir():
        shutil.copyfile(ASSETS / "petah_tikva_town_map.png",
                        editor_assets / "petah_tikva_town_map.png")
        shutil.copyfile(ASSETS / "map_grid.js", editor_assets / "map_grid.js")
        (editor_assets / "editor_config.js").write_text(
            "window.EDITOR_TOWN = " + json.dumps({
                "width": WORLD_W, "height": WORLD_H,
                "start": town["start"], "school": town["school"],
                "markers": [marker["point"] for marker in town["markers"]],
            }, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Map {WORLD_W}x{WORLD_H}: {len(roads)} roads, {crossing_count} crossings, "
          f"{made} enterable houses, {hospitals} hospitals, {transit_stops} transit stops, "
          f"{tram_cars} trams, {playgrounds} playgrounds, {roadside_props} roadside props, "
          f"{trees} trees, {len(scenery)} scenery interactions, {len(npc_paths)} NPC paths. "
          f"School at {town['school']}.")


if __name__ == "__main__":
    main()
