import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  addPlayer,
  act,
  tick,
  savePlayer,
  restorePlayer,
  makeWeapon,
} from '../shared/game.js';
import { MAP, groundHeight, eyeHeight } from '../shared/map.js';
import { CAMP, campaignStatus } from '../shared/progression.js';

test('Maja gives a location contract with a one-time reward and saves its next step', () => {
  const w = createWorld(),
    p = addPlayer(w, 'p', 'Dalmas', 'stalvakt');
  act(w, p.id, { type: 'contract' });
  assert.equal(p.campaign.active, true);
  act(w, p.id, { type: 'contract' });
  assert.equal(p.scrap, 0);
  const koppar = MAP.places.find((p) => p.id === 'koppar');
  Object.assign(p, { x: koppar.x, z: koppar.z });
  tick(w, 0.05);
  assert.equal(campaignStatus(p).ready, true);
  act(w, p.id, { type: 'contract' });
  assert.equal(p.scrap, 0); // Cannot hand in remotely.
  Object.assign(p, CAMP);
  act(w, p.id, { type: 'contract' });
  assert.equal(p.campaign.step, 1);
  assert.equal(p.scrap, 40);
  assert.equal(p.xp, 70);
  act(w, p.id, { type: 'contract' });
  act(w, p.id, { type: 'contract' });
  assert.equal(p.scrap, 40);
  assert.equal(p.campaign.active, true);
  const restored = addPlayer(w, 'q', 'Dalkulla', 'stalvakt');
  restorePlayer(w, restored, savePlayer(p));
  assert.deepEqual(restored.campaign, p.campaign);
});

test('workshop uses server prices, enforces location and capacity, and caps armor', () => {
  const w = createWorld(),
    p = addPlayer(w, 'p', 'Dalmas', 'stalvakt');
  p.scrap = 500;
  p.level = 5;
  act(w, p.id, { type: 'craft', kind: 'scout', cost: 0, level: 30, rarity: 3 });
  assert.equal(p.scrap, 400);
  assert.equal(p.inventory.at(-1).level, 5);
  assert.equal(p.inventory.at(-1).rarity, 1);
  act(w, p.id, { type: 'craft', kind: '__proto__' });
  assert.equal(p.scrap, 400);
  for (let i = 0; i < 4; i++) act(w, p.id, { type: 'armor' });
  assert.equal(p.armor, 3);
  assert.equal(p.scrap, 160);
  while (p.inventory.length < 16) p.inventory.push(makeWeapon('fixture' + p.inventory.length));
  act(w, p.id, { type: 'craft', kind: 'rifle' });
  assert.equal(p.scrap, 160);
  p.inventory.pop();
  p.x += 100;
  act(w, p.id, { type: 'craft', kind: 'rifle' });
  assert.equal(p.scrap, 160);
  Object.assign(p, CAMP);
  p.scrap = 0;
  act(w, p.id, { type: 'craft', kind: 'rifle' });
  assert.equal(p.inventory.length, 15);
});

test('legacy saves start a new campaign and invalid progression fields are bounded', () => {
  const w = createWorld(),
    p = addPlayer(w, 'p', 'Dalmas', 'stalvakt');
  restorePlayer(w, p, { version: 1, classId: 'stalvakt' });
  assert.equal(p.armor, 0);
  assert.equal(p.campaign.step, 0);
  restorePlayer(w, p, {
    version: 1,
    classId: 'stalvakt',
    armor: 999,
    crafted: -8,
    campaign: { step: 99, active: true },
  });
  assert.equal(p.armor, 3);
  assert.equal(p.crafted, 0);
  assert.equal(p.campaign.active, false);
});

test('armor reduces real incoming damage and the campaign tracks the correct boss kill', () => {
  const w = createWorld(),
    p = addPlayer(w, 'p', 'Dalmas', 'stalvakt');
  const e = w.enemies.find((e) => e.landmark === 'verket');
  w.enemies = [e];
  Object.assign(p, { x: e.x, z: e.z + 20, armor: 3 });
  const before = p.hp;
  e.windup = 0.01;
  tick(w, 0.05);
  assert.ok(Math.abs(before - p.hp - 38 * 0.76) < 0.0001);
  p.campaign = { step: 1, active: true, kills: 5, boss: false, visited: false };
  p.weapon = makeWeapon('test', 'scout', 3, 30);
  e.hp = 1;
  e.windup = 0;
  e.cooldown = 10;
  p.input = {
    aim: Math.PI,
    pitch: Math.atan2(groundHeight(e.x, e.z) + 1.7 - groundHeight(p.x, p.z) - eyeHeight(p), 20),
    fire: true,
  };
  tick(w, 0.05);
  assert.equal(p.campaign.boss, true);
  assert.equal(campaignStatus(p).ready, true);
  const respawn = w.respawns[0];
  assert.equal(respawn.landmark, 'verket');
});
