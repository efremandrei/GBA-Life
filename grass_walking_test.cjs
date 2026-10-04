const {chromium}=require('playwright-core');const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');await page.waitForFunction(()=>window.__siteSDebug?.().mapLoaded&&!window.__siteSDebug().splashVisible);await page.locator('#startButton').click();
 const report=await page.evaluate(()=>{
  const t=TOWN_DATA,C=t.width/32,bits=Uint8Array.from(atob(t.grassBits),s=>s.charCodeAt(0)),has=i=>bits[i>>3]&(1<<(i&7));
  const grassIndices=Array.from({length:C*t.height/32},(_,i)=>i).filter(has);
  const near=(a,b)=>Math.hypot((a%C-b%C)*32,(Math.floor(a/C)-Math.floor(b/C))*32);
  grassIndices.sort((a,b)=>near(a,Math.floor(t.start[1]/32)*C+Math.floor(t.start[0]/32))-near(b,Math.floor(t.start[1]/32)*C+Math.floor(t.start[0]/32)));
  const grass=grassIndices.find(i=>i%C<C-5&&[0,1,2,3,4].every(d=>has(i+d)));
  const roads=new Set(t.roadCells);const road=t.roadCells.find(i=>i%C<C-5&&[0,1,2,3,4].every(d=>roads.has(i+d)&&__siteSTest.isWalkable((i+d)%C*32+16,Math.floor(i/C)*32+16)));
  function measure(i){const x=i%C*32+16,y=Math.floor(i/C)*32+16;if(!__siteSTest.setPlayer(x,y))throw Error('Cannot stand at selected terrain');const initial=__siteSDebug();for(let n=0;n<10;n++)__siteSTest.advancePlayer(.05,'right');const end=__siteSDebug();return {distance:end.x-initial.x,ground:initial.ground,speed:initial.movementSpeed,pose:end.walkFrame};}
  const roadWalk=measure(road),grassWalk=measure(grass);
  const obstaclePlacements=t.placements.filter(p=>['house','house_blue','house_teal','high_building','school','tree','shrub','car'].includes(p.kind));const unexpectedOpen=obstaclePlacements.filter(p=>__siteSTest.setPlayer(p.rect[0]+p.rect[2]/2,p.rect[1]+p.rect[3]/2));const blocked=unexpectedOpen.length===0;
  const carBlocked=t.vehicles.every(v=>!__siteSTest.setPlayer(v.rect[0]+v.rect[2]/2,v.rect[1]+v.rect[3]/2));
  __siteSTest.setPlayer(grass%C*32+16,Math.floor(grass/C)*32+16);
  return {roadWalk,grassWalk,blocked,unexpectedOpen,carBlocked,grassCells:grassIndices.length,paintedGrassWalkable:MapGrid.walkable.has('grass')};
 });
 assert(report.blocked&&report.carBlocked&&report.paintedGrassWalkable);assert.equal(report.grassWalk.ground,'grass');assert.equal(report.roadWalk.ground,'paving');assert(report.grassWalk.distance>0&&report.grassWalk.distance/report.roadWalk.distance>.58&&report.grassWalk.distance/report.roadWalk.distance<.62);assert.equal(report.grassWalk.speed,99);assert.equal(report.roadWalk.speed,165);assert.notEqual(report.grassWalk.pose,null);
 await page.waitForTimeout(250);await page.waitForFunction(()=>__siteSDebug().mapLoaded);await page.screenshot({path:'docs/grass_walking_v18.png'});
 await page.reload();await page.waitForFunction(()=>__siteSDebug?.().mapLoaded&&!__siteSDebug().splashVisible);await page.locator('#continueButton').click();assert.equal((await page.evaluate(()=>__siteSDebug())).ground,'grass');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
