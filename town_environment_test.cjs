const {chromium}=require('playwright-core');const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await page.waitForFunction(()=>window.__siteSDebug?.().mapLoaded&&!window.__siteSDebug().splashVisible);await page.locator('#startButton').click();
 const report=await page.evaluate(()=>{
  const t=TOWN_DATA,C=t.width/32,roads=new Set(t.roadCells),byOrientation={horizontal:0,vertical:0};
  const valid=t.vehicles.every(v=>{byOrientation[v.orientation]++;const [x,y,w,h]=v.rect;const cell=Math.floor(y/32)*C+Math.floor(x/32);return roads.has(cell)&&cell===v.cell&&w<=32&&h<=32&&Math.floor(x/32)===Math.floor((x+w-1)/32)&&Math.floor(y/32)===Math.floor((y+h-1)/32)&&!__siteSTest.setPlayer(x+w/2,y+h/2);});
  const seen=new Set(),queue=[t.start];for(let i=0;i<queue.length;i++){const [x,y]=queue[i],key=`${x},${y}`;if(seen.has(key))continue;seen.add(key);for(const [a,b]of [[x-32,y],[x+32,y],[x,y-32],[x,y+32]])if(a>=0&&b>=0&&a<t.width&&b<t.height&&!seen.has(`${a},${b}`)&&__siteSTest.isWalkable(a,b))queue.push([a,b]);}
  const unreachable=[t.start,t.school,...t.markers.map(m=>m.point),...t.houses.map(h=>h.entry)].filter(p=>!seen.has(p.join(',')));
  return {highBuildings:t.houses.filter(h=>h.roof==='high_building').length,cars:t.vehicles.length,byOrientation,valid,unreachable};
 });
 assert.equal(report.highBuildings,80);assert.equal(report.cars,48);assert(report.valid);assert(report.byOrientation.horizontal>0&&report.byOrientation.vertical>0);assert.deepEqual(report.unreachable,[]);
 const high=await page.evaluate(()=>TOWN_DATA.houses.filter(h=>h.roof==='high_building').sort((a,b)=>Math.hypot(...a.entry.map((v,i)=>v-TOWN_DATA.start[i]))-Math.hypot(...b.entry.map((v,i)=>v-TOWN_DATA.start[i])))[0].entry);
 await page.evaluate(p=>__siteSTest.setPlayer(...p),high);await page.waitForTimeout(300);await page.waitForFunction(()=>__siteSDebug().mapLoaded);await page.screenshot({path:'docs/apartment_buildings_v17.png'});
 for(const direction of ['horizontal','vertical']){
  const spot=await page.evaluate(dir=>{for(const v of TOWN_DATA.vehicles.filter(v=>v.orientation===dir)){const [x,y]=v.rect;for(const p of [[Math.floor(x/32)*32+16+32,Math.floor(y/32)*32+16],[Math.floor(x/32)*32+16,Math.floor(y/32)*32+16+32]])if(__siteSTest.setPlayer(...p))return p;}},direction);
  assert(spot);await page.waitForTimeout(300);await page.waitForFunction(()=>__siteSDebug().mapLoaded);await page.screenshot({path:`docs/road_cars_${direction}_v17.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
