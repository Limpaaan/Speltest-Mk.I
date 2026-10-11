import { classNodes } from './class-skills.js';
export const SPECIALTIES = {
  stalvakt: ['rifle', 'lmg'],
  skogsvandrare: ['scout'],
  kopparslagare: ['shotgun'],
  alvvakt: ['smg'],
  faltvardare: ['pistol'],
  bruksingenjor: ['lmg'],
};
export function canEquip(p, kind) {
  return (
    kind !== 'lmg' ||
    ['stalvakt', 'bruksingenjor'].includes(p.classId) ||
    p.skills?.includes('heavy_training')
  );
}
const common = [
  {
    id: 'weapon_training',
    name: 'Vapenmästare',
    cost: 1,
    level: 2,
    text: '+15% skada med klassens specialvapen.',
  },
  {
    id: 'fieldcraft',
    name: 'Fältvana',
    cost: 1,
    level: 2,
    text: '+10% rörelse och +25% materialfynd.',
  },
  {
    id: 'heavy_training',
    name: 'Tung vapenträning',
    cost: 2,
    level: 4,
    parent: 'weapon_training',
    text: 'Lås upp kulspruta oavsett klass och ladda den 15% snabbare.',
  },
  {
    id: 'armor_training',
    name: 'Bruksrustning',
    cost: 2,
    level: 4,
    parent: 'fieldcraft',
    text: 'Lås upp rustning nivå 3 och få ytterligare 4% skademinskning.',
  },
];
export const BRANCH_ABILITIES = {
  stalvakt: [
    ['Bastion', 'Halverar skada för närliggande allierade i 8 sekunder.'],
    ['Stålsalva', 'Dubblerad eldhastighet i 6 sekunder.'],
  ],
  skogsvandrare: [
    ['Kamouflage', 'Fiender upptäcker dig först inom 14 meter i 10 sekunder; skott avslöjar dig.'],
    ['Jaktfokus', '+50% skada med m/96 i 8 sekunder.'],
  ],
  kopparslagare: [
    ['Slaggsköld', '60% skademinskning i 8 sekunder.'],
    ['Brukets åska', 'En riktad granat med 50% större sprängskada, förbrukar en granat.'],
  ],
  alvvakt: [
    ['Broförsvar', 'Förstärker allierades skydd i 8 sekunder.'],
    ['Forsrusning', '+60% fart i 8 sekunder utan uthållighetskostnad.'],
  ],
  faltvardare: [
    ['Fältsjukhus', 'Läker dig och närliggande allierade helt.'],
    ['Akutinsats', 'Återupplivar närmaste fallna allierade inom 10 meter med halv hälsa.'],
  ],
  bruksingenjor: [
    ['Reparationsfält', 'Förstärker allierades skydd och läker 35 hälsa.'],
    ['Övertryck', '+40% vapenskada i 8 sekunder.'],
  ],
};
export function talentTree(classId) {
  return [
    ...common,
    ...classNodes(classId),
    ...BRANCH_ABILITIES[classId].map(([name, text], i) => ({
      id: i ? 'assault_ability' : 'support_ability',
      name,
      text,
      cost: 2,
      level: 3,
      parent: i ? 'weapon_training' : 'fieldcraft',
      exclusive: i ? 'support_ability' : 'assault_ability',
    })),
    {
      id: 'mastery',
      name: 'Dalarnas mästare',
      cost: 3,
      level: 8,
      parentAny: ['support_ability', 'assault_ability'],
      text: 'Specialförmågan laddar om 25% snabbare.',
    },
  ];
}
export const armorLimit = (p) =>
  ['stalvakt', 'bruksingenjor'].includes(p.classId) || p.skills?.includes('armor_training') ? 3 : 2;
export function skillFailure(p, id) {
  const node = talentTree(p.classId).find((n) => n.id === id);
  if (!node) return 'Okänd talang.';
  if (p.skills.includes(id)) return 'Redan upplåst.';
  if (p.level < node.level) return `Kräver nivå ${node.level}.`;
  if (p.points < node.cost) return `Kräver ${node.cost} talangpoäng.`;
  if (node.parent && !p.skills.includes(node.parent)) return 'Lås upp föregående talang först.';
  if (node.parentAny && !node.parentAny.some((k) => p.skills.includes(k)))
    return 'Lås upp en specialförmåga först.';
  if (node.exclusive && p.skills.includes(node.exclusive)) return 'Du har valt den andra grenen.';
  return '';
}
export function talentAction(w, p, a, { notice, maxHp, inArena, clearShot, grenade }) {
  if (a.type === 'learn') {
    const error = skillFailure(p, a.id);
    if (error) {
      notice(w, p, error);
      return true;
    }
    const node = talentTree(p.classId).find((n) => n.id === a.id);
    p.points -= node.cost;
    p.skills.push(node.id);
    notice(w, p, `${node.name} upplåst.`);
    return true;
  }
  if (a.type !== 'special') return false;
  const support = p.skills.includes('support_ability'),
    assault = p.skills.includes('assault_ability');
  if ((!support && !assault) || p.specialCooldown > 0) return true;
  const allies = Object.values(w.players).filter(
    (t) =>
      Math.hypot(t.x - p.x, t.z - p.z) <= 22 &&
      !(w.pvp && p.pvp && t.pvp && t.id !== p.id && inArena(p) && inArena(t)) &&
      clearShot(p, t),
  );
  if (assault && p.classId === 'faltvardare') {
    const target = allies
      .filter((t) => t.hp <= 0 && Math.hypot(t.x - p.x, t.z - p.z) <= 10)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!target) {
      notice(w, p, 'Ingen fallen allierad inom 10 meter.');
      return true;
    }
    target.hp = maxHp(target) / 2;
  }
  if (assault && p.classId === 'kopparslagare') {
    if (!grenade()) {
      notice(w, p, 'Granaten är inte redo, eller du är i skyddad zon.');
      return true;
    }
  }
  p.specialCooldown = p.skills.includes('mastery') ? 30 : 40;
  p.specialBuff = 8;
  if (support) {
    if (p.classId === 'skogsvandrare') p.camouflage = 10;
    else if (p.classId === 'kopparslagare') p.slagShield = 8;
    else
      for (const ally of allies.filter((t) => t.hp > 0)) {
        if (p.classId === 'faltvardare') ally.hp = maxHp(ally);
        else {
          ally.bastion = 8;
          if (p.classId === 'bruksingenjor') ally.hp = Math.min(maxHp(ally), ally.hp + 35);
        }
      }
  } else if (p.classId === 'stalvakt') p.specialBuff = 6;
  notice(w, p, `${BRANCH_ABILITIES[p.classId][assault ? 1 : 0][0]}!`);
  return true;
}
export function restoreTalents(p, raw) {
  p.skills = [];
  let budget = Math.max(0, p.level - 1 - p.power - p.vitality);
  const requested = Array.isArray(raw) ? raw : [];
  for (const node of talentTree(p.classId))
    if (requested.includes(node.id)) {
      const previous = p.points;
      p.points = budget;
      if (!skillFailure(p, node.id)) {
        p.skills.push(node.id);
        budget -= node.cost;
      }
      p.points = previous;
    }
  p.points = Math.min(p.points, budget);
}
