/* Detailed raster templates share Maya's art style; runtime palettes keep saved designs editable. */
(() => {
 const decoded=new Map();
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
 const tone=(color,factor)=>'#'+rgb(color).map(v=>Math.min(255,Math.max(0,Math.round(v*factor))).toString(16).padStart(2,'0')).join('');
 function frame(d,facing,pose){
  const key=`${d.wearBackpack?'bag':'plain'}:${d.hairStyle}:${facing}`;
  let t=decoded.get(key);if(!t){const raw=CHARACTER_TEMPLATES[key];t={rgba:bytes(raw.rgba),materials:bytes(raw.materials),medians:raw.medians};decoded.set(key,t);}
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;const ctx=canvas.getContext('2d');const pixels=new Uint8ClampedArray(t.rgba);
  const palette=[null,d.hair,d.shirt,d.pants,d.backpack,d.skin,d.eyes].map(c=>c?rgb(c):null);
  for(let i=0;i<t.materials.length;i++){
   const material=t.materials[i];if(!material)continue;
   const color=d.outfit==='skirt'&&material===3&&Math.floor(i/32)>=41?palette[5]:palette[material];
   const factor=Math.max(pixels[i*4],pixels[i*4+1],pixels[i*4+2])/t.medians[material];
   for(let k=0;k<3;k++)pixels[i*4+k]=Math.min(255,Math.round(color[k]*factor));
  }
  ctx.putImageData(new ImageData(pixels,32,48),0,0);
  if(pose<0)return canvas;
  const moving=document.createElement('canvas');moving.width=32;moving.height=48;const x=moving.getContext('2d');x.imageSmoothingEnabled=false;
  x.drawImage(canvas,0,0,32,35,0,0,32,35);
  const step=pose===0?1:-1;
  x.drawImage(canvas,0,35,16,13,-step,35+step,16,13);
  x.drawImage(canvas,16,35,16,13,16+step,35-step,16,13);
  return moving;
 }
 function details(x,d,facing){
  const back=facing==='up',side=facing==='left'||facing==='right';
  x.save();if(facing==='right'){x.translate(32,0);x.scale(-1,1);}
  const r=(a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(a,b,w,h);};
  const polygon=(points,color)=>{
   x.fillStyle=color;
   for(let y=Math.min(...points.map(p=>p[1]));y<Math.max(...points.map(p=>p[1]));y++){
    const crossings=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))crossings.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    crossings.sort((a,b)=>a-b);for(let i=0;i<crossings.length;i+=2){const left=Math.ceil(crossings[i]-.5),right=Math.ceil(crossings[i+1]-.5);x.fillRect(left,y,right-left,1);}
   }
  };
  const dark='#181b22';
  if(d.outfit==='skirt'){
   const left=side?9:8,right=side?22:24;
   polygon([[left+2,35],[right-2,35],[right,42],[left,42]],dark);
   polygon([[left+3,36],[right-3,36],[right-1,41],[left+1,41]],d.pants);
   r(left+2,38,2,3,tone(d.pants,1.18));r(right-4,37,2,4,tone(d.pants,.74));r(left+1,41,right-left-2,1,tone(d.pants,.62));
  }
  if(!back&&d.facialHair!=='none'){
   const light=tone(d.hair,1.25),shadow=tone(d.hair,.66);
   if(d.facialHair==='beard'){
    const outline=side?[[6,21],[9,22],[15,22],[17,20],[18,25],[15,28],[10,28],[7,25]]:[[8,20],[10,22],[22,22],[24,20],[24,25],[20,28],[12,28],[8,25]];
    polygon(outline,dark);
    polygon(side?[[7,22],[10,23],[15,23],[16,22],[16,25],[14,27],[10,27],[8,25]]:[[9,22],[12,23],[20,23],[23,22],[22,25],[19,27],[13,27],[10,25]],d.hair);
    r(side?10:12,26,side?4:8,1,shadow);r(side?8:10,23,2,2,light);r(side?7:13,22,side?4:6,1,tone(d.skin,.68));
   }else if(d.facialHair==='moustache'){
    r(side?7:12,21,side?6:8,2,shadow);r(side?8:13,21,side?3:6,1,d.hair);
   }else{
    for(const [a,b]of side?[[8,23],[10,24],[13,25],[15,23]]:[[10,23],[12,25],[15,26],[18,25],[21,23]])r(a,b,1,1,shadow);
   }
  }
  if(!back&&d.wearGlasses){
   const y=14;const lens=a=>{r(a,y,6,1,d.glasses);r(a,y+5,6,1,d.glasses);r(a,y+1,1,4,d.glasses);r(a+5,y+1,1,4,d.glasses);r(a+1,y+1,1,1,tone(d.glasses,1.4));};
   if(side){lens(7);r(13,y+2,5,1,d.glasses);}else{lens(8);lens(18);r(14,y+2,4,1,d.glasses);}
  }
  x.restore();
 }
 window.CharacterTemplates={frame,details};
})();
