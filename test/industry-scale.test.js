import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MAP, canStand, raycastWorld, groundHeight } from '../shared/map.js';
import { industry, INDUSTRY_PLACES, industrialVolumes } from '../shared/industry.js';
import { buildingContains, buildingWorld } from '../shared/buildings.js';
import { insideFootprint } from '../shared/foundations.js';
import { terrain } from '../shared/terrain.js';

test('landmark spacing, transport and elevations all use the same physical metre scale', () => {
  assert.equal(MAP.scale, 1);
  assert.equal(terrain.horizontalScale, 1);
  assert.equal(terrain.verticalScale, 1);
  assert.equal(terrain.extent, 2400);
  const a = MAP.places.find((p) => p.id === 'aalto');
  for (const [id, metres, tolerance] of [
    ['horse', 1550, 25],
    ['storfors', 715, 10],
    ['ostberg', 900, 70],
    ['verket', 600, 70],
  ]) {
    const p = MAP.places.find((p) => p.id === id);
    assert.ok(Math.abs(Math.hypot(p.x - a.x, p.z - a.z) - metres) < tolerance, id);
  }
  assert.ok(a.w > 70 && a.d > 45);
  assert.ok(canStand(MAP.spawn.x, MAP.spawn.z));
});

test('industrial halls retain source footprints and a concave loading yard stays open to walking and fire', () => {
  const raw = readFileSync(new URL('../data/avesta-buildings-osm.json', import.meta.url));
  assert.equal(industry.sourceSha256, createHash('sha256').update(raw).digest('hex'));
  const areaRaw = readFileSync(new URL('../data/avesta-industrial-osm.json', import.meta.url));
  assert.equal(industry.areasSourceSha256, createHash('sha256').update(areaRaw).digest('hex'));
  for (const id of ['ostberg', 'outokumpu', 'varmbandverk', 'bredbandverk', 'linde-gas'])
    assert.ok(INDUSTRY_PLACES.some((p) => p.id === id));
  const p = INDUSTRY_PLACES.find((p) => p.id === 'ostberg'),
    volumes = industrialVolumes(p);
  assert.ok(volumes.length > 1);
  const plan = MAP.foundations.find((f) => f.parentId === p.id);
  assert.equal(plan.shape, 'polygon');
  assert.deepEqual(plan.outline, p.footprint);
  let yard;
  for (let x = -p.w / 2 + 3; x < p.w / 2 && !yard; x += 3)
    for (let z = -p.d / 2 + 3; z < p.d / 2 && !yard; z += 3) {
      const q = buildingWorld(p, x, z);
      if (
        insideFootprint(q.x, q.z, p.footprint) ||
        volumes.some((v) => buildingContains(v, q.x, q.z, 1)) ||
        !canStand(q.x, q.z)
      )
        continue;
      const hit = raycastWorld({ ...q, y: groundHeight(p.x, p.z) + 4 }, { x: 0, y: -1, z: 0 }, 50);
      if (hit?.kind === 'ground') yard = q;
    }
  assert.ok(
    yard,
    'loading-yard recess is not filled with rectangular collision or foundation cover',
  );
  assert.equal(
    MAP.buildings.some((b) => b.sourceId === p.sourceId),
    false,
    'mapped landmark has no duplicate infill body',
  );
});
