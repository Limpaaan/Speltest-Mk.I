import { ARTIST } from './artist.js';
import { MAP, walkableNear, HUB } from './map.js';

export const CAMP = { x: MAP.spawn.x + 4, z: MAP.spawn.z - 2, name: 'Maja – skiftledare' };
import { CONTRACTS, STORY_SITES } from './story.js';
export { CONTRACTS } from './story.js';
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
      progress: 'Kopparhjärta är återtaget. Läs slutet i journalen (J).',
    };
  const parts = [];
  if (contract.place) parts.push(c.visited ? 'Koppardalen rekognoscerat' : 'Besök Koppardalen');
  if (contract.site)
    parts.push(
      c.visited
        ? 'Arbetet slutfört · läs fyndet i J'
        : `${STORY_SITES[contract.site].name} · E för att arbeta`,
    );
  if (p.storyChannel)
    parts.push(
      `${Math.floor(p.storyChannel.elapsed)}/${STORY_SITES[contract.site]?.seconds || 0} s`,
    );
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
      (!(contract.place || contract.site) || c.visited) &&
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
    if (enemy.type === 'boss' && contract.boss && enemy.landmark === contract.boss) c.boss = true;
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
  ARTIST,
  {
    id: 'torsten',
    name: 'Torsten – bruksrustmästare',
    classId: 'bruksingenjor',
    ...walkableNear(
      HUB.stations.find((n) => n.id === 'torsten').x,
      HUB.stations.find((n) => n.id === 'torsten').z,
    ),
    text: 'Verket må stå still, men mina händer gör det inte. Tre spränghandgranater kostar 20 skrot. Bär högst sex.',
    service: 'grenades',
    label: 'FYLL PÅ TRE GRANATER · 20 SKROT',
  },
  {
    id: 'liv',
    name: 'Liv – fältvårdare',
    classId: 'faltvardare',
    ...walkableNear(
      HUB.stations.find((n) => n.id === 'liv').x,
      HUB.stations.find((n) => n.id === 'liv').z,
    ),
    text: 'Ingen dalmas lämnas bakom. Jag läker alla dina sår för 10 skrot.',
    service: 'treatment',
    label: 'FULL BEHANDLING · 10 SKROT',
  },
  {
    id: 'einar',
    name: 'Einar – älvspanare',
    classId: 'skogsvandrare',
    ...walkableNear(
      HUB.stations.find((n) => n.id === 'einar').x,
      HUB.stations.find((n) => n.id === 'einar').z,
    ),
    text: 'Följ broarna och håll utkik efter röda prickskyttemantlar. Min spaning markerar fientliga patruller på kartan i två minuter.',
    service: 'intel',
    label: 'MARKERA PATRULLER I 120 SEKUNDER',
  },
];
export const nearbyNpc = (p) => NPCS.find((n) => Math.hypot(p.x - n.x, p.z - n.z) <= 5);
