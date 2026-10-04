(() => {
  "use strict";
  const tileSize = 32;
  const artSize = 96;
  const atlasNames = [
    "grass", "road", "path", "water", "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "lamp", "school", "market", "plaza",
    "fountain", "sidewalk", "crossing", "high_building", "bus_stop",
    "tram_stop", "car", "bike", "tram", "playground_slide", "playground_swings",
    "gas_station", "shopping_mall", "hospital", "city_hall", "traffic_light", "bench",
  ];
  atlasNames.push(...Array.from({length:16},(_,i)=>`road_${i}`),...Array.from({length:16},(_,i)=>`access_${i}`),...Array.from({length:16},(_,i)=>`sidewalk_${i}`));
  const roadMasks={road_vertical:5,road_horizontal:10,road_corner_ne:3,road_corner_es:6,road_corner_sw:12,road_corner_wn:9,road_t_n:11,road_t_e:7,road_t_s:14,road_t_w:13,road_cross:15};
  const sidewalkMasks=Object.fromEntries(Object.entries(roadMasks).map(([name,mask])=>[name.replace("road_","sidewalk_"),mask]));
  const types = [
    "grass", "road", ...Object.keys(roadMasks), "access", "path", "plaza", "sidewalk", ...Object.keys(sidewalkMasks), "crossing", "water",
    "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "high_building", "school", "market",
    "shopping_mall", "hospital", "city_hall", "gas_station",
    "bus_stop", "tram_stop", "car", "bike", "tram", "traffic_light",
    "playground_slide", "playground_swings", "bench", "lamp", "fountain",
  ];
  const artIndex = Object.fromEntries(atlasNames.map((name, index) => [name, index]));
  const walkable = new Set(["grass", "road", "path", "plaza", "sidewalk", "crossing"]);
  const terrain = new Set(["grass", "road", "path", "water", "plaza", "sidewalk", "crossing"]);
  for(const type of ['access',...Object.keys(roadMasks),...Object.keys(sidewalkMasks)]){walkable.add(type);terrain.add(type);}
  for(const [name,mask]of Object.entries(roadMasks))artIndex[name]=32+mask;
  for(const [name,mask]of Object.entries(sidewalkMasks))artIndex[name]=64+mask;
  artIndex.sidewalk=69;
  artIndex.road=37;artIndex.access=53;
  const isRoad=type=>type==='road'||Object.hasOwn(roadMasks,type);
  const isSidewalk=type=>type==='sidewalk'||Object.hasOwn(sidewalkMasks,type);
  function connectedType(edits,index,cols,baseRoads,baseAccess,baseSidewalks,basePaving){
    if(!edits.has(index)&&(!(baseRoads?.has(index)||baseSidewalks?.has(index))||![index-cols,index+1,index+cols,index-1].some(i=>edits.has(i))))return null;
    const type=edits.get(index)||(baseRoads?.has(index)?'road':baseAccess?.has(index)?'access':baseSidewalks?.has(index)?'sidewalk':null);
    if(type!=='road'&&type!=='access'&&type!=='sidewalk')return type;
    const neighbour=i=>edits.get(i)||(baseRoads?.has(i)?'road':baseAccess?.has(i)?'access':baseSidewalks?.has(i)?'sidewalk':basePaving?.has(i)?'path':null);
    let mask=0;
    for(const [bit,i,valid]of [[1,index-cols,index>=cols],[2,index+1,index%cols<cols-1],[4,index+cols,true],[8,index-1,index%cols>0]]){
      const next=valid?neighbour(i):null;
      if(type==='road'?isRoad(next):type==='sidewalk'?(isSidewalk(next)||['access','path','plaza','crossing'].includes(next)):(next!=='grass'&&walkable.has(next)))mask|=bit;
    }
    return `${type}_${mask}`;
  }
  const footprints={house:[3,3],house_blue:[3,3],house_teal:[3,3],high_building:[3,4],school:[5,4],hospital:[4,4],city_hall:[4,4],shopping_mall:[5,4],gas_station:[4,3],tree:[2,2],car:[2,2],tram:[2,4],bus_stop:[2,2],tram_stop:[2,2],playground_slide:[2,2],playground_swings:[3,2],fountain:[2,2],bench:[2,1],lamp:[1,2],traffic_light:[1,2]};
  const footprint=type=>footprints[type]||[1,1];
  function covered(edits,col,row,cols) {
    for(let y=Math.max(0,row-4);y<=row;y++)for(let x=Math.max(0,col-4);x<=col;x++){
      const type=edits.get(y*cols+x);if(!type||terrain.has(type))continue;
      const [w,h]=footprint(type);if(col<x+w && row<y+h)return type;
    }
    return null;
  }
  const art = new Image();
  art.src = "tile_atlas.png";

  function parse(input, width, height) {
    let data = typeof input === "string" ? JSON.parse(input) : input;
    // Earlier maps cover the same geography at half the new grid resolution.
    if(data?.width===width/2 && data?.height===height/2 && Array.isArray(data.tiles)) {
      const oldCols=data.width/tileSize,newCols=width/tileSize;
      const expanded=[];
      for(const [index,type] of data.tiles){
        if(!Number.isInteger(index)||index<0||index>=oldCols*(data.height/tileSize))throw new Error("Invalid old map block.");
        const col=index%oldCols*2,row=Math.floor(index/oldCols)*2;
        for(let dy=0;dy<(terrain.has(type)?2:1);dy++)for(let dx=0;dx<(terrain.has(type)?2:1);dx++)expanded.push([(row+dy)*newCols+col+dx,type]);
      }
      data={...data,width,height,tiles:expanded};
    }
    if (!data || data.format !== "kaplan-grid-v1" || data.tileSize !== tileSize ||
        data.width !== width || data.height !== height || !Array.isArray(data.tiles)) {
      throw new Error("This is not a compatible Kaplan Quest map file.");
    }
    const cols = width / tileSize, rows = height / tileSize;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || data.tiles.length > cols * rows)
      throw new Error("The map dimensions or tile count are invalid.");
    const edits = new Map();
    for (const entry of data.tiles) {
      if (!Array.isArray(entry) || entry.length !== 2 ||
          !Number.isInteger(entry[0]) || entry[0] < 0 || entry[0] >= cols * rows ||
          !types.includes(entry[1]) || edits.has(entry[0])) {
        throw new Error("The map has an invalid or repeated block.");
      }
      edits.set(entry[0], entry[1]);
    }
    return edits;
  }
  function serialize(edits, width, height) {
    return JSON.stringify({ format: "kaplan-grid-v1", width, height, tileSize,
      tiles: [...edits].sort((a, b) => a[0] - b[0]) });
  }
  function drawTile(ctx, type, x, y, size = tileSize, stamp = false) {
    const [fw,fh]=stamp?footprint(type):[1,1];
    const index = artIndex[type];
    if (index === undefined) return;
    if (!art.complete || !art.naturalWidth) {
      ctx.fillStyle = type === "water" ? "#278ece" : type === "road" || type === "crossing" ? "#b7bec0" :
        type === "path" || type === "plaza" || type === "sidewalk" ? "#d5c8ae" : "#91dc78";
      ctx.fillRect(x, y, size, size);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    if (!terrain.has(type)&&!/^(road|access|sidewalk)_\d+$/.test(type))
      ctx.drawImage(art, 0, 0, artSize, artSize, x, y, size*fw, size*fh);
    ctx.drawImage(art, (index % 4) * artSize, Math.floor(index / 4) * artSize,
      artSize, artSize, x, y, size*fw, size*fh);
    if(['house','house_blue','house_teal','high_building'].includes(type)){
      const scale=size*fw/96,bottom=y+size*fh;
      ctx.drawImage(art,0,0,96,48,x+size*fw/2-16*scale,bottom-16*scale,32*scale,16*scale);
      ctx.drawImage(art,(artIndex.access%4)*96+12,Math.floor(artIndex.access/4)*96,72,48,x+size*fw/2-12*scale,bottom-16*scale,24*scale,16*scale);
    }
  }
  function whenArtReady(callback) {
    if (art.complete && art.naturalWidth) callback();
    else art.addEventListener("load", callback, { once: true });
  }
  window.MapGrid = { tileSize, types, walkable, parse, serialize, drawTile, whenArtReady, footprint, covered, connectedType, terrain, isRoad };
})();
