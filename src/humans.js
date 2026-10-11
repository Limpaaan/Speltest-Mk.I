import { applyHumanMotion, reachHand } from './human-motion.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PROFESSIONS = {
  stalvakt: 'Stålverksarbetare',
  skogsvandrare: 'Skogsarbetare',
  kopparslagare: 'Industrismed',
  alvvakt: 'Räddningstjänst',
  faltvardare: 'Sjuksköterska',
  bruksingenjor: 'Elektriker',
  artist: 'Konstnär',
};
const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const skinMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
const weavePixels = new Uint8Array(64 * 64 * 4);
for (let y = 0; y < 64; y++)
  for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4,
      light = 225 + ((x * 31 + y * 17) % 19) + (x % 3 === 0 ? 8 : 0);
    weavePixels[i] = weavePixels[i + 1] = weavePixels[i + 2] = light;
    weavePixels[i + 3] = 255;
  }
const weave = new THREE.DataTexture(weavePixels, 64, 64);
weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
weave.repeat.set(5, 5);
weave.magFilter = THREE.LinearFilter;
weave.needsUpdate = true;
cloth.map = weave;

const unitSphere = new THREE.SphereGeometry(1, 16, 12);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const palettes = {
  stalvakt: ['#d88a38', '#243c50', '#c6c9b8'],
  skogsvandrare: ['#5b6546', '#3b4140', '#a64a35'],
  kopparslagare: ['#6f5140', '#343c40', '#b7a58a'],
  alvvakt: ['#24394d', '#243544', '#ddc967'],
  faltvardare: ['#6b9a9e', '#304b66', '#d4dbd0'],
  bruksingenjor: ['#d0ae47', '#3b4247', '#c7c6b6'],
  artist: ['#455b78', '#424745', '#d2c4a6'],
};
function seeded(text) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
}
// Bake static details per animated limb into one vertex-coloured mesh. Faces do not cost a draw call per feature.
function builder(parent, owned, material = cloth) {
  const pieces = [];
  const add = (geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
        new THREE.Vector3(sx, sy, sz),
      ),
    );
    const c = new THREE.Color(color),
      values = [];
    for (let i = 0; i < g.attributes.position.count; i++) values.push(c.r, c.g, c.b);
    g.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
    pieces.push(g);
  };
  return {
    add,
    oval: (color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) =>
      add(unitSphere, color, x, y, z, sx, sy, sz, rx, ry, rz),
    box: (color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) =>
      add(unitBox, color, x, y, z, sx, sy, sz, rx, ry, rz),
    cylinder: (color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) =>
      add(unitCylinder, color, x, y, z, sx, sy, sz, rx, ry, rz),
    line: (color, points, radius = 0.004) => {
      const curve = new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v)));
      const geo = new THREE.TubeGeometry(curve, 10, radius, 6, false);
      add(geo, color, 0, 0, 0);
      geo.dispose();
    },
    finish() {
      if (!pieces.length) return;
      const geometry = mergeGeometries(pieces);
      pieces.forEach((g) => g.dispose());
      owned.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    },
  };
}
function joint(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}
function capsule(b, color, radius, length, x, y, z, sx = 1, sz = 1) {
  const g = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 12);
  b.add(g, color, x, y, z, sx, 1, sz);
  g.dispose();
}
function torsoGeometry(width) {
  const profile = [
    [0.17, -0.05],
    [0.195, 0.04],
    [0.175, 0.17],
    [0.215, 0.35],
    [0.245, 0.46],
    [0.2, 0.5],
    [0.075, 0.55],
  ];
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r * width, y)),
    24,
  );
}
export function createHuman(entity, weaponFactory) {
  const profession = entity.appearanceRole || entity.classId || 'enemy';
  const random = seeded(`${entity.name || entity.id || profession}:${profession}`);
  const pick = (a) => a[Math.floor(random() * a.length)];
  const female =
    entity.id === 'liv' || entity.id === 'maja' || (entity.id !== 'anders' && random() > 0.55);
  const old = entity.id === 'torsten' || entity.id === 'einar' || random() > 0.7;
  const skin = pick(['#d5ac8d', '#bc8e6d', '#997052', '#78523d', '#e1baa1', '#ac8065']);
  const shadow = new THREE.Color(skin).multiplyScalar(0.7).getStyle();
  const hair = old
    ? pick(['#898985', '#a8a6a0', '#747573'])
    : pick(['#372d26', '#61503b', '#292a28', '#8b6845', '#b9a476']);
  const rolePalette =
    palettes[profession] ||
    (entity.type === 'marksman'
      ? ['#62594e', '#343e3a', '#7c3734']
      : ['#586252', '#353d39', '#89826b']);
  const [coat, pants, trim] = rolePalette;
  const width = (female ? 0.92 : 1.02) + (random() - 0.5) * 0.16;
  const stature = 0.97 + random() * 0.045;
  const group = new THREE.Group(),
    owned = [],
    pelvis = joint(group, 0, 0.93, 0),
    torso = joint(pelvis, 0, 0, 0);
  const body = builder(torso, owned),
    geo = torsoGeometry(width);
  body.add(geo, coat, 0, 0, 0, 1, 1, 0.59);
  geo.dispose();
  body.box(pants, 0, 0, 0, 0.35 * width, 0.14, 0.23);
  body.box('#3c342e', 0, 0.015, 0, 0.36 * width, 0.045, 0.245);
  body.box('#a7a699', 0, 0.015, 0.128, 0.055, 0.04, 0.018);
  // Shirt collar, zip, seams, jacket pockets and rolled cuffs remain readable up close.
  body.line(
    trim,
    [
      [-0.085, 0.51, 0.083],
      [-0.075, 0.45, 0.12],
      [0, 0.5, 0.11],
      [0.075, 0.45, 0.12],
      [0.085, 0.51, 0.083],
    ],
    0.013,
  );
  body.box('#333a36', 0, 0.25, 0.127, 0.014, 0.41, 0.015);
  for (const side of [-1, 1]) {
    body.box(
      new THREE.Color(coat).multiplyScalar(0.82).getStyle(),
      side * 0.115,
      0.2,
      0.13,
      0.09,
      0.1,
      0.025,
    );
    body.box(trim, side * 0.115, 0.25, 0.146, 0.095, 0.012, 0.01);
    body.line(
      '#40413b',
      [
        [side * 0.17, 0.1, 0.075],
        [side * 0.19, 0.3, 0.08],
        [side * 0.23, 0.43, 0.04],
      ],
      0.003,
    );
  }
  if (['stalvakt', 'alvvakt', 'bruksingenjor'].includes(profession)) {
    body.box(trim, 0, 0.14, 0.146, 0.36 * width, 0.035, 0.015);
    for (const side of [-1, 1]) body.box(trim, side * 0.12, 0.37, 0.131, 0.032, 0.24, 0.015);
  }
  if (profession === 'skogsvandrare') {
    for (let i = 0; i < 6; i++) body.box(trim, 0, 0.18 + i * 0.046, 0.14, 0.32, 0.006, 0.008);
    for (let i = -2; i <= 2; i++) body.box('#303b33', i * 0.056, 0.3, 0.145, 0.007, 0.3, 0.008);
  }
  if (profession === 'kopparslagare' || profession === 'artist') {
    body.box(trim, 0, 0.19, 0.15, 0.32, 0.39, 0.028);
    body.box(trim, 0, -0.1, 0.14, 0.34, 0.25, 0.028);
    for (const side of [-1, 1])
      body.line(
        '#5f5140',
        [
          [side * 0.12, 0.19, 0.17],
          [side * 0.13, 0.51, 0.08],
          [side * 0.1, 0.53, -0.07],
        ],
        0.013,
      );
    if (profession === 'artist')
      for (let i = 0; i < 16; i++)
        body.oval(
          pick(['#724e3c', '#54776f', '#c0a344']),
          (random() - 0.5) * 0.28,
          random() * 0.35,
          0.17,
          0.008,
          0.015,
          0.003,
        );
  }
  if (profession === 'faltvardare') {
    body.box('#e3e5d9', -0.11, 0.4, 0.133, 0.07, 0.08, 0.018);
    body.box('#44796b', -0.11, 0.4, 0.147, 0.042, 0.011, 0.007);
    body.box('#44796b', -0.11, 0.4, 0.147, 0.011, 0.042, 0.007);
    body.line(
      '#3b4a42',
      [
        [0.19, 0.47, 0.1],
        [-0.2, 0.08, 0.15],
        [-0.2, -0.12, 0.1],
      ],
      0.014,
    );
    body.box('#61796a', -0.23, -0.02, 0.1, 0.16, 0.22, 0.1);
  }
  if (profession === 'bruksingenjor') {
    for (let i = 0; i < 3; i++) {
      body.box('#524539', 0.2, -0.04, -0.08 + i * 0.07, 0.09, 0.13, 0.055);
      body.cylinder('#cf9a53', 0.22, 0.035, -0.08 + i * 0.07, 0.015, 0.09, 0.015);
    }
  }
  if (entity.type === 'heavy' || entity.type === 'boss') {
    body.oval('#444c49', 0, 0.32, 0.09, 0.235, 0.21, 0.12);
    for (const side of [-1, 1]) body.oval('#555f58', side * 0.24, 0.43, 0, 0.12, 0.12, 0.12);
    body.box(trim, 0, 0.38, 0.204, 0.14, 0.035, 0.025);
  }
  if (entity.armed !== false && profession !== 'artist')
    body.line(
      '#3c423a',
      [
        [0.18, 0.49, 0.15],
        [-0.16, 0.05, 0.18],
        [-0.19, 0.05, -0.1],
        [0.18, 0.49, -0.09],
      ],
      0.012,
    );
  body.cylinder(skin, 0, 0.55, 0, 0.055, 0.12, 0.055);
  body.finish();

  const head = joint(torso, 0, 0.725, 0),
    face = builder(head, owned, skinMaterial);
  const faceWidth = 0.096 + (random() - 0.5) * 0.012;
  face.oval(skin, 0, 0, 0, faceWidth, 0.13, 0.098);
  face.oval(skin, 0, -0.075, 0.028, faceWidth * 0.83, 0.07, 0.072);
  face.oval(skin, 0, -0.112, 0.043, 0.056, 0.026, 0.054);
  for (const side of [-1, 1]) {
    face.oval(skin, side * (faceWidth + 0.005), -0.015, -0.001, 0.022, 0.039, 0.017);
    face.oval(shadow, side * (faceWidth + 0.008), -0.012, 0.013, 0.01, 0.023, 0.006);
    face.oval(skin, side * 0.049, -0.031, 0.054, 0.04, 0.035, 0.035);
  }
  face.oval(skin, 0, -0.017, 0.087, 0.013, 0.039, 0.026);
  face.oval(skin, 0, -0.041, 0.109, 0.017, 0.014, 0.018);
  for (const side of [-1, 1]) face.oval(shadow, side * 0.009, -0.048, 0.118, 0.003, 0.002, 0.002);
  const expression = entity.type ? 'stern' : pick(['tired', 'focused', 'kind']);
  const mouth = expression === 'kind' ? -0.062 : -0.069;
  face.line(
    '#77574d',
    [
      [-0.031, mouth, 0.102],
      [0, -0.072, 0.111],
      [0.031, mouth, 0.102],
    ],
    0.0035,
  );
  face.line(
    skin,
    [
      [-0.029, mouth - 0.007, 0.103],
      [0, -0.081, 0.11],
      [0.029, mouth - 0.007, 0.103],
    ],
    0.004,
  );
  for (const side of [-1, 1]) {
    const inner = expression === 'stern' ? 0.037 : 0.052;
    face.line(
      hair,
      [
        [side * 0.016, inner, 0.095],
        [side * 0.041, 0.057, 0.094],
        [side * 0.071, 0.049, 0.078],
      ],
      0.005,
    );
    if (old) {
      face.line(
        shadow,
        [
          [side * 0.032, -0.018, 0.096],
          [side * 0.058, -0.02, 0.087],
          [side * 0.075, -0.013, 0.073],
        ],
        0.0018,
      );
      face.line(
        shadow,
        [
          [side * 0.024, -0.055, 0.11],
          [side * 0.042, -0.085, 0.093],
        ],
        0.0016,
      );
    }
  }
  // Hair cap follows the cranium; long hair/bun or a beard alters the silhouette.
  const hairCap = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.49);
  face.add(hairCap, hair, 0, 0.012, -0.007, faceWidth * 1.035, 0.126, 0.102);
  hairCap.dispose();
  if (female) {
    face.oval(hair, 0, -0.002, -0.07, faceWidth * 0.99, 0.125, 0.067);
    face.oval(hair, 0.019, -0.035, -0.129, 0.052, 0.067, 0.044);
    face.line(
      hair,
      [
        [-0.074, 0.08, 0.038],
        [-0.092, 0.02, 0.021],
        [-0.086, -0.061, 0.008],
      ],
      0.013,
    );
  } else if (old || random() > 0.5) {
    face.oval(hair, 0, -0.105, 0.043, 0.071, 0.037, 0.065);
    for (const side of [-1, 1]) face.oval(hair, side * 0.066, -0.077, 0.042, 0.018, 0.045, 0.042);
    face.line(
      hair,
      [
        [-0.032, -0.06, 0.104],
        [0, -0.058, 0.12],
        [0.032, -0.06, 0.104],
      ],
      0.007,
    );
  }
  if (profession === 'stalvakt' || profession === 'alvvakt' || entity.type === 'heavy') {
    const hat = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.53);
    face.add(
      hat,
      profession === 'alvvakt' ? '#c0bd71' : trim,
      0,
      0.045,
      -0.008,
      0.118,
      0.115,
      0.119,
    );
    hat.dispose();
    face.oval(trim, 0, 0.04, 0.035, 0.123, 0.014, 0.15);
  } else if (
    profession === 'skogsvandrare' ||
    profession === 'artist' ||
    entity.type === 'marksman'
  ) {
    face.oval(hair, 0, 0.1, -0.014, 0.109, 0.056, 0.111);
    if (profession === 'skogsvandrare') face.oval(coat, 0, 0.05, 0.085, 0.108, 0.014, 0.09);
    if (profession === 'artist') face.oval('#363f3b', -0.02, 0.112, -0.014, 0.124, 0.045, 0.117);
  }
  if (profession === 'kopparslagare' || (old && random() > 0.5)) {
    for (const side of [-1, 1]) {
      const y = profession === 'kopparslagare' ? 0.078 : 0.019;
      face.line(
        '#4a4f47',
        [
          [side * 0.012, y + 0.021, 0.107],
          [side * 0.063, y + 0.021, 0.091],
          [side * 0.068, y - 0.015, 0.091],
          [side * 0.012, y - 0.015, 0.108],
          [side * 0.012, y + 0.021, 0.107],
        ],
        0.003,
      );
    }
    face.line(
      '#4a4f47',
      [
        [-0.013, 0.027, 0.107],
        [0, 0.03, 0.112],
        [0.013, 0.027, 0.107],
      ],
      0.003,
    );
  }
  face.finish();
  const eyes = joint(head, 0, 0.02, 0),
    eye = builder(eyes, owned, skinMaterial),
    iris = pick(['#53636b', '#665640', '#4b5441']);
  for (const side of [-1, 1]) {
    eye.oval('#d3cfc0', side * 0.04, 0, 0.083, 0.019, 0.008, 0.012);
    eye.oval(iris, side * 0.04, 0, 0.094, 0.006, 0.006, 0.002);
    eye.oval('#1f2422', side * 0.04, 0, 0.096, 0.003, 0.004, 0.001);
    eye.oval('#e8e4d7', side * 0.042, 0.003, 0.098, 0.001, 0.001, 0.001);
  }
  eye.finish();
  const legs = [],
    arms = [];
  for (const side of [-1, 1]) {
    const hip = joint(pelvis, side * 0.105 * width, 0, 0),
      thigh = builder(hip, owned);
    capsule(thigh, pants, 0.085, 0.42, 0, -0.2, 0, 1, 1.02);
    thigh.box('#434b45', side * 0.044, -0.18, 0.07, 0.065, 0.14, 0.04);
    thigh.finish();
    const knee = joint(hip, 0, -0.41, 0),
      shin = builder(knee, owned);
    capsule(shin, pants, 0.062, 0.4, 0, -0.19, 0);
    shin.oval(pants, 0, -0.012, 0.03, 0.063, 0.07, 0.034);
    const ankle = joint(knee, 0, -0.4, 0),
      boot = builder(ankle, owned);
    boot.oval('#363834', 0, -0.045, 0.045, 0.068, 0.075, 0.145);
    boot.box('#252d29', 0, -0.09, 0.045, 0.14, 0.025, 0.28);
    boot.oval('#4b4a41', 0, -0.006, -0.018, 0.069, 0.08, 0.076);
    for (let i = 0; i < 4; i++)
      boot.line(
        '#9a9884',
        [
          [-0.028, -0.003 + i * 0.013, 0.093],
          [0.027, 0.007 + i * 0.013, 0.093],
        ],
        0.002,
      );
    boot.finish();
    if (profession === 'alvvakt' || profession === 'stalvakt')
      shin.cylinder(trim, 0, -0.21, 0, 0.064, 0.026, 0.064);
    shin.finish();
    legs.push({ hip, knee, ankle });
    const shoulder = joint(torso, side * 0.23 * width, 0.455, 0),
      sleeve = builder(shoulder, owned);
    capsule(sleeve, coat, 0.064, 0.3, 0, -0.145, 0);
    sleeve.oval(coat, 0, -0.035, 0, 0.068, 0.075, 0.072);
    if (['stalvakt', 'alvvakt', 'bruksingenjor'].includes(profession))
      sleeve.cylinder(trim, 0, -0.14, 0, 0.066, 0.037, 0.067);
    sleeve.finish();
    const elbow = joint(shoulder, 0, -0.29, 0),
      forearm = builder(elbow, owned);
    const bare = profession === 'faltvardare' || profession === 'kopparslagare';
    capsule(forearm, bare ? skin : coat, 0.047, 0.27, 0, -0.13, 0);
    forearm.cylinder(bare ? skin : trim, 0, -0.242, 0, 0.049, 0.025, 0.049);
    forearm.finish();
    const wrist = joint(elbow, 0, -0.27, 0),
      palm = builder(wrist, owned);
    palm.oval(skin, 0, -0.043, 0.011, 0.044, 0.053, 0.025);
    palm.oval(skin, side * 0.042, -0.032, 0.023, 0.015, 0.033, 0.015, 0, 0, side * 0.35);
    palm.finish();
    const fingers = joint(wrist, 0, -0.084, 0.012),
      fingerShape = builder(fingers, owned);
    for (let f = 0; f < 4; f++)
      capsule(fingerShape, skin, 0.0075, 0.052, (f - 1.5) * 0.017, -0.023, 0, 0.95, 0.8);
    fingerShape.finish();
    arms.push({ shoulder, elbow, wrist, fingers });
  }
  const armed = entity.armed !== false && profession !== 'artist';
  const weapon =
    armed && weaponFactory
      ? weaponFactory(
          entity.weapon?.kind || (entity.type === 'rusher' ? 'smg' : 'rifle'),
          entity.weapon?.mods,
        )
      : null;
  if (weapon) {
    weapon.position.set(0.08, 0.3, 0.16);
    weapon.rotation.y = Math.PI;
    torso.add(weapon);
  }
  const cigarette = joint(arms[1].wrist, 0.018, -0.082, 0.025),
    cig = builder(cigarette, owned);
  cig.cylinder('#d9d6c9', 0, 0, 0.025, 0.006, 0.07, 0.006, Math.PI / 2);
  cig.oval('#d77a45', 0, 0, 0.061, 0.006, 0.006, 0.004);
  cig.finish();
  const tin = joint(arms[0].wrist, 0, -0.05, 0.032),
    tinShape = builder(tin, owned);
  tinShape.cylinder('#405365', 0, 0, 0, 0.031, 0.012, 0.031, Math.PI / 2);
  tinShape.finish();
  const parcel = joint(arms[0].wrist, 0, -0.04, 0.065),
    parcelShape = builder(parcel, owned);
  parcelShape.box('#aa9572', 0, 0, 0, 0.11, 0.09, 0.08);
  parcelShape.box('#485048', 0, 0, 0.043, 0.02, 0.09, 0.009);
  parcelShape.finish();
  const smoke = joint(torso, 0.02, 0.8, 0.15),
    smokeShape = builder(smoke, owned);
  smokeShape.oval('#acafa6', 0, 0, 0, 1, 0.45, 0.5);
  smokeShape.finish();
  smoke.scale.setScalar(0.025);
  // Sparse, subdued smoke is a stylised idle detail; not a particle emitter per actor.
  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: '#acafa6',
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  smoke.children[0].material = smokeMaterial;
  group.userData.extraMaterials = [smokeMaterial];
  const props = { cigarette, tin, parcel, smoke };
  for (const prop of Object.values(props)) prop.visible = false;
  group.userData.human = {
    props,
    skin,
    idleStyle: ['scratch', 'stretch', 'snus', 'smoke'][Math.floor(random() * 4)],
    pelvis,
    torso,
    head,
    eyes,
    legs,
    arms,
    weapon,
    armed,
    stature,
    width,
    phase: random() * 6,
    expression,
    profession,
    owned,
  };
  group.userData.geometries = owned;
  group.userData.ownMaterial = { dispose() {} }; // Shared materials are retained across actor lifetimes.
  group.scale.setScalar(stature);
  animateHuman(group, 0, {});
  return group;
}
export function animateHuman(
  group,
  time,
  {
    moving = false,
    sprinting = false,
    crouch = false,
    pitch = 0,
    reload = 0,
    drawing = false,
    look = 0,
    recoil = 0,
    gesture = null,
    combat = false,
    previewPose = null,
  } = {},
) {
  const rig = group.userData.human;
  if (!rig) return;
  const t = time * (sprinting ? 10 : 6.3) + rig.phase,
    walk = moving ? (crouch ? 0.15 : sprinting ? 0.65 : 0.42) : 0,
    breath = Math.sin(time * 1.8 + rig.phase) * 0.005;
  rig.pelvis.position.y =
    0.93 - (crouch ? 0.465 : 0) + breath + (moving ? Math.abs(Math.sin(t)) * 0.018 : 0);
  rig.torso.rotation.x = crouch ? 0.68 : sprinting ? 0.12 : 0;
  rig.head.rotation.set(
    -pitch * 0.35 - rig.torso.rotation.x,
    Math.max(-0.6, Math.min(0.6, look)) * 0.55,
    Math.sin(time * 0.43 + rig.phase) * 0.015,
  );
  const blink = (time + rig.phase) % (3.4 + rig.phase * 0.15);
  rig.eyes.scale.y = blink < 0.13 ? 0.12 : 1;
  rig.legs.forEach(({ hip, knee, ankle }, i) => {
    const step = Math.sin(t + i * Math.PI);
    hip.rotation.x = step * walk - (crouch ? 1.25 : 0);
    knee.rotation.x = Math.max(0, -step) * walk * 0.85 + (crouch ? 2.2 : 0);
    ankle.rotation.x = -(hip.rotation.x + knee.rotation.x);
  });
  rig.arms.forEach(({ shoulder, elbow, fingers }, i) => {
    fingers.rotation.x = rig.armed ? -0.9 : -0.12;
    const side = i === 0 ? -1 : 1;
    shoulder.rotation.set(
      rig.armed ? -0.62 : Math.sin(t + (i + 1) * Math.PI) * walk * 0.6,
      0,
      -side * (rig.armed ? 0.27 : 0.055),
    );
    elbow.rotation.set(rig.armed ? -1.08 : -0.12, 0, -side * (rig.armed ? 0.15 : 0));
    if (reload > 0 && i === 0) {
      shoulder.rotation.x += 0.5 * Math.sin(reload * 3);
      elbow.rotation.x -= 0.45;
    }
    if (drawing && i === 1) {
      shoulder.rotation.x = -0.7 + Math.sin(time * 3.5) * 0.07;
      elbow.rotation.x = -1.1 + Math.cos(time * 2.1) * 0.08;
    }
  });
  if (rig.weapon) {
    rig.weapon.rotation.x = -pitch * 0.5 + (reload > 0 ? 0.3 : 0) - recoil * 0.5;
    rig.weapon.rotation.z = 0;
    rig.weapon.position.set(0.08, 0.3, 0.16 - recoil * 0.08);
    rig.weapon.updateMatrix();
    const rightGrip = new THREE.Vector3(
      ...(rig.weapon.userData.rightGrip || [0, -0.1, 0.05]),
    ).applyMatrix4(rig.weapon.matrix);
    const leftGrip = new THREE.Vector3(
      ...(rig.weapon.userData.supportGrip || [0, -0.035, -0.1]),
    ).applyMatrix4(rig.weapon.matrix);
    reachHand(rig.arms[1], rightGrip.toArray());
    if (reload <= 0) reachHand(rig.arms[0], leftGrip.toArray());
  }
  applyHumanMotion(rig, time, { moving, reload, recoil, combat, drawing, gesture, previewPose });
}

// First-person hands use the same workwear palette, with palms and curled fingers.
export function createWorkHands(classId = 'stalvakt', skin = '#b59378') {
  const root = new THREE.Group(),
    owned = [],
    sleeve = palettes[classId]?.[0] || '#4b584a';
  for (const side of [-1, 1]) {
    const hand = joint(root, side === -1 ? -0.035 : 0.035, -0.13, side === -1 ? -0.26 : 0.065);
    const b = builder(hand, owned);
    b.oval(skin, side * 0.025, 0, 0, 0.038, 0.07, 0.046);
    for (let i = 0; i < 4; i++)
      b.line(
        skin,
        [
          [side * 0.025, -0.043 + i * 0.024, -0.043],
          [side * -0.021, -0.043 + i * 0.024, -0.043],
          [side * -0.025, -0.043 + i * 0.024, -0.015],
        ],
        0.01,
      );
    b.oval(skin, side * -0.024, 0.048, -0.011, 0.016, 0.035, 0.017, 0, 0, side * 0.45);
    b.line(
      sleeve,
      [
        [side * 0.07, -0.04, 0.02],
        [side * 0.14, -0.15, 0.13],
        [side * 0.2, -0.25, 0.3],
      ],
      0.058,
    );
    b.line(
      '#b9b69e',
      [
        [side * 0.045, -0.026, 0.012],
        [side * 0.078, -0.06, 0.04],
      ],
      0.06,
    );
    b.finish();
  }
  const parcel = joint(root.children[0], 0, -0.015, -0.06),
    b = builder(parcel, owned);
  b.box('#ad9874', 0, 0, 0, 0.1, 0.085, 0.07);
  b.box('#485048', 0, 0, -0.038, 0.02, 0.085, 0.008);
  b.finish();
  parcel.visible = false;
  root.userData.parcel = parcel;
  root.userData.geometries = owned;
  root.userData.classId = classId;
  root.userData.skin = skin;
  return root;
}
