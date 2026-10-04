"""Validate exported tile seams and the 24px access paving contract."""
from grid_surfaces import surface
for access in [False, True]:
    for mask in range(16):
        image=surface(mask,access)
        if mask&2:
            neighbour=surface(8,access)
            assert [image.getpixel((31,y)) for y in range(32)]==[neighbour.getpixel((0,y)) for y in range(32)]
        if mask&4:
            neighbour=surface(1,access)
            assert [image.getpixel((x,31)) for x in range(32)]==[neighbour.getpixel((x,0)) for x in range(32)]
assert sum(surface(5,True).getpixel((x,0))!=(145,220,120,255) for x in range(32))==24
print('PASS: 32 road/access masks have matching connected edges; access paving width is 24px')
