const {chromium}=require('playwright-core');const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');await p.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await p.locator('#startButton').click();
 const report=await p.evaluate(()=>{
  const C=256,i=100*C+100,base=new Set([i]);const cornerMasks=[[i-C,i+1,3],[i+1,i+C,6],[i+C,i-1,12],[i-1,i-C,9]];
  const corners=cornerMasks.map(([a,b,mask])=>MapGrid.connectedType(new Map([[i,'sidewalk'],[a,'sidewalk'],[b,'sidewalk']]),i,C,new Set(),new Set(),new Set())===`sidewalk_${mask}`);
  const neighbours=new Map([[i+1,'sidewalk']]);const added=MapGrid.connectedType(neighbours,i,C,new Set(),new Set(),base);
  const removed=MapGrid.connectedType(new Map([[i+1,'grass']]),i,C,new Set(),new Set(),new Set([i,i+1]));
  const variants=MapGrid.types.filter(t=>t.startsWith('sidewalk_'));
  const parsed=MapGrid.parse(MapGrid.serialize(new Map(variants.map((t,n)=>[i+n,t])),8192,4608),8192,4608);
  const roadAdjacent=MapGrid.connectedType(new Map([[i,'sidewalk'],[i+1,'road'],[i+C,'sidewalk']]),i,C);
  const plazaJoin=MapGrid.connectedType(new Map([[i,'sidewalk']]),i,C,new Set(),new Set(),new Set(),new Set([i+1]));
  return {corners,added,removed,roadAdjacent,plazaJoin,variants:variants.length,parsed:parsed.size,walkable:variants.every(t=>MapGrid.walkable.has(t)),types:MapGrid.types.length,baseSidewalks:TOWN_DATA.sidewalkCells.length};
 });
 assert(report.corners.every(Boolean));assert.equal(report.added,'sidewalk_2');assert.equal(report.removed,'sidewalk_0');assert.equal(report.roadAdjacent,'sidewalk_4');assert.equal(report.plazaJoin,'sidewalk_2');assert.equal(report.variants,11);assert.equal(report.parsed,11);assert(report.walkable);assert.equal(report.types,55);assert(report.baseSidewalks>100);
 await p.evaluate(()=>{const a=TOWN_DATA.start;const h=TOWN_DATA.houses.reduce((best,h)=>Math.hypot(h.entry[0]-a[0],h.entry[1]-a[1])<Math.hypot(best.entry[0]-a[0],best.entry[1]-a[1])?h:best);window.__siteSTest.setPlayer(...h.entry);});await p.screenshot({path:'docs/preview_sidewalks_v14.png'});
 await p.goto(pathToFileURL(path.join(__dirname,'editor/src/main/assets/editor.html')).href+'?test');await p.locator('[data-tool="sidewalk_corner_ne"]').scrollIntoViewIfNeeded();await p.screenshot({path:'docs/preview_sidewalk_palette_v1.6.0.png'});assert.equal(await p.locator('[data-tool="sidewalk_cross"]').count(),1);
 assert.deepEqual(errors,[]);await b.close();console.log('PASS',report);
})().catch(e=>{console.error(e);process.exit(1)});
