# Avesta: Sista skiftet 0.9

Versionen innehåller också en ny svensk miljögestaltning med Generation Zero som stämningsreferens: kartlagd tätare skog, naturtrogen barrtextur, mossigare skogsbotten, undervegetation, lägre höstljus, dis, slitnare huvudvägar och ljud som skiftar mellan skog, älv och industri. Se [miljöutförande, källor och bildprompt](ENVIRONMENT-0.9.md).

Världen använder en spelmeter per verklig meter, jämfört med den tidigare geografiska skalan 0,25. Samma koordinatprojektion används för stad, terräng, vattendrag, vägar och järnvägar. Byggnadsfotavtrycken får fysisk storlek medan människor, vapen, möbler och rörelsehastighet behåller sina meterstorlekar. Aaltohusets tillgängliga interiör, ramp, kollisioner och uppdragsapparat följer den större byggnaden. Terrängens ursprungliga höjdsampel bevaras.

Byggnadernas betongstöd når ned till terrängen längs hela fasaden, även på roterade byggnader och mellan hörnen. Stödens underkant beräknas från terrängtrianglarnas kontaktpunkter. Industribyggnader med indragna lastgårdar använder polygoner och lämnar dessa gårdar öppna.

Järnvägarna följer 61 OSM-sträckor genom centrum, Krylbo, järnvägsbroarna och industrispåren. Spårvidd, räler, sliprar, ballast och broar visas med avståndsstyrd detalj. Enskilda räler och sliprar blir inte ojämna kollisionssteg när man sprintar. Industrigatan, Källhagsgatan, Prästgatan och Myrgatan ingår i det förnyade vägnätet.

H Östberg AB har en egen blå industrimodell på det kartlagda fotavtrycket: stegade hallar, ljus kontorsfasad, fönster, lastportar, skärmtak, takljus och emblem. Avesta Works har separata smält-, vals-, färdigställnings- och lagerhallar, takmonitorer, portar, ventilationsdetaljer och processrör. Den offentliga infarten får gul portal, vakthus och ett öppet krigszonsutförande. Stålverkets kartlagda områdesgräns visas med stängsel som lämnar vägar och spår öppna. Linde Gas får ett rektangulärt AGA-torn med extern trappstruktur, tankar, kylare och rörställningar.

Prästjordens och Källhagens kringbyggnader använder kvarterskaraktär från daterade Street View-referenser. Alla hus är inte individuellt modellerade eller besiktigade. Fotavtryck, vägar och spår kommer från medföljande OSM-källor; byggnadshöjder, industriprocessernas detaljer och tornets ungefärliga position är tolkade. Google Maps och dess mätverktyg användes för visuell kontroll. Se [referenser och avstånd](STREETVIEW-0.9.md) och [järnvägsunderlag](TRANSPORT-0.9.md).

Versionen behåller ljud, uppdragsröster, utrustningsikoner, NPC-samlingsplats, GPU-prestandaläge och sparad progression från 0.8. Den större världen innebär längre gångavstånd. Grafikkortsprestanda måste bedömas på användarens dator; automatiserade webbläsartester med mjukvarurendering kan kontrollera funktion men ger inget löfte om viss bildfrekvens.

Vid korta avbrott i inmatningen stoppar servern fortfarande rörelse och skott, men bevarar spelarens senaste riktning, siktvinkel och hukställning. Samma neutrala inmatning används när klienten tappar fokus eller öppnar en dialog. Det undviker att figuren plötsligt vänds åt ett annat håll vid långsam rendering.
