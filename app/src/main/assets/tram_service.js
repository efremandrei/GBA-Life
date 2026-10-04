/* A deterministic 180-second service cycle; each station receives one stop per cycle. */
(() => {
 'use strict';
 class TramService {
  constructor(rail){
   this.rail=rail;this.length=(rail.path.length-1)*32;
   this.speed=this.length/(rail.period-rail.stops.length*rail.dwell);
   this.stops=rail.stops.map((stop,i)=>({...stop,arrival:stop.distance/this.speed+i*rail.dwell}));
  }
  position(distance){
   const path=this.rail.path,index=Math.min(path.length-2,Math.floor(distance/32)),fraction=(distance-index*32)/32;
   const a=path[index],b=path[index+1];const facing=b[0]>a[0]?'right':b[0]<a[0]?'left':b[1]<a[1]?'up':'down';return {facing,x:a[0]+(b[0]-a[0])*fraction,y:a[1]+(b[1]-a[1])*fraction,angle:b[0]>a[0]?-Math.PI/2:b[0]<a[0]?Math.PI/2:b[1]<a[1]?Math.PI:0};
  }
  state(seconds){
   const phase=((seconds%this.rail.period)+this.rail.period)%this.rail.period;
   let previousDistance=0,previousTime=0;
   for(const stop of this.stops){
    if(phase<stop.arrival)return {...this.position(previousDistance+(phase-previousTime)*this.speed),station:null,phase};
    if(phase<stop.arrival+this.rail.dwell)return {...this.position(stop.distance),station:stop.name,phase};
    previousDistance=stop.distance;previousTime=stop.arrival+this.rail.dwell;
   }
   return {...this.position(previousDistance+(phase-previousTime)*this.speed),station:null,phase};
  }
  nextArrival(name,seconds){
   const stop=this.stops.find(s=>s.name===name);if(!stop)return null;
   const phase=((seconds%this.rail.period)+this.rail.period)%this.rail.period;
   if(phase>=stop.arrival&&phase<stop.arrival+this.rail.dwell)return 0;
   return (stop.arrival-phase+this.rail.period)%this.rail.period;
  }
 }
 window.TramService=TramService;
})();
