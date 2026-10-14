import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { environmentAt } from '../shared/environment.js';
import { FOREST, forestAt } from '../shared/forest.js';
import { MAP } from '../shared/map.js';
import { ambientWave } from '../src/soundscape.js';
test('weather stays continuous and bounded for all clients without altering the shared clock', () => {
  for (let t = -2400; t < 4800; t += 11.7) {
    const a = environmentAt(t),
      b = environmentAt(t + 0.01);
    for (const k of ['cloud', 'gust', 'mist', 'wetness', 'day', 'night']) {
      assert.ok(a[k] >= 0 && a[k] <= 1, k);
      assert.ok(Math.abs(a[k] - b[k]) < 0.01, k);
    }
    assert.ok(a.exposure > 0.5 && a.fogDensity > 0);
  }
  for (const t of [NaN, Infinity, undefined]) assert.deepEqual(environmentAt(t), environmentAt(0));
});
test('dense woodland retains its public source and actual roads and settlements stay clear', () => {
  const raw = readFileSync(new URL('../data/avesta-forest-osm.json', import.meta.url));
  assert.equal(FOREST.sourceSha256, createHash('sha256').update(raw).digest('hex'));
  assert.equal(FOREST.scale, MAP.scale);
  assert.ok(FOREST.polygons.length > 100);
  const trees = MAP.trees.filter((t) => t.forestSourced);
  assert.ok(trees.length >= 10000 && MAP.trees.length <= 17800);
  for (let i = 0; i < trees.length; i += 43) assert.ok(forestAt(trees[i].x, trees[i].z));
});
test('wind, needles and water are bounded original waves with quiet loop boundaries', () => {
  const sounds = ['wind', 'needles', 'water'].map((kind) => ambientWave(kind, 8000, 2));
  for (const data of sounds) {
    assert.ok(data.every(Number.isFinite));
    assert.ok(data.every((x) => Math.abs(x) < 0.5));
    assert.ok(data[0] === 0);
    assert.ok(Math.abs(data.at(-1)) < 0.001);
    assert.ok(data.reduce((n, x) => n + x * x, 0) > 0.01);
  }
  assert.notDeepEqual(sounds[0], sounds[1]);
  assert.notDeepEqual(sounds[1], sounds[2]);
});
