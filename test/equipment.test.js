import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  addPlayer,
  act,
  tick,
  makeWeapon,
  weaponStats,
  savePlayer,
  restorePlayer,
  spawnEnemy,
  cleanInput,
  maxHp,
} from '../shared/game.js';
import { rollDrop, CACHES, nearbyCache } from '../shared/economy.js';
import { ATTACHMENTS, compatible, validMods } from '../shared/items.js';
import { AALTO, AALTO_FLOOR, INTERIOR_CACHES } from '../shared/interiors.js';
import { canStand, clearShot, groundHeight, MAP, eyeHeight } from '../shared/map.js';
import { CAMP } from '../shared/progression.js';
import { canEquip } from '../shared/talents.js';
import { adminAction } from '../shared/admin.js';
function setup(classId = 'stalvakt') {
  const w = createWorld({ random: () => 0.5 });
  w.enemies = [];
  const p = addPlayer(w, 'p', 'Dalmas', classId);
  return { w, p };
}
const send = (w, p, a) => act(w, p.id, a);
const advance = (w, seconds) => {
  for (let t = 0; t < seconds; t += 0.05) tick(w, 0.05);
};
test('ordinary drops are 10% weapons, 25% attachments and 65% useful material', () => {
  const tally = { kind: 0, attachment: 0, material: 0 };
  for (let i = 0; i < 1000; i++) {
    let first = true;
    const d = rollDrop(() => {
      if (first) {
        first = false;
        return (i + 0.5) / 1000;
      }
      return 0.5;
    });
    for (const key of Object.keys(tally)) if (d[key]) tally[key]++;
  }
  assert.deepEqual(tally, { kind: 100, attachment: 250, material: 650 });
});
test('material and attachment loot enforce ownership and separate capacity', () => {
  const { w, p } = setup();
  p.inventory = Array.from({ length: 16 }, (_, i) => makeWeapon('w' + i));
  w.loot = [
    { id: 'm', owner: 'other', x: p.x, z: p.z, material: 'wood', quantity: 3, expires: 999 },
  ];
  send(w, p, { type: 'loot' });
  assert.equal(p.materials.wood, 0);
  w.loot[0].owner = p.id;
  send(w, p, { type: 'loot' });
  assert.equal(p.materials.wood, 3);
  p.attachments.red_dot = 24;
  w.loot = [{ id: 'a', owner: p.id, x: p.x, z: p.z, attachment: 'suppressor', expires: 999 }];
  send(w, p, { type: 'loot' });
  assert.equal(w.loot.length, 1);
  p.attachments.red_dot = 23;
  send(w, p, { type: 'loot' });
  assert.equal(p.attachments.suppressor, 1);
  assert.equal(w.loot.length, 0);
});
test('market ignores client prices, checks distance, and cannot buy or craft into a full bag', () => {
  const { w, p } = setup();
  p.credits = 200;
  send(w, p, { type: 'buy', category: 'attachment', key: 'extended_mag', price: 0 });
  assert.equal(p.credits, 80);
  assert.equal(p.attachments.extended_mag, 1);
  send(w, p, { type: 'sell', category: 'attachment', key: 'extended_mag', price: 9999 });
  assert.equal(p.credits, 122);
  p.x += 100;
  send(w, p, { type: 'buy', category: 'material', key: 'wood' });
  assert.equal(p.credits, 122);
  Object.assign(p, CAMP);
  p.attachments.red_dot = 24;
  const before = p.credits;
  send(w, p, { type: 'buy', category: 'attachment', key: 'flashlight' });
  assert.equal(p.credits, before);
  for (const category of ['__proto__', 'constructor', 'weapon'])
    send(w, p, { type: 'buy', category, key: '__proto__' });
  assert.equal(p.credits, before);
});
test('fabrication consumes the exact recipe once and supplies have actual effects', () => {
  const { w, p } = setup();
  Object.assign(p.materials, { cloth: 4, chemicals: 2, iron: 3, wood: 2, stone: 2 });
  p.hp = 30;
  send(w, p, { type: 'fabricate', category: 'supply', key: 'medkit', materials: {} });
  assert.equal(p.supplies.medkit, 1);
  assert.equal(p.materials.cloth, 0);
  send(w, p, { type: 'fabricate', category: 'supply', key: 'medkit' });
  assert.equal(p.supplies.medkit, 1);
  send(w, p, { type: 'use_supply', key: 'medkit' });
  assert.equal(p.hp, 100);
  assert.equal(p.supplies.medkit, 0);
  send(w, p, { type: 'fabricate', category: 'supply', key: 'repair' });
  send(w, p, { type: 'use_supply', key: 'repair' });
  assert.equal(p.protection, 40);
  assert.equal(p.materials.stone, 0);
});
test('mods obey ownership, weapon compatibility and one slot; swapping does not manufacture ammo', () => {
  const { w, p } = setup();
  p.attachments = { extended_mag: 1, quick_mag: 1, suppressor: 1, scope_6: 1 };
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'extended_mag' });
  assert.equal(weaponStats(p).mag, 36);
  assert.equal(p.ammo, 24);
  p.ammo = 36;
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'quick_mag' });
  assert.equal(p.ammo, 24);
  assert.equal(p.attachments.extended_mag, 1);
  assert.equal(p.attachments.quick_mag, 0);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'suppressor' });
  assert.equal(weaponStats(p).noise, 25);
  assert.ok(weaponStats(p).damage < 19);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'scope_6' });
  assert.equal(weaponStats(p).zoom, 6);
  p.inventory.push(makeWeapon('pistol', 'pistol'));
  send(w, p, { type: 'detach', id: p.weapon.id, slot: 'optic' });
  send(w, p, { type: 'mount', id: 'pistol', key: 'scope_6' });
  assert.equal(p.attachments.scope_6, 1);
  for (const key of ['__proto__', 'constructor', 'missing']) {
    assert.equal(compatible('rifle', key), false);
    send(w, p, { type: 'mount', id: p.weapon.id, key });
  }
  assert.deepEqual(validMods('pistol', { optic: 'scope_6', magazine: 'extended_mag' }), {
    magazine: 'extended_mag',
  });
});
test('extended magazine and quick magazine affect real reload completion', () => {
  const { w, p } = setup();
  p.attachments.extended_mag = 1;
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'extended_mag' });
  p.ammo = 0;
  send(w, p, { type: 'reload' });
  assert.ok(Math.abs(p.reload - 1.4 * 1.2 * 0.9) < 1e-8);
  advance(w, 2);
  assert.equal(p.ammo, 36);
  p.attachments.quick_mag = 1;
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'quick_mag' });
  p.ammo = 0;
  send(w, p, { type: 'reload' });
  assert.ok(p.reload < 1);
  advance(w, 1);
  assert.equal(p.ammo, 24);
});
test('grips, stock, flashlight and stationary bipod change effective equipment', () => {
  const { w, p } = setup('bruksingenjor');
  for (const key of [
    'vertical_grip',
    'angled_grip',
    'bipod',
    'light_stock',
    'stable_stock',
    'flashlight',
  ])
    p.attachments[key] = 1;
  const base = weaponStats(p);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'vertical_grip' });
  assert.ok(weaponStats(p).recoil < base.recoil);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'angled_grip' });
  assert.ok(weaponStats(p).spread < base.spread);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'bipod' });
  p.ads = p.crouch = true;
  p.moving = false;
  assert.ok(weaponStats(p).spread < base.spread / 2);
  p.moving = true;
  assert.equal(weaponStats(p).spread, base.spread);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'light_stock' });
  assert.ok(weaponStats(p).move > 1);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'stable_stock' });
  assert.ok(weaponStats(p).move < 1);
  send(w, p, { type: 'flashlight' });
  assert.equal(p.flashlight, false);
  send(w, p, { type: 'mount', id: p.weapon.id, key: 'flashlight' });
  send(w, p, { type: 'flashlight' });
  assert.equal(p.flashlight, true);
});
test('talent prerequisites, spent points and mutually exclusive class branches are enforced', () => {
  const { w, p } = setup('skogsvandrare');
  p.level = 8;
  p.points = 7;
  send(w, p, { type: 'learn', id: 'assault_ability' });
  assert.equal(p.points, 7);
  send(w, p, { type: 'learn', id: 'weapon_training' });
  send(w, p, { type: 'learn', id: 'assault_ability' });
  assert.equal(p.points, 4);
  send(w, p, { type: 'learn', id: 'fieldcraft' });
  send(w, p, { type: 'learn', id: 'support_ability' });
  assert.equal(p.points, 3);
  assert.ok(!p.skills.includes('support_ability'));
  send(w, p, { type: 'learn', id: 'mastery' });
  assert.equal(p.points, 0);
  const damage = weaponStats(p).damage;
  send(w, p, { type: 'special' });
  assert.equal(p.specialCooldown, 30);
  assert.ok(weaponStats(p).damage > damage * 1.49);
  tick(w, 0.1);
  send(w, p, { type: 'special' });
  assert.ok(p.specialCooldown < 30);
});
test('light classes require heavy training for the machine gun and armor training for rank three', () => {
  const { w, p } = setup('faltvardare');
  p.inventory.push(makeWeapon('heavy', 'lmg'));
  send(w, p, { type: 'equip', id: 'heavy' });
  assert.equal(p.weapon.kind, 'pistol');
  p.level = 6;
  p.points = 5;
  for (const id of ['weapon_training', 'heavy_training']) send(w, p, { type: 'learn', id });
  send(w, p, { type: 'equip', id: 'heavy' });
  assert.equal(p.weapon.kind, 'lmg');
  p.scrap = 999;
  for (let i = 0; i < 3; i++) send(w, p, { type: 'armor' });
  assert.equal(p.armor, 2);
  send(w, p, { type: 'learn', id: 'fieldcraft' });
  p.points = 2;
  send(w, p, { type: 'learn', id: 'armor_training' });
  send(w, p, { type: 'armor' });
  assert.equal(p.armor, 3);
});
test('support and assault specials work for all six classes, including cooperative revival', () => {
  for (const classId of [
    'stalvakt',
    'skogsvandrare',
    'kopparslagare',
    'alvvakt',
    'faltvardare',
    'bruksingenjor',
  ])
    for (const branch of ['support_ability', 'assault_ability']) {
      const { w, p } = setup(classId);
      p.skills = [branch];
      Object.assign(p, { x: -480, z: 480 });
      p.hp = 40;
      const ally = addPlayer(w, 'ally', 'Allierad', 'stalvakt');
      Object.assign(ally, {
        x: p.x,
        z: p.z + 2,
        hp: branch === 'assault_ability' && classId === 'faltvardare' ? 0 : 50,
      });
      send(w, p, { type: 'special' });
      assert.equal(p.specialCooldown, 40, `${classId} ${branch}`);
      if (classId === 'faltvardare')
        assert.equal(ally.hp, branch === 'support_ability' ? maxHp(ally) : maxHp(ally) / 2);
      if (classId === 'kopparslagare')
        assert.ok(branch === 'support_ability' ? p.slagShield === 8 : w.grenades[0].damage === 180);
      if (classId === 'skogsvandrare' && branch === 'support_ability')
        assert.equal(p.camouflage, 10);
    }
});
test('Aalto entrance and interior are walkable, solid walls and upper floor stop shots', () => {
  assert.equal(canStand(AALTO.x + 12, AALTO.z + 3.5), true);
  assert.equal(canStand(AALTO.x + 12, AALTO.z - 3), false);
  const { w, p } = setup();
  Object.assign(p, { x: AALTO.x + 18, z: AALTO.z + 3.5 });
  p.input = cleanInput({ x: -1 });
  advance(w, 8);
  assert.ok(p.x < AALTO.x + 10);
  assert.equal(groundHeight(p.x, p.z), AALTO_FLOOR);
  assert.equal(
    clearShot({ x: AALTO.x + 14, z: AALTO.z + 3.5 }, { x: AALTO.x + 8, z: AALTO.z + 3.5 }),
    true,
  );
  assert.equal(
    clearShot({ x: AALTO.x + 14, z: AALTO.z - 3 }, { x: AALTO.x + 8, z: AALTO.z - 3 }),
    false,
  );
  for (const c of CACHES) assert.ok(canStand(c.x, c.z), c.id);
});
test('archive caches require proximity and sight, are personal, persist, and reward the quest only once', () => {
  const { w, p } = setup();
  send(w, p, { type: 'search' });
  assert.equal(p.searched.length, 0);
  const archive = INTERIOR_CACHES[0];
  Object.assign(p, { x: archive.x, z: archive.z + 1 });
  assert.equal(nearbyCache(p).id, archive.id);
  send(w, p, { type: 'search' });
  assert.equal(p.archiveQuest, 1);
  assert.equal(p.credits, 15);
  send(w, p, { type: 'search' });
  assert.equal(p.credits, 15);
  send(w, p, { type: 'archive' });
  assert.equal(p.archiveQuest, 1);
  Object.assign(p, CAMP);
  send(w, p, { type: 'archive' });
  assert.equal(p.credits, 135);
  assert.equal(p.archiveQuest, 2);
  send(w, p, { type: 'archive' });
  assert.equal(p.credits, 135);
  const q = addPlayer(w, 'q', 'Andra', 'stalvakt');
  restorePlayer(w, q, JSON.parse(JSON.stringify(savePlayer(p))));
  Object.assign(q, { x: archive.x, z: archive.z + 1 });
  assert.equal(nearbyCache(q), undefined);
  assert.equal(q.archiveQuest, 2);
});
test('new saves restore modules and resources while invalid and legacy fields are bounded', () => {
  const { w, p } = setup();
  p.level = 5;
  p.points = 1;
  p.skills = ['weapon_training', 'heavy_training'];
  p.weapon.mods = { magazine: 'extended_mag' };
  p.attachments.flashlight = 2;
  p.materials.iron = 25;
  p.credits = 350;
  const save = JSON.parse(JSON.stringify(savePlayer(p))),
    q = addPlayer(w, 'q', 'Other', 'stalvakt');
  restorePlayer(w, q, save);
  assert.equal(weaponStats(q).mag, 36);
  assert.equal(q.attachments.flashlight, 2);
  assert.equal(q.materials.iron, 25);
  assert.deepEqual(q.skills, p.skills);
  save.attachments = { scope_6: 999, flashlight: 999 };
  save.materials.iron = -10;
  save.credits = Infinity;
  save.skills = ['assault_ability', 'support_ability', 'mastery'];
  restorePlayer(w, q, save);
  assert.equal(
    Object.values(q.attachments).reduce((a, b) => a + b, 0),
    24,
  );
  assert.equal(q.materials.iron, 0);
  assert.equal(q.credits, 0);
  assert.deepEqual(q.skills, []);
  restorePlayer(w, q, { version: 1, classId: 'stalvakt' });
  assert.equal(q.credits, 0);
  assert.deepEqual(q.attachments, {});
});
test('AdminL can grant bounded resources and credits; other players cannot forge that authority', () => {
  const { w, p } = setup();
  const command = { type: 'spawn_resource', category: 'material', key: 'iron', quantity: 10 };
  assert.equal(adminAction(w, p.id, command).ok, false);
  p.name = 'AdminL';
  assert.equal(adminAction(w, p.id, command).ok, true);
  assert.equal(p.materials.iron, 10);
  assert.equal(adminAction(w, p.id, { ...command, quantity: 1000 }).ok, false);
  assert.equal(adminAction(w, p.id, { type: 'set_stats', stats: { credits: 500 } }).ok, true);
  assert.equal(p.credits, 500);
});

test('a suppressor avoids alerting an unseen guard outside its reduced sound radius', () => {
  for (const suppressed of [false, true]) {
    const { w, p } = setup();
    Object.assign(p, { x: AALTO.x, z: AALTO.z - 20 });
    const e = spawnEnemy(w, AALTO.x, AALTO.z + 20);
    assert.equal(clearShot(p, e), false);
    if (suppressed) p.weapon.mods = { muzzle: 'suppressor' };
    p.input = cleanInput({ fire: true, pitch: 1.4 });
    tick(w, 0.05);
    assert.equal(e.phase, suppressed ? 'patrol' : 'hunt');
    assert.equal(e.targetId, suppressed ? undefined : p.id);
  }
});

test('Anders sells bounded paint at server-owned prices only within reach of the provisional studio', async () => {
  const { ARTIST, ARTIST_LOCATION, PROPERTY } = await import('../shared/artist.js');
  const { w, p } = setup();
  p.credits = 100;
  send(w, p, { type: 'buy_paint', color: 'red', price: 0 });
  assert.equal(p.credits, 100);
  Object.assign(p, { x: ARTIST.x, z: ARTIST.z });
  send(w, p, { type: 'buy_paint', color: 'red', price: 0 });
  assert.equal(p.credits, 75);
  assert.equal(p.paint.red, 1);
  send(w, p, { type: 'buy_paint', color: '__proto__' });
  assert.equal(p.credits, 75);
  p.paint.blue = 10;
  send(w, p, { type: 'buy_paint', color: 'blue' });
  assert.equal(p.credits, 75);
  assert.equal(ARTIST_LOCATION.verified, false);
  assert.equal(PROPERTY.estimate, null);
  assert.equal(PROPERTY.checkedAt, null);
});
test('spraying consumes owned paint, uses server position, observes cooldown and restores bounded artwork', () => {
  const { w, p } = setup();
  Object.assign(p, { x: -480, z: 480, aim: 0 });
  p.paint.blue = 3;
  send(w, p, { type: 'select_paint', color: 'blue', motif: 'icecream' });
  send(w, p, { type: 'spray', x: 999, z: 999, color: 'red' });
  assert.equal(p.paint.blue, 2);
  assert.equal(p.paintings[0].x, p.x);
  assert.equal(p.paintings[0].z, p.z + 1.8);
  assert.equal(p.paintings[0].motif, 'icecream');
  send(w, p, { type: 'spray' });
  assert.equal(p.paint.blue, 2);
  advance(w, 1.1);
  send(w, p, { type: 'spray' });
  assert.equal(p.paint.blue, 1);
  const save = JSON.parse(JSON.stringify(savePlayer(p))),
    q = addPlayer(w, 'q', 'Konstnär', 'stalvakt');
  restorePlayer(w, q, save);
  assert.equal(q.paint.blue, 1);
  assert.equal(q.paintings.length, 2);
  assert.equal(q.paintMotif, 'icecream');
  save.paintings.push(
    { x: Infinity, z: 1, color: 'blue', motif: 'icecream' },
    { x: 0, z: 0, color: '__proto__', motif: 'skull' },
  );
  restorePlayer(w, q, save);
  assert.equal(q.paintings.length, 2);
  restorePlayer(w, q, { version: 1, classId: 'stalvakt' });
  assert.equal(q.paintings.length, 0);
  assert.equal(q.paint.blue, 0);
});
test('spray art cannot be placed through walls or used while dead', () => {
  const { w, p } = setup();
  p.paint.red = 2;
  Object.assign(p, { x: AALTO.x + 13, z: AALTO.z - 3, aim: -Math.PI / 2 });
  send(w, p, { type: 'spray' });
  assert.equal(p.paint.red, 2);
  assert.equal(p.paintings.length, 0);
  p.hp = 0;
  Object.assign(p, { x: -480, z: 480 });
  send(w, p, { type: 'spray' });
  assert.equal(p.paint.red, 2);
});

test('malformed catalog keys and saved modifications cannot throw or mutate resources', () => {
  const { w, p } = setup();
  p.name = 'AdminL';
  p.credits = 200;
  for (const value of [null, [], {}, { toString: null }, 3]) {
    for (const type of [
      'buy',
      'sell',
      'fabricate',
      'mount',
      'detach',
      'select_paint',
      'buy_paint',
      'use_supply',
    ])
      assert.doesNotThrow(() =>
        send(w, p, {
          type,
          key: value,
          category: value,
          color: value,
          id: p.weapon.id,
          slot: value,
        }),
      );
    assert.doesNotThrow(() =>
      adminAction(w, p.id, {
        type: 'spawn_resource',
        category: 'material',
        key: value,
        quantity: 1,
      }),
    );
    assert.equal(compatible('rifle', value), false);
    assert.deepEqual(validMods('rifle', { optic: value }), {});
  }
  assert.equal(p.credits, 200);
  const save = savePlayer(p);
  save.paintColor = { toString: null };
  save.paintMotif = { toString: null };
  save.inventory = [
    { id: 'test', kind: 'rifle', rarity: 0, level: 1, mods: { optic: { toString: null } } },
  ];
  assert.doesNotThrow(() => restorePlayer(w, p, save));
});
