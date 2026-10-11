import { AALTO_WALLS, AALTO_FURNITURE, AALTO_FLOOR, aaltoRamp } from '../shared/interiors.js';
import * as THREE from 'three';

// Original geometry interpreted from the owner's reference photos, 2026-10-08.
// Coordinates fit the existing gameplay envelopes; dimensions/orientation are not surveyed.
function builder(view, p) {
  const box = (x, y, z, w, h, d, mat, yaw = 0) => view.box(p.x + x, y, p.z + z, w, h, d, mat, yaw);
  const mesh = (geo, mat, x, y, z, yaw = 0) => {
    view.static(geo, mat, p.x + x, y, p.z + z, 1, 1, 1, yaw);
    geo.dispose();
  };
  const roof = (x, z, w, d, y, rise, mat) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }), mat, x, y, z - d / 2);
  };
  const arch = (x, y, z, w, h, yaw = 0, door = false) => {
    const outline = (width, height) => {
      const shape = new THREE.Shape(),
        r = width / 2;
      shape.moveTo(-r, 0);
      shape.lineTo(r, 0);
      shape.lineTo(r, height - r);
      shape.absarc(0, height - r, r, 0, Math.PI, false);
      shape.closePath();
      return shape;
    };
    mesh(
      new THREE.ShapeGeometry(outline(w + 0.28, h + 0.18)),
      view.s.archBrick,
      x,
      y - 0.08,
      z,
      yaw,
    );
    // Slight forward separation avoids z fighting on the masonry surround.
    const dx = Math.sin(yaw) * 0.02,
      dz = Math.cos(yaw) * 0.02;
    mesh(
      new THREE.ShapeGeometry(outline(w, h)),
      door ? view.s.metal : view.s.worksGlass,
      x + dx,
      y,
      z + dz,
      yaw,
    );
    if (!door) {
      for (const u of [-w / 4, 0, w / 4])
        box(
          x + Math.cos(yaw) * u + dx * 2,
          y + (h - w / 2) / 2,
          z - Math.sin(yaw) * u + dz * 2,
          0.035,
          h - w / 2,
          0.025,
          view.s.metal,
          yaw,
        );
      for (let v = 0.45; v < h - w / 3; v += 0.55)
        box(x + dx * 2, y + v, z + dz * 2, w - 0.08, 0.025, 0.03, view.s.metal, yaw);
    }
  };
  return { box, mesh, roof, arch };
}
export function buildVerket(view, p) {
  const { box, mesh, roof, arch } = builder(view, p),
    s = view.s;
  // Low furnace hall in front, tall works behind, smaller gabled annexes to the side.
  box(-6, 4.4, 4.5, 26, 8.8, 15, s.slagStone);
  box(-6, 1.55, 4.5, 26.6, 3.1, 15.4, s.slagStone);
  box(-6, 3.2, 4.5, 26.8, 0.35, 15.6, s.archBrick);
  roof(-6, 4.5, 27, 15.8, 8.85, 0.95, s.zinc);
  box(6, 9, -7, 24, 18, 10, s.slagStone);
  roof(6, -7, 24.6, 10.6, 18, 1.6, s.zinc);
  for (const x of [10.1, 16.5]) {
    const width = x === 10.1 ? 6.2 : 5.8;
    box(x, 3.4, 5, width, 6.8, 14, s.slagStone);
    roof(x, 5, width + 0.3, 14.4, 6.85, 2, s.zinc);
    for (const dx of [-1.5, 0, 1.5]) arch(x + dx, 3.8, 12.03, 1, 2.5);
  }
  // Raised entrance and the long bank of arched windows.
  for (const x of [-16, -12, -8, 0, 4]) arch(x, 4, 12.025, 1.8, 3.5);
  arch(-4, 3.55, 12.04, 2.6, 3.8, 0, true);
  for (let i = 0; i < 8; i++)
    box(-4, 0.22 + i * 0.41, 11.8 - i * 0.24, 3.1, 0.44, 2.8 - i * 0.24, s.slagStone);
  for (const x of [-18.7, -10, -2, 6.7]) box(x, 5.8, 12.07, 0.45, 5.4, 0.25, s.slagStone);
  // Return wall visible from the river.
  for (const z of [-1.5, 2, 5.5, 9]) arch(-19.025, 4, z, 1.65, 3.4, -Math.PI / 2);
  for (const y of [10.7, 14.7])
    for (const x of [-4, 0, 4, 8, 12, 16]) arch(x, y, -1.97, 1.55, y > 12 ? 2.0 : 2.9);
  for (const z of [-10, -6, -3])
    for (const y of [10.7, 14.7]) arch(18.025, y, z, 1.4, 2.6, Math.PI / 2);
  // Brick cornice, corbels and light metal gutters.
  for (const [x, z, w, d, y] of [
    [-6, 4.5, 26, 15, 8.7],
    [6, -7, 24, 10, 17.8],
  ]) {
    box(x, y, z, w + 0.35, 0.35, d + 0.35, s.archBrick);
    for (let dx = -w / 2 + 0.45; dx < w / 2; dx += 0.7)
      box(x + dx, y - 0.35, z + d / 2 + 0.1, 0.27, 0.55, 0.24, s.archBrick);
    box(x, y + 0.5, z + d / 2 + 0.45, w + 0.8, 0.12, 0.14, s.zinc);
  }
  // Two unmistakable stepped masonry stacks, with circular collars and narrow upper shafts.
  for (const [x, top] of [
    [-13, 18.8],
    [-0.5, 24.5],
  ]) {
    const z = 3.2,
      base = 9.1,
      lower = (top - base) * 0.47;
    mesh(new THREE.CylinderGeometry(1.23, 1.5, lower, 28), s.slagStone, x, base + lower / 2, z);
    mesh(
      new THREE.CylinderGeometry(0.77, 1.0, top - base - lower, 28),
      s.slagStone,
      x,
      base + lower + (top - base - lower) / 2,
      z,
    );
    for (const [y, r] of [
      [base + lower, 1.58],
      [top - 0.6, 1.0],
      [top, 0.9],
    ])
      mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.25, 28), s.archBrick, x, y, z);
    for (let y = base + lower + 0.55; y < top - 0.5; y += 0.8)
      mesh(
        new THREE.CylinderGeometry(
          1.01 - (y - base - lower) * 0.025,
          1.01 - (y - base - lower) * 0.025,
          0.1,
          28,
        ),
        s.archBrick,
        x,
        y,
        z,
      );
  }
  // Slanted sheet-metal duct from the lower roof to the taller rear hall.
  const duct = new THREE.BoxGeometry(2, 9, 1.4);
  duct.rotateX(-0.28);
  mesh(duct, s.zinc, 6, 12, -0.8);
  view.sign('VERKET', p.x - 4, 6.4, p.z + 12.1, 2.1);
}
export function buildAalto(view, p) {
  const { box, mesh } = builder(view, p),
    s = view.s;
  // Narrow tower with six horizontal window bands and an asymmetric upper crown.
  box(-7, 11.3, 0, 10, 16, 13, s.aaltoBlue);
  box(0, -0.12, 0, 24, 0.24, 14, s.concrete);
  const rampGeo = new THREE.BufferGeometry();
  const corners = [
    [12, 1.5],
    [18, 1.5],
    [18, 5.5],
    [12, 5.5],
  ].map(([x, z]) => [x, (aaltoRamp(p.x + x, p.z + z) ?? AALTO_FLOOR) - AALTO_FLOOR + 0.01, z]);
  rampGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 2, 1, 0, 3, 2].flatMap((i) => corners[i]),
      3,
    ),
  );
  rampGeo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1], 2),
  );
  rampGeo.computeVertexNormals();
  mesh(rampGeo, s.ivory, 0, 0, 0);
  view.sign('ENTRÉ / ARKIV', p.x + 12.2, 2.8, p.z + 3.5, 3, Math.PI / 2);

  box(0, 3.25, 0, 24, 0.1, 14, s.ivory);
  for (const wall of AALTO_WALLS)
    box(wall.x - p.x, 1.65, wall.z - p.z, wall.w, 3.3, wall.d, s.ivory);
  for (const f of AALTO_FURNITURE) {
    const x = f.x - p.x,
      z = f.z - p.z;
    if (f.type === 'desk') {
      box(x, 0.96, z, f.w, 0.08, f.d, s.wood);
      for (const side of [-1, 1])
        box(x + side * (f.w / 2 - 0.1), 0.48, z, 0.12, 0.96, f.d - 0.12, s.metal);
      box(x - 0.8, 1.03, z, 0.45, 0.06, 0.4, s.ivory);
      box(x + 0.7, 1.16, z, 0.3, 0.3, 0.3, s.metal);
    } else if (f.type === 'shelf') {
      box(x, 1.3, z, f.w, 2.6, f.d, s.wood);
      const sideways = f.w < f.d;
      for (let y = 0.35; y < 2.6; y += 0.55)
        for (let u = -1.4; u < 1.5; u += 0.25)
          box(
            x + (sideways ? 0.38 : u),
            y,
            z + (sideways ? u : -0.38),
            sideways ? 0.08 : 0.17,
            0.4,
            sideways ? 0.17 : 0.08,
            Math.round(u * 4) % 2 ? s.aaltoBlue : s.ivory,
          );
    } else {
      box(x, 1.1, z, f.w, 2.2, f.d, s.metal);
      for (let y = 0.3; y < 2.2; y += 0.5) {
        box(x, y, z + 0.38, f.w - 0.12, 0.4, 0.04, s.zinc);
        box(x, y, z + 0.42, 0.25, 0.035, 0.04, s.metal);
      }
    }
  }
  for (const x of [-8, 5]) box(x, 3.16, 0, 1.5, 0.06, 0.35, s.windowLight);
  for (const side of [-1, 1]) box(0, 0.12, side * 6.8, 23.5, 0.24, 0.1, s.aaltoBlue);
  box(7, 1.9, -6.8, 2.6, 1.4, 0.1, s.wood);
  for (const x of [6.3, 7, 7.7]) box(x, 1.9, -6.72, 0.5, 0.9, 0.02, s.ivory);
  view.sign('EVAKUERINGSPLAN / ARKIV', p.x - 9, 2.6, p.z - 6.7, 3.8);

  view.sign('ARKIV ←   ENTRÉ →', p.x + 1, 2.5, p.z - 6.75, 1);
  const crown = new THREE.Shape();
  crown.moveTo(-5, 0);
  crown.lineTo(5, 0);
  crown.lineTo(5, 4.7);
  crown.lineTo(1.6, 3.5);
  crown.lineTo(-1.5, 2.3);
  crown.lineTo(-5, 1.1);
  crown.closePath();
  mesh(
    new THREE.ExtrudeGeometry(crown, { depth: 13, bevelEnabled: false }),
    s.aaltoBlue,
    -7,
    19.3,
    -6.5,
  );
  const ribbon = (x, y, z, w, yaw = 0) => {
    box(x, y, z, w, 1.5, 0.08, s.windowLight, yaw);
    for (let u = -w / 2; u < w / 2; u += 1.05) {
      const px = x + Math.cos(yaw) * u,
        pz = z - Math.sin(yaw) * u;
      box(px, y, pz, 0.055, 1.6, 0.13, s.metal, yaw);
    }
  };
  for (let row = 0; row < 6; row++) {
    const y = 2.4 + row * 2.7;
    if (row === 0) continue;
    ribbon(-7, y, 6.54, 8.8);
    ribbon(-7, y, -6.54, 8.8, Math.PI);
    ribbon(-1.96, y, 0, 11.1, Math.PI / 2);
    ribbon(-12.04, y, 0, 11.1, -Math.PI / 2);
    for (const x of [-9.6, -5.3]) box(x, y, 6.61, 0.9, 1.48, 0.08, s.ivory);
  }
  // High pale vertical fins are separate geometry, not a generic balcony pattern.
  for (let x = -11.4; x < -7.3; x += 0.42) {
    const high = 20.4 + (x + 12) * 0.35;
    box(x, (18.2 + high) / 2, 6.69, 0.13, high - 18.2, 0.3, s.ivory);
  }
  for (let z = -2.8; z < 1.3; z += 0.42) box(-1.84, 21.3, z, 0.27, 4.1, 0.12, s.ivory);
  // Low retail wings with blue horizontal bands and a white shopfront level.
  for (const wing of [
    { x: 3, z: 4, w: 18, d: 6, h: 8.2 },
    { x: 7, z: -3.5, w: 10, d: 7, h: 7.4 },
  ]) {
    const { x, z, w, d, h } = wing;
    box(x, (h + 3.3) / 2, z, w, h - 3.3, d, s.aaltoBlue);
    box(x, h + 0.08, z, w + 0.3, 0.16, d + 0.3, s.zinc);
    for (const side of [-1, 1]) {
      for (const y of [4, 6.5])
        ribbon(x, y, z + side * (d / 2 + 0.04), w - 1, side === 1 ? 0 : Math.PI);
      for (let dx = -w / 2 + 0.5; dx < w / 2; dx += 2.5)
        box(x + dx, 1.2, z + side * (d / 2 + 0.13), 0.17, 2.4, 0.22, s.ivory);
    }
    for (const y of [4, 6.5]) ribbon(x + w / 2 + 0.05, y, z, d - 1, Math.PI / 2);
  }
  // Ground-floor shop windows and dark frames retain the low retail frontage.
  for (const side of [-1, 1])
    for (let x = -10.5; x < 11; x += 3) {
      box(x, 1.5, side * 7.17, 2.35, 1.85, 0.04, s.windowLight);
      for (const edge of [-1, 1]) box(x + edge * 1.18, 1.5, side * 7.2, 0.055, 1.95, 0.06, s.metal);
      box(x, 0.56, side * 7.2, 2.4, 0.055, 0.06, s.metal);
    }
  // Aalto's name appears as pale lettering directly on the dark facade.
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = '#ece9de';
  ctx.textAlign = 'center';
  ctx.font = 'bold 94px Arial';
  ctx.fillText('AALTO', 256, 110);
  ctx.fillText('HUSET', 256, 215);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  mesh(
    new THREE.PlaneGeometry(3.1, 1.55),
    new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.8 }),
    -4.35,
    18.95,
    6.72,
  );
}

export function buildHorse(view, p) {
  const { box, mesh } = builder(view, p),
    s = view.s;
  const red = new THREE.MeshStandardMaterial({ color: '#e94b28', roughness: 0.55 });
  const hoof = new THREE.MeshStandardMaterial({ color: '#222b29', roughness: 0.85 });
  const body = new THREE.Shape();
  body.moveTo(-4.25, 4.9);
  body.bezierCurveTo(-4.9, 5.2, -4.85, 7.5, -4.05, 7.8);
  body.bezierCurveTo(-2.7, 8.2, -1, 7.55, 0.1, 8.3);
  body.bezierCurveTo(1.35, 9.2, 1.2, 11.2, 2.65, 11.7);
  body.lineTo(3.1, 12.9);
  body.quadraticCurveTo(3.3, 13.3, 3.45, 12.8);
  body.lineTo(3.55, 11.8);
  body.lineTo(5.65, 10.1);
  body.quadraticCurveTo(5.85, 9.85, 5.65, 9.3);
  body.lineTo(5.4, 8.65);
  body.quadraticCurveTo(5.25, 8.4, 4.9, 8.65);
  body.lineTo(3.5, 9.0);
  body.quadraticCurveTo(3.0, 7.0, 3.15, 4.75);
  body.quadraticCurveTo(0.1, 4.6, -2.8, 4.7);
  body.closePath();
  mesh(
    new THREE.ExtrudeGeometry(body, {
      depth: 2.2,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 20,
    }),
    red,
    0,
    0.25,
    -1.1,
  );
  // Four tapered legs, broader where they meet the body, with black feet.
  for (const [x, tilt] of [
    [-3.6, -0.12],
    [2.65, 0.035],
  ])
    for (const side of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.78, 0.45, 5.2, 12);
      leg.rotateZ(tilt);
      mesh(leg, red, x, 2.95, side * 0.9);
      mesh(
        new THREE.CylinderGeometry(0.46, 0.49, 0.3, 12),
        hoof,
        x + Math.sin(-tilt) * 2.4,
        0.44,
        side * 0.9,
      );
    }
  box(0, 0.1, 0, 11.5, 0.25, 3.8, s.concrete);
  // Hand-drawn kurbits: scalloped saddle, a diagonal belly band, and leaf-like neck strokes.
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d'),
    px = (x) => ((x + 6) / 12) * 1024,
    py = (y) => ((13.5 - y) / 13.5) * 1280;
  const contour = body.getPoints(100);
  ctx.beginPath();
  contour.forEach((point, i) =>
    i ? ctx.lineTo(px(point.x), py(point.y)) : ctx.moveTo(px(point.x), py(point.y)),
  );
  ctx.closePath();
  ctx.clip();
  const ellipse = (x, y, rx, ry, color, angle = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(px(x), py(y), (rx / 12) * 1024, (ry / 13.5) * 1280, angle, 0, Math.PI * 2);
    ctx.fill();
  };
  const scallop = (x, y, scale = 1) => {
    for (const [r, c] of [
      [0.67, '#267c68'],
      [0.56, '#71c1ad'],
      [0.43, '#f3f0cf'],
      [0.29, '#39988b'],
    ])
      ellipse(x, y, r * scale, r * 0.69 * scale, c);
    ellipse(x, y, 0.23 * scale, 0.13 * scale, '#f0dd89');
    ellipse(x, y, 0.1 * scale, 0.11 * scale, '#974a32');
  };
  for (let i = 0; i < 9; i++) scallop(-3.9 + i * 0.86, 6.9 - 0.75 * Math.sin(i * 0.34), 1);
  for (let i = 0; i < 6; i++) scallop(-1.9 + i * 0.61, 6.45 - i * 0.36, 0.65);
  ellipse(-2.35, 7.6, 1.8, 0.65, '#f4efda');
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 7;
    ellipse(-2.3 + Math.cos(a) * 1.1, 7.6 - Math.sin(a) * 0.37, 0.11, 0.24, '#335443', a);
  }
  // Sweeping neck decoration follows the raised neck instead of a repeated dot pattern.
  const stroke = (color, width, points) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(points[0]), py(points[1]));
    ctx.bezierCurveTo(
      px(points[2]),
      py(points[3]),
      px(points[4]),
      py(points[5]),
      px(points[6]),
      py(points[7]),
    );
    ctx.stroke();
  };
  for (const [offset, color] of [
    [-0.42, '#faf0d6'],
    [-0.21, '#4fbfa7'],
    [0, '#176f66'],
    [0.21, '#eed985'],
    [0.4, '#f7f0d1'],
  ])
    stroke(color, 17, [
      0.45 + offset,
      8.05,
      2.9 + offset,
      8.4,
      0.9 + offset,
      10.3,
      2.7 + offset,
      11.55,
    ]);
  stroke('#f3edd6', 10, [0.15, 7.5, 1.5, 7.3, 2.0, 8.6, 3.9, 9.05]);
  stroke('#f3edd6', 7, [3.25, 11.6, 3.2, 10.7, 4.4, 9.7, 5.6, 9.45]);
  stroke('#f3edd6', 7, [4.95, 10.55, 4.8, 10.0, 4.75, 9.4, 4.9, 8.77]);
  ellipse(3.88, 10.96, 0.07, 0.12, '#222d2b', -0.55);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const decoration = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.6,
  });
  for (const side of [-1, 1])
    mesh(new THREE.PlaneGeometry(12, 13.5), decoration, 0, 7, side * 1.315);
  view.sign('DALAHÄSTEN / ÅSBO', p.x, 0.9, p.z + 2.05, 5);
}
