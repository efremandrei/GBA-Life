(() => {
  "use strict";

  function seed(id) {
    let value = 2166136261;
    for (const character of String(id)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
    return value >>> 0;
  }

  function layout(width, height) {
    const compact = width < 540;
    const w = Math.min(width - 24, 520);
    const h = Math.max(260, Math.min(compact ? 600 : 520, height - (compact ? 160 : 180)));
    const x = Math.round((width - w) / 2);
    const y = compact ? 68 : 62;
    return { x, y, w, h, floorY: y + 82,
      exitX: Math.round(x + w / 2), exitY: y + h - 23 };
  }

  function objects(house, room) {
    const variant = seed(house.id);
    const leftBed = (variant & 1) === 0;
    const leftX = room.x + 64, rightX = room.x + room.w - 64;
    const bedX = leftBed ? leftX : rightX;
    const shelfX = leftBed ? rightX : leftX;
    const available = room.h - 112;
    return [
      { kind: "bed", x: bedX, y: room.floorY + 45, w: 78, h: 60 },
      { kind: "bookshelf", x: shelfX, y: room.floorY + 31, w: 66, h: 54 },
      { kind: "table", x: room.x + room.w / 2, y: room.floorY + available * .47, w: 84, h: 51 },
      { kind: "plant", x: leftBed ? rightX : leftX, y: room.floorY + available * .70, w: 38, h: 42 },
      { kind: "chest", x: leftBed ? leftX : rightX, y: room.floorY + available * .78, w: 56, h: 38 },
      { kind: variant % 3 === 0 ? "radio" : "fridge", x: leftBed ? rightX : leftX,
        y: room.floorY + available * .91, w: 49, h: 44 },
    ];
  }

  function canStand(x, y, room, items) {
    if (x < room.x + 17 || x > room.x + room.w - 17 ||
        y < room.floorY + 13 || y > room.y + room.h - 14) return false;
    return items.every(item =>
      Math.abs(x - item.x) > item.w / 2 + 7 ||
      Math.abs(y - item.y) > item.h / 2 + 7);
  }

  function nearest(x, y, room, items) {
    const candidates = [
      { kind: "exit", x: room.exitX, y: room.exitY, w: 40, h: 18 }, ...items,
    ];
    return candidates.map(item => ({ item, distance: Math.hypot(x - item.x, y - item.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function draw(ctx, house, width, height) {
    const room = layout(width, height);
    const items = objects(house, room);
    const variant = seed(house.id);
    const walls = house.roof === "house_blue" ? ["#a9c6db", "#6e9bb8"] :
      house.roof === "house_teal" ? ["#b4d6bd", "#75aa96"] : ["#e8c6ae", "#bc8f7c"];
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, width, height, "#18313a");
    for (let y = 0; y < height; y += 40) for (let x = 0; x < width; x += 40)
      rect(x, y, 2, 2, "#245146");
    rect(room.x - 6, room.y - 6, room.w + 12, room.h + 12, "#152735");
    rect(room.x, room.y, room.w, room.h, "#efd9aa");
    rect(room.x, room.y, room.w, 82, walls[0]);
    for (let x = room.x + 12; x < room.x + room.w - 8; x += 24)
      rect(x, room.y + 8, 3, 66, walls[1]);
    rect(room.x, room.y + 75, room.w, 8, "#705744");
    for (let y = room.floorY; y < room.y + room.h; y += 24) {
      for (let x = room.x; x < room.x + room.w; x += 24) {
        rect(x, y, 23, 23, ((x + y + variant) % 3) ? "#e9d2a6" : "#dfc697");
        rect(x + 3, y + 3, 2, 2, "#c8b385");
      }
    }
    rect(room.x + 16, room.y + 24, 66, 47, "#624f4a");
    rect(room.x + 21, room.y + 29, 56, 36, "#70b9d8");
    rect(room.x + 46, room.y + 29, 4, 36, "#f5e8bf");
    rect(room.x + 21, room.y + 46, 56, 3, "#f5e8bf");
    rect(room.x + room.w - 82, room.y + 24, 66, 47, "#624f4a");
    rect(room.x + room.w - 77, room.y + 29, 56, 36, "#70b9d8");
    rect(room.x + room.w - 52, room.y + 29, 4, 36, "#f5e8bf");
    rect(room.x + room.w - 77, room.y + 46, 56, 3, "#f5e8bf");
    const rugX = room.x + room.w / 2 - 63;
    const rugY = room.floorY + (room.h - 112) * .48 - 42;
    rect(rugX, rugY, 126, 88, variant % 2 ? "#6c9f9c" : "#c96d65");
    rect(rugX + 6, rugY + 6, 114, 76, "#f1d0a5");
    rect(rugX + 12, rugY + 12, 102, 64, variant % 2 ? "#6c9f9c" : "#c96d65");
    for (const item of items) {
      const x = Math.round(item.x - item.w / 2), y = Math.round(item.y - item.h / 2);
      rect(x + 3, y + item.h - 2, item.w, 5, "#8d785f");
      if (item.kind === "bed") {
        rect(x, y, item.w, item.h, "#5d4036");
        rect(x + 5, y + 5, item.w - 10, item.h - 10, "#fff2d6");
        rect(x + 7, y + 24, item.w - 14, item.h - 31,
          variant % 2 ? "#5e91bd" : "#cf6564");
        rect(x + 12, y + 8, item.w - 24, 13, "#fdf9e9");
      } else if (item.kind === "bookshelf") {
        rect(x, y, item.w, item.h, "#694835");
        for (let row = 0; row < 2; row++) {
          rect(x + 5, y + 4 + row * 24, item.w - 10, 17, "#c49b63");
          for (let col = 0; col < 7; col++)
            rect(x + 7 + col * 8, y + 6 + row * 24, 5, 14,
              ["#b95352", "#4f8a8c", "#e3cc83"][((variant + col + row) % 3)]);
        }
      } else if (item.kind === "table") {
        rect(x + 5, y + 8, item.w - 10, item.h - 6, "#654734");
        rect(x, y, item.w, item.h - 13, "#a9784b");
        rect(x + 5, y + 5, item.w - 10, item.h - 23, "#d5aa73");
        rect(x + 31, y + 8, 20, 12, "#fff1d6");
        rect(x + 36, y + 11, 10, 6, "#78b7c7");
      } else if (item.kind === "plant") {
        rect(x + 8, y + 25, item.w - 16, 16, "#b96c49");
        rect(x + 4, y + 8, item.w - 8, 24, "#397a4d");
        rect(x + 9, y + 2, item.w - 18, 23, "#79bf54");
        rect(x + 14, y + 8, 6, 5, "#cde56b");
      } else if (item.kind === "chest") {
        rect(x, y + 8, item.w, item.h - 8, "#684832");
        rect(x + 4, y + 4, item.w - 8, item.h - 13, "#bc8a52");
        rect(x + 4, y + 19, item.w - 8, 4, "#6c5036");
        rect(x + item.w / 2 - 3, y + 17, 6, 10, "#f1ce70");
      } else if (item.kind === "radio") {
        rect(x, y, item.w, item.h, "#424b51");
        rect(x + 5, y + 7, item.w - 10, 24, "#89b7ad");
        rect(x + 10, y + 12, 6, 6, "#fff3bb");
        rect(x + 22, y + 12, 6, 6, "#fff3bb");
      } else if (item.kind === "fridge") {
        rect(x, y, item.w, item.h, "#bdd6cb");
        rect(x + 5, y + 5, item.w - 10, item.h - 10, "#f3f1df");
        rect(x + 6, y + 23, item.w - 12, 3, "#87aca7");
        rect(x + item.w - 13, y + 11, 3, 8, "#7b8f91");
      }
    }
    rect(room.exitX - 24, room.y + room.h - 23, 48, 23, "#6b4c3b");
    rect(room.exitX - 17, room.y + room.h - 20, 34, 20, "#a87853");
    rect(room.exitX - 4, room.y + room.h - 8, 8, 3, "#f3d982");
    return { room, items };
  }

  window.HouseRooms = { layout, objects, canStand, nearest, draw };
})();
