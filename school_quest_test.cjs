const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();
 const state=()=>page.evaluate(()=>window.__siteSDebug());
 assert.equal((await state()).schoolTime,'07:30');assert.equal((await state()).schoolQuest,'active');assert(await page.locator('#missionClock').isVisible());
 assert(await page.locator('#missionTime').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=40));
 const initial=await state();await page.waitForTimeout(5100);assert.equal((await state()).schoolTime,'07:31');
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(350);await page.keyboard.up('ArrowDown');const moved=await state();assert.notDeepEqual(moved.emily,initial.emily,'Emily did not follow');
 await page.locator('#mapButton').click();const paused=(await state()).daySeconds;await page.waitForTimeout(250);assert.equal((await state()).daySeconds,paused);await page.locator('#closeMapButton').click();
 await page.evaluate(()=>window.kaplanSave());const saved=await state();await page.reload();await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#continueButton').click();assert.equal((await state()).schoolQuest,'active');assert(Math.abs((await state()).daySeconds-saved.daySeconds)<1);
 await page.screenshot({path:'docs/school_clock_v26.png'});
 // Strict deadline: arriving after 08:00 cannot pass, and retry restores home/time.
 await page.evaluate(()=>window.__siteSTest.advanceDay(150-window.__siteSDebug().daySeconds));assert.equal((await state()).schoolQuest,'failed');assert.equal((await state()).schoolTime,'08:00');assert(await page.locator('#retrySchoolQuest').isVisible());
 await page.evaluate(()=>{window.__siteSTest.setPlayer(TOWN_DATA.school[0],TOWN_DATA.school[1]);window.kaplanAction();});assert.equal((await state()).schoolQuest,'failed');
 await page.locator('#retrySchoolQuest').click();assert.equal((await state()).schoolTime,'07:30');assert.equal((await state()).schoolQuest,'active');assert.equal((await state()).x,3856);
 // Deliver at the school entrance before the deadline.
 await page.evaluate(()=>{
  const school=TOWN_DATA.school;if(!window.__siteSTest.setPlayer(school[0],school[1]))throw Error('School entrance blocked');
  window.__siteSTest.advancePlayer(.001,'up');window.kaplanAction();
 });
 assert.equal((await state()).schoolQuest,'completed');assert(!(await page.locator('#missionClock').isVisible()));assert.equal((await state()).phase,'playing');
 await page.evaluate(()=>window.kaplanSave());await page.reload();await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#continueButton').click();assert.equal((await state()).schoolQuest,'completed');
 // Other characters retain their existing adventure, with no Emily mission UI.
 await page.locator('#menuButton').click();await page.locator('#restartButton').click();await page.locator('[data-character="maya"]').click();await page.locator('#startButton').click();assert(!(await page.locator('#missionClock').isVisible()));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 07:30 start, 5 real seconds/minute, large clock, Emily follow, map pause, save/resume, strict 08:00 failure/retry, delivery and completion persistence, other characters unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
