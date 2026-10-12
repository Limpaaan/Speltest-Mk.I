import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { smoothSurface, terrain, surfaceElevations } from '../shared/terrain.js';
import { MAP, HUB, canStand, inSanctuary, groundHeight, raycastWorld } from '../shared/map.js';
import { NPCS, CAMP } from '../shared/progression.js';
import { ICON_PATHS } from '../src/icons.js';
import { MATERIALS, ATTACHMENTS, SUPPLY_RECIPES } from '../shared/items.js';
import { transcriptSegments } from '../src/transcript.js';
import { findPath, walkableSegment } from '../shared/navigation.js';
import { architectureSpec, architectureVolumes } from '../shared/architecture.js';
import {
  buildingContains,
  buildingWorld,
  spatialIndex,
  buildingBounds,
} from '../shared/buildings.js';
import { city } from '../shared/city-layout.js';
import { ENCOUNTER_ZONES } from '../shared/encounters.js';
import { createWorld, tick } from '../shared/game.js';
import { CameraTrack } from '../src/camera-track.js';
import { RenderBudget } from '../src/render-budget.js';
import { weaponWave, GUN_SOUNDS } from '../src/audio.js';
import { SPEECH, VOICE_PROFILES } from '../shared/speech.js';
import { normalizeSettings } from '../src/settings.js';

test('terrain filtering removes local DSM peaks, preserves broad slopes and leaves source data intact', () => {
  const plane = Array.from({ length: 81 }, (_, i) => Math.floor(i / 9) * 2 + (i % 9));
  const filtered = smoothSurface(plane, 9, 9);
  assert.equal(filtered[40], plane[40]);
  const peak = Array(81).fill(0);
  peak[40] = 20;
  assert.ok(smoothSurface(peak, 9, 9)[40] < 4);
  assert.equal(peak[40], 20);
  assert.notDeepEqual(Array.from(surfaceElevations), terrain.elevationsMetres);
});
test('camera interpolates server movement between ticks, clears on respawn and stays above the surface', () => {
  const camera = new CameraTrack();
  camera.follow('one', { x: 0, y: 10, z: 0 }, 1 / 60);
  const mid = camera.follow('one', { x: 0.3, y: 10.2, z: 0 }, 1 / 60);
  assert.ok(mid.x > 0 && mid.x < 0.3);
  assert.ok(mid.y > 10 && mid.y < 10.2);
  const previousX = mid.x;
  const next = camera.follow('one', { x: 0.3, y: 10.2, z: 0 }, 1 / 60);
  assert.ok(next.x > previousX);
  assert.equal(camera.follow('one', { x: 30, y: 10, z: 0 }, 1 / 60).x, 30);
  assert.equal(camera.follow('two', { x: 2, y: 5, z: 3 }, 1 / 60).x, 2);
  camera.reset();
  assert.equal(camera.follow('one', { x: 0, y: 0, z: 0 }, 1 / 60).x, 0);
});
test('mapped city records retain dated source hashes and rotated footprints for collision', () => {
  assert.equal(
    city.sourceSha256,
    createHash('sha256')
      .update(readFileSync(new URL('../data/avesta-buildings-osm.json', import.meta.url)))
      .digest('hex'),
  );
  assert.equal(city.landmarks.length, 8);
  for (const id of [
    'stadshuset',
    'myntmuseet',
    'gamla-vattentornet',
    'nya-vattentornet',
    'avesta-lasarett',
    'avesta-ishall',
    'avesta-busstation',
    'krylbo-station',
  ])
    assert.ok(MAP.places.some((p) => p.id === id && p.sourceId && p.verified));
  const b = { id: 'rotated', x: 4, z: 5, w: 12, d: 2, yaw: Math.PI / 4 };
  const q = buildingWorld(b, 5, 0);
  assert.ok(buildingContains(b, q.x, q.z));
  assert.ok(!buildingContains(b, 4, 10));
  const index = spatialIndex([b], (p) => buildingBounds(p, 0.35));
  assert.deepEqual(index.point(q.x, q.z), [b]);
  const actual = MAP.buildings.find(
    (p) => p.w > 5 && Math.abs(p.yaw) > 0.2 && Math.abs(p.yaw) < 2.9,
  );
  const hit = raycastWorld(
    { x: actual.x, y: groundHeight(actual.x, actual.z) + actual.h + 12, z: actual.z },
    { x: 0, y: -1, z: 0 },
    30,
  );
  assert.equal(hit.id, actual.id);
  assert.equal(canStand(actual.x, actual.z), false);
});
test('guards spawn in five distinct zones and patrol within their assigned home radius', () => {
  const w = createWorld({ random: () => 0.5 });
  assert.equal(w.enemies.filter((e) => e.type !== 'boss').length, 34);
  for (const zone of ENCOUNTER_ZONES) {
    const guards = w.enemies.filter((e) => e.zoneId === zone.id);
    assert.equal(guards.length, zone.count);
    assert.ok(
      guards.every(
        (e) => canStand(e.x, e.z) && Math.hypot(e.x - zone.x, e.z - zone.z) <= zone.radius,
      ),
    );
  }
  for (let i = 0; i < 200; i++) tick(w, 0.05);
  for (const e of w.enemies.filter((e) => e.zoneId))
    assert.ok(Math.hypot(e.x - e.homeX, e.z - e.homeZ) <= e.leash + 0.01);
});
test('six weapons have distinct bounded sound waveforms with audible energy', () => {
  const hashes = [];
  for (const kind of Object.keys(GUN_SOUNDS)) {
    const wave = weaponWave(kind, 22050);
    assert.ok(wave.every((x) => Number.isFinite(x) && Math.abs(x) < 1));
    assert.ok(wave.reduce((sum, x) => sum + x * x, 0) / wave.length > 0.001);
    hashes.push(createHash('sha256').update(new Uint8Array(wave.buffer)).digest('hex'));
  }
  assert.equal(new Set(hashes).size, 6);
});
test('all 41 original dialogue recordings exist, with separate character voice profiles', () => {
  assert.equal(SPEECH.length, 41);
  for (const line of SPEECH) {
    assert.ok(VOICE_PROFILES[line.profile]);
    assert.ok(line.text.length > 15);
    assert.ok(statSync(new URL('../public/audio/' + line.file, import.meta.url)).size > 1000);
  }
  const profiles = Object.values(VOICE_PROFILES).map((p) => `${p.voice}:${p.rate}:${p.pitch}`);
  assert.equal(new Set(profiles).size, profiles.length);
  const timings = JSON.parse(
    readFileSync(new URL('../public/audio/timings.json', import.meta.url)),
  );
  for (const line of SPEECH) {
    const cues = timings[line.id];
    assert.ok(cues.length > 2);
    assert.equal(
      transcriptSegments(line.text, cues)
        .map((s) => s.text)
        .join(''),
      line.text,
    );
    for (let i = 0; i < cues.length; i++)
      assert.ok(cues[i].end >= cues[i].start && (i === 0 || cues[i].start >= cues[i - 1].start));
  }
});
test('all friendly services sit in the protected courtyard with clear approaches and guards', () => {
  assert.equal(HUB.stations.length, 5);
  assert.equal(HUB.guards.length, 2);
  for (const npc of [CAMP, ...NPCS]) {
    assert.ok(inSanctuary(npc));
    assert.ok(canStand(npc.x, npc.z));
    const station = HUB.stations.find((n) => n.name === npc.name.split(' ')[0]);
    assert.ok(station);
    assert.ok(Math.hypot(npc.x - station.x, npc.z - station.z) < 1);
    const path = findPath(MAP.spawn, npc);
    assert.ok(path.length > 0);
    let previous = MAP.spawn;
    for (const next of path) {
      assert.ok(walkableSegment(previous, next, canStand));
      previous = next;
    }
  }
  for (const guard of HUB.guards) assert.ok(canStand(guard.x, guard.z) && inSanctuary(guard));
  assert.ok(MAP.cover.filter((p) => p.hub).length >= 2);
});
test('every weapon, material, attachment and supply has its own labelled SVG silhouette', () => {
  const keys = [
    ...new Set([
      ...Object.keys(GUN_SOUNDS),
      ...Object.keys(MATERIALS),
      ...Object.keys(ATTACHMENTS),
      ...Object.keys(SUPPLY_RECIPES),
    ]),
  ];
  for (const key of keys) assert.ok(ICON_PATHS[key], key);
  assert.equal(new Set(keys.map((k) => ICON_PATHS[k])).size, keys.length);
});
test('GPU resolution reacts to sustained load, recovers gently and ignores pauses and isolated stalls', () => {
  const budget = new RenderBudget();
  budget.update(0.5, true);
  assert.equal(budget.scale, 1);
  for (let i = 0; i < 30; i++) budget.update(1 / 30, true);
  assert.equal(budget.scale, 1);
  for (let i = 0; i < 40; i++) budget.update(1 / 30, true);
  assert.ok(budget.scale < 1);
  for (let i = 0; i < 1000; i++) budget.update(1 / 30, true);
  assert.equal(budget.scale, 0.7);
  for (let i = 0; i < 200; i++) budget.update(1 / 60, true);
  assert.ok(budget.scale > 0.7);
  assert.equal(budget.update(1 / 60, false), 1);
  budget.reset();
  assert.equal(budget.scale, 1);
  const settings = normalizeSettings({
    gpuPerformance: true,
    masterVolume: 2,
    voiceVolume: -1,
    voicesEnabled: false,
  });
  assert.equal(settings.gpuPerformance, true);
  assert.equal(settings.masterVolume, 1);
  assert.equal(settings.voiceVolume, 0);
  assert.equal(settings.voicesEnabled, false);
});
test('first person weapons retain higher geometry detail than remote weapons and 1024px material maps', async () => {
  const { weaponModel } = await import('../src/weapons.js');
  for (const kind of Object.keys(GUN_SOUNDS)) {
    const hero = weaponModel(kind),
      remote = weaponModel(kind, undefined, undefined, {}, 'world');
    const count = (g) =>
      g.userData.geometries.reduce((n, geo) => n + geo.attributes.position.count, 0);
    assert.ok(count(hero) > count(remote), kind);
    assert.ok(hero.userData.geometries.length <= 12);
    let maps = 0;
    hero.traverse((o) => {
      if (o.material?.map) {
        assert.equal(o.material.map.image.width, 1024);
        maps++;
      }
    });
    assert.ok(maps > 0);
    hero.userData.geometries.forEach((g) => g.dispose());
    remote.userData.geometries.forEach((g) => g.dispose());
  }
});
test('k-pist ventilations are actual openings with outward-facing metal between holes', async () => {
  const { weaponModel } = await import('../src/weapons.js'),
    T = await import('three');
  const gun = weaponModel('smg');
  gun.updateMatrixWorld(true);
  const hit = (z) =>
    new T.Raycaster(new T.Vector3(0.2, 0, z), new T.Vector3(-1, 0, 0)).intersectObject(
      gun,
      true,
    )[0];
  assert.ok(Math.abs(hit(-0.2 - 0.24 * 0.13).point.x) < 0.03, 'open hole reveals the inner barrel');
  assert.ok(hit(-0.2 - 0.24 * 0.22).point.x > 0.045, 'between openings the shroud faces outwards');
  gun.userData.geometries.forEach((g) => g.dispose());
});
test('Street View landmark towers and raised station hall are part of authoritative shot cover', () => {
  for (const id of ['avesta-kyrka', 'krylbo-station']) {
    const p = MAP.places.find((p) => p.id === id),
      a = architectureSpec(p),
      tower = architectureVolumes(p).find((v) => v.id.endsWith('-tower'));
    const base = groundHeight(p.x, p.z);
    const hit = raycastWorld(
      { x: tower.x, y: base + tower.h + 5, z: tower.z },
      { x: 0, y: -1, z: 0 },
      10,
    );
    assert.equal(hit.id, tower.id);
    assert.ok(Math.abs(hit.y - base - tower.h) < 0.001);
    assert.equal(p.h, a.body);
  }
});
