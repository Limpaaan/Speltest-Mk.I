import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildAalto } from '../src/landmarks.js';
import {
  AALTO,
  AALTO_SCALE,
  AALTO_FLOOR,
  AALTO_WALLS,
  AALTO_FURNITURE,
  INTERIOR_CACHES,
  aaltoWorld,
  aaltoLocal,
  aaltoRamp,
  inAalto,
} from '../shared/interiors.js';
import { terrainHeight } from '../shared/terrain.js';
import { buildingBounds } from '../shared/buildings.js';

test('Aalto room coordinates follow its mapped footprint and yaw while furniture stays metre sized', () => {
  for (const [x, z] of [
    [-12, -7],
    [12, 7],
    [18, 3.5],
    [-7, -4],
  ]) {
    const q = aaltoWorld(x, z),
      local = aaltoLocal(q.x, q.z);
    assert.ok(Math.abs(local.x - x) < 1e-9);
    assert.ok(Math.abs(local.z - z) < 1e-9);
  }
  assert.equal(AALTO_FURNITURE.find((p) => p.type === 'desk').w, 3);
  assert.equal(AALTO_FURNITURE.find((p) => p.type === 'desk').d, 0.8);
  for (const p of INTERIOR_CACHES) assert.ok(inAalto(p.x, p.z));
  for (const [x, z] of [
    [-12, -7],
    [12, 7],
    [0, 0],
  ]) {
    const q = aaltoWorld(x, z);
    assert.ok(AALTO_FLOOR >= terrainHeight(q.x, q.z) + 0.299);
  }
  const upper = aaltoWorld(12, 3.5),
    lower = aaltoWorld(18, 3.5);
  assert.ok(Math.abs(aaltoRamp(upper.x, upper.z) - AALTO_FLOOR) < 1e-8);
  assert.ok(Math.abs(aaltoRamp(lower.x, lower.z) - terrainHeight(lower.x, lower.z)) < 1e-8);
  const outside = aaltoWorld(15, -3);
  assert.equal(aaltoRamp(outside.x, outside.z), null);
});

test('Aalto visual walls agree with authoritative collision and furniture bypasses architectural scaling', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ clearRect() {}, fillText() {} }),
    }),
  };
  const rotation = new THREE.Matrix4()
    .makeTranslation(AALTO.x, 0, AALTO.z)
    .multiply(new THREE.Matrix4().makeRotationY(AALTO.yaw || 0))
    .multiply(new THREE.Matrix4().makeScale(AALTO_SCALE.x, 1, AALTO_SCALE.z))
    .multiply(new THREE.Matrix4().makeTranslation(-AALTO.x, 0, -AALTO.z));
  const boxes = [],
    ramps = [];
  const view = {
    siteRotation: rotation,
    s: new Proxy({}, { get: (_, name) => name }),
    sign() {},
    box(x, y, z, w, h, d, material, yaw = 0) {
      const geometry = new THREE.BoxGeometry(w, h, d);
      geometry.rotateY(yaw);
      geometry.translate(x, y + AALTO_FLOOR, z);
      if (this.siteRotation) geometry.applyMatrix4(this.siteRotation);
      geometry.computeBoundingBox();
      boxes.push({
        x,
        z,
        w,
        h,
        d,
        bounds: geometry.boundingBox.clone(),
        transformed: Boolean(this.siteRotation),
      });
      geometry.dispose();
    },
    static(geometry, material, x, y, z) {
      if (geometry.attributes.position.count !== 576) return;
      const copy = geometry.clone();
      copy.translate(x, y + AALTO_FLOOR, z);
      if (this.siteRotation) copy.applyMatrix4(this.siteRotation);
      ramps.push(copy);
    },
  };
  try {
    buildAalto(view, AALTO);
    for (const wall of AALTO_WALLS) {
      const proto = wall.prototype;
      const visible = boxes.find(
        (b) =>
          b.transformed &&
          b.h === 3.3 &&
          Math.abs(b.x - AALTO.x - proto.x) < 1e-8 &&
          Math.abs(b.z - AALTO.z - proto.z) < 1e-8,
      );
      assert.ok(visible, wall.id);
      const bounds = buildingBounds(wall),
        center = visible.bounds.getCenter(new THREE.Vector3());
      const size = visible.bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(center.x - bounds.x) < 1e-4, wall.id);
      assert.ok(Math.abs(center.z - bounds.z) < 1e-4, wall.id);
      assert.ok(Math.abs(size.x - bounds.w) < 1e-4, wall.id);
      assert.ok(Math.abs(size.z - bounds.d) < 1e-4, wall.id);
    }
    const desk = AALTO_FURNITURE.find((p) => p.type === 'desk');
    const tabletop = boxes.find((b) => !b.transformed && b.w === 3 && b.h === 0.08);
    assert.ok(tabletop);
    const center = tabletop.bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(center.x - desk.x) < 1e-4);
    assert.ok(Math.abs(center.z - desk.z) < 1e-4);
    assert.equal(view.siteRotation, rotation);
    assert.equal(ramps.length, 1);
    const vertices = ramps[0].attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const height = aaltoRamp(vertices.getX(i), vertices.getZ(i));
      assert.ok(height !== null);
      assert.ok(Math.abs(vertices.getY(i) - height - 0.01) < 1e-4);
    }
  } finally {
    ramps.forEach((g) => g.dispose());
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
