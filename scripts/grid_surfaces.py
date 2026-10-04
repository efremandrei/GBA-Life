"""Code-native, seamless grid surfaces. Bits: north=1, east=2, south=4, west=8."""
from PIL import Image, ImageDraw
from functools import lru_cache

@lru_cache(maxsize=288)
def surface(mask, access=False, sidewalk=False):
    image=Image.new('RGBA',(32,32),'#91dc78' if access or sidewalk else '#d5c8ae')
    fill=Image.new('1',(32,32));d=ImageDraw.Draw(fill)
    d.rectangle((4,4,27,27),fill=1)
    for bit,rect in [(1,(4,0,27,4)),(2,(27,4,31,27)),(4,(4,27,27,31)),(8,(0,4,4,27))]:
        if mask&bit:d.rectangle(rect,fill=1)
    # Fill an inner corner only when both bordering edges AND the diagonal
    # belong to the road. Four tiles meeting inside a wide road must not expose
    # their beige outside corners as a repeated island.
    if not access and not sidewalk:
        for required,rect in [(1|2|16,(28,0,31,3)),(2|4|32,(28,28,31,31)),
                              (4|8|64,(0,28,3,31)),(8|1|128,(0,0,3,3))]:
            if mask & required == required:d.rectangle(rect,fill=1)
    pixels=image.load()
    for y in range(32):
        for x in range(32):
            if not fill.getpixel((x,y)):continue
            edge=any(0<=a<32 and 0<=b<32 and not fill.getpixel((a,b)) for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
            tx,ty=x%31,y%31
            if edge:color='#a79d89' if sidewalk else '#b4a58c' if access else '#8e9694'
            elif sidewalk:color='#c4b8a3' if tx%8==0 or ty%8==0 else '#ded2bc' if (tx//8+ty//8)%2 else '#d8ccb5'
            elif access:color='#bfb097' if tx%8==0 or ty%8==0 else '#d8c8ac' if (tx//8+ty//8)%2 else '#d2c1a5'
            else:color='#afb8b5' if (tx*13+ty*7)%29<2 else '#b9c1be'
            pixels[x,y]=tuple(bytes.fromhex(color[1:]))+(255,)
    return image

def connection_mask(c,cells,kinds):
    x,y=c
    return sum(bit for bit,n in [(1,(x,y-1)),(2,(x+1,y)),(4,(x,y+1)),(8,(x-1,y))] if cells.get(n) in kinds)


def road_connection_mask(c,cells):
    x,y=c
    return connection_mask(c,cells,{'road'}) + sum(bit for bit,n in
        [(16,(x+1,y-1)),(32,(x+1,y+1)),(64,(x-1,y+1)),(128,(x-1,y-1))]
        if cells.get(n)=='road')
