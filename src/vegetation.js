import { roadWidth } from '../shared/roads.js';
import { inParking } from '../shared/sites.js';
import * as THREE from 'three';
import { MAP, groundHeight, canStand, waterAt, segmentDistance, roadsNear } from '../shared/map.js';
import { foliageMaterial } from './atmosphere.js';
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
  let container = v.scene;
  const crownMap = new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}textures/pine-crown-v09.png`,
  );
  crownMap.colorSpace = THREE.SRGBColorSpace;
  crownMap.anisotropy = 4;
  const groups = [],
    materials = Array.from({ length: 4 }, (_, species) => {
      const mat =
        species === 0 || species === 3
          ? foliageMaterial('birch')
          : new THREE.MeshStandardMaterial({
              map: crownMap,
              alphaTest: 0.48,
              side: THREE.DoubleSide,
              roughness: 1,
            });
      mat.color.set(species === 3 ? '#dbc391' : '#e4edcf');
      mat.emissive.set('#324933');
      mat.emissiveIntensity = 0.12;
      return mat;
    }),
    cells = new Map();
  MAP.trees.forEach((p, i) => {
    const key = `${Math.floor(p.x / 160)},${Math.floor(p.z / 160)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push({ ...p, species: p.species ?? i % 4 });
  });
  const add = (m) => {
    m.castShadow = m.receiveShadow = true;
    m.computeBoundingSphere?.();
    container.add(m);
  };
  // Birch, spruce, Scots pine and smaller rowan: different crown heights and silhouettes.
  for (const list of cells.values()) {
    container = new THREE.Group();
    v.scene.add(container);
    const center = {
      x: list.reduce((s, p) => s + p.x, 0) / list.length,
      z: list.reduce((s, p) => s + p.z, 0) / list.length,
    };
    groups.push({ group: container, center });
    for (let species = 0; species < 4; species++) {
      const trees = list.filter((p) => p.species === species),
        broad = species === 0 || species === 3;
      if (!trees.length) continue;
      const trunks = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.24, 0.48, 1, 10),
        species === 0 ? v.s.birch : v.s.bark,
        trees.length,
      );
      const foliage = materials[species];
      const layers = species === 2 ? 8 : broad ? 6 : 10;
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
            offset = (species === 2 ? h * 0.06 : broad ? 0.7 : h * 0.025) * spread,
            tier = Math.floor(j / 2),
            cw =
              species === 2
                ? h * [0.32, 0.4, 0.3, 0.15][tier]
                : broad
                  ? h * 0.42
                  : h * (0.4 - tier * 0.065);
          const ch = broad ? h * 0.67 : cw / 1.5;
          set(
            leaves,
            i * layers + j,
            p.x + Math.sin(angle) * offset,
            y +
              (species === 2
                ? h * (0.65 + tier * 0.075)
                : broad
                  ? h * 0.65
                  : h * (0.3 + tier * 0.15)),
            p.z + Math.cos(angle) * offset,
            cw * spread,
            ch,
            1,
            angle,
          );
          leaves.setColorAt(
            i * layers + j,
            color.setHSL(broad ? 0.13 : 0.22, 0.08 + species * 0.015, 0.74 + (i % 5) * 0.025),
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
  }
  container = v.scene;
  const bushes = [];
  for (let i = 0; i < MAP.trees.length; i++) {
    const t = MAP.trees[i],
      x = t.x + Math.sin(i * 12.9) * 3,
      z = t.z + Math.cos(i * 7.7) * 3;
    if (
      i % 7 ||
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
  return {
    materials,
    update(camera, quality, software) {
      const range = software ? 260 : quality === 'low' ? 360 : quality === 'high' ? 850 : 580;
      for (const cell of groups)
        cell.group.visible = Math.hypot(camera.x - cell.center.x, camera.z - cell.center.z) < range;
      bush.visible = quality !== 'low' && !software;
    },
  };
}
