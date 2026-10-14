import * as THREE from 'three';
import { industrialEquipment, INDUSTRY_GATE, industry } from '../shared/industry.js';
import { railwayExclusion } from '../shared/transport.js';
import { roadWidth } from '../shared/roads.js';
import { groundHeight, roadsNear, segmentDistance } from '../shared/map.js';
import { buildingLocal, buildingWorld } from '../shared/buildings.js';

function polygonGeometry(outline, height) {
  const shape = new THREE.Shape();
  outline.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
export function industrialFoundation(v, f) {
  if (f.shape !== 'polygon') return false;
  const geo = polygonGeometry(
    f.localOutline.map((p) => [p.x, p.z]),
    f.h,
  );
  v.static(geo, v.s.concrete, f.x, f.bottom, f.z, 1, 1, 1, f.yaw || 0);
  geo.dispose();
  return true;
}
function materials(v) {
  if (v.s.industry) return v.s.industry;
  const metal = (color, roughness = 0.72) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.42 });
  const corrugated = (color) => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(x, 0, 3, 512);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(x + 3, 0, 2, 512);
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map,
      color: '#ffffff',
      roughness: 0.74,
      metalness: 0.3,
    });
  };
  return (v.s.industry = {
    blue: corrugated('#236d8b'),
    red: corrugated('#91483a'),
    pale: corrugated('#c7c9c4'),
    dark: metal('#303634'),
    silver: metal('#a6b3b4', 0.46),
    redStripe: metal('#9c3d3c'),
    yellow: metal('#c5a236'),
    pipe: metal('#a1a8a0'),
    glass: new THREE.MeshStandardMaterial({ color: '#6a838c', roughness: 0.28, metalness: 0.55 }),
    white: metal('#deded6', 0.85),
  });
}
function builder(v, p) {
  const box = (x, y, z, w, h, d, mat, yaw = 0) => v.box(p.x + x, y, p.z + z, w, h, d, mat, yaw);
  const mesh = (geo, mat, x, y, z, yaw = 0) => {
    v.static(geo, mat, p.x + x, y, p.z + z, 1, 1, 1, yaw);
    geo.dispose();
  };
  const beam = (a, b, r, mat) => {
    const delta = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const geo = new THREE.CylinderGeometry(r, r, delta.length(), 8);
    geo.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.clone().normalize(),
      ),
    );
    mesh(geo, mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  };
  return { box, mesh, beam };
}
function footprintBody(v, p, mat, roof) {
  const outline = p.localFootprint || [
    [-p.w / 2, -p.d / 2],
    [p.w / 2, -p.d / 2],
    [p.w / 2, p.d / 2],
    [-p.w / 2, p.d / 2],
  ];
  let geo = polygonGeometry(outline, p.h);
  v.static(geo, mat, p.x, 0, p.z);
  geo.dispose();
  geo = polygonGeometry(outline, 0.28);
  v.static(geo, roof, p.x, p.h, p.z);
  geo.dispose();
}
function perimeter(p) {
  const poly = p.localFootprint;
  return poly
    .slice(1)
    .map((b, i) => ({ a: poly[i], b }))
    .filter(({ a, b }) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.6);
}
function facade(v, p, mat, { office = false, spacing = 7 } = {}) {
  const { box } = builder(v, p);
  for (const { a, b } of perimeter(p)) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      yaw = Math.atan2(-dz, dx);
    const count = Math.max(1, Math.floor(len / spacing));
    const nx = -dz / len,
      nz = dx / len;
    for (let i = 0; i <= count; i++) {
      const x = a[0] + (dx * i) / count,
        z = a[1] + (dz * i) / count;
      box(x + nx * 0.06, p.h / 2, z + nz * 0.06, 0.16, p.h, 0.2, mat.pale, yaw);
    }
    for (let i = 0; i < count; i++) {
      const x = a[0] + (dx * (i + 0.5)) / count,
        z = a[1] + (dz * (i + 0.5)) / count;
      const rows = office ? [1.4, 4.3] : [p.h - 2.4];
      for (const y of rows) {
        box(
          x + nx * 0.12,
          y,
          z + nz * 0.12,
          office ? 1.55 : Math.min(3.7, len / count - 0.8),
          office ? 1.4 : 0.85,
          0.16,
          mat.white,
          yaw,
        );
        box(
          x + nx * 0.21,
          y,
          z + nz * 0.21,
          office ? 1.3 : Math.min(3.45, len / count - 1),
          office ? 1.18 : 0.64,
          0.06,
          mat.glass,
          yaw,
        );
      }
      if (!office && i % 3 === 0 && len > 35) {
        box(x + nx * 0.16, 2.5, z + nz * 0.16, 4.3, 5, 0.23, mat.dark, yaw);
        for (let y = 0.6; y < 4.9; y += 0.45)
          box(x + nx * 0.3, y, z + nz * 0.3, 4.2, 0.035, 0.04, mat.silver, yaw);
      }
    }
  }
}
function roofMonitors(v, p, mat) {
  const { box, mesh } = builder(v, p);
  const shape = new THREE.Shape();
  shape.moveTo(-4, 0);
  shape.lineTo(0, 2.1);
  shape.lineTo(4, 0);
  shape.closePath();
  const segments = Math.max(1, Math.floor(p.w / 32));
  for (let i = 0; i < segments; i++) {
    const x = (i - (segments - 1) / 2) * 28;
    // Keep monitors off the recessed courtyards in complex footprints.
    if (!insideLocal(p, x, 0)) continue;
    box(x, p.h + 1, 0, 18, 1.6, 6, mat.pale);
    for (const side of [-1, 1]) box(x, p.h + 1, side * 3.04, 17.4, 0.75, 0.08, mat.glass);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 18.6, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.translate(-9.3, 0, 0);
    mesh(geo, mat.dark, x, p.h + 1.8, 0);
    box(x, p.h + 0.45, p.d * 0.18, 2, 0.9, 1.8, mat.silver);
  }
}
function insideLocal(p, x, z) {
  let inside = false;
  const points = p.localFootprint;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}
function ostberg(v, p, mat) {
  const { box, mesh } = builder(v, p);
  footprintBody(v, p, mat.blue, mat.dark);
  facade(v, p, mat, { office: true, spacing: 5.5 });
  for (let x = -p.w / 2 + 13; x < p.w / 2 - 10; x += 24)
    for (let z = -p.d / 2 + 15; z < p.d / 2 - 10; z += 29) {
      if (
        ![
          [-8, -10],
          [8, -10],
          [8, 10],
          [-8, 10],
        ].every(([dx, dz]) => insideLocal(p, x + dx, z + dz))
      )
        continue;
      box(x, p.h + 0.18, z, 17, 0.36, 21, mat.dark);
      for (const side of [-1, 1]) {
        box(x + side * 4.5, p.h + 0.35, z, 2.4, 0.7, 8, mat.pale);
        box(x + side * 4.5, p.h + 0.72, z, 2.2, 0.05, 7.8, mat.glass);
      }
      mesh(new THREE.CylinderGeometry(0.55, 0.8, 1.3, 16), mat.silver, x, p.h + 0.65, z + 7);
    }
  // The photographed front has a pale office band above blue cladding.
  const front = perimeter(p).filter(({ a, b }) => Math.abs(a[1] - b[1]) < 0.6 && a[1] > p.d * 0.26);
  for (const { a, b } of front) {
    const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
    box((a[0] + b[0]) / 2, 5.65, (a[1] + b[1]) / 2 + 0.1, width, 2.05, 0.17, mat.white);
  }
  // A separate shallow parapet on the front office creates the stepped roofline.
  box(12, 7.4, p.d * 0.39, 48, 0.7, 19, mat.dark);
  for (let x = -12; x <= 18; x += 6) {
    if (!insideLocal(p, x, -14)) continue;
    box(x, p.h + 0.35, -14, 3.7, 0.7, 8, mat.pale);
    box(x, p.h + 0.73, -14, 3.5, 0.06, 7.8, mat.glass);
  }
  for (const { a, b } of front.slice(0, 2)) {
    const x = (a[0] + b[0]) / 2,
      z = (a[1] + b[1]) / 2;
    box(x, 2.1, z + 0.2, 4.2, 4.2, 0.3, mat.dark);
    box(x, 4.35, z + 1.7, 6.8, 0.28, 3.2, mat.dark);
    box(x, 0.45, z + 1.3, 6.2, 0.9, 2.6, v.s.concrete);
    for (const dx of [-3, 3]) box(x + dx, 1.8, z + 2.7, 0.15, 2.7, 0.15, mat.yellow);
  }
  const edge = front.sort((a, b) => Math.abs(b.b[0] - b.a[0]) - Math.abs(a.b[0] - a.a[0]))[0];
  if (edge) {
    const x = (edge.a[0] + edge.b[0]) / 2,
      z = (edge.a[1] + edge.b[1]) / 2;
    v.sign('ÖSTBERG', p.x + x + 3, 6.9, p.z + z + 0.23, 14);
    mesh(new THREE.TorusGeometry(0.95, 0.25, 8, 32), mat.redStripe, x - 6, 6.9, z + 0.25);
  }
}
function linde(v, p, mat) {
  const { box, mesh, beam } = builder(v, p);
  box(0, p.h / 2, 0, p.w, p.h, p.d, mat.pale);
  box(-2, p.h + 2.4, -1, 4, 4.8, 4.5, mat.pale);
  for (let y = 3; y < p.h; y += 3.8) box(0, y, p.d / 2 + 0.05, p.w, 0.055, 0.08, mat.silver);
  // External switchback stair landings are visible in both public photographs.
  for (let y = 3; y < p.h; y += 3.8) {
    box(p.w / 2 + 1.8, y, 0, 3.4, 0.15, p.d - 1, mat.silver);
    for (const z of [-p.d / 2 + 0.7, p.d / 2 - 0.7]) {
      beam([p.w / 2 + 3.3, y, z], [p.w / 2 + 3.3, y + 1, z], 0.035, mat.silver);
      beam([p.w / 2 + 0.4, y + 1, z], [p.w / 2 + 3.3, y + 1, z], 0.035, mat.silver);
    }
    const direction = Math.round(y / 3.8) % 2 ? 1 : -1;
    if (y + 3.8 <= p.h)
      for (let step = 0; step < 24; step++) {
        const t = (step + 0.5) / 24;
        box(
          p.w / 2 + 1.8,
          y + 3.8 * t,
          -direction * 3.7 + direction * 7.4 * t,
          2.5,
          0.07,
          0.36,
          mat.silver,
        );
      }
    beam(
      [p.w / 2 + 1.8, y, -direction * 3.7],
      [p.w / 2 + 1.8, y + 3.8, direction * 3.7],
      0.17,
      mat.silver,
    );
    beam(
      [p.w / 2 + 3.2, y + 1, -direction * 3.7],
      [p.w / 2 + 3.2, y + 4.8, direction * 3.7],
      0.04,
      mat.silver,
    );
  }
  for (const side of [-1, 1])
    v.sign('AGA · LINDE', p.x, p.h - 9, p.z + side * (p.d / 2 + 0.08), 8, side < 0 ? Math.PI : 0);
  for (const q of industrialEquipment(p)) {
    const local = buildingLocal(p, q.x, q.z);
    if (q.kind === 'tank') {
      mesh(
        new THREE.CylinderGeometry(q.w / 2, q.w / 2, q.h, 32),
        mat.white,
        local.x,
        q.h / 2,
        local.z,
      );
      mesh(
        new THREE.CylinderGeometry(q.w / 2 + 0.015, q.w / 2 + 0.015, 0.9, 32),
        mat.redStripe,
        local.x,
        q.h - 1.4,
        local.z,
      );
      mesh(
        new THREE.SphereGeometry(q.w / 2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat.white,
        local.x,
        q.h,
        local.z,
      );
      for (let y = 0.2; y < q.h; y += 1.6)
        box(local.x - q.w / 2 - 0.1, y, local.z, 0.15, 0.09, 0.5, mat.silver);
    } else {
      box(local.x, q.h / 2, local.z, q.w, q.h, q.d, mat.pale);
      mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20), mat.dark, local.x, q.h + 0.3, local.z);
      for (let i = 0; i < 4; i++)
        box(local.x, q.h + 0.52, local.z, 4, 0.09, 0.28, mat.silver, (i * Math.PI) / 4);
    }
  }
  // Elevated pipe racks remain visually clear above pedestrian/vehicle movement.
  for (const z of [-14, -12, -10]) beam([12, 5.5, z], [70, 5.5, z], 0.24, mat.pipe);
  for (let x = 15; x < 71; x += 11) {
    for (const z of [-15, -9]) box(x, 2.5, z, 0.35, 5, 0.35, mat.silver);
    beam([x, 5, -15], [x, 5, -9], 0.14, mat.silver);
    beam([x, 0, -15], [x, 5, -9], 0.07, mat.silver);
  }
}
export function industrialLandmark(v, p) {
  if (!p.industry) return false;
  const mat = materials(v);
  if (p.industry === 'ostberg') ostberg(v, p, mat);
  else if (p.industry === 'linde') linde(v, p, mat);
  else {
    footprintBody(v, p, p.industry === 'linde-office' ? mat.pale : mat.red, mat.dark);
    facade(v, p, mat, {
      office: p.industry === 'linde-office',
      spacing: p.industry === 'linde-office' ? 4.5 : 9,
    });
    if (p.industry === 'steel') roofMonitors(v, p, mat);
    if (p.id === 'outokumpu') {
      const { box, mesh, beam } = builder(v, p);
      // Authored filtration/duct silhouette on the melt-shop roof, all within its footprint.
      for (const x of [-p.w * 0.25, p.w * 0.25]) {
        mesh(new THREE.CylinderGeometry(1.4, 1.8, 16, 24), mat.dark, x, p.h + 7.5, 0);
        beam([x, p.h + 2, 0], [x, p.h + 2, p.d * 0.24], 1.15, mat.silver);
        box(x, p.h + 1, p.d * 0.24, 10, 2, 8, mat.pale);
      }
      v.sign('OUTOKUMPU · AVESTA WORKS', p.x, 8, p.z + p.d / 2 + 0.12, 27);
    } else if (!p.id.startsWith('avesta-works-') && p.industry === 'steel')
      v.sign(
        p.name.replace('Avesta Works · ', ''),
        p.x,
        6,
        p.z + p.d / 2 + 0.12,
        Math.min(22, p.w * 0.45),
      );
    else if (p.industry === 'linde-office') {
      const { box } = builder(v, p);
      box(0, 5.25, p.d / 2 + 0.07, p.w, 0.75, 0.14, mat.redStripe);
      v.sign('LINDE GAS', p.x, 5.7, p.z + p.d / 2 + 0.18, 8);
    }
  }
  return true;
}

export function buildIndustryEntrance(v) {
  const p = INDUSTRY_GATE,
    m = materials(v);
  const point = (x, z) => buildingWorld(p, x, z);
  const box = (x, y, z, w, h, d, mat) => {
    const q = point(x, z);
    v.box(q.x, groundHeight(q.x, q.z) + y, q.z, w, h, d, mat, p.yaw);
  };
  // Gantry, guard booth and barrier are exterior references. The road remains
  // traversable in this fictional wartime setting.
  for (const side of [-1, 1]) {
    box(side * 6.2, 4.6, 0, 0.7, 9.2, 0.7, m.yellow);
    for (let y = 0.5; y < 8.7; y += 1.5) box(side * 6.2, y, 0, 0.72, 0.5, 0.72, m.dark);
    box(side * 6.2, 0.65, 0, 1.1, 1.3, 1.1, m.redStripe);
  }
  box(0, 9.2, 0, 13.2, 0.8, 0.8, m.yellow);
  box(-13, 1.65, -3, 8, 3.3, 6, m.red);
  box(-13, 3.45, -3, 8.4, 0.3, 6.4, m.dark);
  box(-13, 1.8, 0.08, 7.4, 1.5, 0.1, m.glass);
  box(6.4, 0.6, -16, 0.6, 1.2, 0.6, m.yellow);
  box(6.4, 5.7, -16, 0.15, 10.2, 0.15, m.white);
  // Short open fence returns communicate the guarded boundary without a
  // fabricated closed perimeter or barriers across mapped factory sidings.
  for (const side of [-1, 1])
    for (let z = -8; z <= 24; z += 4) {
      box(side * 9, 1.1, z, 0.07, 2.2, 0.07, m.silver);
      for (const y of [0.4, 1.2, 2]) box(side * 9, y, z + 2, 0.06, 0.05, 4.05, m.silver);
    }
  const q = point(0, 1);
  v.sign('AVESTA WORKS · INFART', q.x, groundHeight(q.x, q.z) + 8.2, q.z, 9, p.yaw);
  const area = industry.areas.find((a) => a.sourceId === 'way/132515339');
  if (!area) return;
  for (let i = 1; i < area.points.length; i++) {
    const a = area.points[i - 1],
      b = area.points[i],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      steps = Math.ceil(length / 4),
      yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    for (let j = 0; j < steps; j++) {
      const x = a[0] + ((b[0] - a[0]) * (j + 0.5)) / steps,
        z = a[1] + ((b[1] - a[1]) * (j + 0.5)) / steps;
      if (
        railwayExclusion(x, z, 4) ||
        roadsNear(x, z).some((r) => segmentDistance(x, z, ...r.points) < roadWidth(r) / 2 + 5)
      )
        continue;
      const h = groundHeight(x, z),
        span = length / steps;
      v.box(x, h + 1.25, z, 0.08, 2.5, 0.08, m.silver);
      for (const y of [0.45, 1.25, 2.3]) v.box(x, h + y, z, 0.05, 0.05, span + 0.02, m.silver, yaw);
      for (let k = -span / 2; k < span / 2; k += 0.35) {
        const px = x + Math.sin(yaw) * k,
          pz = z + Math.cos(yaw) * k;
        v.box(px, groundHeight(px, pz) + 1.2, pz, 0.012, 2.2, 0.012, m.silver);
      }
    }
  }
}
