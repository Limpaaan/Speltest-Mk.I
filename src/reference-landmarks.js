import * as THREE from 'three';
import { architectureSpec } from '../shared/architecture.js';
function builder(v, p) {
  const box = (x, y, z, w, h, d, mat) => v.box(p.x + x, y, p.z + z, w, h, d, mat);
  const mesh = (geo, mat, x, y, z, yaw = 0) => {
    v.static(geo, mat, p.x + x, y, p.z + z, 1, 1, 1, yaw);
    geo.dispose();
  };
  const arch = (x, y, z, w, h, frame, glass, yaw = 0) => {
    const shape = (width, height) => {
      const s = new THREE.Shape(),
        r = width / 2;
      s.moveTo(-r, 0);
      s.lineTo(r, 0);
      s.lineTo(r, height - r);
      s.absarc(0, height - r, r, 0, Math.PI, false);
      s.closePath();
      return s;
    };
    mesh(new THREE.ShapeGeometry(shape(w + 0.16, h + 0.1)), frame, x, y - 0.04, z, yaw);
    mesh(
      new THREE.ShapeGeometry(shape(w, h)),
      glass,
      x + Math.sin(yaw) * 0.02,
      y,
      z + Math.cos(yaw) * 0.02,
      yaw,
    );
  };
  // Cross-section across depth; ridge runs along the long facade.
  const roof = (x, z, w, d, y, rise, mat, mansard = false, yaw = 0) => {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    if (mansard) {
      s.lineTo(-d * 0.29, rise * 0.62);
      s.lineTo(-d * 0.2, rise);
      s.lineTo(d * 0.2, rise);
      s.lineTo(d * 0.29, rise * 0.62);
    } else s.lineTo(0, rise);
    s.lineTo(d / 2, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-w / 2, 0, 0);
    mesh(g, mat, x, y, z, yaw);
  };
  return { box, mesh, arch, roof };
}
export function referenceLandmark(v, p) {
  const a = architectureSpec(p);
  if (!a) return false;
  const { box, mesh, arch, roof } = builder(v, p),
    s = v.s;
  if (p.id === 'stadshuset') {
    const yellow = s.civic || (s.civic = s.ivory.clone());
    yellow.color.set('#d2b469');
    box(0, a.body / 2, 0, p.w, a.body, p.d, yellow);
    box(0, 0.16, 0, p.w + 0.12, 0.32, p.d + 0.12, s.concrete);
    roof(0, 0, p.w + 0.22, p.d + 0.22, a.body, a.roofRise, s.roof, true);
    for (const side of [-1, 1]) {
      const z = side * (p.d / 2 + 0.03);
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * p.w * 0.125;
        for (const y of [1.35, 3.62]) {
          if (i === 3 && y < 2 && side === 1) continue;
          box(x, y, z, 0.66, 1.3, 0.07, s.ivory);
          box(x, y, z + side * 0.035, 0.47, 1.09, 0.03, s.glass);
          for (const dx of [-0.12, 0, 0.12])
            box(x + dx, y, z + side * 0.065, 0.024, 1.1, 0.025, s.ivory);
          box(x, y, z + side * 0.067, 0.47, 0.025, 0.025, s.ivory);
        }
      }
      for (const x of [-p.w / 2 + 0.1, p.w / 2 - 0.1, -p.w * 0.15, p.w * 0.15])
        box(x, a.body / 2, z, 0.16, a.body, 0.08, s.ivory);
      box(0, 2.53, z, p.w, 0.12, 0.13, s.ivory);
      for (let i = -2; i <= 2; i++) {
        const x = i * p.w * 0.145,
          dz = side * p.d * 0.32;
        box(x, a.body + 0.66, dz, 0.48, 0.6, 0.28, s.ivory);
        box(x, a.body + 0.68, dz + side * 0.155, 0.32, 0.43, 0.025, s.glass);
        box(x, a.body + 0.98, dz, 0.58, 0.09, 0.34, s.roof);
      }
    }
    arch(0, 0.1, p.d / 2 + 0.075, 0.8, 1.83, s.ivory, s.dark || s.metal);
    box(0, 0.08, p.d / 2 + 0.32, 1.1, 0.16, 0.52, s.concrete);
    for (const x of [-p.w * 0.3, 0, p.w * 0.3])
      box(x, a.body + a.roofRise + 0.2, 0, 0.26, 0.7, 0.3, s.brick);
    v.sign('STADSHUSET', p.x, 2.75, p.z + p.d / 2 + 0.14, 2.5);
  } else if (p.id === 'avesta-kyrka') {
    const plaster = s.church || (s.church = s.plaster.clone());
    plaster.color.set('#e1dec9');
    box(0, a.body / 2, 0, p.w, a.body, p.d, plaster);
    roof(0, 0, p.d + 0.2, p.w + 0.2, a.body, a.roofRise, s.roof, false, Math.PI / 2);
    const tw = a.towerW,
      tz = a.towerZ;
    box(0, a.towerH / 2, tz, tw, a.towerH, tw, plaster);
    for (const y of [5.4, a.towerH - 0.8]) box(0, y, tz, tw + 0.17, 0.16, tw + 0.17, s.ivory);
    for (const side of [-1, 1]) {
      for (const z of [-p.d * 0.31, 0, p.d * 0.25])
        arch(side * (p.w / 2 + 0.025), 1.6, z, 0.92, 2.9, s.brick, s.glass, (side * Math.PI) / 2);
      arch(
        0,
        6.5,
        tz + side * (tw / 2 + 0.025),
        0.83,
        1.75,
        s.brick,
        s.metal,
        side < 0 ? Math.PI : 0,
      );
      mesh(
        new THREE.CircleGeometry(0.37, 24),
        s.metal,
        0,
        8.9,
        tz + side * (tw / 2 + 0.06),
        side < 0 ? Math.PI : 0,
      );
      box(0, 8.98, tz + side * (tw / 2 + 0.085), 0.035, 0.3, 0.015, s.ivory);
      box(0.09, 8.91, tz + side * (tw / 2 + 0.09), 0.2, 0.035, 0.015, s.ivory);
    }
    // Four steep triangular gables surround the eight-sided slate spire.
    for (let side = 0; side < 4; side++) {
      const shape = new THREE.Shape();
      shape.moveTo(-tw / 2, 0);
      shape.lineTo(0, 1.7);
      shape.lineTo(tw / 2, 0);
      shape.closePath();
      const yaw = (side * Math.PI) / 2;
      mesh(
        new THREE.ShapeGeometry(shape),
        s.brick,
        Math.sin(yaw) * (tw / 2 + 0.03),
        a.towerH - 0.35,
        tz + Math.cos(yaw) * (tw / 2 + 0.03),
        yaw,
      );
    }
    mesh(new THREE.ConeGeometry(tw * 0.6, a.spire, 8), s.roof, 0, a.towerH + a.spire / 2, tz);
    box(0, a.towerH + a.spire + 0.3, tz, 0.045, 0.7, 0.045, s.zinc);
    box(0, a.towerH + a.spire + 0.38, tz, 0.4, 0.035, 0.035, s.zinc);
    arch(0, 0, tz + tw / 2 + 0.04, 1, 2.4, s.brick, s.wood);
    v.sign('AVESTA KYRKA', p.x, 2.7, p.z + tz + tw / 2 + 0.09, 2.3);
  } else {
    const stone = s.stationStone || (s.stationStone = s.plaster.clone());
    stone.color.set('#888274');
    const trim = s.stationBrick || (s.stationBrick = s.brick.clone());
    trim.color.set('#be7757');
    box(0, a.body / 2, 0, p.w, a.body, p.d, stone);
    roof(0, 0, p.w + 0.35, p.d + 0.35, a.body, a.roofRise, s.roof);
    box(0, a.centerH / 2, 0, a.centerW, a.centerH, p.d + 0.1, stone);
    roof(0, 0, a.centerW + 0.35, p.d + 0.45, a.centerH, 1.35, s.roof);
    for (const side of [-1, 1]) {
      const z = side * (p.d / 2 + 0.08);
      for (const y of [0.65, 2.7, a.body - 0.2]) box(0, y, z, p.w, 0.18, 0.08, trim);
      for (let x = -p.w / 2 + 0.9; x < p.w / 2 - 0.5; x += 1.35) {
        if (Math.abs(x) < a.centerW * 0.5) continue;
        arch(x, 0.75, z, 0.72, 1.8, trim, s.glass, side < 0 ? Math.PI : 0);
        arch(x, 2.85, z, 0.65, 1.05, trim, s.glass, side < 0 ? Math.PI : 0);
      }
      for (const x of [-a.centerW * 0.28, 0, a.centerW * 0.28])
        arch(x, 3.65, z + side * 0.025, 0.9, 2.1, trim, s.glass, side < 0 ? Math.PI : 0);
      box(0, 0.75, z + 0.06, a.centerW * 0.65, 1.5, 0.12, s.metal);
      // A long platform canopy and its visible brackets identify the railway side.
      box(0, 2.67, z + side * 0.5, p.w * 0.9, 0.14, 1.25, s.roof);
      for (let x = -p.w * 0.42; x < p.w * 0.43; x += 2.2) {
        box(x, 1.33, z + side * 1, 0.07, 2.65, 0.07, s.metal);
        box(x, 2.4, z + side * 0.45, 0.07, 0.35, 0.95, s.metal);
      }
    }
    const tx = a.towerX,
      r = a.towerR,
      tz = a.towerZ;
    mesh(new THREE.CylinderGeometry(r, r, a.towerH, 8), stone, tx, a.towerH / 2, tz, Math.PI / 8);
    for (const y of [0.65, 2.65, 4.7])
      mesh(new THREE.CylinderGeometry(r + 0.035, r + 0.035, 0.2, 8), trim, tx, y, tz, Math.PI / 8);
    mesh(new THREE.ConeGeometry(r * 1.2, 0.7, 8), s.roof, tx, a.towerH + 0.35, tz, Math.PI / 8);
    mesh(
      new THREE.CylinderGeometry(r * 0.62, r * 0.78, 1.2, 8),
      s.roof,
      tx,
      a.towerH + 1.1,
      tz,
      Math.PI / 8,
    );
    mesh(
      new THREE.CylinderGeometry(r * 0.65, r * 0.65, 0.75, 8),
      s.metal,
      tx,
      a.towerH + 1.95,
      tz,
      Math.PI / 8,
    );
    mesh(new THREE.ConeGeometry(r * 0.82, 1.4, 8), s.roof, tx, a.towerH + 3, tz, Math.PI / 8);
    for (const y of [1.3, 3.5, 5.3]) arch(tx, y, tz + r + 0.025, 0.58, 1.15, trim, s.glass);
    for (const x of [-p.w * 0.19, p.w * 0.29]) box(x, a.body + 1.9, 0, 0.55, 1.4, 0.65, trim);
    v.sign('AVESTA KRYLBO', p.x, 3.08, p.z + p.d / 2 + 0.11, 4);
  }
  return true;
}
