import { CONTRACTS } from './story.js';
export const VOICE_PROFILES = {
  maja: { name: 'Maja', voice: 'sv-SE-SofieNeural', rate: '-3%', pitch: '-4Hz', lang: 'sv-SE' },
  torsten: {
    name: 'Torsten',
    voice: 'sv-SE-MattiasNeural',
    rate: '-8%',
    pitch: '-14Hz',
    lang: 'sv-SE',
  },
  liv: { name: 'Liv', voice: 'sv-SE-SofieNeural', rate: '-10%', pitch: '+8Hz', lang: 'sv-SE' },
  einar: { name: 'Einar', voice: 'sv-SE-MattiasNeural', rate: '+9%', pitch: '+7Hz', lang: 'sv-SE' },
  anders: {
    name: 'Anders',
    voice: 'sv-SE-MattiasNeural',
    rate: '-4%',
    pitch: '-3Hz',
    lang: 'sv-SE',
  },
  signe: {
    name: 'Signe',
    voice: 'da-DK-ChristelNeural',
    rate: '-4%',
    pitch: '-2Hz',
    lang: 'da-DK',
  },
  raider: {
    name: 'Kompanisoldat',
    voice: 'da-DK-JeppeNeural',
    rate: '+8%',
    pitch: '-3Hz',
    lang: 'da-DK',
  },
  heavy: {
    name: 'Pansarvakt',
    voice: 'da-DK-JeppeNeural',
    rate: '-6%',
    pitch: '-18Hz',
    lang: 'da-DK',
  },
  marksman: {
    name: 'Kompaniskytt',
    voice: 'da-DK-ChristelNeural',
    rate: '+7%',
    pitch: '-7Hz',
    lang: 'da-DK',
  },
  rusher: {
    name: 'Stormare',
    voice: 'da-DK-JeppeNeural',
    rate: '+16%',
    pitch: '+10Hz',
    lang: 'da-DK',
  },
};
const briefings = [
  [
    'maja',
    'Jag tänkte stryka ditt namn i går. Tur att pennan frös. Min bror Nils saknas. Följ älven till Koppardalen och rekognoscera passagen. Vi behöver en säker väg.',
  ],
  [
    'torsten',
    'Slaggjarlen håller Verket. Slå ut fem kompanisoldater och besegra honom. Ta hans orderbok. Vi måste få veta vart de fört driftpersonalen.',
  ],
  [
    'einar',
    'Transporten står vid Dalahästen i Åsbo. Ryttmästare Mörk bevakar nyckeln. Besegra honom och öppna vår samlingsplats igen.',
  ],
  [
    'torsten',
    'Gå in i Aaltohuset genom den östra entrén. Driftjournalen finns i det västra arkivrummet. Jag behöver originalschemat. Följ guldmarkeringen på kartan.',
  ],
  [
    'einar',
    'Säkra området vid Skogsbos reservradio. Tryck E och stå still i sex sekunder. Vi ska få kontakt med Lärka. Rörelse och strid bryter arbetet.',
  ],
  [
    'liv',
    'Sjukstugans värme kommer först. Starta reservaggregatet i Prästjorden. Tryck E och håll positionen i sex sekunder. Bränsle och delar är redan framlagda.',
  ],
  [
    'einar',
    'Gå till sambandslådan vid Skogsbobrons markerade brofäste. Tryck E och håll förbindelsen i åtta sekunder. Använd bron. Gå inte genom älven.',
  ],
  [
    'torsten',
    'Återvänd till Verket. Vid den manuella omkopplaren trycker du E och håller positionen i tio sekunder. Säkra området först. Jag leder dig över radion. Sedan återvänder du till Maja.',
  ],
];
const lines = (profile, texts) =>
  texts.map((text, i) => ({ id: `enemy-${profile}-${i}`, profile, text, kind: 'enemy' }));
export const ENEMY_LINES = [
  ...lines('raider', [
    'Kom frem! Jeg kan høre dine træsko!',
    'Du kan ikke gemme dig bag en dalahest!',
    'Hænderne op! Jeg har stadig kaffe i termokanden!',
  ]),
  ...lines('heavy', [
    'Dalahesten redder dig ikke!',
    'Vi tager broen, og bagefter tager vi kaffen!',
    'Nu bliver der ballade!',
  ]),
  ...lines('marksman', [
    'Stå stille! Du ødelægger mit sigte!',
    'Der er du! Ingen gemmer sig for Jernsund!',
    'Jeg kan se dig. Og nej, det er ikke en invitation til kaffe!',
  ]),
  ...lines('rusher', [
    'Jeg havde fri i dag, så skynd dig!',
    'Tilbage til jeres værksted!',
    'Løb bare! Jeg har taget løbeskoene på!',
  ]),
];
const greeting = (id, text) => ({ id: `npc-${id}`, profile: id, text, kind: 'npc' });
export const SPEECH = [
  greeting(
    'maja',
    'Välkommen hem till Avesta. Vi håller ihop och vi lämnar ingen bakom oss. Jag har arbete åt dig.',
  ),
  greeting(
    'torsten',
    'Verket må stå still, men mina händer gör det inte. Behöver du vapen, delar eller granater? Då har du kommit rätt.',
  ),
  greeting(
    'liv',
    'Ingen lämnas bakom. Kom hit så ser jag över dina sår. Du gör ingen nytta om du stupar på vägen.',
  ),
  greeting(
    'einar',
    'Följ broarna och håll ögonen öppna. Kompaniet håller posteringarna, men resten av staden är vår väg igenom.',
  ),
  greeting(
    'anders',
    'Glass eller döskalle? Jag ritar båda. En färgburk kostar tjugofem brukskronor och räcker till ett motiv.',
  ),
  ...CONTRACTS.flatMap((contract, i) => [
    { id: `brief-${contract.id}`, profile: briefings[i][0], text: briefings[i][1], kind: 'quest' },
    {
      id: `debrief-${contract.id}`,
      profile: briefings[i][0],
      text: contract.debrief.replace(/[”„]/g, ''),
      kind: 'quest',
    },
    {
      id: `discovery-${contract.id}`,
      profile: i === 4 ? 'signe' : briefings[i][0],
      text: contract.discovery.replace(/[”„]/g, ''),
      kind: 'quest',
    },
  ]),
  ...ENEMY_LINES,
].map((line) => ({ ...line, file: `voices/${line.id}.mp3` }));
export const speechLine = (id) => SPEECH.find((line) => line.id === id);
