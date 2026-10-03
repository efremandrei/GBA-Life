(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const town = window.TOWN_DATA;
  if (!town) throw new Error("Town geometry is missing.");
  const map = new Image();
  map.src = "petah_tikva_town_map.png";
  const walkBits = Uint8Array.from(atob(town.walkBits), character => character.charCodeAt(0));
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
  const WORLD_W = town.width;
  const WORLD_H = town.height;
  const SPEED = 165;

  const markers = town.markers.map(marker => ({
    x: marker.point[0], y: marker.point[1], name: marker.name, found: false,
  }));
  const school = { x: town.school[0], y: town.school[1] };
  const player = { x: town.start[0], y: town.start[1], facing: "down", step: 0 };
  const camera = { x: clamp(player.x - W / 2, 0, WORLD_W - W),
    y: clamp(player.y - H / 2, 0, WORLD_H - H) };
  const keys = new Set();
  const touch = new Set();
  const particles = [];
  const SAVE_KEY = "kaplan-quest-save-v2";
  const OLD_SAVE_KEY = "kaplan-quest-save-v1";
  const MAP_KEY = "kaplan-quest-map-edits-v1";
  let mapEdits = new Map();
  try {
    const stored = localStorage.getItem(MAP_KEY);
    if (stored) mapEdits = MapGrid.parse(stored, WORLD_W, WORLD_H);
  } catch (_error) { mapEdits = new Map(); }
  const creatures = [
    { name: "Shrubbit", colors: ["#285e43", "#65ae65", "#b8df79"], hp: 13 },
    { name: "Sparkpup", colors: ["#755334", "#e2a84f", "#ffe18a"], hp: 17 },
  ];
  const buddy = { hp: 24, maxHp: 24, snacks: 2 };
  const people = [];
  let peopleSeed = 0;
  let battle = null;
  let saveTimer = 0;
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
  const mapOverlay = document.getElementById("mapOverlay");
  const startButton = document.getElementById("startButton");
  const continueButton = document.getElementById("continueButton");
  const overview = document.getElementById("overviewMap");
  const overviewCtx = overview.getContext("2d");
  const mapStatus = document.getElementById("mapStatus");
  const skinColors = ["#f2bd8b", "#dc9b70", "#ad704f", "#744b3f"];
  const hairColors = ["#272d37", "#463729", "#73523c", "#b9864f", "#d1b66d"];
  const shirtColors = ["#c95659", "#4f88a5", "#e1a348", "#6b9d74", "#8b75a4", "#dad06c"];
  const firstNames = ["Noa", "Maya", "Amit", "Lior", "Tamar", "Omer", "Adi", "Roni", "Yael", "Eli", "Dana", "Niv"];
  const chats = ["What a lovely day to walk!", "Have you seen the school?", "The streets are busy today.", "Try the town map if you get lost.", "Good luck on your adventure!", "I like the little park nearby."];

  function seeded(seed) {
    let value = seed >>> 0;
    return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
  }
  function generatePeople(seed) {
    people.length = 0;
    const rand = seeded(seed);
    const paths = town.npcPaths.filter(path => path.length >= 2 && path.every(([x, y]) =>
      x >= 8 && y >= 8 && x < WORLD_W - 8 && y < WORLD_H - 8));
    const nearby = paths.filter(path => path.some(([x, y]) =>
      distance(x, y, town.start[0], town.start[1]) < 600));
    for (let i = 0; i < 145; i++) {
      const pool = i < 35 && nearby.length ? nearby : paths;
      const path = pool[Math.floor(rand() * pool.length)];
      const segment = Math.floor(rand() * (path.length - 1));
      const from = path[segment], to = path[segment + 1];
      const t = rand();
      people.push({ path, segment, t, direction: rand() < 0.5 ? -1 : 1,
        x: from[0] + (to[0] - from[0]) * t,
        y: from[1] + (to[1] - from[1]) * t,
        speed: 22 + rand() * 25, stride: rand() * 8,
        skin: skinColors[Math.floor(rand() * skinColors.length)],
        hair: hairColors[Math.floor(rand() * hairColors.length)],
        shirt: shirtColors[Math.floor(rand() * shirtColors.length)],
        pants: rand() < 0.6 ? "#36536f" : "#454b54",
        accessory: rand() < 0.27 ? "#cc4847" : null,
        name: firstNames[Math.floor(rand() * firstNames.length)],
        chat: chats[Math.floor(rand() * chats.length)] });
    }
  }
  function updatePeople(dt) {
    for (const person of people) {
      let remaining = person.speed * dt;
      while (remaining > 0) {
        const a = person.path[person.segment];
        const b = person.path[person.segment + 1];
        const length = Math.max(1, distance(a[0], a[1], b[0], b[1]));
        const target = person.direction > 0 ? 1 : 0;
        const fraction = Math.min(Math.abs(target - person.t), remaining / length);
        person.t += person.direction * fraction;
        remaining -= fraction * length;
        if (Math.abs(person.t - target) < 0.00001) {
          if (person.direction > 0 && person.segment < person.path.length - 2) {
            person.segment++; person.t = 0;
          } else if (person.direction < 0 && person.segment > 0) {
            person.segment--; person.t = 1;
          } else { person.direction *= -1; }
        }
        if (fraction === 0) break;
      }
      const a = person.path[person.segment], b = person.path[person.segment + 1];
      person.x = a[0] + (b[0] - a[0]) * person.t;
      person.y = a[1] + (b[1] - a[1]) * person.t;
      person.stride += dt * person.speed / 8;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        x: player.x, y: player.y, facing: player.facing,
        markers: markers.map(marker => marker.found),
        hp: buddy.hp, snacks: buddy.snacks, phase,
        battle: battle ? { markerIndex: battle.markerIndex, hp: battle.hp } : null,
        peopleSeed,
      }));
    } catch (_error) { /* The game remains playable if storage is unavailable. */ }
  }
  function savedGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
      const old = localStorage.getItem(OLD_SAVE_KEY);
      if (!old) return null;
      const state = JSON.parse(old);
      // The old artwork used a fictional coordinate system. Preserve quest
      // progress and Buddy state while relocating the player to real Hen St.
      return { ...state, x: town.start[0], y: town.start[1],
        phase: state.phase === "won" ? "won" : "playing", battle: null,
        peopleSeed: 1878 };
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
    if (!canStand(player.x, player.y)) {
      player.x = town.start[0]; player.y = town.start[1];
    }
    peopleSeed = Number(state.peopleSeed) || 1878;
    generatePeople(peopleSeed);
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
    say("Welcome back to Petah Tikva!", 3);
    save();
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
    if (!walkBits.length || x < 3 || y < 3 || x > WORLD_W - 3 || y > WORLD_H - 3) return false;
    const tileX = Math.floor(x / MapGrid.tileSize);
    const tileY = Math.floor(y / MapGrid.tileSize);
    const override = mapEdits.get(tileY * (WORLD_W / MapGrid.tileSize) + tileX);
    if (override) return MapGrid.walkable.has(override);
    const mx = Math.floor(x / town.maskScale);
    const my = Math.floor(y / town.maskScale);
    const index = my * town.maskWidth + mx;
    return !!(walkBits[index >> 3] & (1 << (index & 7)));
  }
  function canStand(x, y) {
    return [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]]
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
    if (!walkBits.length || !map.naturalWidth) return;
    player.x = town.start[0];
    player.y = town.start[1];
    player.facing = "down";
    player.step = 0;
    camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
    camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
    markers.forEach(marker => { marker.found = false; });
    buddy.hp = buddy.maxHp;
    buddy.snacks = 2;
    peopleSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    generatePeople(peopleSeed);
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
    if (!mapOverlay.classList.contains("hidden")) { closeMap(); return; }
    if (!aboutOverlay.classList.contains("hidden")) {
      aboutOverlay.classList.add("hidden");
      return;
    }
    if (phase === "battle") { attack(); return; }
    if (phase === "title" || phase === "won") {
      reset();
      return;
    }
    if (distance(player.x, player.y, school.x, school.y) < 70) {
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
    } else {
      const nearest = people.reduce((best, person) => {
        const d = distance(player.x, player.y, person.x, person.y);
        return d < best.distance ? { person, distance: d } : best;
      }, { person: null, distance: Infinity });
      if (nearest.distance < 52) say(`${nearest.person.name}: ${nearest.person.chat}`, 4.5);
      else if (distance(player.x, player.y, town.start[0], town.start[1]) < 75)
        say("Khen Street is your starting point. Follow the gold markers!");
      else say("Follow the gold markers toward Kaplan School.");
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
        player.x = town.start[0]; player.y = town.start[1];
        camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
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
    if (!mapOverlay.classList.contains("hidden") || !aboutOverlay.classList.contains("hidden")) return;
    updatePeople(dt);
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
    if (distance(player.x, player.y, school.x, school.y) < 100) return "KAPLAN SCHOOL";
    const nearest = markers.reduce((best, marker) => {
      const d = distance(player.x, player.y, marker.x, marker.y);
      return d < best.distance ? { name: marker.name, distance: d } : best;
    }, { name: "PETAH TIKVA", distance: Infinity });
    return nearest.distance < 185 ? nearest.name.toUpperCase() : "PETAH TIKVA";
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
  function drawPerson(person) {
    const x = Math.round(person.x - camera.x);
    const y = Math.round(person.y - camera.y);
    if (x < -25 || y < -45 || x > W + 25 || y > H + 25) return;
    const stride = Math.floor(person.stride) % 2;
    ctx.fillStyle = "#30444988";
    ctx.fillRect(x - 8, y + 1, 16, 4);
    ctx.fillStyle = "#26323d";
    ctx.fillRect(x - 8, y - 28, 16, 28);
    ctx.fillStyle = person.pants;
    ctx.fillRect(x - 6, y - 11, 5, 11 + stride);
    ctx.fillRect(x + 1, y - 11, 5, 12 - stride);
    ctx.fillStyle = person.shirt;
    ctx.fillRect(x - 8, y - 20, 16, 11);
    ctx.fillStyle = person.skin;
    ctx.fillRect(x - 6, y - 30, 12, 11);
    ctx.fillRect(x - 10, y - 19, 3, 7);
    ctx.fillRect(x + 7, y - 19, 3, 7);
    ctx.fillStyle = person.hair;
    ctx.fillRect(x - 7, y - 32, 14, 5);
    ctx.fillRect(x - 7, y - 28, 2, 5);
    ctx.fillStyle = "#25313b";
    ctx.fillRect(x - 3, y - 25, 2, 2);
    ctx.fillRect(x + 2, y - 25, 2, 2);
    if (person.accessory) {
      ctx.fillStyle = person.accessory;
      ctx.fillRect(x + 6, y - 19, 4, 10);
    }
  }
  function drawOverview() {
    if (!map.complete || !map.naturalWidth) return;
    overviewCtx.imageSmoothingEnabled = false;
    overviewCtx.drawImage(map, 0, 0, overview.width, overview.height);
    for (const [index, type] of mapEdits) {
      const cols = WORLD_W / MapGrid.tileSize;
      const worldX = index % cols * MapGrid.tileSize;
      const worldY = Math.floor(index / cols) * MapGrid.tileSize;
      MapGrid.drawTile(overviewCtx, type, worldX / WORLD_W * overview.width,
        worldY / WORLD_H * overview.height, MapGrid.tileSize / WORLD_W * overview.width);
    }
    const point = (x, y, color, radius) => {
      const px = x / WORLD_W * overview.width;
      const py = y / WORLD_H * overview.height;
      overviewCtx.fillStyle = "#203444";
      overviewCtx.fillRect(px - radius - 2, py - radius - 2, radius * 2 + 4, radius * 2 + 4);
      overviewCtx.fillStyle = color;
      overviewCtx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    };
    point(school.x, school.y, "#dd5752", 5);
    for (const marker of markers) if (!marker.found) point(marker.x, marker.y, "#ffde5b", 4);
    point(player.x, player.y, "#4c91e3", 5);
  }
  function openMap() {
    if (phase === "battle") return;
    keys.clear(); touch.clear();
    drawOverview();
    mapOverlay.classList.remove("hidden");
  }
  function closeMap() { mapOverlay.classList.add("hidden"); }
  function setMapStatus(text) { mapStatus.textContent = text; }
  function applyEditedMap(json) {
    const previous = mapEdits;
    try {
      const parsed = MapGrid.parse(json, WORLD_W, WORLD_H);
      mapEdits = parsed;
      const anchors = [town.start, town.school, ...town.markers.map(marker => marker.point)];
      if (!anchors.every(([x, y]) => canStand(x, y)))
        throw new Error("The starting point, school, and markers must remain walkable.");
      localStorage.setItem(MAP_KEY, MapGrid.serialize(mapEdits, WORLD_W, WORLD_H));
      if (!canStand(player.x, player.y)) {
        player.x = town.start[0]; player.y = town.start[1];
        camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
        camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
        save();
      }
      setMapStatus(`Edited map · ${mapEdits.size} blocks applied`);
      drawOverview();
      say(`Edited map loaded: ${mapEdits.size} blocks.`, 4);
      return true;
    } catch (error) {
      mapEdits = previous;
      setMapStatus(error.message || "Map import failed.");
      return false;
    }
  }
  window.kaplanApplyMap = applyEditedMap;
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
    const cols = WORLD_W / MapGrid.tileSize;
    const firstX = Math.max(0, Math.floor(camera.x / MapGrid.tileSize));
    const lastX = Math.min(cols - 1, Math.ceil((camera.x + W) / MapGrid.tileSize));
    const firstY = Math.max(0, Math.floor(camera.y / MapGrid.tileSize));
    const lastY = Math.min(WORLD_H / MapGrid.tileSize - 1,
      Math.ceil((camera.y + H) / MapGrid.tileSize));
    for (let tileY = firstY; tileY <= lastY; tileY++) for (let tileX = firstX; tileX <= lastX; tileX++) {
      const type = mapEdits.get(tileY * cols + tileX);
      if (type) MapGrid.drawTile(ctx, type,
        tileX * MapGrid.tileSize - camera.x, tileY * MapGrid.tileSize - camera.y);
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
    for (const person of people) if (isOpenPoint(person.x, person.y)) drawPerson(person);
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
    } else if (phase === "playing" && distance(player.x, player.y, school.x, school.y) < 70) {
      panel(16, 405, 608, 61);
      ctx.fillStyle = "#25364b";
      ctx.font = "bold 17px Consolas, monospace";
      ctx.fillText("Press E / Enter / A to enter Kaplan School", 32, 441);
    }
  }
  function tick(timestamp) {
    if (startButton.disabled && map.naturalWidth) assetsReady();
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
    if (event.code === "Escape" && !mapOverlay.classList.contains("hidden")) {
      closeMap(); return;
    }
    const direction = keyMap[event.code];
    if (direction && mapOverlay.classList.contains("hidden") && aboutOverlay.classList.contains("hidden")) {
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
    if (phase === "playing") { keys.clear(); touch.clear(); save(); }
    aboutOverlay.classList.remove("hidden");
  });
  document.getElementById("closeAboutButton").addEventListener("click", () => {
    aboutOverlay.classList.add("hidden");
  });
  document.getElementById("mapButton").addEventListener("click", openMap);
  document.getElementById("closeMapButton").addEventListener("click", closeMap);
  const mapFileInput = document.getElementById("mapFileInput");
  document.getElementById("importMapButton").addEventListener("click", () => {
    if (window.NativeGame?.importMap) window.NativeGame.importMap();
    else mapFileInput.click();
  });
  mapFileInput.addEventListener("change", async () => {
    const file = mapFileInput.files?.[0];
    if (file) {
      if (file.size > 1000000) setMapStatus("Map file is too large.");
      else applyEditedMap(await file.text());
    }
    mapFileInput.value = "";
  });
  document.getElementById("originalMapButton").addEventListener("click", () => {
    mapEdits = new Map();
    try { localStorage.removeItem(MAP_KEY); } catch (_error) { /* Session only. */ }
    setMapStatus("Original map restored");
    if (!canStand(player.x, player.y)) {
      player.x = town.start[0]; player.y = town.start[1];
      camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
      camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
      save();
    }
    drawOverview();
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
  if (mapEdits.size) setMapStatus(`Edited map · ${mapEdits.size} blocks applied`);
  updateStatus();
  window.kaplanAction = interact;
  window.kaplanBack = () => {
    if (!mapOverlay.classList.contains("hidden")) closeMap();
    else if (!aboutOverlay.classList.contains("hidden")) aboutOverlay.classList.add("hidden");
    else if (phase === "battle") attack();
    else if (phase === "playing") { save(); say("Progress saved.", 2); }
  };
  map.addEventListener("error", () => {
    document.querySelector(".overlay-card p").textContent =
      "Town artwork could not load. Check petah_tikva_town_map.png.";
  });
  function assetsReady() {
    const ready = !!(walkBits.length && map.naturalWidth);
    startButton.disabled = !ready;
    continueButton.disabled = !ready;
    if (ready) drawOverview();
  }
  map.addEventListener("load", assetsReady);
  assetsReady();
  if (new URLSearchParams(location.search).has("test")) {
    window.__siteSDebug = () => ({
      x: Math.round(player.x), y: Math.round(player.y),
      markers: foundCount(), phase,
      hp: buddy.hp, enemyHp: battle?.hp ?? null,
      avatarLoaded: playerArt.complete && playerArt.naturalWidth > 0,
      mapLoaded: map.complete && map.naturalWidth > 0,
      maskLoaded: !!walkBits.length, peopleCount: people.length, peopleSeed,
      mapOpen: !mapOverlay.classList.contains("hidden"),
      mapEdits: mapEdits.size,
      message,
    });
    window.__siteSTest = {
      setPlayer(x, y) {
        if (!canStand(x, y)) return false;
        player.x = x; player.y = y;
        camera.x = clamp(x - W / 2, 0, WORLD_W - W);
        camera.y = clamp(y - H / 2, 0, WORLD_H - H);
        return true;
      },
      nearestPeople: () => people.filter(person => distance(person.x, person.y, player.x, player.y) < 320).length,
      firstPerson: () => people.length ? { x: people[0].x, y: people[0].y,
        name: people[0].name } : null,
      isWalkable: (x, y) => isOpenPoint(x, y),
    };
  }
  requestAnimationFrame(tick);
})();
