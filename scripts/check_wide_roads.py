from PIL import Image
from grid_surfaces import surface, road_connection_mask
for w,h in [(2,12),(12,2),(3,12),(12,3),(4,4)]:
    cells={(x,y):'road' for y in range(h) for x in range(w)}
    out=Image.new('RGBA',(32*w,32*h))
    for c in cells:out.paste(surface(road_connection_mask(c,cells)),(c[0]*32,c[1]*32))
    asphalt={(175,184,181,255),(185,193,190,255)}
    for y in range(5,32*h-5):
        for x in range(5,32*w-5):
            assert out.getpixel((x,y)) in asphalt,(w,h,x,y,out.getpixel((x,y)))
print('PASS: wide vertical/horizontal roads have continuous asphalt with no interior beige squares or curb islands')

for mask in range(256):
    image=surface(mask)
    for required,pixel in [(1|2|16,(31,0)),(2|4|32,(31,31)),(4|8|64,(0,31)),(8|1|128,(0,0))]:
        expected=(mask&required)==required
        assert (image.getpixel(pixel) in asphalt)==expected,(mask,pixel)
print('PASS: all 256 neighbor patterns fill road interiors while preserving outside corners')
