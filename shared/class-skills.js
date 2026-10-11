import { clearShot, inArena, inSanctuary } from './map.js';

export const CLASS_SKILLS = {
  stalvakt: [
    ['furnace', 'Ugnshärdad', '+25 maximal hälsa.'],
    ['brace', 'Förankrad', 'Hukande och stilla: 30% mindre rekyl med automatkarbin och kulspruta.'],
    [
      'Skiftets samlingsrop',
      'X: locka synliga fiender inom 24 m mot dig i 8 s. Återfå 40 uthållighet och få 30% skydd i 6 s.',
    ],
  ],
  skogsvandrare: [
    [
      'softstep',
      'Mossgång',
      'Hukande upptäcks du på 40% kortare avstånd. Återhämtar uthållighet 25% snabbare.',
    ],
    [
      'marksman',
      'Jägarens andning',
      '+15% skada och 25% mindre rekyl med m/96 när du siktar stilla.',
    ],
    [
      'Spårläsning',
      'X: patruller markeras på kartan i 45 s och kamouflage varar 6 s. Skott bryter kamouflaget.',
    ],
  ],
  kopparslagare: [
    ['shellsmith', 'Patronsmed', 'Hagelgevär laddas 20% snabbare.'],
    ['blastcraft', 'Sprängarvana', '+25% granatskada. Kräver fortfarande egna granater.'],
    [
      'Nithammaren',
      'X: 30 skada och avbrott i 3 s mot synliga fiender inom 12 m. Bossar avbryts i 1 s.',
    ],
  ],
  alvvakt: [
    ['riverstride', 'Forsvana', 'Sprint förbrukar 25% mindre uthållighet.'],
    [
      'bridgeaim',
      'Brofästets skytt',
      'Ingen fartförlust när du siktar med kpist; 30% mindre spridning.',
    ],
    [
      'Räddningsled',
      'X: du och synliga allierade inom 18 m återfår 45 uthållighet och får 20% högre fart i 6 s.',
    ],
  ],
  faltvardare: [
    [
      'sterile',
      'Rena förband',
      'Håll ihop läker 20 extra hälsa. Första hjälpen läker 95 i stället för 70.',
    ],
    ['sidearm', 'En hand fri', 'Pistoler laddas 25% snabbare och ger 10% mer skada.'],
    [
      'Triage',
      'X: du och synliga allierade inom 18 m återfår 6 hälsa per sekund i 8 s. Återupplivar inte fallna.',
    ],
  ],
  bruksingenjor: [
    ['salvager', 'Kretsletare', '+50% fynd av elektronik och koppar vid bärgning.'],
    [
      'benchtest',
      'Bänkprovad',
      'Hukande med kulspruta: 20% snabbare omladdning och 25% mindre rekyl.',
    ],
    [
      'Störsändare',
      'X: stör synliga fienders samband inom 24 m och avbryt dem i 4 s. Bossar avbryts i 1,5 s. Ingen skada.',
    ],
  ],
};
export function classNodes(classId) {
  const nodes = CLASS_SKILLS[classId];
  return [
    ...nodes.slice(0, 2).map(([id, name, text], i) => ({
      id,
      name,
      text,
      cost: 1,
      level: i ? 4 : 2,
      parent: i ? 'weapon_training' : 'fieldcraft',
    })),
    {
      id: 'class_utility',
      name: nodes[2][0],
      text: nodes[2][1],
      cost: 2,
      level: 5,
      parent: nodes[0][0],
    },
  ];
}
export const hasSkill = (p, key) => Boolean(p.skills?.includes(key));
export function classWeaponStats(p, stats) {
  if (hasSkill(p, 'brace') && p.crouch && !p.moving && ['rifle', 'lmg'].includes(p.weapon.kind))
    stats.recoil *= 0.7;
  if (hasSkill(p, 'marksman') && p.ads && !p.moving && p.weapon.kind === 'scout') {
    stats.damage *= 1.15;
    stats.recoil *= 0.75;
  }
  if (hasSkill(p, 'shellsmith') && p.weapon.kind === 'shotgun') stats.reload *= 0.8;
  if (hasSkill(p, 'bridgeaim') && p.weapon.kind === 'smg') stats.spread *= 0.7;
  if (hasSkill(p, 'sidearm') && p.weapon.kind === 'pistol') {
    stats.reload *= 0.75;
    stats.damage *= 1.1;
  }
  if (hasSkill(p, 'benchtest') && p.crouch && p.weapon.kind === 'lmg') {
    stats.reload *= 0.8;
    stats.recoil *= 0.75;
  }
  return stats;
}
export function tacticalAction(w, p, action, { notice, damageEnemy }) {
  if (action.type !== 'tactical') return false;
  if (!hasSkill(p, 'class_utility')) {
    notice(w, p, 'Lås upp din taktiska förmåga i talangträdet (I).');
    return true;
  }
  if (p.tacticalCooldown > 0) return true;
  const hostile = ['stalvakt', 'kopparslagare', 'bruksingenjor'].includes(p.classId);
  if (hostile && inSanctuary(p)) {
    notice(w, p, 'Den förmågan används utanför samlingsplatsens skydd.');
    return true;
  }
  const allies = Object.values(w.players).filter(
    (t) =>
      t.hp > 0 &&
      Math.hypot(p.x - t.x, p.z - t.z) <= 18 &&
      clearShot(p, t) &&
      !(w.pvp && p.pvp && t.pvp && t.id !== p.id && inArena(p) && inArena(t)),
  );
  if (p.classId === 'stalvakt') {
    p.protection = Math.max(p.protection, 6);
    p.stamina = Math.min(100, p.stamina + 40);
  }
  if (p.classId === 'skogsvandrare') {
    p.intel = Math.max(p.intel, 45);
    p.camouflage = Math.max(p.camouflage, 6);
  }
  if (p.classId === 'alvvakt')
    for (const t of allies) {
      t.stamina = Math.min(100, t.stamina + 45);
      t.riverHaste = 6;
    }
  if (p.classId === 'faltvardare') for (const t of allies) t.triage = 8;
  if (hostile)
    for (const e of w.enemies) {
      if (
        e.hp <= 0 ||
        Math.hypot(p.x - e.x, p.z - e.z) > (p.classId === 'kopparslagare' ? 12 : 24) ||
        !clearShot(p, e)
      )
        continue;
      if (p.classId === 'stalvakt') {
        e.targetId = p.id;
        e.alertUntil = w.time + 8;
        e.tauntTarget = p.id;
        e.tauntUntil = w.time + 8;
      } else {
        e.stagger = Math.max(
          e.stagger || 0,
          e.type === 'boss'
            ? p.classId === 'kopparslagare'
              ? 1
              : 1.5
            : p.classId === 'kopparslagare'
              ? 3
              : 4,
        );
        e.windup = 0;
        e.cooldown = Math.max(e.cooldown, e.stagger + 0.5);
        if (p.classId === 'kopparslagare') damageEnemy(w, e, 30, p);
      }
    }
  p.tacticalCooldown = 28;
  p.tacticalFlash = 0.8;
  notice(w, p, `${CLASS_SKILLS[p.classId][2][0]}!`);
  return true;
}
