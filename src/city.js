import * as THREE from 'three';
import { MAP, groundHeight } from '../shared/map.js';
import { buildingWorld } from '../shared/buildings.js';
export function buildCity(view) {
  const cells = new Map(),
    dummy = new THREE.Object3D(),
    color = new THREE.Color();
  for (const p of MAP.buildings) {
    const key = `${Math.floor(p.x / 100)},${Math.floor(p.z / 100)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }
  const walls = new THREE.MeshStandardMaterial({ map: view.s.ivory.map, roughness: 0.95 });
  const roof = view.s.roof.clone();
  roof.color.set('#b4b1a7');
  const glass = new THREE.MeshStandardMaterial({
    color: '#33454a',
    roughness: 0.5,
    metalness: 0.05,
  });
  const palette = ['#c1b69e', '#cbbd96', '#a89c8b', '#b4ac9c', '#b5aaa0', '#a16b56'];
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0, 0.5);
  shape.lineTo(0.5, 0);
  shape.closePath();
  const gable = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  gable.translate(0, 0, -0.5);
  const groups = [];
  const instance = (geo, mat, items) => {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.yaw || 0, 0);
      dummy.scale.set(p.w, p.h, p.d || 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (p.color) mesh.setColorAt(i, color.set(p.color));
    });
    mesh.castShadow = mat !== glass;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  };
  for (const buildings of cells.values()) {
    const body = [],
      flat = [],
      pitched = [],
      windows = [];
    for (const p of buildings) {
      const base = groundHeight(p.x, p.z),
        bottom =
          Math.min(
            base,
            ...[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz) => {
                const q = buildingWorld(p, (sx * p.w) / 2, (sz * p.d) / 2);
                return groundHeight(q.x, q.z);
              }),
            ),
          ) - 0.3,
        tone = palette[Number(p.sourceId.split('/')[1]) % palette.length];
      body.push({
        ...p,
        y: (base + p.h + bottom) / 2,
        h: base + p.h - bottom,
        color: p.type === 'warehouse' ? '#9b9487' : tone,
      });
      if (p.type === 'cottage')
        pitched.push({
          ...p,
          y: base + p.h,
          yaw: (p.yaw || 0) + Math.PI / 2,
          w: p.d + 0.25,
          d: p.w + 0.25,
          h: 1.6,
          color: '#8b7768',
        });
      else flat.push({ ...p, y: base + p.h + 0.1, w: p.w + 0.2, d: p.d + 0.2, h: 0.2 });
      for (const side of [-1, 1])
        for (let y = 1.6; y < p.h - 0.4; y += 2.4)
          for (let x = -p.w / 2 + 0.8; x < p.w / 2 - 0.5; x += 2.1) {
            const q = buildingWorld(p, x, side * (p.d / 2 + 0.018));
            windows.push({
              ...q,
              y: base + y,
              w: 0.65,
              h: 0.95,
              d: 1,
              yaw: (p.yaw || 0) + (side < 0 ? Math.PI : 0),
            });
          }
    }
    const group = new THREE.Group(),
      detail = new THREE.Group();
    for (const mesh of [
      instance(view.boxGeo, walls, body),
      instance(view.boxGeo, roof, flat),
      instance(gable, roof, pitched),
    ])
      if (mesh) group.add(mesh);
    const pane = instance(new THREE.PlaneGeometry(1, 1), glass, windows);
    if (pane) detail.add(pane);
    group.add(detail);
    view.scene.add(group);
    const center = {
      x: buildings.reduce((n, p) => n + p.x, 0) / buildings.length,
      z: buildings.reduce((n, p) => n + p.z, 0) / buildings.length,
    };
    groups.push({ group, detail, center });
  }
  return {
    update(camera, quality, software) {
      const range = software ? 230 : quality === 'low' ? 300 : quality === 'high' ? 580 : 440;
      for (const cell of groups) {
        const distance = Math.hypot(camera.x - cell.center.x, camera.z - cell.center.z);
        cell.group.visible = distance < range;
        cell.detail.visible = distance < (software ? 70 : quality === 'low' ? 100 : 190);
      }
    },
    count: MAP.buildings.length,
  };
}
export function cityLandmark(view, p) {
  const s = view.s,
    box = (x, y, z, w, h, d, mat) => view.box(p.x + x, y, p.z + z, w, h, d, mat);
  if (p.type === 'watertower') {
    const radius = Math.min(p.w, p.d) * 0.42;
    const shaft = new THREE.CylinderGeometry(radius * 0.8, radius, p.h * 0.75, 20);
    view.static(shaft, s.brick, p.x, p.h * 0.375, p.z);
    shaft.dispose();
    const tank = new THREE.CylinderGeometry(radius * 1.12, radius, p.h * 0.25, 20);
    view.static(tank, s.ivory, p.x, p.h * 0.875, p.z);
    tank.dispose();
    const roof = new THREE.ConeGeometry(radius * 1.18, 1.5, 20);
    view.static(roof, s.roof, p.x, p.h + 0.75, p.z);
    roof.dispose();
    for (let y = 2; y < p.h; y += 3) box(0, y, radius * 1.03, 0.45, 1.2, 0.03, s.glass);
  } else {
    const yellow = s.civic || (s.civic = s.ivory.clone());
    yellow.color.set('#d1b471');
    const mat =
      p.type === 'townhall' || p.type === 'station'
        ? yellow
        : p.type === 'museum'
          ? s.plaster
          : p.type === 'hospital'
            ? s.ivory
            : s.brick;
    box(0, p.h / 2, 0, p.w, p.h, p.d, mat);
    box(0, p.h + 0.15, 0, p.w + 0.3, 0.3, p.d + 0.3, s.roof);
    for (const side of [-1, 1])
      for (let y = 1.5; y < p.h; y += 2.4)
        for (let x = -p.w / 2 + 0.8; x < p.w / 2 - 0.4; x += 2.2) {
          box(x, y, side * (p.d / 2 + 0.03), 0.95, 1.3, 0.07, s.plaster);
          box(x, y, side * (p.d / 2 + 0.08), 0.72, 1.05, 0.035, s.glass);
        }
    box(0, 1.1, p.d / 2 + 0.08, 1.15, 2.2, 0.1, s.wood);
    if (['townhall', 'station', 'museum'].includes(p.type)) {
      const shape = new THREE.Shape();
      shape.moveTo(-p.w / 2 - 0.2, 0);
      shape.lineTo(0, 1.9);
      shape.lineTo(p.w / 2 + 0.2, 0);
      shape.closePath();
      const roof = new THREE.ExtrudeGeometry(shape, { depth: p.d + 0.4, bevelEnabled: false });
      view.static(roof, s.roof, p.x, p.h, p.z - p.d / 2 - 0.2);
      roof.dispose();
    }
    if (p.type === 'hospital') {
      box(0, p.h - 0.8, p.d / 2 + 0.14, 0.18, 1.4, 0.1, s.ivory);
      box(0, p.h - 0.8, p.d / 2 + 0.16, 1.2, 0.18, 0.1, s.ivory);
    }
  }
  view.sign(p.name, p.x, Math.min(3.2, p.h - 0.4), p.z + p.d / 2 + 0.22, Math.min(7, p.w + 1));
}
