const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();
 const state=()=>page.evaluate(()=>window.__siteSDebug()),ready=()=>page.waitForFunction(()=>window.__siteSDebug().localMap.ready);
 await page.locator('#mapButton').click();await ready();const start=await state();
 assert.equal(start.localMap.col,Math.floor(start.x/1024));assert.equal(start.localMap.row,Math.floor(start.y/1024));
 assert.equal(start.localMap.loadedImages,1);assert.equal(start.localMap.decodedBytes,4*1024*1024);
 await page.screenshot({path:'docs/local_map_v24.png'});
 const button=d=>page.locator('[data-map-direction="'+d+'"]');
 await page.keyboard.press('ArrowRight');await ready();assert.equal((await state()).localMap.col,start.localMap.col+1);
 await page.locator('#localMapButton').click();await ready();assert.equal((await state()).localMap.col,start.localMap.col);
 while(!(await button('left').isDisabled()))await button('left').click();
 while(!(await button('up').isDisabled()))await button('up').click();await ready();
 const visited=new Set();
 for(let row=0;row<5;row++){
  const direction=row%2?'left':'right';
  for(let col=0;col<8;col++){
   await ready();const d=await state();visited.add(d.localMap.col+'_'+d.localMap.row);
   assert.equal(d.localMap.row,row);assert.equal(d.localMap.loadedImages,1);assert(d.localMap.decodedBytes<=4*1024*1024);
   const ratio=await page.locator('#overviewMap').evaluate(c=>c.width/c.height);assert.equal(ratio,row===4?2:1);
   if(col<7)await button(direction).click();
  }
  if(row<4)await button('down').click();
 }
 assert.equal(visited.size,40);assert(await button('down').isDisabled());assert(await button('right').isDisabled());
 const frozen=await state();assert.equal(frozen.x,start.x);assert.equal(frozen.y,start.y);
 await page.locator('#closeMapButton').click();assert.equal((await state()).localMap.loadedImages,0);
 await page.locator('#mapButton').click();await ready();assert.equal((await state()).localMap.col,start.localMap.col);assert.equal((await state()).localMap.row,start.localMap.row);
 await page.locator('#closeMapButton').click();await page.evaluate(()=>window.__siteSTest.enterHouse(TOWN_DATA.home.houseId));await page.locator('#mapButton').click();await ready();assert.equal((await state()).localMap.col,start.localMap.col);
 await page.setViewportSize({width:360,height:640});assert(await page.evaluate(()=>document.querySelector('.map-card').scrollWidth<=document.querySelector('.map-card').clientWidth));
 assert(!requests.some(u=>/town_map\.png/.test(u)));assert.deepEqual(errors,[]);await browser.close();console.log('PASS: player local chunk on open/reopen/indoors; all 40 chunks via arrows; keyboard/Here; bounded edges; undistorted partial bottom row; 1 local image <=4MiB released on close; no player movement/full-city request/overflow/JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
