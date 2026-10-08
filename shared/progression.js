import { MAP, walkableNear } from './map.js';

export const CAMP = { x: MAP.spawn.x + 4, z: MAP.spawn.z - 2, name: 'Maja – skiftledare' };
export const CONTRACTS = [
  {
    id: 'kopparbud',
    title: 'Bud till Koppardalen',
    text: 'Vi håller ihop här. Rekognoscera Koppardalen och kom tillbaka med besked om vägen längs älven.',
    place: 'koppar',
    xp: 70,
    scrap: 40,
  },
  {
    id: 'slagg',
    title: 'Tänd brukets hopp',
    text: 'Järnsundskompaniet håller Verket. Besegra fem soldater och Slaggjarlen under detta uppdrag. Återvänd sedan till mig.',
    kills: 5,
    boss: 'verket',
    xp: 180,
    scrap: 90,
  },
  {
    id: 'horse',
    title: 'Hästen ska stå fri',
    text: 'Dalahästen är vår samlingssymbol. Besegra Ryttmästare Mörk och återvänd. De ska veta att Avesta står kvar.',
    boss: 'horse',
    xp: 250,
    scrap: 130,
  },
];
export const RECIPES = {
  rifle: { name: 'Bruksbössan', cost: 60 },
  shotgun: { name: 'Slaggkastaren', cost: 80 },
  scout: { name: 'Dalälvens öga', cost: 100 },
  pistol: { name: 'Bergslagspistolen', cost: 40 },
  smg: { name: 'Kopparsprutan', cost: 70 },
  lmg: { name: 'Stålregnet', cost: 120 },
};
export const atCamp = (p) => Math.hypot(p.x - CAMP.x, p.z - CAMP.z) <= 7;
export const armorCost = (p) => 40 + (p.armor || 0) * 40;
export const newCampaign = () => ({
  step: 0,
  active: false,
  visited: false,
  kills: 0,
  boss: false,
});
export function campaignStatus(p) {
  const c = p.campaign || newCampaign(),
    contract = CONTRACTS[c.step];
  if (!contract)
    return {
      complete: true,
      ready: false,
      title: 'Avesta står kvar',
      progress: 'Alla tre skiftuppdrag är klara.',
    };
  const parts = [];
  if (contract.place) parts.push(c.visited ? 'Koppardalen rekognoscerat' : 'Besök Koppardalen');
  if (contract.kills) parts.push(`${Math.min(c.kills, contract.kills)}/${contract.kills} soldater`);
  if (contract.boss)
    parts.push(
      c.boss
        ? 'Boss besegrad'
        : contract.boss === 'verket'
          ? 'Besegra Slaggjarlen'
          : 'Besegra Ryttmästare Mörk',
    );
  return {
    complete: false,
    title: contract.title,
    progress: c.active ? parts.join(' · ') : 'Prata med Maja vid samlingsplatsen',
    ready:
      c.active &&
      (!contract.place || c.visited) &&
      (!contract.kills || c.kills >= contract.kills) &&
      (!contract.boss || c.boss),
  };
}
export function trackCampaign(p, event, enemy) {
  const c = p.campaign,
    contract = CONTRACTS[c?.step];
  if (!c?.active || !contract) return;
  if (event === 'visit' && contract.place) {
    const place = MAP.places.find((p) => p.id === contract.place);
    if (Math.hypot(p.x - place.x, p.z - place.z) <= 24) c.visited = true;
  }
  if (event === 'kill') {
    if (enemy.type !== 'boss') c.kills = Math.min(999, c.kills + 1);
    if (contract.boss && enemy.landmark === contract.boss) c.boss = true;
  }
}
export function restoreCampaign(raw) {
  if (!raw || !Number.isInteger(raw.step) || raw.step < 0 || raw.step > CONTRACTS.length)
    return newCampaign();
  return {
    step: raw.step,
    active: raw.active === true && raw.step < CONTRACTS.length,
    visited: raw.visited === true,
    boss: raw.boss === true,
    kills: Number.isInteger(raw.kills) ? Math.max(0, Math.min(999, raw.kills)) : 0,
  };
}

export const craftCost = (p, kind) =>
  Math.ceil(RECIPES[kind].cost * (p.classId === 'bruksingenjor' ? 0.8 : 1));
export const NPCS = [
  {
    id: 'torsten',
    name: 'Torsten – bruksrustmästare',
    classId: 'bruksingenjor',
    ...walkableNear(MAP.spawn.x + 18, MAP.spawn.z + 4),
    text: 'Verket må stå still, men mina händer gör det inte. Tre spränghandgranater kostar 20 skrot. Bär högst sex.',
    service: 'grenades',
    label: 'FYLL PÅ TRE GRANATER · 20 SKROT',
  },
  {
    id: 'liv',
    name: 'Liv – fältvårdare',
    classId: 'faltvardare',
    ...walkableNear(MAP.spawn.x + 2, MAP.spawn.z + 23),
    text: 'Ingen dalmas lämnas bakom. Jag läker alla dina sår för 10 skrot.',
    service: 'treatment',
    label: 'FULL BEHANDLING · 10 SKROT',
  },
  {
    id: 'einar',
    name: 'Einar – älvspanare',
    classId: 'skogsvandrare',
    ...walkableNear(MAP.spawn.x - 14, MAP.spawn.z + 20),
    text: 'Följ broarna och håll utkik efter röda prickskyttemantlar. Min spaning markerar fientliga patruller på kartan i två minuter.',
    service: 'intel',
    label: 'MARKERA PATRULLER I 120 SEKUNDER',
  },
];
export const nearbyNpc = (p) => NPCS.find((n) => Math.hypot(p.x - n.x, p.z - n.z) <= 5);
