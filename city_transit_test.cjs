const {chromium}=require('playwright-core');const {pathToFileURL}=require('url');const path=require('path');const assert=require('assert');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});try{
 const p=await browser.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');await p.waitForFunction(()=>__siteSDebug?.().mapLoaded&&!__siteSDebug().splashVisible);await p.locator('#startButton').click();
 const report=await p.evaluate(()=>{
  const t=TOWN_DATA,service=new TramService(t.rail),stops=service.stops;
  const correct=stops.every(s=>{const a=service.state(s.arrival+1),b=service.state(s.arrival+181),departed=service.state(s.arrival+11);return a.station===s.name&&b.station===s.name&&Math.hypot(a.x-s.point[0],a.y-s.point[1])<.001&&a.x===b.x&&a.y===b.y&&departed.station!==s.name&&service.nextArrival(s.name,s.arrival+1)===0;});
  const sample=service.state(stops[0].arrival/2),later=service.state(stops[0].arrival/2+1);
  const sourceNames=new Map(t.roadGrid.map(r=>[r.id,r.name]));
  const signs=t.streetSigns.every(s=>sourceNames.get(s.osmId)===s.name);
  const orthogonal=t.rail.path.every((p,i)=>!i||p[0]===t.rail.path[i-1][0]||p[1]===t.rail.path[i-1][1]);
  const open=t.rail.path.every(([x,y])=>__siteSTest.isWalkable(x,y));
  return {houses:t.houses.length,apartments:t.houses.filter(h=>h.roof==='high_building').length,landmarks:t.landmarks.length,signCount:t.streetSigns.length,stations:stops.map(s=>s.name),correct,signs,orthogonal,open,moving:Math.hypot(later.x-sample.x,later.y-sample.y)>0,stop:stops[2]};
 });
 assert(report.houses>=380);assert(report.apartments>80);assert(report.landmarks>=10);assert(report.signCount>=100);for(const k of ['correct','signs','orthogonal','open','moving'])assert(report[k],k);
 await p.evaluate(s=>{__siteSTest.setPlayer(s.point[0],s.point[1]+32);__siteSTest.setCityTime(s.arrival+2)},report.stop);
 await p.waitForTimeout(250);await p.waitForFunction(()=>__siteSDebug().mapLoaded);await p.screenshot({path:'docs/tram_station_v19.png'});
 await p.evaluate(()=>__siteSTest.advancePlayer(.05,'right'));await p.locator('#menuButton').click();await p.locator('#exitButton').click();const saved=await p.evaluate(()=>__siteSDebug().cityTime);
 await p.reload();await p.waitForFunction(()=>__siteSDebug?.().mapLoaded&&!__siteSDebug().splashVisible);await p.locator('#continueButton').click();assert(Math.abs((await p.evaluate(()=>__siteSDebug().cityTime))-saved)<2);
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
