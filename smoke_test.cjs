const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname, 'app/src/main/assets/index.html')).href + '?test');
  await page.waitForFunction(() => window.__siteSDebug?.().mapLoaded && window.__siteSDebug?.().maskLoaded);
  await page.locator('#startButton').click();
  await page.waitForFunction(() => window.__siteSDebug().avatarLoaded);
  const beginning = await page.evaluate(() => window.__siteSDebug());
  if (beginning.peopleCount !== 145 || !beginning.peopleSeed) throw new Error('People were not generated');
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
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_start_v4.png') });
  await page.locator('#mapButton').click();
  if (!await page.locator('#mapOverlay').isVisible()) throw new Error('Town map did not open');
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_map_v4.png') });
  await page.keyboard.press('Escape');
  if (await page.locator('#mapOverlay').isVisible()) throw new Error('Town map did not close');

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(360);
  await page.keyboard.up('ArrowUp');
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
      await page.screenshot({ path: path.join(__dirname, `docs/preview_battle_${battles}_v4.png`) });
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
  await page.screenshot({ path: path.join(__dirname, 'docs/preview_win_v4.png') });
  const mobileWidth = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  await page.locator('#playAgainButton').click();
  const newSeed = await page.evaluate(() => window.__siteSDebug().peopleSeed);
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
  await browser.close();
  if (errors.length || !won || mobileWidth.content > mobileWidth.viewport || newSeed === beginning.peopleSeed ||
      migrated.x !== 1958 || migrated.y !== 1195 || migrated.markers !== 1 || migrated.hp !== 17)
    throw new Error(JSON.stringify({ errors, won, mobileWidth, newSeed, migrated }));
  console.log('PASS: real-map assets, walking, 145 moving/talking people, map overlay, battles, save/resume, v1 migration, victory, mobile width, no JS errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
