import test from 'node:test';
import assert from 'node:assert/strict';
import { daylight, DAY_SECONDS } from '../shared/daylight.js';
import { fitRoads, crossing, roadWidth } from '../shared/roads.js';
import { MAP, canStand, groundHeight, raycastWorld } from '../shared/map.js';
import { terrainHeight } from '../shared/terrain.js';
import { createWorld, addPlayer, tick, snapshot } from '../shared/game.js';

test('day cycle wraps continuously, starts in daylight, and gives three times as much day as night', () => {
  assert.equal(DAY_SECONDS, 2400);
  assert.equal(daylight(0).day, 1);
  assert.equal(daylight(1300).night, 1);
  let day = 0,
    night = 0;
  for (let t = 0; t < DAY_SECONDS; t++) {
    const d = daylight(t);
    assert.ok(d.day >= 0 && d.day <= 1);
    if (d.elevation > 0) day++;
    else night++;
  }
  assert.ok(Math.abs(day / night - 3) < 0.02);
  const before = daylight(2399.999),
    after = daylight(2400);
  assert.ok(Math.abs(before.day - after.day) < 0.001);
  assert.equal(daylight(Infinity).label, daylight(0).label);
});
test('all players receive the same authoritative clock and game actions cannot select a different night', () => {
  const w = createWorld();
  w.enemies = [];
  addPlayer(w, 'a', 'Anna', 'stalvakt');
  addPlayer(w, 'b', 'Bo', 'alvvakt');
  w.dayTime = 2399.98;
  tick(w, 0.05);
  const s = snapshot(w);
  assert.ok(Math.abs(s.dayTime - 0.03) < 1e-8);
  assert.equal(daylight(s.dayTime).label, daylight(w.dayTime).label);
});
test('a street crossing a building detours along connected outside segments; terminating driveways stop before the facade', () => {
  const building = { x: 0, z: 0, w: 10, d: 8 };
  const road = {
    id: 'street',
    name: 'Street',
    points: [
      [-20, 0],
      [20, 0],
    ],
  };
  const result = fitRoads([road], [building]);
  assert.ok(result.length >= 3);
  assert.deepEqual(result[0].points[0], road.points[0]);
  assert.deepEqual(result.at(-1).points[1], road.points[1]);
  for (let i = 0; i < result.length; i++) {
    assert.equal(crossing(...result[i].points, building, roadWidth(road) / 2), null);
    if (i) assert.deepEqual(result[i - 1].points[1], result[i].points[0]);
  }
  const stub = fitRoads(
    [
      {
        ...road,
        points: [
          [-20, 0],
          [0, 0],
        ],
      },
    ],
    [building],
  );
  assert.equal(stub.length, 1);
  assert.ok(stub[0].points[1][0] < -5);
});
test('no rendered road width runs through a landmark or generated building footprint', () => {
  for (const road of MAP.roads)
    for (const p of [...MAP.places, ...MAP.buildings])
      if (p.w && p.d)
        assert.equal(
          crossing(...road.points, p, roadWidth(road) / 2),
          null,
          `${road.id} intersects ${p.id}`,
        );
});
test('raised roads affect movement ground and downward shots, not only the surface picture', () => {
  const candidates = MAP.roads
    .filter((r) => !r.bridge)
    .map((r) => ({
      x: (r.points[0][0] + r.points[1][0]) / 2,
      z: (r.points[0][1] + r.points[1][1]) / 2,
    }));
  const p = candidates.find(
    (p) =>
      canStand(p.x, p.z) &&
      Math.abs(groundHeight(p.x, p.z) - terrainHeight(p.x, p.z) - 0.185) < 0.001,
  );
  assert.ok(p);
  const y = groundHeight(p.x, p.z),
    hit = raycastWorld({ ...p, y: y + 2 }, { x: 0, y: -1, z: 0 }, 3);
  assert.equal(hit.kind, 'ground');
  assert.ok(Math.abs(hit.y - y) < 0.001);
});
test('parked, overturned and burning police cars remain solid cover and leave travel lanes clear', () => {
  const cars = MAP.cover.filter((p) => p.type === 'police');
  assert.ok(cars.length >= 6);
  assert.ok(cars.some((p) => p.overturned));
  assert.ok(cars.some((p) => p.burning));
  for (const c of cars) {
    assert.equal(canStand(c.x, c.z), false);
    const hit = raycastWorld(
      { x: c.x, z: c.z, y: groundHeight(c.x, c.z) + 3 },
      { x: 0, y: -1, z: 0 },
      4,
    );
    assert.equal(hit.id, c.id);
    assert.equal(hit.kind, 'police');
  }
});
test('four priority districts retain their provenance and distinctive architecture', () => {
  assert.equal(MAP.districts.length, 4);
  const rusta = MAP.places.find((p) => p.id === 'rusta'),
    willys = MAP.places.find((p) => p.id === 'willys');
  assert.ok(rusta.x < willys.x && rusta.w < willys.w);
  assert.equal(rusta.z, willys.z);
  assert.ok(Math.abs(rusta.x + rusta.w / 2 - (willys.x - willys.w / 2)) < 0.001);

  const p = MAP.places.filter((p) => p.district);
  assert.ok(p.length >= 20);
  for (const item of p) {
    if (item.sourceId) {
      assert.equal(item.verified, true);
      assert.equal(item.architecture, 'OSM-position-interpreted-elevation');
    } else {
      assert.equal(item.verified, false);
      assert.equal(item.architecture, 'user-map-approximation');
    }
  }
  assert.ok(p.some((p) => p.type === 'church'));
  assert.equal(p.filter((p) => p.type === 'powerstation').length, 2);
  assert.ok(p.filter((p) => p.type === 'historic').length >= 8);
});

test('human geometry stays finite and articulated crouching keeps the head at camera height and boots above the ground', async () => {
  const { createHuman, animateHuman, PROFESSIONS } = await import('../src/humans.js');
  const { Box3, Vector3 } = await import('three');
  for (const classId of Object.keys(PROFESSIONS)) {
    const human = createHuman({ id: 'pose', classId, armed: false });
    for (const crouch of [false, true]) {
      animateHuman(human, 1, { crouch });
      const bounds = new Box3().setFromObject(human);
      assert.ok(bounds.min.y > -0.035, classId);
      assert.ok(bounds.max.y < (crouch ? 1.3 : 1.95));
      assert.ok(bounds.max.y > (crouch ? 1.1 : 1.65));
      const head = human.userData.human.head.getWorldPosition(new Vector3());
      assert.ok(Math.abs(head.y - (crouch ? 1.05 : 1.65)) < 0.12);
    }
    human.traverse((child) => {
      for (const attribute of Object.values(child.geometry?.attributes || {}))
        assert.ok(attribute.array.every(Number.isFinite));
    });
    human.userData.geometries.forEach((g) => g.dispose());
  }
});

test('hand reaches bend at both joints, grip props, and idle actions stop immediately during movement or combat', async () => {
  const { createHuman, animateHuman } = await import('../src/humans.js'),
    { Vector3, Group } = await import('three');
  const actor = createHuman({ id: 'animated', classId: 'stalvakt' }, () => new Group()),
    rig = actor.userData.human;
  for (const kind of ['scratch', 'stretch', 'smoke', 'snus', 'pickup', 'trade']) {
    animateHuman(actor, 10, { previewPose: { kind, progress: 0.5 } });
    actor.updateMatrixWorld(true);
    assert.equal(rig.motion, kind);
    assert.ok(Math.abs(rig.arms[1].elbow.quaternion.w) < 1);
    if (kind === 'smoke') {
      assert.ok(rig.props.cigarette.visible);
      const target = rig.torso.localToWorld(new Vector3(0.025, rig.head.position.y - 0.072, 0.14));
      const fingers = rig.arms[1].fingers.localToWorld(new Vector3(0, -0.055, 0));
      assert.ok(fingers.distanceTo(target) < 0.11);
    }
    if (kind === 'snus') assert.ok(rig.props.tin.visible);
    if (kind === 'pickup' || kind === 'trade') assert.ok(rig.props.parcel.visible);
  }
  animateHuman(actor, 10.1, { moving: true, previewPose: { kind: 'smoke', progress: 0.5 } });
  assert.equal(rig.motion, null);
  assert.ok(Object.values(rig.props).every((p) => !p.visible));
  assert.equal(rig.weapon.rotation.z, 0);
  animateHuman(actor, 10.2, { combat: true, previewPose: { kind: 'stretch', progress: 0.5 } });
  assert.equal(rig.motion, null);
  actor.userData.geometries.forEach((g) => g.dispose());
  actor.userData.extraMaterials.forEach((m) => m.dispose());
});

test('successful trades send a shared reach gesture, rejected actions do not, and movement cancels it', async () => {
  const { act } = await import('../shared/game.js'),
    { CAMP } = await import('../shared/progression.js');
  const w = createWorld();
  w.enemies = [];
  const p = addPlayer(w, 'gesture', 'Skiftet', 'stalvakt');
  Object.assign(p, CAMP);
  p.credits = 100;
  act(w, p.id, { type: 'buy', category: 'material', key: 'iron' });
  assert.equal(p.gesture.kind, 'trade');
  assert.equal(p.gesture.npcId, 'maja');
  assert.deepEqual(snapshot(w).players[p.id].gesture, p.gesture);
  p.input = { x: 1 };
  tick(w, 0.05);
  assert.equal(p.gesture, null);
  p.credits = 0;
  act(w, p.id, { type: 'buy', category: 'material', key: 'iron' });
  assert.equal(p.gesture, null);
  act(w, p.id, { type: 'gesture', kind: 'smoke' });
  assert.equal(p.gesture, null);
});

test('shop parking courts and entrance routes are connected, dry and clear of generated obstacles', () => {
  const shops = ['rusta', 'willys', 'oob', 'biltema', 'jula', 'plus'];
  for (const id of shops) {
    const lot = MAP.parking.find((p) => p.buildingId === id),
      entry = MAP.entrances.find((p) => p.buildingId === id);
    assert.ok(lot && entry, id);
    assert.ok(canStand(...entry.point), `${id} doorway approach`);
    assert.ok(canStand(...lot.entry), `${id} parking aisle`);
    assert.ok(
      MAP.roads.some((r) => r.buildingId === id && !r.pedestrian),
      `${id} driveway`,
    );
    for (const p of [...MAP.places, ...MAP.buildings])
      if (p.w && p.d)
        assert.ok(
          Math.abs(lot.x - p.x) >= (lot.w + p.w) / 2 || Math.abs(lot.z - p.z) >= (lot.d + p.d) / 2,
          `${id} parking overlaps ${p.id}`,
        );
    for (let x = lot.x - lot.w / 2 + 0.5; x < lot.x + lot.w / 2; x += 1)
      for (let z = lot.z - lot.d / 2 + 0.5; z < lot.z + lot.d / 2; z += 1)
        assert.ok(canStand(x, z), `${id} blocked parking`);
  }
  for (const entry of MAP.entrances) {
    assert.ok(entry.path.length >= 2);
    for (let i = 1; i < entry.path.length; i++) {
      const a = entry.path[i - 1],
        b = entry.path[i],
        steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let j = 0; j <= steps; j++)
        assert.ok(
          canStand(
            a[0] + ((b[0] - a[0]) * j) / (steps || 1),
            a[1] + ((b[1] - a[1]) * j) / (steps || 1),
          ),
          `${entry.buildingId} broken entrance route`,
        );
    }
  }
});
test('six weapon models retain finite animated parts, material batching and a clear scope aperture', async () => {
  const { weaponModel } = await import('../src/weapons.js'),
    T = await import('three');
  const lengths = [];
  for (const kind of ['rifle', 'shotgun', 'scout', 'pistol', 'smg', 'lmg']) {
    const gun = weaponModel(kind);
    gun.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(gun);
    lengths.push(box.max.z - box.min.z);
    assert.ok(gun.userData.geometries.length <= 12, `${kind} rigid geometry must be batched`);
    assert.ok(gun.userData.magazine.parent === gun);
    for (const key of ['supportGrip', 'rightGrip'])
      assert.ok(gun.userData[key].every(Number.isFinite));
    gun.traverse((o) => {
      if (o.isMesh)
        for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
    });
    if (kind === 'scout') {
      const ray = new T.Raycaster(
        new T.Vector3(0, gun.userData.sightY, 0.25),
        new T.Vector3(0, 0, -1),
        0,
        2,
      );
      assert.equal(
        ray.intersectObject(gun, true).length,
        0,
        'scope must see the world, not an opaque placeholder',
      );
    }
    gun.userData.geometries.forEach((g) => g.dispose());
  }
  assert.ok(lengths[3] < lengths[0] * 0.5, 'm/40 compact silhouette');
  assert.ok(lengths[2] > lengths[4] * 1.3, 'm/96 long rifle silhouette');
});
