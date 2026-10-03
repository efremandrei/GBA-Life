const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const editorUrl = pathToFileURL(path.join(__dirname, 'editor/src/main/assets/editor.html')).href + '?test';
  await page.goto(editorUrl);
  await page.waitForFunction(() => window.__editorDebug?.().mapLoaded);
  await page.screenshot({ path: path.join(__dirname, 'docs/editor_preview.png'), fullPage: true });
  const rect = await page.locator('#mapCanvas').boundingBox();
  const at = (x, y) => ({ x: rect.x + x / 640 * rect.width, y: rect.y + y / 480 * rect.height });
  await page.locator('[data-tool="tree"]').click();
  const a = at(400, 416), b = at(464, 416);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  if ((await page.evaluate(() => window.__editorDebug())).count < 2) throw new Error('Drag did not paint blocks');
  const painted = (await page.evaluate(() => window.__editorDebug())).count;
  await page.locator('#undoButton').click();
  if ((await page.evaluate(() => window.__editorDebug())).count !== 0) throw new Error('Undo failed');
  await page.locator('#redoButton').click();
  if ((await page.evaluate(() => window.__editorDebug())).count !== painted) throw new Error('Redo failed');
  await page.locator('#themeButton').click();
  await page.reload();
  await page.waitForFunction(() => window.__editorDebug?.().mapLoaded);
  if ((await page.evaluate(() => window.__editorDebug())).count !== painted ||
      !await page.locator('html').evaluate(el => el.classList.contains('light')))
    throw new Error('Editor state or theme did not persist');
  await page.screenshot({ path: path.join(__dirname, 'docs/editor_painted_preview.png'), fullPage: true });
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.locator('#exportButton').click(),
  ]);
  const json = fs.readFileSync(await download.path(), 'utf8');
  const data = JSON.parse(json);
  if (data.format !== 'kaplan-grid-v1' || data.tiles.length !== painted)
    throw new Error('Exported JSON is invalid');
  await page.locator('#clearButton').click();
  if ((await page.evaluate(() => window.__editorDebug())).count !== 0) throw new Error('Clear failed');
  if (!await page.evaluate(json => window.editorReceiveMap(json), json) ||
      (await page.evaluate(() => window.__editorDebug())).count !== painted)
    throw new Error('Import failed');
  const width = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));

  const game = await browser.newPage({ viewport: { width: 390, height: 844 } });
  game.on('pageerror', error => errors.push(error.message));
  const gameUrl = pathToFileURL(path.join(__dirname, 'app/src/main/assets/index.html')).href + '?test';
  await game.goto(gameUrl);
  await game.waitForFunction(() => window.__siteSDebug?.().mapLoaded);
  if (!await game.evaluate(json => window.kaplanApplyMap(json), json)) throw new Error('Game rejected editor export');
  const gameState = await game.evaluate(() => window.__siteSDebug());
  if (gameState.mapEdits !== painted ||
      await game.evaluate(() => window.__siteSTest.isWalkable(1584, 1072)))
    throw new Error('Game did not apply edited collision');
  await game.locator('#startButton').click();
  await game.evaluate(() => window.__siteSTest.setPlayer(1539, 995));
  await game.screenshot({ path: path.join(__dirname, 'docs/game_edited_preview.png') });
  await game.locator('#originalMapButton').click();
  if ((await game.evaluate(() => window.__siteSDebug())).mapEdits !== 0) throw new Error('Original map restore failed');
  if (await game.evaluate(() => window.kaplanApplyMap('{}'))) throw new Error('Invalid map accepted');
  await browser.close();
  if (errors.length || width.content > width.viewport) throw new Error(JSON.stringify({ errors, width }));
  console.log('PASS: editor paint/drag, undo/redo, save, theme, export/import, game collision integration, mobile width, no JS errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
