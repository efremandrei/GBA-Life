# City sources for v0.19.0

- Geometry and real names: data/petah_roads_raw.json and data/petah_landmarks_raw.json, OpenStreetMap / Overpass snapshot dated 2026-10-03. ODbL; copyright OpenStreetMap contributors.
- Station platform source ways: 1080139313 (Shenkar), 1199408614 and 1207603065 (Shaham), 1199409404 (Beilinson), 972249507 (Dankner), 1199408612 (Krol), 1199408613 (Pinsker). Close platforms are grouped; the centroid is projected onto the game street grid.
- Station names and west-to-east order: https://www.tevelmetro.co.il/stations/%D7%91%D7%99%D7%9C%D7%99%D7%A0%D7%A1%D7%95%D7%9F/ checked 2026-10-04; the operator page lists stations and confirms Beilinson at Jabotinsky 72, beside Rabin Medical Center, Ofer Grand Mall and Petah Tikva Park.
- NTA overview: https://www.nta.co.il/en/petah-tikva/ confirms Red Line stations mostly along Jabotinsky (search result checked 2026-10-04; direct fetch returned 403).
- Google Maps link in README was already used for earlier map design. Direct web fetch was unavailable this run.
- Live Overpass refresh attempts timed out or returned gateway/filter errors. The update uses the checked-in real-data snapshot rather than inventing new coordinates.
- Landmarks retain source IDs/name strings in town_data.js; names/centroids are projected to suitable grid positions. Homes are procedural density, not exact real building footprints. Rail alignment is an orthogonal interpretation connecting real platform locations on the game road network.
- A 180-second repeat and 10-second dwell are game mechanics, not a claim about real-world train frequency. One eastbound tram repeats from the west map edge to the east map edge; the six stations are within this map's bounds.
