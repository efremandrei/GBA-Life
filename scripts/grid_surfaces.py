"""Code-native, seamless grid surfaces. Bits: north=1, east=2, south=4, west=8."""
from PIL import Image, ImageDraw

def surface(mask, access=False):
    image=Image.new('RGBA',(32,32),'#91dc78' if access else '#d5c8ae')
    fill=Image.new('1',(32,32));d=ImageDraw.Draw(fill)
    d.rectangle((4,4,27,27),fill=1)
    for bit,rect in [(1,(4,0,27,4)),(2,(27,4,31,27)),(4,(4,27,27,31)),(8,(0,4,4,27))]:
        if mask&bit:d.rectangle(rect,fill=1)
    pixels=image.load()
    for y in range(32):
        for x in range(32):
            if not fill.getpixel((x,y)):continue
            edge=any(0<=a<32 and 0<=b<32 and not fill.getpixel((a,b)) for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
            tx,ty=x%31,y%31
            if edge:color='#b4a58c' if access else '#8e9694'
            elif access:color='#bfb097' if tx%8==0 or ty%8==0 else '#d8c8ac' if (tx//8+ty//8)%2 else '#d2c1a5'
            else:color='#afb8b5' if (tx*13+ty*7)%29<2 else '#b9c1be'
            pixels[x,y]=tuple(bytes.fromhex(color[1:]))+(255,)
    return image

def connection_mask(c,cells,kinds):
    x,y=c
    return sum(bit for bit,n in [(1,(x,y-1)),(2,(x+1,y)),(4,(x,y+1)),(8,(x-1,y))] if cells.get(n) in kinds)
