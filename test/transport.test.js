import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import {
  TRANSPORT,
  railwayBridgeProfile,
  railwayDeckHeight,
  railwayExclusion,
} from '../shared/transport.js';
import {
  buildTransport,
  clipTransportSegment,
  trackSamples,
  transportPoint,
} from '../shared/transport-layout.js';
import { buildRailways } from '../src/railways.js';

test('transport uses an intact source snapshot and metre projection for the priority streets and factory tracks', () => {
  const raw = readFileSync(new URL('../data/avesta-transport-osm.json', import.meta.url)),
    source = JSON.parse(raw);
  assert.equal(createHash('sha256').update(raw).digest('hex'), TRANSPORT.sourceSnapshotSha256);
  assert.equal(TRANSPORT.scale, 1);
  for (const name of ['Industrigatan', 'Källhagsgatan', 'Myrgatan', 'Prästgatan'])
    assert.ok(
      TRANSPORT.roads.some((r) => r.name === name),
      `${name} source geometry missing`,
    );
  const sourceTrack = source.elements.find((e) => e.id === 1062865512),
    track = TRANSPORT.railways.find((r) => r.sourceId === 'way/1062865512');
  assert.equal(track.service, 'spur');
  assert.equal(track.gauge, 1.435);
  const expected = transportPoint(
    sourceTrack.geometry[0].lat,
    sourceTrack.geometry[0].lon,
    TRANSPORT.origin,
  );
  assert.deepEqual(track.points[0], expected);
  const p = transportPoint(TRANSPORT.origin.lat - 0.001, TRANSPORT.origin.lon, TRANSPORT.origin);
  assert.ok(Math.abs(p[1] - 111.32) < 0.00001);
  assert.ok(TRANSPORT.railways.some((r) => r.name === 'Dalabanan' && r.bridge));
  assert.ok(TRANSPORT.railways.some((r) => r.name === 'Godsstråket genom Bergslagen' && r.bridge));
});

test('clipping retains a track crossing the map with both ends outside, and never joins distant fragments', () => {
  assert.deepEqual(clipTransportSegment([-10, 0], [10, 0], 5), [
    [-5, 0],
    [5, 0],
  ]);
  const origin = { lat: 0, lon: 0 },
    geometry = [
      [-8, 0],
      [8, 0],
      [8, 8],
      [0, 8],
      [0, 0],
    ].map(([x, z]) => ({ lat: -z / 111320, lon: x / 111320 })),
    built = buildTransport(
      { elements: [{ type: 'way', id: 1, tags: { railway: 'rail' }, geometry }] },
      { origin, extent: 5 },
    );
  assert.equal(built.railways.length, 2);
  assert.deepEqual(built.railways[0].points, [
    [-5, 0],
    [5, 0],
  ]);
  assert.deepEqual(built.railways[1].points, [
    [0, 5],
    [0, 0],
  ]);
  for (const track of TRANSPORT.railways)
    for (const point of track.points)
      assert.ok(point.every((v) => Math.abs(v) <= TRANSPORT.extent + 1e-7));
});

test('abandoned cycle paths do not gain invented rails and underground tracks stay below the visible map', () => {
  const geometry = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.001 },
    ],
    source = {
      elements: [
        {
          type: 'way',
          id: 1,
          tags: { railway: 'abandoned', highway: 'cycleway', surface: 'asphalt' },
          geometry,
        },
        { type: 'way', id: 2, tags: { railway: 'rail', tunnel: 'yes', layer: '-1' }, geometry },
        { type: 'way', id: 3, tags: { railway: 'disused', gauge: '1435' }, geometry },
      ],
    },
    built = buildTransport(source, { origin: { lat: 0, lon: 0 } });
  assert.equal(built.roads.length, 1);
  assert.equal(built.roads[0].sourceId, 'way/1');
  assert.equal(built.railways.length, 1);
  assert.equal(built.railways[0].sourceId, 'way/3');
  assert.ok(!TRANSPORT.railways.some((r) => r.sourceId === 'way/132515280'));
  assert.ok(!TRANSPORT.railways.some((r) => r.sourceId === 'way/141434296'));
});

test('sleepers keep their metre spacing through a bend; a bridge deck follows a continuous bank-to-bank grade', () => {
  const track = {
      points: [
        [0, 0],
        [0, 1],
        [2, 1],
      ],
    },
    samples = trackSamples(track, 0.65);
  assert.deepEqual(
    samples.map((p) => Number(p.distance.toFixed(2))),
    [0, 0.65, 1.3, 1.95, 2.6],
  );
  assert.ok(Math.abs(samples[2].x - 0.3) < 1e-8);
  assert.equal(samples[2].z, 1);
  const bridge = railwayBridgeProfile(
    {
      points: [
        [0, 0],
        [5, 0],
        [10, 0],
      ],
    },
    (x) => (x === 0 ? 2 : x === 10 ? 4 : -20),
  );
  assert.ok(Math.abs(bridge.at(5) - 3.185) < 1e-8);
  assert.ok(Math.abs(bridge.at(10) - bridge.at(9.99)) < 0.003);
  const realBridge = TRANSPORT.railways.find((r) => r.bridge),
    [a, b] = realBridge.points;
  assert.equal(typeof railwayDeckHeight((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), 'number');
  const factoryTrack = TRANSPORT.railways.find((r) => r.sourceId === 'way/1062865512');
  assert.equal(railwayDeckHeight(...factoryTrack.points[0]), null);
  assert.ok(railwayExclusion(...factoryTrack.points[0]));
});

test('rail geometry is instanced and cell detail can disappear while the track bed stays visible', () => {
  const view = {
      scene: new THREE.Scene(),
      s: { gravel: new THREE.MeshStandardMaterial(), concrete: new THREE.MeshStandardMaterial() },
    },
    railways = [
      {
        id: 'test',
        points: [
          [0, 0],
          [0, 4],
        ],
        gauge: 1.435,
        status: 'rail',
        electrified: false,
      },
    ],
    rendered = buildRailways(view, { railways, heightAt: () => 2 });
  assert.equal(rendered.sleepers, 7);
  const instances = [];
  view.scene.traverse((object) => {
    if (object.isInstancedMesh) instances.push(object);
  });
  assert.ok(instances.length >= 2);
  const matrix = new THREE.Matrix4();
  for (const mesh of instances)
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      assert.ok(matrix.elements.every(Number.isFinite));
    }
  rendered.update({ x: 75, z: 75 }, 'low', true);
  assert.equal(view.scene.children[0].visible, true);
  assert.equal(view.scene.children[0].children.at(-1).visible, true);
  rendered.update({ x: 75, z: 300 }, 'low', true);
  assert.equal(view.scene.children[0].visible, true);
  assert.equal(view.scene.children[0].children.at(-1).visible, false);
});
