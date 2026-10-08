# Version 0.4 – terräng och utrustning

- Verklig Copernicus GLO-30-terräng, bevarat källutdrag, proveniens och fullständig licens. Gemensamma höjder för klient, server, skott och rörelse.
- 180 tolkade omgivningshus, 950 träd och 90 stenblock med kollision. Grundhastighet cirka 60% lägre; terräng och lutning påverkar färden. Skogsbo skolområde och Åsbobacken tillagda från befintliga OSM-punkter.
- Sparade inställningar för känslighet, sikteskänslighet, synfält, hårkors och grafik.
- Sex vapenfamiljer med egna modeller, öppna sikten, rekyl och omladdningsrörelser. Semiautomatisk avtryckare, hagelspridning och automatiska vapen samt kastbara granater.
- Fältvårdare och bruksingenjör kompletterar de fyra befintliga klasserna. Rustmästaren Torsten, vårdaren Liv och spanaren Einar erbjuder tjänster utöver Majas kampanj och verkstad.
- Stormare, skyttar och pansarvakter kompletterar soldaterna. Bossarnas silhuetter och varnade attacker skiljer sig åt.

## Verifiering

47 Node-tester och tre syntetiska GeoTIFF-importtester passerade lokalt. Nio webbläsartester passerade, inklusive verklig lokal multiplayer, offlinecache, inställningar efter omladdning, vapenbyte/ADS och att gå till Torsten och köpa granater. Bilder från programmet granskades för terräng, byggnader och kikarsikte. Formatering och produktionsbygge kontrollerades.

Ett lokalt simulationsprov med åtta spelare och 32 fiender gav cirka 6 ms per tick över 300 tick. Detta är ingen prestandagaranti för gratis Render eller användarens dator.

## Begränsningar

Copernicus är en ytmodell och innehåller vegetation/bebyggelse. Brobanor och vattenytor är spelanpassade. Omgivningshus och vegetation har inte uppmätta placeringar; skolornas exteriörer är tolkningar. Google Maps/kommunens webbplats kunde inte granskas på grund av proxyfel. Fler exakta landmärken behöver bildreferenser. Spelmodeller och animationer är fortfarande förenklade.

Offlineprofiler i version 1 kan fortsatt läsas. Befintliga utrustade vapen behålls; nya spelare får klassens nya startvapen. Multiplayer kräver att klient och server uppdateras; sessionsframsteg återställs vid serveromstart som tidigare.
