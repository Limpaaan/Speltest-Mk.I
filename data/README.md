# Kartdatabas

© OpenStreetMap contributors. OpenStreetMap-data är tillgängliga under Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/
https://www.openstreetmap.org/copyright

`avesta-osm.json` är ett utdrag hämtat via https://overpass-api.de/api/interpreter den 6 oktober 2026. Geografifrågan täcker 60.13 N, 16.13 E till 60.175 N, 16.23 E; namnfrågan använder ett något större område. Onödiga taggar och interna nodlistor har tagits bort; originalgeometri, OSM-ID, namn och relevanta karttaggar har behållits.

Den bearbetade databasen `shared/geography.json` är också tillgänglig under ODbL 1.0. `scripts/build-map.js` dokumenterar projektion, klippning, skala, urval och de två manuella, ungefärliga platshållarna. Källutdraget har inte flyttats till dessa platshållare. Se `docs/MAP.md` för källor per landmärke och aktuella begränsningar.

## Höjddata

`terrain-source-crop.json` är det ofiltrerade Avesta-utdraget ur den uppladdade Copernicus GLO-30-filen, med rastertransform och källfilens SHA-256. Detta utdrag omfattas av Copernicus-villkoren, **inte OSM:s ODbL**. Bearbetad höjdgrid ligger i `shared/terrain.json`. Se [höjddata och obligatoriska meddelanden](../docs/TERRAIN.md) samt [fullständig licens](../public/licenses/copernicus-dem.pdf). Bevara meddelandena och licensskyldigheterna vid vidare distribution.
