/* Character designs are data, so new presets can be added without changing the renderer. */
(() => {
  const key = 'kaplan-character-library-v1';
  const base = {name:'Andrei',skin:'#edac80',shirt:'#326ac4',pants:'#315c7c',backpack:'#ce292e',hair:'#49392a',eyes:'#513c28',glasses:'#202630',hairStyle:'short',facialHair:'beard',outfit:'trousers',wearGlasses:false,wearBackpack:true};
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
  const enums = {hairStyle:['short','bob','shoulder','long','curly','ponytail','bald'],facialHair:['none','stubble','moustache','beard'],outfit:['trousers','skirt']};
  const colors = ['skin','shirt','pants','backpack','hair','eyes','glasses'];
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
    const r=(a,b,w,h,color)=>{x.fillStyle=color;x.fillRect(a,b,w,h);};
    const shade=color=> '#'+color.slice(1).match(/../g).map(v=>Math.max(0,parseInt(v,16)-34).toString(16).padStart(2,'0')).join('');
    const dark='#28272f', side=facing==='left'||facing==='right', back=facing==='up';
    if(facing==='right'){x.translate(32,0);x.scale(-1,1);}
    // Hair silhouette behind the body; long cuts fall over the shoulders.
    if(['long','shoulder','bob','ponytail'].includes(d.hairStyle)) {
      r(6,6,20,d.hairStyle==='long'?30:d.hairStyle==='shoulder'?23:19,dark);
      r(8,7,16,d.hairStyle==='long'?27:19,d.hair);
      if(d.hairStyle==='ponytail')r(side?23:24,12,5,18,d.hair);
    }
    const a=pose<0?0:pose===0?2:-2;
    // Independent leg poses in every direction, with separate shoes.
    r(8,35+a,7,11,dark);r(17,35-a,7,11,dark);
    r(9,35+a,5,8,d.pants);r(18,35-a,5,8,shade(d.pants));
    r(7,44+a,8,3,'#49392f');r(17,44-a,8,3,'#49392f');
    r(6,23,20,15,dark);r(8,24,16,12,d.shirt);r(8,34,16,3,shade(d.shirt));
    if(d.outfit==='skirt'){r(6,34,20,7,dark);r(8,34,16,6,d.pants);r(6,39,20,2,shade(d.pants));r(9,41+a,5,3,d.skin);r(18,41-a,5,3,d.skin);}
    r(3,25,5,10,dark);r(24,25,5,10,dark);r(4,25,3,5,d.shirt);r(25,25,3,5,shade(d.shirt));
    r(4,30+a/2,3,5,d.skin);r(25,30-a/2,3,5,d.skin);
    if(d.wearBackpack){if(back){r(8,24,16,14,dark);r(10,25,12,11,d.backpack);r(11,27,10,2,shade(d.backpack));r(11,33,10,2,shade(d.backpack));}else if(side){r(23,25,7,12,dark);r(24,26,5,10,d.backpack);}else {r(8,24,2,10,d.backpack);r(22,24,2,10,d.backpack);}}
    r(6,3,20,20,dark);r(8,5,16,17,d.skin);r(8,19,16,3,shade(d.skin));r(8,7,2,11,shade(d.skin));r(23,8,1,10,shade(d.skin));
    r(4,11,3,7,d.skin);r(25,11,3,7,d.skin);
    if(back){r(7,5,18,15,d.hairStyle==='bald'?d.skin:d.hair);r(9,4,14,4,shade(d.hairStyle==='bald'?d.skin:d.hair));}
    else {
      if(side){r(5,13,5,4,d.skin);r(9,12,4,4,'#fff5df');r(9,13,2,3,d.eyes);}
      else {r(10,12,4,4,'#fff5df');r(18,12,4,4,'#fff5df');r(12,13,2,3,d.eyes);r(18,13,2,3,d.eyes);r(15,17,2,2,shade(d.skin));r(10,10,4,1,shade(d.hair));r(18,10,4,1,shade(d.hair));}
      r(side?9:13,20,side?5:6,1,'#a56555');
      if(d.facialHair!=='none'){const h=d.facialHair==='beard'?7:2;r(side?9:9,d.facialHair==='moustache'?18:19,side?9:14,h,d.hair);if(d.facialHair==='beard')r(12,25,8,2,shade(d.hair));}
      if(d.wearGlasses){r(side?8:9,11,6,1,d.glasses);r(side?8:9,16,6,1,d.glasses);r(side?8:9,12,1,4,d.glasses);r(14,12,1,4,d.glasses);if(!side){r(17,11,6,1,d.glasses);r(17,16,6,1,d.glasses);r(17,12,1,4,d.glasses);r(22,12,1,4,d.glasses);r(15,13,2,1,d.glasses);}}
    }
    if(d.hairStyle!=='bald'){
      r(8,3,16,5,d.hair);r(10,2,12,2,d.hair);r(8,7,5,3,d.hair);r(21,7,3,5,d.hair);r(10,4,11,2,shade(d.hair));
      if(d.hairStyle==='curly'){r(6,4,4,6,d.hair);r(23,4,4,6,d.hair);r(11,1,4,3,d.hair);r(18,1,4,3,d.hair);}
      if(['bob','shoulder','long'].includes(d.hairStyle)){r(6,8,3,d.hairStyle==='long'?23:d.hairStyle==='shoulder'?16:10,d.hair);r(23,8,3,d.hairStyle==='long'?23:d.hairStyle==='shoulder'?16:10,d.hair);}
    }
    // Stepped corners and cloth highlights keep the silhouette readable at town scale.
    x.clearRect(6,3,2,3);x.clearRect(24,3,2,3);
    if(!back){r(9,25,2,7,shade(d.shirt));r(20,25,3,1,d.shirt);}
    if(!back && !side && d.facialHair==='beard'){r(9,24,3,2,d.skin);r(20,24,3,2,d.skin);}
    if(cache.size>1400)cache.clear(); cache.set(hash,c);return c;
  }
  function store(id,d){ const next={...library,[id]:clean(d)};localStorage.setItem(key,JSON.stringify(next));library=next;return library[id]; }
  window.CharacterDesign={get library(){return library;},presets,enums,colors,clean,sprite,store};
})();
