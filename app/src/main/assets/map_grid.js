(() => {
  "use strict";
  const tileSize = 32;
  const artSize = 96;
  const types = ["grass", "road", "path", "plaza", "water", "tree", "shrub",
    "flowers", "fence", "house", "house_blue", "house_teal", "lamp", "school",
    "market", "fountain"];
  const artIndex = Object.fromEntries([
    "grass", "road", "path", "water", "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "lamp", "school", "market", "plaza",
    "fountain"
  ].map((name, index) => [name, index]));
  const walkable = new Set(["road", "path", "plaza"]);
  const art = new Image();
  art.src = "tile_atlas.png";

  function parse(input, width, height) {
    const data = typeof input === "string" ? JSON.parse(input) : input;
    if (!data || data.format !== "kaplan-grid-v1" || data.tileSize !== tileSize ||
        data.width !== width || data.height !== height || !Array.isArray(data.tiles)) {
      throw new Error("This is not a compatible Kaplan Quest map file.");
    }
    const cols = width / tileSize, rows = height / tileSize;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || data.tiles.length > cols * rows)
      throw new Error("The map dimensions or tile count are invalid.");
    const edits = new Map();
    for (const entry of data.tiles) {
      if (!Array.isArray(entry) || entry.length !== 2 ||
          !Number.isInteger(entry[0]) || entry[0] < 0 || entry[0] >= cols * rows ||
          !types.includes(entry[1]) || edits.has(entry[0])) {
        throw new Error("The map has an invalid or repeated block.");
      }
      edits.set(entry[0], entry[1]);
    }
    return edits;
  }
  function serialize(edits, width, height) {
    return JSON.stringify({ format: "kaplan-grid-v1", width, height, tileSize,
      tiles: [...edits].sort((a, b) => a[0] - b[0]) });
  }
  function drawTile(ctx, type, x, y, size = tileSize) {
    const index = artIndex[type];
    if (index === undefined) return;
    if (!art.complete || !art.naturalWidth) {
      ctx.fillStyle = type === "water" ? "#278ece" : type === "road" ? "#b7bec0" :
        type === "path" || type === "plaza" ? "#d5c8ae" : "#91dc78";
      ctx.fillRect(x, y, size, size);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    if (index >= 4 && type !== "plaza")
      ctx.drawImage(art, 0, 0, artSize, artSize, x, y, size, size);
    ctx.drawImage(art, (index % 4) * artSize, Math.floor(index / 4) * artSize,
      artSize, artSize, x, y, size, size);
  }
  function whenArtReady(callback) {
    if (art.complete && art.naturalWidth) callback();
    else art.addEventListener("load", callback, { once: true });
  }
  window.MapGrid = { tileSize, types, walkable, parse, serialize, drawTile, whenArtReady };
})();
