const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 const p=await b.newPage({viewport:{width:800,height:400}});await p.goto(pathToFileURL(path.join(__dirname,'app/src/main/assets/index.html')).href+'?test');
 await p.evaluate(async()=>{
  const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
  const [app,editor,tile]=await Promise.all([load('tile_atlas.png'),load('../../../../editor/src/main/assets/tile_atlas.png'),load('../../../../art/tiles/path.png')]);
  const c=document.createElement('canvas');c.id='pathPreview';c.width=768;c.height=256;c.style.cssText='position:fixed;top:0;left:0;width:768px;height:256px;z-index:1000;image-rendering:pixelated';document.body.append(c);
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const pixels=(im,x)=>{const a=document.createElement('canvas');a.width=a.height=96;const d=a.getContext('2d');d.drawImage(im,x,0,96,96,0,0,96,96);return Array.from(d.getImageData(0,0,96,96).data);};
  const expected=pixels(tile,0);if(JSON.stringify(pixels(app,192))!==JSON.stringify(expected)||JSON.stringify(pixels(editor,192))!==JSON.stringify(expected))throw Error('Path atlas differs from source');
  for(let y=0;y<2;y++)for(let x=0;x<6;x++)ctx.drawImage(app,192,0,96,96,x*128,y*128,128,128);
 });
 await p.locator('#pathPreview').screenshot({path:'docs/borderless_path_v25.png'});await b.close();console.log('PASS: both app path atlas cells match borderless source; repeated paving preview rendered.');
})().catch(e=>{console.error(e);process.exit(1)});
