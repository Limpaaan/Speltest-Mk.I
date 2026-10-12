import { roadWidth } from '../shared/roads.js';
import { inParking } from '../shared/sites.js';
import * as THREE from 'three';
import { MAP, groundHeight, canStand, waterAt, segmentDistance, roadsNear } from '../shared/map.js';
import { foliageMaterial } from './atmosphere.js';
import { spruceMaterial } from './surfaces.js';
export function buildVegetation(v) {
  const dummy = new THREE.Object3D(),
    color = new THREE.Color();
  const set = (mesh, i, x, y, z, sx, sy, sz, yaw = 0) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  const add = (m) => {
    m.castShadow = m.receiveShadow = true;
    v.scene.add(m);
  };
  // Birch, spruce, Scots pine and smaller rowan: different crown heights and silhouettes.
  for (let species = 0; species < 4; species++) {
    const trees = MAP.trees.filter((p, i) => i % 4 === species),
      broad = species === 0 || species === 3;
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.24, 0.48, 1, 10),
      species === 0 ? v.s.birch : v.s.bark,
      trees.length,
    );
    const foliage = broad ? foliageMaterial('birch') : spruceMaterial();
    if (species === 3) foliage.color.set('#c08a51');
    const layers = species === 2 ? 6 : broad ? 6 : 4;
    const leaves = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      foliage,
      trees.length * layers,
    );
    const branches = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.025, 0.08, 1, 6),
      v.s.bark,
      trees.length * 3,
    );
    trees.forEach((p, i) => {
      const y = groundHeight(p.x, p.z),
        h = p.h * (species === 3 ? 0.77 : 1),
        spread = 0.85 + ((i * 17) % 13) / 25;
      set(trunks, i, p.x, y + h * 0.46, p.z, 1, h * 0.92, 1);
      for (let j = 0; j < layers; j++) {
        const angle = i * 2.4 + j * 2.399,
          offset = (species === 2 ? 1.2 : broad ? 0.7 : 0) * spread;
        const ch = species === 2 ? h * 0.36 : broad ? h * 0.67 : h * 0.94;
        set(
          leaves,
          i * layers + j,
          p.x + Math.sin(angle) * offset,
          y + (species === 2 ? h * 0.79 : broad ? h * 0.65 : h * 0.5),
          p.z + Math.cos(angle) * offset,
          h * (species === 2 ? 0.32 : broad ? 0.42 : 0.42) * spread,
          ch,
          1,
          angle,
        );
        leaves.setColorAt(
          i * layers + j,
          color.setHSL(broad ? 0.13 : 0.22, 0.2 + species * 0.035, 0.65 + (i % 5) * 0.045),
        );
      }
      for (let j = 0; j < 3; j++) {
        dummy.position.set(p.x, y + h * (0.48 + j * 0.13), p.z);
        dummy.scale.set(1, h * 0.22, 1);
        dummy.rotation.set(Math.sin(i + j) * 0.7, i + j * 2.1, 1.0);
        dummy.updateMatrix();
        branches.setMatrixAt(i * 3 + j, dummy.matrix);
      }
    });
    add(trunks);
    add(leaves);
    add(branches);
  }
  const bushes = [];
  for (let i = 0; i < MAP.trees.length; i++) {
    const t = MAP.trees[i],
      x = t.x + Math.sin(i * 12.9) * 3,
      z = t.z + Math.cos(i * 7.7) * 3;
    if (
      i % 3 ||
      !canStand(x, z) ||
      inParking(MAP.parking, x, z, 1) ||
      waterAt(x, z) ||
      roadsNear(x, z).some((r) => segmentDistance(x, z, ...r.points) < roadWidth(r) / 2 + 2)
    )
      continue;
    bushes.push({ x, z, h: 0.45 + (i % 7) * 0.07 });
  }
  const bush = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    foliageMaterial('birch'),
    bushes.length * 4,
  );
  bushes.forEach((p, i) => {
    for (let j = 0; j < 4; j++)
      set(
        bush,
        i * 4 + j,
        p.x + Math.sin(j * 2.4) * 0.23,
        groundHeight(p.x, p.z) + p.h * 0.46,
        p.z + Math.cos(j * 2.4) * 0.23,
        p.h * 1.8,
        p.h,
        1,
        i + (j * Math.PI) / 4,
      );
  });
  add(bush);
  v.bushes = bush;
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    v.s.concrete,
    MAP.rocks.length,
  );
  MAP.rocks.forEach((p, i) =>
    set(rocks, i, p.x, groundHeight(p.x, p.z) + p.h * 0.4, p.z, p.radius, p.h * 0.6, p.radius, i),
  );
  add(rocks);
}
