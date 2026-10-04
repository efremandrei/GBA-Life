/* Two-finger pointer gestures. One-finger gestures stay with the app. */
(() => {
  'use strict';
  window.PinchZoom = function(target, { start, change, end, enabled = () => true }) {
    const points = new Map();
    let locked = false, initialDistance = 1;
    const sample = () => {
      const [a,b] = [...points.values()];
      return { center: { x:(a.x+b.x)/2, y:(a.y+b.y)/2 },
        distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)) };
    };
    function begin() {
      const s=sample(); initialDistance=s.distance; start(s.center);
    }
    function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    target.addEventListener('pointerdown', event => {
      if(event.pointerType !== 'touch' || !enabled()) return;
      points.set(event.pointerId,{x:event.clientX,y:event.clientY});
      target.setPointerCapture(event.pointerId);
      if(points.size >= 2) { stop(event); locked=true; if(points.size===2)begin(); }
      else if(locked)stop(event);
    },true);
    target.addEventListener('pointermove', event => {
      if(!points.has(event.pointerId))return;
      points.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(!locked)return;
      stop(event);
      if(points.size>=2) { const s=sample(); change(s.distance/initialDistance,s.center); }
    },true);
    function release(event) {
      if(!points.has(event.pointerId))return;
      const consumed=locked;
      points.delete(event.pointerId);
      if(consumed)stop(event);
      if(locked && points.size>=2)begin();
      if(locked && points.size===0) { locked=false; end?.(); }
    }
    for(const name of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(name,release,true);
    window.addEventListener('blur',()=>{points.clear();if(locked){locked=false;end?.();}});
    return { get active() { return locked; } };
  };
})();
