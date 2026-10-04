/* Only viewport blocks own Image objects. Eviction clears handlers and src so
   decoded pixels can be reclaimed; the full-resolution town is never opened. */
(() => {
  'use strict';
  class TownStream {
    constructor(manifest) {
      this.manifest=manifest; this.blocks=new Map(); this.requests=0;
      this.overview=new Image(); this.overview.src='town_overview.png';
    }
    sync(x,y,w,h) {
      const m=this.manifest,s=m.blockSize, wanted=new Set();
      const left=Math.max(0,Math.floor(x/s)),top=Math.max(0,Math.floor(y/s));
      const right=Math.min(m.columns-1,Math.floor((x+w-1)/s));
      const bottom=Math.min(m.rows-1,Math.floor((y+h-1)/s));
      for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)wanted.add(`${col}_${row}`);
      for(const [key,block] of this.blocks)if(!wanted.has(key)) {
        block.image.onload=null;block.image.onerror=null;block.image.removeAttribute('src');this.blocks.delete(key);
      }
      for(const key of wanted) {
        let block=this.blocks.get(key);
        if(block && (!block.failedAt || performance.now()-block.failedAt<3000))continue;
        const [col,row]=key.split('_').map(Number),image=new Image();
        block={image,x:col*s,y:row*s,ready:false,failedAt:0};this.blocks.set(key,block);
        image.onload=()=>{block.ready=true;};
        image.onerror=()=>{block.failedAt=performance.now();};
        this.requests++;image.src=`town_blocks/${key}.png`;
      }
    }
    draw(ctx,x,y,w,h) {
      x=Math.round(x);y=Math.round(y);this.sync(x,y,w,h);
      ctx.fillStyle='#91bb92';ctx.fillRect(0,0,w,h);
      // A tiny overview covers cold-load frames without retaining old blocks.
      if(this.overview.naturalWidth) {
        const m=this.manifest,o=this.overview;
        ctx.drawImage(o,x/m.width*o.width,y/m.height*o.height,w/m.width*o.width,h/m.height*o.height,0,0,w,h);
      }
      for(const b of this.blocks.values())if(b.ready)ctx.drawImage(b.image,b.x-x,b.y-y);
    }
    ready(){return this.blocks.size>0 && [...this.blocks.values()].every(b=>b.ready);}
    stats(){return {keys:[...this.blocks.keys()],ready:this.ready(),requests:this.requests,
      decodedBytes:[...this.blocks.values()].reduce((sum,b)=>sum+(b.ready?b.image.naturalWidth*b.image.naturalHeight*4:0),0),
      errors:[...this.blocks.entries()].filter(([,b])=>b.failedAt).map(([key])=>key)};}
  }
  window.TownStream=TownStream;
})();
