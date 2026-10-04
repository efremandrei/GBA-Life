(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const compactScreen = window.matchMedia("(max-width: 540px)").matches;
  if (compactScreen) {
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(bounds.width));
    canvas.height = Math.max(1, Math.round(bounds.height));
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  const town = window.TOWN_DATA;
  if (!town) throw new Error("Town geometry is missing.");
  const mapStream = new TownStream(window.TOWN_BLOCKS);
  const map = mapStream.overview;
  const walkBits = Uint8Array.from(atob(town.walkBits), character => character.charCodeAt(0));
  const grassBits = Uint8Array.from(atob(town.grassBits || ''), character => character.charCodeAt(0));
  const GRASS_SPEED = 0.6;
  // Crops are aligned to the four transparent sprites generated from the supplied avatar.
  const playerViews = {
    down: [183, 92, 318, 482],
    up: [762, 92, 323, 482],
    left: [186, 660, 320, 492],
    right: [763, 660, 320, 492],
  };
  const characters = {
    andrei: { source: "player_avatar_sprite_sheet.png", views: playerViews },
    maya: { source: "avatar_maya_sprite_sheet.png", views: {
      down: [198, 80, 320, 510], up: [780, 85, 293, 505],
      left: [190, 660, 335, 502], right: [732, 660, 350, 502],
    } },
    amir: { source: "avatar_amir_sprite_sheet.png", views: {
      down: [186, 94, 310, 480], up: [769, 93, 313, 480],
      left: [187, 659, 313, 494], right: [769, 659, 313, 494],
    } },
    dana: { source: "avatar_dana_sprite_sheet.png", views: {
      down: [182, 93, 315, 491], up: [759, 93, 330, 491],
      left: [187, 660, 313, 499], right: [770, 660, 313, 497],
    } },
  };
  const characterArt = {};
  const walkFrames = {};
  for (const [id, character] of Object.entries(characters)) {
    const image = new Image();
    image.addEventListener("load", () => {
      buildWalkFrames(id);
      drawCharacterChoices();
    });
    image.src = character.source;
    characterArt[id] = image;
  }
  let W = canvas.width;
  let H = canvas.height;
  const WORLD_W = town.width;
  const WORLD_H = town.height;
  const SPEED = 165;

  const markers = town.markers.map(marker => ({
    x: marker.point[0], y: marker.point[1], name: marker.name, found: false,
  }));
  const school = { x: town.school[0], y: town.school[1] };
  const player = { x: town.start[0], y: town.start[1], facing: "down", step: 0 };
  let worldZoom=1, gamePinch=null;
  let screenPointer=null, screenDirection=null;
  const stopScreenWalk=()=>{screenPointer=null;screenDirection=null;};
  const roomView={x:0,y:0,zoom:1};
  const viewWidth=()=>W/worldZoom,viewHeight=()=>H/worldZoom;
  function boundView(value,limit,size) { return size>limit?(limit-size)/2:clamp(value,0,limit-size); }
  function centerRoomView() {
    if(!inside)return;
    roomView.x=boundView(inside.x-W/(2*roomView.zoom),W,W/roomView.zoom);
    roomView.y=boundView(inside.y-H/(2*roomView.zoom),H,H/roomView.zoom);
  }
  const camera = { x: clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth()),
    y: clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight()) };
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
  const openedChests = new Set();
  let peopleSeed = 0;
  let inside = null;
  let battle = null;
  let saveTimer = 0;
  let phase = "title";
  let cityTime = 0;
  const tramService = town.rail ? new TramService(town.rail) : null;
  const tramArt = Object.fromEntries(['up','down','left','right'].map(facing=>{const image=new Image();image.src=`tram_${facing}.png`;return [facing,image];}));
  let selectedCharacter = "andrei";
  let characterId = "andrei";
  let lastTime = 0;
  let message = "";
  let messageUntil = 0;
  let audio = false;
  let audioContext = null;

  const startOverlay = document.getElementById("startOverlay");
  const splashScreen = document.getElementById("splashScreen");
  const characterPicker = document.getElementById("characterPicker");
  const winOverlay = document.getElementById("winOverlay");
  const soundButton = document.getElementById("soundButton");
  const themeButton = document.getElementById("themeButton");
  const battleOverlay = document.getElementById("battleOverlay");
  const aboutOverlay = document.getElementById("aboutOverlay");
  const battleMessage = document.getElementById("battleMessage");
  const mapOverlay = document.getElementById("mapOverlay");
  const gameMenu = document.getElementById("gameMenu");
  const menuButton = document.getElementById("menuButton");
  const controls = document.querySelector(".controls");
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

  function drawCharacterChoices() {
    if (characterPicker.children.length !== Object.keys(CharacterDesign.library).length) {
      characterPicker.replaceChildren();
      for (const [id, design] of Object.entries(CharacterDesign.library)) {
        const button = document.createElement("button");
        button.className = "character-choice"; button.type = "button"; button.dataset.character = id;
        const preview = document.createElement("canvas"); preview.width=64; preview.height=80;
        const label = document.createElement("span"); label.textContent=design.name;
        button.append(preview,label); characterPicker.append(button);
      }
    }
    for (const button of characterPicker.querySelectorAll(".character-choice")) {
      const id = button.dataset.character;
      const image = characterArt[id];
      const preview = button.querySelector("canvas");
      const previewCtx = preview.getContext("2d");
      previewCtx.clearRect(0, 0, preview.width, preview.height);
      const design = CharacterDesign.library[id];
      button.querySelector("span").textContent=design.name;
      button.classList.toggle("selected", id===selectedCharacter);
      button.setAttribute("aria-pressed",String(id===selectedCharacter));
      if (!design.original || !image?.naturalWidth || !walkFrames[id]?.down?.idle) {
        previewCtx.imageSmoothingEnabled=false;
        previewCtx.drawImage(CharacterDesign.sprite(design),9,5,46,70);
        continue;
      }
      previewCtx.imageSmoothingEnabled = false;
      previewCtx.drawImage(CharacterDesign.withHeadphones(walkFrames[id].down.idle,design,"down"),9,5,46,70);
    }
  }
  function selectCharacter(id) {
    if (!Object.prototype.hasOwnProperty.call(CharacterDesign.library, id)) return;
    selectedCharacter = id;
    for (const button of characterPicker.querySelectorAll(".character-choice")) {
      const selected = button.dataset.character === id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function buildWalkFrames(id) {
    const image = characterArt[id];
    if (!image?.naturalWidth) return;
    walkFrames[id] = {};
    for (const [facing, crop] of Object.entries(characters[id].views)) {
      const base = document.createElement("canvas");
      base.width = 38; base.height = 58;
      const baseCtx = base.getContext("2d");
      baseCtx.imageSmoothingEnabled = false;
      baseCtx.drawImage(image, ...crop, 0, 0, 38, 58);
      walkFrames[id][facing] = [0, 1].map(pose => {
        const frame = document.createElement("canvas");
        frame.width = 42; frame.height = 62;
        const frameCtx = frame.getContext("2d");
        frameCtx.imageSmoothingEnabled = false;
        // Keep the face and torso stable; move each lower leg in opposite phases.
        frameCtx.drawImage(base, 0, 0, 38, 46, 2, 0, 38, 46);
        const leftForward = pose === 0;
        frameCtx.drawImage(base, 0, 44, 19, 14,
          leftForward ? 0 : 4, leftForward ? 46 : 42, 19, 14);
        frameCtx.drawImage(base, 19, 44, 19, 14,
          leftForward ? 22 : 18, leftForward ? 42 : 46, 19, 14);
        frame.worldCrop=window.AVATAR_BOUNDS[id][facing][pose+1];
        return frame;
      });
      base.worldCrop=window.AVATAR_BOUNDS[id][facing][0];
      walkFrames[id][facing].idle=base;
    }
  }

  const baseRoads=new Set(town.roadCells||[]),baseAccess=new Set(town.accessCells||[]),baseSidewalks=new Set(town.sidewalkCells||[]),basePaving=new Set(town.pavingCells||[]);
  const roadVehicles = new Map((town.vehicles || []).map(vehicle => [vehicle.cell, vehicle.rect]));
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
    const homes=[...new Map(paths.flat().map(point=>[point.join(","),point])).values()].filter(([x,y])=>canStand(x,y));
    const usedHomes=new Set();
    for (let i = 0; i < Math.min(145,homes.length); i++) {
      const pool = i < 35 && nearby.length ? nearby : paths;
      const path = pool[Math.floor(rand() * pool.length)];
      const segment = Math.floor(rand() * (path.length - 1));
      const from = path[segment], to = path[segment + 1];
      const t = rand();
      const pick = list => list[Math.floor(rand()*list.length)];
      const design = CharacterDesign.clean({ ...CharacterDesign.presets.andrei,
        original:false, skin:pick(skinColors), hair:pick(hairColors),shirt:pick(shirtColors),
        pants:pick(["#36536f","#454b54","#bd7395","#73844d"]),backpack:pick(shirtColors),
        eyes:pick(["#68452b","#437fa5","#54764a"]),hairStyle:pick(CharacterDesign.enums.hairStyle),
        facialHair:rand()<.72?"none":pick(["stubble","beard","moustache"]),
        outfit:rand()<.25?"skirt":"trousers",wearGlasses:rand()<.3,
        glasses:pick(["#272d37","#d075a2","#756198"]),wearBackpack:rand()<.5 });
      people.push({ design, path, segment, t, direction: rand() < 0.5 ? -1 : 1,
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
      const person=people[people.length-1];
      const candidate=path[Math.min(path.length-1,segment+(t>=.5?1:0))];
      const home=[candidate,...path].find(([x,y])=>canStand(x,y)&&!usedHomes.has(`${x},${y}`))
        ||homes.find(([x,y])=>!usedHomes.has(`${x},${y}`));
      usedHomes.add(home.join(","));
      NpcBehavior.initialize(person,...home,seeded((seed ^ Math.imul(i+1,2654435761))>>>0));
    }
  }
  function canNpcVisit(person,x,y) {
    for(const t of [.25,.5,.75,1])
      if(!canStand(person.homeX+(x-person.homeX)*t,person.homeY+(y-person.homeY)*t))return false;
    if(distance(x,y,player.x,player.y)<16)return false;
    return !people.some(other=>other!==person && (
      distance(x,y,other.homeX,other.homeY)<1 || distance(x,y,other.targetX,other.targetY)<1 || distance(x,y,other.x,other.y)<20));
  }
  function updatePeople(dt) {
    for(const person of people){
      person.speed=40*groundSpeed(person.x,person.y);
      NpcBehavior.update(person,dt,MapGrid.tileSize,canNpcVisit);
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        x: player.x, y: player.y, facing: player.facing,
        character: characterId, mapRevision:town.mapRevision, worldWidth:WORLD_W,
        markers: markers.map(marker => marker.found),
        hp: buddy.hp, snacks: buddy.snacks, phase,
        battle: battle ? { markerIndex: battle.markerIndex, hp: battle.hp } : null,
        peopleSeed, cityTime, worldZoom, roomZoom:roomView.zoom,
        interior: inside ? { id: inside.id, roof: inside.roof, x: inside.x, y: inside.y,
          facing: inside.facing, sourceX: inside.sourceX, sourceY: inside.sourceY } : null,
        openedChests: [...openedChests],
      }));
      return true;
    } catch (_error) { return false; }
  }
  function saveProgress() {
    return phase === "title" || save();
  }
  function exitGame() {
    keys.clear();
    touch.clear();
    if (!saveProgress()) {
      setMapStatus("Could not save progress. Check device storage.");
      return;
    }
    if (window.NativeGame?.exitGame) {
      window.NativeGame.exitGame();
      return;
    }
    // Browser preview: return to the title screen with Continue available.
    phase = "title";
    inside = null;
    battle = null;
    battleOverlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    aboutOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
    if (savedGame()) continueButton.classList.remove("hidden");
    closeMenu();
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
        peopleSeed: 1878, mapRevision:town.mapRevision };
    } catch (_error) { return null; }
  }
  function updateStatus() {
    document.getElementById("questStatus").textContent = `${foundCount()} / 3 street markers`;
    document.getElementById("partnerStatus").textContent = `Buddy HP ${buddy.hp}/${buddy.maxHp}`;
  }
  function resume() {
    const state = savedGame();
    if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.y)) return reset();
    worldZoom=clamp(Number(state.worldZoom)||1,.75,2.5);
    roomView.zoom=clamp(Number(state.roomZoom)||1,.75,2.5);
    const changedMap=state.mapRevision!==town.mapRevision;
    const factor=changedMap?2:1;
    player.x = clamp(state.x*factor, 8, WORLD_W - 8);
    player.y = clamp(state.y*factor, 8, WORLD_H - 8);
    if (!canStand(player.x, player.y)) {
      player.x = town.start[0]; player.y = town.start[1];
    }
    cityTime = Math.max(0,Number(state.cityTime)||0);
    peopleSeed = Number(state.peopleSeed) || 1878;
    generatePeople(peopleSeed);
    characterId = Object.prototype.hasOwnProperty.call(CharacterDesign.library, state.character)
      ? state.character : "andrei";
    selectCharacter(characterId);
    player.facing = playerViews[state.facing] ? state.facing : "down";
    markers.forEach((marker, index) => { marker.found = !!state.markers?.[index]; });
    buddy.hp = clamp(Number(state.hp) || 24, 1, 24);
    buddy.snacks = clamp(Number(state.snacks) || 0, 0, 2);
    openedChests.clear();
    if (!changedMap && Array.isArray(state.openedChests))
      for (const id of state.openedChests) if (typeof id === "string" || Number.isInteger(id)) openedChests.add(String(id));
    inside = null;
    if (!changedMap && state.phase === "playing" && state.interior &&
        (typeof state.interior.id === "string" || Number.isInteger(state.interior.id))) {
      const room = HouseRooms.layout(W, H);
      inside = { id: state.interior.id, roof: state.interior.roof || "house",
        x: clamp(Number(state.interior.x) || room.exitX, room.x + 18, room.x + room.w - 18),
        y: clamp(Number(state.interior.y) || room.exitY - 48, room.floorY + 18, room.exitY),
        facing: playerViews[state.interior.facing] ? state.interior.facing : "up", step: 0,
        sourceX: Number(state.interior.sourceX) || player.x,
        sourceY: Number(state.interior.sourceY) || player.y };
    }
    if (inside) {
      const room = HouseRooms.layout(W, H);
      if (!HouseRooms.canStand(inside.x, inside.y, room, HouseRooms.objects(inside, room))) {
        inside.x = room.exitX; inside.y = room.exitY - 50;
      }
    }
    camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
    camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
    centerRoomView();
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
    if(MapGrid.covered(mapEdits,tileX,tileY,WORLD_W/MapGrid.tileSize))return false;
    const override = mapEdits.get(tileY * (WORLD_W / MapGrid.tileSize) + tileX);
    if (override) return MapGrid.walkable.has(override);
    const car = roadVehicles.get(tileY * (WORLD_W / MapGrid.tileSize) + tileX);
    if (car && x >= car[0] && x < car[0]+car[2] && y >= car[1] && y < car[1]+car[3]) return false;
    const mx = Math.floor(x / town.maskScale);
    const my = Math.floor(y / town.maskScale);
    const index = my * town.maskWidth + mx;
    return !!((walkBits[index >> 3] | grassBits[index >> 3]) & (1 << (index & 7)));
  }
  function groundSpeed(x, y) {
    const index = Math.floor(y / town.maskScale) * town.maskWidth + Math.floor(x / town.maskScale);
    const override = mapEdits.get(index);
    if (override) return override === 'grass' ? GRASS_SPEED : 1;
    return grassBits[index >> 3] & (1 << (index & 7)) ? GRASS_SPEED : 1;
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
    if (!walkBits.length || !mapStream.ready()) return;
    cityTime = 0;
    characterId = selectedCharacter;
    inside = null;
    openedChests.clear();
    player.x = town.start[0];
    player.y = town.start[1];
    player.facing = "down";
    player.step = 0;
    camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
    camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
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
  function openCharacterSelect() {
    if (phase !== "title") save();
    phase = "title";
    inside = null;
    battle = null;
    keys.clear();
    touch.clear();
    battleOverlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
    continueButton.classList.toggle("hidden", !savedGame());
    closeMenu();
  }
  function isHouseType(type) { return ["house", "house_blue", "house_teal", "high_building"].includes(type); }
  function houseName(id) { if (town.houses?.[id]?.address) return town.houses[id].address; return typeof id === "number" ? `House ${id + 1}` : `Custom house ${String(id).replace("edit-", "")}`; }
  function enterHouse(house) {
    stopScreenWalk();
    const room = HouseRooms.layout(W, H);
    inside = { id: house.id, roof: house.roof, x: room.exitX,
      y: room.exitY - 50, facing: "up", step: 0,
      sourceX: player.x, sourceY: player.y };
    centerRoomView();
    keys.clear(); touch.clear();
    say(`${houseName(house.id)}: explore the room. A examines objects.`, 4);
    save();
  }
  function leaveHouse() {
    stopScreenWalk();
    if (!inside) return;
    player.x = canStand(inside.sourceX, inside.sourceY) ? inside.sourceX : town.start[0];
    player.y = canStand(inside.sourceX, inside.sourceY) ? inside.sourceY : town.start[1];
    camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
    camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
    inside = null;
    keys.clear(); touch.clear();
    say("Back outside in Petah Tikva.", 2.5);
    save();
  }
  function interactInside() {
    const room = HouseRooms.layout(W, H);
    const nearby = HouseRooms.nearest(inside.x, inside.y, room, HouseRooms.objects(inside, room));
    if (nearby.distance > 58) { say("Move closer to a room object and press A."); return; }
    const kind = nearby.item.kind;
    if (kind === "exit") { leaveHouse(); return; }
    if (kind === "bed") {
      buddy.hp = buddy.maxHp; updateStatus(); save();
      say("A soft bed. Buddy is fully rested!", 4);
    } else if (kind === "chest") {
      const id = String(inside.id);
      if (openedChests.has(id)) say("The chest is empty now.");
      else if (buddy.snacks >= 2) say("A snack is inside, but your bag is full.");
      else {
        buddy.snacks++; openedChests.add(id); save();
        say("You found a snack in the chest!", 4);
      }
    } else if (kind === "bookshelf") say("The shelf holds stories about Petah Tikva and its streets.", 4);
    else if (kind === "table") say("A town map is spread across the table. Try the Map button.", 4);
    else if (kind === "plant") say("A little houseplant is thriving in the sunlight.", 4);
    else if (kind === "fridge") say("The fridge hums. Someone left a note: 'Enjoy the walk!'", 4);
    else if (kind === "kitchen") say("A tiled kitchen counter, sink and stove. A kettle is ready for tea.", 4);
    else if (kind === "sofa") {
      buddy.hp = Math.min(buddy.maxHp, buddy.hp + 3); updateStatus(); save();
      say("You take a short break on the sofa. Buddy recovers 3 HP.", 4);
    }
    else if (kind === "tv") say("The TV shows a travel programme about Petah Tikva's parks and light rail.", 4);
    else if (kind === "wardrobe") say("Shirts, coats and a spare backpack. Use Design character to change your look.", 4);
    else if (kind === "radio") {
      audio = !audio;
      soundButton.textContent = `♪ ${audio ? "On" : "Off"}`;
      say(`The radio is ${audio ? "playing" : "quiet"}.`, 3);
      tone(660, .1);
    }
  }
  function nearestWorldThing() {
    let best = { kind: null, distance: Infinity, data: null };
    const consider = (kind, x, y, data, limit) => {
      const d = distance(player.x, player.y, x, y);
      if (d < limit && d < best.distance) best = { kind, distance: d, data };
    };
    for (const [id, house] of (town.houses || []).entries())
      consider("house", house.entry[0], house.entry[1], { ...house, id }, 58);
    const cols = WORLD_W / MapGrid.tileSize;
    for (const [index, type] of mapEdits) {
      if (MapGrid.terrain.has(type)) continue;
      const x = (index % cols + .5) * MapGrid.tileSize;
      const y = (Math.floor(index / cols) + .5) * MapGrid.tileSize;
      const [fw,fh]=MapGrid.footprint(type);
      if (isHouseType(type)) consider("house", x+(fw/2-.5)*MapGrid.tileSize, y+fh*MapGrid.tileSize, { id: `edit-${index}`, roof: type }, 57);
      else consider("scenery", x, y, [x, y, type], 52);
    }
    for (const person of people) consider("person", person.x, person.y, person, 52);
    for (const item of town.scenery || [])
      consider("scenery", item[0], item[1], item, 49);
    return best;
  }
  function interactScenery(item) {
    const kind = item[2];
    if (kind === "fountain") {
      buddy.hp = Math.min(buddy.maxHp, buddy.hp + 5); updateStatus(); save();
      say("Cool fountain water refreshed Buddy (+5 HP).", 4);
    } else if (kind === "tree" || kind === "shrub")
      say("Leaves rustle in the breeze. The shade feels good.", 4);
    else if (kind === "flowers") say("Colorful flowers brighten the neighborhood.", 4);
    else if (kind === "lamp") say("A street lamp lights this path after sunset.", 4);
    else if (kind === "sign") say(`${item[3]} — a familiar Petah Tikva street.`, 4);
    else if (kind === "market") say("Fresh produce and flowers fill the market stall.", 4);
    else if (kind === "fence") say("A white picket fence marks the garden edge.", 4);
    else if (kind === "water") say("The water shimmers. Better stay on the path.", 4);
    else if (kind === "school") say("A school building stands beside the road.", 4);
    else if (kind === "bus_stop") say("A bus stop. Check the posted route before you ride.", 4);
    else if (kind === "landmark") say(item[3], 5);
    else if (kind === "tram_stop") {
      const seconds = tramService?.nextArrival(item[3],cityTime);
      say(seconds == null ? 'A light rail platform.' : seconds === 0 ? `${item[3]}: the tram is stopped at the platform.` : `${item[3]}: next tram in ${Math.ceil(seconds)} seconds. Service every 3 minutes.`,5);
    }
    else if (kind === "car") say("A parked car. Watch for traffic before crossing.", 4);
    else if (kind === "bike") say("A bicycle is ready for a ride along the street.", 4);
    else if (kind === "tram") say("The blue and white light rail waits at the platform.", 4);
    else if (kind === "playground_slide") say("A bright red slide stands in the park.", 4);
    else if (kind === "playground_swings") say("The swings creak gently in the breeze.", 4);
    else if (kind === "gas_station") say("Fuel pumps stand beneath the station canopy.", 4);
    else if (kind === "shopping_mall") say("Shops line the bright indoor promenade.", 4);
    else if (kind === "hospital") say("The hospital entrance is open to the neighborhood.", 4);
    else if (kind === "city_hall") say("City Hall serves the people of Petah Tikva.", 4);
    else if (kind === "traffic_light") say("Wait for the green signal before crossing.", 4);
    else if (kind === "bench") say("A good place to sit and rest for a moment.", 4);
    else say("You take a closer look at the scenery.", 4);
  }
  function interact() {
    if(CharacterStudio.isOpen) return;
    if (!mapOverlay.classList.contains("hidden")) { closeMap(); return; }
    if (!aboutOverlay.classList.contains("hidden")) {
      aboutOverlay.classList.add("hidden");
      return;
    }
    if (phase === "battle") { attack(); return; }
    if (phase === "won") { openCharacterSelect(); return; }
    if (phase === "title") {
      reset();
      return;
    }
    if (inside) { interactInside(); return; }
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
      const nearest = nearestWorldThing();
      if (nearest.kind === "house") enterHouse(nearest.data);
      else if (nearest.kind === "person") say(`${nearest.data.name}: ${nearest.data.chat}`, 4.5);
      else if (nearest.kind === "scenery") interactScenery(nearest.data);
      else if (distance(player.x, player.y, town.start[0], town.start[1]) < 75)
        say("Your home is Hen 14. Follow the gold markers!");
      else say("Follow the markers, or explore a house and the scenery.");
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
        camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
        camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
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
  function update(dt, time, elapsed = dt) {
    if (phase === "playing" || phase === "battle") cityTime += elapsed;
    if (phase !== "playing") { stopScreenWalk(); return; }
    updateScreenWalk();
    if (gamePinch?.active) { player.step=0; if(inside)inside.step=0; return; }
    if (CharacterStudio.isOpen || !mapOverlay.classList.contains("hidden") || !aboutOverlay.classList.contains("hidden")) return;
    if (inside) {
      const room = HouseRooms.layout(W, H);
      const items = HouseRooms.objects(inside, room);
      const down = name => keys.has(name) || touch.has(name) || screenDirection===name;
      let dx = Number(down("right")) - Number(down("left"));
      let dy = Number(down("down")) - Number(down("up"));
      if (dx || dy) {
        const magnitude = Math.hypot(dx, dy);
        dx /= magnitude; dy /= magnitude;
        const oldX = inside.x, oldY = inside.y;
        const nx = inside.x + dx * SPEED * dt;
        const ny = inside.y + dy * SPEED * dt;
        if (ny >= room.exitY && Math.abs(nx - room.exitX) < 27) {
          leaveHouse(); return;
        }
        if (HouseRooms.canStand(nx, inside.y, room, items)) inside.x = nx;
        if (HouseRooms.canStand(inside.x, ny, room, items)) inside.y = ny;
        centerRoomView();
        inside.facing = Math.abs(dx) > Math.abs(dy) ?
          (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        inside.step = Math.hypot(inside.x - oldX, inside.y - oldY) > 0.01
          ? inside.step + dt * 7 : 0;
        saveTimer += dt;
        if (saveTimer > 1) { saveTimer = 0; save(); }
      } else inside.step = 0;
      if (message && time > messageUntil) message = "";
      return;
    }
    updatePeople(dt);
    const down = name => keys.has(name) || touch.has(name) || screenDirection===name;
    let dx = Number(down("right")) - Number(down("left"));
    let dy = Number(down("down")) - Number(down("up"));
    if (dx || dy) {
      const mag = Math.hypot(dx, dy);
      dx /= mag;
      dy /= mag;
      const oldX = player.x, oldY = player.y;
      const pace = SPEED * groundSpeed(player.x, player.y);
      const nx = player.x + dx * pace * dt;
      const ny = player.y + dy * pace * dt;
      if (canStand(nx, player.y)) player.x = nx;
      if (canStand(player.x, ny)) player.y = ny;
      player.facing = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      player.step = Math.hypot(player.x - oldX, player.y - oldY) > 0.01
        ? player.step + Math.hypot(player.x - oldX, player.y - oldY) / SPEED * 7 : 0;
      saveTimer += dt;
      if (saveTimer > 1) { saveTimer = 0; save(); }
    } else {
      player.step = 0;
    }
    const targetX = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
    const targetY = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
    const ease = Math.min(1, dt * 8);
    if(dx || dy) {
      camera.x += (targetX - camera.x) * ease;
      camera.y += (targetY - camera.y) * ease;
    }

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
    if (x < -25 || y < -45 || x > viewWidth() + 25 || y > viewHeight() + 25) return;
    const facing=person.facing;
    ctx.fillStyle="#394a4d88";ctx.beginPath();ctx.ellipse(x,y+3,9,3,0,0,Math.PI*2);ctx.fill();
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(CharacterDesign.worldSprite(CharacterDesign.sprite(person.design,facing,person.motion==="outbound"||person.motion==="return"?Math.floor(person.stride)%2:-1)),x-12,y-32);
  }

  function drawOverview() {
    if (!map.complete || !map.naturalWidth) return;
    overviewCtx.imageSmoothingEnabled = false;
    overviewCtx.drawImage(map, 0, 0, overview.width, overview.height);
    for (const [index, type] of mapEdits) {
      const cols = WORLD_W / MapGrid.tileSize;
      const worldX = index % cols * MapGrid.tileSize;
      const worldY = Math.floor(index / cols) * MapGrid.tileSize;
      MapGrid.drawTile(overviewCtx, MapGrid.connectedType(mapEdits,index,cols,baseRoads,baseAccess,baseSidewalks,basePaving), worldX / WORLD_W * overview.width,
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
        camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
        camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
        save();
      }
      setMapStatus(`Edited map · ${mapEdits.size} blocks applied`);
      if(phase!=="title")generatePeople(peopleSeed);
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
  function drawPlayer(x = Math.round(player.x - camera.x),
                      y = Math.round(player.y - camera.y),
                      facing = player.facing, step = player.step) {
    const design=CharacterDesign.library[characterId],pose=step>0?Math.floor(step)%2:-1;
    ctx.fillStyle="#394a4d88";ctx.beginPath();ctx.ellipse(x,y+3,9,3,0,0,Math.PI*2);ctx.fill();
    let source=CharacterDesign.sprite(design,facing,pose);
    if(design.original && walkFrames[characterId]?.[facing])
      source=CharacterDesign.withHeadphones(pose<0?walkFrames[characterId][facing].idle:walkFrames[characterId][facing][pose],design,facing);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(CharacterDesign.worldSprite(source),x-12,y-32);
  }
  function drawHud(label, prompt) {
    const leftWidth = Math.min(211, Math.floor(W * .56));
    const rightWidth = W < 540 ? 104 : 151;
    panel(12, 12, leftWidth, 38);
    ctx.fillStyle = "#25364b";
    ctx.font = `bold ${W < 540 ? 15 : 17}px Consolas, monospace`;
    let title = label;
    while (title.length > 4 && ctx.measureText(title).width > leftWidth - 20)
      title = title.slice(0, -2) + "…";
    ctx.fillText(title, 23, 38);
    panel(W - rightWidth - 12, 12, rightWidth, 38);
    ctx.fillStyle = "#25364b";
    ctx.fillText(`★ ${foundCount()}/3`, W - rightWidth - 2, 38);
    const line = message && phase === "playing" ? message : prompt;
    if (!line || phase !== "playing") return;
    const boxY = W < 540 ? H - 203 : H - 75;
    panel(12, boxY, W - 24, 63);
    ctx.fillStyle = "#25364b";
    ctx.font = `bold ${W < 540 ? 14 : 16}px Consolas, monospace`;
    const words = line.split(/\s+/);
    const lines = [""];
    for (const word of words) {
      const candidate = `${lines[lines.length - 1]} ${word}`.trim();
      if (ctx.measureText(candidate).width > W - 52 && lines[lines.length - 1]) lines.push(word);
      else lines[lines.length - 1] = candidate;
    }
    ctx.fillText(lines[0] || "", 25, boxY + 26);
    if (lines[1]) ctx.fillText(lines.slice(1).join(" "), 25, boxY + 49, W - 50);
  }
  function drawInterior() {
    ctx.fillStyle='#18313a';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.scale(roomView.zoom,roomView.zoom);ctx.translate(-roomView.x,-roomView.y);
    const { room, items } = HouseRooms.draw(ctx, inside, W, H);
    drawPlayer(Math.round(inside.x), Math.round(inside.y), inside.facing, inside.step);
    ctx.restore();
    const nearest = HouseRooms.nearest(inside.x, inside.y, room, items);
    const prompt = nearest.distance < 59 ?
      `A · ${nearest.item.kind === "exit" ? "Leave house" : `Examine ${nearest.item.kind}`}` :
      "Explore the room · use A near furniture";
    drawHud(houseName(inside.id).toUpperCase(), prompt);
  }
  function drawTransit() {
    if (!tramService) return;
    for (const stop of tramService.stops) {
      const x=Math.round(stop.point[0]-camera.x),y=Math.round(stop.point[1]-camera.y);
      if(x < -150 || y < -90 || x > viewWidth()+150 || y > viewHeight()+90)continue;
      const seconds=Math.ceil(tramService.nextArrival(stop.name,cityTime));
      ctx.fillStyle='#344a58';ctx.fillRect(x-64,y-76,128,30);
      ctx.fillStyle='#fff6dc';ctx.fillRect(x-62,y-74,124,26);
      ctx.font='11px Arial';ctx.textAlign='center';ctx.fillStyle='#253e4b';
      ctx.fillText(stop.name+' station',x,y-63);
      ctx.fillText(seconds===0?'Tram stopped':`Next tram ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,x,y-51);
      ctx.textAlign='left';
    }
    const tram=tramService.state(cityTime),x=Math.round(tram.x-camera.x),y=Math.round(tram.y-camera.y);
    const image=tramArt[tram.facing];
    if(image.naturalWidth && x>-90 && y>-90 && x<viewWidth()+90 && y<viewHeight()+90){
      ctx.drawImage(image,x-image.width/2,y-image.height/2);
    }
  }
  function draw(time) {
    ctx.imageSmoothingEnabled = false;
    if (inside) { drawInterior(); return; }
    ctx.save();ctx.scale(worldZoom,worldZoom);
    mapStream.draw(ctx, camera.x, camera.y, viewWidth(), viewHeight());
    const cols = WORLD_W / MapGrid.tileSize;
    const firstX = Math.max(0, Math.floor(camera.x / MapGrid.tileSize)-4);
    const lastX = Math.min(cols - 1, Math.ceil((camera.x + viewWidth()) / MapGrid.tileSize));
    const firstY = Math.max(0, Math.floor(camera.y / MapGrid.tileSize)-4);
    const lastY = Math.min(WORLD_H / MapGrid.tileSize - 1,
      Math.ceil((camera.y + viewHeight()) / MapGrid.tileSize));
    for (let tileY = firstY; tileY <= lastY; tileY++) for (let tileX = firstX; tileX <= lastX; tileX++) {
      const type = MapGrid.connectedType(mapEdits,tileY*cols+tileX,cols,baseRoads,baseAccess,baseSidewalks,basePaving);
      if (type) MapGrid.drawTile(ctx, type,
        tileX * MapGrid.tileSize - camera.x, tileY * MapGrid.tileSize - camera.y,MapGrid.tileSize,true);
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
    drawTransit();
    drawPlayer();
    ctx.restore();
    let prompt = "";
    if (phase === "playing" && distance(player.x, player.y, school.x, school.y) < 70)
      prompt = "A · Enter Kaplan School";
    else if (phase === "playing") {
      const nearest = nearestWorldThing();
      if (nearest.kind === "house") prompt = "A · Enter house";
      else if (nearest.kind === "person") prompt = `A · Talk to ${nearest.data.name}`;
      else if (nearest.kind === "scenery") prompt = `A · Examine ${nearest.data[2]}`;
    }
    drawHud(locationName(), prompt);
  }
  function tick(timestamp) {
    controls.classList.toggle("hidden", phase !== "playing" || !battleOverlay.classList.contains("hidden") ||
      !startOverlay.classList.contains("hidden") || !winOverlay.classList.contains("hidden"));
    if (startButton.disabled && mapStream.ready()) assetsReady();
    const seconds = timestamp / 1000;
    const elapsed = lastTime ? Math.max(0,seconds-lastTime) : 0;
    const dt = Math.min(0.05, elapsed);
    lastTime = seconds;
    update(dt, seconds, elapsed);
    draw(seconds);
    requestAnimationFrame(tick);
  }

  const keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  };
  window.addEventListener("keydown", event => {
    if(CharacterStudio.isOpen) { if(event.code==="Escape") CharacterStudio.close(); return; }
    if (phase === "title" && event.target instanceof HTMLButtonElement && event.code !== "Escape") return;
    if (event.code === "Escape" && !mapOverlay.classList.contains("hidden")) {
      closeMap(); return;
    }
    if (event.code === "Escape" && gameMenu.classList.contains("open")) {
      closeMenu(); return;
    }
    if (event.code === "Escape" && inside) { leaveHouse(); return; }
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
  let pinchStart=null;
  function gesturePoint(center) {
    const box=canvas.getBoundingClientRect();
    return {x:(center.x-box.left)*W/box.width,y:(center.y-box.top)*H/box.height};
  }
  gamePinch=PinchZoom(canvas, {
    enabled:()=>phase==='playing'&&!CharacterStudio.isOpen&&mapOverlay.classList.contains('hidden')&&aboutOverlay.classList.contains('hidden'),
    start(center) {
      stopScreenWalk();
      keys.clear();touch.clear();
      document.querySelectorAll('.dir.pressed').forEach(b=>b.classList.remove('pressed'));
      const p=gesturePoint(center),view=inside?roomView:{...camera,zoom:worldZoom};
      pinchStart={inside:!!inside,zoom:view.zoom,x:view.x+p.x/view.zoom,y:view.y+p.y/view.zoom};
    },
    change(ratio,center) {
      const p=gesturePoint(center),zoom=clamp(pinchStart.zoom*ratio,.75,2.5);
      const x=pinchStart.x-p.x/zoom,y=pinchStart.y-p.y/zoom;
      if(pinchStart.inside) {
        roomView.zoom=zoom;roomView.x=boundView(x,W,W/zoom);roomView.y=boundView(y,H,H/zoom);
      } else {
        worldZoom=zoom;camera.x=boundView(x,WORLD_W,viewWidth());camera.y=boundView(y,WORLD_H,viewHeight());
      }
    },
    end() { saveProgress(); }
  });
  function screenWalkEnabled() {
    return phase==='playing'&&!gamePinch?.active&&!CharacterStudio.isOpen&&
      mapOverlay.classList.contains('hidden')&&aboutOverlay.classList.contains('hidden')&&
      !gameMenu.classList.contains('open');
  }
  function updateScreenWalk() {
    if(!screenWalkEnabled()) { stopScreenWalk();return; }
    screenDirection=null;
    if(!screenPointer || performance.now()-screenPointer.started<100)return;
    const box=canvas.getBoundingClientRect();
    // Compare in screen pixels to the visible sprite center, including zoom.
    const x=inside?(inside.x-roomView.x)*roomView.zoom:(player.x-camera.x)*worldZoom;
    const y=inside?(inside.y-14-roomView.y)*roomView.zoom:(player.y-14-camera.y)*worldZoom;
    const dx=screenPointer.x-(box.left+x/W*box.width);
    const dy=screenPointer.y-(box.top+y/H*box.height);
    if(Math.hypot(dx,dy)<18)return;
    screenDirection=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!screenWalkEnabled()||screenPointer||event.button>0)return;
    event.preventDefault();canvas.setPointerCapture(event.pointerId);
    screenPointer={id:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now()};
  });
  canvas.addEventListener('pointermove',event=>{
    if(screenPointer?.id!==event.pointerId)return;
    screenPointer.x=event.clientX;screenPointer.y=event.clientY;
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{
    if(screenPointer?.id===event.pointerId)stopScreenWalk();
  });
  window.addEventListener("blur", () => { keys.clear(); touch.clear();stopScreenWalk(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopScreenWalk(); keys.clear();touch.clear();saveProgress(); }
  });
  window.addEventListener("pagehide", saveProgress);
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
  document.getElementById("restartButton").addEventListener("click", openCharacterSelect);
  document.getElementById("playAgainButton").addEventListener("click", openCharacterSelect);
  characterPicker.addEventListener("click", event => {
    const choice = event.target.closest(".character-choice");
    if (choice) selectCharacter(choice.dataset.character);
  });
  function openDesigner() {
    keys.clear(); touch.clear(); saveProgress();
    CharacterStudio.open(phase==="title"?selectedCharacter:characterId, id=>{
      selectCharacter(id); if(phase!=="title") {characterId=id;saveProgress();}
      drawCharacterChoices();
    },()=>canvas.focus(),(id,facing,pose)=>walkFrames[id]?.[facing]?.[pose]);
  }
  document.getElementById("designCharacterButton").addEventListener("click",openDesigner);
  document.getElementById("editCharacterButton").addEventListener("click",openDesigner);
  document.getElementById("actionButton").addEventListener("click", interact);
  document.getElementById("attackButton").addEventListener("click", attack);
  document.getElementById("healButton").addEventListener("click", snack);
  document.getElementById("aboutButton").addEventListener("click", () => {
    if (phase !== "title") { keys.clear(); touch.clear(); save(); }
    aboutOverlay.classList.remove("hidden");
  });
  document.getElementById("exitButton").addEventListener("click", event => {
    event.stopPropagation();
    exitGame();
  });
  document.getElementById("closeAboutButton").addEventListener("click", () => {
    aboutOverlay.classList.add("hidden");
  });
  function closeMenu() {
    gameMenu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open game menu");
  }
  menuButton.addEventListener("click", () => {
    const open = gameMenu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close game menu" : "Open game menu");
  });
  gameMenu.addEventListener("click", event => {
    if (event.target.closest("button")) closeMenu();
  });
  document.getElementById("mapButton").addEventListener("click", () => { closeMenu(); openMap(); });
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
    if(phase!=="title")generatePeople(peopleSeed);
    if (!canStand(player.x, player.y)) {
      player.x = town.start[0]; player.y = town.start[1];
      camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
      camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
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
  if(mapEdits.size && ![town.start,town.school,...town.markers.map(m=>m.point)].every(([x,y])=>canStand(x,y))) {
    try{localStorage.setItem(MAP_KEY+"-pre-grid-backup",localStorage.getItem(MAP_KEY)||"");localStorage.removeItem(MAP_KEY);}catch(_){}
    mapEdits=new Map();setMapStatus("Previous map edits kept in local backup; re-import a revised map with open quest paths.");
  }
  const previousGame = savedGame();
  if (previousGame) {
    continueButton.classList.remove("hidden");
    selectCharacter(previousGame.character || "andrei");
  }
  drawCharacterChoices();
  if (mapEdits.size) setMapStatus(`Edited map · ${mapEdits.size} blocks applied`);
  updateStatus();
  window.kaplanAction = interact;
  window.kaplanSave = saveProgress;
  window.kaplanBack = () => {
    if (CharacterStudio.isOpen) CharacterStudio.close();
    else if (!mapOverlay.classList.contains("hidden")) closeMap();
    else if (!aboutOverlay.classList.contains("hidden")) aboutOverlay.classList.add("hidden");
    else if (gameMenu.classList.contains("open")) closeMenu();
    else if (phase === "battle") attack();
    else if (inside) leaveHouse();
    else if (phase === "playing") { save(); say("Progress saved.", 2); }
  };
  window.addEventListener("resize", () => requestAnimationFrame(() => {
    const previousWidth = W, previousHeight = H;
    if (window.matchMedia("(max-width: 540px)").matches) {
      const bounds = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(bounds.width));
      H = Math.max(1, Math.round(bounds.height));
    } else { W = 640; H = 480; }
    if (W === previousWidth && H === previousHeight) return;
    canvas.width = W; canvas.height = H;
    if (inside) {
      inside.x *= W / previousWidth;
      inside.y *= H / previousHeight;
      centerRoomView();
    }
    camera.x = clamp(player.x - viewWidth() / 2, 0, WORLD_W - viewWidth());
    camera.y = clamp(player.y - viewHeight() / 2, 0, WORLD_H - viewHeight());
  }));
  map.addEventListener("error", () => {
    document.querySelector(".overlay-card p").textContent =
      "Town overview could not load. Reopen the game to retry.";
  });
  function assetsReady() {
    const ready = !!(walkBits.length && mapStream.ready());
    startButton.disabled = !ready;
    continueButton.disabled = !ready;
    if (ready) drawOverview();
  }
  map.addEventListener("load", assetsReady);
  MapGrid.whenArtReady(() => { if (map.complete && map.naturalWidth) drawOverview(); });
  assetsReady();
  if (new URLSearchParams(location.search).has("test")) {
    window.__siteSDebug = () => ({
      x: Math.round(player.x), y: Math.round(player.y),
      markers: foundCount(), phase, worldZoom, roomZoom:roomView.zoom,
      cameraX:camera.x,cameraY:camera.y,pinching:!!gamePinch?.active,
      screenDirection,roomViewX:roomView.x,roomViewY:roomView.y,
      hp: buddy.hp, enemyHp: battle?.hp ?? null,
      avatarLoaded: !CharacterDesign.library[characterId].original || !!characterArt[characterId]?.naturalWidth,
      character: characterId, selectedCharacter,
      facing: inside ? inside.facing : player.facing,
      walkFrame: (inside ? inside.step : player.step) > 0
        ? Math.floor(inside ? inside.step : player.step) % 2 : null,
      splashVisible: !splashScreen.classList.contains("hidden"),
      cityTime, tram: tramService?.state(cityTime),
      ground: groundSpeed(player.x,player.y) < 1 ? "grass" : "paving", movementSpeed: SPEED*groundSpeed(player.x,player.y),
      mapLoaded: mapStream.ready(), mapStream: mapStream.stats(),
      maskLoaded: !!walkBits.length, peopleCount: people.length, peopleSeed,
      mapOpen: !mapOverlay.classList.contains("hidden"),
      characterSize: {width:24,height:32}, npcSize: {width:24,height:32},
      mapEdits: mapEdits.size, interior: inside?.id ?? null,
      houseCount: town.houses?.length ?? 0, sceneryCount: town.scenery?.length ?? 0,
      snacks: buddy.snacks, roomX: inside?.x ?? null, roomY: inside?.y ?? null,
      message,
    });
    window.__siteSTest = {
      setCityTime(seconds) { cityTime=seconds; },
      advancePlayer(seconds, direction) { keys.add(direction); update(seconds,lastTime); keys.delete(direction); },
      walkFrameImage(id, facing, pose) {
        return (CharacterDesign.library[id]?.original ? (walkFrames[id]?.[facing]?.[pose] && CharacterDesign.withHeadphones(walkFrames[id][facing][pose],CharacterDesign.library[id],facing)) : CharacterDesign.sprite(CharacterDesign.library[id],facing,pose))?.toDataURL() || null;
      },
      setPlayer(x, y) {
        if (!canStand(x, y)) return false;
        player.x = x; player.y = y;
        camera.x = clamp(x - viewWidth() / 2, 0, WORLD_W - viewWidth());
        camera.y = clamp(y - viewHeight() / 2, 0, WORLD_H - viewHeight());
        return true;
      },
      worldSpriteImage: id => CharacterDesign.worldSprite(CharacterDesign.sprite(CharacterDesign.library[id])).toDataURL(),
      advancePeople: seconds=>updatePeople(seconds),
      npcState: ()=>people.map(({x,y,homeX,homeY,targetX,targetY,motion,timer,stride,facing})=>({x,y,homeX,homeY,targetX,targetY,motion,timer,stride,facing})),
      peopleDesigns: () => people.map(person=>person.design),
      nearestPeople: () => people.filter(person => distance(person.x, person.y, player.x, player.y) < 320).length,
      firstPerson: () => people.length ? { x: people[0].x, y: people[0].y,
        name: people[0].name } : null,
      isWalkable: (x, y) => isOpenPoint(x, y),
      enterHouse(id) {
        const house = town.houses?.[id];
        if (!house) return false;
        player.x = house.entry[0]; player.y = house.entry[1];
        if (!canStand(player.x, player.y)) return false;
        enterHouse({ ...house, id });
        return true;
      },
      roomObjects: () => inside ? HouseRooms.objects(inside, HouseRooms.layout(W, H)) : [],
      setRoomPlayer(x, y) { if (!inside) return false; inside.x = x; inside.y = y; return true; },
      setBuddy(hp, snacks) { buddy.hp = hp; buddy.snacks = snacks; updateStatus(); },
      nearestInteractionId: () => nearestWorldThing().data?.id,
      nearestInteraction: () => nearestWorldThing().kind,
      nearestInteractionType: () => {
        const nearest = nearestWorldThing();
        return nearest.kind === "scenery" ? nearest.data[2] : nearest.kind;
      },
    };
  }
  window.setTimeout(() => {
    splashScreen.classList.add("dismissed");
    window.setTimeout(() => splashScreen.classList.add("hidden"), 350);
  }, 1250);
  requestAnimationFrame(tick);
})();
