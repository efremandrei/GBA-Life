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

    art = Image.new("RGB", (BASE_W, BASE_H), "#a6d586")
    draw = ImageDraw.Draw(art)
    zone = Image.new("L", (BASE_W, BASE_H), 0)
    zd = ImageDraw.Draw(zone)

    # Small, hard-edged color variation keeps the large land parcels legible
    # without copying map tiles or smoothing the pixels.
    for _ in range(31000):
        x, y = RNG.randrange(BASE_W), RNG.randrange(BASE_H)
        size = RNG.choice((1, 2, 2, 3, 4))
        draw.rectangle((x, y, x + size, y + size),
                       fill=RNG.choice(("#a1ce7f", "#b1db91", "#9acb7e", "#afd88b")))

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
        md.line(shape, fill=255, width=width + 5, joint="curve")
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

    occupied = Image.new("L", (BASE_W, BASE_H), 0)
    od = ImageDraw.Draw(occupied)
    school_area = next(e for e in places if e["id"] == 207885565)
    school_shape = points(school_area)
    school_cx = sum(p[0] for p in school_shape) // len(school_shape)
    school_cy = sum(p[1] for p in school_shape) // len(school_shape)
    od.rectangle((school_cx - 58, school_cy - 47, school_cx + 58, school_cy + 47), fill=255)

    roofs = ("#d46c53", "#477ea5", "#4c9b8c", "#c57a53", "#6e8baf")
    made = 0
    for _ in range(30000):
        if made >= 950:
            break
        x, y = RNG.randrange(18, BASE_W - 35), RNG.randrange(18, BASE_H - 35)
        w, h = RNG.randrange(8, 18), RNG.randrange(8, 15)
        box = (x - 2, y - 2, x + w + 4, y + h + 6)
        if mask.crop(box).getbbox() or occupied.crop(box).getbbox():
            continue
        if zone.getpixel((x + w // 2, y + h // 2)) in (1, 3):
            continue
        draw_roof(draw, x, y, w, h, RNG.choice(roofs))
        od.rectangle(box, fill=255)
        made += 1

    trees = 0
    for _ in range(30000):
        if trees >= 1450:
            break
        x, y = RNG.randrange(10, BASE_W - 10), RNG.randrange(10, BASE_H - 10)
        r = RNG.randrange(3, 7)
        box = (x - r - 1, y - r - 1, x + r + 2, y + r + 4)
        if mask.crop(box).getbbox() or occupied.crop(box).getbbox():
            continue
        if zone.getpixel((x, y)) == 3:
            continue
        draw_tree(draw, x, y, r)
        od.ellipse(box, fill=255)
        trees += 1

    # The school is drawn over its OSM campus polygon. Its playable entry joins
    # the southern footpath/HaTsoarim road below the campus.
    draw.polygon(school_shape, fill="#e7dca3", outline="#8b9e75", width=3)
    sx, sy = school_cx - 26, school_cy - 13
    draw_roof(draw, sx, sy, 54, 27, "#bc4e52")
    draw.rectangle((school_cx - 4, school_cy + 14, school_cx + 4, school_cy + 21),
                   fill="#725e55")
    door_base = px(32.08952, 34.86965)
    road_base = px(32.08943, 34.86965)
    draw.line((door_base, road_base), fill="#e5d9af", width=9)
    md.line((door_base, road_base), fill=255, width=13)
    md.ellipse((door_base[0] - 11, door_base[1] - 11,
                door_base[0] + 11, door_base[1] + 11), fill=255)

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

    label("KAPLAN SCHOOL", 32.09010, 34.86928, True)
    label("KHEN ST", 32.08880, 34.87318)
    label("TZAHAL ST", 32.09054, 34.87137)
    label("HATSOARIM ST", 32.08913, 34.86955)
    label("KAPLAN ST", 32.08795, 34.86810)
    label("JABOTINSKY", 32.09128, 34.87520)
    label("BEILINSON", 32.08833, 34.86520)
    label("ECO LAKE", 32.09390, 34.86980)

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
    print(f"Map {WORLD_W}x{WORLD_H}: {len(roads)} roads, {made} buildings, "
          f"{trees} trees, {len(npc_paths)} NPC paths. School at {town['school']}.")


if __name__ == "__main__":
    main()
