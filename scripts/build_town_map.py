"""Build an orthogonal 32px town from the stored OSM snapshot (ODbL).
Street connectivity and landmark geography are retained as a stylized grid.
"""
from pathlib import Path
import json, base64, random, shutil, math
from collections import deque
from PIL import Image
from grid_surfaces import surface, connection_mask, road_connection_mask
from city_features import rail_network, paint_rails, signs
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
 art=Image.new('RGB',(W,H))
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
  if kind=='road':im=surface(road_connection_mask(c,cells))
  elif kind=='sidewalk':im=surface(connection_mask(c,cells,{'sidewalk','access','path','plaza','crossing'}),sidewalk=True)
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
 # Upgrade existing homes upward so IDs, doorways and saved house visits stay stable.
 candidates=sorted(enumerate(houses),key=lambda pair:(pair[0]*73)%241)
 for index,house in candidates:
  if sum(h['roof']=='high_building' for h in houses)>=80:break
  if house['roof']=='high_building':continue
  bx,by,bw,bh=house['bounds'];x,y=bx//T,by//T
  extra={(xx,y-1) for xx in range(x,x+3)}
  if y<=1 or extra & used or any(zones.get(c) in {'park','water'} for c in extra):continue
  for xx in range(x,x+3):
   for yy in range(y-1,y+3):art.paste(terrain['grass'],(xx*T,yy*T))
  im=sprite('high_building',96,128)
  im.paste(terrain['grass'].crop((0,0,32,16)),(32,112))
  im.paste(surface(5,True).crop((4,0,28,16)),(36,112))
  art.paste(im,(bx,by-T),im);used.update(extra)
  placement=next(p for p in placements if p['rect']==house['bounds'])
  house['roof']='high_building';house['bounds']=[bx,by-T,bw,128]
  placement['kind']='high_building';placement['rect']=house['bounds'].copy()
 # Grid-aligned park equipment and city objects; every prop has a reachable approach.
 sizes={'car':(2,2),'bike':(1,1),'traffic_light':(1,2),'bench':(2,1),'playground_slide':(2,2),'playground_swings':(3,2),'lamp':(1,2),'fountain':(2,2)}
 for kind,(w,h) in sizes.items():
  made=0
  for _ in range(4000):
   if made>=({'car':18,'bike':14,'lamp':35}.get(kind,8)):break
   x,y=RNG.randrange(1,COLS-5),RNG.randrange(1,ROWS-5)
   if place(kind,x,y,w,h):made+=1
 # Reserve a clear, paved route from original doorways before filling city lots.
 def connect_doors():
  blocked=set()
  for p in placements:
   px,py,pw,ph=p['rect'];blocked.update((xx,yy) for xx in range(px//T,(px+pw)//T) for yy in range(py//T,(py+ph)//T))
  for house in houses:
   door=(house['entry'][0]//T,house['entry'][1]//T)
   q=deque([door]);parent={door:None};goal=None
   while q:
    c=q.popleft()
    if cells.get(c)=='road':goal=c;break
    x,y=c
    for n in [(x-1,y),(x+1,y),(x,y+1),(x,y-1)]:
     if n in parent or n in blocked or not(0<=n[0]<COLS and 0<=n[1]<ROWS) or zones.get(n)=='water':continue
     parent[n]=c;q.append(n)
   if goal is None:raise ValueError(f'House doorway cannot reach street: {door}')
   c=goal
   while c is not None:
    cells.setdefault(c,'access');used.add(c);paint(c,cells[c]);c=parent[c]
 connect_doors()
 # Retire the old stationary tram decorations; the service now animates them.
 for parked in [p for p in placements if p['kind']=='tram']:
  px,py,pw,ph=parked['rect']
  for xx in range(px//T,(px+pw)//T):
   for yy in range(py//T,(py+ph)//T):
    art.paste(terrain['grass'],(xx*T,yy*T))
    if (xx,yy) not in cells:used.discard((xx,yy))
  placements.remove(parked)
  scenery[:]=[item for item in scenery if not(item[2]=='tram' and item[:2]==parked['entry'])]
 # Retain the original 240 house IDs, then fill city gaps with additional housing.
 rail,rail_cells=rail_network(roads_raw,cells,placements,cell,point)
 platform_blocked={(xx,yy) for p in placements for xx in range(p['rect'][0]//T,(p['rect'][0]+p['rect'][2])//T) for yy in range(p['rect'][1]//T,(p['rect'][1]+p['rect'][3])//T)}
 for stop in rail['stops']:
  index=stop['distance']//T;a=rail['path'][max(0,index-1)];b=rail['path'][min(len(rail['path'])-1,index+1)]
  horizontal=a[1]==b[1];cx,cy=stop['point'][0]//T,stop['point'][1]//T
  options=[[(cx+d,cy+side) if horizontal else (cx+side,cy+d) for d in [-1,0,1]] for side in [1,-1]]
  pad=next((p for p in options if all(c not in platform_blocked and zones.get(c)!='water' and 0<=c[0]<COLS and 0<=c[1]<ROWS for c in p)),None)
  if pad is None:raise ValueError('No safe platform at '+stop['name'])
  for c in pad:cells.setdefault(c,'sidewalk');used.add(c);paint(c,cells[c])
  stop['platformRect']=[min(c[0] for c in pad)*T+2,min(c[1] for c in pad)*T+2,92 if horizontal else 28,28 if horizontal else 92]

 landmarks=[{'name':'Kaplan School','point':point(school),'kind':'school','source':'existing mapped campus'}]
 for e in places:
  tags=e.get('tags',{});name=tags.get('name:en',tags.get('name'))
  g=e.get('geometry',[])
  if not name or not g:continue
  lat=sum(p['lat'] for p in g)/len(g);lon=sum(p['lon'] for p in g)/len(g)
  if not SOUTH<=lat<=NORTH or not WEST<=lon<=EAST:continue
  c=cell(lat,lon);kind=tags.get('amenity')
  if kind=='hospital':
   existing=[p for p in placements if p['kind']=='hospital']
   if existing:
    landmark=min(existing,key=lambda p:math.dist(p['entry'],point(c)))
    landmarks.append({'name':name,'point':landmark['entry'],'kind':'hospital','osmId':e['id']})
  elif kind=='school':
   before=len(placements)
   if near_place('school',c,5,4):landmarks.append({'name':name,'point':placements[before]['entry'],'kind':'school','osmId':e['id']})
  elif tags.get('leisure') in {'park','garden'}:
   landmarks.append({'name':name,'point':point(nearest(c)),'kind':'park','osmId':e['id']})
 for _ in range(120000):
  if len(houses)>=600:break
  x,y=RNG.randrange(1,COLS-5),RNG.randrange(1,ROWS-5)
  if zones.get((x,y)) in {'park','water'}:continue
  high=len(houses)%3!=0;w,h=3,4 if high else 3
  if any((xx,yy) in rail_cells for xx in range(x,x+w) for yy in range(y,y+h)):continue
  place('high_building' if high else RNG.choice(['house','house_blue','house_teal']),x,y,w,h,True)
 connect_doors()
 for _ in range(18000):
  if len(scenery)>700:break
  x,y=RNG.randrange(1,COLS-3),RNG.randrange(1,ROWS-3);kind=RNG.choice(['tree','tree','shrub','flowers']);size=2 if kind=='tree' else 1
  place(kind,x,y,size,size)
 # An approach must not make its own building or a later prop walkable.
 for placement in placements:
  px,py,pw,ph=placement['rect']
  for x in range(px//T,(px+pw)//T):
   for y in range(py//T,(py+ph)//T):cells.pop((x,y),None)
 # Resolve sidewalk joins after all approaches and buildings are in place.
 for c,kind in cells.items():
  if kind=='sidewalk':paint(c,kind)
 # Crossing tiles follow the direction of each selected orthogonal street segment.
 crossings=0;crossing_cells=set()
 for road in roads[::23]:
  route=geometry(road)
  for c in route[len(route)//2:]:
   if cells.get(c)!='road':continue
   im=sprite('crossing',T,T);a=route[max(0,route.index(c)-1)]
   if a[1]==c[1]:im=im.transpose(Image.Transpose.ROTATE_90)
   art.paste(im,(c[0]*T,c[1]*T),im);crossings+=1;crossing_cells.add(c);break
 # Park cars inside straight road cells, leaving crossings, intersections and entrances clear.
 vehicles=[];protected=[point(start),point(school),*[m['point'] for m in markers],*[h['entry'] for h in houses]]
 vehicle_cells=[]
 for x,y in sorted(cells,key=lambda c:(c[0]*101+c[1]*37)%997):
  if len(vehicles)>=48:break
  if cells[x,y]!='road' or (x,y) in crossing_cells or (x,y) in rail_cells:continue
  road_mask=connection_mask((x,y),cells,{'road'})
  if road_mask not in {5,10}:continue
  sides=[(x-1,y),(x+1,y)] if road_mask==5 else [(x,y-1),(x,y+1)]
  if not all(cells.get(c)=='sidewalk' for c in sides):continue
  if any(math.dist(point((x,y)),p)<96 for p in protected):continue
  if any(math.dist((x,y),c)<8 for c in vehicle_cells):continue
  orientation='vertical' if road_mask==5 else 'horizontal'
  im=sprite('car',20,30)
  if orientation=='horizontal':im=im.transpose(Image.Transpose.ROTATE_90)
  px,py=x*T+(T-im.width)//2,y*T+(T-im.height)//2
  art.paste(im,(px,py),im)
  rect=[px,py,im.width,im.height]
  vehicles.append({'rect':rect,'cell':y*COLS+x,'orientation':orientation})
  vehicle_cells.append((x,y));scenery.append([*point((x,y)),'car'])
 paint_rails(art,rail)
 street_signs=signs(art,road_records,cells,point,landmarks)
 for sign in street_signs:scenery.append([*sign['point'],'sign',sign['name']])
 for landmark in landmarks:scenery.append([*landmark['point'],'landmark',landmark['name']])
 for stop in rail['stops']:scenery.append([*stop['point'],'tram_stop',stop['name']])
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
 # Hen 14 address coordinate from the address-specific public map entry.
 # Match its grid projection to the nearest existing building footprint;
 # preserve all house IDs, collision and entry coordinates.
 home_lat,home_lon=32.089088,34.87253
 target=point(cell(home_lat,home_lon))
 home_id=min(range(len(houses)),key=lambda i:math.dist(
  [houses[i]['bounds'][0]+houses[i]['bounds'][2]/2,houses[i]['bounds'][1]+houses[i]['bounds'][3]/2],target))
 home=houses[home_id];home['address']='Hen 14';home['name']='Hen 14'
 start=(home['entry'][0]//T,home['entry'][1]//T)
 from PIL import ImageDraw
 hd=ImageDraw.Draw(art);hx,hy=home['entry']
 hd.rectangle((hx-23,hy-35,hx+23,hy-21),fill='#fff1ce',outline='#344e57',width=2)
 hd.text((hx-18,hy-33),'Hen 14',fill='#283e47')
 home_info={'houseId':home_id,'address':'Hen 14','lat':home_lat,'lon':home_lon,
  'entry':home['entry'],'source':'https://www.market2.co.il/lp/building/petah-tikva/%D7%97%D7%9F/14?street=%D7%97%D7%9F',
  'placement':'nearest grid building footprint to address map point'}
 bits=bytearray((COLS*ROWS+7)//8);mask=Image.new('L',(COLS,ROWS))
 for x,y in cells:idx=y*COLS+x;bits[idx>>3]|=1<<(idx&7);mask.putpixel((x,y),255)
 town={'width':W,'height':H,'gridSize':T,'mapRevision':'orthogonal-v1','maskScale':T,'maskWidth':COLS,'walkBits':base64.b64encode(bits).decode(),'bounds':{'south':SOUTH,'west':WEST,'north':NORTH,'east':EAST},'start':point(start),'home':home_info,'school':point(school),'markers':markers,'npcPaths':npc,'houses':houses,'scenery':scenery,'placements':placements,'vehicles':vehicles,'rail':rail,'landmarks':landmarks,'streetSigns':street_signs,'roadGrid':road_records,'osmTimestamp':roads_raw.get('osm3s',{}).get('timestamp_osm_base')}
 # Grass connects walking areas without painting shortcut paths over object footprints.
 # Open grass is a separate small mask; object footprints and water stay blocked.
 grass_bits=bytearray((COLS*ROWS+7)//8)
 for y in range(ROWS):
  for x in range(COLS):
   if (x,y) not in used and (x,y) not in cells and zones.get((x,y))!='water':
    index=y*COLS+x;grass_bits[index>>3]|=1<<(index&7)
 town['grassBits']=base64.b64encode(grass_bits).decode()
 town['walkBits']=base64.b64encode(bits).decode()
 town['roadCells']=[y*COLS+x for (x,y),kind in cells.items() if kind=='road']
 town['pavingCells']=[y*COLS+x for (x,y),kind in cells.items() if kind in {'path','plaza'}]
 town['sidewalkCells']=[y*COLS+x for (x,y),kind in cells.items() if kind=='sidewalk']
 town['accessCells']=[y*COLS+x for (x,y),kind in cells.items() if kind=='access']
 for c,kind in cells.items():
  if kind=='access':paint(c,kind)
 paint_rails(art,rail)
 art.save(ROOT/'editor/src/main/assets/petah_tikva_town_map.png',optimize=True);mask.save(ASSETS/'walkmask.png',optimize=True)
 (ASSETS/'town_data.js').write_text('window.TOWN_DATA = '+json.dumps(town,separators=(',',':'))+';\n',encoding='utf-8')
 from split_town_map import split_map
 split_map()
 editor=ROOT/'editor/src/main/assets';shutil.copyfile(ASSETS/'map_grid.js',editor/'map_grid.js')
 (editor/'editor_config.js').write_text('window.EDITOR_TOWN = '+json.dumps({k:town[k] for k in ['width','height','start','school','mapRevision','roadCells','accessCells','sidewalkCells','pavingCells']}|{'markers':[m['point'] for m in markers]},separators=(',',':'))+';\n',encoding='utf-8')
 print(f'Grid: {len(roads)} mapped roads; {len(houses)} houses; {len(scenery)} props; {len(npc)} NPC routes; start {town["start"]}; school {town["school"]}')
if __name__=='__main__':main()
