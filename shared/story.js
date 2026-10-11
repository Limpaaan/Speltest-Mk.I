import { MAP, walkableNear, clearShot } from './map.js';
import { AALTO } from './interiors.js';

export const PROLOGUE =
  'När elen dog hördes fortfarande skiftvisslan över Avesta. Sedan kom Järnsundskompaniet, en dansk legostyrka som lovade värme i utbyte mot lydnad. De tog ställverken, broarna och radion. Tre veckor senare återvänder du hem. Vid samlingsplatsen håller skiftledaren Maja en lista över dem som saknas. Ditt namn står där, ännu inte överstruket.';
export const EPILOGUE =
  'Först tänds en lampa i sjukstugan. Sedan svarar Skogsbo på radion. Maja viker ihop listan över saknade; arbetet med att hitta dem börjar i morgon. Avesta är fortfarande sargat och kompaniets patruller finns kvar, men värmen och rösterna tillhör åter dem som bor här. Du vann inget rike. Du gav din hemstad en morgondag. Det sista skiftet blev det första.';
const outside = (id, name, seconds) => {
  const p = MAP.places.find((p) => p.id === id);
  return { name, seconds, ...walkableNear(p.x + p.w / 2 + 4, p.z + p.d / 2 + 4) };
};
const bridge = MAP.bridges.find((b) => b.name === 'Skogsbobron');
export const STORY_SITES = {
  archive: { name: 'Arkivets driftjournal', seconds: 3, x: AALTO.x - 7, z: AALTO.z - 4 },
  radio: outside('skogsbo', 'Skogsbos reservradio', 6),
  clinic: outside('prast', 'Sjukstugans reservaggregat', 6),
  bridge: { name: 'Brofästets sambandslåda', seconds: 8, ...walkableNear(...bridge.points[0]) },
  power: outside('verket', 'Verkets manuella omkopplare', 10),
};

// Original fiction. Apparatus, interiors and occupation are not historical/geographic claims.
// Keep the first three IDs and objectives stable for v0.5 saves.
export const CONTRACTS = [
  {
    id: 'kopparbud',
    title: 'Bud till Koppardalen',
    place: 'koppar',
    xp: 70,
    scrap: 40,
    act: 'I · Ett hem i mörker',
    text: 'Maja: ”Jag tänkte stryka ditt namn i går. Tur att pennan frös.” Hennes bror Nils arbetade vid reservkraften när kompaniet kom. Hans sista anrop nämnde Koppardalen. Följ älven dit och rekognoscera passagen. Utan en säker väg kommer vi varken åt Nils eller strömmen.',
    discovery:
      'På kajen ligger en övergiven kabelvinda. Någon har skrivit NILS / SKIFT 3 på den. Kabeln är kapad med verktyg, inte söndersliten av strid.',
    debrief:
      'Maja drar tummen över märkningen du ritat av. ”Han märkte allt så där. Till och med kaffekoppen.” Avbrottet var avsiktligt. Torsten känner igen kabeltypen: den går till Verkets reservställverk.',
  },
  {
    id: 'slagg',
    title: 'Tänd brukets hopp',
    kills: 5,
    boss: 'verket',
    xp: 180,
    scrap: 90,
    act: 'I · Ett hem i mörker',
    text: 'Torsten har sett Slaggjarlen bära iväg driftpersonal från Verket. Slå ut fem kompanisoldater under uppdraget och besegra honom. Maja vill ha orderboken, inte hans troféer. ”Om Nils lever har de ett arbete åt honom. Ta reda på vilket.”',
    discovery:
      'Orderboken beskriver ett isolerat kraftnät: KOPPARHJÄRTA. Kompaniet ska skicka energin till sitt eget förråd medan bostäderna förblir mörka. En anteckning lyder: Nyckelbärare till Åsbo.',
    debrief:
      'Torsten känner igen sitt gamla projekt i orderboken. Kopparhjärta skulle hålla sjukstugor och bostäder varma under ett långt avbrott. Nu används samma ledningar för att tvinga staden till lydnad. Nyckeln förs med kompaniets transport genom Åsbo.',
  },
  {
    id: 'horse',
    title: 'Hästen ska stå fri',
    boss: 'horse',
    xp: 250,
    scrap: 130,
    act: 'I · Ett hem i mörker',
    text: 'Ryttmästare Mörk bevakar transporten vid Dalahästen. Besegra honom och ta tillbaka driftpersonalens nyckel. Einar säger att folk fortfarande går dit för att leta efter anhöriga. ”De valde vår samlingsplats till vägspärr. Det är dags att öppna den igen.”',
    discovery:
      'I transportens order ligger en mässingsnyckel och en vikt lapp: Aalto. Pappersarkivet. Lita inte på schemat i ställverket. / N',
    debrief:
      'Maja vill genast springa till Aaltohuset, men Liv får henne att sätta sig. Handskriften är Nils. Nyckeln passar arkivet, och hans varning betyder att någon ändrat kopplingsschemat. Att bara slå på strömmen kan bli ödesdigert.',
  },
  {
    id: 'arkivet',
    title: 'Det som aldrig digitaliserades',
    site: 'archive',
    xp: 220,
    scrap: 70,
    act: 'II · Röster under bruset',
    text: 'Gå in i Aaltohuset genom den östra entrén och läs driftjournalen i västra arkivrummet. Följ den guldfärgade markeringen på kartan. Torsten behöver originalschemat för att förstå vad kompaniet ändrat. Bärgningslådorna i huset är separata fynd; journalen finns kvar även om de redan är tömda.',
    discovery:
      'Nils har ringat in tre punkter: Skogsbo, Prästjorden och brofästet. Under dem: Sjukhusledningen är felmärkt. Bryt aldrig innan reservaggregatet går. På sista sidan finns ett anropsnamn: LÄRKA.',
    debrief:
      'Torsten lägger originalet över kompaniets schema. Om huvudbrytaren slås till nu går sjukstugans utrustning sönder. Nils har lämnat en säker ordning och ett radioanrop. Einar minns rösten bakom Lärka: en dansk sambandstekniker som försökt varna civila.',
  },
  {
    id: 'larka',
    title: 'En röst från andra sidan',
    site: 'radio',
    xp: 230,
    scrap: 75,
    act: 'II · Röster under bruset',
    text: 'Ställ in reservradion vid Skogsbo på Lärkas frekvens. Tryck E vid apparaten och stå still i sex sekunder; rörelse, skott eller skada bryter arbetet. Säkra området först. Einar följer bruset från lägret, men det är du som måste få kontakt.',
    discovery:
      '”Jag heter Signe”, säger rösten. ”Jag lagade radio. Jag skrev aldrig under på att frysa ut familjer.” Hon såg Nils föras ut ur staden, vid liv. Hon kan öppna kompaniets frekvens en enda gång, om sjukstugan och broreläet är redo.',
    debrief:
      'Maja är tyst länge. Nils lever, men går inte att nå i natt. ”Då gör vi det han bad oss om.” Signe skickar en verifieringskod. Liv påminner er om det viktigaste: utan sjukstugans reservkraft blir en seger vid ställverket bara ännu en förlust.',
  },
  {
    id: 'varmen',
    title: 'Värmen först',
    site: 'clinic',
    xp: 240,
    scrap: 80,
    act: 'III · Ingen lämnas i mörkret',
    text: 'Starta reservaggregatet utanför sjukstugan i Prästjorden. Liv har redan lagt fram bränsle och delar; din uppgift är att säkra platsen och hålla startkretsen sluten i sex sekunder. Vi återtar elen för dem som behöver den, inte för att få en flagga att synas bättre.',
    discovery:
      'Motorn hostar, stannar och hittar sedan sin rytm. Inifrån huset hörs ett skratt när den första lampan tänds. Liv ropar i radion: ”Temperaturen stiger. Fortsätt. Vi klarar oss här.”',
    debrief:
      'Maja gör det första märket på den rena sidan av sin lista: Prästjorden – ström. Signe har hållit sitt löfte. Nu återstår broreläet, så att båda sidor av älven kan höra samma instruktion när Torsten kopplar om.',
  },
  {
    id: 'samband',
    title: 'Över samma älv',
    site: 'bridge',
    xp: 260,
    scrap: 90,
    act: 'III · Ingen lämnas i mörkret',
    text: 'Öppna sambandslådan vid Skogsbobrons markerade brofäste och håll förbindelsen i åtta sekunder. Signe behöver den tiden för att släppa igenom er utsändning. Brons namn är en riktning; den exakta arbetsplatsen visas med guld på kartan. Gå över bron, inte genom älven.',
    discovery:
      'Bruset öppnar sig. Signe räknar ner, och sedan hör du Maja: ”Alla skift, lyssna. Håll bostadsledningarna öppna. Rör inte sjukstugans reserv.” För första gången svarar röster från båda stränderna.',
    debrief:
      'Einar får svar från Skogsbo, Åsbo och kvarteren vid älven. Ingen av dem frågar vem som ska få äran. De frågar när de ska slå till sina brytare. Torsten räcker dig originalschemat: ”Nu gör vi ett riktigt skift.”',
  },
  {
    id: 'kopparhjarta',
    title: 'Det första skiftet',
    site: 'power',
    xp: 400,
    scrap: 150,
    act: 'III · Ingen lämnas i mörkret',
    text: 'Återvänd till Verket och använd den manuella omkopplaren utanför anläggningen. Håll positionen i tio sekunder medan Torsten leder dig över radion. Patrullerna är fortfarande farliga; ta hjälp av dina klassförmågor eller säkra området först. Återvänd sedan till Maja.',
    discovery:
      '”Ett. Två. Håll kvar.” Kontakten slår med ett ljud som känns i bröstet. Ingen explosion. Bara en fläkt som börjar snurra, ett kylskåp som brummar och en rad röster som säger: Vi har ström.',
    debrief: EPILOGUE,
  },
];

export function currentSite(p) {
  const c = p.campaign;
  return c?.active && !c.visited ? STORY_SITES[CONTRACTS[c.step]?.site] : undefined;
}
export function nearbyStory(p) {
  const s = currentSite(p);
  return s && Math.hypot(p.x - s.x, p.z - s.z) <= 3 && clearShot(p, s) ? s : undefined;
}
export function storyAction(w, p, action, notice) {
  if (action.type !== 'story') return false;
  const site = nearbyStory(p);
  if (!site || p.storyChannel) return true;
  p.storyChannel = { step: p.campaign.step, elapsed: 0, x: p.x, z: p.z, hp: p.hp };
  notice(
    w,
    p,
    `${site.name}: stå still i ${site.seconds} sekunder. Skott, rörelse eller skada avbryter.`,
  );
  return true;
}
export function tickStory(w, p, dt, notice) {
  const channel = p.storyChannel;
  if (!channel) return;
  const site = nearbyStory(p);
  if (
    !site ||
    channel.step !== p.campaign.step ||
    p.hp <= 0 ||
    p.hp < channel.hp ||
    Math.hypot(p.x - channel.x, p.z - channel.z) > 0.15 ||
    p.input.fire ||
    p.input.x ||
    p.input.z
  ) {
    p.storyChannel = null;
    notice(w, p, 'Arbetet avbröts. Säkra platsen och tryck E för att börja om.');
    return;
  }
  channel.hp = p.hp;
  channel.elapsed += dt;
  if (channel.elapsed + 1e-6 >= site.seconds) {
    p.campaign.visited = true;
    p.storyChannel = null;
    notice(w, p, 'Fynd antecknat i journalen (J). Återvänd till Maja.');
  }
}
export function campaignTarget(p) {
  const c = p.campaign,
    q = CONTRACTS[c?.step];
  if (!q || !c.active) return null;
  if (q.site && !c.visited) return STORY_SITES[q.site];
  if (q.place && !c.visited) return MAP.places.find((v) => v.id === q.place);
  if (q.boss && (!c.boss || c.kills < (q.kills || 0)))
    return MAP.places.find((v) => v.id === q.boss);
  return { x: MAP.spawn.x + 4, z: MAP.spawn.z - 2, name: 'Maja · lämna in uppdraget' };
}
