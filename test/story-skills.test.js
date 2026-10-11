import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  addPlayer,
  act,
  tick,
  spawnEnemy,
  maxHp,
  weaponStats,
  savePlayer,
  restorePlayer,
  cleanInput,
} from '../shared/game.js';
import { CAMP, campaignStatus, trackCampaign } from '../shared/progression.js';
import { CONTRACTS, STORY_SITES, nearbyStory, campaignTarget } from '../shared/story.js';
import { MAP, canStand, clearShot } from '../shared/map.js';
import { CLASS_SKILLS } from '../shared/class-skills.js';
import { collect } from '../shared/economy.js';
import { talentTree } from '../shared/talents.js';
const setup = (classId = 'stalvakt') => {
  const w = createWorld({ random: () => 0.5 });
  w.enemies = [];
  const p = addPlayer(w, 'p', 'Testspelare', classId);
  return { w, p };
};
const advance = (w, seconds) => {
  for (let i = 0; i < Math.ceil(seconds * 20); i++) tick(w, 0.05);
};

test('the eight-chapter campaign is playable in order with one-time turn-ins and a persistent ending', () => {
  const { w, p } = setup();
  let scrap = 0;
  for (const [step, q] of CONTRACTS.entries()) {
    Object.assign(p, CAMP);
    act(w, p.id, { type: 'contract' });
    assert.equal(p.campaign.step, step);
    assert.equal(p.campaign.active, true);
    act(w, p.id, { type: 'contract' });
    assert.equal(p.scrap, scrap);
    if (q.place) {
      const target = MAP.places.find((v) => v.id === q.place);
      Object.assign(p, { x: target.x, z: target.z });
      tick(w, 0.05);
    }
    for (let i = 0; i < (q.kills || 0); i++) trackCampaign(p, 'kill', { type: 'raider' });
    if (q.boss) {
      Object.assign(p, { x: -480, z: 480 });
      trackCampaign(p, 'kill', { type: 'boss', landmark: q.boss });
    }
    if (q.site) {
      const site = STORY_SITES[q.site];
      assert.equal(canStand(site.x, site.z), true);
      Object.assign(p, { x: site.x, z: site.z + 1 });
      assert.ok(nearbyStory(p));
      act(w, p.id, { type: 'story', seconds: 0, visited: true });
      assert.equal(p.campaign.visited, false);
      advance(w, site.seconds);
      assert.equal(p.storyChannel, null);
    }
    assert.equal(campaignStatus(p).ready, true);
    act(w, p.id, { type: 'contract' });
    assert.equal(p.scrap, scrap); // no remote turn-in
    Object.assign(p, CAMP);
    act(w, p.id, { type: 'contract' });
    scrap += q.scrap;
    assert.equal(p.scrap, scrap);
    assert.equal(p.campaign.step, step + 1);
    const restored = addPlayer(w, 'save-check', 'Sparad', p.classId);
    restorePlayer(w, restored, JSON.parse(JSON.stringify(savePlayer(p))));
    assert.equal(restored.campaign.step, step + 1);
    delete w.players[restored.id];
  }
  assert.equal(campaignStatus(p).complete, true);
  act(w, p.id, { type: 'contract' });
  assert.equal(p.scrap, scrap);
  assert.equal(campaignTarget(p), null);
});

test('story interaction validates chapter, distance, walls, death and interruption; channel time is not saved', () => {
  const { w, p } = setup(),
    site = STORY_SITES.archive;
  p.campaign = { step: 3, active: true, visited: false, kills: 0, boss: false };
  act(w, p.id, { type: 'story', x: site.x, z: site.z });
  assert.equal(p.storyChannel, null);
  Object.assign(p, { x: site.x, z: site.z + 1 });
  for (const input of [{ x: 1 }, { fire: true }]) {
    act(w, p.id, { type: 'story' });
    p.input = cleanInput(input);
    tick(w, 0.05);
    assert.equal(p.storyChannel, null);
    assert.equal(p.campaign.visited, false);
    p.input = cleanInput();
  }
  act(w, p.id, { type: 'story' });
  advance(w, 1);
  p.hp -= 1;
  tick(w, 0.05);
  assert.equal(p.storyChannel, null);
  act(w, p.id, { type: 'story' });
  advance(w, 1);
  const q = addPlayer(w, 'q', 'Sparad', 'stalvakt');
  restorePlayer(w, q, savePlayer(p));
  assert.equal(q.storyChannel, null);
  assert.equal(q.campaign.visited, false);
  p.hp = 0;
  tick(w, 0.05);
  act(w, p.id, { type: 'story' });
  assert.equal(p.storyChannel, null);
  p.hp = 100;
  Object.assign(p, { x: site.x, z: site.z - 4 });
  assert.equal(clearShot(p, site), false);
  act(w, p.id, { type: 'story' });
  assert.equal(p.storyChannel, null);
});

test('completed v0.5 saves continue at the archive without losing already-searched loot', () => {
  const { w, p } = setup();
  restorePlayer(w, p, {
    version: 1,
    classId: 'stalvakt',
    campaign: { step: 3, active: false },
    searched: ['aalto-archive'],
    archiveQuest: 2,
  });
  assert.equal(p.campaign.step, 3);
  assert.equal(p.archiveQuest, 2);
  Object.assign(p, CAMP);
  act(w, p.id, { type: 'contract' });
  Object.assign(p, STORY_SITES.archive);
  act(w, p.id, { type: 'story' });
  advance(w, 3);
  assert.equal(campaignStatus(p).ready, true);
});

test('every class can purchase and restore its own three new talents; wrong-class talents are rejected', () => {
  for (const classId of Object.keys(CLASS_SKILLS)) {
    const { w, p } = setup(classId);
    p.level = 10;
    p.points = 9;
    const [first, second] = CLASS_SKILLS[classId];
    act(w, p.id, { type: 'learn', id: 'class_utility' });
    assert.equal(p.skills.length, 0);
    for (const id of ['fieldcraft', 'weapon_training', first[0], second[0], 'class_utility'])
      act(w, p.id, { type: 'learn', id });
    assert.equal(p.points, 3);
    assert.equal(p.skills.length, 5);
    const q = addPlayer(w, 'q', 'Sparad', classId);
    restorePlayer(w, q, savePlayer(p));
    assert.deepEqual([...q.skills].sort(), [...p.skills].sort());
    const foreign = Object.values(CLASS_SKILLS).find((nodes) => nodes[0][0] !== first[0])[0][0];
    act(w, p.id, { type: 'learn', id: foreign });
    assert.equal(p.points, 3);
    assert.equal(new Set(talentTree(classId).map((n) => n.id)).size, talentTree(classId).length);
  }
});

test('class passives change actual health, weapon statistics, healing and material collection', () => {
  for (const [id, skill, property, lower] of [
    ['stalvakt', 'brace', 'recoil', true],
    ['skogsvandrare', 'marksman', 'damage', false],
    ['kopparslagare', 'shellsmith', 'reload', true],
    ['alvvakt', 'bridgeaim', 'spread', true],
    ['faltvardare', 'sidearm', 'reload', true],
    ['bruksingenjor', 'benchtest', 'reload', true],
  ]) {
    const { p } = setup(id);
    p.crouch = p.ads = true;
    p.moving = false;
    const before = weaponStats(p)[property];
    p.skills = [skill];
    assert.ok(lower ? weaponStats(p)[property] < before : weaponStats(p)[property] > before, id);
  }
  const { w, p } = setup();
  const before = maxHp(p);
  p.skills = ['furnace'];
  assert.equal(maxHp(p), before + 25);
  const medic = addPlayer(w, 'medic', 'Liv', 'faltvardare');
  medic.skills = ['sterile'];
  medic.hp = 1;
  medic.supplies.medkit = 1;
  act(w, medic.id, { type: 'use_supply', key: 'medkit' });
  assert.equal(medic.hp, 96);
  const engineer = addPlayer(w, 'eng', 'Torsten', 'bruksingenjor');
  engineer.skills = ['salvager'];
  collect(engineer, { material: 'electronics', quantity: 4 });
  assert.equal(engineer.materials.electronics, 6);
  const copper = addPlayer(w, 'cop', 'Smed', 'kopparslagare');
  copper.skills = ['blastcraft'];
  Object.assign(copper, { x: -480, z: 480 });
  act(w, copper.id, { type: 'grenade' });
  assert.equal(w.grenades.at(-1).damage, 150);
  assert.equal(copper.grenades, 2);
});

test('tactical skills require an unlock, observe cooldowns and never affect dead players', () => {
  for (const classId of Object.keys(CLASS_SKILLS)) {
    const { w, p } = setup(classId);
    Object.assign(p, { x: -480, z: 480 });
    act(w, p.id, { type: 'tactical' });
    assert.equal(p.tacticalCooldown, 0);
    p.skills = ['class_utility'];
    act(w, p.id, { type: 'tactical' });
    assert.equal(p.tacticalCooldown, 28);
    tick(w, 0.1);
    act(w, p.id, { type: 'tactical' });
    assert.equal(p.tacticalCooldown, 27.9);
    p.hp = 0;
    p.tacticalCooldown = 0;
    act(w, p.id, { type: 'tactical' });
    assert.equal(p.tacticalCooldown, 0);
  }
});

test('support tactics heal over time and boost allies, but exclude PvP opponents', () => {
  for (const classId of ['faltvardare', 'alvvakt']) {
    const { w, p } = setup(classId);
    w.pvp = true;
    Object.assign(p, MAP.arena, { pvp: true, skills: ['class_utility'], hp: 10, stamina: 0 });
    const ally = addPlayer(w, 'ally', 'Vän', 'stalvakt'),
      enemy = addPlayer(w, 'enemy', 'Rival', 'stalvakt');
    for (const t of [ally, enemy]) Object.assign(t, { x: p.x, z: p.z, hp: 10, stamina: 0 });
    enemy.pvp = true;
    act(w, p.id, { type: 'tactical' });
    if (classId === 'faltvardare') {
      advance(w, 8);
      assert.ok(Math.abs(ally.hp - 58) < 1e-6);
      assert.equal(enemy.hp, 10);
      assert.ok(Math.abs(p.hp - 58) < 1e-6);
    } else {
      assert.equal(ally.stamina, 45);
      assert.equal(enemy.stamina, 0);
      assert.equal(ally.riverHaste, 6);
    }
  }
});

test('hammer and jammer interrupt visible enemies, have reduced boss duration, and cannot pass through walls', () => {
  for (const classId of ['kopparslagare', 'bruksingenjor']) {
    const { w, p } = setup(classId);
    Object.assign(p, { x: -480, z: 480, skills: ['class_utility'] });
    const e = spawnEnemy(w, p.x, p.z + 5),
      boss = spawnEnemy(w, p.x + 4, p.z + 5, 'boss');
    e.windup = boss.windup = 1;
    const hp = e.hp;
    act(w, p.id, { type: 'tactical' });
    assert.equal(e.windup, 0);
    assert.equal(boss.windup, 0);
    assert.ok(boss.stagger < e.stagger);
    assert.equal(e.hp, hp - (classId === 'kopparslagare' ? 30 : 0));
    const position = { x: e.x, z: e.z };
    tick(w, 0.1);
    assert.equal(e.x, position.x);
    assert.equal(e.z, position.z);
    w.enemies = [];
    p.tacticalCooldown = 0;
    const site = STORY_SITES.archive;
    Object.assign(p, { x: site.x, z: site.z - 4 });
    const hidden = spawnEnemy(w, site.x, site.z);
    assert.equal(clearShot(p, hidden), false);
    act(w, p.id, { type: 'tactical' });
    assert.equal(hidden.stagger, undefined);
  }
});

test('rally holds enemy attention against a later attacker until its eight-second window ends', () => {
  const { w, p } = setup();
  Object.assign(p, { x: -480, z: 480, skills: ['class_utility'], stamina: 10 });
  const ally = addPlayer(w, 'ally', 'Medspelare', 'stalvakt');
  Object.assign(ally, { x: -475, z: 476 });
  const e = spawnEnemy(w, -475, 480);
  e.cooldown = 0;
  act(w, p.id, { type: 'tactical' });
  assert.equal(p.stamina, 50);
  e.targetId = ally.id;
  e.alertUntil = w.time + 10; // A later hit uses this existing aggro path.
  const hp = p.hp;
  tick(w, 0.05);
  assert.ok(p.hp < hp);
  assert.equal(ally.hp, maxHp(ally));
  assert.equal(e.aim, -Math.PI / 2);
  e.cooldown = 100;
  advance(w, 8);
  assert.equal(e.aim, Math.PI);
});

test('forest and river passives alter stamina costs and recovery; tracking grants real intel and camouflage', () => {
  for (const [classId, skill, sprint, expected] of [
    ['skogsvandrare', 'softstep', false, 22.5],
    ['alvvakt', 'riverstride', true, -18],
  ]) {
    const { w, p } = setup(classId);
    Object.assign(p, { x: -480, z: 480, skills: [skill], stamina: 50 });
    p.input = cleanInput({ x: sprint ? 1 : 0, sprint });
    advance(w, 1);
    assert.ok(Math.abs(p.stamina - 50 - expected) < 1e-6);
  }
  const { w, p } = setup('skogsvandrare');
  Object.assign(p, { x: -480, z: 480, skills: ['class_utility'] });
  act(w, p.id, { type: 'tactical' });
  assert.equal(p.intel, 45);
  assert.equal(p.camouflage, 6);
  p.input = cleanInput({ fire: true, pitch: 1.4 });
  tick(w, 0.05);
  assert.equal(p.camouflage, 0);
  assert.ok(p.intel > 44);
});
