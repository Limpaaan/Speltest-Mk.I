# Avesta-kartan: källor och exakt status

Vägsträckningar, registrerade vägbroar, vattenytor och älvlinjer kommer från **OpenStreetMap**, hämtat **2026-10-06** via Overpass API. Spelet innehåller 2 890 vägsegment, 127 älvsegment och tio vattenpolygoner. Exporten och den bearbetade databasen finns i repot; kartan kräver inga externa anrop när man spelar.

Kartans geografiska avstånd är komprimerade **1:4**. Riktningar och relativa lägen för källbelagda punkter behålls i en lokal projektion, och höjder kommer från Copernicus GLO-30 DSM. Vägbredder, vissa vattenbredder, byggnadsstorlekar och 3D-utseenden är spelmässiga approximationer. Detta är inte en lantmäterimätning eller en fullständig digital tvilling av Avesta. Visade vapenavstånd gäller spelenheter.

Se [höjdimportens status](TERRAIN.md) och [granskade bildreferenser](VISUAL-REFERENCES.md).
Version 0.2 har texturerade fasader och en ombyggd Dalahäst; Street View-granskning
återstår. Version 0.4 integrerar höjder, 180 tolkade omgivningshus samt 950 träd och 90 stenblock med kollision. Vegetationen är procedurgenererad; enskilda träd och huslägen är inte uppmätta.

## Landmärken

| Spelplats   | Källa och koordinater                        | Status                                                                    |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Aalto-huset | OSM way/132486267 · 60.1446593, 16.1770483   | Position från byggnadens OSM-centrum                                      |
| Verket      | OSM node/9868272526 · 60.1489142, 16.1717242 | Kartpunkten Verket/Avesta Art                                             |
| Koppardalen | OSM way/132515278 · 60.1480988, 16.1813393   | Centrum för OSM-objektet med detta namn; inte en verifierad byggnadsentré |
| Dalahästen  | OSM node/3222383605 · 60.1525366, 16.2003864 | Kartpunkt med namnet Dalahästen                                           |
| Prästjorden | OSM node/4577465252 · 60.140789, 16.1527563  | Områdespunkt; spelbyggnaden är en symbol                                  |
| Skogsbo     | OSM node/1896051103 · 60.1594034, 16.1838947 | Områdespunkt; spelbyggnaden är en symbol                                  |
| ~ Plushuset | Spelmässig platshållare                      | Saknades i OSM-namnfrågan; behöver separat verifiering                    |
| ~ Åsbo      | Spelmässig platshållare                      | Områdets avsedda spelcentrum behöver separat verifiering                  |

Ytterligare källbelagda kartpunkter i 0.4:

| Plats                    | OSM-ID          | Utförande                                  |
| ------------------------ | --------------- | ------------------------------------------ |
| Skogsbo skola            | way/165548511   | Tolkad skolbyggnad vid OSM-centrum         |
| Skogsbo skola idrottssal | way/165548549   | Tolkad hall vid OSM-centrum                |
| Skogsbo Skola Matsal     | way/1019516058  | Tolkad byggnad vid OSM-centrum             |
| Åsbobacken               | node/2665372581 | Skyltad kartpunkt i den uppmätta terrängen |

Dessa finns i det ursprungliga kartutdraget. Inga nya fasadfotografier har kunnat hämtas: Google Maps och Avesta kommun nekades av nätverksproxyn den 8 oktober 2026. Skolmodellerna ska inte förväxlas med verifierade exteriörer.

`~` visas både i 3D-vyn och på översiktskartan för de två ungefärliga platserna. Endast koordinater med OSM-ID anges här som källbelagda. Namnträffar är inte oberoende kontroll mot officiella ritningar, aktuella byggnader eller lokalkännedom.

## Datapipeline och reproduktion

- `data/avesta-osm.json`: daterat källutdrag med objekt-ID, originalkoordinater och relevanta taggar.
- `node scripts/build-map.js`: reproducerar `shared/geography.json` från det incheckade utdraget, inklusive de två uttryckliga platshållarna.
- `shared/map.js`: gemensam geometri för rendering, kollisioner, skyddszon, broövergångar och PvP-arena.
- `npm run map:import`: hämtar en **ny kandidat** till `.local/avesta-osm-candidate.json`. Uppdaterar inte automatiskt spelkartan eller de incheckade källfilerna.
- `npm run map:import -- --input data/avesta-osm.json`: prövar importen utan nätverk.

Liveimporten behöver `curl`, TLS-verifiering och åtkomst till **overpass-api.de**. POST med JSON-Accept används; GET gav HTTP 406 under installationen. Offentliga Overpass-servrar kan returnera 429/504 vid belastning; en ofullständig hämtning ersätter inga kartfiler. Geografi och namn hämtas separat för mindre frågor. Den ursprungliga nätverksbegränsningen löstes och kartdata hämtades därefter framgångsrikt.

## Kvarvarande geografiskt arbete

1. Verifiera Plushuset och Åsbo med belagda källor och gärna lokalkännedom.
2. Importera fullständiga vattenrelationer inklusive öar och verkliga strandlinjer. Där polygoner saknas används älvens kartlinje med förenklad bredd. Vissa smala kanaler och vattendrag kan därför avvika.
3. Komplettera gång-/cykelbroar och detaljgranska bro-/vattenhöjder. Nuvarande vägfråga täcker huvud-, sekundär-, tertiär-, stam- och bostadsvägar.
4. Verifiera alla spelvägar, bossarenor och framkomlighet mot geografin. Anpassa AI-pathfinding till vatten och byggnader.
5. Skapa mer igenkännbara, rättighetsmässigt tillåtna modeller av varje landmärke.

## Licens och tillgänglighet

Kartdatabasen är **© OpenStreetMap contributors**, tillgänglig under **Open Database License (ODbL) 1.0**. Se [OSM:s upphovsrättssida](https://www.openstreetmap.org/copyright) och [licenstexten](https://opendatacommons.org/licenses/odbl/1-0/).

Attribuering visas alltid i spelet. Produktionsbygget tillhandahåller `/map-source.json` (källutdrag), `/map-database.json` (bearbetad databas) och `/NOTICE-OSM.txt` (licensmeddelande), även i offlinecachen. Dessa kartdatabaser omfattas av ODbL; projektets egen kod och konst har separat upphovsrätt. Originalkoordinater och ID gör ändringarna spårbara.
