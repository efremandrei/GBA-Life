"""Source-backed labels and a grid rail corridor projected onto the existing street network."""
import heapq,math
from PIL import ImageDraw,ImageFont

def rail_network(roads_raw,cells,placements,cell,point):
    groups=[]
    platforms=sorted([e for e in roads_raw['elements'] if e.get('tags',{}).get('light_rail')=='yes' and e['tags'].get('public_transport')=='platform'],key=lambda e:e['geometry'][0]['lon'])
    for e in platforms:
        g=e['geometry'];lat=sum(p['lat'] for p in g)/len(g);lon=sum(p['lon'] for p in g)/len(g)
        if groups and math.hypot(groups[-1]['lat']-lat,groups[-1]['lon']-lon)<.0005:groups[-1]['osmIds'].append(e['id'])
        else:groups.append({'lat':lat,'lon':lon,'osmIds':[e['id']]})
    names=['Shenkar','Shaham','Beilinson','Dankner','Krol','Pinsker']
    if len(groups)!=len(names):raise ValueError('Platform grouping changed; verify official station order')
    blocked=set()
    for p in placements:
        x,y,w,h=p['rect'];blocked.update((a,b) for a in range(x//32,(x+w)//32) for b in range(y//32,(y+h)//32))
    allowed={c:kind for c,kind in cells.items() if c not in blocked}
    road_cells=[c for c,k in allowed.items() if k=='road']
    def closest(c):return min(road_cells,key=lambda n:math.dist(c,n))
    def route(a,b):
        queue=[(0,a)];cost={a:0};parent={a:None}
        while queue:
            score,c=heapq.heappop(queue)
            if score!=cost[c]:continue
            if c==b:break
            x,y=c
            for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if n not in allowed:continue
                new=score+(1 if allowed[n]=='road' else 12)
                if new<cost.get(n,math.inf):cost[n]=new;parent[n]=c;heapq.heappush(queue,(new,n))
        if b not in parent:raise ValueError('Mapped station route disconnected')
        path=[];c=b
        while c is not None:path.append(c);c=parent[c]
        return path[::-1]
    stops=[]
    for name,g in zip(names,groups):
        c=closest(cell(g['lat'],g['lon']));stops.append({**g,'name':name,'point':point(c),'cell':c,'source':'https://www.tevelmetro.co.il/stations/'})
    path=[]
    for a,b in zip(stops,stops[1:]):path.extend(route(a['cell'],b['cell'])[:-1])
    path.append(stops[-1]['cell'])
    # Extend toward the world edges along mapped streets so the repeating tram enters/exits the town.
    western=min(road_cells,key=lambda c:c[0]+abs(c[1]-stops[0]['cell'][1])*3)
    eastern=min(road_cells,key=lambda c:255-c[0]+abs(c[1]-stops[-1]['cell'][1])*3)
    path=route(western,stops[0]['cell'])[:-1]+path+route(stops[-1]['cell'],eastern)[1:]
    for stop in stops:
        stop['distance']=path.index(stop.pop('cell'))*32
    return {'path':[point(c) for c in path],'stops':stops,'period':180,'dwell':10,'source':'Stored OSM light-rail platforms and street geometry; names checked against Tevel Metro station order'},set(path)

def paint_rails(art,rail):
    draw=ImageDraw.Draw(art)
    for stop in rail['stops']:
        x,y,w,h=stop['platformRect']
        draw.rectangle((x,y,x+w-1,y+h-1),fill='#dce1da',outline='#667c7d',width=2)
        for offset in range(12,w,12):draw.line((x+offset,y+2,x+offset,y+h-3),fill='#aab6b1')
        for offset in range(12,h,12):draw.line((x+2,y+offset,x+w-3,y+offset),fill='#aab6b1')
        if w>h:draw.line((x+3,y+3,x+w-4,y+3),fill='#eac546',width=2)
        else:draw.line((x+3,y+3,x+3,y+h-4),fill='#eac546',width=2)
    # Timber sleepers and paired metal rails, following every orthogonal turn.
    path=rail['path']
    for i,(x,y) in enumerate(path):
        prev=path[max(0,i-1)];nxt=path[min(len(path)-1,i+1)]
        horizontal=prev[1]==y==nxt[1]
        for off in [-12,-4,4,12]:
            rect=(x+off-1,y-11,x+off+1,y+11) if horizontal else (x-11,y+off-1,x+11,y+off+1)
            draw.rectangle(rect,fill='#71695a')
    for side in [-1,1]:
        rail_points=[]
        for i,(x,y) in enumerate(path):
            a=path[max(0,i-1)];b=path[min(len(path)-1,i+1)]
            incoming=((x-a[0])//32,(y-a[1])//32) if i else ((b[0]-x)//32,(b[1]-y)//32)
            outgoing=((b[0]-x)//32,(b[1]-y)//32) if i<len(path)-1 else incoming
            normal=(-incoming[1],incoming[0]);next_normal=(-outgoing[1],outgoing[0])
            if outgoing!=incoming:normal=(normal[0]+next_normal[0],normal[1]+next_normal[1])
            rail_points.append((x+side*7*normal[0],y+side*7*normal[1]))
        draw.line(rail_points,fill='#404c53',width=3)
        draw.line(rail_points,fill='#d4dedc',width=1)



def signs(art,road_records,cells,point,landmarks):
    try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',11)
    except OSError:font=ImageFont.load_default()
    draw=ImageDraw.Draw(art);result=[];names=set();positions=[]
    for road in sorted(road_records,key=lambda r:-len(r['cells'])):
        name=road['name'].strip()
        if not name or name in names or len(road['cells'])<4:continue
        route=[tuple(c) for c in road['cells'] if tuple(c) in cells]
        candidates=sorted(route,key=lambda c:abs(route.index(c)-len(route)//2))
        c=next((c for c in candidates if all(math.dist(point(c),p)>96 for p in positions)),None)
        if not c:continue
        x,y=point(c);names.add(name);positions.append([x,y]);result.append({'name':name,'point':[x,y],'osmId':road['id']})
    for info in result+landmarks:
        name=info['name'];x,y=info['point'];is_landmark=info in landmarks
        display=name if not any('\u0590'<=c<='\u05ff' for c in name) else name[::-1]
        width=min(144,max(48,round(draw.textlength(display,font=font))+10))
        draw.rectangle((x-1,y-17,x+1,y),fill='#344c55')
        draw.rectangle((x-width//2,y-34,x+width//2,y-17),fill='#fff4d1' if is_landmark else '#e5f3ef',outline='#344c55',width=2)
        # Clip long names to the board; the interaction displays the complete source name.
        while draw.textlength(display,font=font)>width-8:display=display[:-2]+'…'
        draw.text((x-width//2+4,y-32),display,font=font,fill='#283f49')
    return result
