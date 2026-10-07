import { act, makeWeapon, maxHp, notice, RARITIES, WEAPONS, xpNeeded } from './game.js';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const fail = (message) => ({ ok: false, message });
export function validateUsername(raw) {
  const name = typeof raw === 'string' ? raw.trim().normalize('NFC') : '';
  return name.length >= 2 && name.length <= 24 && /^[\p{L}\p{N} _-]+$/u.test(name)
    ? { ok: true, name }
    : {
        ok: false,
        name: '',
        error:
          'Välj ett namn med 2–24 bokstäver, siffror, mellanslag, bindestreck eller understreck.',
      };
}
export const isAdmin = (player) => player?.name === 'AdminL';
export function adminAction(world, actorId, action) {
  const actor = Object.hasOwn(world.players, actorId) ? world.players[actorId] : null;
  if (!isAdmin(actor)) return fail('Endast AdminL har tillgång till fuskmenyn.');
  if (!object(action)) return fail('Ogiltigt kommando.');
  const id = action.targetId ?? actorId;
  if (typeof id !== 'string' || !Object.hasOwn(world.players, id))
    return fail('Spelaren finns inte i rummet.');
  const target = world.players[id];
  let message;
  if (action.type === 'spawn_item') {
    if (
      !Object.hasOwn(WEAPONS, action.kind) ||
      !integer(action.rarity, 0, RARITIES.length - 1) ||
      !integer(action.level, 1, 30)
    )
      return fail('Ogiltig vapentyp, sällsynthet eller nivå.');
    if (target.inventory.length >= 16) return fail('Spelarens packning är full.');
    const item = makeWeapon(`w${world.nextId++}`, action.kind, action.rarity, action.level);
    target.inventory.push(item);
    message = `${RARITIES[item.rarity]} ${item.name} skapad åt ${target.name}.`;
  } else if (action.type === 'set_stats') {
    const stats = action.stats;
    if (!object(stats) || !Object.keys(stats).length) return fail('Välj statistik att ändra.');
    const proposed = {
      ...target,
      level: stats.level ?? target.level,
      vitality: stats.vitality ?? target.vitality,
    };
    if (!integer(proposed.level, 1, 30) || !integer(proposed.vitality, 0, 29))
      return fail('Ogiltig nivå eller livskraft.');
    const bounds = {
      level: [1, 30],
      xp: [0, xpNeeded(proposed)],
      hp: [0, maxHp(proposed)],
      scrap: [0, 99999],
      power: [0, 29],
      vitality: [0, 29],
      points: [0, 29],
    };
    for (const [key, value] of Object.entries(stats))
      if (!Object.hasOwn(bounds, key) || !integer(value, ...bounds[key]))
        return fail(`Ogiltigt värde för ${key}.`);
    Object.assign(target, stats);
    target.hp = Math.min(target.hp, maxHp(target));
    target.xp = Math.min(target.xp, xpNeeded(target));
    message = `Statistiken för ${target.name} har uppdaterats.`;
  } else if (action.type === 'heal') {
    if (target.hp <= 0) act(world, id, { type: 'respawn' });
    target.hp = maxHp(target);
    message = `${target.name} har full hälsa.`;
  } else return fail('Okänt kommando.');
  notice(world, target, message);
  return { ok: true, message };
}
