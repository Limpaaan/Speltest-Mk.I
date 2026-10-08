import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { terrain, terrainHeight } from '../shared/terrain.js';
import {
  MAP,
  groundHeight,
  canStand,
  raycastWorld,
  travelFactor,
  walkableNear,
} from '../shared/map.js';
import {
  createWorld,
  addPlayer,
  act,
  tick,
  spawnEnemy,
  makeWeapon,
  savePlayer,
  restorePlayer,
  maxHp,
} from '../shared/game.js';
import { NPCS, CAMP } from '../shared/progression.js';
import { readSettings, normalizeSettings, DEFAULT_SETTINGS } from '../src/settings.js';
const advance = (w, seconds) => {
  for (let i = 0; i < seconds / 0.05; i++) tick(w, 0.05);
};
function setup(classId = 'stalvakt', pvp = false) {
  const w = createWorld({ pvp, random: () => 0.5 });
  w.enemies = [];
  const p = addPlayer(w, 'a', 'Dalmas', classId);
  p.x = -480;
  p.z = 480;
  return { w, p };
}
test('shipped Copernicus grid retains crop provenance and uses the same triangles as the ground mesh', () => {
  const crop = JSON.parse(
    readFileSync(new URL('../data/terrain-source-crop.json', import.meta.url)),
  );
  assert.equal(crop.sourceSha256, terrain.sourceSha256);
  assert.equal(terrain.status, 'integrated');
  assert.equal(terrain.elevationsMetres.length, terrain.width * terrain.height);
  assert.ok(terrain.maxAltitudeMetres - terrain.minAltitudeMetres > 70);
  for (const [fx, fz] of [
    [0.2, 0.3],
    [0.7, 0.8],
  ]) {
    const col = 30,
      row = 70,
      at = (x, z) => terrain.elevationsMetres[(row + z) * terrain.width + col + x];
    const metres =
      fx + fz <= 1
        ? at(0, 0) * (1 - fx - fz) + at(1, 0) * fx + at(0, 1) * fz
        : at(1, 1) * (fx + fz - 1) + at(0, 1) * (1 - fx) + at(1, 0) * (1 - fz);
    assert.ok(
      Math.abs(
        terrainHeight(-600 + (col + fx) * 10, -600 + (row + fz) * 10) - (metres - 80) * 0.25,
      ) < 1e-8,
    );
  }
  const point = walkableNear(-480, 480),
    y = groundHeight(point.x, point.z);
  const hit = raycastWorld({ ...point, y: y + 10 }, { x: 0, y: -1, z: 0 }, 20);
  assert.equal(hit.kind, 'ground');
  assert.ok(Math.abs(hit.y - y) < 0.001);
});
test('infill, tree trunks and rocks are solid while roads and NPC destinations remain reachable', () => {
  assert.equal(MAP.buildings.length, 180);
  assert.equal(MAP.trees.length, 950);
  for (const list of [MAP.buildings, MAP.trees, MAP.rocks])
    for (const p of list) assert.equal(canStand(p.x, p.z), false);
  for (const p of [MAP.spawn, CAMP, ...NPCS]) assert.ok(canStand(p.x, p.z));
  const rock = MAP.rocks[0],
    y = groundHeight(rock.x, rock.z);
  const hit = raycastWorld({ x: rock.x, y: y + 10, z: rock.z }, { x: 0, y: -1, z: 0 }, 20);
  assert.equal(hit.kind, 'cover');
  assert.ok(hit.y > y + 0.5);
  assert.ok(travelFactor(-480, 480, 0, 1) < 1);
});
test('semiautomatic pistol requires release; automatic machine gun continues and shotgun traces seven pellets', () => {
  for (const [kind, count] of [
    ['pistol', 1],
    ['lmg', 8],
    ['shotgun', 7],
  ]) {
    const { w, p } = setup();
    p.weapon = makeWeapon('test', kind);
    p.ammo = 60;
    p.input = { fire: true };
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      tick(w, 0.05);
      w.shots.forEach((s) => seen.add(s.id));
    }
    if (kind === 'lmg') assert.ok(seen.size >= 6);
    else assert.equal(seen.size, count);
    const remaining = p.ammo;
    p.input = { fire: false };
    tick(w, 0.05);
    p.input = { fire: true };
    tick(w, 0.05);
    if (kind !== 'lmg') assert.equal(p.ammo, remaining - 1);
    if (kind === 'shotgun') assert.ok(new Set(w.shots.map((s) => s.endX.toFixed(2))).size > 1);
  }
});
test('grenades obey stock, cooldown, sanctuary, delayed explosion and teammate protection', () => {
  const { w, p } = setup();
  const other = addPlayer(w, 'b', 'Dalkulla', 'stalvakt');
  Object.assign(other, { x: p.x, z: p.z + 8 });
  act(w, p.id, { type: 'grenade' });
  act(w, p.id, { type: 'grenade' });
  assert.equal(p.grenades, 2);
  assert.equal(w.grenades.length, 1);
  advance(w, 0.5);
  assert.equal(w.blasts.length, 0);
  const g = w.grenades[0];
  Object.assign(g, {
    x: other.x,
    z: other.z,
    y: groundHeight(other.x, other.z) + 0.1,
    vx: 0,
    vy: 0,
    vz: 0,
    fuse: 0.01,
  });
  const enemy = spawnEnemy(w, other.x, other.z);
  enemy.cooldown = 999;
  tick(w, 0.05);
  assert.equal(w.grenades.length, 0);
  assert.equal(w.blasts.length, 1);
  assert.equal(other.hp, maxHp(other));
  assert.equal(enemy.hp, 0);
  const saved = savePlayer(p),
    restored = addPlayer(w, 'c', 'Save', 'stalvakt');
  restorePlayer(w, restored, saved);
  assert.equal(restored.grenades, 2);
  Object.assign(p, MAP.spawn);
  p.grenadeCooldown = 0;
  act(w, p.id, { type: 'grenade' });
  assert.equal(p.grenades, 2);
});
test('medic heals nearby allies once per cooldown and engineer protection and workshop discount are authoritative', () => {
  const { w, p } = setup('faltvardare');
  const ally = addPlayer(w, 'b', 'Bruksarbetare', 'stalvakt');
  Object.assign(ally, { x: p.x, z: p.z + 2, hp: 50 });
  p.hp = 40;
  act(w, p.id, { type: 'ability' });
  assert.equal(p.hp, 95);
  assert.equal(ally.hp, 105);
  act(w, p.id, { type: 'ability' });
  assert.equal(ally.hp, 105);
  const engineer = addPlayer(w, 'e', 'Ingenjör', 'bruksingenjor');
  Object.assign(engineer, { x: p.x, z: p.z });
  act(w, engineer.id, { type: 'ability' });
  assert.equal(ally.protection, 6);
  Object.assign(engineer, CAMP);
  engineer.scrap = 48;
  act(w, engineer.id, { type: 'craft', kind: 'rifle', cost: 0 });
  assert.equal(engineer.scrap, 0);
  assert.equal(engineer.inventory.at(-1).kind, 'rifle');
});
test('NPC services validate distance, funds, capacity and do not charge for unnecessary treatment', () => {
  const { w, p } = setup();
  p.scrap = 100;
  p.grenades = 0;
  const smith = NPCS.find((n) => n.id === 'torsten');
  act(w, p.id, { type: 'npc', npcId: smith.id });
  assert.equal(p.grenades, 0);
  Object.assign(p, { x: smith.x, z: smith.z });
  act(w, p.id, { type: 'npc', npcId: smith.id });
  assert.equal(p.grenades, 3);
  assert.equal(p.scrap, 80);
  act(w, p.id, { type: 'npc', npcId: smith.id });
  act(w, p.id, { type: 'npc', npcId: smith.id });
  assert.equal(p.grenades, 6);
  assert.equal(p.scrap, 60);
  const medic = NPCS.find((n) => n.id === 'liv');
  Object.assign(p, { x: medic.x, z: medic.z, hp: 10 });
  act(w, p.id, { type: 'npc', npcId: medic.id });
  assert.equal(p.hp, maxHp(p));
  assert.equal(p.scrap, 50);
  act(w, p.id, { type: 'npc', npcId: medic.id });
  assert.equal(p.scrap, 50);
  const scout = NPCS.find((n) => n.id === 'einar');
  Object.assign(p, { x: scout.x, z: scout.z });
  act(w, p.id, { type: 'npc', npcId: scout.id });
  assert.equal(p.intel, 120);
  advance(w, 1);
  assert.ok(p.intel < 120);
});
test('enemy families have distinct health and ranged/melee attack behavior', () => {
  const hp = [];
  for (const type of ['rusher', 'marksman', 'heavy']) {
    const { w, p } = setup();
    const e = spawnEnemy(w, p.x, p.z + 10, type);
    e.cooldown = 0;
    hp.push(e.hp);
    tick(w, 0.05);
    assert.equal(p.hp < maxHp(p), type !== 'rusher');
  }
  assert.equal(new Set(hp).size, 3);
});
test('settings survive valid storage and reject malformed or out-of-range saved values', () => {
  assert.deepEqual(readSettings({ getItem: () => '{' }), DEFAULT_SETTINGS);
  assert.deepEqual(
    readSettings({
      getItem: () => {
        throw Error('blocked');
      },
    }),
    DEFAULT_SETTINGS,
  );
  const normalized = normalizeSettings({
    sensitivity: 999,
    adsSensitivity: -1,
    fov: Infinity,
    crosshair: '<script>',
    crosshairColor: 'red',
    graphics: 'high',
    weaponBob: false,
  });
  assert.equal(normalized.sensitivity, 3);
  assert.equal(normalized.adsSensitivity, 0.2);
  assert.equal(normalized.fov, 78);
  assert.equal(normalized.crosshair, 'cross');
  assert.equal(normalized.weaponBob, false);
  assert.deepEqual(readSettings({ getItem: () => JSON.stringify(normalized) }), normalized);
});

test('a real hillside stops horizontal fire before the nominal weapon range', () => {
  const x = -520,
    z = -280,
    y = groundHeight(x, z) + 1.65;
  assert.ok(canStand(x, z));
  const hit = raycastWorld({ x, y, z }, { x: 0, y: 0, z: 1 }, 100);
  assert.equal(hit.kind, 'ground');
  assert.ok(hit.distance > 20 && hit.distance < 40);
  assert.ok(Math.abs(groundHeight(hit.x, hit.z) - hit.y) < 0.001);
  const above = raycastWorld({ x, y: y + 20, z }, { x: 0, y: 0, z: 1 }, 100);
  assert.equal(above, null);
});
