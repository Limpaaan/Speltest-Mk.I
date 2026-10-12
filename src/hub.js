import * as THREE from 'three';
import { HUB, MAP, groundHeight } from '../shared/map.js';
import { CAMP } from '../shared/progression.js';
export function buildHub(v) {
  const s = v.s;
  const tent = s.roof.clone();
  tent.color.set('#4f5a43');
  const canvas = s.ivory.clone();
  canvas.color.set('#bbb59b');
  const medical = s.ivory.clone();
  medical.color.set('#d5ded4');
  for (const station of HUB.stations) {
    const { x, z } = station,
      base = groundHeight(x, z);
    v.baseY = base;
    if (station.id !== 'maja') {
      for (const dx of [-2.5, 2.5])
        for (const dz of [-1.8, 2.8]) v.box(x + dx, 1.5, z + dz, 0.1, 3, 0.1, s.wood);
      v.box(x, 3, z + 0.5, 5.8, 0.12, 5.1, tent);
      // Raised rear tarpaulin and side screens leave the central approach open.
      v.box(x, 1.65, z + 2.8, 5.1, 2.7, 0.07, station.id === 'liv' ? medical : canvas);
      v.box(x - 2.5, 1.4, z + 0.8, 0.07, 2.4, 4.1, canvas);
    }
    if (station.id === 'torsten') {
      v.box(x + 1.4, 0.85, z + 0.9, 1.8, 0.12, 1, s.wood);
      for (const dx of [0.8, 2]) v.box(x + dx, 0.4, z + 0.9, 0.12, 0.8, 0.6, s.metal);
      v.box(x + 1.5, 1.08, z + 0.9, 0.5, 0.36, 0.3, s.metal);
      const gun = v.rifle('rifle', {}, 'world');
      gun.position.set(x + 1.1, base + 1.05, z + 0.9);
      gun.rotation.y = Math.PI / 2;
      v.scene.add(gun);
      for (let i = 0; i < 4; i++) v.box(x - 1.6, 0.3 + i * 0.32, z + 1.5, 1.1, 0.28, 0.7, s.wood);
    } else if (station.id === 'liv') {
      v.box(x + 1.3, 0.6, z + 0.8, 1.1, 0.12, 2.1, s.metal);
      v.box(x + 1.3, 0.72, z + 0.8, 1.05, 0.18, 2, medical);
      v.box(x + 1.3, 0.87, z + 1.4, 0.8, 0.16, 0.4, canvas);
      for (const dz of [-0.1, 1.6]) v.box(x + 1.3, 0.3, z + dz, 0.9, 0.6, 0.09, s.metal);
      v.box(x, 2, z + 2.75, 0.12, 0.8, 0.1, medical);
      v.box(x, 2, z + 2.77, 0.8, 0.12, 0.1, medical);
      v.box(x - 1.5, 0.85, z + 1.8, 1.1, 1.7, 0.5, s.ivory);
    } else if (station.id === 'einar') {
      v.box(x + 1.2, 0.85, z + 0.7, 1.8, 0.12, 1.25, s.wood);
      v.box(x + 1.2, 0.92, z + 0.7, 1.5, 0.025, 1.1, canvas);
      for (let i = 0; i < 5; i++)
        v.box(x + 0.6 + i * 0.3, 0.943, z + 0.7, 0.018, 0.014, 0.9, s.glass);
      v.box(x - 1.2, 1, z + 1.6, 0.6, 0.6, 0.3, s.metal);
      v.box(x - 1.2, 1.3, z + 1.6, 0.025, 2.4, 0.025, s.zinc);
      v.box(x - 1.2, 2.3, z + 1.6, 1.3, 0.03, 0.03, s.zinc);
    } else if (station.id === 'anders') {
      v.box(x - 1.5, 0.5, z + 1.8, 1.2, 1, 0.75, s.wood);
    }
    v.sign(station.title.toUpperCase(), x, 2.65, z + 2.6, 4.8);
    v.baseY = 0;
  }
  v.sign(
    'SKIFTGÅRDEN / SKYDDAD SAMLINGSPLATS',
    HUB.center.x,
    groundHeight(HUB.center.x, HUB.center.z - 17) + 3.3,
    HUB.center.z - 17,
    10,
  );
  v.sign(
    'UPPDRAG • VERKSTAD • VÅRD • SPANING • ATELJÉ',
    CAMP.x + 4,
    groundHeight(CAMP.x + 4, CAMP.z) + 1.5,
    CAMP.z + 2,
    5,
  );
  v.hubGuards = [];
  for (const guard of HUB.guards) {
    const actor = v.soldier({
      id: 'friendly-' + guard.id,
      classId: 'stalvakt',
      weapon: { kind: 'rifle' },
    });
    actor.position.set(guard.x, groundHeight(guard.x, guard.z), guard.z);
    actor.rotation.y = guard.aim;
    actor.userData.friendly = true;
    v.scene.add(actor);
    v.hubGuards.push(actor);
  }
  // Every physical barricade is also shared collision/cover geometry.
  for (const p of MAP.cover.filter((p) => p.hub)) {
    v.baseY = groundHeight(p.x, p.z);
    for (let layer = 0; layer < 3; layer++)
      for (let i = 0; i < 4; i++) {
        const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), canvas);
        bag.rotation.z = Math.PI / 2;
        bag.position.set(p.x + (i - 1.5) * 0.78, v.baseY + 0.22 + layer * 0.3, p.z);
        v.scene.add(bag);
      }
    v.baseY = 0;
  }
}
