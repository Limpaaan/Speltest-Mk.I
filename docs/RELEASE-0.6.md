# 0.6 — Kopparhjärta

## Förändringar

- Kampanjen utökas från tre uppdrag till åtta sammanhängande kapitel om Avesta, Nils försvinnande och stadens reservkraft. Journal på J, upplåsta fyndtexter, återkoppling från Maja och guldfärgade målmarkeringar.
- Fem arbetsplatser kopplar berättelsen till spelvärlden: Aaltohusets driftjournal, radio i Skogsbo, reservaggregat i Prästjorden, brorelä och omkopplare vid Verket. E startar arbetet; skada, skott eller rörelse avbryter.
- Varje klass får två egna passiva talanger och en taktisk förmåga på X, som kompletterar Q och Z. Tolv passiva talanger och sex taktiska förmågor totalt.
- Varmt höstljus och svalare skuggor, himmelsreflektioner, markvariation, materialrelief, sliten asfalt, björkar, vajande gräs, vattennormaler, vägdekor och förbättrat bilvrak.
- Låg grafik och automatisk reservprofil för programvarurendering minskar de tyngre effekterna. Spelregler, berättelse och mål behålls.

## Kompatibilitet

Gamla offlineprofiler fortsätter att fungera. De tre första kampanjstegen bevaras; avslutade äldre kampanjer fortsätter till arkivet. Befintligt arkivloot behöver inte återställas. Talanger läses tillbaka med klass-, poäng- och föräldrakontroll. Pågående arbete och stridsbuffar sparas inte mellan sessioner. Klient och multiplayer-server ska uppdateras tillsammans till 0.6.0.

## Lokal verifiering

- 76 tester av simulation, progression, geografi och server passerar.
- 13 Chromium-tester passerar, inklusive multiplayer med två webbläsare, Aaltointeriör, sparning/offlinecache, journal och taktisk förmåga via riktiga kontroller.
- Ett separat Pages-bygge med Render-adressen klarar test av reposökväg, anslutningsadress och omladdning utan nätverk.
- Produktionsbygget passerar. Vites varning om stor JavaScript-fil kvarstår.
- Full grafikprofil och växling mellan låg/hög har renderats utan JavaScript-/WebGL-fel. Bildgranskningen kördes i Chromium med programvarurendering; detta är ingen FPS-mätning på fysisk GPU.

Berättelse, exakta förmågeeffekter och begränsningar beskrivs i [STORY.md](STORY.md). Testresultat gäller lokalt bygge. GitHub-uppladdning, Pages-publicering och Render-driftsättning är separata steg och ska kontrolleras innan versionen beskrivs som tillgänglig på den publika spelsidan.
