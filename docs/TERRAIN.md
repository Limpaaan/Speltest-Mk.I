# Höjddata: källa, integration och begränsningar

**Integrerat i version 0.4.** Ägaren laddade upp originalets GeoTIFF och licens den 8 oktober 2026 efter att nätverksproxy nekat hämtningen. Filen täcker hela spelområdet. Den inlästa filens SHA-256 finns i `shared/terrain.json`; det råa källutdraget finns i `data/terrain-source-crop.json`.

Den filtrerade kartan har 121 × 121 prover och höjder **68,000–143,904 meter över havet**. Klient och server använder samma triangulära interpolering mellan dessa prover. Grundytan är `(höjd − 80) × 0.25`, alltså samma skala i höjd och avstånd.

## Källa

- [Copernicus GLO-30 på AWS](https://registry.opendata.aws/copernicus-dem/).
- [GeoTIFF N60 E016](https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N60_00_E016_00_DEM/Copernicus_DSM_COG_10_N60_00_E016_00_DEM.tif).
- [Produktens licens](https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N60_00_E016_00_DEM/INFO/eula_F.pdf).

Det är en **ytmodell (DSM)**: byggnader och trädkronor ingår. Cirka 30 meters nominell
upplösning räcker för stadsdelarnas höjdskillnader, inte trappor, vägkanter eller en
enskild byggnads grund. Höjderna är meter relativt EGM2008. Ett medianfilter minskar
enskilda toppar men omvandlar inte produkten till en uppmätt markmodell.

## Kör importen

Python behövs bara för kartarbetet. Spelet och dess npm-bygge fungerar utan Python.

```sh
python3 -m venv .local/terrain-venv
.local/terrain-venv/bin/pip install -r scripts/terrain-requirements.txt
.local/terrain-venv/bin/python test/terrain_import_test.py
.local/terrain-venv/bin/python scripts/import-terrain.py
```

Med en tidigare hämtad originalfil:

```sh
.local/terrain-venv/bin/python scripts/import-terrain.py --input /sökväg/till/original.tif
```

Standardresultatet är `.local/avesta-terrain-candidate.json`. Spelets data ändras
inte. TLS-kontroll är påslagen och hämtningen använder endast HTTPS. En misslyckad
hämtning, fel projektion, ofullständig täckning eller NoData ger ett fel utan att
ersätta en tidigare kandidat.

Importen läser centrum **60.148 N, 16.178 E** och skalan direkt från
`shared/geography.json`. Den sparar originalbeskärningen, dess affine transform,
källfilens SHA-256, bearbetningstid och en nord–syd/väst–öst-sorterad höjdgrid med
121 × 121 punkter. Efter ett 3 × 3-medianfilter samplas punkterna bilinjärt med
40 meters verkligt avstånd, motsvarande tio spelenheter. Pixelcentrum används
uttryckligen för att undvika en förskjutning på en halv rasterpixel.

SHA-256 identifierar den inlästa filen; det är inte en jämförelse mot en oberoende
publicerad kontrollsumma. Metadata behåller höjderna i meter. Spelomvandlingen är `(höjd − 80) × 0.25`, med samma komprimering som kartans avstånd.

Tre automatiska tester med **syntetiska GeoTIFF-filer** kontrollerar koordinatcentrum,
axelriktningar, interpolering, fel projektion, NoData och bevarad kandidat vid fel.
Dessa tester bekräftar importalgoritmen, inte Avestas faktiska höjder. CI kör dem
separat och laddar inte ner några höjddata.

## Integration och reproduktion

Efter granskad kandidat: `python scripts/integrate-terrain.py`. Detta sparar höjdgriden och råbeskärningen separat; originalets 23 MB stora GeoTIFF behöver inte laddas av webbläsaren. Fullständig licens distribueras som `public/licenses/copernicus-dem.pdf`.

- `shared/terrain.js` interpolerar samma trianglar som klientens terrängnät. Rörelse, skott, NPC, loot, träd och byggnader använder gemensam höjdprovtagning.
- Vägytor följer marken. Brobanor interpolerar ändpunkternas höjder med en spelmässig frigång; brohöjder är inte uppmätta konstruktionsdata. Vatten följer den filtrerade ytmodellen, inte en separat hydraulisk modell. Forsar, dammar och strandlinjer behöver lokal kontroll.
- Byggnader har plana fundament och förenklade kollisionsvolymer. Enskilda trappor, gatukanter, undergångar och byggnadsinteriörer saknas.
- Tester kontrollerar triangelhöjder, nedåtriktade skott mot mark, broövergångar, framkomlighet, fast dekor och strid på olika höjder. Importens syntetiska GeoTIFF-tester körs separat.

Bearbetade Copernicus-data behöver följande meddelanden enligt den lästa licensen,
åtskilda från OSM-databasens ODbL-licens. Bevara även produktens fullständiga villkor
vid distribution; projektet får inte antyda att rättighetsägarna godkänner spelet.

> produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved

> The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30
