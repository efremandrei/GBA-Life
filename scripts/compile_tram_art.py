"""Compile generated directional tram art into tiny runtime sprites."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'art/tram_directional_sheet_v19.png').convert('RGBA')
w,h=source.size;split=round(h*.33)
for name,col,row,size in [('right',0,0,(80,24)),('left',1,0,(80,24)),('down',0,1,(24,80)),('up',1,1,(24,80))]:
    frame=source.crop((col*w//2,0 if row==0 else split,(col+1)*w//2,split if row==0 else h))
    frame=frame.crop(frame.getchannel('A').point(lambda a:255 if a>64 else 0).getbbox()).resize(size,Image.Resampling.NEAREST)
    frame.putalpha(frame.getchannel('A').point(lambda a:255 if a>64 else 0))
    frame.save(ROOT/f'app/src/main/assets/tram_{name}.png',optimize=True)
