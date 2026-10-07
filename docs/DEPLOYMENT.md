# Spela i webbläsaren utan installation

Spelaren öppnar spelets webbplats i en modern datorwebbläsare med WebGL,
tangentbord och mus. Node.js behövs bara för utveckling och serverdrift.
Efter första färdiga besöket på HTTPS fungerar den cachade soloklienten även
utan nätverk. Sparningen är lokal i samma webbläsare; multiplayer kräver nätverk.

## GitHub Pages

1. I repots **Settings → Pages**, välj **GitHub Actions** som källa.
2. Öppna **Actions → Publish browser game → Run workflow**, välj `main`.
3. När körningen lyckats visar GitHubs `github-pages`-miljö den riktiga speladressen.

Publiceringen är förberedd, men någon aktiv publik speladress är inte verifierad.
Repots GitHub-plan/synlighet måste stödja Pages. En kodpush publicerar inte automatiskt spelet.

Pages kör soloklienten. Multiplayer behöver en separat Node-server med HTTPS/WSS.
Sätt repovariabeln `VITE_GAME_SERVER_URL` till den fullständiga adressen,
exempelvis `wss://spelserver.example.se/ws`, före Pages-bygget. Utan adressen är
multiplayerknappen avstängd på Pages. Variabeln är offentlig klientkonfiguration;
den får inte innehålla hemligheter.

## Samma server för klient och multiplayer

Kör `npm ci`, `npm test`, `npm run build` och `npm start` på en Node.js24-värd.
Sätt `ALLOWED_ORIGIN` till klientens exakta HTTPS-origin och använd en reverse
proxy med WebSocket-stöd. `PORT` är3000 som standard. En vanlig gemensam Node-värd
lämnar båda `VITE_*`-variablerna osatta. För Pages-origin anges till exempel
`https://limpaaan.github.io` utan projektsökvägen.

Kontrollera `/health`, anslut två webbläsare till samma rum och prova spelet.
Rum och multiplayerframsteg försvinner när sista spelaren lämnar eller processen
startas om. Exakt namnet AdminL ger alla som väljer det fuskåtkomst i rummet,
enligt prototypens beställning; det är inte ett autentiserat administratörskonto.
