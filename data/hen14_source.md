# Hen 14 location source

- Address-specific source fetched 2026-10-04: https://www.market2.co.il/lp/building/petah-tikva/%D7%97%D7%9F/14?street=%D7%97%D7%9F
- Its public Place / GeoCoordinates data and Google Maps link give latitude 32.089088, longitude 34.87253.
- Source map link: https://www.google.com/maps/search/?api=1&query=32.089088,34.87253
- Stored OSM Hen Street way 166968297 confirms the street. Nominatim returns only the street for address searches; its road centroid was not used as the building position.
- The point projects near [3839.67,2123.37] in the game world. The nearest existing building footprint center is house 59. Its preserved entrance [3856,2224] becomes the new-game start. This is a stylized grid building, not a surveyed real footprint.
- Existing house IDs/doorways, quest destinations, map bounds and roads are preserved. Existing saves retain their position.
