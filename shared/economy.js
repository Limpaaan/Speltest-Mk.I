import {
  MATERIALS,
  ATTACHMENTS,
  SLOTS,
  SUPPLY_RECIPES,
  newMaterials,
  hasMaterials,
  spendMaterials,
  attachmentCount,
  compatible,
  lootName,
  validMods,
} from './items.js';
import { WEAPONS } from './weapons.js';
import { MAP, walkableNear, clearShot } from './map.js';
import { INTERIOR_CACHES } from './interiors.js';
import { NPCS, atCamp } from './progression.js';
export const CACHES = [
  ...INTERIOR_CACHES,
  ...MAP.places.map((p) => ({
    id: `cache-${p.id}`,
    name: 'Bärgningslåda',
    ...walkableNear(p.x + p.w / 2 + 5, p.z - p.d / 2 - 5),
  })),
];
export const nearbyCache = (p) =>
  CACHES.find(
    (c) => !p.searched.includes(c.id) && Math.hypot(c.x - p.x, c.z - p.z) <= 3 && clearShot(p, c),
  );
export const atTrader = (p) =>
  atCamp(p) || NPCS.some((n) => n.id === 'torsten' && Math.hypot(n.x - p.x, n.z - p.z) <= 5);
export const newEconomy = () => ({
  materials: newMaterials(),
  attachments: {},
  supplies: { medkit: 0, filter: 0, repair: 0 },
  credits: 0,
  searched: [],
  archiveQuest: 0,
  flashlight: false,
});
export function rollDrop(random) {
  const roll = random(),
    pick = (list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  if (roll < 0.1) return { kind: pick(Object.keys(WEAPONS)) };
  if (roll < 0.35) return { attachment: pick(Object.keys(ATTACHMENTS)) };
  return { material: pick(Object.keys(MATERIALS)), quantity: 2 + Math.floor(random() * 4) };
}
export function collect(p, item) {
  if (item.weapon) {
    if (p.inventory.length >= 16) return false;
    p.inventory.push(item.weapon);
  } else if (item.attachment) {
    if (attachmentCount(p) >= 24) return false;
    p.attachments[item.attachment] = (p.attachments[item.attachment] || 0) + 1;
  } else if (item.material) {
    const n = Math.ceil(item.quantity * (p.skills.includes('fieldcraft') ? 1.25 : 1));
    if (p.materials[item.material] + n > 999) return false;
    p.materials[item.material] += n;
  } else return false;
  return true;
}
export const recipeText = (recipe) =>
  Object.entries(recipe)
    .map(([k, n]) => `${n} ${MATERIALS[k].name.toLowerCase()}`)
    .join(', ');
// All prices, recipes, compatibility and distance checks are server-owned.
export function economyAction(
  w,
  p,
  a,
  { notice, makeWeapon, rewardXp, maxHp, weaponStats, questCheck },
) {
  const say = (text) => notice(w, p, text);
  if (a.type === 'flashlight') {
    p.flashlight = p.weapon.mods?.utility === 'flashlight' && !p.flashlight;
    return true;
  }
  if (a.type === 'search') {
    const c = nearbyCache(p);
    if (!c) {
      say('Gå närmare en oöppnad bärgningslåda.');
      return true;
    }
    const drop = rollDrop(w.random);
    if (drop.kind) drop.weapon = makeWeapon(`w${w.nextId++}`, drop.kind, 0, p.level);
    if (!collect(p, drop)) {
      say('Packningen är full.');
      return true;
    }
    p.searched.push(c.id);
    p.pickups++;
    questCheck(w, p);
    p.credits += 15;
    p.scrap += 5;
    if (c.archive) p.archiveQuest = Math.max(1, p.archiveQuest);
    say(
      `${lootName(drop)} · +15 brukskronor.${c.archive ? ' Evakueringsplan hittad! Ta den till Maja.' : ''}`,
    );
    return true;
  }
  if (a.type === 'archive') {
    if (atCamp(p) && p.archiveQuest === 1) {
      p.archiveQuest = 2;
      p.credits += 120;
      rewardXp(w, p, 100);
      say('Maja: Planen är räddad! +120 brukskronor och 100 XP.');
    } else say('Hämta evakueringsplanen i Aaltohusets arkiv och återvänd till Maja.');
    return true;
  }
  if (['mount', 'detach'].includes(a.type)) {
    const item = p.inventory.find((i) => i.id === a.id);
    if (!item || p.reload > 0) return true;
    item.mods = validMods(item.kind, item.mods);
    const key = a.key,
      slot = a.type === 'mount' && Object.hasOwn(ATTACHMENTS, key) ? ATTACHMENTS[key].slot : a.slot;
    if (!Object.hasOwn(SLOTS, slot)) return true;
    const old = item.mods[slot];
    if (a.type === 'mount') {
      if (!compatible(item.kind, key) || !(p.attachments[key] > 0)) {
        say('Delen saknas eller passar inte vapnet.');
        return true;
      }
      p.attachments[key]--;
      if (old) p.attachments[old] = (p.attachments[old] || 0) + 1;
      item.mods[slot] = key;
    } else {
      if (!old || attachmentCount(p) >= 24) return true;
      p.attachments[old] = (p.attachments[old] || 0) + 1;
      delete item.mods[slot];
    }
    if (item.id === p.weapon.id) {
      p.ammo = Math.min(p.ammo, weaponStats(p).mag);
      p.flashlight = false;
    }
    say('Vapnet uppdaterat.');
    return true;
  }
  if (a.type === 'use_supply') {
    if (!Object.hasOwn(p.supplies, a.key) || p.supplies[a.key] <= 0) return true;
    if (a.key === 'medkit') {
      if (p.hp >= maxHp(p)) return true;
      p.hp = Math.min(maxHp(p), p.hp + 70);
    } else if (a.key === 'filter') p.protection = Math.max(p.protection, 25);
    else p.protection = Math.max(p.protection, 40);
    p.supplies[a.key]--;
    say('Förbrukningsvara använd.');
    return true;
  }
  if (!['buy', 'sell', 'fabricate'].includes(a.type)) return false;
  if (!atTrader(p)) {
    say('Besök Maja eller Torsten för handel och tillverkning.');
    return true;
  }
  const category = a.category,
    key = a.key;
  const catalog = {
    material: MATERIALS,
    attachment: ATTACHMENTS,
    supply: SUPPLY_RECIPES,
    weapon: WEAPONS,
  };
  if (!Object.hasOwn(catalog, category) || !Object.hasOwn(catalog[category], key)) return true;
  const definition = catalog[category][key],
    price = definition.price || 220;
  if (a.type === 'sell') {
    if (category === 'material' && p.materials[key] > 0) {
      p.materials[key]--;
      p.credits += Math.max(1, Math.floor(price * 0.35));
    } else if (category === 'attachment' && p.attachments[key] > 0) {
      p.attachments[key]--;
      p.credits += Math.floor(price * 0.35);
    } else if (category === 'weapon') {
      const item = p.inventory.find((i) => i.id === a.id && i.kind === key && i.id !== p.weapon.id);
      if (!item) return true;
      if (Object.keys(item.mods || {}).length) {
        say('Demontera vapendelarna före försäljning.');
        return true;
      }
      p.inventory = p.inventory.filter((i) => i !== item);
      p.credits += Math.floor(price * 0.35) * (item.rarity + 1);
    } else return true;
    say('Sålt för brukskronor.');
    return true;
  }
  const recipe =
    category === 'attachment'
      ? definition.recipe
      : category === 'supply'
        ? definition.materials
        : null;
  if (a.type === 'fabricate' && (!recipe || !hasMaterials(p, recipe))) {
    say('Material saknas för receptet.');
    return true;
  }
  if (a.type === 'buy' && p.credits < price) {
    say(`Du behöver ${price} brukskronor.`);
    return true;
  }
  if (
    (category === 'weapon' && p.inventory.length >= 16) ||
    (category === 'attachment' && attachmentCount(p) >= 24) ||
    (category === 'material' && p.materials[key] >= 999) ||
    (category === 'supply' &&
      (key === 'grenade'
        ? p.grenades >= 6
        : key === 'electronics'
          ? p.materials.electronics >= 999
          : p.supplies[key] >= 10))
  ) {
    say('Du kan inte bära fler.');
    return true;
  }
  if (a.type === 'fabricate') spendMaterials(p, recipe);
  else p.credits -= price;
  if (category === 'weapon') p.inventory.push(makeWeapon(`w${w.nextId++}`, key, 0, p.level));
  if (category === 'material') p.materials[key]++;
  if (category === 'attachment') p.attachments[key] = (p.attachments[key] || 0) + 1;
  if (category === 'supply') {
    if (key === 'grenade') p.grenades++;
    else if (key === 'electronics') p.materials.electronics++;
    else p.supplies[key]++;
  }
  say(`${definition.name}: ${a.type === 'buy' ? 'köpt' : 'tillverkad'}.`);
  return true;
}
export function restoreEconomy(p, save) {
  Object.assign(p, newEconomy());
  const number = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);
  for (const key of Object.keys(MATERIALS)) p.materials[key] = number(save.materials?.[key], 999);
  for (const key of Object.keys(ATTACHMENTS)) {
    const n = number(save.attachments?.[key], 24 - attachmentCount(p));
    if (n) p.attachments[key] = n;
  }
  for (const key of Object.keys(p.supplies)) p.supplies[key] = number(save.supplies?.[key], 10);
  p.credits = number(save.credits, 99999);
  p.archiveQuest = number(save.archiveQuest, 2);
  p.searched = Array.isArray(save.searched)
    ? [...new Set(save.searched.filter((id) => CACHES.some((c) => c.id === id)))]
    : [];
}
