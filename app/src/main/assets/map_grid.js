(() => {
  "use strict";
  const tileSize = 32;
  const types = ["grass", "road", "path", "tree", "house", "water"];
  const walkable = new Set(["road", "path"]);
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
    const unit = size / 8;
    const box = (bx, by, bw, bh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + bx * unit, y + by * unit, bw * unit, bh * unit);
    };
    if (type === "grass" || type === "tree" || type === "house") {
      box(0, 0, 8, 8, "#91c876");
      box(1, 1, 1, 1, "#b0dc87"); box(6, 5, 1, 1, "#76b66e");
    }
    if (type === "road") {
      box(0, 0, 8, 8, "#748c83");
      box(0, 1, 8, 6, "#bbc8bd");
      box(1, 3, 2, 1, "#e1d7b5"); box(5, 3, 2, 1, "#e1d7b5");
    } else if (type === "path") {
      box(0, 0, 8, 8, "#a9bc95");
      box(1, 0, 6, 8, "#d8cba6");
      box(2, 2, 1, 1, "#eadbb4"); box(5, 5, 1, 1, "#b9aa89");
    } else if (type === "tree") {
      box(3, 5, 2, 2, "#765d47");
      box(2, 2, 5, 4, "#285f48");
      box(1, 3, 6, 2, "#397951");
      box(2, 1, 4, 4, "#60a65d");
      box(2, 2, 2, 1, "#a8d26e");
    } else if (type === "house") {
      box(1, 3, 6, 4, "#f0d6a6");
      box(1, 1, 6, 3, "#40576b");
      box(2, 1, 4, 1, "#cf775c");
      box(3, 5, 2, 2, "#795a49");
    } else if (type === "water") {
      box(0, 0, 8, 8, "#4e9fa8");
      box(1, 2, 4, 1, "#83cbd0");
      box(4, 5, 3, 1, "#83cbd0");
    }
  }
  window.MapGrid = { tileSize, types, walkable, parse, serialize, drawTile };
})();
