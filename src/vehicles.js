import * as THREE from 'three';
import { MAP, groundHeight } from '../shared/map.js';
export function buildVehicles(view) {
  const v = view,
    white = new THREE.MeshStandardMaterial({ color: '#c7cbbf', roughness: 0.82 }),
    blue = new THREE.MeshStandardMaterial({ color: '#254d73', roughness: 0.8 }),
    yellow = new THREE.MeshStandardMaterial({ color: '#d6cb65', roughness: 0.8 });
  const lights = new THREE.MeshStandardMaterial({
    color: '#4682bb',
    emissive: '#367bd6',
    emissiveIntensity: 0.7,
  });
  const burned = new THREE.MeshStandardMaterial({ color: '#393b38', roughness: 1 });
  const texture = document.createElement('canvas');
  texture.width = 256;
  texture.height = 80;
  const ctx = texture.getContext('2d');
  ctx.fillStyle = '#c7cbbf';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#1a3a57';
  ctx.font = 'bold 55px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('POLIS', 128, 61);
  const map = new THREE.CanvasTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
  const fireTexture = document.createElement('canvas');
  fireTexture.width = 64;
  fireTexture.height = 128;
  const f = fireTexture.getContext('2d'),
    gr = f.createRadialGradient(32, 87, 1, 32, 72, 50);
  gr.addColorStop(0, '#fff3baff');
  gr.addColorStop(0.27, '#ffbf48dd');
  gr.addColorStop(0.65, '#ff661188');
  gr.addColorStop(1, '#dc301100');
  f.fillStyle = gr;
  f.fillRect(0, 0, 64, 128);
  const flameMap = new THREE.CanvasTexture(fireTexture);
  const smokeTexture = document.createElement('canvas');
  smokeTexture.width = smokeTexture.height = 64;
  const c = smokeTexture.getContext('2d'),
    sg = c.createRadialGradient(32, 32, 0, 32, 32, 31);
  sg.addColorStop(0, '#72746eaa');
  sg.addColorStop(1, '#72746e00');
  c.fillStyle = sg;
  c.fillRect(0, 0, 64, 64);
  const smokeMap = new THREE.CanvasTexture(smokeTexture);
  const fires = [];
  for (const p of MAP.cover.filter((p) => p.type === 'police')) {
    const group = new THREE.Group();
    group.position.set(p.x, groundHeight(p.x, p.z) + (p.overturned ? 1.63 : 0), p.z);
    group.rotation.set(0, p.yaw, p.overturned ? Math.PI : 0);
    view.scene.add(group);
    const box = (x, y, z, w, h, d, mat) => v.part(group, v.boxGeo, mat, x, y, z, w, h, d),
      body = p.burning ? burned : white;
    box(0, 0.65, 0, 1.76, 0.65, 4.25, body);
    box(0, 0.89, -1.42, 1.72, 0.16, 1.23, body);
    // Sloping windscreen, framed windows, wagon roof, grille and rubber tyres.
    const windshield = box(0, 1.2, -0.79, 1.57, 0.62, 0.045, v.s.glass);
    windshield.rotation.x = -0.43;
    box(0, 1.53, 0.15, 1.62, 0.095, 2.04, body);
    box(0, 1.19, 1.05, 1.58, 0.57, 0.05, v.s.glass);
    for (const side of [-1, 1]) {
      box(side * 0.845, 1.2, 0.17, 0.045, 0.5, 1.75, v.s.glass);
      for (const z of [-0.64, 0.26, 0.98]) box(side * 0.87, 1.22, z, 0.065, 0.65, 0.075, body);
      box(side * 0.893, 0.66, 0.2, 0.035, 0.17, 3.45, blue);
      for (let i = 0; i < 6; i++)
        box(side * 0.915, 0.8, -1.3 + i * 0.47, 0.028, 0.12, 0.26, yellow);
      box(side * 0.97, 1.15, -0.61, 0.2, 0.13, 0.22, body);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), sign);
      decal.position.set(side * 0.923, 0.93, 0.22);
      decal.rotation.y = (side * Math.PI) / 2;
      group.add(decal);
      for (const z of [-1.35, 1.35]) {
        const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
        wheel.rotateZ(Math.PI / 2);
        v.part(group, wheel, v.s.roof, side * 0.84, 0.34, z);
        const hub = new THREE.CylinderGeometry(0.15, 0.15, 0.235, 12);
        hub.rotateZ(Math.PI / 2);
        v.part(group, hub, v.s.zinc, side * 0.84, 0.34, z);
      }
      box(side * 0.55, 0.72, -2.14, 0.36, 0.16, 0.06, v.s.ivory);
      box(side * 0.67, 0.71, 2.14, 0.16, 0.2, 0.05, v.s.rust);
    }
    box(0, 0.38, -2.17, 1.75, 0.12, 0.15, v.s.metal);
    box(0, 0.7, -2.18, 0.53, 0.13, 0.03, v.s.metal);
    box(0, 1.65, 0.02, 1.08, 0.13, 0.26, lights);
    if (p.overturned) {
      box(0, 0.23, 0, 1.4, 0.15, 2.7, v.s.metal);
      for (const z of [-1.35, 1.35]) box(0, 0.3, z, 1.65, 0.12, 0.16, v.s.metal);
    }
    if (p.burning) {
      const particles = [];
      for (let i = 0; i < 14; i++) {
        const smoke = i >= 6,
          material = new THREE.SpriteMaterial({
            map: smoke ? smokeMap : flameMap,
            transparent: true,
            depthWrite: false,
            blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
            color: smoke ? '#454840' : '#ffffff',
          });
        const sprite = new THREE.Sprite(material);
        view.scene.add(sprite);
        particles.push({ sprite, smoke, seed: i * 0.731 });
      }
      const light = new THREE.PointLight('#ff7a28', 0, 15, 2);
      light.position.set(p.x, groundHeight(p.x, p.z) + 1.8, p.z);
      view.scene.add(light);
      fires.push({ p, particles, light });
    }
  }
  return {
    update(time, camera, low) {
      let lit = 0;
      for (const { p, particles, light } of fires) {
        const near = Math.hypot(p.x - camera.x, p.z - camera.z) < 95;
        light.intensity = near && lit++ < (low ? 1 : 2) ? 28 + Math.sin(time * 11) * 8 : 0;
        light.visible = light.intensity > 0;
        particles.forEach(({ sprite, smoke, seed }, i) => {
          sprite.visible = near && (!low || i % 2 === 0);
          const age = (time * (smoke ? 0.18 : 0.8) + seed) % 1,
            y = groundHeight(p.x, p.z) + 0.7 + age * (smoke ? 6 : 2.2);
          sprite.position.set(
            p.x + Math.sin(seed * 5) * 0.6 + age * (smoke ? 1.4 : 0.1),
            y,
            p.z + Math.cos(seed * 4) * 0.6,
          );
          const size = smoke ? 1 + age * 2 : 0.6 + Math.sin(age * Math.PI) * 0.9;
          sprite.scale.set(size, smoke ? size : size * 1.9, 1);
          sprite.material.opacity = Math.sin(age * Math.PI) * (smoke ? 0.42 : 0.85);
        });
      }
    },
  };
}
