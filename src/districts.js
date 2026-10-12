import * as THREE from 'three';
import { MAP, groundHeight, waterAt, canStand } from '../shared/map.js';
// Original models: typology and spatial character from the user's references;
// the new facades remain interpretations until street-level references are available.
export function districtBuilding(v, p) {
  const s = v.s,
    historic = p.type === 'historic',
    church = p.type === 'church',
    power = p.type === 'powerstation',
    retail = p.type === 'retail' || p.type === 'diner';
  const red = s.falu || (s.falu = s.wood.clone());
  red.color.set('#ad5040');
  const mat = historic ? red : church ? s.plaster : retail ? s.ivory : s.brick;
  v.box(p.x, -0.6, p.z, p.w + 0.45, 1.2, p.d + 0.45, s.slagStone);
  v.box(p.x, p.h / 2, p.z, p.w, p.h, p.d, mat);
  const pitched = historic || church || power || p.type === 'diner' || p.gabled;
  if (pitched) {
    const shape = new THREE.Shape();
    shape.moveTo(-p.w / 2 - 0.25, 0);
    shape.lineTo(0, church ? 4 : 1.9);
    shape.lineTo(p.w / 2 + 0.25, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: p.d + 0.5, bevelEnabled: false });
    v.static(g, historic ? s.rust : s.roof, p.x, p.h, p.z - p.d / 2 - 0.25);
    g.dispose();
  } else {
    v.box(p.x, p.h + 0.15, p.z, p.w + 0.5, 0.3, p.d + 0.5, s.roof);
    for (let x = -p.w / 2; x < p.w / 2; x += 6)
      v.box(p.x + x + 1, p.h + 0.6, p.z, 1.7, 0.85, 2.2, s.zinc);
  }
  const pane = historic ? 0.7 : church ? 0.95 : 1.6;
  for (const side of [-1, 1])
    for (let dx = -p.w / 2 + 1.5; dx < p.w / 2 - 1; dx += historic ? 2.3 : 3.4) {
      const height = church ? 3 : historic ? 1 : 2.1,
        y = historic ? 1.9 : p.h * 0.56;
      v.box(
        p.x + dx,
        y,
        p.z + side * (p.d / 2 + 0.035),
        pane + 0.14,
        height + 0.14,
        0.075,
        s.ivory,
      );
      v.box(p.x + dx, y, p.z + side * (p.d / 2 + 0.08), pane, height, 0.04, s.glass);
      v.box(p.x + dx, y, p.z + side * (p.d / 2 + 0.11), 0.045, height, 0.035, s.ivory);
      v.box(p.x + dx, y, p.z + side * (p.d / 2 + 0.11), pane, 0.035, 0.035, s.ivory);
    }
  for (const dx of [-1, 1])
    v.box(
      p.x + dx * (p.w / 2 - 0.06),
      p.h / 2,
      p.z + p.d / 2 + 0.04,
      0.14,
      p.h,
      0.14,
      historic ? s.ivory : s.slagStone,
    );
  v.box(
    p.x,
    1.05,
    p.z + p.d / 2 + 0.065,
    retail ? 3.8 : 1.05,
    2.1,
    0.11,
    retail ? s.glass : s.wood,
  );
  if (historic) {
    v.box(p.x, 0.13, p.z + p.d / 2 + 0.45, 1.5, 0.26, 0.8, s.slagStone);
    v.box(p.x + p.w * 0.26, p.h + 1.5, p.z - 0.5, 0.6, 2.4, 0.6, s.brick);
  }
  if (church) {
    // West tower and a slender copper-coloured spire give the church a distinct silhouette.
    v.box(p.x, p.h * 0.75, p.z + p.d * 0.32, p.w * 0.55, p.h * 1.5, p.w * 0.55, s.plaster);
    const spire = new THREE.ConeGeometry(p.w * 0.43, 9, 4);
    v.static(spire, s.roof, p.x, p.h * 1.5 + 4.5, p.z + p.d * 0.32, 1, 1, 1, Math.PI / 4);
    spire.dispose();
    v.box(p.x, p.h * 1.5 + 9.6, p.z + p.d * 0.32, 0.08, 1.5, 0.08, s.zinc);
    v.box(p.x, p.h * 1.5 + 10, p.z + p.d * 0.32, 0.8, 0.07, 0.08, s.zinc);
  }
  if (power)
    for (let i = -1; i <= 1; i++) {
      v.box(p.x + i * p.w * 0.25, 1, p.z - p.d / 2, 2, 2, 2.5, s.slagStone);
      v.box(p.x + i * p.w * 0.25, p.h + 0.8, p.z, 1.8, 1.6, 1.3, s.metal);
    }
  if (p.type === 'industrial')
    for (let i = 0; i < 3; i++)
      v.box(p.x - p.w * 0.3 + i * p.w * 0.3, 1.7, p.z + p.d / 2 + 0.1, 3, 3.4, 0.1, s.zinc);
  if (p.name)
    v.sign(
      (p.verified ? '' : '~ ') + p.name,
      p.x,
      retail ? p.h - 0.9 : 2.8,
      p.z + p.d / 2 + 0.2,
      Math.min(p.w * 0.85, 14),
    );
}
export function districtDetails(v) {
  const previous = v.baseY;
  v.baseY = 0;
  // Wayfinding names and silhouettes help players learn the river corridor.
  for (const d of MAP.districts) {
    let x = d.x,
      z = d.z + Math.min(d.radius * 0.6, 16);
    if (!canStand(x, z)) continue;
    const y = groundHeight(x, z);
    v.box(x - 2.5, y + 1.4, z, 0.08, 2.8, 0.08, v.s.wood);
    v.box(x + 2.5, y + 1.4, z, 0.08, 2.8, 0.08, v.s.wood);
    v.sign(d.name, x, y + 2.3, z, 6);
  }
  // Holmen has seating and small gravel clearings along the existing riverbank.
  const holmen = MAP.districts.find((d) => d.id === 'holmen');
  for (let i = 0; i < 7; i++) {
    const x = holmen.x - 12 + i * 4,
      z = holmen.z + 8 + Math.sin(i) * 4;
    if (!canStand(x, z) || waterAt(x, z)) continue;
    const y = groundHeight(x, z);
    v.box(x, y + 0.48, z, 1.8, 0.12, 0.5, v.s.wood);
    v.box(x, y + 0.8, z - 0.25, 1.8, 0.6, 0.08, v.s.wood);
    for (const dx of [-0.65, 0.65]) v.box(x + dx, y + 0.22, z, 0.08, 0.44, 0.5, v.s.metal);
  }
  // Continuous asphalt courts, parking rows and a clear central circulation aisle.
  const tile = (x, z, w, d, mat, lift = 0.025) => {
    const points = [];
    for (const [dx, dz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const xx = x + (dx * w) / 2,
        zz = z + (dz * d) / 2;
      points.push(xx, groundHeight(xx, zz) + lift, zz);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        points.flatMap((p, i) => (i % 3 === 1 ? [] : [p / 3])),
        2,
      ),
    );
    geo.computeVertexNormals();
    v.static(geo, mat, 0, 0, 0);
    geo.dispose();
  };
  for (const lot of MAP.parking) {
    const nx = Math.ceil(lot.w / 2),
      nz = Math.ceil(lot.d / 2);
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        tile(
          lot.x - lot.w / 2 + ((i + 0.5) * lot.w) / nx,
          lot.z - lot.d / 2 + ((j + 0.5) * lot.d) / nz,
          lot.w / nx,
          lot.d / nz,
          v.s.asphalt,
        );
    const bayCount = Math.floor((lot.w - 4) / 2.6);
    for (let i = 0; i <= bayCount; i++) {
      const x = lot.x - lot.w / 2 + 1.5 + i * 2.6;
      for (let j = 0; j < 5; j++)
        tile(x, lot.z - lot.d / 2 + 0.7 + j * 0.8, 0.065, 0.82, v.s.ivory, 0.053);
    }
    tile(lot.x - 1, lot.z - lot.d / 2 + 0.3, lot.w - 3, 0.065, v.s.ivory, 0.053);
    // One wider accessible bay; the aisle and entrance approach remain unoccupied.
    tile(lot.x - lot.w / 2 + 2.8, lot.z - lot.d / 2 + 2, 1.1, 0.09, v.s.ivory, 0.054);
    const sx = lot.x - lot.w / 2 + 0.3,
      sz = lot.z + lot.d / 2;
    v.box(sx, groundHeight(sx, sz) + 1.1, sz, 0.07, 2.2, 0.07, v.s.metal);
    v.sign('P', sx, groundHeight(sx, sz) + 2.1, sz, 1.2);
  }
  // Pavement aprons meet the facade; paths already connect these to the road graph.
  for (const entry of MAP.entrances) {
    if (entry.buildingId === 'aalto') continue; // existing accessible ramp is retained
    const [x, z] = entry.point;
    tile(x, z - 0.75, 1.45, 1.5, v.s.concrete, 0.028);
  }
  v.baseY = previous;
}
