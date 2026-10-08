import * as THREE from 'three';
import { WEAPONS } from '../shared/weapons.js';
// Original, deliberately simplified Swedish silhouettes. Optics are hollow geometry.
export function weaponModel(kind, surfaces, boxGeo) {
  const root = new THREE.Group(),
    s = surfaces,
    geos = [];
  const part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = root) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };
  const box = (mat, x, y, z, w, h, d, parent = root) => part(boxGeo, mat, x, y, z, w, h, d, parent);
  const tube = (radius, length, x, y, z, open = false, mat = s.metal) => {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 16, 1, open);
    geos.push(geo);
    const mesh = part(geo, mat, x, y, z);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };
  const ring = (radius, width, x, y, z) => {
    const geo = new THREE.TorusGeometry(radius, width, 8, 32);
    geos.push(geo);
    return part(geo, s.metal, x, y, z);
  };
  const pistol = kind === 'pistol',
    smg = kind === 'smg',
    lmg = kind === 'lmg',
    shotgun = kind === 'shotgun',
    scout = kind === 'scout';
  const muzzle = pistol
    ? -0.29
    : smg
      ? -0.5
      : scout
        ? -0.87
        : shotgun
          ? -0.78
          : lmg
            ? -0.82
            : -0.68;
  const sightY = scout ? 0.19 : 0.115;
  const action = new THREE.Group();
  root.add(action);
  box(
    s.metal,
    0,
    0,
    pistol ? -0.09 : 0,
    pistol ? 0.08 : lmg ? 0.14 : 0.095,
    0.105,
    pistol ? 0.26 : 0.4,
    action,
  );
  box(s.wood, 0, -0.105, 0.06, 0.065, 0.21, 0.1).rotation.x = -0.2;
  tube(
    pistol ? 0.018 : lmg ? 0.025 : 0.018,
    pistol ? 0.2 : Math.abs(muzzle) - 0.08,
    0,
    -0.018,
    (muzzle - 0.08) / 2,
  );
  ring(pistol ? 0.019 : 0.023, 0.006, 0, -0.018, muzzle);
  if (!pistol) {
    box(scout || shotgun || kind === 'rifle' ? s.wood : s.metal, 0, -0.045, 0.29, 0.09, 0.15, 0.3);
    box(s.metal, 0, -0.045, 0.46, 0.105, 0.18, 0.025);
  }
  let pump;
  if (shotgun) {
    pump = box(s.wood, 0, -0.035, -0.43, 0.09, 0.09, 0.22);
    tube(0.017, 0.5, 0, -0.065, -0.36);
  } else if (scout) {
    box(s.wood, 0, -0.045, -0.35, 0.085, 0.085, 0.36);
    tube(0.012, 0.12, 0.08, 0.025, 0.055);
    box(s.metal, 0.095, 0.025, 0.12, 0.04, 0.04, 0.04, action);
  } else if (smg) {
    tube(0.048, 0.34, 0, 0.002, -0.13);
    for (let i = 0; i < 6; i++) ring(0.05, 0.006, 0, 0.002, -0.18 - i * 0.035);
    box(s.metal, 0, -0.05, 0.3, 0.02, 0.02, 0.32);
  } else if (lmg) {
    box(s.wood, 0, -0.025, -0.38, 0.08, 0.09, 0.29);
    for (const side of [-1, 1])
      box(s.metal, side * 0.09, -0.16, -0.62, 0.018, 0.3, 0.018).rotation.z = side * 0.35;
    box(s.metal, 0.12, 0.08, -0.05, 0.02, 0.02, 0.17);
  } else if (!pistol) box(s.wood, 0, -0.015, -0.36, 0.09, 0.1, 0.22);
  const magazine = box(
    lmg ? s.wood : s.metal,
    lmg ? -0.1 : 0,
    -0.18,
    pistol ? 0.055 : smg ? -0.09 : 0,
    lmg ? 0.21 : 0.065,
    lmg ? 0.2 : 0.24,
    lmg ? 0.18 : 0.09,
  );
  if (shotgun || scout) {
    magazine.scale.set(0.02, 0.025, 0.065);
    magazine.position.set(0.04, -0.03, 0.03);
  }
  if (lmg)
    for (let i = 0; i < 7; i++) box(s.rust, -0.09 - i * 0.015, 0.01, -0.03, 0.009, 0.025, 0.075);
  // Scope tube has no end caps or dark glass plane: world stays visible through it.
  if (scout) {
    const optic = new THREE.CylinderGeometry(0.066, 0.13, 0.29, 24, 1, true);
    geos.push(optic);
    const opticMesh = part(optic, s.metal, 0, sightY, -0.15);
    opticMesh.rotation.x = Math.PI / 2;
    ring(0.066, 0.011, 0, sightY, -0.003);
    ring(0.13, 0.009, 0, sightY, -0.3);
    box(s.metal, 0, 0.08, -0.13, 0.06, 0.08, 0.08);
    box(s.metal, 0, sightY + 0.14, -0.15, 0.04, 0.035, 0.045);
  } else {
    const rear = 0.1,
      front = muzzle + 0.05;
    if (WEAPONS[kind].sight === 'aperture') ring(0.036, 0.008, 0, sightY, rear);
    else {
      box(s.metal, -0.028, sightY - 0.015, rear, 0.012, 0.045, 0.018);
      box(s.metal, 0.028, sightY - 0.015, rear, 0.012, 0.045, 0.018);
    }
    box(s.metal, 0, sightY - 0.025, front, 0.007, 0.05, 0.016);
    box(s.metal, 0, 0.035, front, 0.035, 0.09, 0.04);
    box(s.metal, 0, 0.067, rear, 0.06, 0.035, 0.025);
  }
  root.userData = {
    geometries: geos,
    magazine,
    magazineY: magazine.position.y,
    action,
    pump,
    muzzle,
    sightY,
    kind,
  };
  return root;
}
