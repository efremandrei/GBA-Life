const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();
 const cdp=await page.context().newCDPSession(page),state=()=>page.evaluate(()=>window.__siteSDebug());
 const send=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p});
 const worldOrigin=await page.evaluate(()=>{
  for(let y=1024;y<3500;y+=64)for(let x=1024;x<7000;x+=64){
   if([[0,0],[80,0],[-80,0],[0,80],[0,-80]].every(([dx,dy])=>window.__siteSTest.setPlayer(x+dx,y+dy))){window.__siteSTest.setPlayer(x,y);return {x,y};}
  }throw Error('No open test space');
 });
 async function point(dx,dy){return page.evaluate(({dx,dy})=>{const d=window.__siteSDebug(),c=document.querySelector('#game'),b=c.getBoundingClientRect(),z=d.interior!==null?d.roomZoom:d.worldZoom;
 const x=d.interior!==null?d.roomX-d.roomViewX:d.x-d.cameraX,y=d.interior!==null?d.roomY-14-d.roomViewY:d.y-14-d.cameraY;
 return {x:b.x+x*z/c.width*b.width+dx,y:b.y+y*z/c.height*b.height+dy,id:1};},{dx,dy});}
 async function origin(){await page.evaluate(o=>window.__siteSTest.setPlayer(o.x,o.y),worldOrigin);}
 async function check(direction,dx,dy,room=false){
  if(!room)await origin();
  const before=await state(),p=await point(dx,dy);await send('touchStart',[p]);await page.waitForTimeout(350);
  const moved=await state();assert.equal(moved.screenDirection,direction);assert.equal(moved.facing,direction);
  const delta=room?(dx?moved.roomX-before.roomX:moved.roomY-before.roomY):(dx?moved.x-before.x:moved.y-before.y);
  assert(delta*(dx||dy)>200,'No movement '+direction);
  await send('touchEnd',[]);const stopped=await state();await page.waitForTimeout(160);const later=await state();
  assert.equal(later.screenDirection,null);assert.equal(room?later.roomX:later.x,room?stopped.roomX:stopped.x);assert.equal(room?later.roomY:later.y,room?stopped.roomY:stopped.y);
 }
 for(const [d,x,y] of [['up',0,-80],['down',0,80],['left',-80,0],['right',80,0]])await check(d,x,y);
 await origin();await send('touchStart',[await point(0,-80)]);await page.waitForTimeout(180);await send('touchMove',[await point(80,0)]);await page.waitForTimeout(180);assert.equal((await state()).screenDirection,'right');await send('touchCancel',[]);assert.equal((await state()).screenDirection,null);
 // Pinch overrides an already active walking touch and suppresses the trailing finger.
 await origin();const a=await point(0,-80);await send('touchStart',[a]);await page.waitForTimeout(180);const b={x:a.x+60,y:a.y,id:2};await send('touchStart',[a,b]);const frozen=await state();
 await send('touchMove',[{...a,x:a.x-30},{...b,x:b.x+30}]);await page.waitForTimeout(180);const zoomed=await state();assert.equal(zoomed.worldZoom,2);assert.equal(zoomed.screenDirection,null);assert.equal(zoomed.x,frozen.x);assert.equal(zoomed.y,frozen.y);
 await send('touchEnd',[a]);await send('touchMove',[{...a,y:a.y+30}]);await page.waitForTimeout(160);assert.equal((await state()).y,frozen.y);await send('touchEnd',[]);
 await check('right',80,0); // Navigation uses the zoomed sprite's screen coordinates.
 await origin();const center=await point(0,0);await send('touchStart',[center]);await page.waitForTimeout(180);assert.equal((await state()).screenDirection,null);await send('touchEnd',[]);
 await page.evaluate(()=>window.__siteSTest.enterHouse(TOWN_DATA.home.houseId));await check('up',0,-80,true);
 // Modal UI stops navigation and does not restart it after dismissal.
 await send('touchStart',[await point(0,-80)]);await page.waitForTimeout(130);await page.locator('#mapButton').click();await page.waitForTimeout(140);assert.equal((await state()).screenDirection,null);await send('touchCancel',[]);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: four touch directions, drag steering, release/cancel, zoomed screen position, house movement, dead zone, modal pause, pinch takeover and trailing finger suppression.');
})().catch(e=>{console.error(e);process.exit(1)});
