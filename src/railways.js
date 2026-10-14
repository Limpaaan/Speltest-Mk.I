import * as THREE from 'three';
import { TRANSPORT, railwayBridgeProfile } from '../shared/transport.js';
import { trackSamples } from '../shared/transport-layout.js';
import { terrainHeight } from '../shared/terrain.js';

// Real gauge, sleepers and contact wires use metres. Geometry is instanced by
// 150 m cells so the many tracks in the Krylbo and steelworks yards stay cheap.
export function buildRailways(
  view,
  { railways = TRANSPORT.railways, heightAt = terrainHeight } = {},
) {
  const cells = new Map(),
    dummy = new THREE.Object3D(),
    cube = new THREE.BoxGeometry(1, 1, 1),
    ballastMaterial = new THREE.MeshStandardMaterial({
      map: view.s.gravel.map,
      color: '#68665d',
      roughness: 1,
    }),
    railMaterial = new THREE.MeshStandardMaterial({
      color: '#7a7c7b',
      roughness: 0.42,
      metalness: 0.86,
    }),
    sleeperMaterial = new THREE.MeshStandardMaterial({ color: '#999488', roughness: 1 }),
    disusedMaterial = new THREE.MeshStandardMaterial({
      color: '#675144',
      roughness: 0.86,
      metalness: 0.36,
    }),
    poleMaterial = new THREE.MeshStandardMaterial({
      color: '#73786e',
      roughness: 0.7,
      metalness: 0.56,
    });
  const railShape = new THREE.Shape();
  // Foot, narrow web and rounded-size head: an I-shaped rail instead of a rod.
  railShape.moveTo(-0.07, 0);
  for (const [x, y] of [
    [0.07, 0],
    [0.07, 0.018],
    [0.014, 0.032],
    [0.014, 0.12],
    [0.035, 0.13],
    [0.035, 0.16],
    [-0.035, 0.16],
    [-0.035, 0.13],
    [-0.014, 0.12],
    [-0.014, 0.032],
    [-0.07, 0.018],
  ])
    railShape.lineTo(x, y);
  railShape.closePath();
  const railGeometry = new THREE.ExtrudeGeometry(railShape, { depth: 1, bevelEnabled: false });
  railGeometry.translate(0, 0, -0.5);
  const atCell = (x, z) => {
    const cx = Math.floor(x / 150),
      cz = Math.floor(z / 150),
      key = `${cx},${cz}`;
    if (!cells.has(key))
      cells.set(key, {
        center: { x: (cx + 0.5) * 150, z: (cz + 0.5) * 150 },
        ballast: [],
        rails: [],
        rusty: [],
        sleepers: [],
        poles: [],
        deck: [],
        wires: [],
      });
    return cells.get(key);
  };
  const box = (collection, x, y, z, w, h, d, yaw = 0, pitch = 0) =>
    collection.push({ x, y, z, w, h, d, yaw, pitch });
  const polePositions = new Set();
  let totalSleepers = 0;
  for (const track of railways) {
    if (track.status === 'construction') continue;
    const bridge = track.bridge ? railwayBridgeProfile(track) : null;
    const yAt = (x, z, distance) => (bridge ? bridge.at(distance) : heightAt(x, z) + 0.035);
    let travelled = 0;
    for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1],
        b = track.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      if (!length) continue;
      const steps = Math.ceil(length / 6),
        yaw = Math.atan2(dx, dz),
        rightX = dz / length,
        rightZ = -dx / length;
      for (let step = 0; step < steps; step++) {
        const t0 = step / steps,
          t1 = (step + 1) / steps,
          x0 = a[0] + dx * t0,
          z0 = a[1] + dz * t0,
          x1 = a[0] + dx * t1,
          z1 = a[1] + dz * t1,
          middle = (t0 + t1) / 2,
          x = a[0] + dx * middle,
          z = a[1] + dz * middle,
          distance = travelled + length * middle,
          y0 = yAt(x0, z0, travelled + length * t0),
          y1 = yAt(x1, z1, travelled + length * t1),
          y = (y0 + y1) / 2,
          horizontal = length / steps,
          pitch = -Math.atan2(y1 - y0, horizontal),
          sloped = Math.hypot(horizontal, y1 - y0),
          cell = atCell(x, z);
        const corners = [
          [
            x0 - rightX * 1.9,
            bridge ? y0 : heightAt(x0 - rightX * 1.9, z0 - rightZ * 1.9) + 0.015,
            z0 - rightZ * 1.9,
          ],
          [
            x0 + rightX * 1.9,
            bridge ? y0 : heightAt(x0 + rightX * 1.9, z0 + rightZ * 1.9) + 0.015,
            z0 + rightZ * 1.9,
          ],
          [
            x1 - rightX * 1.9,
            bridge ? y1 : heightAt(x1 - rightX * 1.9, z1 - rightZ * 1.9) + 0.015,
            z1 - rightZ * 1.9,
          ],
          [
            x1 + rightX * 1.9,
            bridge ? y1 : heightAt(x1 + rightX * 1.9, z1 + rightZ * 1.9) + 0.015,
            z1 + rightZ * 1.9,
          ],
        ];
        for (const corner of [0, 2, 1, 1, 2, 3]) cell.ballast.push(...corners[corner]);
        for (const side of [-1, 1]) {
          const offset = (side * (track.gauge + 0.07)) / 2;
          box(
            track.status === 'disused' ? cell.rusty : cell.rails,
            x + rightX * offset,
            y + 0.12,
            z + rightZ * offset,
            1,
            1,
            sloped + 0.025,
            yaw,
            pitch,
          );
        }
        if (bridge) {
          box(cell.deck, x, y - 0.24, z, 3.4, 0.48, sloped + 0.025, yaw, pitch);
          for (const side of [-1, 1]) {
            const bx = x + rightX * side * 1.66,
              bz = z + rightZ * side * 1.66;
            box(cell.poles, bx, y + 0.63, bz, 0.07, 1.26, 0.07);
            box(cell.poles, bx, y + 1.16, bz, 0.07, 0.07, sloped + 0.1, yaw, pitch);
            box(cell.poles, bx, y + 0.63, bz, 0.07, 0.07, sloped + 0.1, yaw, pitch);
          }
        }
        if (track.electrified) cell.wires.push(x0, y0 + 5.65, z0, x1, y1 + 5.65, z1);
      }
      travelled += length;
    }
    for (const p of trackSamples(track, 0.65)) {
      const y = yAt(p.x, p.z, p.distance),
        cell = atCell(p.x, p.z);
      box(cell.sleepers, p.x, y + 0.075, p.z, 2.6, 0.15, 0.24, p.yaw);
      totalSleepers++;
    }
    if (track.bridge) {
      for (const p of trackSamples(track, 24)) {
        const deck = bridge.at(p.distance),
          ground = terrainHeight(p.x, p.z),
          height = deck - 0.48 - ground;
        if (height > 1.2)
          box(atCell(p.x, p.z).deck, p.x, ground + height / 2, p.z, 1.25, height, 1.9, p.yaw);
      }
    }
    if (track.electrified) {
      for (const p of trackSamples(track, 48)) {
        const x = p.x + Math.cos(p.yaw) * 2.9,
          z = p.z - Math.sin(p.yaw) * 2.9,
          key = `${Math.round(x / 2)},${Math.round(z / 2)}`;
        if (polePositions.has(key)) continue;
        polePositions.add(key);
        const y = yAt(x, z, p.distance),
          cell = atCell(x, z);
        box(cell.poles, x, y + 3.6, z, 0.17, 7.2, 0.17);
        box(
          cell.poles,
          x - Math.cos(p.yaw) * 1.5,
          y + 6.15,
          z + Math.sin(p.yaw) * 1.5,
          3.25,
          0.09,
          0.09,
          p.yaw,
        );
      }
    }
  }
  const instance = (items, geo, material) => {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geo, material, items.length);
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      dummy.scale.set(p.w, p.h, p.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    mesh.castShadow = material === poleMaterial;
    return mesh;
  };
  const groups = [];
  for (const cell of cells.values()) {
    const group = new THREE.Group(),
      detail = new THREE.Group();
    const ballast = new THREE.BufferGeometry();
    ballast.setAttribute('position', new THREE.Float32BufferAttribute(cell.ballast, 3));
    ballast.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        cell.ballast.flatMap((v, i) => (i % 3 === 1 ? [] : [v / 1.4])),
        2,
      ),
    );
    ballast.computeVertexNormals();
    const bed = new THREE.Mesh(ballast, ballastMaterial);
    bed.receiveShadow = true;
    group.add(bed);
    for (const mesh of [
      instance(cell.rails, railGeometry, railMaterial),
      instance(cell.rusty, railGeometry, disusedMaterial),
      instance(cell.deck, cube, view.s.concrete),
    ])
      if (mesh) group.add(mesh);
    for (const mesh of [
      instance(cell.sleepers, cube, sleeperMaterial),
      instance(cell.poles, cube, poleMaterial),
    ])
      if (mesh) detail.add(mesh);
    if (cell.wires.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(cell.wires, 3));
      detail.add(
        new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#444a46' })),
      );
    }
    group.add(detail);
    view.scene.add(group);
    groups.push({ group, detail, center: cell.center });
  }
  return {
    count: railways.length,
    sleepers: totalSleepers,
    update(camera, quality, software) {
      const range = software ? 480 : quality === 'low' ? 650 : quality === 'high' ? 1100 : 850,
        detailRange = software ? 150 : quality === 'low' ? 230 : quality === 'high' ? 460 : 340;
      for (const cell of groups) {
        const distance = Math.hypot(camera.x - cell.center.x, camera.z - cell.center.z);
        cell.group.visible = distance < range;
        cell.detail.visible = distance < detailRange;
      }
    },
  };
}
