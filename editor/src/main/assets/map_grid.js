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
  const types = [
    "grass", "road", "path", "plaza", "sidewalk", "crossing", "water",
    "tree", "shrub", "flowers", "fence",
    "house", "house_blue", "house_teal", "high_building", "school", "market",
    "shopping_mall", "hospital", "city_hall", "gas_station",
    "bus_stop", "tram_stop", "car", "bike", "tram", "traffic_light",
    "playground_slide", "playground_swings", "bench", "lamp", "fountain",
  ];
  const artIndex = Object.fromEntries(atlasNames.map((name, index) => [name, index]));
  const walkable = new Set(["road", "path", "plaza", "sidewalk", "crossing"]);
  const terrain = new Set(["grass", "road", "path", "water", "plaza", "sidewalk", "crossing"]);
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
    if (!terrain.has(type))
      ctx.drawImage(art, 0, 0, artSize, artSize, x, y, size*fw, size*fh);
    ctx.drawImage(art, (index % 4) * artSize, Math.floor(index / 4) * artSize,
      artSize, artSize, x, y, size*fw, size*fh);
  }
  function whenArtReady(callback) {
    if (art.complete && art.naturalWidth) callback();
    else art.addEventListener("load", callback, { once: true });
  }
  window.MapGrid = { tileSize, types, walkable, parse, serialize, drawTile, whenArtReady, footprint, covered };
})();
