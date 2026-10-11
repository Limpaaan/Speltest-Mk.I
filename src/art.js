import { createHuman } from './humans.js';
import * as THREE from 'three';
import { ARTIST, PAINTS } from '../shared/artist.js';
import { groundHeight } from '../shared/map.js';
// Original canvas drawings, not downloaded photos or a likeness of a real person.
export function artCanvas(motif, color = '#342b35', paper = false) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d');
  if (paper) {
    g.fillStyle = '#e4dec9';
    g.fillRect(0, 0, 256, 320);
  }
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 9;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (motif === 'icecream') {
    g.beginPath();
    g.moveTo(67, 145);
    g.lineTo(128, 289);
    g.lineTo(189, 145);
    g.closePath();
    g.stroke();
    for (const [x, y, r] of [
      [92, 111, 45],
      [164, 111, 45],
      [128, 64, 42],
    ]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let y = 173; y < 258; y += 24) {
      g.beginPath();
      g.moveTo(83 + (y - 173) * 0.4, y);
      g.lineTo(166 - (y - 173) * 0.4, y + 13);
      g.stroke();
    }
  } else {
    g.beginPath();
    g.moveTo(80, 208);
    g.bezierCurveTo(29, 183, 30, 62, 75, 42);
    g.bezierCurveTo(104, 18, 165, 18, 190, 60);
    g.bezierCurveTo(219, 107, 217, 181, 176, 206);
    g.lineTo(167, 270);
    g.lineTo(91, 270);
    g.closePath();
    g.stroke();
    for (const x of [88, 168]) {
      g.beginPath();
      g.ellipse(x, 139, 24, 29, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.moveTo(128, 170);
    g.lineTo(116, 203);
    g.lineTo(140, 203);
    g.closePath();
    g.fill();
    for (let x = 107; x <= 151; x += 15) {
      g.beginPath();
      g.moveTo(x, 240);
      g.lineTo(x, 271);
      g.stroke();
    }
  }
  return c;
}
export function buildArtist(view) {
  const group = new THREE.Group(),
    s = view.s,
    box = (x, y, z, w, h, d, mat = s.wood) => view.part(group, view.boxGeo, mat, x, y, z, w, h, d);
  const actor = createHuman({
    id: 'anders',
    name: ARTIST.name,
    appearanceRole: 'artist',
    armed: false,
  });
  group.add(actor);
  view.part(
    actor.userData.human.arms[1].elbow,
    view.boxGeo,
    s.wood,
    0,
    -0.32,
    0.07,
    0.015,
    0.27,
    0.015,
  );
  // Easel carries two visibly different pen drawings.
  for (const x of [-0.65, 0.65]) box(x, 0.88, 0.82, 0.045, 1.75, 0.06).rotation.z = x * 0.15;
  box(0, 0.72, 0.79, 1.55, 0.05, 0.1);
  for (const [x, motif] of [
    [-0.36, 'icecream'],
    [0.36, 'skull'],
  ]) {
    const texture = new THREE.CanvasTexture(artCanvas(motif, '#342b35', true));
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.82),
      new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, 1.2, 0.81);
    group.add(mesh);
  }
  box(1.35, 0.65, 0.25, 0.8, 0.06, 0.65);
  for (const side of [-1, 1]) box(1.35 + side * 0.3, 0.3, 0.25, 0.045, 0.6, 0.5);
  let i = 0;
  for (const paint of Object.values(PAINTS)) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: paint.color }),
    );
    can.position.set(1.1 + (i % 3) * 0.2, 0.75, 0.13 + Math.floor(i / 3) * 0.22);
    group.add(can);
    i++;
  }
  group.position.set(ARTIST.x, groundHeight(ARTIST.x, ARTIST.z), ARTIST.z);
  view.scene.add(group);
  view.sign(
    'ANDERS DELBOM / TILLFÄLLIG ATELJÉ',
    ARTIST.x,
    groundHeight(ARTIST.x, ARTIST.z) + 2.6,
    ARTIST.z,
    5,
  );
  return { group, actor };
}
export function renderPaint(view, state, myId) {
  if (!view.paintMeshes) {
    view.paintMeshes = new Map();
    view.paintMaterials = new Map();
  }
  const seen = new Set();
  for (const player of Object.values(state.players))
    for (const art of player.paintings || []) {
      seen.add(art.id);
      let mesh = view.paintMeshes.get(art.id);
      if (!mesh) {
        const key = art.color + ':' + art.motif;
        if (!view.paintMaterials.has(key)) {
          const texture = new THREE.CanvasTexture(artCanvas(art.motif, PAINTS[art.color].color));
          texture.colorSpace = THREE.SRGBColorSpace;
          view.paintMaterials.set(
            key,
            new THREE.MeshStandardMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
              roughness: 1,
              polygonOffset: true,
              polygonOffsetFactor: -2,
            }),
          );
        }
        const geometry = new THREE.PlaneGeometry(1.1, 1.4, 4, 4);
        geometry.rotateX(-Math.PI / 2);
        geometry.rotateY(art.yaw + Math.PI);
        const points = geometry.attributes.position,
          base = groundHeight(art.x, art.z);
        for (let i = 0; i < points.count; i++)
          points.setY(
            i,
            groundHeight(art.x + points.getX(i), art.z + points.getZ(i)) - base + 0.025,
          );
        geometry.computeVertexNormals();
        mesh = new THREE.Mesh(geometry, view.paintMaterials.get(key));
        mesh.position.set(art.x, base, art.z);
        view.paintMeshes.set(art.id, mesh);
        view.scene.add(mesh);
      }
      mesh.visible =
        Math.hypot(art.x - view.camera.position.x, art.z - view.camera.position.z) < 100;
    }
  for (const [id, mesh] of view.paintMeshes)
    if (!seen.has(id)) {
      view.scene.remove(mesh);
      mesh.geometry.dispose();
      view.paintMeshes.delete(id);
    }
}
