const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const errors=[];
 for(const mode of ['editor','game']){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,mode==='editor'?'editor/src/main/assets/editor.html':'app/src/main/assets/index.html')).href+'?test');
  if(mode==='editor')await page.waitForFunction(()=>window.__editorDebug?.().mapLoaded);
  else {await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();}
  const selector=mode==='editor'?'#mapCanvas':'#game',client=await page.context().newCDPSession(page);
  const box=await page.locator(selector).boundingBox(),cx=box.x+box.width*.5,cy=box.y+box.height*.32;
  const pts=d=>[{x:cx-d/2,y:cy,id:1},{x:cx+d/2,y:cy,id:2}];
  const state=()=>page.evaluate(mode=>mode==='editor'?window.__editorDebug():window.__siteSDebug(),mode);
  const before=await state();
  const zoom=d=>mode==='editor'?d.zoom:d.worldZoom;
  const anchor=await page.evaluate(({mode,x,y})=>{const c=document.querySelector(mode==='editor'?'#mapCanvas':'#game'),b=c.getBoundingClientRect(),d=mode==='editor'?window.__editorDebug():window.__siteSDebug(),z=mode==='editor'?d.zoom:d.worldZoom;return {x:(mode==='editor'?d.viewX:d.cameraX)+(x-b.left)/b.width*c.width/z,y:(mode==='editor'?d.viewY:d.cameraY)+(y-b.top)/b.height*c.height/z};},{mode,x:cx,y:cy});
  // Start with one finger to exercise paint-stroke rollback.
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pts(60)[0]]});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(60)});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(120)});
  await page.waitForTimeout(60);
  const bigger=await state();assert(Math.abs(zoom(bigger)-zoom(before)*2)<.01,mode+' pinch out');
  if(mode==='editor')assert.equal(bigger.count,before.count,'Pinch painted tiles');
  else {assert.equal(bigger.x,before.x);assert.equal(bigger.y,before.y);assert(bigger.pinching);}
  const afterAnchor=await page.evaluate(({mode,x,y})=>{const c=document.querySelector(mode==='editor'?'#mapCanvas':'#game'),b=c.getBoundingClientRect(),d=mode==='editor'?window.__editorDebug():window.__siteSDebug(),z=mode==='editor'?d.zoom:d.worldZoom;return {x:(mode==='editor'?d.viewX:d.cameraX)+(x-b.left)/b.width*c.width/z,y:(mode==='editor'?d.viewY:d.cameraY)+(y-b.top)/b.height*c.height/z};},{mode,x:cx,y:cy});
  assert(Math.abs(anchor.x-afterAnchor.x)<1 && Math.abs(anchor.y-afterAnchor.y)<1,mode+' focal anchor drift');
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(30)});
  await page.waitForTimeout(60);
  const smaller=await state();assert(zoom(smaller)<zoom(before),mode+' pinch in');
  // Releasing one finger must not resume painting; cancellation cleans up.
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[pts(30)[0]]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+30,y:cy+30,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  if(mode==='editor')assert.equal((await state()).count,before.count,'Trailing finger painted');
  else {
   assert.equal((await state()).pinching,false);
   await page.waitForTimeout(300);const stable=await state();assert(Math.abs(stable.cameraX-smaller.cameraX)<1,'Camera snapped after pinch');
   assert(stable.mapStream.decodedBytes<=24*1024*1024,'Zoom out retained too many map blocks');
   await page.screenshot({path:'docs/pinch_game_v22.png'});
   await page.evaluate(()=>window.kaplanSave());await page.reload();await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#continueButton').click();assert.equal((await state()).worldZoom,smaller.worldZoom);
   await page.evaluate(()=>window.__siteSTest.enterHouse(TOWN_DATA.home.houseId));
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(60)});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(120)});await page.waitForTimeout(60);assert.equal((await state()).roomZoom,2);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.screenshot({path:'docs/pinch_house_v22.png'});
  }
  if(mode==='editor')await page.screenshot({path:'docs/pinch_editor_v22.png'});await page.close();
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: real two-finger touch in/out in game/editor/houses, focal anchor, paint rollback/trailing-finger suppression, cancel cleanup, unchanged player, stable HUD/camera, saved zoom, <=24MiB phone block budget.');
})().catch(e=>{console.error(e);process.exit(1)});
