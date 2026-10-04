const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#startButton').click();
 const home=await page.evaluate(()=>({home:TOWN_DATA.home,start:TOWN_DATA.start,player:window.__siteSDebug()}));
 assert.deepEqual(home.start,home.home.entry);assert.equal(home.home.address,'Hen 14');assert.equal(home.player.x,home.start[0]);assert.equal(home.player.y,home.start[1]);
 await page.waitForTimeout(500);await page.screenshot({path:'docs/hen14_start_v21.png'});
 const rooms=await page.evaluate(()=>{
  const failures=[];const kinds=new Set();
  for(const [w,h] of [[320,560],[390,740],[520,900],[960,640]]){
   const r=HouseRooms.layout(w,h);
   for(let id=0;id<TOWN_DATA.houses.length;id++){
    const items=HouseRooms.objects({id},r);items.forEach(i=>kinds.add(i.kind));
    const sx=r.exitX,sy=r.exitY-50;
    if(!HouseRooms.canStand(sx,sy,r,items)){failures.push({w,h,id,spawn:true});continue;}
    const visited=new Set(),q=[[sx,sy]],reachable=new Set();
    for(let n=0;n<q.length;n++){
     const [x,y]=q[n],key=x+','+y;if(visited.has(key))continue;visited.add(key);
     const nearest=HouseRooms.nearest(x,y,r,items);if(nearest.distance<=58)reachable.add(nearest.item.kind);
     for(const [a,b] of [[x-8,y],[x+8,y],[x,y-8],[x,y+8]])if(!visited.has(a+','+b)&&HouseRooms.canStand(a,b,r,items))q.push([a,b]);
    }
    const missing=items.filter(i=>!reachable.has(i.kind)).map(i=>i.kind);
    if(missing.length||!reachable.has('exit'))failures.push({w,h,id,missing,exit:reachable.has('exit')});
   }
  }
  return {failures,kinds:[...kinds]};
 });
 assert.deepEqual(rooms.failures,[]);for(const k of ['sofa','kitchen','tv','wardrobe','bed','bookshelf','chest'])assert(rooms.kinds.includes(k));
 await page.evaluate(()=>window.__siteSTest.enterHouse(TOWN_DATA.home.houseId));
 await page.screenshot({path:'docs/furnished_home_v21.png'});
 const items=await page.evaluate(()=>window.__siteSTest.roomObjects());
 const sofa=items.find(i=>i.kind==='sofa');await page.evaluate(({x,y,w})=>{window.__siteSTest.setBuddy(10,1);window.__siteSTest.setRoomPlayer(x+(x<195?1:-1)*(w/2+10),y);},sofa);
 await page.locator('#actionButton').click();assert.equal((await page.evaluate(()=>window.__siteSDebug())).hp,13);
 await page.evaluate(()=>window.kaplanSave());await page.reload();await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#continueButton').click();
 assert.equal((await page.evaluate(()=>window.__siteSDebug())).interior,home.home.houseId);assert.equal((await page.evaluate(()=>window.__siteSDebug())).hp,13);
 // An old save on a newly occupied furniture spot moves to the clear entrance.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kaplan-quest-save-v2'));const r=HouseRooms.layout(document.querySelector('#game').width,document.querySelector('#game').height);const i=HouseRooms.objects(s.interior,r)[0];s.interior.x=i.x;s.interior.y=i.y;localStorage.setItem('kaplan-quest-save-v2',JSON.stringify(s));});
 await page.reload();await page.waitForFunction(()=>window.__siteSDebug?.().splashVisible===false);await page.locator('#continueButton').click();
 assert(await page.evaluate(()=>{const d=window.__siteSDebug(),r=HouseRooms.layout(document.querySelector('#game').width,document.querySelector('#game').height);return HouseRooms.canStand(d.roomX,d.roomY,r,HouseRooms.objects({id:d.interior},r));}));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: Hen 14 new-game entry, all 388 interiors at four sizes reachable, detailed furnishings, sofa recovery, resume and old furniture-position repair.');
})().catch(e=>{console.error(e);process.exit(1)});
