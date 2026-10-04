from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'app/src/main/assets'
def split_map(source=None):
    source=source or ROOT/'editor/src/main/assets/petah_tikva_town_map.png'
    with Image.open(source) as art:
        size=1024
        out=ASSETS/'town_blocks';out.mkdir(exist_ok=True)
        for y in range(0,art.height,size):
            for x in range(0,art.width,size):
                art.crop((x,y,min(x+size,art.width),min(y+size,art.height))).save(out/f'{x//size}_{y//size}.png',optimize=True)
        art.resize((640,360),Image.Resampling.NEAREST).save(ASSETS/'town_overview.png',optimize=True)
        manifest={'width':art.width,'height':art.height,'blockSize':size,'columns':(art.width+size-1)//size,'rows':(art.height+size-1)//size}
        (ASSETS/'town_blocks.js').write_text('window.TOWN_BLOCKS = '+json.dumps(manifest)+';\n',encoding='utf-8')
    print('Map split into',manifest['columns']*manifest['rows'],'blocks')
if __name__=='__main__':split_map()
