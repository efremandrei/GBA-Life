(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const map = new Image();
  map.src = "gba_town_map.png";
  const playerArt = new Image();
  playerArt.src = "player_avatar_sprite_sheet.png";
  // Crops are aligned to the four transparent sprites generated from the supplied avatar.
  const playerViews = {
    down: [183, 92, 318, 482],
    up: [762, 92, 323, 482],
    left: [186, 660, 320, 492],
    right: [763, 660, 320, 492],
  };
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_W = 1024;
  const WORLD_H = 1536;
  const SPEED = 145;

  const walkable = [
    // Major streets: Kaplan, Ha-Tso'arim, Tsahal, Khen, and the lower street.
    [0, 102, 918, 185],
    [313, 118, 391, 610],
    [0, 565, 916, 642],
    [530, 594, 610, 1414],
    [0, 1364, 918, 1440],
    // Home walkway and the small plaza beside the marked building.
    [475, 1280, 570, 1378],
    [372, 371, 444, 442],
    [396, 359, 609, 529],
  ];
  const markers = [
    { x: 565, y: 990, name: "Khen Street", found: false },
    { x: 462, y: 604, name: "Tsahal Street", found: false },
    { x: 351, y: 447, name: "Ha-Tso'arim Street", found: false },
  ];
  const school = { x: 490, y: 372 };
  const player = { x: 488, y: 1326, facing: "down", step: 0 };
  const camera = { x: 0, y: WORLD_H - H };
  const keys = new Set();
  const touch = new Set();
  const particles = [];
  const SAVE_KEY = "kaplan-quest-save-v1";
  const creatures = [
    { name: "Shrubbit", colors: ["#285e43", "#65ae65", "#b8df79"], hp: 13 },
    { name: "Sparkpup", colors: ["#755334", "#e2a84f", "#ffe18a"], hp: 17 },
  ];
  const buddy = { hp: 24, maxHp: 24, snacks: 2 };
  let battle = null;
  let saveTimer = 0;
  let aboutWasOpen = false;
  let phase = "title";
  let lastTime = 0;
  let message = "";
  let messageUntil = 0;
  let audio = false;
  let audioContext = null;

  const startOverlay = document.getElementById("startOverlay");
  const winOverlay = document.getElementById("winOverlay");
  const soundButton = document.getElementById("soundButton");
  const themeButton = document.getElementById("themeButton");
  const battleOverlay = document.getElementById("battleOverlay");
  const aboutOverlay = document.getElementById("aboutOverlay");
  const battleMessage = document.getElementById("battleMessage");

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        x: player.x, y: player.y, facing: player.facing,
        markers: markers.map(marker => marker.found),
        hp: buddy.hp, snacks: buddy.snacks, phase,
        battle: battle ? { markerIndex: battle.markerIndex, hp: battle.hp } : null,
      }));
    } catch (_error) { /* The game remains playable if storage is unavailable. */ }
  }
  function savedGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) { return null; }
  }
  function updateStatus() {
    document.getElementById("questStatus").textContent = `${foundCount()} / 3 street markers`;
    document.getElementById("partnerStatus").textContent = `Buddy HP ${buddy.hp}/${buddy.maxHp}`;
  }
  function resume() {
    const state = savedGame();
    if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.y)) return reset();
    player.x = clamp(state.x, 8, WORLD_W - 8);
    player.y = clamp(state.y, 8, WORLD_H - 8);
    if (!canStand(player.x, player.y)) { player.x = 488; player.y = 1326; }
    player.facing = playerViews[state.facing] ? state.facing : "down";
    markers.forEach((marker, index) => { marker.found = !!state.markers?.[index]; });
    buddy.hp = clamp(Number(state.hp) || 24, 1, 24);
    buddy.snacks = clamp(Number(state.snacks) || 0, 0, 2);
    camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
    camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
    phase = state.phase === "won" ? "won" : "playing";
    startOverlay.classList.add("hidden");
    winOverlay.classList.toggle("hidden", phase !== "won");
    battleOverlay.classList.add("hidden");
    if (state.phase === "battle" && state.battle && [0, 2].includes(state.battle.markerIndex)) {
      const index = state.battle.markerIndex;
      const creature = creatures[index === 0 ? 0 : 1];
      battle = { creature, hp: clamp(Number(state.battle.hp) || creature.hp, 1, creature.hp), markerIndex: index, busy: false };
      phase = "battle";
      document.getElementById("battleName").textContent = `A wild ${creature.name} appeared!`;
      battleMessage.textContent = "Choose a move for your Buddy.";
      creatureArt(creature);
      battleStats();
      battleOverlay.classList.remove("hidden");
    }
    updateStatus();
    say("Welcome back to Petah Tiqwa!", 3);
    canvas.focus();
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }
  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }
  function foundCount() {
    return markers.filter(marker => marker.found).length;
  }
  function isOpenPoint(x, y) {
    if (x < 8 || y < 8 || x > WORLD_W - 8 || y > WORLD_H - 8) return false;
    const onRoad = walkable.some(([x1, y1, x2, y2]) =>
      x >= x1 && x <= x2 && y >= y1 && y <= y2);
    if (!onRoad) return false;
    // The fountain and red-roof building have solid footprints.
    if (distance(x, y, 490, 431) < 31) return false;
    if (x >= 431 && x <= 586 && y >= 345 && y < 369) return false;
    return true;
  }
  function canStand(x, y) {
    return [[0, 0], [-8, 0], [8, 0], [0, -5], [0, 5]]
      .every(([dx, dy]) => isOpenPoint(x + dx, y + dy));
  }
  function say(text, seconds = 3.5) {
    message = text;
    messageUntil = performance.now() / 1000 + seconds;
  }
  function tone(frequency, duration = 0.12, delay = 0) {
    if (!audio) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + delay;
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.045, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    } catch (_error) {
      audio = false;
      soundButton.textContent = "♪ Off";
    }
  }
  function reset() {
    player.x = 488;
    player.y = 1326;
    player.facing = "down";
    player.step = 0;
    camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
    camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
    markers.forEach(marker => { marker.found = false; });
    buddy.hp = buddy.maxHp;
    buddy.snacks = 2;
    battle = null;
    particles.length = 0;
    keys.clear();
    touch.clear();
    phase = "playing";
    startOverlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    battleOverlay.classList.add("hidden");
    updateStatus();
    save();
    say("Collect 3 gold markers, then enter Kaplan School.", 5);
    canvas.focus();
  }
  function interact() {
    if (!aboutOverlay.classList.contains("hidden")) {
      aboutOverlay.classList.add("hidden");
      return;
    }
    if (phase === "battle") { attack(); return; }
    if (phase === "title" || phase === "won") {
      reset();
      return;
    }
    if (distance(player.x, player.y, school.x, school.y) < 57) {
      if (foundCount() === markers.length) {
        phase = "won";
        winOverlay.classList.remove("hidden");
        save();
        tone(523, 0.18);
        tone(659, 0.18, 0.18);
        tone(784, 0.4, 0.36);
      } else {
        say(`Find ${markers.length - foundCount()} more route marker${markers.length - foundCount() === 1 ? "" : "s"} first.`);
        tone(230, 0.14);
      }
    } else if (player.y > 1250) {
      say("Home is here. Head north on Khen Street!");
    } else {
      say("Follow the gold markers toward Kaplan School.");
    }
  }
  function creatureArt(creature) {
    const art = document.getElementById("battleArt");
    const c = art.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 240, 110);
    const [dark, mid, light] = creature.colors;
    c.fillStyle = "#d7e6bc"; c.fillRect(0, 0, 240, 110);
    c.fillStyle = "#b5cd9b"; c.fillRect(0, 84, 240, 26);
    const blocks = [
      [88, 22, 18, 35, dark], [134, 22, 18, 35, dark],
      [93, 15, 9, 30, light], [139, 15, 9, 30, light],
      [83, 47, 74, 44, dark], [89, 51, 62, 36, mid],
      [94, 84, 17, 12, dark], [129, 84, 17, 12, dark],
      [100, 56, 10, 10, "#273743"], [132, 56, 10, 10, "#273743"],
      [105, 57, 3, 3, "#fff8d5"], [137, 57, 3, 3, "#fff8d5"],
      [116, 71, 9, 6, light],
    ];
    for (const [x, y, w, h, color] of blocks) {
      c.fillStyle = color; c.fillRect(x, y, w, h);
    }
  }
  function battleStats() {
    document.getElementById("heroHp").textContent = `Buddy HP ${buddy.hp}/${buddy.maxHp}`;
    document.getElementById("enemyHp").textContent = `${battle.creature.name} HP ${battle.hp}/${battle.creature.hp}`;
    document.getElementById("healButton").textContent = `Snack ×${buddy.snacks}`;
    updateStatus();
  }
  function beginBattle(index) {
    const creature = creatures[index === 0 ? 0 : 1];
    battle = { creature, hp: creature.hp, markerIndex: index, busy: false };
    phase = "battle";
    keys.clear(); touch.clear();
    document.getElementById("battleName").textContent = `A wild ${creature.name} appeared!`;
    battleMessage.textContent = "Choose a move for your Buddy.";
    creatureArt(creature);
    battleStats();
    battleOverlay.classList.remove("hidden");
    save();
  }
  function enemyTurn() {
    if (!battle || phase !== "battle") return;
    const hit = 2 + Math.floor(Math.random() * 3);
    buddy.hp = Math.max(0, buddy.hp - hit);
    if (buddy.hp === 0) {
      const lostMarker = markers[battle.markerIndex];
      lostMarker.found = false;
      battleMessage.textContent = "Buddy fainted! Resting at Home…";
      battleStats();
      setTimeout(() => {
        battleOverlay.classList.add("hidden");
        battle = null;
        buddy.hp = buddy.maxHp;
        player.x = 488; player.y = 1326;
        camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
        phase = "playing";
        updateStatus(); save();
        say("Your Buddy recovered. Try the route again!", 4);
      }, 1100);
    } else {
      battleMessage.textContent = `${battle.creature.name} hit for ${hit}. Your turn!`;
      battle.busy = false;
      battleStats(); save();
    }
  }
  function attack() {
    if (!battle || battle.busy) return;
    battle.busy = true;
    const hit = 5 + Math.floor(Math.random() * 4);
    battle.hp = Math.max(0, battle.hp - hit);
    tone(320, 0.08);
    battleStats();
    if (battle.hp === 0) {
      battleMessage.textContent = `${battle.creature.name} wandered away. Nice work!`;
      tone(523, 0.12); tone(784, 0.18, 0.12);
      setTimeout(() => {
        battleOverlay.classList.add("hidden");
        battle = null;
        phase = "playing";
        save();
        say("Route clear! Keep walking toward Kaplan School.", 4);
      }, 900);
    } else {
      battleMessage.textContent = `Buddy hit for ${hit}!`;
      setTimeout(enemyTurn, 650);
    }
  }
  function snack() {
    if (!battle || battle.busy || buddy.snacks <= 0) return;
    battle.busy = true;
    buddy.snacks -= 1;
    buddy.hp = Math.min(buddy.maxHp, buddy.hp + 9);
    battleMessage.textContent = "Buddy recovered 9 HP!";
    battleStats(); save();
    setTimeout(enemyTurn, 650);
  }
  function spawnBurst(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI * 2 / 12;
      particles.push({ x, y, vx: Math.cos(angle) * 70,
        vy: Math.sin(angle) * 70 - 20, life: 0.75 });
    }
  }
  function update(dt, time) {
    if (phase !== "playing") return;
    const down = name => keys.has(name) || touch.has(name);
    let dx = Number(down("right")) - Number(down("left"));
    let dy = Number(down("down")) - Number(down("up"));
    if (dx || dy) {
      const mag = Math.hypot(dx, dy);
      dx /= mag;
      dy /= mag;
      const nx = player.x + dx * SPEED * dt;
      const ny = player.y + dy * SPEED * dt;
      if (canStand(nx, player.y)) player.x = nx;
      if (canStand(player.x, ny)) player.y = ny;
      player.facing = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      player.step += dt * 9;
      saveTimer += dt;
      if (saveTimer > 1) { saveTimer = 0; save(); }
    } else {
      player.step = 0;
    }
    const targetX = clamp(player.x - W / 2, 0, WORLD_W - W);
    const targetY = clamp(player.y - H / 2, 0, WORLD_H - H);
    const ease = Math.min(1, dt * 8);
    camera.x += (targetX - camera.x) * ease;
    camera.y += (targetY - camera.y) * ease;

    for (const [index, marker] of markers.entries()) {
      if (!marker.found && distance(player.x, player.y, marker.x, marker.y) < 23) {
        marker.found = true;
        spawnBurst(marker.x, marker.y);
        say(`${marker.name} marker found!  ${foundCount()}/3`, 3);
        tone(520, 0.12);
        tone(780, 0.20, 0.12);
        updateStatus();
        if (index === 0 || index === 2) beginBattle(index);
        else save();
        break;
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 95 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (message && time > messageUntil) message = "";
  }
  function locationName() {
    if (player.y > 1230) return "HOME";
    if (player.x > 510 && player.y > 640) return "KHEN ST";
    if (player.y > 535 && player.y < 650) return "TSAHAL ST";
    if (player.x < 395 && player.y < 570) return "HA-TSO'ARIM ST";
    if (player.y < 540 && player.x > 395 && player.x < 620) return "KAPLAN SCHOOL";
    return "KAPLAN ST";
  }
  function panel(x, y, width, height) {
    ctx.fillStyle = "#25364b";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#fff9e2";
    ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
  }
  function markerShape(x, y, time) {
    const bounce = Math.sin(time * 5 + x) * 3;
    const sx = Math.round(x - camera.x);
    const sy = Math.round(y - camera.y + bounce);
    ctx.fillStyle = "#465468";
    ctx.fillRect(sx - 9, sy + 12, 18, 4);
    ctx.fillStyle = "#8b4f20";
    ctx.fillRect(sx - 10, sy - 11, 20, 20);
    ctx.fillStyle = "#ffef8b";
    ctx.fillRect(sx - 7, sy - 8, 14, 14);
    ctx.fillStyle = "#dd9736";
    ctx.fillRect(sx - 3, sy - 4, 6, 7);
    ctx.fillRect(sx - 5, sy - 2, 10, 3);
    ctx.fillStyle = "#fffce6";
    ctx.fillRect(sx - 2, sy - 6, 4, 4);
  }
  function drawPlayer() {
    const x = Math.round(player.x - camera.x);
    const y = Math.round(player.y - camera.y);
    const bob = player.step ? Math.floor(player.step) % 2 : 0;
    ctx.fillStyle = "#394a4d88";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (playerArt.complete && playerArt.naturalWidth) {
      const [sx, sy, sw, sh] = playerViews[player.facing];
      ctx.drawImage(playerArt, sx, sy, sw, sh, x - 19, y - 58 - bob, 38, 58);
      return;
    }
    // Matching code-drawn fallback in case the separate sprite image is missing.
    const stride = Math.floor(player.step) % 2;
    const pixels = [
      [3, 13 + stride, 3, 2, "#263247"], [7, 14 - stride, 3, 2, "#263247"],
      [3, 8, 7, 5, "#263247"], [4, 8, 5, 4, "#3878b3"],
      [2, 8, 2, 4, "#263247"],
      [9, 8, 2, 4, "#263247"], [2, 9, 1, 2, "#f3bd89"],
      [10, 9, 1, 2, "#f3bd89"], [3, 4, 7, 5, "#263247"],
    ];
    if (player.facing === "up") {
      pixels.push([4, 3, 5, 5, "#4b3b40"], [4, 8, 5, 4, "#c73b41"],
        [5, 9, 3, 2, "#ef5a57"]);
    } else {
      pixels.push([4, 5, 5, 3, "#f3bd89"]);
      if (player.facing === "down") {
        pixels.push([5, 6, 1, 1, "#263247"], [7, 6, 1, 1, "#263247"],
          [4, 7, 5, 2, "#4b3b40"], [5, 7, 3, 1, "#7c5845"]);
      } else {
        pixels.push([player.facing === "left" ? 4 : 8, 6, 1, 1, "#263247"],
          [4, 7, 5, 2, "#4b3b40"],
          [player.facing === "left" ? 8 : 3, 8, 2, 4, "#c73b41"]);
      }
    }
    pixels.push([3, 2, 7, 3, "#263247"], [4, 2, 5, 3, "#4b3b40"]);
    for (const [px, py, pw, ph, color] of pixels) {
      ctx.fillStyle = color;
      ctx.fillRect(x - 18 + px * 3, y - 45 - bob + py * 3, pw * 3, ph * 3);
    }
  }
  function draw(time) {
    ctx.imageSmoothingEnabled = false;
    if (map.complete && map.naturalWidth) {
      ctx.drawImage(map, Math.round(camera.x), Math.round(camera.y), W, H,
        0, 0, W, H);
    } else {
      ctx.fillStyle = "#91bb92";
      ctx.fillRect(0, 0, W, H);
    }
    // A subtle prompt remains over the destination door.
    if (foundCount() === 3) {
      const sx = Math.round(school.x - camera.x);
      const sy = Math.round(school.y - camera.y);
      ctx.strokeStyle = "#ffed84";
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - 21, sy - 17, 42, 33);
    }
    for (const marker of markers) if (!marker.found) markerShape(marker.x, marker.y, time);
    for (const p of particles) {
      ctx.fillStyle = p.life > 0.35 ? "#fffbb6" : "#f8b94d";
      ctx.fillRect(Math.round(p.x - camera.x), Math.round(p.y - camera.y), 5, 5);
    }
    drawPlayer();
    panel(12, 12, 211, 39);
    ctx.fillStyle = "#25364b";
    ctx.font = "bold 17px Consolas, monospace";
    ctx.fillText(locationName(), 25, 39);
    panel(477, 12, 151, 39);
    ctx.fillStyle = "#25364b";
    ctx.fillText(`★ ${foundCount()} / 3`, 495, 39);
    if (message && phase === "playing") {
      panel(16, 405, 608, 61);
      ctx.fillStyle = "#25364b";
      ctx.font = "bold 17px Consolas, monospace";
      ctx.fillText(message, 32, 441);
    } else if (phase === "playing" && distance(player.x, player.y, school.x, school.y) < 57) {
      panel(16, 405, 608, 61);
      ctx.fillStyle = "#25364b";
      ctx.font = "bold 17px Consolas, monospace";
      ctx.fillText("Press E / Enter / A to enter Kaplan School", 32, 441);
    }
  }
  function tick(timestamp) {
    const seconds = timestamp / 1000;
    const dt = Math.min(0.05, lastTime ? seconds - lastTime : 0);
    lastTime = seconds;
    update(dt, seconds);
    draw(seconds);
    requestAnimationFrame(tick);
  }

  const keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  };
  window.addEventListener("keydown", event => {
    const direction = keyMap[event.code];
    if (direction) {
      event.preventDefault();
      keys.add(direction);
    } else if (["KeyE", "Enter", "Space", "KeyZ"].includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) interact();
    }
  });
  window.addEventListener("keyup", event => {
    const direction = keyMap[event.code];
    if (direction) keys.delete(direction);
  });
  window.addEventListener("blur", () => { keys.clear(); touch.clear(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase === "playing") save();
  });
  for (const button of document.querySelectorAll(".dir")) {
    const direction = button.dataset.dir;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touch.add(direction);
      button.classList.add("pressed");
    });
    const release = () => {
      touch.delete(direction);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
  for (const button of document.querySelectorAll("button")) {
    button.addEventListener("contextmenu", event => event.preventDefault());
  }
  document.getElementById("startButton").addEventListener("click", reset);
  document.getElementById("continueButton").addEventListener("click", resume);
  document.getElementById("restartButton").addEventListener("click", reset);
  document.getElementById("playAgainButton").addEventListener("click", reset);
  document.getElementById("actionButton").addEventListener("click", interact);
  document.getElementById("attackButton").addEventListener("click", attack);
  document.getElementById("healButton").addEventListener("click", snack);
  document.getElementById("aboutButton").addEventListener("click", () => {
    aboutWasOpen = phase === "playing";
    if (aboutWasOpen) { keys.clear(); touch.clear(); save(); }
    aboutOverlay.classList.remove("hidden");
  });
  document.getElementById("closeAboutButton").addEventListener("click", () => {
    aboutOverlay.classList.add("hidden");
  });
  soundButton.addEventListener("click", () => {
    audio = !audio;
    soundButton.textContent = `♪ ${audio ? "On" : "Off"}`;
    soundButton.setAttribute("aria-label", `Turn sound ${audio ? "off" : "on"}`);
    tone(660, 0.10);
  });
  function applyTheme(theme) {
    const light = theme === "light";
    document.documentElement.classList.toggle("light", light);
    themeButton.textContent = light ? "☾" : "☀";
    themeButton.setAttribute("aria-label", `Switch to ${light ? "dark" : "light"} skin`);
  }
  let theme = "dark";
  try { theme = localStorage.getItem("kaplan-quest-theme") || "dark"; } catch (_error) { /* Use dark. */ }
  applyTheme(theme);
  themeButton.addEventListener("click", () => {
    theme = document.documentElement.classList.contains("light") ? "dark" : "light";
    applyTheme(theme);
    try { localStorage.setItem("kaplan-quest-theme", theme); } catch (_error) { /* Keep current session theme. */ }
  });
  if (savedGame()) document.getElementById("continueButton").classList.remove("hidden");
  updateStatus();
  window.kaplanAction = interact;
  window.kaplanBack = () => {
    if (!aboutOverlay.classList.contains("hidden")) aboutOverlay.classList.add("hidden");
    else if (phase === "battle") attack();
    else if (phase === "playing") { save(); say("Progress saved.", 2); }
  };
  map.addEventListener("error", () => {
    document.querySelector(".overlay-card p").textContent =
      "Map artwork could not load. Keep index.html and gba_town_map.png in the same folder.";
  });
  if (new URLSearchParams(location.search).has("test")) {
    window.__siteSDebug = () => ({
      x: Math.round(player.x), y: Math.round(player.y),
      markers: foundCount(), phase,
      hp: buddy.hp, enemyHp: battle?.hp ?? null,
      avatarLoaded: playerArt.complete && playerArt.naturalWidth > 0,
    });
  }
  requestAnimationFrame(tick);
})();
