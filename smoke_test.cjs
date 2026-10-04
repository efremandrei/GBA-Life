const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname, 'app/src/main/assets/index.html')).href + '?test');
  if (!await page.locator('#splashScreen').isVisible()) throw new Error('Launch splash did not appear');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_splash_v8.png') });
  await page.waitForFunction(() => window.__siteSDebug?.().splashVisible === false);
  await page.waitForFunction(() => window.__siteSDebug?.().mapLoaded && window.__siteSDebug?.().maskLoaded);
  await page.locator('[data-character="maya"]').click();
  if (await page.locator('[data-character="maya"]').getAttribute('aria-pressed') !== 'true')
    throw new Error('Character choice was not selected');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_characters_v8.png') });
  await page.locator('#startButton').click();
  await page.waitForFunction(() => window.__siteSDebug().avatarLoaded);
  await page.waitForFunction(() => ['andrei', 'maya', 'amir', 'dana'].every(id =>
    ['down', 'up', 'left', 'right'].every(facing =>
      window.__siteSTest.walkFrameImage(id, facing, 0) &&
      window.__siteSTest.walkFrameImage(id, facing, 1))));
  const repeatedWalkFrames = await page.evaluate(() => {
    const repeated = [];
    for (const id of ['andrei', 'maya', 'amir', 'dana'])
      for (const facing of ['down', 'up', 'left', 'right'])
        if (window.__siteSTest.walkFrameImage(id, facing, 0) ===
            window.__siteSTest.walkFrameImage(id, facing, 1)) repeated.push(`${id}/${facing}`);
    return repeated;
  });
  if (repeatedWalkFrames.length) throw new Error(`Walking poses are identical: ${repeatedWalkFrames}`);
  await page.evaluate(() => {
    const gallery = document.createElement('div');
    gallery.id = 'walkPreview';
    gallery.style.cssText = 'position:fixed;top:0;left:0;z-index:200;padding:12px;background:#17273b;color:#fff8dc;font:15px monospace';
    gallery.innerHTML = '<h2 style="margin:0 0 8px">FRONT / BACK WALK CYCLE</h2>';
    for (const id of ['andrei', 'maya', 'amir', 'dana']) {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:65px repeat(4,70px);align-items:center;gap:5px;margin-bottom:5px';
      const label = document.createElement('strong'); label.textContent = id; row.append(label);
      for (const facing of ['down', 'up']) for (const pose of [0, 1]) {
        const image = document.createElement('img');
        image.src = window.__siteSTest.walkFrameImage(id, facing, pose);
        image.width = 70; image.height = 103;
        image.style.imageRendering = 'pixelated';
        image.alt = `${id} ${facing} pose ${pose}`;
        row.append(image);
      }
      gallery.append(row);
    }
    document.body.append(gallery);
  });
  await page.locator('#walkPreview').screenshot({ path: path.join(__dirname, 'docs/preview_walk_cycle_v9.png') });
  await page.locator('#walkPreview').evaluate(node => node.remove());
  if ((await page.evaluate(() => window.__siteSDebug())).walkFrame !== null)
    throw new Error('Standing character should use the idle sprite');
  await page.waitForFunction(() => !document.querySelector('.controls').classList.contains('hidden'));
  const beginning = await page.evaluate(() => window.__siteSDebug());
  if (beginning.character !== 'maya') throw new Error('Selected character was not used in the game');
  if (beginning.peopleCount !== 145 || !beginning.peopleSeed) throw new Error('People were not generated');
  const layout = await page.evaluate(() => {
    const map = document.querySelector('#game').getBoundingClientRect();
    const controls = document.querySelector('.controls').getBoundingClientRect();
    return { mapShare: map.height / innerHeight, mapTop: map.top, mapBottom: map.bottom,
      controlsTop: controls.top, controlsBottom: controls.bottom,
      controlsOverMap: controls.top > map.top && controls.bottom <= map.bottom + 8 };
  });
  if (layout.mapShare < .7 || !layout.controlsOverMap) throw new Error(`Phone map is too small: ${JSON.stringify(layout)}`);
  await page.locator('#menuButton').click();
  if (!await page.locator('#gameMenu').isVisible()) throw new Error('Compact menu did not open');
  if (!await page.locator('#exitButton').isVisible()) throw new Error('Exit Game is missing from the menu');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_exit_menu_v7.png') });
  await page.locator('#menuButton').click();
  if (await page.locator('#gameMenu').isVisible()) throw new Error('Compact menu did not close');
  if (beginning.houseCount < 200 || beginning.sceneryCount < 300)
    throw new Error('House or scenery metadata is missing');
  const cityCounts = await page.evaluate(() => ({
    houses: window.TOWN_DATA.houses.filter(h => h.roof === 'high_building').length,
    kinds: window.TOWN_DATA.scenery.reduce((counts, item) => {
      counts[item[2]] = (counts[item[2]] || 0) + 1; return counts;
    }, {}),
    tileCount: window.MapGrid.types.length,
  }));
  if (cityCounts.tileCount !== 32 || cityCounts.houses < 20 ||
      ['hospital', 'bus_stop', 'tram_stop', 'tram', 'car', 'bike', 'playground_slide',
        'playground_swings', 'traffic_light', 'bench'].some(kind => !cityCounts.kinds[kind]))
    throw new Error(`New city assets are missing: ${JSON.stringify(cityCounts)}`);
  const inaccessible = await page.evaluate(() => {
    const failed = [];
    window.TOWN_DATA.houses.forEach((house, index) => {
      if (!window.__siteSTest.setPlayer(...house.entry)) failed.push(index);
    });
    return failed;
  });
  if (inaccessible.length) throw new Error(`Houses without walkable entrances: ${inaccessible.slice(0, 12)}`);
  if (!await page.evaluate(() => window.__siteSTest.enterHouse(0))) throw new Error('Could not enter house');
  if ((await page.evaluate(() => window.__siteSDebug())).interior !== 0) throw new Error('House interior did not open');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_house_v6.png') });
  const roomObjects = await page.evaluate(() => window.__siteSTest.roomObjects());
  const bed = roomObjects.find(item => item.kind === 'bed');
  const chest = roomObjects.find(item => item.kind === 'chest');
  await page.evaluate(({ x, y }) => {
    window.__siteSTest.setBuddy(8, 1);
    window.__siteSTest.setRoomPlayer(x, y);
  }, { x: bed.x, y: bed.y + bed.h / 2 + 10 });
  await page.keyboard.press('e');
  if ((await page.evaluate(() => window.__siteSDebug())).hp !== 24) throw new Error('Bed did not restore Buddy HP');
  await page.evaluate(({ x, y }) => window.__siteSTest.setRoomPlayer(x, y),
    { x: chest.x, y: chest.y + chest.h / 2 + 10 });
  await page.keyboard.press('e');
  if ((await page.evaluate(() => window.__siteSDebug())).snacks !== 2) throw new Error('Chest did not give a snack');
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().maskLoaded);
  await page.locator('#continueButton').click();
  if ((await page.evaluate(() => window.__siteSDebug())).interior !== 0) throw new Error('Interior did not survive resume');
  await page.evaluate(() => {
    window.NativeGame = { exitGame() {
      window.__savedAtExit = JSON.parse(localStorage.getItem('kaplan-quest-save-v2'));
    } };
  });
  await page.locator('#menuButton').click();
  await page.locator('#exitButton').click();
  const exitSave = await page.evaluate(() => window.__savedAtExit);
  if (!exitSave || exitSave.character !== 'maya' || exitSave.interior?.id !== 0 || exitSave.openedChests?.length !== 1 ||
      exitSave.snacks !== 2 || exitSave.phase !== 'playing')
    throw new Error(`Exit did not save before closing: ${JSON.stringify(exitSave)}`);
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().maskLoaded);
  await page.locator('#continueButton').click();
  if ((await page.evaluate(() => window.__siteSDebug())).interior !== 0 ||
      (await page.evaluate(() => window.__siteSDebug())).character !== 'maya')
    throw new Error('Exit Game save did not restore the house interior');
  await page.keyboard.press('Escape');
  if ((await page.evaluate(() => window.__siteSDebug())).interior !== null) throw new Error('House exit failed');
  const scenery = await page.evaluate(() => {
    for (const item of window.TOWN_DATA.scenery) {
      if (!['tree', 'shrub', 'flowers', 'lamp', 'sign', 'fountain'].includes(item[2])) continue;
      for (const [dx, dy] of [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16], [28, 0], [-28, 0]]) {
        if (window.__siteSTest.setPlayer(item[0] + dx, item[1] + dy) &&
            window.__siteSTest.nearestInteraction() === 'scenery') return item[2];
      }
    }
    return null;
  });
  if (!scenery) throw new Error('Could not approach any scenery object');
  await page.keyboard.press('e');
  const sceneryMessage = (await page.evaluate(() => window.__siteSDebug())).message;
  if (!sceneryMessage || sceneryMessage.includes('Follow the markers'))
    throw new Error(`Scenery did not respond: ${sceneryMessage}`);
  for (const kind of ['hospital', 'bus_stop', 'tram_stop', 'tram', 'car', 'bike',
    'playground_slide', 'playground_swings']) {
    const reachable = await page.evaluate(kind => {
      for (const item of window.TOWN_DATA.scenery.filter(item => item[2] === kind)) {
        for (const radius of [0, 8, 16, 24, 32, 40]) {
          for (const [dx, dy] of [[radius, 0], [-radius, 0], [0, radius], [0, -radius]]) {
            if (window.__siteSTest.setPlayer(item[0] + dx, item[1] + dy) &&
                window.__siteSTest.nearestInteractionType() === kind) return true;
          }
        }
      }
      return false;
    }, kind);
    if (!reachable) throw new Error(`Cannot reach or interact with a ${kind}`);
    await page.keyboard.press('e');
    if (!(await page.evaluate(() => window.__siteSDebug().message)))
      throw new Error(`${kind} gave no interaction message`);
  }
  const editedHouse = await page.evaluate(() => {
    const width = window.TOWN_DATA.width, height = window.TOWN_DATA.height, tile = 32, cols = width / tile;
    const [startX, startY] = window.TOWN_DATA.start;
    for (let row = Math.floor(startY / tile) - 8; row <= Math.floor(startY / tile) + 8; row++) {
      for (let col = Math.floor(startX / tile) - 8; col <= Math.floor(startX / tile) + 8; col++) {
        const x = col * tile + 16, y = row * tile + 16;
        if (Math.hypot(x - startX, y - startY) < 65 || !window.__siteSTest.isWalkable(x, y)) continue;
        for (const [dx, dy] of [[32,128],[32,136],[40,128],[24,128]]) {
          if (!window.__siteSTest.isWalkable(x + dx, y + dy)) continue;
          const index = row * cols + col;
          const json = window.MapGrid.serialize(new Map([[index, 'high_building']]), width, height);
          if (!window.kaplanApplyMap(json)) continue;
          if (window.__siteSTest.setPlayer(x + dx, y + dy) &&
              window.__siteSTest.nearestInteractionId() === `edit-${index}`) return index;
        }
      }
    }
    return null;
  });
  if (editedHouse === null) throw new Error('Could not approach a house added in the editor');
  await page.keyboard.press('e');
  if ((await page.evaluate(() => window.__siteSDebug())).interior !== `edit-${editedHouse}`)
    throw new Error('Editor-added house did not open');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.kaplanApplyMap(window.MapGrid.serialize(new Map(), 4096, 2304)));
  await page.evaluate(([x, y]) => window.__siteSTest.setPlayer(x, y), [beginning.x, beginning.y]);
  const personBefore = await page.evaluate(() => window.__siteSTest.firstPerson());
  await page.waitForTimeout(300);
  const personAfter = await page.evaluate(() => window.__siteSTest.firstPerson());
  if (Math.hypot(personAfter.x - personBefore.x, personAfter.y - personBefore.y) < 1)
    throw new Error('Townspeople did not move');
  if (!await page.evaluate(({ x, y }) => window.__siteSTest.setPlayer(x, y), personAfter))
    throw new Error('Townsperson was not on a walkable road');
  await page.keyboard.press('e');
  if (!(await page.evaluate(() => window.__siteSDebug().message)).startsWith(`${personAfter.name}:`))
    throw new Error('Townsperson did not talk');
  await page.evaluate(([x, y]) => window.__siteSTest.setPlayer(x, y), [beginning.x, beginning.y]);
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_start_v6.png') });
  await page.locator('#mapButton').click();
  if (!await page.locator('#mapOverlay').isVisible()) throw new Error('Town map did not open');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_map_v6.png') });
  await page.keyboard.press('Escape');
  if (await page.locator('#mapOverlay').isVisible()) throw new Error('Town map did not close');

  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__siteSDebug().walkFrame === 0);
  await page.waitForFunction(() => window.__siteSDebug().walkFrame === 1);
  await page.waitForFunction(() => window.__siteSDebug().walkFrame === 0);
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => window.__siteSDebug().walkFrame === null);
  const moved = await page.evaluate(() => window.__siteSDebug());
  if (moved.y >= beginning.y) throw new Error('Walking did not move player');
  await page.locator('#themeButton').click();
  if (!await page.locator('html').evaluate(el => el.classList.contains('light'))) throw new Error('Light skin did not apply');
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().maskLoaded);
  if (!await page.locator('html').evaluate(el => el.classList.contains('light'))) throw new Error('Light skin did not persist');
  await page.locator('#themeButton').click();
  await page.locator('#continueButton').click();
  const continued = await page.evaluate(() => window.__siteSDebug());
  if (continued.peopleSeed !== beginning.peopleSeed || continued.y >= beginning.y) throw new Error('Save did not resume');

  const markers = await page.evaluate(() => window.TOWN_DATA.markers.map(m => m.point));
  let battles = 0;
  for (let i = 0; i < markers.length; i++) {
    const [x, y] = markers[i];
    if (!await page.evaluate(([x, y]) => window.__siteSTest.setPlayer(x, y), [x, y]))
      throw new Error(`Marker ${i} is not walkable`);
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => window.__siteSDebug());
    if (state.markers !== i + 1) throw new Error(`Marker ${i} did not collect`);
    if (state.phase === 'battle') {
      battles++;
        await page.screenshot({ path: path.join(__dirname, `docs/preview_battle_${battles}_v6.png`) });
      for (let turn = 0; turn < 10; turn++) {
        if ((await page.evaluate(() => window.__siteSDebug())).phase !== 'battle') break;
        await page.locator('#attackButton').click();
        await page.waitForTimeout(1100);
      }
      if ((await page.evaluate(() => window.__siteSDebug())).phase === 'battle') throw new Error('Battle stalled');
    }
  }
  if (battles !== 2) throw new Error('Expected two encounters');
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().maskLoaded);
  await page.locator('#continueButton').click();
  if ((await page.evaluate(() => window.__siteSDebug())).markers !== 3) throw new Error('Quest progress did not persist');
  const school = await page.evaluate(() => window.TOWN_DATA.school);
  if (!await page.evaluate(([x, y]) => window.__siteSTest.setPlayer(x, y), school)) throw new Error('School entry is not walkable');
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  const won = await page.locator('#winOverlay').isVisible();
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_win_v6.png') });
  const mobileWidth = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  await page.locator('#playAgainButton').click();
  if (!await page.locator('#startOverlay').isVisible()) throw new Error('Play again did not open character choices');
  await page.locator('[data-character="amir"]').click();
  await page.locator('#startButton').click();
  const newSeed = await page.evaluate(() => window.__siteSDebug().peopleSeed);
  if ((await page.evaluate(() => window.__siteSDebug())).character !== 'amir')
    throw new Error('New adventure did not use the new character');
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().mapLoaded);
  await page.evaluate(() => {
    localStorage.removeItem('kaplan-quest-save-v2');
    localStorage.setItem('kaplan-quest-save-v1', JSON.stringify({
      x: 485, y: 400, markers: [true, false, false], hp: 17,
      snacks: 1, phase: 'playing', facing: 'up',
    }));
  });
  await page.reload();
  await page.waitForFunction(() => window.__siteSDebug?.().mapLoaded);
  await page.locator('#continueButton').click();
  const migrated = await page.evaluate(() => window.__siteSDebug());
  await page.locator('#menuButton').click();
  await page.locator('#restartButton').click();
  if (!await page.locator('#startOverlay').isVisible()) throw new Error('New game did not open character choices');
  await page.locator('[data-character="dana"]').click();
  await page.locator('#startButton').click();
  await page.waitForFunction(() => window.__siteSDebug().avatarLoaded);
  const dana = await page.evaluate(() => window.__siteSDebug());
  await browser.close();
  if (errors.length || !won || mobileWidth.content > mobileWidth.viewport || newSeed === beginning.peopleSeed ||
      migrated.x !== 3920 || migrated.y !== 2416 || migrated.markers !== 1 || migrated.hp !== 17 ||
      migrated.character !== 'andrei' || dana.character !== 'dana')
    throw new Error(JSON.stringify({ errors, won, mobileWidth, newSeed, migrated, dana }));
  console.log('PASS: splash, four-character selection, sprite save/resume, real-map game, battles, v1 migration, victory, mobile width, no JS errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
