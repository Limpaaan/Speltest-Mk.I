import {
  atCamp,
  armorCost,
  newCampaign,
  campaignStatus,
  trackCampaign,
  restoreCampaign,
  CONTRACTS,
  RECIPES,
} from './progression.js';
import { navigate } from './navigation.js';
import {
  MAP,
  canStand,
  clearShot,
  inArena,
  inSanctuary,
  walkableNear,
  eyeHeight,
  bodyHeight,
  rayBoxDistance,
  raycastWorld,
} from './map.js';
export const CLASSES = {
  stalvakt: {
    name: 'Stålvakt',
    subtitle: 'Verkets sista försvarslinje',
    hp: 160,
    speed: 7,
    color: '#df784a',
    ability: 'Härdning',
    description: 'Stålarbetarens tålighet. Halverad skada i 6 sekunder.',
  },
  skogsvandrare: {
    name: 'Skogsvandrare',
    subtitle: 'Skogsbo håller stånd',
    hp: 105,
    speed: 8,
    color: '#98bd8e',
    ability: 'Skogens puls',
    description: 'Återfå 45 hälsa och spring snabbare i 6 sekunder.',
  },
  kopparslagare: {
    name: 'Kopparslagare',
    subtitle: 'Koppardalens glöd',
    hp: 125,
    speed: 7.3,
    color: '#e6b85c',
    ability: 'Slaggpuls',
    description: 'En stötvåg skadar fiender inom 32 meter.',
  },
  alvvakt: {
    name: 'Älvvakt',
    subtitle: 'Ingen tar våra broar',
    hp: 115,
    speed: 7.6,
    color: '#72bbd4',
    ability: 'Älvstorm',
    description: 'Dubblerad eldhastighet i 6 sekunder.',
  },
};
export const RARITIES = ['Vanlig', 'Ovanlig', 'Sällsynt', 'Legendarisk'];
export const RARITY_COLORS = ['#c6cacc', '#91ce84', '#74b6f5', '#ffc866'];
export const WEAPONS = {
  rifle: { name: 'Bruksbössan', damage: 19, delay: 0.25, range: 105, mag: 24, reload: 1.4 },
  shotgun: { name: 'Slaggkastaren', damage: 53, delay: 0.85, range: 40, mag: 6, reload: 1.8 },
  scout: { name: 'Dalälvens öga', damage: 65, delay: 0.95, range: 155, mag: 8, reload: 1.9 },
};
const finite = (n, fallback = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);
export function cleanInput(i = {}) {
  if (!i || typeof i !== 'object' || Array.isArray(i)) i = {};
  let x = Math.max(-1, Math.min(1, finite(i.x))),
    z = Math.max(-1, Math.min(1, finite(i.z)));
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  return {
    x,
    z,
    aim: finite(i.aim) % (Math.PI * 2),
    pitch: Math.max(-1.45, Math.min(1.45, finite(i.pitch))),
    fire: i.fire === true,
    ads: i.ads === true,
    crouch: i.crouch === true,
    sprint: i.sprint === true,
  };
}
export function makeWeapon(id, kind = 'rifle', rarity = 0, level = 1) {
  return {
    id,
    kind,
    rarity,
    level,
    name: WEAPONS[kind].name,
    damage: Math.round(WEAPONS[kind].damage * (1 + rarity * 0.25 + (level - 1) * 0.08)),
  };
}
export function maxHp(p) {
  return CLASSES[p.classId].hp + (p.level - 1) * 8 + p.vitality * 12;
}
export function xpNeeded(p) {
  return p.level * 100;
}
export function weaponStats(p) {
  return { ...WEAPONS[p.weapon.kind], damage: p.weapon.damage + p.power * 3 };
}
export function createWorld({ pvp = false, random = Math.random } = {}) {
  const w = {
    time: 0,
    players: {},
    enemies: [],
    loot: [],
    shots: [],
    nextId: 1,
    random,
    pvp,
    respawns: [],
  };
  const camps = MAP.places.filter((p) => !['aalto', 'horse'].includes(p.id));
  for (const camp of camps)
    for (let i = 0; i < 3; i++) {
      const position = walkableNear(camp.x + 30 + i * 9, camp.z + 28 + i * 7);
      spawnEnemy(w, position.x, position.z);
    }
  for (const [id, name, title] of [
    ['verket', 'Slaggjarlen', 'Verkets belägringsmaskin'],
    ['horse', 'Ryttmästare Mörk', 'Dalahästens ockupant'],
  ]) {
    const landmark = MAP.places.find((p) => p.id === id);
    const pos = walkableNear(landmark.x + 35, landmark.z + 35);
    spawnEnemy(w, pos.x, pos.z, 'boss', name, title).landmark = id;
  }
  return w;
}
export function spawnEnemy(w, x, z, type = 'raider', name, title) {
  const boss = type === 'boss';
  const e = {
    id: `e${w.nextId++}`,
    x,
    z,
    homeX: x,
    homeZ: z,
    type,
    name: name || 'Järnsundssoldat',
    title: title || 'Danska Järnsundskompaniet',
    hp: boss ? 900 : 70,
    maxHp: boss ? 900 : 70,
    cooldown: 1,
    phase: 'patrol',
    windup: 0,
  };
  w.enemies.push(e);
  return e;
}
export function addPlayer(w, id, name, classId) {
  if (typeof classId !== 'string' || !Object.hasOwn(CLASSES, classId)) classId = 'stalvakt';
  const weapon = makeWeapon(`w${w.nextId++}`);
  const p = {
    id,
    name:
      (typeof name === 'string' ? name : 'Dalmas').replace(/[\x00-\x1f<>]/g, '').slice(0, 24) ||
      'Dalmas',
    classId,
    ...MAP.spawn,
    aim: 0,
    pitch: 0,
    stamina: 100,
    crouch: false,
    ads: false,
    sprinting: false,
    hp: CLASSES[classId].hp,
    level: 1,
    xp: 0,
    points: 0,
    power: 0,
    vitality: 0,
    kills: 0,
    bosses: 0,
    pickups: 0,
    scrap: 0,
    armor: 0,
    crafted: 0,
    campaign: newCampaign(),
    weapon,
    inventory: [weapon],
    ammo: 24,
    reload: 0,
    cooldown: 0,
    abilityCooldown: 0,
    buff: 0,
    input: cleanInput(),
    quests: [],
    pvp: false,
    message: 'Välkommen hem. Avesta står kvar.',
    messageUntil: 5,
  };
  w.players[id] = p;
  return p;
}
export function notice(w, p, message) {
  p.message = message;
  p.messageUntil = w.time + 5;
}
export function rewardXp(w, p, amount) {
  p.xp += amount;
  while (p.level < 30 && p.xp >= xpNeeded(p)) {
    p.xp -= xpNeeded(p);
    p.level++;
    p.points++;
    p.hp = maxHp(p);
    notice(w, p, `Nivå ${p.level}! Tilldela din nya talangpoäng i packningen.`);
  }
  if (p.level === 30) p.xp = Math.min(p.xp, xpNeeded(p));
}
function questCheck(w, p) {
  const quests = [
    ['defend', p.kills >= 5, 100, 'Håll skiftet: fem invasionssoldater besegrade'],
    ['salvage', p.pickups >= 3, 80, 'Brukets arv: tre fynd bärgade'],
    ['boss', p.bosses >= 1, 200, 'Avesta står kvar: en boss besegrad'],
  ];
  for (const [id, done, xp, label] of quests)
    if (done && !p.quests.includes(id)) {
      p.quests.push(id);
      rewardXp(w, p, xp);
      p.scrap += 25;
      notice(w, p, `Uppdrag klart! ${label}. +${xp} XP`);
    }
}
function hurt(w, target, damage) {
  if (target.hp <= 0 || (target.classId && inSanctuary(target))) return;
  const armor = target.classId === 'stalvakt' && target.buff > 0 ? 0.5 : 1;
  target.hp = Math.max(
    0,
    target.hp - damage * armor * (target.classId ? 1 - (target.armor || 0) * 0.08 : 1),
  );
  if (target.classId && target.hp === 0)
    notice(w, target, 'Du föll för Avesta. Återvänd till samlingsplatsen.');
}
function killEnemy(w, e, p) {
  if (e.rewarded) return;
  e.rewarded = true;
  p.kills++;
  trackCampaign(p, 'kill', e);
  if (e.type === 'boss') p.bosses++;
  rewardXp(w, p, e.type === 'boss' ? 200 : 25);
  const roll = w.random(),
    rarity = e.type === 'boss' ? 3 : roll > 0.94 ? 2 : roll > 0.65 ? 1 : 0;
  const kinds = Object.keys(WEAPONS),
    kind = kinds[Math.floor(w.random() * kinds.length) % kinds.length];
  w.loot.push({
    id: `l${w.nextId++}`,
    x: e.x,
    z: e.z,
    owner: p.id,
    expires: w.time + 180,
    weapon: makeWeapon(`w${w.nextId++}`, kind, rarity, p.level),
  });
  if (w.loot.length > 100) w.loot.shift();
  w.respawns.push({
    time: w.time + (e.type === 'boss' ? 120 : 35),
    x: e.homeX,
    z: e.homeZ,
    type: e.type,
    name: e.name,
    title: e.title,
    landmark: e.landmark,
  });
  questCheck(w, p);
}
function damageEnemy(w, e, damage, p) {
  e.targetId = p.id;
  e.alertUntil = w.time + 10;
  hurt(w, e, damage);
  if (e.hp <= 0) killEnemy(w, e, p);
}
function move(entity, x, z, amount) {
  const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.3));
  for (let i = 0; i < steps; i++) {
    const nx = entity.x + (x * amount) / steps,
      nz = entity.z + (z * amount) / steps;
    if (canStand(nx, entity.z)) entity.x = nx;
    if (canStand(entity.x, nz)) entity.z = nz;
  }
}
function shoot(w, p) {
  if (inSanctuary(p)) return;
  const stats = weaponStats(p);
  if (p.cooldown > 0 || p.reload > 0) return;
  if (p.ammo <= 0) {
    p.reload = stats.reload;
    return;
  }
  p.ammo--;
  p.cooldown = stats.delay / (p.classId === 'alvvakt' && p.buff > 0 ? 2 : 1);
  const origin = { x: p.x, y: eyeHeight(p), z: p.z };
  const direction = {
    x: Math.sin(p.aim) * Math.cos(p.pitch),
    y: Math.sin(p.pitch),
    z: Math.cos(p.aim) * Math.cos(p.pitch),
  };
  const wall = raycastWorld(origin, direction, stats.range);
  let distance = wall?.distance ?? stats.range,
    hit = null,
    headshot = false;
  const targets = [
    ...w.enemies.filter((e) => e.hp > 0),
    ...Object.values(w.players).filter(
      (t) => t.id !== p.id && w.pvp && p.pvp && t.pvp && inArena(p) && inArena(t) && t.hp > 0,
    ),
  ];
  for (const target of targets) {
    const radius = target.type === 'boss' ? 0.65 : 0.34;
    const along = rayBoxDistance(
      origin,
      direction,
      { x: target.x - radius, y: 0, z: target.z - radius },
      { x: target.x + radius, y: bodyHeight(target), z: target.z + radius },
      distance,
    );
    if (along !== null && along < distance) {
      distance = along;
      hit = target;
      headshot = origin.y + direction.y * along > bodyHeight(target) * 0.8;
    }
  }
  w.shots.push({
    id: `s${w.nextId++}`,
    owner: p.id,
    x: p.x,
    y: origin.y,
    z: p.z,
    endX: p.x + direction.x * distance,
    endY: origin.y + direction.y * distance,
    endZ: p.z + direction.z * distance,
    time: w.time,
    hit: Boolean(hit),
    headshot,
  });
  const damage = stats.damage * (headshot ? 1.5 : 1);
  if (hit?.classId) hurt(w, hit, damage);
  else if (hit) damageEnemy(w, hit, damage, p);
}
export function act(w, id, action) {
  const p = w.players[id];
  if (!p || !action || typeof action !== 'object') return;
  if (action.type === 'respawn') {
    if (p.hp <= 0) {
      Object.assign(p, MAP.spawn, {
        hp: maxHp(p),
        reload: 0,
        ammo: WEAPONS[p.weapon.kind].mag,
        input: cleanInput(),
        pvp: false,
      });
    }
    return;
  }
  if (p.hp <= 0) return;
  if (['contract', 'craft', 'armor'].includes(action.type)) {
    if (!atCamp(p)) return notice(w, p, 'Besök Maja vid samlingsplatsen för uppdrag och verkstad.');
    if (action.type === 'contract') {
      const status = campaignStatus(p),
        contract = CONTRACTS[p.campaign.step];
      if (status.complete)
        return notice(w, p, 'Du har fullföljt skiftets alla tre uppdrag. Avesta tackar dig.');
      if (!p.campaign.active) {
        p.campaign.active = true;
        return notice(w, p, `Nytt uppdrag: ${contract.title}.`);
      }
      if (!status.ready) return notice(w, p, 'Uppdraget är inte klart ännu.');
      p.campaign = { ...newCampaign(), step: p.campaign.step + 1 };
      p.scrap += contract.scrap;
      rewardXp(w, p, contract.xp);
      return notice(w, p, `Maja: Tack, dalmas! +${contract.xp} XP och ${contract.scrap} skrot.`);
    }
    if (action.type === 'craft') {
      if (typeof action.kind !== 'string' || !Object.hasOwn(RECIPES, action.kind)) return;
      const recipe = RECIPES[action.kind];
      if (p.inventory.length >= 16)
        return notice(w, p, 'Packningen är full. Skrota ett vapen först.');
      if (p.scrap < recipe.cost) return notice(w, p, `Du behöver ${recipe.cost} skrot.`);
      p.scrap -= recipe.cost;
      p.inventory.push(makeWeapon(`w${w.nextId++}`, action.kind, 1, p.level));
      p.crafted++;
      return notice(w, p, `${recipe.name} tillverkad. Ovanlig, nivå ${p.level}.`);
    }
    if (p.armor >= 3) return notice(w, p, 'Bruksrustningen är redan fullt förstärkt.');
    const cost = armorCost(p);
    if (p.scrap < cost) return notice(w, p, `Du behöver ${cost} skrot.`);
    p.scrap -= cost;
    p.armor++;
    return notice(w, p, `Bruksrustning ${p.armor}/3: ${p.armor * 8}% mindre inkommande skada.`);
  }
  if (action.type === 'reload' && !p.reload && p.ammo < WEAPONS[p.weapon.kind].mag)
    p.reload = WEAPONS[p.weapon.kind].reload;
  if (action.type === 'ability' && p.abilityCooldown <= 0) {
    p.abilityCooldown = 18;
    p.buff = 6;
    if (p.classId === 'skogsvandrare') p.hp = Math.min(maxHp(p), p.hp + 45);
    if (p.classId === 'kopparslagare' && !inSanctuary(p))
      for (const e of w.enemies)
        if (e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 32 && clearShot(p, e))
          damageEnemy(w, e, 85, p);
    notice(w, p, `${CLASSES[p.classId].ability}!`);
  }
  if (action.type === 'loot') {
    const item = w.loot.find((l) => l.owner === id && Math.hypot(l.x - p.x, l.z - p.z) < 12);
    if (item) {
      if (p.inventory.length >= 16)
        return notice(w, p, 'Packningen är full. Skrota ett vapen först.');
      p.inventory.push(item.weapon);
      p.pickups++;
      p.scrap += 5;
      w.loot = w.loot.filter((l) => l.id !== item.id);
      questCheck(w, p);
      notice(
        w,
        p,
        `${RARITIES[item.weapon.rarity]} ${item.weapon.name} bärgad. Öppna packningen med I.`,
      );
    }
  }
  if (action.type === 'equip') {
    const item = p.inventory.find((i) => i.id === action.id);
    if (item && item.id !== p.weapon.id) {
      p.weapon = item;
      p.ammo = 0;
      p.reload = WEAPONS[item.kind].reload;
      p.cooldown = Math.max(p.cooldown, 0.5);
    }
  }
  if (action.type === 'salvage') {
    const item = p.inventory.find((i) => i.id === action.id && i.id !== p.weapon.id);
    if (item) {
      p.inventory = p.inventory.filter((i) => i.id !== item.id);
      p.scrap += 10 * (item.rarity + 1);
    }
  }
  if (action.type === 'heal' && p.scrap >= 15 && p.hp < maxHp(p)) {
    p.scrap -= 15;
    p.hp = Math.min(maxHp(p), p.hp + 50);
  }
  if (action.type === 'talent' && p.points > 0 && ['power', 'vitality'].includes(action.stat)) {
    p.points--;
    p[action.stat]++;
    if (action.stat === 'vitality') p.hp = Math.min(maxHp(p), p.hp + 12);
  }
  if (action.type === 'pvp' && w.pvp) {
    p.pvp = !p.pvp;
    notice(w, p, p.pvp ? 'PvP aktiverat inom Skogsbos arena.' : 'PvP avaktiverat.');
  }
}
export function tick(w, dt) {
  dt = Math.max(0, Math.min(0.1, finite(dt)));
  w.time += dt;
  w.shots = w.shots.filter((s) => w.time - s.time < 0.16);
  for (const p of Object.values(w.players)) {
    for (const key of ['cooldown', 'abilityCooldown', 'buff']) p[key] = Math.max(0, p[key] - dt);
    if (p.reload > 0) {
      p.reload = Math.max(0, p.reload - dt);
      if (p.reload === 0) p.ammo = WEAPONS[p.weapon.kind].mag;
    }
    if (p.hp <= 0) continue;
    const input = cleanInput(p.input);
    p.aim = input.aim;
    p.pitch = input.pitch;
    p.crouch = input.crouch;
    p.ads = input.ads;
    p.sprinting =
      input.sprint &&
      !p.crouch &&
      !p.ads &&
      !input.fire &&
      Math.hypot(input.x, input.z) > 0 &&
      p.stamina > 1;
    p.stamina = Math.max(0, Math.min(100, p.stamina + (p.sprinting ? -24 : 18) * dt));
    move(
      p,
      input.x,
      input.z,
      CLASSES[p.classId].speed *
        (p.crouch ? 0.55 : p.sprinting ? 1.55 : 1) *
        (p.ads ? 0.7 : 1) *
        (p.classId === 'skogsvandrare' && p.buff > 0 ? 1.6 : 1) *
        dt,
    );
    trackCampaign(p, 'visit');
    if (input.fire) shoot(w, p);
  }
  const pathBudget = { remaining: 2 };
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    e.cooldown -= dt;
    const targets = Object.values(w.players)
      .filter((p) => p.hp > 0 && !inSanctuary(p))
      .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z));
    const boss = e.type === 'boss';
    const aggroRange = boss ? 100 : 75;
    const candidates = targets.filter((p) => Math.hypot(p.x - e.x, p.z - e.z) < aggroRange);
    const p =
      (w.time < e.alertUntil && candidates.find((p) => p.id === e.targetId)) || candidates[0];
    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        for (const t of targets)
          if (Math.hypot(t.x - e.x, t.z - e.z) < 24 && clearShot(e, t)) hurt(w, t, 38);
        e.phase = 'hunt';
        e.cooldown = 3;
      }
      continue;
    }
    const chase = p && Math.hypot(e.x - e.homeX, e.z - e.homeZ) < 125;
    if (chase) {
      const dist = Math.hypot(p.x - e.x, p.z - e.z);
      const visible = clearShot(e, p);
      e.phase = 'hunt';
      e.aim = Math.atan2(p.x - e.x, p.z - e.z);
      if (dist > (boss ? 17 : 14) || !visible) {
        const next = navigate(e, p, w.time, pathBudget);
        if (next) {
          const length = Math.hypot(next.x - e.x, next.z - e.z);
          if (length > 0)
            move(
              e,
              (next.x - e.x) / length,
              (next.z - e.z) / length,
              Math.min(length, (boss ? 3 : 4.2) * dt),
            );
        }
      }
      if (dist < (boss ? 25 : 40) && e.cooldown <= 0 && visible) {
        if (boss) {
          e.windup = 1.4;
          e.phase = 'warning';
        } else {
          hurt(w, p, 7);
          e.cooldown = 1.1;
          w.shots.push({
            id: `s${w.nextId++}`,
            x: e.x,
            y: eyeHeight(e),
            z: e.z,
            endX: p.x,
            endY: eyeHeight(p),
            endZ: p.z,
            time: w.time,
            enemy: true,
          });
        }
      }
    } else {
      const away = Math.hypot(e.x - e.homeX, e.z - e.homeZ) > 22;
      e.phase = away ? 'return' : 'patrol';
      const angle = (((Math.floor(w.time / 12) + Number(e.id.slice(1))) % 4) * Math.PI) / 2;
      let goal = { x: e.homeX + Math.cos(angle) * 10, z: e.homeZ + Math.sin(angle) * 10 };
      if (away || !canStand(goal.x, goal.z)) goal = { x: e.homeX, z: e.homeZ };
      const next = navigate(e, goal, w.time, pathBudget);
      if (next) {
        const length = Math.hypot(next.x - e.x, next.z - e.z);
        e.aim = Math.atan2(next.x - e.x, next.z - e.z);
        if (length > 0)
          move(e, (next.x - e.x) / length, (next.z - e.z) / length, Math.min(length, 1.8 * dt));
      }
    }
  }
  w.enemies = w.enemies.filter((e) => e.hp > 0);
  w.loot = w.loot.filter((l) => l.expires > w.time && w.players[l.owner]);
  for (const r of w.respawns.filter((r) => r.time <= w.time))
    spawnEnemy(w, r.x, r.z, r.type, r.name, r.title).landmark = r.landmark;
  w.respawns = w.respawns.filter((r) => r.time > w.time);
}
export function snapshot(w) {
  return {
    time: w.time,
    pvp: w.pvp,
    players: Object.fromEntries(Object.entries(w.players).map(([id, { input, ...p }]) => [id, p])),
    enemies: w.enemies,
    loot: w.loot,
    shots: w.shots,
  };
}
export function savePlayer(p) {
  return {
    version: 1,
    classId: p.classId,
    level: p.level,
    xp: p.xp,
    points: p.points,
    power: p.power,
    vitality: p.vitality,
    kills: p.kills,
    bosses: p.bosses,
    pickups: p.pickups,
    scrap: p.scrap,
    armor: p.armor,
    crafted: p.crafted,
    campaign: { ...p.campaign },
    inventory: p.inventory,
    equipped: p.weapon.id,
    quests: p.quests,
  };
}
export function restorePlayer(w, p, save) {
  if (!save || save.version !== 1 || save.classId !== p.classId) return false;
  for (const key of [
    'level',
    'xp',
    'points',
    'power',
    'vitality',
    'kills',
    'bosses',
    'pickups',
    'scrap',
  ]) {
    const value = finite(save[key]);
    p[key] = Math.max(
      key === 'level' ? 1 : 0,
      Math.min(
        key === 'level'
          ? 30
          : key === 'power' || key === 'vitality' || key === 'points'
            ? 29
            : 99999,
        Math.floor(value),
      ),
    );
  }
  const items = Array.isArray(save.inventory)
    ? save.inventory
        .filter(
          (i) =>
            i &&
            typeof i.kind === 'string' &&
            Object.hasOwn(WEAPONS, i.kind) &&
            Number.isInteger(i.rarity) &&
            i.rarity >= 0 &&
            i.rarity <= 3,
        )
        .slice(0, 16)
    : [];
  if (items.length) {
    p.inventory = items.map((i) =>
      makeWeapon(
        `w${w.nextId++}`,
        i.kind,
        i.rarity,
        Math.max(1, Math.min(30, Math.floor(finite(i.level, 1)))),
      ),
    );
    p.weapon =
      p.inventory[
        Math.max(
          0,
          items.findIndex((i) => i.id === save.equipped),
        )
      ];
  }
  p.armor = Math.max(0, Math.min(3, Math.floor(finite(save.armor))));
  p.crafted = Math.max(0, Math.min(99999, Math.floor(finite(save.crafted))));
  p.campaign = restoreCampaign(save.campaign);
  p.quests = Array.isArray(save.quests)
    ? [...new Set(save.quests.filter((q) => ['defend', 'salvage', 'boss'].includes(q)))]
    : [];
  p.hp = maxHp(p);
  p.ammo = WEAPONS[p.weapon.kind].mag;
  return true;
}
