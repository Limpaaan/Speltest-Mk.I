# Publicera på GitHub Pages och Render

Repot innehåller färdiga konfigurationer för **GitHub Pages-klienten** och en
**Render-server på gratisplan**. Varken en aktiv Pages-sajt eller en Render-tjänst
är ännu verifierad. Kontobehörighet och fungerande nätverksåtkomst krävs för att
aktivera dem; en konfigurationsfil eller en kodpush bevisar inte att de är driftsatta.

## 1. Skapa multiplayer-servern på Render

[Öppna Render Blueprint för detta repo](https://render.com/deploy?repo=https://github.com/Limpaaan/Speltest-Mk.I).
Logga in på Render och koppla GitHub-repot om tjänsten ber om det. För privata
repon behöver Render tillgång till just detta repo via GitHub-integrationen.

`render.yaml` anger:

- Node.js 24, region Frankfurt och **plan: free**.
- Bygge: `npm ci && npm test && npm run build`.
- Start: `npm start`, med tjänstens injicerade `PORT` och `HOST=0.0.0.0`.
- Hälsokontroll: `/health`.
- Tillåten webbläsarorigin: `https://limpaaan.github.io`.
- Ingen databas, betald disk eller annan betald tilläggstjänst.

Granska att planen fortfarande visas som gratis innan tjänsten skapas. Gratisvillkor
kan ändras; de har inte kunnat kontrolleras från den aktuella molnmiljön. På Renders
vanliga gratisupplägg går inaktiva tjänster i vila. Klienten tillåter därför upp till
90 sekunders anslutningstid när en extern server är konfigurerad. Ett felmeddelande
från tjänsten kan ändå kräva ett nytt anslutningsförsök efter att servern vaknat.

När Render visar tjänsten som **Live**, kopiera dess **faktiska** HTTPS-adress.
Anta inte att namnet i Blueprint-filen blir den exakta adressen; Render kan lägga
till ett suffix. Kontrollera att `/health` svarar med `status: ok`.

## 2. Koppla Pages till rätt server

Ägaren har angett Render-adressen `https://avesta-sista-skiftet.onrender.com`.
Pages-flödet använder därför följande adress som standard, utan extra inställningar:

```text
wss://avesta-sista-skiftet.onrender.com/ws
```

För att byta server, öppna **Settings → Secrets and variables → Actions → Variables**
och ange repository variable `VITE_GAME_SERVER_URL`. Den ersätter standardadressen.
Använd protokollet `wss://` och sökvägen `/ws`. Detta är offentlig klientkonfiguration;
en API-nyckel får aldrig läggas i någon `VITE_*`-variabel.

Pages-byggets webbläsartest kontrollerar att multiplayer är tillgängligt och att
klienten skickar anslutningen till den konfigurerade WebSocket-adressen. Testet
ersätter nätverksanslutningen med ett testsvar; det verifierar inte Render-tjänstens
publika tillgänglighet. Det kontrollerar också att solospel fungerar offline.

Fristående statiska byggen med `VITE_STATIC_HOST=true` och utan serveradress ger
fortfarande en soloklient med avstängd multiplayerknapp.

## 3. Aktivera och publicera Pages

1. I **Settings → Pages**, välj **GitHub Actions** som källa.
2. Öppna **Actions → Publish browser game → Run workflow**, välj `main`.
3. När körningen lyckats, använd speladressen från miljön **github-pages**.

Flödet kör spelreglerna och webbläsartesterna före det slutliga Pages-bygget.
Därefter publicerar kommande pushar till `main` automatiskt. När servervariabeln
ändras behöver flödet köras igen för att klienten ska få den nya adressen.
Repots plan och synlighet måste stödja GitHub Pages.

## 4. Kontrollera den publicerade versionen

- Öppna den verkliga Pages-adressen, välj användarnamn och starta solo.
- Besök Maja med E och ta ett uppdrag. Kontrollera att offlineframsteg sparas.
- Öppna två separata webbläsarflikar, välj olika namn och samma rumskod i multiplayer.
  Båda ska visa två spelare och gemensamt tillstånd. Ge en vilande server tid att starta.
- Vänta tills klienten meddelar att offlinecachen installerats. Koppla bort nätverket,
  ladda om Pages-adressen och prova solo igen.

Servern accepterar webbläsaranslutningar från Pages-origin enligt `ALLOWED_ORIGIN`.
Att öppna Render-serverns egen startsida är därför inte samma multiplayerkontroll
som att ansluta från Pages. Ändra origin om du senare använder en egen domän.

## Driftens gränser

Spelare behöver ingen installation. Efter första kompletta HTTPS-besöket fungerar
den cachade soloklienten offline. Sparningar tillhör den aktuella webbläsaren/origin.

Multiplayer är sessionsbaserad. Rum och framsteg försvinner när sista spelaren
lämnar, processen startas om eller tjänsten går i vila. Gratisdrift är lämplig för
provspelning; den här konfigurationen erbjuder inte en beständig onlinespelvärld.
Exakt namnet AdminL ger alla som väljer det fuskåtkomst enligt beställningen.
Det är inte ett autentiserat administratörskonto.

För egen drift används samma `npm ci`, `npm run build`, `npm start`, Node.js 24,
HTTPS/WSS-proxy och `ALLOWED_ORIGIN`. Porten är 3000 om värden inte sätter `PORT`.
