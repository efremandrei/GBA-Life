const {chromium}=require('playwright-core'),{pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 for(const asset of ['app','editor']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(pathToFileURL(path.join(__dirname,asset,'src/main/assets',asset==='app'?'index.html':'editor.html')).href+'?test');
  await page.evaluate(()=>new Promise(resolve=>MapGrid.whenArtReady(resolve)));
  const result=await page.evaluate(()=>{
   const cols=256,i=100*cols+100;
   const e=new Map();for(let y=0;y<10;y++)for(let x=0;x<2;x++)e.set(i+y*cols+x,'road');
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=320;const ctx=canvas.getContext('2d');
   for(let y=0;y<10;y++)for(let x=0;x<2;x++)MapGrid.drawTile(ctx,MapGrid.connectedType(e,i+y*cols+x,cols),x*32,y*32);
   // Explicit directional tiles must also heal their joined inner corners.
   const explicit=new Map();for(let y=0;y<10;y++)for(let x=0;x<2;x++)
     explicit.set(i+y*cols+x,y===0?(x?'road_corner_sw':'road_corner_es'):y===9?(x?'road_corner_wn':'road_corner_ne'):(x?'road_t_w':'road_t_e'));
   let explicitBad=0;
   for(let y=0;y<10;y++)for(let x=0;x<2;x++)MapGrid.drawTile(ctx,MapGrid.connectedType(explicit,i+y*cols+x,cols),x*32,y*32);
   const explicitData=ctx.getImageData(0,0,64,320).data;
   for(let y=5;y<315;y++)for(let x=5;x<59;x++){const p=(y*64+x)*4,c=[...explicitData.slice(p,p+3)].join(',');if(!['175,184,181','185,193,190'].includes(c))explicitBad++;}
   for(let y=0;y<10;y++)for(let x=0;x<2;x++)MapGrid.drawTile(ctx,MapGrid.connectedType(e,i+y*cols+x,cols),x*32,y*32);
   const data=ctx.getImageData(0,0,64,320).data;let bad=0;
   for(let y=5;y<315;y++)for(let x=5;x<59;x++){const p=(y*64+x)*4,c=[...data.slice(p,p+3)].join(',');if(!['175,184,181','185,193,190'].includes(c))bad++;}
   const base=new Set(e.keys()),diag=i+cols+1;
   const before=MapGrid.connectedType(new Map([[diag,'grass']]),i,cols,base);
   const painted=MapGrid.connectedType(e,i,cols);
   const roundtrip=MapGrid.parse(MapGrid.serialize(e,8192,4608),8192,4608);
   return {bad,explicitBad,before,painted,count:roundtrip.size,allRoads:[...roundtrip.values()].every(t=>t==='road'),image:canvas.toDataURL()};
  });
  assert.equal(result.bad,0,asset+' road has interior squares');assert.equal(result.explicitBad,0,asset+' explicit road has interior squares');assert.equal(result.painted,'road_38');assert.equal(result.before,'road_6');assert.equal(result.count,20);assert(result.allRoads);
  if(asset==='editor'){
   await page.evaluate(image=>{document.body.innerHTML='<img id="proof" style="height:640px;image-rendering:pixelated" src="'+image+'">';},result.image);
   await page.screenshot({path:'docs/continuous_road_v20.png'});
  }
  await page.close();
 }
 await browser.close();console.log('PASS: both runtime road atlases render uninterrupted wide roads, diagonal edits update base corners, map exports remain compatible.');
})().catch(e=>{console.error(e);process.exit(1)});
