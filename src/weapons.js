import { ATTACHMENTS, validMods } from '../shared/items.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WEAPONS } from '../shared/weapons.js';

// Original game models inspired by Swedish weapon families, not engineering replicas.
// Shared materials keep remote players affordable; geometry is owned by each model.
let palette;
function materials() {
  if (palette) return palette;
  const texture = (kind, size = 1024) => {
    const data = new Uint8Array(size * size * 4);
    let seed = 431;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed >>> 24) / 255;
        const grain = Math.sin(x * 0.065 + Math.sin(y * 0.012) * 4 + Math.sin(y * 0.027) * 1.2);
        const weave = x % 8 < 4 !== y % 8 < 4 ? 9 : -9;
        const value =
          kind === 'wood'
            ? 207 + grain * 22 + noise * 9
            : kind === 'cloth'
              ? 219 + weave + noise * 10
              : kind === 'roughness'
                ? 167 + noise * 18 + Math.sin(y * 0.5) * 7
                : 241 + noise * 10 + Math.sin(y * 0.8) * 3;
        const i = (y * size + x) * 4;
        data.set([value, value, value, 255], i);
      }
    const map = new THREE.DataTexture(data, size, size);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 8;
    map.needsUpdate = true;
    return map;
  };
  const metal = texture('metal'),
    wood = texture('wood'),
    cloth = texture('cloth'),
    rough = texture('roughness', 512);
  const mat = (color, metalness, roughness, map = metal) =>
    new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      map,
      roughnessMap: rough,
      bumpMap: map,
      bumpScale: map === wood ? 0.0012 : 0.00025,
      clearcoat: map === wood ? 0.18 : 0.08,
      clearcoatRoughness: 0.55,
    });
  palette = {
    steel: mat('#353d40', 0.85, 0.5),
    dark: mat('#171e21', 0.7, 0.65),
    edge: mat('#717c7e', 0.9, 0.48),
    wood: mat('#73502e', 0, 0.85, wood),
    walnut: mat('#513621', 0, 0.86, wood),
    olive: mat('#414737', 0.12, 0.85),
    rubber: mat('#202523', 0, 0.93),
    brass: mat('#aa8a45', 0.67, 0.43),
    canvas: mat('#535b46', 0, 0.98, cloth),
    lamp: new THREE.MeshStandardMaterial({
      color: '#f5e5bb',
      emissive: '#eacb7c',
      emissiveIntensity: 1.1,
    }),
  };
  return palette;
}
export function weaponModel(kind, surfaces, boxGeo, rawMods = {}, detail = 'hero') {
  const hero = detail === 'hero';
  const mods = validMods(kind, rawMods),
    optic = ATTACHMENTS[mods.optic],
    sight = optic?.sight || WEAPONS[kind].sight,
    m = materials();
  const root = new THREE.Group(),
    owned = [],
    action = new THREE.Group(),
    magazine = new THREE.Group();
  root.add(action, magazine);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = root) => {
    owned.push(geo);
    const obj = new THREE.Mesh(geo, mat);
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  };
  const block = (mat, x, y, z, w, h, d, parent = root) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  // Bevelled side profiles produce actual stock/receiver contours instead of box stacks.
  const profile = (mat, points, width, parent = root, bevel = 0.004) => {
    const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y)));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: hero ? 4 : 1,
      steps: 1,
    });
    geo.translate(0, 0, -width / 2);
    geo.rotateY(Math.PI / 2);
    return mesh(geo, mat, 0, 0, 0, parent);
  };
  const tube = (mat, r, length, x, y, z, parent = root, open = false) => {
    const obj = mesh(
      new THREE.CylinderGeometry(r, r, length, hero ? 40 : 12, 1, open),
      mat,
      x,
      y,
      z,
      parent,
    );
    obj.rotation.x = Math.PI / 2;
    return obj;
  };
  const ring = (mat, r, w, x, y, z, parent = root) =>
    mesh(new THREE.TorusGeometry(r, w, hero ? 10 : 4, hero ? 40 : 16), mat, x, y, z, parent);
  const rod = (mat, a, b, r = 0.009, parent = root) => {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start);
    const obj = mesh(
      new THREE.CylinderGeometry(r, r, delta.length(), hero ? 16 : 8),
      mat,
      ...start.add(end).multiplyScalar(0.5).toArray(),
      parent,
    );
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return obj;
  };
  const ball = (mat, r, x, y, z, parent = root) =>
    mesh(new THREE.SphereGeometry(r, hero ? 24 : 10, hero ? 16 : 6), mat, x, y, z, parent);
  const perforatedShroud = () => {
    const radial = hero ? 96 : 48,
      axial = hero ? 70 : 35,
      vertices = [],
      uv = [];
    const point = (a, t) => [Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.2 - t * 0.24];
    for (let row = 0; row < axial; row++)
      for (let col = 0; col < radial; col++) {
        const t = (row + 0.5) / axial,
          a = ((col + 0.5) / radial) * Math.PI * 2;
        const holeAngle = ((a + Math.PI / 6) % (Math.PI / 3)) - Math.PI / 6;
        let hole = false;
        for (let i = 0; i < 5; i++)
          if ((holeAngle / 0.155) ** 2 + ((t - (0.13 + i * 0.185)) / 0.047) ** 2 < 1) hole = true;
        if (hole) continue;
        for (const [c, r] of [
          [col, row],
          [col, row + 1],
          [col + 1, row],
          [col, row + 1],
          [col + 1, row + 1],
          [col + 1, row],
        ]) {
          vertices.push(...point((c / radial) * Math.PI * 2, r / axial));
          uv.push(c / radial, r / axial);
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    mesh(geo, m.olive);
    for (const z of [-0.2, -0.44]) ring(m.olive, 0.05, 0.0025, 0, 0, z);
  };
  const screw = (x, y, z, parent = root) => {
    const obj = mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.003, hero ? 20 : 8),
      m.edge,
      x,
      y,
      z,
      parent,
    );
    obj.rotation.z = Math.PI / 2;
    block(m.dark, x + (x > 0 ? 0.002 : -0.002), y, z, 0.001, 0.002, 0.008, parent);
  };
  const trigger = (z = 0.055) => {
    const hoop = ring(m.steel, 0.04, 0.006, 0, -0.087, z);
    hoop.rotation.y = Math.PI / 2;
    hoop.scale.y = 0.76;
    rod(m.dark, [0, -0.065, z - 0.017], [0, -0.105, z - 0.005], 0.005);
  };
  const grip = (mat = m.rubber, z = 0.11) => {
    profile(
      mat,
      [
        [z - 0.045, -0.028],
        [z + 0.024, -0.044],
        [z + 0.061, -0.217],
        [z - 0.018, -0.222],
      ],
      0.065,
    );
    for (let i = 0; i < 6; i++) block(m.dark, 0, -0.11 - i * 0.016, z + 0.018, 0.068, 0.004, 0.055);
    trigger(z - 0.066);
  };
  const stock = (mat = m.wood, start = 0.17, end = 0.53) => {
    profile(
      mat,
      [
        [start, 0.022],
        [start + 0.11, -0.025],
        [end, -0.03],
        [end, -0.19],
        [end - 0.08, -0.19],
        [start + 0.06, -0.075],
        [start, -0.07],
      ],
      0.072,
    );
    block(m.rubber, 0, -0.105, end + 0.009, 0.088, 0.178, 0.022);
    for (const side of [-1, 1])
      rod(m.edge, [side * 0.04, -0.08, end - 0.09], [side * 0.04, -0.12, end - 0.09], 0.004);
  };
  const mag = (mat, points, width) => profile(mat, points, width, magazine);
  const pistol = kind === 'pistol',
    smg = kind === 'smg',
    lmg = kind === 'lmg',
    shotgun = kind === 'shotgun',
    scout = kind === 'scout';
  const muzzle = pistol
    ? -0.33
    : smg
      ? -0.54
      : scout
        ? -0.97
        : shotgun
          ? -0.85
          : lmg
            ? -0.94
            : -0.79;
  const sightY =
    sight === 'scope' ? 0.19 : optic ? 0.16 : pistol ? 0.071 : shotgun ? 0.047 : smg ? 0.08 : 0.091;
  let pump = null;
  let supportGrip = [0, -0.055, -0.32],
    rightGrip = [0, -0.14, 0.125];
  if (pistol) {
    // m/40 family: exposed barrel ahead of a bulky rectangular breech and swept grip.
    profile(
      m.steel,
      [
        [-0.15, 0.055],
        [0.085, 0.055],
        [0.115, 0.015],
        [0.085, -0.055],
        [-0.16, -0.045],
      ],
      0.085,
      action,
    );
    tube(m.dark, 0.018, 0.21, 0, 0.005, -0.231);
    tube(m.steel, 0.026, 0.045, 0, 0.005, -0.141);
    profile(
      m.dark,
      [
        [-0.1, -0.04],
        [0.085, -0.04],
        [0.134, -0.235],
        [0.057, -0.255],
        [0.018, -0.099],
        [-0.1, -0.083],
      ],
      0.062,
    );
    profile(
      m.walnut,
      [
        [0.065, -0.089],
        [0.096, -0.094],
        [0.129, -0.223],
        [0.063, -0.237],
        [0.031, -0.111],
      ],
      0.071,
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++)
        block(m.dark, side * 0.039, -0.129 - i * 0.012, 0.071 + i * 0.003, 0.003, 0.004, 0.035);
    trigger(-0.035);
    mag(
      m.dark,
      [
        [0.06, -0.2],
        [0.115, -0.2],
        [0.133, -0.257],
        [0.058, -0.265],
      ],
      0.064,
    );
    block(m.edge, -0.045, 0.039, -0.019, 0.009, 0.012, 0.055, action);
    rightGrip = [0, -0.15, 0.085];
    supportGrip = [0, -0.14, 0.07];
  } else if (smg) {
    // Kpist m/45: tubular receiver, perforated shroud, straight magazine and wire stock.
    tube(m.olive, 0.046, 0.34, 0, 0, -0.025);
    tube(m.dark, 0.025, 0.34, 0, 0, -0.37);
    perforatedShroud();
    ring(m.edge, 0.047, 0.005, 0, 0, 0.132);
    grip(m.walnut, 0.105);
    mag(
      m.steel,
      [
        [-0.139, -0.035],
        [-0.061, -0.035],
        [-0.042, -0.327],
        [-0.12, -0.327],
      ],
      0.057,
    );
    for (const side of [-1, 1])
      block(m.edge, side * 0.03, -0.196, -0.093, 0.003, 0.207, 0.008, magazine);
    for (const side of [-1, 1]) {
      rod(m.olive, [side * 0.045, -0.025, 0.11], [side * 0.062, -0.028, 0.5], 0.012);
      rod(m.olive, [side * 0.062, -0.028, 0.5], [side * 0.062, -0.18, 0.51], 0.012);
    }
    rod(m.olive, [-0.062, -0.18, 0.51], [0.062, -0.18, 0.51], 0.012);
    block(m.dark, 0.048, 0.008, 0.035, 0.008, 0.024, 0.125);
    rod(m.edge, [0.045, 0.015, 0.025], [0.091, 0.015, 0.025], 0.012, action);
    supportGrip = [0, -0.105, -0.092];
  } else if (scout) {
    // m/96: long walnut stock, stepped barrel, bent bolt handle and narrow receiver.
    profile(
      m.wood,
      [
        [-0.64, -0.018],
        [-0.34, -0.026],
        [-0.07, -0.032],
        [0.14, -0.047],
        [0.3, -0.095],
        [0.54, -0.045],
        [0.55, -0.205],
        [0.4, -0.216],
        [0.18, -0.099],
        [-0.08, -0.103],
        [-0.64, -0.067],
      ],
      0.077,
    );
    tube(m.steel, 0.025, 0.42, 0, 0.003, -0.08);
    tube(m.dark, 0.016, 0.7, 0, 0.005, -0.62);
    for (const z of [-0.51, -0.65]) ring(m.steel, 0.04, 0.008, 0, -0.032, z);
    block(m.rubber, 0, -0.125, 0.551, 0.084, 0.17, 0.018);
    rod(m.edge, [0.014, 0.025, 0.055], [0.094, 0.012, 0.075], 0.011, action);
    rod(m.edge, [0.094, 0.012, 0.075], [0.097, -0.052, 0.08], 0.012, action);
    ball(m.steel, 0.023, 0.098, -0.057, 0.08, action);
    trigger(0.125);
    mag(
      m.steel,
      [
        [-0.07, -0.085],
        [0.07, -0.085],
        [0.05, -0.11],
        [-0.06, -0.11],
      ],
      0.04,
    );
    rightGrip = [0, -0.092, 0.19];
    supportGrip = [0, -0.087, -0.32];
  } else if (shotgun) {
    profile(
      m.steel,
      [
        [-0.25, 0.042],
        [0.17, 0.042],
        [0.2, 0.003],
        [0.14, -0.074],
        [-0.24, -0.074],
      ],
      0.084,
    );
    tube(m.dark, 0.023, 0.64, 0, 0.006, -0.53);
    tube(m.steel, 0.018, 0.55, 0, -0.058, -0.469);
    stock(m.walnut, 0.14, 0.56);
    trigger(0.082);
    pump = new THREE.Group();
    pump.position.z = -0.43;
    root.add(pump);
    profile(
      m.wood,
      [
        [-0.125, 0.004],
        [0.107, 0.004],
        [0.119, -0.079],
        [-0.128, -0.082],
      ],
      0.095,
      pump,
    );
    for (let i = 0; i < 10; i++) {
      const hoop = ring(m.walnut, 0.046, 0.004, 0, -0.038, -0.107 + i * 0.022, pump);
      hoop.scale.y = 0.95;
    }
    block(m.dark, 0.044, 0, -0.06, 0.006, 0.035, 0.13);
    block(m.edge, 0.048, 0, -0.012, 0.009, 0.018, 0.045, action);
    mag(
      m.brass,
      [
        [-0.038, -0.065],
        [0.038, -0.065],
        [0.038, -0.08],
        [-0.038, -0.08],
      ],
      0.02,
    );
    rightGrip = [0, -0.082, 0.18];
    supportGrip = [0, -0.1, -0.43];
  } else if (lmg) {
    profile(
      m.steel,
      [
        [-0.29, 0.051],
        [0.21, 0.051],
        [0.23, -0.058],
        [-0.3, -0.063],
      ],
      0.118,
    );
    block(m.dark, 0, 0.062, -0.038, 0.13, 0.016, 0.34);
    grip(m.rubber, 0.14);
    stock(m.wood, 0.21, 0.59);
    tube(m.steel, 0.028, 0.69, 0, -0.012, -0.587);
    tube(m.dark, 0.014, 0.53, 0, -0.07, -0.55);
    profile(
      m.olive,
      [
        [-0.59, -0.011],
        [-0.28, -0.011],
        [-0.28, -0.096],
        [-0.59, -0.07],
      ],
      0.073,
    );
    for (let i = 0; i < 8; i++) block(m.dark, 0.04, -0.03, -0.57 + i * 0.031, 0.006, 0.011, 0.018);
    // Folded carry handle sits to the side, leaving an unobstructed sight picture.
    rod(m.steel, [0.075, 0.035, -0.16], [0.145, 0.075, -0.13]);
    rod(m.rubber, [0.145, 0.075, -0.13], [0.145, 0.075, 0.023], 0.017);
    mag(
      m.canvas,
      [
        [-0.16, -0.09],
        [0.045, -0.09],
        [0.045, -0.31],
        [-0.16, -0.31],
      ],
      0.19,
    );
    magazine.position.x = -0.12;
    for (let i = 0; i < 9; i++) {
      const x = -0.068 - i * 0.019,
        y = 0.002 - Math.max(0, i - 3) * 0.016;
      tube(m.brass, 0.008, 0.059, x, y, -0.039);
      const tip = mesh(
        new THREE.CylinderGeometry(0.002, 0.006, 0.025, hero ? 20 : 8),
        m.brass,
        x,
        y,
        -0.081,
      );
      tip.rotation.x = -Math.PI / 2;
      ring(m.steel, 0.008, 0.0018, x, y, -0.025);
      tube(m.dark, 0.009, 0.012, x, y, -0.02);
    }
    for (const side of [-1, 1]) {
      rod(m.steel, [side * 0.029, -0.036, -0.72], [side * 0.11, -0.24, -0.66], 0.01);
      block(m.dark, side * 0.11, -0.239, -0.66, 0.045, 0.012, 0.07);
    }
    block(m.dark, 0.062, -0.009, 0.032, 0.008, 0.036, 0.2);
    rod(m.edge, [0.065, 0, 0.085], [0.11, 0, 0.085], 0.009, action);
    supportGrip = [0, -0.11, -0.32];
  } else {
    // AK4/G3 family: stamped receiver, cocking tube, slim green handguard and box magazine.
    profile(
      m.steel,
      [
        [-0.25, 0.052],
        [0.2, 0.052],
        [0.22, -0.053],
        [-0.22, -0.06],
        [-0.25, -0.03],
      ],
      0.084,
    );
    tube(m.steel, 0.019, 0.43, 0, 0.032, -0.37);
    tube(m.dark, 0.017, 0.55, 0, -0.012, -0.517);
    profile(
      m.olive,
      [
        [-0.56, 0.018],
        [-0.255, 0.033],
        [-0.25, -0.075],
        [-0.55, -0.048],
      ],
      0.073,
    );
    for (let i = 0; i < 7; i++)
      for (const side of [-1, 1])
        block(m.dark, side * 0.039, -0.015, -0.521 + i * 0.034, 0.003, 0.014, 0.018);
    grip(m.rubber, 0.127);
    stock(m.olive, 0.195, 0.55);
    mag(
      m.steel,
      [
        [-0.119, -0.042],
        [-0.017, -0.043],
        [0.015, -0.275],
        [-0.081, -0.286],
      ],
      0.061,
    );
    for (const side of [-1, 1])
      for (const dz of [0, 0.037])
        rod(
          m.edge,
          [side * 0.032, -0.086, -0.09 + dz],
          [side * 0.032, -0.253, -0.068 + dz],
          0.003,
          magazine,
        );
    block(m.dark, 0.045, 0.01, -0.025, 0.007, 0.032, 0.11);
    block(m.edge, 0.051, 0.02, 0.022, 0.012, 0.018, 0.027, action);
    rod(m.steel, [-0.026, 0.04, -0.42], [-0.071, 0.04, -0.42], 0.012);
    ball(m.rubber, 0.016, -0.076, 0.04, -0.42);
    for (const side of [-1, 1]) block(m.edge, side * 0.046, 0.012, 0.127, 0.003, 0.003, 0.055);
  }
  const boreY = pistol || scout || shotgun ? 0.005 : lmg || kind === 'rifle' ? -0.012 : 0;
  tube(m.dark, pistol ? 0.02 : 0.023, 0.038, 0, boreY, muzzle + 0.019, root, true);
  ring(m.edge, pistol ? 0.019 : 0.022, 0.004, 0, boreY, muzzle);
  if (!pistol)
    for (const side of [-1, 1])
      for (const z of [0.125, -0.19]) ball(m.edge, 0.004, side * 0.048, -0.016, z);
  // Open optics: no opaque lens or cap can cover the view through the reticle.
  if (sight === 'scope') {
    tube(m.dark, 0.056, 0.27, 0, sightY, -0.11, root, true);
    tube(m.dark, 0.079, 0.095, 0, sightY, -0.29, root, true);
    ring(m.rubber, 0.058, 0.009, 0, sightY, 0.027);
    ring(m.edge, 0.079, 0.006, 0, sightY, -0.339);
    for (const z of [-0.04, -0.19]) {
      ring(m.steel, 0.058, 0.005, 0, sightY, z);
      block(m.steel, 0, 0.082, z, 0.035, 0.102, 0.045);
    }
    block(m.dark, 0, sightY + 0.065, -0.11, 0.04, 0.035, 0.04);
    tube(m.steel, 0.019, 0.022, 0.072, sightY, -0.11).rotation.z = Math.PI / 2;
  } else if (optic) {
    if (sight === 'holographic') {
      for (const side of [-1, 1]) block(m.dark, side * 0.06, sightY, -0.055, 0.013, 0.096, 0.075);
      block(m.dark, 0, sightY + 0.049, -0.055, 0.12, 0.012, 0.075);
      block(m.dark, 0, sightY - 0.049, -0.055, 0.12, 0.012, 0.075);
      ring(m.brass, 0.017, 0.002, 0, sightY, -0.1);
    } else {
      tube(m.dark, 0.059, 0.105, 0, sightY, -0.07, root, true);
      ring(m.edge, 0.059, 0.005, 0, sightY, -0.016);
    }
    block(m.dark, 0, 0.074, -0.06, 0.07, 0.052, 0.065);
    ball(m.lamp, 0.0025, 0, sightY, -0.11);
  } else {
    const front = muzzle + 0.05,
      rear = pistol ? 0.055 : 0.13;
    if (WEAPONS[kind].sight === 'aperture') ring(m.steel, 0.018, 0.005, 0, sightY, rear);
    else
      for (const side of [-1, 1])
        block(m.steel, side * 0.024, sightY - 0.014, rear, 0.012, 0.043, 0.018);
    block(m.dark, 0, (boreY + sightY - 0.018) / 2, front, 0.018, sightY - 0.018 - boreY, 0.022);
    block(m.edge, 0, sightY - 0.009, front, 0.005, 0.018, 0.009);
    block(m.dark, 0, sightY - 0.041, rear, 0.045, 0.024, 0.028);
  }
  if (mods.muzzle === 'suppressor') {
    tube(m.dark, 0.037, 0.24, 0, boreY, muzzle - 0.09, root, true);
    for (const z of [muzzle + 0.025, muzzle - 0.2]) ring(m.edge, 0.037, 0.003, 0, boreY, z);
  }
  if (mods.utility === 'flashlight') {
    tube(m.dark, 0.027, 0.135, 0.083, -0.025, -0.35);
    tube(m.lamp, 0.024, 0.004, 0.083, -0.025, -0.419);
    block(m.steel, 0.054, -0.024, -0.32, 0.055, 0.022, 0.028);
  }
  if (mods.underbarrel === 'bipod')
    for (const side of [-1, 1]) {
      rod(m.steel, [side * 0.028, -0.058, -0.48], [side * 0.115, -0.27, -0.43], 0.009);
      block(m.rubber, side * 0.115, -0.27, -0.43, 0.04, 0.016, 0.04);
    }
  if (mods.underbarrel?.includes('grip')) {
    const obj = block(m.rubber, 0, -0.155, -0.32, 0.039, 0.155, 0.053);
    obj.rotation.x = mods.underbarrel === 'angled_grip' ? 0.5 : 0;
    supportGrip = [0, -0.155, -0.32];
  }
  if (mods.magazine === 'extended_mag') magazine.scale.y = 1.4;
  if (mods.magazine === 'quick_mag')
    block(m.canvas, 0, -0.29, -0.056, 0.077, 0.037, 0.098, magazine);
  if (mods.stock)
    block(
      mods.stock === 'light_stock' ? m.steel : m.rubber,
      0,
      -0.105,
      0.579,
      mods.stock === 'light_stock' ? 0.04 : 0.11,
      0.175,
      0.033,
    );
  // Fasteners, milled seams, selector and sling fittings remain outside the sight line.
  const width = pistol ? 0.045 : lmg ? 0.062 : smg ? 0.047 : 0.044;
  for (const side of [-1, 1]) {
    screw(side * width, -0.02, pistol ? 0.04 : 0.09);
    screw(side * width, -0.04, pistol ? -0.09 : -0.17);
    if (!scout) {
      block(m.dark, side * width, 0.013, -0.075, 0.002, 0.003, pistol ? 0.1 : 0.24);
      rod(
        m.edge,
        [side * (width + 0.003), -0.036, 0.07],
        [side * (width + 0.003), -0.018, 0.1],
        0.004,
      );
    }
  }
  if (hero) {
    for (let i = 0; i < (pistol ? 7 : 12); i++)
      block(
        m.dark,
        width + 0.003,
        -0.045,
        pistol ? -0.105 + i * 0.005 : -0.15 + i * 0.008,
        0.002,
        0.008,
        0.002,
      );
    for (const z of [muzzle + 0.13, pistol ? 0.08 : 0.45]) {
      const loop = ring(m.steel, 0.013, 0.0025, width, -0.045, z);
      loop.rotation.y = Math.PI / 2;
    }
  }
  // Merge only rigid pieces sharing a material. Magazines, actions and pumps remain separate.
  const baked = [];
  for (const group of [root, action, magazine, pump].filter(Boolean)) {
    const buckets = new Map();
    for (const obj of [...group.children])
      if (obj.isMesh) {
        obj.updateMatrix();
        let geo = obj.geometry.clone().applyMatrix4(obj.matrix);
        if (geo.index) {
          const old = geo;
          geo = old.toNonIndexed();
          old.dispose();
        }
        geo.clearGroups();
        if (!buckets.has(obj.material)) buckets.set(obj.material, []);
        buckets.get(obj.material).push(geo);
        group.remove(obj);
      }
    for (const [mat, list] of buckets) {
      const geo = mergeGeometries(list);
      list.forEach((g) => g.dispose());
      baked.push(geo);
      group.add(new THREE.Mesh(geo, mat));
    }
  }
  owned.forEach((g) => g.dispose());
  root.userData = {
    geometries: baked,
    detail,
    magazine,
    magazineY: magazine.position.y,
    action,
    pump,
    muzzle: mods.muzzle === 'suppressor' ? muzzle - 0.21 : muzzle,
    sightY,
    kind,
    supportGrip,
    rightGrip,
  };
  return root;
}
