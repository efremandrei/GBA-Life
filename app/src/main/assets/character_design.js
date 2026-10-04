/* Character designs are data, so new presets can be added without changing the renderer. */
(() => {
  const key = 'kaplan-character-library-v1';
  const base = {name:'Andrei',skin:'#edac80',shirt:'#326ac4',pants:'#315c7c',backpack:'#ce292e',hair:'#49392a',eyes:'#513c28',glasses:'#202630',hairStyle:'short',facialHair:'beard',outfit:'trousers',wearGlasses:false,wearBackpack:true,headphones:'none',headphoneColor:'#34465d'};
  const presets = {
    andrei:{...base,original:true},
    lihi:{...base,name:'Lihi',hair:'#65412e',hairStyle:'shoulder',facialHair:'none',wearGlasses:true,shirt:'#65a596',backpack:'#b64e65'},
    thomas:{...base,name:'Thomas',hair:'#242124',eyes:'#68432b',facialHair:'none',shirt:'#e4ad43',backpack:'#38734c'},
    emily:{...base,name:'Emily',hair:'#e9bd57',hairStyle:'long',facialHair:'none',wearGlasses:true,glasses:'#ec81ba',eyes:'#508dc7',outfit:'skirt',pants:'#ea82b4',shirt:'#f1c2d9',backpack:'#9466ad'},
    maya:{...base,name:'Maya',hairStyle:'curly',facialHair:'none',shirt:'#389b93',backpack:'#dd725d',original:true},
    amir:{...base,name:'Amir',skin:'#b47d56',facialHair:'none',shirt:'#e5be43',backpack:'#408353',original:true},
    dana:{...base,name:'Dana',hair:'#a34e31',hairStyle:'bob',facialHair:'none',shirt:'#8054a2',backpack:'#356cbe',original:true},
    noa:{...base,name:'Noa',skin:'#bc815c',hairStyle:'ponytail',facialHair:'none',shirt:'#db7847',backpack:'#3a6f94'},
    eli:{...base,name:'Eli',skin:'#87533e',hairStyle:'curly',hair:'#282426',facialHair:'moustache',shirt:'#94ae52',backpack:'#985a3d'},
    yael:{...base,name:'Yael',hair:'#b4763f',hairStyle:'bob',facialHair:'none',wearGlasses:true,shirt:'#9b7ba9',backpack:'#e1a753'}
  };
  const enums = {hairStyle:['short','bob','shoulder','long','curly','ponytail','bald'],facialHair:['none','stubble','moustache','beard'],outfit:['trousers','skirt'],headphones:['none','over-ear','on-ear','wired-earbuds','wireless-earbuds','neckband','bone-conduction','gaming-headset']};
  const colors = ['skin','shirt','pants','backpack','hair','eyes','glasses','headphoneColor'];
  function clean(input) {
    const d = {...base,name:String(input?.name || 'New character').trim().slice(0,30)};
    for (const k of colors) if (/^#[0-9a-f]{6}$/i.test(input?.[k])) d[k]=input[k];
    for (const [k,choices] of Object.entries(enums)) if(choices.includes(input?.[k])) d[k]=input[k];
    for (const k of ['wearGlasses','wearBackpack','original']) d[k]=input?.[k]===true;
    return d;
  }
  let library = structuredClone(presets);
  try { const saved=JSON.parse(localStorage.getItem(key)||'null'); if(saved && typeof saved==='object') for(const [id,d] of Object.entries(saved)) if(/^[a-z0-9_-]{1,80}$/.test(id)) library[id]=clean(d); } catch (_) {}
  const cache = new Map();
  function sprite(d,facing='down',pose=-1) {
    const hash=JSON.stringify([d,facing,pose]); if(cache.has(hash))return cache.get(hash);
    const c=document.createElement('canvas');c.width=32;c.height=48;const x=c.getContext('2d');
    const template=CharacterTemplates.frame(d,facing,pose);
    x.drawImage(template,0,0);
    CharacterTemplates.details(x,d,facing);
    x.save();x.translate(0,2);if(facing==='right'){x.translate(32,0);x.scale(-1,1);}drawHeadphones(x,d,facing);x.restore();
    if(cache.size>1400)cache.clear(); cache.set(hash,c);return c;
  }
  function drawHeadphones(ctx,d,facing) {
    const type=d.headphones || 'none'; if(type==='none')return;
    const color=d.headphoneColor || '#34465d', dark='#202630', light='#b5ccdb';
    const side=facing==='left'||facing==='right', back=facing==='up';
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    // The side view is mirrored by sprite(); overlays on original art mirror here.
    if(['over-ear','on-ear','gaming-headset'].includes(type)) {
      r(6,1,20,2,dark);r(8,0,16,2,color);r(5,3,2,10,color);r(25,3,2,10,color);
      const size=type==='on-ear'?4:6;
      r(side?21:3,11,size,8,dark);r(side?22:4,12,size-2,6,color);
      if(!side){r(25,11,size,8,dark);r(26,12,size-2,6,color);}
      r(side?22:4,12,1,4,light);
      if(type==='gaming-headset' && !back){r(side?15:23,19,side?9:5,2,dark);r(side?14:21,20,3,2,color);}
    } else if(type==='neckband') {
      r(8,24,16,2,dark);r(9,24,14,1,color);r(side?22:6,14,2,12,color);
      if(!side)r(24,14,2,12,color);r(side?22:5,13,3,3,light);if(!side)r(24,13,3,3,light);
    } else if(type==='bone-conduction') {
      r(side?21:4,10,3,3,color);r(side?23:4,13,2,7,dark);
      if(!side){r(25,10,3,3,color);r(26,13,2,7,dark);}if(back)r(5,19,22,2,color);
    } else {
      r(side?22:4,13,3,4,dark);r(side?23:5,13,2,3,color);
      if(!side){r(25,13,3,4,dark);r(25,13,2,3,color);}
      if(type==='wireless-earbuds'){r(side?23:5,16,1,3,color);if(!side)r(26,16,1,3,color);}
      if(type==='wired-earbuds'){r(side?23:5,16,1,8,color);if(!side)r(26,16,1,8,color);r(10,25,12,1,color);r(15,26,1,7,color);}
    }
  }
  const accessoryCache=new WeakMap();
  function withHeadphones(source,d,facing) {
    if(!d.headphones || d.headphones==='none')return source;
    let variants=accessoryCache.get(source);if(!variants){variants=new Map();accessoryCache.set(source,variants);}
    const key=[d.headphones,d.headphoneColor,facing].join('|');if(variants.has(key))return variants.get(key);
    const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
    const ctx=c.getContext('2d');ctx.drawImage(source,0,0);c.worldCrop=source.worldCrop;ctx.save();ctx.scale(c.width/32,c.height/48);
    if(facing==='right'){ctx.translate(32,0);ctx.scale(-1,1);}drawHeadphones(ctx,d,facing);ctx.restore();
    variants.set(key,c);return c;
  }
  const sizeCache=new WeakMap();
  function worldSprite(source) {
    if(sizeCache.has(source))return sizeCache.get(source);
    let pixels;try{pixels=source.getContext('2d').getImageData(0,0,source.width,source.height).data;}catch(_){const c=document.createElement('canvas');c.width=24;c.height=32;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;if(source.worldCrop)ctx.drawImage(source,...source.worldCrop,0,0,24,32);else ctx.drawImage(source,0,0,24,32);sizeCache.set(source,c);return c;}
    let left=source.width,top=source.height,right=0,bottom=0;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(pixels[(y*source.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const c=document.createElement('canvas');c.width=24;c.height=32;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    if(left<=right)ctx.drawImage(source,left,top,right-left+1,bottom-top+1,0,0,24,32);
    sizeCache.set(source,c);return c;
  }
  function store(id,d){ const next={...library,[id]:clean(d)};localStorage.setItem(key,JSON.stringify(next));library=next;return library[id]; }
  window.CharacterDesign={get library(){return library;},presets,enums,colors,clean,sprite,store,withHeadphones,worldSprite};
})();
