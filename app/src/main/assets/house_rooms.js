(() => {
  "use strict";

  function seed(id) {
    let value = 2166136261;
    for (const character of String(id)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
    return value >>> 0;
  }

  function layout(width, height) {
    const compact = width < 540;
    const w = Math.min(width - 24, 520);
    const h = Math.max(260, Math.min(compact ? 600 : 520, height - (compact ? 160 : 180)));
    const x = Math.round((width - w) / 2);
    const y = compact ? 68 : 62;
    return { x, y, w, h, floorY: y + 82,
      exitX: Math.round(x + w / 2), exitY: y + h - 23 };
  }

  function objects(house, room) {
    const variant = seed(house.id), mirrored = (variant & 1) !== 0;
    const inset = Math.max(48, room.w * .19);
    const left = room.x + inset, right = room.x + room.w - inset;
    const available = room.h - 112;
    const scale = Math.min(1, (room.w - 36) / 330, available / 440);
    const item = (kind, side, row, w, h) => ({ kind,
      x: (side === 0) !== mirrored ? left : right,
      y: room.floorY + available * [ .10, .29, .48, .67, .86 ][row],
      w: w * scale, h: h * scale });
    // Furniture stays on the two sides, keeping a clear route from the door.
    return [item('bed',0,0,78,60), item('bookshelf',0,1,66,54),
      item('table',0,2,80,50), item('chest',0,3,56,38),
      item('wardrobe',0,4,70,48), item('kitchen',1,0,82,58),
      item('sofa',1,1,82,56), item('tv',1,2,68,50),
      item('plant',1,3,38,42), item(variant % 3 === 0 ? 'radio' : 'fridge',1,4,49,44)];
  }

  function canStand(x, y, room, items) {
    if (x < room.x + 17 || x > room.x + room.w - 17 ||
        y < room.floorY + 13 || y > room.y + room.h - 14) return false;
    return items.every(item =>
      Math.abs(x - item.x) > item.w / 2 + 7 ||
      Math.abs(y - item.y) > item.h / 2 + 7);
  }

  function nearest(x, y, room, items) {
    const candidates = [
      { kind: "exit", x: room.exitX, y: room.exitY, w: 40, h: 18 }, ...items,
    ];
    return candidates.map(item => ({ item, distance: Math.hypot(x - item.x, y - item.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function draw(ctx, house, width, height) {
    const room = layout(width, height);
    const items = objects(house, room);
    const variant = seed(house.id);
    const walls = house.roof === "high_building" ? ["#c7d8df", "#829ca9"] :
      house.roof === "house_blue" ? ["#a9c6db", "#6e9bb8"] :
      house.roof === "house_teal" ? ["#b4d6bd", "#75aa96"] : ["#e8c6ae", "#bc8f7c"];
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, width, height, "#18313a");
    for (let y = 0; y < height; y += 40) for (let x = 0; x < width; x += 40)
      rect(x, y, 2, 2, "#245146");
    rect(room.x - 6, room.y - 6, room.w + 12, room.h + 12, "#152735");
    ctx.save(); ctx.beginPath(); ctx.rect(room.x, room.y, room.w, room.h); ctx.clip();
    rect(room.x, room.y, room.w, room.h, "#efd9aa");
    rect(room.x, room.y, room.w, 82, walls[0]);
    for (let x = room.x + 12; x < room.x + room.w - 8; x += 24)
      rect(x, room.y + 8, 3, 66, walls[1]);
    rect(room.x, room.y + 75, room.w, 8, "#705744");
    for (let y = room.floorY; y < room.y + room.h; y += 24) {
      for (let x = room.x; x < room.x + room.w; x += 24) {
        rect(x, y, 23, 23, ((x + y + variant) % 3) ? "#e9d2a6" : "#dfc697");
        rect(x + 3, y + 3, 2, 2, "#c8b385");
      }
    }
    rect(room.x + 16, room.y + 24, 66, 47, "#624f4a");
    rect(room.x + 21, room.y + 29, 56, 36, "#70b9d8");
    rect(room.x + 46, room.y + 29, 4, 36, "#f5e8bf");
    rect(room.x + 21, room.y + 46, 56, 3, "#f5e8bf");
    rect(room.x + room.w - 82, room.y + 24, 66, 47, "#624f4a");
    rect(room.x + room.w - 77, room.y + 29, 56, 36, "#70b9d8");
    rect(room.x + room.w - 52, room.y + 29, 4, 36, "#f5e8bf");
    rect(room.x + room.w - 77, room.y + 46, 56, 3, "#f5e8bf");
    const rugX = room.x + room.w / 2 - 63;
    const rugY = room.floorY + (room.h - 112) * .48 - 42;
    rect(rugX, rugY, 126, 88, variant % 2 ? "#6c9f9c" : "#c96d65");
    rect(rugX + 6, rugY + 6, 114, 76, "#f1d0a5");
    rect(rugX + 12, rugY + 12, 102, 64, variant % 2 ? "#6c9f9c" : "#c96d65");
    // Wall details: curtains, clock, framed print and a coat rail.
    for (const wx of [room.x+16,room.x+room.w-82]) {
      rect(wx-3,room.y+20,7,50,walls[1]); rect(wx+62,room.y+20,7,50,walls[1]);
      rect(wx-5,room.y+18,76,4,'#614936');
    }
    const mid=room.x+room.w/2;
    rect(mid-12,room.y+14,24,24,'#654b38');rect(mid-9,room.y+17,18,18,'#fff0ca');
    rect(mid-1,room.y+20,2,10,'#344a54');rect(mid,room.y+28,6,2,'#344a54');
    rect(mid-25,room.y+47,50,22,'#785240');rect(mid-21,room.y+51,42,14,'#8ab9b9');
    rect(mid-18,room.y+58,18,7,'#53925c');rect(mid+4,room.y+54,9,11,'#edcf78');
    for (const item of items) {
      const x=item.x-item.w/2,y=item.y-item.h/2;
      const r=(a,b,w,h,c)=>rect(x+a*item.w/100,y+b*item.h/72,w*item.w/100,h*item.h/72,c);
      r(4,66,96,6,'#9b8367');
      const wood=variant%3===0?'#c89d69':'#b88152';
      if(item.kind==='bed') {
        r(0,0,100,72,'#533a32');r(5,6,90,61,'#fff0ce');
        r(8,31,84,32,variant%2?'#527faa':'#b76068');r(12,36,76,4,variant%2?'#7da8c7':'#de9292');
        r(13,10,31,17,'#d8d4bb');r(56,10,31,17,'#d8d4bb');r(15,9,28,14,'#fff9e5');r(57,9,28,14,'#fff9e5');
        r(8,56,84,5,'#eee0b9');r(5,66,7,6,'#3a302d');r(88,66,7,6,'#3a302d');
      } else if(item.kind==='bookshelf') {
        r(0,0,100,72,'#5d3e30');r(5,5,90,61,wood);
        for(let row=0;row<3;row++) {r(8,8+row*20,84,16,'#44382d');
          for(let col=0;col<8;col++){const h=10+(variant+col)%5;r(11+col*10,24+row*20-h,7,h,['#bd6261','#61a1a0','#d8bf73','#8383ad'][(variant+row+col)%4]);r(12+col*10,24+row*20-h+3,5,1,'#eddaad');}
        }
      } else if(item.kind==='table') {
        r(10,20,7,50,'#543e32');r(83,20,7,50,'#543e32');r(0,0,100,52,'#604432');r(4,4,92,43,wood);
        r(12,10,37,27,'#fff2d4');r(16,13,26,3,'#94b9a8');r(20,21,20,3,'#648f95');r(17,28,24,2,'#648f95');
        r(70,13,15,15,'#f6e4c0');r(74,17,8,7,'#785642');r(85,17,5,7,'#e6cba0');r(55,31,12,6,'#c55c50');
      } else if(item.kind==='plant') {
        r(25,40,50,28,'#784b35');r(20,39,60,8,'#d48c57');r(30,47,40,17,'#b57143');
        r(45,17,8,28,'#416c3b');r(12,14,30,26,'#3b7951');r(55,13,33,27,'#3b7951');r(30,2,40,32,'#79b05c');
        r(35,8,12,8,'#beda6c');r(65,20,11,6,'#83bc61');
      } else if(item.kind==='chest') {
        r(0,10,100,60,'#573b2d');r(5,5,90,59,wood);r(5,36,90,5,'#5d4330');
        r(15,6,8,57,'#d6b578');r(77,6,8,57,'#d6b578');r(43,32,14,22,'#f1cf72');r(48,38,5,8,'#775733');
      } else if(item.kind==='wardrobe') {
        r(0,0,100,72,'#513b32');r(5,4,90,64,wood);r(49,4,3,64,'#725038');
        r(10,9,32,40,'#d1a776');r(58,9,32,40,'#d1a776');r(42,29,4,12,'#edd28c');r(55,29,4,12,'#edd28c');
        r(10,55,80,3,'#815b3d');r(5,68,8,4,'#3f332b');r(87,68,8,4,'#3f332b');
      } else if(item.kind==='kitchen') {
        r(0,3,100,67,'#725a44');r(3,6,94,30,'#e6dfc9');r(4,37,92,29,wood);
        r(33,39,2,26,'#7d5a3d');r(66,39,2,26,'#7d5a3d');r(10,43,15,3,'#e5cca0');r(41,43,15,3,'#e5cca0');r(75,43,15,3,'#e5cca0');
        r(9,11,35,17,'#819b9b');r(13,14,27,10,'#adc2bb');r(24,5,5,12,'#637b83');r(26,5,11,4,'#637b83');
        r(53,10,33,21,'#444d51');for(const [a,b]of [[58,13],[74,13],[58,23],[74,23]])r(a,b,7,5,'#aab8b5');
        r(62,12,12,10,'#bb6857');r(66,8,5,4,'#e4cfa1');r(88,12,6,12,'#b68b50');
      } else if(item.kind==='sofa') {
        const color=variant%2?'#639d91':'#a86780',light=variant%2?'#91b9a3':'#cd97a7';
        r(3,58,8,14,'#553d32');r(89,58,8,14,'#553d32');r(0,5,100,60,'#3e4c51');r(5,9,90,46,color);
        r(14,16,33,24,light);r(53,16,33,24,light);r(13,43,74,14,light);r(47,42,5,18,color);
        r(2,27,11,34,color);r(87,27,11,34,color);r(18,20,12,14,'#edcc98');r(67,20,12,14,'#edcc98');
      } else if(item.kind==='tv') {
        r(4,45,92,23,'#694c39');r(8,49,84,14,wood);r(48,40,5,7,'#333c46');r(31,45,38,3,'#333c46');
        r(8,0,84,41,'#28333e');r(13,5,74,30,'#6095ac');r(15,23,70,10,'#699b6e');r(55,8,13,10,'#eed47f');
        r(23,13,19,17,'#adc5c3');r(25,17,4,7,'#567889');r(35,17,4,7,'#567889');r(86,37,3,2,'#82ce83');r(15,55,15,3,'#eed397');
      } else if(item.kind==='radio') {
        r(0,0,100,72,'#424b51');r(5,6,90,58,'#6a797b');r(8,9,40,40,'#303e47');
        for(let a=13;a<45;a+=7)r(a,13,2,32,'#657b7c');r(57,10,33,14,'#93bca8');r(63,15,20,3,'#d9eac1');
        r(58,35,12,12,'#d9c68d');r(79,35,12,12,'#d9c68d');r(18,-8,65,3,'#344750');
      } else if(item.kind==='fridge') {
        r(0,0,100,72,'#839b9b');r(5,4,90,62,'#f1ecd8');r(6,26,88,3,'#abbfb3');
        r(79,10,5,11,'#657d85');r(79,36,5,19,'#657d85');r(12,36,26,20,'#fff9df');
        r(17,42,16,2,'#82a294');r(17,48,13,2,'#82a294');r(19,31,5,5,'#b35b64');r(50,9,9,8,'#deb974');
      }
    }
    rect(room.exitX - 24, room.y + room.h - 23, 48, 23, "#6b4c3b");
    rect(room.exitX - 17, room.y + room.h - 20, 34, 20, "#a87853");
    rect(room.exitX - 4, room.y + room.h - 8, 8, 3, "#f3d982");
    ctx.restore();
    return { room, items };
  }

  window.HouseRooms = { layout, objects, canStand, nearest, draw };
})();
