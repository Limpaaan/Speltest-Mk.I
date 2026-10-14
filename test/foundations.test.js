import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainContacts } from '../shared/foundations.js';
import { terrainHeight } from '../shared/terrain.js';
import { MAP, groundHeight, raycastWorld, canStand } from '../shared/map.js';
import { buildingWorld } from '../shared/buildings.js';
import { aaltoWorld } from '../shared/interiors.js';

test('foundation sampling finds wall and courtyard depressions missed by four corner heights', () => {
  const outline = [
    [-10, -5],
    [10, -5],
    [10, 5],
    [-10, 5],
  ];
  const edgeValley = (x, z) => 2 + Math.abs(x) * 0.3 + z * 0.01;
  const contacts = terrainContacts(outline, edgeValley, { extent: 0, step: 10 });
  assert.equal(Math.min(...outline.map(([x, z]) => edgeValley(x, z))), 4.95);
  assert.equal(Math.min(...contacts.map((c) => c.y)), 1.95);
  const interiorValley = (x, z) => 1 + (Math.abs(x) + Math.abs(z)) / 10;
  assert.equal(
    Math.min(...terrainContacts(outline, interiorValley, { extent: 0, step: 10 }).map((c) => c.y)),
    1,
  );
});

test('every city and landmark support reaches below the terrain along its entire rotated perimeter', () => {
  assert.ok(MAP.foundations.length > MAP.buildings.length);
  for (const f of MAP.foundations) {
    assert.ok(f.h > 0 && Number.isFinite(f.bottom), f.id);
    for (let i = 0; i < f.outline.length; i++) {
      const a = f.outline[i],
        b = f.outline[(i + 1) % f.outline.length];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.4));
      for (let j = 0; j <= steps; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / steps,
          z = a[1] + ((b[1] - a[1]) * j) / steps;
        assert.ok(f.bottom <= terrainHeight(x, z) - 0.249, f.id);
      }
    }
  }
});

test('the accessible Aalto floor and entrance remain usable while shots cannot pass under the slab', () => {
  const p = MAP.places.find((p) => p.id === 'aalto');
  const f = MAP.foundations.find((f) => f.parentId === p.id);
  assert.ok(Math.abs(f.top - (groundHeight(p.x, p.z) - 0.12)) < 1e-8);
  assert.ok(canStand(p.x, p.z));
  const entrance = aaltoWorld(13, 3.5);
  assert.ok(canStand(entrance.x, entrance.z));
  let checked = false;
  for (const side of [-1, 1]) {
    for (let z = -p.d / 2 + 1; z < p.d / 2; z++) {
      const edge = buildingWorld(p, (side * p.w) / 2, z),
        start = buildingWorld(p, side * (p.w / 2 + 0.8), z);
      const y = f.top - 0.05;
      if (groundHeight(start.x, start.z) > y - 0.1 || terrainHeight(edge.x, edge.z) > y - 0.1)
        continue;
      const hit = raycastWorld(
        { ...start, y },
        {
          x: -side * Math.cos(p.yaw || 0),
          y: 0,
          z: side * Math.sin(p.yaw || 0),
        },
        1.5,
      );
      assert.ok(
        hit && hit.distance < 0.81,
        'the raised floor or its support stops a shot under the slab',
      );
      checked = true;
      break;
    }
  }
  assert.ok(checked, 'an exposed side of the Aalto basement was tested');
});
