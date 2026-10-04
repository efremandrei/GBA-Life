const {chromium}=require('playwright-core');
const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const requests=[],errors=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await page.waitForFunction(()=>window.__siteSDebug?.().mapLoaded&&!window.__siteSDebug().splashVisible);
 await page.locator('#startButton').click();
 const initial=await page.evaluate(()=>window.__siteSDebug());
 const points=await page.evaluate(()=>window.TOWN_DATA.houses.map(h=>h.entry));
 let maximum=0;
 for(const point of [points[0],points[50],points[100],points[150],points[200],[3920,2416]]){
   assert(await page.evaluate(p=>window.__siteSTest.setPlayer(...p),point));
   await page.waitForFunction(()=>window.__siteSDebug().mapLoaded);
   await page.waitForTimeout(100);
   const state=await page.evaluate(()=>window.__siteSDebug());
   assert(state.mapStream.keys.includes(`${Math.floor(point[0]/1024)}_${Math.floor(point[1]/1024)}`),'player block must load after travel');
   maximum=Math.max(maximum,state.mapStream.decodedBytes);
   assert(state.mapStream.keys.length<=4);assert(state.mapStream.decodedBytes<=16*1024*1024);
   assert.equal(state.peopleSeed,initial.peopleSeed);
 }
 const before=await page.evaluate(()=>window.__siteSDebug().mapStream.requests);
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__siteSDebug().mapStream.requests),before,'stationary frames must not reload blocks');
 assert(!requests.some(url=>url.endsWith('/petah_tikva_town_map.png')));
 assert.equal(errors.length,0,errors.join('\n'));
 // A missing block should retry locally rather than permanently lock startup.
 const recovery=await browser.newPage({viewport:{width:390,height:844}});
 let failed=false;
 await recovery.route('**/town_blocks/*.png',async route=>{
   if(!failed){failed=true;await route.abort();}else await route.continue();
 });
 await recovery.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await recovery.waitForFunction(()=>window.__siteSDebug?.().mapStream.errors.length>0);
 await recovery.waitForFunction(()=>window.__siteSDebug().mapLoaded,{},{timeout:12000});
 assert(failed);await recovery.close();
 await page.screenshot({path:'docs/map_streaming_v16.png'});
 console.log(JSON.stringify({maximumDecodedMapBytes:maximum,initial:initial.mapStream,final:await page.evaluate(()=>window.__siteSDebug().mapStream),fullMapRequests:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
