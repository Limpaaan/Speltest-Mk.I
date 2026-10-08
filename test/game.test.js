import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  addPlayer,
  spawnEnemy,
  tick,
  act,
  cleanInput,
  rewardXp,
  maxHp,
  savePlayer,
  restorePlayer,
  makeWeapon,
  WEAPONS,
  CLASSES,
} from '../shared/game.js';
import { MAP, canStand, waterAt, onBridge, groundHeight, eyeHeight } from '../shared/map.js';
function setup(classId = 'stalvakt', pvp = false) {
  const w = createWorld({ pvp, random: () => 0.99 });
  w.enemies = [];
  const p = addPlayer(w, 'one', 'Dalmas', classId);
  p.x = -480;
  p.z = 480;
  return { w, p };
}
function aimAt(p, e) {
  return {
    aim: Math.atan2(e.x - p.x, e.z - p.z),
    pitch: Math.atan2(
      groundHeight(e.x, e.z) + eyeHeight(e) - groundHeight(p.x, p.z) - eyeHeight(p),
      Math.hypot(e.x - p.x, e.z - p.z),
    ),
    fire: true,
  };
}
function advance(w, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) tick(w, 0.05);
}

test('movement is finite, normalized and limited by server time', () => {
  const { w, p } = setup();
  const origin = { x: p.x, z: p.z };
  p.input = { x: 100, z: 100, aim: NaN };
  advance(w, 1);
  assert.ok(Math.hypot(p.x - origin.x, p.z - origin.z) <= 7.00001);
  assert.equal(cleanInput({ x: Infinity, z: 'evil', aim: NaN }).x, 0);
  assert.equal(cleanInput({ x: Infinity, z: 'evil', aim: NaN }).z, 0);
  assert.equal(cleanInput({ fire: 1 }).fire, false);
});
test('buildings and real river geometry block walking while a mapped bridge is traversable', () => {
  assert.equal(canStand(MAP.places[0].x, MAP.places[0].z), false);
  const river = MAP.rivers.find((r) => {
    const x = (r.points[0][0] + r.points[1][0]) / 2,
      z = (r.points[0][1] + r.points[1][1]) / 2;
    return Math.abs(x) < MAP.extent && Math.abs(z) < MAP.extent && !onBridge(x, z);
  });
  const rx = (river.points[0][0] + river.points[1][0]) / 2,
    rz = (river.points[0][1] + river.points[1][1]) / 2;
  assert.equal(canStand(rx, rz), false);
  assert.equal(canStand(MAP.extent + 1, 0), false);
  const bridge = MAP.bridges.find((b) => b.name === 'Kyrkbron');
  const [a, b] = bridge.points;
  assert.equal(waterAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), true);
  assert.equal(canStand((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), true);
  const { w, p } = setup();
  p.x = a[0];
  p.z = a[1];
  const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
  p.input = cleanInput({ x: (b[0] - a[0]) / distance, z: (b[1] - a[1]) / distance });
  for (let i = 0; i < 2000 && Math.hypot(p.x - b[0], p.z - b[1]) > 1; i++) tick(w, 0.05);
  assert.ok(Math.hypot(p.x - b[0], p.z - b[1]) < 3);
});

test('combat rewards personal loot, XP and progresses quests', () => {
  const { w, p } = setup();
  for (let n = 0; n < 5; n++) {
    const e = spawnEnemy(w, p.x, p.z + 10);
    p.input = cleanInput(aimAt(p, e));
    advance(w, 1.2);
    assert.equal(e.hp, 0);
    p.input = cleanInput();
    act(w, p.id, { type: 'loot' });
  }
  assert.equal(p.kills, 5);
  assert.equal(p.pickups, 5);
  assert.equal(p.inventory.length, 6);
  assert.ok(p.level >= 2);
  assert.ok(p.quests.includes('defend'));
  assert.ok(p.quests.includes('salvage'));
  assert.equal(w.loot.length, 0);
});
test('ammo, reload, switching and abilities cannot bypass cooldowns', () => {
  const { w, p } = setup('alvvakt');
  p.ammo = 1;
  p.input = cleanInput({ fire: true });
  advance(w, 0.35);
  assert.equal(p.ammo, 0);
  assert.ok(p.reload > 0);
  p.input = cleanInput();
  advance(w, WEAPONS[p.weapon.kind].reload);
  assert.equal(p.ammo, WEAPONS[p.weapon.kind].mag);
  act(w, p.id, { type: 'ability' });
  assert.equal(p.abilityCooldown, 18);
  advance(w, 1);
  act(w, p.id, { type: 'ability' });
  assert.ok(p.abilityCooldown < 18);
  p.inventory.push(makeWeapon('extra', 'scout'));
  act(w, p.id, { type: 'equip', id: 'extra' });
  assert.equal(p.ammo, 0);
  assert.ok(p.reload > 0);
  act(w, p.id, { type: 'equip', id: 'unowned' });
  assert.equal(p.weapon.id, 'extra');
});
test('all four classes have functioning distinct abilities', () => {
  for (const classId of ['stalvakt', 'skogsvandrare', 'kopparslagare', 'alvvakt']) {
    const { w, p } = setup(classId);
    p.hp -= 50;
    const e = spawnEnemy(w, p.x, p.z + 10);
    act(w, p.id, { type: 'ability' });
    assert.equal(p.buff, 6);
    if (classId === 'skogsvandrare') assert.equal(p.hp, maxHp(p) - 5);
    if (classId === 'kopparslagare') assert.equal(e.hp, 0);
    if (classId === 'stalvakt') {
      e.cooldown = 0;
      advance(w, 0.05);
      assert.equal(p.hp, maxHp(p) - 53.5);
    }
  }
});
test('PvP requires both players opting in AND both standing in arena', () => {
  const { w, p } = setup('stalvakt', true);
  const other = addPlayer(w, 'two', 'Älvvakt', 'alvvakt');
  p.x = MAP.arena.x + 40;
  p.z = MAP.arena.z + 40;
  other.x = p.x;
  other.z = p.z + 10;
  p.input = cleanInput({ aim: 0, fire: true });
  advance(w, 0.1);
  assert.equal(other.hp, maxHp(other));
  act(w, p.id, { type: 'pvp' });
  advance(w, 0.3);
  assert.equal(other.hp, maxHp(other));
  act(w, other.id, { type: 'pvp' });
  advance(w, 0.3);
  assert.ok(other.hp < maxHp(other));
  p.z = 120;
  other.z = 130;
  p.cooldown = 0;
  const hp = other.hp;
  advance(w, 0.1);
  assert.equal(other.hp, hp);
});
test('building geometry prevents shooting through walls', () => {
  const { w, p } = setup();
  const a = MAP.places.find((p) => p.id === 'aalto');
  p.x = a.x;
  p.z = a.z - 25;
  const e = spawnEnemy(w, a.x, a.z + 25);
  e.cooldown = 999;
  p.input = cleanInput({ aim: 0, fire: true });
  advance(w, 0.1);
  assert.equal(e.hp, e.maxHp);
});
test('boss attack telegraphs, can be dodged and yields legendary weapon', () => {
  const { w, p } = setup();
  const e = spawnEnemy(w, p.x, p.z + 10, 'boss', 'Test boss');
  e.cooldown = 0;
  advance(w, 0.05);
  assert.equal(e.phase, 'warning');
  assert.ok(e.windup > 1);
  const hp = p.hp;
  p.x += 50;
  advance(w, 1.5);
  assert.equal(p.hp, hp);
  p.x = e.x;
  p.z = e.z - 10;
  e.hp = 1;
  p.input = cleanInput({ aim: 0, fire: true });
  advance(w, 0.1);
  assert.equal(p.bosses, 1);
  assert.equal(w.loot[0].weapon.rarity, 3);
  assert.ok(p.quests.includes('boss'));
});
test('death blocks actions and respawn preserves progression', () => {
  const { w, p } = setup();
  rewardXp(w, p, 110);
  p.hp = 0;
  const pos = p.x;
  p.input = cleanInput({ x: 1, fire: true });
  advance(w, 0.5);
  act(w, p.id, { type: 'ability' });
  assert.equal(p.x, pos);
  assert.equal(p.abilityCooldown, 0);
  act(w, p.id, { type: 'respawn' });
  assert.equal(p.hp, maxHp(p));
  assert.equal(p.level, 2);
  assert.equal(p.x, MAP.spawn.x);
});
test('loot ownership, capacity, salvage and talents are enforced', () => {
  const { w, p } = setup();
  const other = addPlayer(w, 'two', 'Other', 'stalvakt');
  other.x = p.x;
  other.z = p.z;
  w.loot.push({
    id: 'loot',
    x: p.x,
    z: p.z,
    owner: p.id,
    expires: 999,
    weapon: makeWeapon('lootweapon'),
  });
  act(w, other.id, { type: 'loot' });
  assert.equal(w.loot.length, 1);
  act(w, p.id, { type: 'loot' });
  assert.equal(p.inventory.length, 2);
  act(w, p.id, { type: 'salvage', id: p.weapon.id });
  assert.equal(p.inventory.length, 2);
  act(w, p.id, { type: 'salvage', id: 'lootweapon' });
  assert.equal(p.inventory.length, 1);
  assert.equal(p.scrap, 15);
  act(w, p.id, { type: 'talent', stat: 'power' });
  assert.equal(p.power, 0);
  rewardXp(w, p, 100);
  act(w, p.id, { type: 'talent', stat: 'vitality' });
  assert.equal(p.points, 0);
  assert.equal(p.vitality, 1);
});
test('offline saves restore loadout and sanitize untrusted data', () => {
  const { w, p } = setup();
  rewardXp(w, p, 250);
  p.inventory.push(makeWeapon('rare', 'scout', 2, 2));
  act(w, p.id, { type: 'equip', id: 'rare' });
  const save = JSON.parse(JSON.stringify(savePlayer(p)));
  const other = addPlayer(w, 'two', 'Other', 'stalvakt');
  assert.equal(restorePlayer(w, other, save), true);
  assert.equal(other.level, p.level);
  assert.equal(other.weapon.kind, 'scout');
  assert.equal(other.weapon.damage, p.weapon.damage);
  save.inventory[0].damage = 999999;
  save.inventory[0].kind = 'unknown';
  save.level = Infinity;
  restorePlayer(w, other, save);
  assert.equal(other.level, 1);
  assert.equal(other.inventory.length, 1);
  assert.ok(other.weapon.damage < 999999);
  assert.equal(restorePlayer(w, other, { version: 9 }), false);
});
test('enemy respawns and loot expiration are bounded by simulation time', () => {
  const { w, p } = setup();
  const e = spawnEnemy(w, p.x, p.z + 10);
  e.hp = 1;
  p.input = cleanInput(aimAt(p, e));
  advance(w, 0.1);
  p.input = cleanInput();
  assert.equal(w.enemies.length, 0);
  assert.equal(w.respawns.length, 1);
  delete w.players.one;
  advance(w, 36);
  assert.equal(w.enemies.length, 1);
  assert.equal(w.loot.length, 0);
});

test('rally point prevents incoming damage and firing until player leaves', () => {
  const { w, p } = setup();
  Object.assign(p, MAP.spawn);
  const e = spawnEnemy(w, p.x, p.z + 10);
  e.cooldown = 0;
  p.input = cleanInput({ fire: true });
  advance(w, 2);
  assert.equal(p.hp, maxHp(p));
  assert.equal(p.ammo, 24);
  assert.equal(e.hp, 70);
  p.z += 25;
  advance(w, 2);
  assert.ok(p.ammo < 24);
});

test('untrusted input shapes and inherited class or weapon names are harmless', () => {
  for (const input of [null, 1, 'x', [], { x: null, z: {} }])
    assert.deepEqual(cleanInput(input), {
      x: 0,
      z: 0,
      aim: 0,
      pitch: 0,
      fire: false,
      ads: false,
      crouch: false,
      sprint: false,
    });
  const w = createWorld();
  const p = addPlayer(w, 'malformed', { toString: null }, '__proto__');
  assert.equal(p.classId, 'stalvakt');
  assert.equal(p.name, 'Dalmas');
  assert.equal(p.hp, 160);
  restorePlayer(w, p, {
    version: 1,
    classId: 'stalvakt',
    inventory: [{ kind: '__proto__', rarity: 0 }],
  });
  assert.equal(p.weapon.kind, 'rifle');
});

test('FPS pitch misses above and below the body, while headshots deal extra damage', () => {
  const { w, p } = setup();
  p.x = -480;
  p.z = 480;
  w.enemies = [];
  const e = spawnEnemy(w, p.x, p.z + 10);
  e.cooldown = 999;
  p.input = { fire: true, aim: 0, pitch: 1.4 };
  tick(w, 0.05);
  assert.equal(e.hp, 70);
  p.cooldown = 0;
  p.input.pitch = -1;
  tick(w, 0.05);
  assert.equal(e.hp, 70);
  const shot = w.shots.at(-1);
  assert.ok(Math.abs(shot.endY - groundHeight(shot.endX, shot.endZ)) < 0.01);
  p.cooldown = 0;
  p.input = aimAt(p, e);
  tick(w, 0.05);
  assert.equal(e.hp, 70 - 19 * 1.5);
  assert.equal(w.shots.at(-1).headshot, true);
});
test('sprint consumes stamina and crouch/ADS prevent sprinting', () => {
  const { w, p } = setup();
  p.x = -480;
  p.z = 480;
  w.enemies = [];
  p.input = { z: 1, sprint: true };
  advance(w, 1);
  assert.ok(p.stamina < 100);
  assert.ok(p.z > 481 && p.z < 485, 'slower but functioning sprint');
  p.input = { z: 1, sprint: true, crouch: true };
  const z = p.z;
  advance(w, 1);
  assert.equal(p.sprinting, false);
  assert.ok(p.z - z < 4);
  p.input = { z: 1, sprint: true, ads: true };
  advance(w, 0.1);
  assert.equal(p.sprinting, false);
  assert.equal(cleanInput({ pitch: 999 }).pitch, 1.45);
  assert.equal(cleanInput({ crouch: 1 }).crouch, false);
});
