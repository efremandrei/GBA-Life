const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname, 'app/src/main/assets/index.html')).href + '?test');
  await page.locator('#startButton').click();
  await page.waitForFunction(() => window.__siteSDebug().avatarLoaded);
  await page.screenshot({ path: path.join(__dirname, 'preview_start.png') });
  await page.locator('#themeButton').click();
  if (!await page.locator('html').evaluate(el => el.classList.contains('light'))) throw new Error('Light skin did not apply');
  await page.reload();
  if (!await page.locator('html').evaluate(el => el.classList.contains('light'))) throw new Error('Light skin did not persist');
  await page.locator('#themeButton').click();
  await page.locator('#continueButton').click();

  let battles = 0;
  async function fight() {
    battles++;
    await page.screenshot({ path: path.join(__dirname, `preview_battle_${battles}.png`) });
    for (let i = 0; i < 8; i++) {
      let state = await page.evaluate(() => window.__siteSDebug());
      if (state.phase !== 'battle') return;
      if (state.hp <= 9 && await page.locator('#healButton').isEnabled()) {
        const snacks = await page.locator('#healButton').textContent();
        if (!snacks.includes('×0')) await page.locator('#healButton').click();
        else await page.locator('#attackButton').click();
      } else await page.locator('#attackButton').click();
      await page.waitForTimeout(1100);
    }
    throw new Error('Battle did not finish');
  }
  async function walkUntil(key, predicate, timeout = 16000) {
    const began = Date.now();
    await page.keyboard.down(key);
    while (Date.now() - began < timeout) {
      await page.waitForTimeout(90);
      const state = await page.evaluate(() => window.__siteSDebug());
      if (predicate(state)) { await page.keyboard.up(key); return state; }
      if (state.phase === 'battle') {
        await page.keyboard.up(key);
        await fight();
        await page.keyboard.down(key);
      }
    }
    await page.keyboard.up(key);
    throw new Error(`Walk stalled: ${key}, ${JSON.stringify(await page.evaluate(() => window.__siteSDebug()))}`);
  }

  await walkUntil('ArrowRight', s => s.x >= 561);
  await walkUntil('ArrowUp', s => s.y <= 605);
  await walkUntil('ArrowLeft', s => s.x <= 352);
  await walkUntil('ArrowUp', s => s.y <= 405);
  await walkUntil('ArrowRight', s => s.x >= 420);
  await walkUntil('ArrowUp', s => s.y <= 385);
  await walkUntil('ArrowRight', s => s.x >= 486);
  const beforeSave = await page.evaluate(() => window.__siteSDebug());
  if (beforeSave.markers !== 3 || battles !== 2) throw new Error(`Route incomplete: ${JSON.stringify(beforeSave)}, battles=${battles}`);
  await page.reload();
  await page.locator('#continueButton').click();
  const continued = await page.evaluate(() => window.__siteSDebug());
  if (continued.markers !== 3) throw new Error('Saved progress did not resume');
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  const won = await page.locator('#winOverlay').isVisible();
  await page.screenshot({ path: path.join(__dirname, 'preview_win.png') });
  const mobileWidth = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  await browser.close();
  if (errors.length || !won || mobileWidth.content > mobileWidth.viewport) {
    throw new Error(JSON.stringify({ errors, won, mobileWidth }));
  }
  console.log('PASS: route, two battles, save/resume, victory, mobile width, no JS errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
