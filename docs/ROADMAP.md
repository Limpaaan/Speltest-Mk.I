# Vision och nästa versioner

## Spelvision

Avesta: Sista skiftet ska bli ett 3D-RPG där Dalarnas lokala identitet genomsyrar klasser, utrustning och uppdrag. En fiktiv dansk militärfraktion har ockuperat delar av en postapokalyptisk stad. Spelaren försvarar människor, broar och industriarv; lokal stolthet och gemenskap driver berättelsen.

Prototypen prövar grundloopen **utforska → strid → bärga → utveckla karaktären → ta tillbaka ett område**, både offline och tillsammans. Den innehåller ett fåtal spelmekaniska system, inte ”alla klassiska RPG-element”.

## Levererat i 0.2

FPS med muslås, höjdledssiktning, sikte, sprint, hukning och huvudträffar; texturerade byggnader och vapen; obligatoriska användarnamn och AdminL-verktyg offline/online. Offlinecache fungerar även under en GitHub Pages-reposökväg. Webbpubliceringsflödet är förberett, men en publik adress är inte verifierad.

## Nästa steg — Verkligt Avesta och bättre strid

- Återhämta Copernicus-höjddata och integrera samma höjdprovtagning i rendering, kollision, skott och multiplayer. Street View-referenser återstår; kartdata och kommunala referensbilder räcker inte för att verifiera alla fasader.
- Komplettera OSM-grunden enligt `MAP.md`: verifiera Plushuset och Åsbo, inför fullständiga vattenytor och gångbroar, kontrollera framkomlighet och bygg igenkännbara byggnadsmodeller.
- Navmesh/pathfinding, hotbaserad AI, patruller och fastna-inte-beteende.
- Mer särskiljande bossfaser, vapenanimationer, ljud, träffrespons, skademarkörer och en tydligare introduktion.
- Justerad svårighetsgrad för gruppstorlek, bättre lootbalans och progressionstest över längre spelsessioner.
- Inställningar för ljud, grafik, ombindning av kontroller och förbättrad tillgänglighet.

## 0.3 — RPG-system

- NPC:er, dialog, questkedjor, berättelseval och återtagna områden.
- Rustningsplatser, affixer, föremålsset, handel, hantverk och ekonomibalans.
- Djupare klassträd, specialiseringar, co-op-roller och fler fiendearketyper.
- Varaktig offlinevärld, sparslots, export/import och versionsmigrering.

## 0.4 — Beständig multiplayer

- Konton, autentiserade sessioner, återanslutning och serverägda karaktärer i databas.
- Auktorisering, säker distribution, loggning, övervakning, backup och återställning.
- Serverbrowser/lobby, privata rum, inbjudningar, gruppsystem och moderering.
- Klientprediction, laggkompensation, belastningsprov, protokollversionering och robust hantering av tappade anslutningar.
- PvP-regler, belöningar, spawnskydd och missbruksförebyggande tester. Nuvarande PvP är endast en frivillig arenaduell.

## Inför en publik spelrelease

Separata beslut behövs om spelmotor/plattform för fortsatt produktion, konstbudget, rättigheter, licens, drift, distribution och omfattning. Webbläsarprototypen är en testbar teknisk start, inte ett löfte om att ett fullskaligt spel eller en offentlig server redan är levererad.
