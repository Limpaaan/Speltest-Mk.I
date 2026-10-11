# Kopparhjärta — kampanj och klasser i 0.6

## Berättelsens riktning

Avesta är tre veckor in i ett långvarigt elavbrott. Den fiktiva danska legostyrkan Järnsundskompaniet har tagit kontroll över reservkraften och använder värme, vägspärrar och radiosamband för att styra staden. Spelaren återvänder hem till Maja, som fortfarande skriver upp namnen på saknade skiftkamrater. Hennes bror Nils har lämnat ledtrådar i stället för ett avskedsbrev.

Kampanjen handlar om att återta ett samhälles möjlighet att hjälpa sig självt. Dalastoltheten finns i arbetet, platserna, yrkeskunnandet och omsorgen om grannarna. Signe, en dansk sambandstekniker som går under anropet Lärka, hjälper motståndet. Konflikten gäller kompaniets ockupation; människornas val avgör vem som är vän eller fiende.

Nils lever men har förts bort. Den frågan lämnas öppen för en fortsättning. Den första kampanjens egen konflikt får däremot ett slut: reservkraften återtas, sjukstugan skyddas och båda sidor av älven får samband. Patruller finns kvar i den öppna spelvärlden efter slutet.

## Spelbara kapitel

| Kapitel                           | Spelmål                                           | Vad spelaren får veta                               |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| 1. Bud till Koppardalen           | Besök Koppardalen, återvänd till Maja             | Strömavbrottet var avsiktligt; spår efter Nils      |
| 2. Tänd brukets hopp              | Fem soldater och Slaggjarlen under aktivt uppdrag | Kopparhjärta har gjorts om till kompaniets kraftnät |
| 3. Hästen ska stå fri             | Besegra Ryttmästare Mörk                          | Nils har lämnat en arkivnyckel och varning          |
| 4. Det som aldrig digitaliserades | Läs driftjournalen inne i Aaltohuset, 3 s         | Det manipulerade schemat skulle skada sjukstugan    |
| 5. En röst från andra sidan       | Ställ in Skogsbos reservradio, 6 s                | Signe hjälper till; Nils sågs vid liv               |
| 6. Värmen först                   | Starta reservaggregatet i Prästjorden, 6 s        | Civilförsvarets reservkraft fungerar                |
| 7. Över samma älv                 | Koppla brofästets sambandslåda, 8 s               | Stadsdelarna kan samordna omkopplingen              |
| 8. Det första skiftet             | Koppla om vid Verket, 10 s; återvänd till Maja    | Strömmen återgår till invånarna                     |

**J** öppnar skiftjournalen. Den visar bakgrunden, avslutade kapitel, hittade ledtrådar och nuvarande uppdrag; kommande avslöjanden visas först när spelaren når dem. Maja visar föregående kapitels avslut före nästa uppdragsbeskrivning. Den guldfärgade kartmarkeringen och avståndet i HUD visar vart spelaren ska.

Vid berättelsens apparater används **E** inom tre meter och med fri sikt. Spelaren måste stå still under arbetet. Rörelse, avfyrning, skada, död eller lämnat räckviddsområde avbryter. Arbetet börjar om från noll vid nästa försök. Kapitel lämnas alltid in hos Maja; belöningar kan inte hämtas på distans eller upprepas. Fiendernas vanliga patruller och återkomster gäller; detta är inte separat vågförsvar.

Uppdragsmålen är personliga i multiplayer, medan spelarna delar striden. Ett bossmål räknas för spelaren som får besegringen enligt befintliga regler. Gruppdelad uppdragsprogression, talade repliker, filmsekvenser, förgrenade val och eskort-AI är inte implementerade. Radiosamtal och fynd återges som text i journalen. Nya apparater är fiktiva spelobjekt, inte påståenden om verklig utrustning eller byggnaders funktion.

De första tre uppdragens ID och krav bevaras från 0.5. En sparfil som avslutat dem går vidare till arkivkapitlet. Driftjournalen är fristående från bärgningslådan: ett redan genomsökt arkiv blockerar inte berättelsen. Pågående arbetstid återställs inte från en sparfil. Offline sparas kapitel och färdigheter; multiplayer gäller fortfarande aktuell session.

## Klassernas nya talanger

Alla klasser behåller sin grundförmåga på **Q** och sin valda stöd-/anfallsförmåga på **Z**. Nya passiva talanger och en separat taktisk förmåga på **X** kan kombineras med båda grenarna.

Första klasstalangen kräver Fältvana, nivå 2 och 1 poäng. Den andra kräver Vapenmästare, nivå 4 och 1 poäng. X kräver första klasstalangen, nivå 5 och 2 poäng. Varje nivå efter den första ger en poäng, så valen konkurrerar med befintliga talanger. X har 28 sekunders återhämtning; Dalarnas mästare påverkar fortfarande endast Z.

| Klass         | Passiva talanger                                                                                                                                      | Taktisk förmåga, X                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Stålvakt      | Ugnshärdad: +25 maxhälsa. Förankrad: −30% rekyl med karbin/kulspruta, hukande och stilla.                                                             | Skiftets samlingsrop: lockar synliga fiender inom 24 m i 8 s; +40 uthållighet och 30% skydd i 6 s. |
| Skogsvandrare | Mossgång: −40% upptäcktsavstånd hukande, +25% uthållighetsåterhämtning. Jägarens andning: +15% skada och −25% rekyl med m/96 vid stillastående sikte. | Spårläsning: patrullmarkeringar i 45 s och kamouflage i 6 s; skott avslöjar spelaren.              |
| Kopparslagare | Patronsmed: −20% omladdningstid med hagelgevär. Sprängarvana: +25% granatskada.                                                                       | Nithammaren: 30 skada och 3 s avbrott inom 12 m, bossar 1 s.                                       |
| Älvvakt       | Forsvana: −25% sprintkostnad. Brofästets skytt: kpist får −30% spridning och ingen extra fartförlust av siktning.                                     | Räddningsled: +45 uthållighet och +20% fart i 6 s för spelaren och synliga allierade inom 18 m.    |
| Fältvårdare   | Rena förband: Q läker 75; första hjälpen 95. En hand fri: −25% omladdningstid och +10% pistolskada.                                                   | Triage: 6 hälsa/s i 8 s för spelaren och synliga allierade inom 18 m; återupplivar inte.           |
| Bruksingenjör | Kretsletare: +50% bärgning av elektronik/koppar. Bänkprovad: hukande kulspruta får −20% omladdningstid och −25% rekyl.                                | Störsändare: avbryter synliga fiender inom 24 m i 4 s, bossar 1,5 s; ingen skada.                  |

Störning avbryter bossars förvarnade attacker. Offensiva taktiska förmågor fungerar utanför samlingsplatsen och träffar PvE-fiender. Stöd påverkar inte ömsesidiga PvP-motståndare. Fallen spelare kan inte använda förmågor. Simulationen bestämmer avstånd, tid, skada och kostnader; klienten skickar bara begäran. Balansen behöver fortsatt speltestning, särskilt kombinationer med vapendelar och höga nivåer.

## Grafisk riktning

Svensk höst, lågt varmt solljus mot sval himmel, mörka industrifasader, sliten asfalt och mark med mossa/löv. Egen procedurgrafik och originalberättelse; inga modeller, bilder, repliker eller andra tillgångar från Generation Zero används.

Marken har rumslig färgvariation och detaljrelief. Material använder ytstruktur, himmelsreflektioner och ACES-tonmappning. Dalälven får rörliga normaler. En femtedel av träden är höstbjörkar med egna lövsilhuetter. Instansierat gräs rör sig i vinden. Väglyktor, skyddsrumsskyltar och ett mer detaljerat bilvrak kompletterar miljön. Berättelsens apparater får egna modeller och en diskret målmarkör.

Låg grafik tar bort gräs, skuggor, detaljrelief och himmelsreflektioner. Medel visar färre grästuvor och 1024-pixels skuggkarta; hög visar alla tuvor och 2048-pixels skuggkarta. Programvarurendering använder lägre upplösning och samma förenklade effekter som låg grafik, även när en högre inställning har valts. Konturer, modeller och animationer är fortfarande prototypnivå; detta är ett steg mot önskad atmosfär, inte samma detaljnivå som ett fullskaligt kommersiellt spel.
