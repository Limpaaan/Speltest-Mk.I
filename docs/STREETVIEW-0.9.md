# Referenskontroll för världen i 0.9

Kontroller gjorda i Google Maps/Street View 13–14 oktober 2026. Fotografierna används som synligt referensunderlag; inga Google-bilder eller panoraman ingår som speltexturer. Spelets geometri är egen. Enskilda hushöjder, interiörer, utrustning och krigszonsdetaljer är tolkningar, inte en uppmätning av en verklig anläggning.

## Google Maps mätverktyg

Högerklick → **Mät avstånd** användes från en vald mittpunkt vid Aaltohuset. Resultaten avser klickade punkter i kartan och avrundas här; byggnadscentroid, platsmarkör och entré kan ligga tiotals meter från varandra.

| Mål                         | Användarens kontroll | Maps, valda punkter |
| --------------------------- | -------------------: | ------------------: |
| Verket                      |          cirka 600 m |         cirka 621 m |
| H Östberg AB, främre gården |          cirka 900 m |         cirka 942 m |
| Dalahästens platsmarkör     |        cirka 1 550 m |       cirka 1 600 m |
| Storfors kraftstation       |          cirka 715 m |         cirka 726 m |

Första mätningens Aaltopunkt var `60.144751,16.177119`; Verkets valda kartpunkt var `60.149231,16.170436`. Följande mätningar använde en närliggande Aaltopunkt, ungefär `60.144767,16.177001`. Dessa översiktliga klickmätningar kontrollerar storleksordningen. Spelvärlden projicerar samtliga geografiska koordinater med samma skala, en spelmeter per meter. Den flyttar inte ett enstaka landmärke för att matcha en avrundad uppgift. OSM-fotavtryckens geometriska centrum är inte alltid Google Maps platsmarkör.

## Synligt granskade nya referenser

| Plats                              | Bildinsamling / fotograf                                                                                             | Använt underlag                                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H Östberg AB, Industrigatan 2      | Google, augusti 2023, `-BoBYmcsO7mRK9zVhr2vnw`, vid `60.1380893,16.1674723`                                          | Blå korrugerade hallar, ljus kontorsdel, mörka tak, lastportar och Östberg-emblem. Företagets offentliga flygbild i Maps, bildinsamling september 2018, visar sammanhängande stegade byggnadsvolymer.                                                                   |
| Avesta Works infart, Bergsnäsgatan | Google, maj 2023, `QdQFAFJbfliL1dZ7trkPVA`, `60.1381928,16.1853116`                                                  | Gul portal, bom, vakthus, parkering och låg tegel-/kontorsbebyggelse. Inne på säkerhetsområdet används kartlagda hallar och offentliga företagsuppgifter; de har inte inspekterats via privata vyer.                                                                    |
| Linde Gas, Lerbäcksvägen           | Google, augusti 2023, `pZpn61vgRL-Oyzu1rKQISQ`, `60.131689,16.1884333`; även offentlig bild av Eivind Holm, maj 2023 | Rektangulärt AGA-torn, extern trappstruktur, stora ljusa tankar med röda band, låg kontrollbyggnad och rörställningar. Tornets höjd och utrustningens inbördes positioner är tolkade. Maps företagsmarkör `60.1312666,16.1865725` används som ungefärlig tornplacering. |
| Myrgatan 13                        | Google, augusti 2023, `rlf0vOsAjehSKZuNFcJj5g`, `60.1428325,16.166129`                                               | Flerbostadshus med cirka fyra våningar, ljusa putsade gavlar, balkongrader samt tegel och sadeltak.                                                                                                                                                                     |
| Prästgatan 43                      | Google, augusti 2023, `YcrJ2TwMvSsNST_Nh2-U2A`, `60.137251,16.1609786`                                               | Låga verkstäder, öppna infarter, gräsremsor och träd mellan byggnaderna.                                                                                                                                                                                                |
| Prästjorden, Rotegatan 34          | Google, juli 2026, `qru0X3v9XCEmc8EcYRvH9g`, `60.1406709,16.1523538`                                                 | Röda bostadshus med två våningar, ljusa våningsband och sadeltak samt öppna trädgårds- och gaturum.                                                                                                                                                                     |
| Källhagsgatan 6                    | Google, juli 2026, `_1QqUfRdQ0_6n488oN3Z3Q`, `60.1359713,16.1650935`                                                 | Röda verkstadshallar, mörka sadeltak, breda grus-/asfaltgårdar och gröna grindar.                                                                                                                                                                                       |

Övriga redan granskade huvudlandmärken, inklusive Aaltohuset, Verket, stadshuset, kyrkan och Krylbo station, har daterade referenser i [Street View-kontrollen för 0.8](STREETVIEW-0.8.md). Alla importerade hus har inte granskats individuellt. Bostads- och industrifasader utanför de särskilda landmärkena använder dessa kvartersreferenser som typologi.

[Google Maps: Avesta Works](https://www.google.com/maps/search/?api=1&query=Avesta%20Works), [Google Maps: H Östberg AB](https://www.google.com/maps/search/?api=1&query=H%20%C3%96stberg%20AB%20Avesta), [Google Maps: Linde Gas Avesta](https://www.google.com/maps/search/?api=1&query=Linde%20Gas%20Avesta).

Outokumpus [officiella Avesta-sida](https://www.outokumpu.com/locations/avesta) beskriver smältverk, varmvalsning, kallvalsning, färdigställning och forskning. Hallarnas namn och fotavtryck hämtas från den medföljande OSM-källan. Hela industrimarkens gräns kommer från `way/132515339`; öppningar i spelstängslet lämnar kartlagda vägar och järnvägar fria.
