"""Build an orthogonal 32px town from the stored OSM snapshot (ODbL).
Street connectivity and landmark geography are retained as a stylized grid.
"""
from pathlib import Path
import json, base64, random, shutil, math
from collections import deque
from PIL import Image, ImageDraw, ImageFont
from grid_surfaces import surface, connection_mask
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'app/src/main/assets'
W,H,T=8192,4608,32
COLS,ROWS=W//T,H//T
SOUTH,WEST,NORTH,EAST=32.081,34.858,32.096,34.889
RNG=random.Random(1878)
KINDS={'primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','living_street','unclassified','service','pedestrian','footway','path','cycleway','steps','track'}
FOOT={'pedestrian','footway','path','cycleway','steps','track'}
def cell(lat,lon):return (max(0,min(COLS-1,round((lon-WEST)/(EAST-WEST)*COLS))),max(0,min(ROWS-1,round((NORTH-lat)/(NORTH-SOUTH)*ROWS))))
def point(c):return [c[0]*T+T//2,c[1]*T+T//2]
def line(a,b):
 x,y=a;out=[a]
 # Larger displacement determines the first leg; both legs use grid cells.
 for axis in ([0,1] if abs(b[0]-x)>=abs(b[1]-y) else [1,0]):
  while (x if axis==0 else y)!=b[axis]:
   if axis==0:x+=1 if b[0]>x else -1
   else:y+=1 if b[1]>y else -1
   out.append((x,y))
 return out
def geometry(e):
 raw=[cell(p['lat'],p['lon']) for p in e.get('geometry',[])]
 # Collapse jitter smaller than two cells, but always preserve endpoints.
 way=[]
 for i,p in enumerate(raw):
  if not way or i==len(raw)-1 or math.dist(way[-1],p)>=2:way.append(p)
 result=[]
 for a,b in zip(way,way[1:]):result+=line(a,b)[:-1]
 if way:result.append(way[-1])
 return list(dict.fromkeys(result)) if len(way)<2 else result

def sprite(kind,w,h):
 im=Image.open(ROOT/'art/tiles'/f'{kind}.png').convert('RGBA')
 if kind not in {'grass','road','path','plaza','sidewalk','water','crossing'}:
  box=im.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox();im=im.crop(box)
 return im.resize((w,h),Image.Resampling.NEAREST)
def main():
 roads_raw=json.loads((ROOT/'data/petah_roads_raw.json').read_text(encoding='utf-8'))
 places=json.loads((ROOT/'data/petah_landmarks_raw.json').read_text(encoding='utf-8'))['elements']
 roads=[e for e in roads_raw['elements'] if e['type']=='way' and e.get('tags',{}).get('highway') in KINDS and len(e.get('geometry',[]))>=2]
 cells={}; paths=[];road_records=[]
 for road in roads:
  route=geometry(road);kind=road['tags']['highway'];road_records.append({'id':road['id'],'name':road['tags'].get('name:en',road['tags'].get('name','')),'cells':[list(c) for c in route]})
  if len(route)>1:paths.append(route)
  for x,y in route:
   if kind in FOOT:cells[x,y]='path';continue
   for dx in range(-1,2):
    for dy in range(-1,2):
     c=(x+dx,y+dy)
     if 0<=c[0]<COLS and 0<=c[1]<ROWS and c not in cells:cells[c]='sidewalk'
   cells[x,y]='road'
   if kind in {'primary','secondary'} and x+1<COLS:cells[x+1,y]='road'
 # One connected walking component; detached mapped footpaths get orthogonal links.
 def component(start):
  seen={start};q=deque([start])
  while q:
   x,y=q.popleft()
   for c in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
    if c in cells and c not in seen:seen.add(c);q.append(c)
  return seen
 start_raw=cell(32.08822,34.87282)
 start=min(cells,key=lambda c:math.dist(c,start_raw));connected=component(start)
 while len(connected)<len(cells):
  other=next(c for c in cells if c not in connected)
  near=min(connected,key=lambda c:abs(c[0]-other[0])+abs(c[1]-other[1]))
  for c in line(other,near):cells.setdefault(c,'path')
  connected=component(start)
 def nearest(c):return min(cells,key=lambda n:math.dist(n,c))
 school=nearest(cell(32.08952,34.86965))
 markers=[{'point':point(nearest(cell(lat,lon))),'name':name} for lat,lon,name in [(32.08945,34.87302,'Khen Street'),(32.09030,34.87114,'Tzahal Street'),(32.08937,34.87052,'HaTsoarim Street')]]
 art=Image.new('RGB',(W,H));draw=ImageDraw.Draw(art)
 terrain={k:sprite(k,T,T).convert('RGB') for k in ['grass','road','sidewalk','path','plaza','water']}
 zones={}
 for e in places:
  if not e.get('geometry'):continue
  tags=e.get('tags',{});kind='water' if tags.get('natural')=='water' else 'park' if tags.get('leisure') in {'park','garden'} or tags.get('landuse')=='grass' else None
  if not kind:continue
  ps=[cell(p['lat'],p['lon']) for p in e['geometry']];left,right=min(p[0] for p in ps),max(p[0] for p in ps);top,bottom=min(p[1] for p in ps),max(p[1] for p in ps)
  for x in range(left,right+1):
   for y in range(top,bottom+1):zones[x,y]=kind
 for y in range(ROWS):
  for x in range(COLS):art.paste(terrain['water' if zones.get((x,y))=='water' and (x,y) not in cells else 'grass'],(x*T,y*T))
 def paint(c,kind):
  if kind=='road':im=surface(connection_mask(c,cells,{'road'}))
  elif kind=='access':im=surface(connection_mask(c,cells,{'access','path','road','sidewalk','plaza'})| (1 if c in access_doors else 0),True)
  else:im=terrain[kind]
  art.paste(im,(c[0]*T,c[1]*T))
 access_doors=set()
 for c,kind in cells.items():paint(c,kind)
 used=set(cells);houses=[];scenery=[];placements=[]
 def place(kind,x,y,w,h,house=False):
  footprint={(xx,yy) for xx in range(x,x+w) for yy in range(y,y+h)}
  if x<1 or y<1 or x+w>=COLS-1 or y+h>=ROWS-1 or footprint & used or any(zones.get(c)=='water' for c in footprint):return False
  door=(x+w//2,y+h);near=nearest(door)
  if math.dist(near,door)>5:return False
  approach=line(door,near)
  if any(c in used and c not in cells for c in approach):return False
  access_doors.add(door)
  for c in approach:
   cells.setdefault(c,'access');used.add(c)
  for c in approach:paint(c,cells[c])
  im=sprite(kind,w*T,h*T)
  if house:
   # Continue the same 24px paving into the path already illustrated below the door.
   im.paste(terrain['grass'].crop((0,0,32,16)),(w*T//2-16,h*T-16))
   paving=surface(5,True);im.paste(paving.crop((4,0,28,16)),(w*T//2-12,h*T-16))
  art.paste(im,(x*T,y*T),im);used.update(footprint)
  entry=point(door);placements.append({'kind':kind,'rect':[x*T,y*T,w*T,h*T],'entry':entry})
  if house:houses.append({'entry':entry,'door':entry,'roof':kind,'bounds':[x*T,y*T,w*T,h*T],'accessWidth':24,'approach':[point(c) for c in approach]})
  else:scenery.append([*entry,kind])
  return True
 # Campus retains its mapped location; place the school immediately above its entry.
 sx,sy=school;school_im=sprite('school',160,128);school_x=max(0,min(COLS-5,sx-2));school_y=max(0,sy-5)
 school_foot={(x,y) for x in range(school_x,school_x+5) for y in range(school_y,school_y+4)}
 for c in school_foot:cells.pop(c,None);used.add(c)
 art.paste(school_im,(school_x*T,school_y*T),school_im);placements.append({'kind':'school','rect':[school_x*T,school_y*T,160,128],'entry':point(school)})
 for x in range(sx-2,sx+3):
  for y in range(sy-1,sy+2):
   if 0<=x<COLS and 0<=y<ROWS:cells[x,y]='plaza';paint((x,y),'plaza');used.add((x,y))
 # Put the nearest mapped hospitals beside roads, with grid footprints.
 def near_place(kind,c,w,h,house=False):
  candidates=[(x,y) for x in range(c[0]-7,c[0]+8) for y in range(c[1]-7,c[1]+8)];candidates.sort(key=lambda n:math.dist(n,c))
  return any(place(kind,x,y,w,h,house) for x,y in candidates)
 for e in places:
  if e.get('tags',{}).get('amenity')=='hospital' and e.get('geometry'):
   ps=[cell(p['lat'],p['lon']) for p in e['geometry']];near_place('hospital',(sum(p[0] for p in ps)//len(ps),sum(p[1] for p in ps)//len(ps)),4,4)
 for e in roads_raw['elements']:
  if e.get('tags',{}).get('public_transport')=='platform' and e.get('geometry'):
   c=cell(e['geometry'][0]['lat'],e['geometry'][0]['lon']);kind='tram_stop' if e['tags'].get('light_rail')=='yes' else 'bus_stop';near_place(kind,c,2,2)
   if kind=='tram_stop':near_place('tram',(c[0]+3,c[1]),2,4)
 for _ in range(80000):
  if len(houses)>=240:break
  x,y=RNG.randrange(1,COLS-5),RNG.randrange(1,ROWS-5)
  if zones.get((x,y)) in {'park','water'}:continue
  high=len(houses)%10==0;place('high_building' if high else RNG.choice(['house','house_blue','house_teal']),x,y,3,4 if high else 3,True)
 # Grid-aligned park equipment and city objects; every prop has a reachable approach.
 sizes={'car':(2,2),'bike':(1,1),'traffic_light':(1,2),'bench':(2,1),'playground_slide':(2,2),'playground_swings':(3,2),'lamp':(1,2),'fountain':(2,2)}
 for kind,(w,h) in sizes.items():
  made=0
  for _ in range(4000):
   if made>=({'car':18,'bike':14,'lamp':35}.get(kind,8)):break
   x,y=RNG.randrange(1,COLS-5),RNG.randrange(1,ROWS-5)
   if place(kind,x,y,w,h):made+=1
 for _ in range(18000):
  if len(scenery)>700:break
  x,y=RNG.randrange(1,COLS-3),RNG.randrange(1,ROWS-3);kind=RNG.choice(['tree','tree','shrub','flowers']);size=2 if kind=='tree' else 1
  place(kind,x,y,size,size)
 # Crossing tiles follow the direction of each selected orthogonal street segment.
 crossings=0
 for road in roads[::23]:
  route=geometry(road)
  for c in route[len(route)//2:]:
   if cells.get(c)!='road':continue
   im=sprite('crossing',T,T);a=route[max(0,route.index(c)-1)]
   if a[1]==c[1]:im=im.transpose(Image.Transpose.ROTATE_90)
   art.paste(im,(c[0]*T,c[1]*T),im);crossings+=1;break
 try:font=ImageFont.truetype('C:/Windows/Fonts/consolab.ttf',14)
 except OSError:font=ImageFont.load_default()
 for lat,lon,label in [(32.08880,34.87318,'KHEN ST'),(32.09054,34.87137,'TZAHAL ST'),(32.08913,34.86955,'HATSOARIM ST'),(32.08795,34.86810,'KAPLAN ST'),(32.09128,34.87520,'JABOTINSKY'),(32.09028,34.86928,'KAPLAN SCHOOL')]:
  c=nearest(cell(lat,lon));x,y=c[0]*T,c[1]*T;b=draw.textbbox((0,0),label,font=font);draw.rectangle((x,y,x+b[2]+10,y+T-1),fill='#fff7d6',outline='#344a58',width=2);draw.text((x+5,y+7),label,font=font,fill='#294159');scenery.append([*point(c),'sign',label])
 # Remove NPC routes crossing newly placed buildings, splitting at blocked cells.
 npc=[]
 for route in paths:
  section=[]
  for c in route:
   if c in cells:
    if not section or section[-1]!=c:section.append(c)
   else:
    if len(section)>1:npc.append([point(p) for p in section])
    section=[]
  if len(section)>1:npc.append([point(p) for p in section])
 bits=bytearray((COLS*ROWS+7)//8);mask=Image.new('L',(COLS,ROWS))
 for x,y in cells:idx=y*COLS+x;bits[idx>>3]|=1<<(idx&7);mask.putpixel((x,y),255)
 town={'width':W,'height':H,'gridSize':T,'mapRevision':'orthogonal-v1','maskScale':T,'maskWidth':COLS,'walkBits':base64.b64encode(bits).decode(),'bounds':{'south':SOUTH,'west':WEST,'north':NORTH,'east':EAST},'start':point(start),'school':point(school),'markers':markers,'npcPaths':npc,'houses':houses,'scenery':scenery,'placements':placements,'roadGrid':road_records,'osmTimestamp':roads_raw.get('osm3s',{}).get('timestamp_osm_base')}
 # Ensure all gameplay entrances remain reachable after the school footprint.
 reached=component(start)
 for anchor in [town['school'],*[m['point'] for m in markers],*[h['entry'] for h in houses]]:
  c=(anchor[0]//T,anchor[1]//T)
  if c not in reached:
   near=min(reached,key=lambda n:math.dist(n,c))
   for n in line(c,near):cells.setdefault(n,'path');paint(n,cells[n]);idx=n[1]*COLS+n[0];bits[idx>>3]|=1<<(idx&7);mask.putpixel(n,255)
   reached=component(start)
 town['walkBits']=base64.b64encode(bits).decode()
 town['roadCells']=[y*COLS+x for (x,y),kind in cells.items() if kind=='road']
 town['accessCells']=[y*COLS+x for (x,y),kind in cells.items() if kind=='access']
 for c,kind in cells.items():
  if kind=='access':paint(c,kind)
 art.save(ASSETS/'petah_tikva_town_map.png',optimize=True);mask.save(ASSETS/'walkmask.png',optimize=True)
 (ASSETS/'town_data.js').write_text('window.TOWN_DATA = '+json.dumps(town,separators=(',',':'))+';\n',encoding='utf-8')
 editor=ROOT/'editor/src/main/assets';shutil.copyfile(ASSETS/'petah_tikva_town_map.png',editor/'petah_tikva_town_map.png');shutil.copyfile(ASSETS/'map_grid.js',editor/'map_grid.js')
 (editor/'editor_config.js').write_text('window.EDITOR_TOWN = '+json.dumps({k:town[k] for k in ['width','height','start','school','mapRevision','roadCells','accessCells']}|{'markers':[m['point'] for m in markers]},separators=(',',':'))+';\n',encoding='utf-8')
 print(f'Grid: {len(roads)} mapped roads; {len(houses)} houses; {len(scenery)} props; {len(npc)} NPC routes; start {town["start"]}; school {town["school"]}')
if __name__=='__main__':main()
