import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, canStand } from '../shared/map.js';
import { createWorld } from '../shared/game.js';
import { normalizeOSM } from '../scripts/import-osm.js';
test('map import retains provenance and projects real coordinates in metres', () => {
  const result = normalizeOSM({
    elements: [
      { type: 'node', id: 1, lat: 60.145, lon: 16.17, tags: { name: 'Fixture' } },
      {
        type: 'way',
        id: 2,
        tags: { highway: 'primary' },
        geometry: [
          { lat: 60.145, lon: 16.17 },
          { lat: 60.146, lon: 16.171 },
        ],
      },
    ],
  });
  assert.equal(result.license, 'ODbL-1.0');
  assert.equal(result.features.length, 2);
  assert.equal(result.features[0].projected[0].x, 0);
  assert.ok(result.features[1].projected[1].x > 50);
  assert.ok(result.features[1].projected[1].z < -110);
});
test('map import rejects empty data and ignores geometry outside Avesta', () => {
  assert.throws(() => normalizeOSM({ elements: [] }), /No usable/);
  assert.throws(
    () =>
      normalizeOSM({
        elements: [{ type: 'node', id: 1, lat: 1, lon: 1, tags: { name: 'Elsewhere' } }],
      }),
    /No usable/,
  );
  assert.throws(() => normalizeOSM(null), /Expected/);
});

test('shipped map has sourced landmarks and valid player and enemy spawns', () => {
  assert.equal(MAP.places.filter((p) => p.verified).length, 6);
  const aalto = MAP.places.find((p) => p.id === 'aalto');
  assert.equal(aalto.lat, 60.1446593);
  assert.equal(aalto.lon, 16.1770483);
  assert.equal(aalto.sourceId, 'way/132486267');
  assert.ok(MAP.roads.length > 1000);
  assert.ok(MAP.rivers.length > 50);
  assert.ok(canStand(MAP.spawn.x, MAP.spawn.z));
  assert.ok(createWorld().enemies.every((e) => canStand(e.x, e.z)));
  assert.equal(MAP.places.find((p) => p.id === 'plus').verified, false);
});
