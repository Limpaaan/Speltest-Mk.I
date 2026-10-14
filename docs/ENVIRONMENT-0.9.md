# Svensk miljökänsla i 0.9

Ägarens referens är **Generation Zero**: särskilt dess svenska landsbygd, terräng, vägar, ljussättning och ljudbild. Den nya gestaltningen använder egen geometri, egna ljudsynteser och egna material tillsammans med Avesta-kartan.

## Referenser och tolkning

Utgångspunkter är [Avalanches officiella bilder och spelpresentation](https://avalanchestudios.com/games/generation-zero), [utvecklardagboken om den öppna världen](https://generationzero.com/en/blog/dev-diary-exploring-an-open-world) och [utvecklarnas återblick på atmosfär och ljuddesign](https://avalanchestudios.com/stories/generation-zero-5th-anniversary). De beskriver en svensk åttiotalsmiljö och lyfter stämning och ljuddesign. Min visuella tolkning är att mycket av känslan kommer från kontrasten mellan lugn natur och övergiven infrastruktur: höga trädkronor, ljusdis, matta jordfärger, kall omgivningsbelysning och varmare direkt solljus.

## Utförande i Avesta

- **Skog:** 148 slutna skogspolygoner från OSM styr 14 000 ytterligare träd. Totalt finns 17 800 träd, med barrträdsdominerad skog, björk och rönn, högre kronor och friare stammar. Träden delas upp i celler och ritas med avståndsgränser. Skogsskjutprov använder ett rumsligt index.
- **Skogsbotten:** mossigare, brungrön mark och detaljvariation på fysisk meterskala samt instanserat torrgräs och ormbunkar. Undervegetation ritas nära spelaren och stängs av i låg grafik.
- **Vägar:** åldrad asfalt, fuktigare reflexer under disigare väder, dämpade mittmarkeringar på bredare huvudvägar och vita kantstolpar. Vägnätets geografiska form bevaras.
- **Ljus och luft:** lägre svensk höstsol, varmare belysta ytor, svalare skuggor, mjukare exponering, avståndsdis och tunna lokala dimslöjor i högre grafik. Vädervärdena förändras långsamt och följer den gemensamma dygnsklockan.
- **Ljudrum:** separat vind och barrsus, älvbrus nära vattnet, en låg industrikläng runt anläggningarna samt sparsamma fågeltoner i skog under dagen. Vapnen får en dämpad fördröjd utomhusreflex. Miljöljud duckas under repliker och följer reglaget för omgivningsljud.

Fotavtryck, byggnadslägen, järnvägar och den verkliga meterskalan ingår fortfarande i samma version. Miljöändringarna påverkar inte spelarnas gångfart eller vapnens träffsäkerhet. Bilder och ljud från Generation Zero ingår inte som speltillgångar.

## Genererad barrtextur

Den inbyggda **imagegen** användes för en ny projekttextur, `public/textures/pine-crown-v09.png` (1536 × 1024, RGBA med alfa). Filen finns i projektet och används på överlappande trädkronor. Originalet sparas också i Codex bildarkiv. Ingen CLI eller API-nyckel användes.

Slutlig bildprompt:

> Production game foliage texture, photorealistic botanical cutout for a Swedish Scots pine canopy. One isolated broad irregular crown cluster of mature Pinus sylvestris branches and very detailed fine needles, natural olive to deep green with a few warm dry brown needles, several branching offshoots with organic gaps and a soft uneven silhouette. The cluster is wider than tall, approximately 1.5:1, viewed straight on, evenly illuminated by soft neutral overcast daylight, enough midtone detail for a physically lit 3D game material. Entire crown cluster fully visible with generous transparent padding all around. Transparent background with clean needle alpha, no solid backdrop, no sky, no ground, no full tree trunk, no labels, no framing, no cast shadow, no vignette. This will be used on overlapping canopy cards on original Swedish forest tree models, not as a finished scene.

Ljuden i miljölagret är procedurgenererade ljudtexturer och fågeltoner, inte fältinspelningar. Dimslöjorna är en lätt grafikeffekt och inte full volymetrisk ljusspridning. Detta är en webbaserad prototyp; exakt samma bildkvalitet som referensspelet är inte fastställd.
