const {chromium}=require('playwright-core');const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();
 const results=await page.evaluate(()=>{
  const C=256,i=100*C+100,e=new Map([[i,'road'],[i-C,'road'],[i+1,'road']]);
  const corners=['road_corner_ne','road_corner_es','road_corner_sw','road_corner_wn'];
  const exported=MapGrid.serialize(new Map(corners.map((t,n)=>[i+n,t])),8192,4608);
  const roundtrip=MapGrid.parse(exported,8192,4608);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');
  MapGrid.drawTile(ctx,'road_horizontal',0,0);const horizontal=ctx.getImageData(0,0,32,32).data;
  MapGrid.drawTile(ctx,'road_vertical',0,0);const vertical=ctx.getImageData(0,0,32,32).data;
  const pixel=(data,x,y)=>[...data.slice((y*32+x)*4,(y*32+x)*4+3)].join(',');
  return {autoCorner:MapGrid.connectedType(e,i,C,new Set(),new Set()),autoTurnChanged:MapGrid.connectedType(new Map([[i,'road'],[i+1,'road'],[i+C,'road']]),i,C),explicitPreserved:MapGrid.connectedType(new Map([[i,'road_corner_ne']]),i,C),roundtrip:roundtrip.size,allWalkable:corners.every(t=>MapGrid.walkable.has(t)),horizontalOpen:pixel(horizontal,0,16)!==pixel(horizontal,0,0),verticalOpen:pixel(vertical,16,0)!==pixel(vertical,0,0),matchingAccess:TOWN_DATA.houses.every(h=>h.accessWidth===24),count:MapGrid.types.length};
 });
 assert.equal(results.autoCorner,'road_3');assert.equal(results.autoTurnChanged,'road_6');assert.equal(results.explicitPreserved,'road_corner_ne');assert.equal(results.roundtrip,4);assert.equal(results.count,55);for(const k of ['allWalkable','horizontalOpen','verticalOpen','matchingAccess'])assert(results[k],k);
 await page.evaluate(()=>{const a=TOWN_DATA.start;const h=TOWN_DATA.houses.reduce((best,h)=>Math.hypot(h.entry[0]-a[0],h.entry[1]-a[1])<Math.hypot(best.entry[0]-a[0],best.entry[1]-a[1])?h:best);window.__siteSTest.setPlayer(...h.entry);});await page.screenshot({path:'docs/preview_access_roads_v13.png'});
 await page.goto(pathToFileURL(path.join(__dirname,'editor/src/main/assets/editor.html')).href+'?test');await page.waitForFunction(()=>document.querySelectorAll('#palette button[data-tool]').length===57);assert.equal(await page.locator('[data-tool="road_corner_ne"]').count(),1);await page.locator('[data-tool="road_corner_ne"]').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/preview_road_palette_v1.5.0.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS',results);
})().catch(e=>{console.error(e);process.exit(1)});
