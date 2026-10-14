# Vägar och järnväg, version 0.9

Transportgeometrin kommer från OpenStreetMap, hämtad 13 oktober 2026. Originalsvaret finns i `data/avesta-transport-osm.json`; `shared/transport.json` anger dess SHA-256, ursprung, skala, tidsstämpel och licens. Importen omfattar 1 039 unika OSM-vägar med väg- eller järnvägstaggar. Den spelbara kartans gräns klipper geometrin till ±2 280 meter, med samma ursprung som terrängen, 60.148° N, 16.178° E.

En spelenhet motsvarar en meter. Den bearbetade filen innehåller 4 898 vägsegment och 61 järnvägssträckor: 57 sträckor med räls och fyra sträckor taggade `disused`. Tre järnvägsbroar är taggade i underlaget. En tunnel visas inte som räls ovan mark. Övergivna banvallar som i dag är cykelvägar visas som vägar; vi lägger inte tillbaka järnvägsspår där.

Dalabanan löper genom Avesta centrum och över bron vid Dalälven. Godsstråket genom Bergslagen, bangården i Krylbo och stålverkets många separata industrispår följer sina källpolylinjer. Industrigatan, Källhagsgatan, Myrgatan och Prästgatan finns med i den nya väginhämtningen. Detaljer kan kontrolleras via respektive `sourceId`, exempelvis [stålverkets industrispår 1062865512](https://www.openstreetmap.org/way/1062865512) och [Dalabanans sträcka genom centrum 8041054](https://www.openstreetmap.org/way/8041054).

Rälsens spårvidd läses från OSM:s `gauge`-tagg, i regel 1 435 mm. Sliprar står med 0,65 meters mellanrum genom kurvorna. Elektrifierade sträckor får kontaktledning och stolpar. Instanser och avståndsstyrd detaljvisning används för bangårdens många objekt. Räls och sliprar ger inga återkommande kollisionssteg när spelaren springer över dem. Järnvägsbroar får sammanhängande gångyta och räcken.

Spårens positioner och spårvidd är källbaserade. Stolpavstånd, material, sliprar, broarnas konstruktionsdetaljer och höjder är modellerade tolkningar. Brohöjden interpoleras mellan terrängen vid brofästena eftersom underlaget saknar inmätta höjder. Vägbredd använder OSM:s bredd eller antal körfält där det finns; övriga bredder uppskattas utifrån vägklass och markeras med `widthSource`.

Återskapa filerna:

```sh
node scripts/import-transport.js
node scripts/build-transport.js --scale 1 --extent 2280
```

En lokal källfil kan läsas med `--input` utan en ny nätverksförfrågan. Importen validerar att järnvägsgeometri finns innan en fungerande källfil ersätts.

[© OpenStreetMap contributors, ODbL](https://www.openstreetmap.org/copyright). Google Maps och Street View används separat som visuella referenser i projektets referensgranskning; Google-bilder ingår inte i transportens texturer eller geometri.
