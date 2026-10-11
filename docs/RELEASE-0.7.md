# 0.7 — Människorna och kvarteren

Klassnamnen behålls. Försvararna har nu civila yrkeskläder och egna människomodeller med hals, ansiktsdrag, hår, öron, händer, kängor och ledade armar och ben. Namn och klass ger en stabil variation i hudton, hår, kroppsbredd, ålder och uttryck. Modellerna blinkar, andas, går, springer, hukar och rör armarna vid omladdning. I vila kan figurerna klia sig, sträcka på sig, ta en rökpaus eller stoppa in snus. Fingrar och tvådelade armar följer föremålen. Vid lyckad bärgning, handel och användning av förnödenheter visas en kort greppgest; handel kan få handlaren att vända sig mot spelaren och räcka fram handen. Rörelserna avbryts av förflyttning, omladdning eller strid. Spelarnas interaktionsgester skickas med den serverstyrda spelstatusen i multiplayer. Cigaretter, snus och en generell överlämningsask är kosmetiska rekvisita utan speleffekter. Anders tecknar vid sitt staffli och tar korta pauser. Förstapersonshänderna använder klassens arbetskläder och samma hudton som spelarfiguren, och visar räck-/plockrörelser. Rök- och snusanimationerna visas på hela figurer, inte som en egen förstapersonssekvens. Alla modeller är egna procedurmodeller; de bifogade miniatyrbilderna används endast som stilreferens.

| Klass         | Yrkesbakgrund och kläder                                  |
| ------------- | --------------------------------------------------------- |
| Stålvakt      | Stålverksarbetare, arbetsjacka, reflexer och hjälm        |
| Skogsvandrare | Skogsarbetare, rutig skjorta, gröna arbetskläder och keps |
| Kopparslagare | Industrismed, läderförkläde och skyddsglasögon            |
| Älvvakt       | Räddningstjänst, mörka arbetskläder, reflexer och hjälm   |
| Fältvårdare   | Sjuksköterska, vårdkläder, namnbricka och sjukvårdsväska  |
| Bruksingenjör | Elektriker, arbetsjacka och verktygsfickor                |

Klass-ID:n, egenskaper, talanger och sparningar ändras inte. Yrkesbakgrunden visas i klassvalet. Fiender har andra klädfärger och skydd; tunga fiender behåller rustning. Utseendena är stiliserade och är inte skannade människor eller porträtt av verkliga personer.

[Färglagda karaktärer](images/humans-v07.png) · [10 sekunders modellvisning med animationer](images/character-animation-v07.webm).

Visningen använder spelets faktiska modeller och rörelsekod i en separat, belyst modellstudio. Den är inte en film från en spelsession.

## De fyra prioriterade områdena

Användarens markerade översiktskarta styr denna första områdespassning. De tidigare OSM-koordinaterna för Verket och Dalahästen används som två ankare för en ungefärlig plan. Det är inte en inmätning eller en verifiering av nya fasader.

- **Koppardalen:** tolkade modeller för Avesta kyrka, Storfors och Lillfors kraftstationer, restaurang Koppardalen, forskningsenhet och industrihallar. Kompletterande lokala tillfartsvägar.
- **Gamla Byn:** åtta mindre röda trähus med ljusa foder, sadeltak, skorstenar och entrésteg.
- **Holmen:** strandstig, sittplatser och områdesskylt i park- och strandmiljö.
- **Åsbo handelsområde:** butikshallar för Rusta, Willys, ÖoB, Biltema och Jula, snabbmatsbyggnad och asfaltsparkeringar, parkeringsrutor och anslutande infarter i området runt den befintliga Dalahästen. Enligt användarens förtydligande ligger Rusta i det mindre vänstra skeppet och Willys i den större högra delen av samma butikslänga.

Nya namngivna byggnader markeras med `~`. Placeringar, dimensioner och fasader behöver granskas mot närbilder, kartkoordinater eller lokalkännedom; de är ännu inte exakta rekonstruktioner. Stora byggnader i denna uppdatering är exteriörer. Aaltos befintliga spelbara bottenvåning finns kvar. Kartskalan är fortfarande 1:4 och Copernicus-data är ytmodellshöjder, inte en detaljerad inmätning av gator och trottoarer.

## Mark, vägar och vegetation

Asfalten ligger cirka 16–18,5 cm över terrängen med grusslänter vid kanterna. Samma höjdmodell används vid förflyttning och markträffar. Vägar anpassas runt de förenklade byggnadsvolymerna; avstickare som slutar inne i en byggnad klipps vid fasadens säkerhetsmarginal. Därefter dras sammanhängande gångvägar från byggnadernas entrésidor till närliggande väg, runt andra hus och bort från vatten. Detta gäller även de genererade omgivningshusen. Aaltos befintliga östra entréramp bevaras. Storfors kraftstation saknar en ny gånganslutning eftersom den tolkade platsen delvis ligger i vatten; där behövs bättre platsunderlag. Råa OSM-data behålls. Ett regressionstest kontrollerar samtliga vägbredder mot alla byggnadsfotavtryck, även vid broar.

Rusta, Willys, ÖoB, Biltema, Jula och Plushuset får sammanhängande asfaltsytor med parkeringsrutor, körutrymme, P-skylt och infart. Ytorna följer terränghöjden och hålls fria från genererade hus, träd, stenblock och buskar. Placeringen är en spelanpassning till de ungefärliga byggnadsvolymerna och återger ännu inte butikernas exakta parkeringsplaner.

Björk, gran, tall och mindre lövträd får olika kronhöjder, bredder och grenar. Buskage, tuvor och mer utspridda grässtrån kompletterar marktexturen. Trädstammar och stenblock ger fortsatt fysiska hinder; buskar och gräs är visuella detaljer.

## Nya vapenmodeller

Alla sex skjutvapentyper har byggts om med egna sidoprofiler, avfasade kanter, separata metalldelar, grepp och kolvar. Materialen skiljer på stål, trä, grön plast, gummi, mässing och ammunitionsväska. Greppunkterna styr handplaceringen i både första- och tredjeperson.

- **AK4:** lång låda, manöverrör, grön framstock, kolv och räfflat lådmagasin.
- **Hagel 12:** träkolv, räfflad rörlig pump och dubbla rör under piplinjen.
- **m/96:** lång trästock, pipband, slutstyckshandtag och öppet kikarsikte.
- **m/40:** kort kantig låda, friliggande pipa och bakåtlutat trägrepp.
- **Kpist m/45:** rund låda, markerad perforerad mantel, rakt magasin och trådkolv.
- **Ksp 58:** grövre låda, bandmatning, ammunitionsväska, bärhandtag och benstöd.

Befintliga vapendelar syns på modellerna; magasin, mekanism och pump kan fortfarande animeras. Kikarsikten saknar ogenomskinliga ändlock. De här är egna stiliserade speltolkningar, inte exakta fabrikskopior. Skada, ammunition och klassbegränsningar behåller befintlig balans. Styv geometri slås samman per material för att begränsa antalet renderingsanrop; rörliga delar hålls separata.

[Översikt av de sex vapenmodellerna](images/weapons-v07.png).

## Ljus och rörelse

En cykel tar **40 spelminuter**: ungefär 30 minuter mellan soluppgång och solnedgång och 10 minuter natt. Solriktning, månsken, stjärnor, dimma, himmel och belysning förändras tillsammans. Nätterna har grundljus för att vara spelbara utan ficklampa. Svagt blått grundljus på mark och asfalt hjälper spelaren att följa vägen mellan lyktorna. Kompassen visar spelvärldens klockslag.

Multiplayer-rummet styr tiden för alla spelare. Serveromstart skapar en ny dagsfas; det finns ännu ingen beständig lagring av servervärlden. Solospel sparar tiden tillsammans med klassprofilen och pausar den när sololäget är pausat.

Gatlyktorna belyser mark och människor på natten. Högst sex närliggande gatlyktor är aktiva samtidigt, två i låg kvalitet eller mjukvarurendering. Polisbilar står längs vägar; några är välta och några har animerad eld, rök och fladdrande eldljus. Bilarna är gemensamma kollisionsobjekt för klient och server. Elden är stämning och orsakar ingen skada. Högst två närliggande eldljus används samtidigt, ett på låg kvalitet.

Låg grafik/mjukvarurendering använder färre ljus och partiklar, lägre upplösning samt tidigare förenklingar för gräs, skuggor och material. Tester i molnmiljön använder mjukvarurendering och bevisar inte prestanda på ett riktigt grafikkort.

[Åsbo och butikstillfarterna](images/asbo-v07.png) · [Nattmiljö med gatlyktor](images/night-v07.png).

## Verifiering, 11 oktober 2026

- `npm test`: **88 godkända tester**, inga misslyckade eller överhoppade.
- Slutkontroll av miljö- och vapenfallen: **12/12 godkända**, inklusive entrévägar, parkeringsytor, gemensam klocka, handgester och fri sikt genom kikarsiktet.
- Den kompletta webbläsarkörningen gav **11/14 godkända** och tre tidsgränser vid fem sekunders väntan på gränssnittet. Spårbilderna visade därefter de förväntade nivåerna, förmågan och kikarsiktet. Körningen använder SwiftShader.
- De tre fallen samt två berörda FPS-/vapenfall kördes om med 15 sekunders väntetid: **5/5 godkända**. Tvåklientstestet kontrollerar även att den andra klienten tar emot en lyckad handelsgest. Den sista nattjusteringen följdes av en separat dag–nattkontroll: **1/1 godkänd**. Samtliga 14 olika webbläsarscenarier har därmed verifierats över dessa körningar.
- Produktionsbygget och formateringskontrollen passerar. Bygget ger fortsatt en storleksvarning för klientpaketet; uppdelning av paketet återstår.
- Modellstudio och områdesbilder renderades utan JavaScript-fel. Mjukvarurendering i molnet ger ingen mätning av spelprestanda på användarens grafikkort.

## Publicering

Uppdatera klient och multiplayer-server tillsammans: karta och kollisionsobjekt har ändrats. GitHub Pages behöver byggas från den nya koden och Render behöver driftsätta samma version. Lokala tester och en Git-commit innebär inte att den publika webbplatsen uppdaterats. Versionen sparas som en lokal Git-commit. GitHub-uppladdningen är blockerad av saknad fungerande autentisering för HTTPS-Git (`could not read Username`). En källkods-ZIP och en komplett Git-bundle tillhandahålls som säkerhetskopior. Den publika spelsidan har därför inte uppdaterats av denna leverans.
