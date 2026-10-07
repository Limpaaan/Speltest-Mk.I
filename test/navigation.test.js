import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, walkableSegment } from '../shared/navigation.js';
import { MAP, canStand } from '../shared/map.js';
import { createWorld, addPlayer, spawnEnemy, tick } from '../shared/game.js';

test('navigation routes around a wall without cutting its corners', () => {
  const stand = (x, z) =>
    Math.abs(x) <= 50 && Math.abs(z) <= 50 && !(Math.abs(x) < 6 && Math.abs(z) < 18);
  const start = { x: -20, z: 0 },
    end = { x: 20, z: 0 };
  const path = findPath(start, end, { stand });
  assert.ok(path.length > 2);
  assert.deepEqual(path.at(-1), end);
  assert.ok(path.some((p) => Math.abs(p.z) >= 18));
  let previous = start;
  for (const next of path) {
    assert.ok(walkableSegment(previous, next, stand));
    previous = next;
  }
});

test('navigation crosses water only at the bridge and stops at sealed destinations', () => {
  const start = { x: -20, z: 0 },
    end = { x: 20, z: 0 };
  const stand = (x, z) =>
    Math.abs(x) < 60 && Math.abs(z) < 60 && (Math.abs(x) > 6 || (z >= 20 && z <= 28));
  const path = findPath(start, end, { stand });
  assert.ok(path.length);
  assert.ok(path.some((p) => p.z >= 20));
  let previous = start;
  for (const next of path) {
    assert.ok(walkableSegment(previous, next, stand));
    previous = next;
  }
  const sealed = (x, z) => Math.abs(x) < 60 && Math.abs(z) < 60 && Math.abs(x) > 6;
  assert.deepEqual(findPath(start, end, { stand: sealed }), []);
  assert.deepEqual(findPath(start, end, { stand, maxNodes: 1 }), []);
});

test('a live enemy reaches a player around an actual building while idle guards patrol', () => {
  const building = MAP.places.find((p) => p.id === 'plus');
  const world = createWorld();
  world.enemies = [];
  const player = addPlayer(world, 'p', 'Dalmas', 'stalvakt');
  Object.assign(player, { x: building.x + building.w / 2 + 5, z: building.z, hp: 100000 });
  const enemy = spawnEnemy(world, building.x - building.w / 2 - 5, building.z);
  const start = { x: enemy.x, z: enemy.z };
  for (let i = 0; i < 600; i++) {
    tick(world, 0.05);
    assert.ok(canStand(enemy.x, enemy.z));
  }
  assert.ok(enemy.x > building.x + building.w / 2);
  assert.ok(Math.hypot(enemy.x - player.x, enemy.z - player.z) < 20);
  assert.ok(Math.hypot(enemy.x - start.x, enemy.z - start.z) > 30);
  delete world.players.p;
  const before = { x: enemy.x, z: enemy.z };
  for (let i = 0; i < 80; i++) tick(world, 0.05);
  assert.ok(Math.hypot(enemy.x - before.x, enemy.z - before.z) > 1);
});
