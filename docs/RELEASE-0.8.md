# 0.8 — Staden, rösterna och Skiftgården

Spelet spelas på https://limpaaan.github.io/Speltest-Mk.I/. Multiplayer använder den befintliga Render-servern. Sparningar och klass-ID:n bevaras; solo börjar vid samlingsplatsen efter omladdning, som tidigare.

## Mark och rörelse

Copernicus-källgridden bevaras oförändrad. Spelytan använder två viktade utjämningspass för att dämpa små DSM-toppar från bland annat vegetation och tak. Samma filtrerade trianglar används av terrängmeshen, rörelsen och serverns markträffar. Avesta behåller sina större höjdskillnader. Lutning beräknas över fyra spelenheter och har en mildare hastighetspåverkan. Kameran följer rörelsen mellan serverns 20 Hz-uppdateringar och återställs vid förflyttning/återfödelse.

Marken har en ny **1254 × 1254 px** WebP-textur, anisotrop filtrering och mipmaps. Den är en AI-genererad, egen albedobild; höjd och kollision kommer från terrängdata. Grus har eget material. Grästuvor är färre och lägre, buskar lämnar bredare fria vägkanter. Byggnader och kollisioner använder ett gemensamt spatialt index; stadshusen ritas i instansgrupper med avståndsstyrda fasaddetaljer.

Texturens genereringsprompt (önskad 2048 px; verktygets faktiska resultat var 1254 px):

> Seamless top-down game ground albedo for a Swedish small town in early autumn. Muted closely cut grass and moss, approximately 80% vegetation and 20% earth, fine gravel, low contrast and fine detail. No large clumps, stones, twigs, tall grass, white flecks, cast shadows, vignette, text or markings. All four edges must tile. Photorealistic flat diffuse texture only, requested 2048 by 2048.

Metod: OpenAI ImageGen, därefter enbart formatkonvertering till WebP. Spelasset: `public/textures/avesta-ground-v08.webp`. Vapnens materialtexturer är separat procedurgenererade DataTextures på 1024 px; de kommer inte från markbilden.

## Avesta och kartkällor

Google Maps och Street View gick att öppna och använda den 12 oktober 2026. Aalto-huset, Verket, Stadshuset, Avesta kyrka och Krylbo station granskades i gatuvyer eller 360°-panoraman. Stadshuset har nu gul tvåvåningsfasad, mansardtak och takkupor; kyrkan valvfönster, klocka och detaljerat torn; Krylbo murverk, tegelband, hörntorn och perrongtak. Ingen Google-kartbild eller fasadbild distribueras med spelet. [Daterade referenser och konkreta ändringar](STREETVIEW-0.8.md) skiljer äldre användarpanoraman från Google Street View och redovisar begränsningarna. Modellerna är tolkningar, inte fotogrammetri.

Ett nytt daterat OpenStreetMap-utdrag innehåller **3 384 bearbetade byggnadsfotavtryck**. Spelet använder **2 630** av dessa efter kontroller mot spelvägar, vatten, de befintliga landmärkena, parkeringsytor och Skiftgården. Husen orienteras efter fotavtrycken och ersätter de tidigare 180 slumpmässigare placerade omgivningshusen. Fotavtrycken förenklas till orienterade rektanglar; komplexa husformer, fasader, våningsantal utan taggar och höjder är fortfarande tolkade. Handritade kvartersbyggnader som saknar nya käll-ID:n behåller sin ungefärlighetsmarkering.

Åtta nya landmärken: Stadshuset, Myntmuseet, gamla och nya vattentornet, Avesta lasarett, Avesta ishall, Avesta busstation och Avesta Krylbo station. Avesta kyrka, Storfors, Lillfors, Biltema och Jula har fått korrigerade lägen från det nya utdraget. Plushuset och Åsbos områdescentrum behöver fortsatt separat detaljgranskning.

Källa: © OpenStreetMap contributors, ODbL 1.0. `data/avesta-buildings-osm.json` innehåller originalgeometri och ID:n; `node scripts/build-city.js` reproducerar `shared/city.json` med källhash, projektion och datum. Produktionsbygget och offlinecachen tillhandahåller `city-source.json`, `city-database.json` och `NOTICE-OSM.txt`. Spelet kräver inga kartanrop under spelning.

## Strid, vapen och ljud

34 vanliga fiender är grupperade i fem posteringar: Verket, Koppardalen, Åsbo, Skogsbo och södra järnvägsområdet. De patrullerar inom sin hemmaradie; denna tillhörighet bevaras vid återfödelse. De två tidigare bossarna finns kvar. Gatorna mellan posteringarna blir lugnare.

Alla sex vapenfamiljer har finare metall-, trä- och tygmaterial, högre detaljgrad i förstaperson, fler fästen och mekaniska detaljer. K-pisten har genombrutna ventilationshål, kulsprutans patronband tydligare hylsor och spetsar. Mekanism, magasin och pump förblir rörliga; optikens siktlinje är öppen. Avlägsna vapen använder enklare geometri för att hålla belastningen nere. Modellerna är egna stiliserade tolkningar, inte skannade repliker.

Web Audio ger sex olika vapenljud samt omladdning, steg, träffar, granater och svag vind. Ljud aktiveras efter spelarens startklick. Skotthaglets flera träffspår ger ett skottljud per avfyrning. Volym för huvudljud, effekter, röster och miljö kan ställas separat.

**41 medföljande MP3-filer** täcker fem NPC-hälsningar, åtta uppdragsbriefingar, åtta fynd, åtta återrapporter och tolv danska hot/repliker. Rösterna är generisk neural talsyntes med **tio individuella tempo-/tonhöjdsprofiler**. Dessa bygger på två svenska och två danska grundröster; de är inte tio separat inspelade skådespelare. Ingen verklig persons röst har klonats. Spelet behöver inga TTS-nycklar eller externa talsyntesanrop. Ljudfiler, text och ordtider sparas i offlinecachen. `scripts/generate-voices.py` är ett separat, valfritt verktyg för assetframställning med edge-tts; `public/audio/voice-provenance.json` redovisar profiler och manus.

## UI och den skyddade samlingsplatsen

HUD visar brukskronor, skrot, vapenplatser och förband utan att öppna packningen. Packningen visar separata materialkort med egna SVG-ikoner och antal, vapensilhuetter, förbrukningsvaror och vapendelar. Snabbnavigering går till respektive avdelning. Ikoner följs alltid av text; färg är ett extra stöd.

Uppdragskortet visar kapitel, mål, avstånd, belöning och nästa handling. Spelaren kan lyssna igen och stoppa uppläsningen. Transkriptet markerar orden efter ljudfilernas medföljande tidskoder och finns även i journalen. NPC-dialoger beskriver personens tjänster, relevanta resurser och villkor. En stationsförteckning kan visa vägen på kartan.

Maja, Torsten, Liv, Einar och Anders samlas i den fiktiva **Skiftgården vid Aalto-huset**. De har samband, arbetsbänk och vapenförråd, sjukbrits och vårdskärm, kartbord och radio samt staffli och färgförråd. Två beväpnade försvarare bevakar gården och säckbarriärer ger skydd. Den gemensamma skyddszonen omfattar stationerna och hindrar skada och skott enligt samma regler i solo och multiplayer. Vakterna är kosmetiska försvarare; skyddet ges av zonreglerna. Anders gamla tillfälliga gatukälla finns kvar som historisk adressinformation, men hans spelposition är nu Skiftgården.

## GPU-prestandaläge

Inställningen begär WebGL-kontekst med `powerPreference: high-performance`. På system med flera grafikkort kan webbläsaren välja det starkare kortet; detta kräver omstart när inställningen ändras. Under aktivt spel anpassas renderingsupplösningen efter längre perioder med låg bildfrekvens. Den minskar stegvis till som lägst 70% av grafikprofilens upplösning och återhämtar sig gradvis. Menyer, flikbyten och enstaka långa bildrutor påverkar inte beslutet. Hårdvarurendering följer skärmens animationsuppdatering i stället för en extra 60 Hz-gräns.

Webbläsaren beslutar om grafikkort och hårdvaruacceleration. Inställningen kan inte aktivera ett avstängt grafikkort, flytta serverns spelberäkning till GPU:n eller garantera en viss bildfrekvens. Automatiska webbläsartester använder SwiftShader och verifierar funktion, inte prestanda på användarens grafikkort.

## Kontrollsvit

100 enhetstester kontrollerar bland annat rörelse, kartkollisioner, spawns, sparningar, serverbehörighet, ordtider, ikonernas täckning, vapendetaljer och GPU-upplösningsregler. De 16 webbläsarfallen omfattar solo, multiplayer, offlinecache, alla vapen, uppdrag, handel, NPC-tjänster, inspelat tal utan nätverk, synkroniserat transkript och de nya UI-vyerna. Produktionsbygge och formateringskontroll ingår. Den publicerade commitens GitHub Actions-resultat visar om hela kontrollsviten och Pages-publiceringen har lyckats.
