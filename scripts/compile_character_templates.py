"""Compile generated sprite atlases into embedded RGBA/material data for offline WebView recoloring.
No runtime image readback is required (file:// canvases can be tainted on Android).
"""
from pathlib import Path
from PIL import Image
from collections import deque
import colorsys,base64,json,statistics
ROOT=Path(__file__).resolve().parents[1]
STYLES=['short','bob','shoulder','long','curly','ponytail','bald']
DIRECTIONS=['down','up','left','right']
ROW_BOUNDS=[0,276,509,729,949]
result={}
for bag,file in [('bag','character_templates_v15.png'),('plain','character_templates_nobag_v15.png')]:
 image=Image.open(ROOT/'art'/file).convert('RGBA')
 assert image.size==(1657,949),image.size
 for row,facing in enumerate(DIRECTIONS):
  for col,style in enumerate(STYLES):
   frame=image.crop((round(col*image.width/7),ROW_BOUNDS[row],round((col+1)*image.width/7),ROW_BOUNDS[row+1]))
   # Ignore generation fringes and detached single-pixel specks.
   opaque={(x,y) for y in range(frame.height) for x in range(frame.width) if frame.getpixel((x,y))[3]>=200}
   components=[]
   while opaque:
    start=opaque.pop();component={start};queue=deque([start])
    while queue:
     x,y=queue.popleft()
     for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
      if n in opaque:opaque.remove(n);component.add(n);queue.append(n)
    components.append(component)
   body=max(components,key=len);box=(min(x for x,y in body),min(y for x,y in body),max(x for x,y in body)+1,max(y for x,y in body)+1)
   frame=frame.crop(box)
   frame=frame.resize((28,44),Image.Resampling.NEAREST)
   canvas=Image.new('RGBA',(32,48));canvas.paste(frame,(2,2))
   rgba=bytearray(canvas.tobytes());materials=bytearray(32*48);brightness={i:[] for i in range(1,7)}
   for y in range(48):
    for x in range(32):
     i=y*32+x;r,g,b,a=rgba[i*4:i*4+4]
     if a<200:rgba[i*4:i*4+4]=bytes(4);continue
     rgba[i*4+3]=255
     hue,sat,val=colorsys.rgb_to_hsv(r/255,g/255,b/255)
     material=0
     if sat>.22 and val>.13:
      if .72<=hue<=.90:material=1 # hair
      elif .43<=hue<.60:material=2 # jacket
      elif .60<=hue<.72:material=3 # trousers
      elif hue<.045 or hue>.90:material=4 # backpack
      elif .045<=hue<.17 and y<41:material=5 # skin (boots retain brown)
      elif .20<=hue<.43:material=6 # irises
     materials[i]=material
     if material:brightness[material].append(max(r,g,b))
   medians=[0]+[statistics.median(brightness[i]) if brightness[i] else 128 for i in range(1,7)]
   result[f'{bag}:{style}:{facing}']={'rgba':base64.b64encode(rgba).decode(),'materials':base64.b64encode(materials).decode(),'medians':medians}
(ROOT/'app/src/main/assets/character_templates.js').write_text('window.CHARACTER_TEMPLATES = '+json.dumps(result,separators=(',',':'))+';\n')
print(f'Compiled {len(result)} detailed sprite templates with recoloring masks')
