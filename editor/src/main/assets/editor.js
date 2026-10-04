(() => {
  "use strict";
  const town = window.EDITOR_TOWN;
  if (!town) throw new Error("Town configuration is missing.");
  const WIDTH = town.width, HEIGHT = town.height, TILE = MapGrid.tileSize, COLS = WIDTH / TILE;
  const SAVE_KEY = "petah-map-editor-v1";
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const nav = document.getElementById("navigator");
  const navCtx = nav.getContext("2d", { alpha: false });
  const map = new Image();
  map.src = "petah_tikva_town_map.png";
  const school = { x: town.school[0], y: town.school[1] };
  const view = { x: school.x - canvas.width / 4, y: school.y - canvas.height / 4, zoom: 2 };
  const protectedTiles = new Set();
  for (const [x, y] of [town.start, town.school, ...town.markers]) {
    const col = Math.floor(x / TILE), row = Math.floor(y / TILE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (col + dx >= 0 && row + dy >= 0 && col + dx < COLS && row + dy < HEIGHT / TILE)
        protectedTiles.add((row + dy) * COLS + col + dx);
    }
  }
  const palette = document.getElementById("palette");
  const status = document.getElementById("status");
  const modal = document.getElementById("aboutOverlay");
  let edits = new Map(), tool = "road", pointer = null, stroke = null, hover = null;
  const undoStack = [], redoStack = [];
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) edits = MapGrid.parse(stored, WIDTH, HEIGHT);
  } catch (_error) { status.textContent = "Saved map could not be read. The original is shown."; }

  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function constrainView() {
    view.x = clamp(view.x, 0, Math.max(0, WIDTH - canvas.width / view.zoom));
    view.y = clamp(view.y, 0, Math.max(0, HEIGHT - canvas.height / view.zoom));
  }
  function message(text) { status.textContent = text; }
  window.editorFileMessage = message;
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, MapGrid.serialize(edits, WIDTH, HEIGHT));
      message(`${edits.size} edited blocks · saved on this device`);
    } catch (_error) { message(`${edits.size} edited blocks · local storage is unavailable`); }
    updateButtons();
  }
  function updateButtons() {
    document.getElementById("undoButton").disabled = undoStack.length === 0;
    document.getElementById("redoButton").disabled = redoStack.length === 0;
    document.getElementById("zoomLabel").textContent = `${Math.round(view.zoom * 100)}%`;
    document.getElementById("position").textContent = `X ${Math.round(view.x + canvas.width / 2 / view.zoom)} · Y ${Math.round(view.y + canvas.height / 2 / view.zoom)}`;
  }
  function canvasPoint(event, target = canvas) {
    const box = target.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width * target.width,
      y: (event.clientY - box.top) / box.height * target.height };
  }
  function tileAt(point) {
    const x = Math.floor((view.x + point.x / view.zoom) / TILE);
    const y = Math.floor((view.y + point.y / view.zoom) / TILE);
    if (x < 0 || y < 0 || x >= COLS || y >= HEIGHT / TILE) return null;
    return { x, y, index: y * COLS + x };
  }
  function draw() {
    constrainView();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1b3444";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (map.complete && map.naturalWidth)
      ctx.drawImage(map, -view.x * view.zoom, -view.y * view.zoom,
        WIDTH * view.zoom, HEIGHT * view.zoom);
    const firstX = Math.max(0, Math.floor(view.x / TILE)-4);
    const lastX = Math.min(COLS - 1, Math.ceil((view.x + canvas.width / view.zoom) / TILE));
    const firstY = Math.max(0, Math.floor(view.y / TILE)-4);
    const lastY = Math.min(HEIGHT / TILE - 1, Math.ceil((view.y + canvas.height / view.zoom) / TILE));
    for (let y = firstY; y <= lastY; y++) for (let x = firstX; x <= lastX; x++) {
      const type = edits.get(y * COLS + x);
      if (type) MapGrid.drawTile(ctx, type, (x * TILE - view.x) * view.zoom,
        (y * TILE - view.y) * view.zoom, TILE * view.zoom,true);
    }
    ctx.strokeStyle = "#17344982";
    ctx.lineWidth = view.zoom < 0.5 ? 0.5 : 1;
    ctx.beginPath();
    for (let x = firstX; x <= lastX + 1; x++) {
      const sx = Math.round((x * TILE - view.x) * view.zoom) + 0.5;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height);
    }
    for (let y = firstY; y <= lastY + 1; y++) {
      const sy = Math.round((y * TILE - view.y) * view.zoom) + 0.5;
      ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy);
    }
    ctx.stroke();
    if (hover) {
      ctx.strokeStyle = "#ffe583"; ctx.lineWidth = 3;
      const [fw,fh]=MapGrid.footprint(tool);
      ctx.strokeRect((hover.x * TILE - view.x) * view.zoom + 1,
        (hover.y * TILE - view.y) * view.zoom + 1, TILE * view.zoom * fw - 2, TILE * view.zoom * fh - 2);
    }
    const sx = (school.x - view.x) * view.zoom, sy = (school.y - view.y) * view.zoom;
    if (sx >= 0 && sy >= 0 && sx < canvas.width && sy < canvas.height) {
      ctx.fillStyle = "#c64b4f"; ctx.fillRect(sx - 5, sy - 5, 10, 10);
      ctx.strokeStyle = "#fff1b6"; ctx.strokeRect(sx - 7, sy - 7, 14, 14);
    }
    updateButtons();
    drawNavigator();
  }
  function drawNavigator() {
    navCtx.imageSmoothingEnabled = false;
    navCtx.fillStyle = "#81b978"; navCtx.fillRect(0, 0, nav.width, nav.height);
    if (map.complete && map.naturalWidth) navCtx.drawImage(map, 0, 0, nav.width, nav.height);
    const scale = nav.width / WIDTH;
    for (const [index, type] of edits) {
      const x = index % COLS * TILE * scale;
      const y = Math.floor(index / COLS) * TILE * scale;
      MapGrid.drawTile(navCtx, type, x, y, TILE * scale,true);
    }
    navCtx.strokeStyle = "#fff1a1"; navCtx.lineWidth = 3;
    navCtx.strokeRect(view.x * scale, view.y * scale,
      canvas.width / view.zoom * scale, canvas.height / view.zoom * scale);
    navCtx.fillStyle = "#d34f56";
    navCtx.fillRect(school.x * scale - 3, school.y * scale - 3, 6, 6);
  }
  function paintCell(cell) {
    if (!cell) return;
    const before = edits.get(cell.index) ?? null;
    const after = tool === "erase" ? null : tool;
    const [fw,fh]=MapGrid.footprint(after);
    const blocked=Array.from({length:fw*fh},(_,i)=>(cell.y+Math.floor(i/fw))*COLS+cell.x+i%fw);
    if (after && !MapGrid.walkable.has(after) && (blocked.some(index=>protectedTiles.has(index)) || cell.x+fw>COLS || cell.y+fh>HEIGHT/TILE)) {
      message("Keep the start, school, and marker paths open.");
      return;
    }
    if (before === after) return;
    if (!stroke.has(cell.index)) stroke.set(cell.index, before);
    if (after === null) edits.delete(cell.index);
    else edits.set(cell.index, after);
  }
  function paintLine(from, to) {
    if (!to) return;
    if (!from) { paintCell(to); return; }
    let x = from.x, y = from.y;
    const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
    const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
    let error = dx - dy;
    while (true) {
      if (x >= 0 && y >= 0 && x < COLS && y < HEIGHT / TILE)
        paintCell({ x, y, index: y * COLS + x });
      if (x === to.x && y === to.y) break;
      const twice = 2 * error;
      if (twice > -dy) { error -= dy; x += sx; }
      if (twice < dx) { error += dx; y += sy; }
    }
  }
  function commitStroke() {
    if (stroke?.size) {
      undoStack.push([...stroke].map(([index, before]) => [index, before, edits.get(index) ?? null]));
      if (undoStack.length > 80) undoStack.shift();
      redoStack.length = 0;
      save();
    }
    stroke = null;
    draw();
  }
  function applyHistory(changes, useAfter) {
    for (const [index, before, after] of changes) {
      const type = useAfter ? after : before;
      if (type === null) edits.delete(index); else edits.set(index, type);
    }
    save(); draw();
  }
  function undo() {
    const changes = undoStack.pop();
    if (!changes) return;
    redoStack.push(changes); applyHistory(changes, false);
  }
  function redo() {
    const changes = redoStack.pop();
    if (!changes) return;
    undoStack.push(changes); applyHistory(changes, true);
  }
  function setTool(next) {
    tool = next;
    for (const button of palette.querySelectorAll("button")) {
      const active = button.dataset.tool === next;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    }
    canvas.style.cursor = next === "hand" ? "grab" : "crosshair";
    message(next === "hand" ? "Drag the map to move around." : `${next} selected · tap or drag to paint`);
  }
  const paletteGroups = new Map([
    ["grass", "STREETS"], ["tree", "NATURE"], ["house", "BUILDINGS"],
    ["bus_stop", "TRANSIT"], ["playground_slide", "PARK & DETAILS"],
  ]);
  for (const name of ["hand", ...MapGrid.types, "erase"]) {
    if (paletteGroups.has(name)) {
      const heading = document.createElement("div");
      heading.className = "palette-group";
      heading.textContent = paletteGroups.get(name);
      palette.append(heading);
    }
    const button = document.createElement("button");
    button.type = "button"; button.dataset.tool = name;
    const swatch = document.createElement("canvas");
    swatch.className = "swatch"; swatch.width = swatch.height = 32;
    const swatchCtx = swatch.getContext("2d");
    if (MapGrid.types.includes(name)) MapGrid.drawTile(swatchCtx, name, 0, 0);
    else {
      swatchCtx.fillStyle = name === "hand" ? "#527c93" : "#e8e7d3";
      swatchCtx.fillRect(0, 0, 32, 32);
      swatchCtx.fillStyle = name === "hand" ? "#fff0b1" : "#a84b51";
      swatchCtx.font = "bold 25px sans-serif";
      swatchCtx.fillText(name === "hand" ? "✥" : "×", 7, 25);
    }
    const labels = { house: "Red house", house_blue: "Blue house", house_teal: "Teal house",
      bike: "Bicycle", tram: "Light rail tram" };
    button.append(swatch, document.createTextNode(labels[name] ||
      name.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase())));
    button.addEventListener("click", () => setTool(name));
    palette.append(button);
  }
  setTool(tool);
  document.getElementById("paletteUp").addEventListener("click", () => {
    palette.scrollTop -= Math.max(100, palette.clientHeight * 0.8);
  });
  document.getElementById("paletteDown").addEventListener("click", () => {
    palette.scrollTop += Math.max(100, palette.clientHeight * 0.8);
  });
  MapGrid.whenArtReady(() => {
    for (const button of palette.querySelectorAll("button[data-tool]")) {
      if (!MapGrid.types.includes(button.dataset.tool)) continue;
      const swatch = button.querySelector("canvas");
      const swatchCtx = swatch.getContext("2d");
      swatchCtx.clearRect(0, 0, 32, 32);
      MapGrid.drawTile(swatchCtx, button.dataset.tool, 0, 0);
    }
    draw();
  });

  canvas.addEventListener("pointerdown", event => {
    if (pointer) return;
    event.preventDefault(); canvas.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    pointer = { id: event.pointerId, point, cell: tileAt(point) };
    if (tool !== "hand") {
      stroke = new Map(); paintCell(pointer.cell); draw();
    }
  });
  canvas.addEventListener("pointermove", event => {
    const point = canvasPoint(event);
    hover = tileAt(point);
    if (pointer?.id === event.pointerId) {
      if (tool === "hand") {
        view.x -= (point.x - pointer.point.x) / view.zoom;
        view.y -= (point.y - pointer.point.y) / view.zoom;
        constrainView();
      } else {
        paintLine(pointer.cell, hover);
        pointer.cell = hover;
      }
      pointer.point = point;
    }
    draw();
  });
  function finishPointer(event) {
    if (pointer?.id !== event.pointerId) return;
    pointer = null;
    if (stroke) commitStroke();
  }
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("pointerleave", () => { hover = null; if (!pointer) draw(); });
  nav.addEventListener("pointerdown", event => {
    const point = canvasPoint(event, nav);
    view.x = point.x / nav.width * WIDTH - canvas.width / (2 * view.zoom);
    view.y = point.y / nav.height * HEIGHT - canvas.height / (2 * view.zoom);
    draw();
  });
  function zoomTo(next) {
    const centerX = view.x + canvas.width / (2 * view.zoom);
    const centerY = view.y + canvas.height / (2 * view.zoom);
    view.zoom = clamp(next, 0.25, 4);
    view.x = centerX - canvas.width / (2 * view.zoom);
    view.y = centerY - canvas.height / (2 * view.zoom);
    draw();
  }
  document.getElementById("zoomOut").addEventListener("click", () => zoomTo(view.zoom / 2));
  document.getElementById("zoomIn").addEventListener("click", () => zoomTo(view.zoom * 2));
  document.getElementById("schoolButton").addEventListener("click", () => {
    view.x = school.x - canvas.width / (2 * view.zoom);
    view.y = school.y - canvas.height / (2 * view.zoom);
    draw();
  });
  canvas.addEventListener("wheel", event => {
    event.preventDefault(); zoomTo(view.zoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2));
  }, { passive: false });
  document.getElementById("undoButton").addEventListener("click", undo);
  document.getElementById("redoButton").addEventListener("click", redo);
  document.getElementById("clearButton").addEventListener("click", () => {
    if (!edits.size) return;
    const changes = [...edits].map(([index, type]) => [index, type, null]);
    edits.clear(); undoStack.push(changes); redoStack.length = 0; save(); draw();
  });
  window.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
      event.preventDefault(); if (event.shiftKey) redo(); else undo();
    } else if ((event.ctrlKey || event.metaKey) && event.code === "KeyY") {
      event.preventDefault(); redo();
    }
  });

  function receiveMap(json) {
    try {
      const incoming = MapGrid.parse(json, WIDTH, HEIGHT);
      if ([...protectedTiles].some(index => (MapGrid.covered(incoming,index%COLS,Math.floor(index/COLS),COLS) || incoming.has(index) &&
          !MapGrid.walkable.has(incoming.get(index)))))
        throw new Error("Keep the start, school, and marker paths open.");
      const keys = new Set([...edits.keys(), ...incoming.keys()]);
      const changes = [...keys].map(index => [index, edits.get(index) ?? null,
        incoming.get(index) ?? null]).filter(([, before, after]) => before !== after);
      if (changes.length) { undoStack.push(changes); redoStack.length = 0; }
      edits = incoming;
      save(); draw();
      message(`Imported ${edits.size} blocks. Saved on this device.`);
      return true;
    } catch (error) { message(error.message || "Map import failed."); return false; }
  }
  window.editorReceiveMap = receiveMap;
  const fileInput = document.getElementById("fileInput");
  document.getElementById("importButton").addEventListener("click", () => {
    if (window.NativeEditor?.importMap) window.NativeEditor.importMap();
    else fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (file) {
      if (file.size > 1000000) message("Map file is too large.");
      else receiveMap(await file.text());
    }
    fileInput.value = "";
  });
  document.getElementById("exportButton").addEventListener("click", () => {
    const json = MapGrid.serialize(edits, WIDTH, HEIGHT);
    if (window.NativeEditor?.exportMap) window.NativeEditor.exportMap(json);
    else {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "PetahTikva-Map.json";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      message(`Exported ${edits.size} blocks. Import this file in Kaplan Quest.`);
    }
  });
  document.getElementById("aboutButton").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("closeAbout").addEventListener("click", () => modal.classList.add("hidden"));
  window.editorBack = () => {
    if (modal.classList.contains("hidden")) return false;
    modal.classList.add("hidden"); return true;
  };
  const themeButton = document.getElementById("themeButton");
  function theme(value) {
    const light = value === "light";
    document.documentElement.classList.toggle("light", light);
    themeButton.textContent = light ? "☾" : "☀";
    themeButton.setAttribute("aria-label", `Switch to ${light ? "dark" : "light"} skin`);
  }
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("petah-editor-theme") || "dark"; } catch (_error) { /* Dark first. */ }
  theme(savedTheme);
  themeButton.addEventListener("click", () => {
    savedTheme = savedTheme === "dark" ? "light" : "dark";
    theme(savedTheme);
    try { localStorage.setItem("petah-editor-theme", savedTheme); } catch (_error) { /* Session only. */ }
  });
  map.addEventListener("load", draw);
  map.addEventListener("error", () => message("Base map artwork could not load."));
  if (map.complete && map.naturalWidth) draw();
  else updateButtons();
  if (new URLSearchParams(location.search).has("test")) {
    window.__editorDebug = () => ({ count: edits.size, tool, zoom: view.zoom,
      mapLoaded: map.complete && map.naturalWidth > 0, canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0, viewX: view.x, viewY: view.y,
      tileAt: (x, y) => edits.get(Math.floor(y / TILE) * COLS + Math.floor(x / TILE)) || null });
  }
})();
