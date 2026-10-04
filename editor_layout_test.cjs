const {chromium}=require('playwright-core');
const {pathToFileURL}=require('url');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const errors=[];
 for(const size of [{width:390,height:844},{width:360,height:740},{width:844,height:390},{width:1280,height:900}]){
  const page=await browser.newPage({viewport:size});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'editor/src/main/assets/editor.html')).href+'?test');
  await page.waitForFunction(()=>window.__editorDebug?.().mapLoaded);
  const measure=()=>page.evaluate(()=>{const c=document.querySelector('#mapCanvas'),b=c.getBoundingClientRect(),s=document.querySelector('#tileSidebar').getBoundingClientRect(),d=window.__editorDebug();return {width:b.width,height:b.height,left:b.left,top:b.top,right:b.right,sidebarLeft:s.left,sidebarHeight:s.height,centerX:d.viewX+c.width/(2*d.zoom),centerY:d.viewY+c.height/(2*d.zoom),pixelsX:c.width/b.width,pixelsY:c.height/b.height,count:d.count,zoom:d.zoom,overflow:document.documentElement.scrollWidth>innerWidth};});
  const before=await measure();
  if(before.height<350 || before.sidebarLeft<before.right || Math.abs(before.sidebarHeight-before.height)>12 || before.overflow)throw Error('Tall grid/sidebar mismatch '+JSON.stringify(before));
  if(size.width===390)await page.screenshot({path:'docs/editor_expanded_height_v1.10.0.png',fullPage:true});
  await page.locator('#tilesButton').click();
  await page.waitForFunction(()=>document.querySelector('#mapCanvas').width===Math.round(document.querySelector('#mapCanvas').getBoundingClientRect().width*2));
  const after=await measure();
  if(after.width<before.width+70 || Math.abs(after.height-before.height)>1 || Math.abs(after.centerX-before.centerX)>1 || Math.abs(after.centerY-before.centerY)>1 || Math.abs(after.pixelsX-after.pixelsY)>.02 || after.zoom!==before.zoom || after.overflow)throw Error('Expansion distorted or moved map '+JSON.stringify({before,after}));
  if(await page.locator('#tileSidebar').isVisible())throw Error('Tiles stayed visible');
  await page.locator('#mapCanvas').click({position:{x:after.width*.58,y:after.height*.88}});
  if((await measure()).count<=after.count)throw Error('Cannot paint lower expanded map');
  await page.locator('#undoButton').click();
  if((await measure()).count!==after.count)throw Error('Undo after expanded paint failed');
  await page.locator('#overviewButton').click();
  if(!await page.locator('#navigator').isVisible())throw Error('Overview unavailable');
  await page.locator('#navigator').click({position:{x:20,y:20}});
  await page.locator('#overviewButton').click();
  if(size.width===390)await page.screenshot({path:'docs/editor_tiles_minimized_v1.10.0.png',fullPage:true});
  await page.reload();await page.waitForFunction(()=>window.__editorDebug?.().mapLoaded);
  if(await page.locator('#tileSidebar').isVisible())throw Error('Minimize preference lost');
  await page.locator('#tilesButton').click();
  if(!await page.locator('#tileSidebar').isVisible())throw Error('Show tiles failed');
  await page.setViewportSize({width:size.height,height:size.width});
  await page.waitForTimeout(100);
  const rotated=await measure();if(rotated.overflow||Math.abs(rotated.pixelsX-rotated.pixelsY)>.02)throw Error('Resize distortion');
  await page.close();
 }
 await browser.close();if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: four viewport sizes, tall canvas, full-width collapse, preserved center/zoom, lower-map painting/undo, optional navigator, preference persistence, rotation, no distortion/overflow/JS errors.');
})().catch(e=>{console.error(e);process.exitCode=1;});

