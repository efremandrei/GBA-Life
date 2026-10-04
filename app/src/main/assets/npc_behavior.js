/* A townsperson lives on one grid cell: wait, visit one neighbour, wait, return. */
(() => {
  const directions=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
  function initialize(person,x,y,random) {
    person.homeX=person.x=x;person.homeY=person.y=y;
    person.random=random;person.homeFacing=directions[Math.floor(random()*4)][0];
    person.facing=person.homeFacing;person.motion='idle';person.timer=12+random()*28;
    person.targetX=x;person.targetY=y;person.stride=0;person.speed=40;
    return person;
  }
  function update(person,seconds,tileSize,canVisit) {
    let remaining=seconds;
    while(remaining>0){
      if(person.motion==='idle'||person.motion==='pause'){
        const consumed=Math.min(remaining,person.timer);person.timer-=consumed;remaining-=consumed;person.stride=0;
        if(person.timer>0)break;
        if(person.motion==='pause'){
          person.motion='return';person.targetX=person.homeX;person.targetY=person.homeY;
        }else{
          const choices=directions.filter(([,dx,dy])=>canVisit(person,person.homeX+dx*tileSize,person.homeY+dy*tileSize));
          if(!choices.length){person.timer=15+person.random()*30;continue;}
          const [face,dx,dy]=choices[Math.floor(person.random()*choices.length)];
          person.facing=face;person.targetX=person.homeX+dx*tileSize;person.targetY=person.homeY+dy*tileSize;person.motion='outbound';
        }
      }else{
        const dx=person.targetX-person.x,dy=person.targetY-person.y,length=Math.hypot(dx,dy);
        if(length>0){
          person.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
          const spent=Math.min(remaining,length/person.speed),amount=spent*person.speed;
          person.x+=dx/length*amount;person.y+=dy/length*amount;person.stride+=amount/40*7;remaining-=spent;
          if(amount<length-.000001)break;
        }
        person.x=person.targetX;person.y=person.targetY;person.stride=0;
        if(person.motion==='outbound'){person.motion='pause';person.timer=3+person.random()*5;}
        else {person.motion='idle';person.timer=15+person.random()*30;person.facing=person.homeFacing;}
      }
    }
  }
  window.NpcBehavior={initialize,update};
})();
