import { roadWidth } from '../shared/roads.js';
import { inParking } from '../shared/sites.js';
import * as THREE from 'three';
import { MAP, groundHeight, canStand, waterAt, segmentDistance, roadsNear } from '../shared/map.js';
import { STORY_SITES, campaignTarget } from '../shared/story.js';
import { buildForestFloor } from './nordic-environment.js';

const rng = (initial) => {
  let seed = initial;
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
};
// Original procedural cutouts. No external photographs or game assets are shipped.
export function foliageMaterial(kind) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d'),
    random = rng(kind === 'birch' ? 411 : 901);
  if (kind === 'birch') {
    for (let i = 0; i < 95; i++) {
      const angle = random() * Math.PI * 2,
        radius = Math.sqrt(random());
      const y = 245 + Math.sin(angle) * radius * 170,
        x = 128 + Math.cos(angle) * radius * 90;
      ctx.strokeStyle = '#625a41';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(128, 500);
      ctx.quadraticCurveTo(128, y + 80, x, y);
      ctx.stroke();
      for (let j = 0; j < 22; j++) {
        const px = x + (random() - 0.5) * 40,
          py = y + (random() - 0.5) * 55;
        ctx.fillStyle = ['#98924d', '#a99b50', '#626c40', '#b5a761', '#737d46'][
          Math.floor(random() * 5)
        ];
        ctx.beginPath();
        ctx.ellipse(px, py, 2 + random() * 3, 3 + random() * 4, random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    for (let i = 0; i < 95; i++) {
      const x = 128 + (random() - 0.5) * 160,
        top = 70 + random() * 365;
      ctx.strokeStyle = ['#686e43', '#8c8954', '#b0a273', '#4e623f'][i % 4];
      ctx.lineWidth = 1 + random() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 512);
      ctx.quadraticCurveTo(x + (random() - 0.5) * 90, top + 70, x + (random() - 0.5) * 130, top);
      ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
  });
}

export function tintTerrain(geometry) {
  const points = geometry.attributes.position,
    colors = [];
  const soil = new THREE.Color('#eeecd9'),
    moss = new THREE.Color('#dce5cf'),
    chalk = new THREE.Color('#ede9dc');
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      z = points.getZ(i);
    const n = (Math.sin(x * 0.027 + Math.cos(z * 0.013) * 2) * Math.cos(z * 0.041) + 1) * 0.5;
    const rock = Math.abs(Math.sin(x * 0.013 + z * 0.029));
    const c = soil
      .clone()
      .lerp(moss, n)
      .lerp(chalk, Math.pow(rock, 12) * 0.1);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

export class Atmosphere {
  constructor(view) {
    this.view = view;
    this.wind = { value: 0 };
    for (const mat of view.forest.materials) this.sway(mat, 0.055);
    this.marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.27),
      new THREE.MeshBasicMaterial({ color: '#ffd889' }),
    );
    view.scene.add(this.marker);
    this.statusMaterial = new THREE.MeshStandardMaterial({
      color: '#f4bd76',
      emissive: '#f4bd76',
      emissiveIntensity: 1.5,
    });
    this.sites();
    this.lampPositions = [];
    this.roadside();
    this.streetLights = Array.from({ length: 6 }, () => {
      const light = new THREE.PointLight('#ffd4a0', 0, 18, 2);
      view.scene.add(light);
      return light;
    });
    this.groundCover();
    const light = new THREE.PointLight('#ffbb77', 24, 14, 2);
    light.position.set(
      MAP.spawn.x + 6,
      groundHeight(MAP.spawn.x + 6, MAP.spawn.z) + 2.6,
      MAP.spawn.z,
    );
    view.scene.add(light);
  }
  sites() {
    const v = this.view;
    for (const [id, p] of Object.entries(STORY_SITES)) {
      const y = groundHeight(p.x, p.z);
      // Thin interactive apparatus; never surrounds the interaction point with new walls.
      v.box(p.x, y + 0.68, p.z, 0.8, 1.36, 0.42, id === 'archive' ? v.s.wood : v.s.metal);
      v.box(p.x, y + 1.15, p.z + 0.22, 0.56, 0.2, 0.025, v.s.glass);
      v.box(p.x + 0.23, y + 1.15, p.z + 0.25, 0.04, 0.045, 0.02, this.statusMaterial);
      for (let i = 0; i < 4; i++)
        v.box(p.x - 0.22 + i * 0.14, y + 0.9, p.z + 0.22, 0.025, 0.1, 0.04, v.s.ivory);
      for (let i = 0; i < 5; i++)
        v.box(p.x, y + 0.3 + i * 0.045, p.z + 0.22, 0.55, 0.012, 0.02, v.s.rust);
      if (id === 'radio' || id === 'bridge') {
        v.box(p.x + 0.3, y + 2.1, p.z, 0.025, 1.9, 0.025, v.s.zinc);
        v.box(p.x + 0.3, y + 2.8, p.z, 0.75, 0.02, 0.02, v.s.zinc);
      }
      v.sign(p.name, p.x, y + 1.8, p.z + 0.25, 2.3);
    }
  }
  roadside() {
    const v = this.view;
    const bulb = new THREE.MeshStandardMaterial({
      color: '#e6b877',
      emissive: '#e6b877',
      emissiveIntensity: 0.65,
    });
    this.bulb = bulb;
    let count = 0;
    for (const road of MAP.roads) {
      if (!road.name || road.bridge || ++count % 7) continue;
      const [a, b] = road.points,
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      if (length < 10) continue;
      const x = (a[0] + b[0]) / 2 + (dz / length) * 5,
        z = (a[1] + b[1]) / 2 - (dx / length) * 5;
      if (!canStand(x, z) || inParking(MAP.parking, x, z, 1) || waterAt(x, z)) continue;
      this.lampPositions.push(new THREE.Vector3(x, groundHeight(x, z) + 4.15, z));
      const y = groundHeight(x, z),
        yaw = Math.atan2(dx, dz);
      v.box(x, y + 2.2, z, 0.08, 4.4, 0.08, v.s.rust);
      v.box(x, y + 4.4, z, 1.7, 0.08, 0.08, v.s.rust, yaw);
      v.box(x, y + 4.3, z, 0.5, 0.12, 0.2, bulb, yaw);
      // Small street furniture, never a new invisible barrier across a road.
      v.sign('SKYDDSRUM →', x, y + 1.9, z + 0.08, 1.2, yaw);
    }
  }
  setNight(night, camera) {
    this.bulb.emissiveIntensity = 0.06 + night * 2;
    const low = this.view.softwareRenderer || this.view.settings?.graphics === 'low';
    const nearest = this.lampPositions
      .filter((p) => p.distanceToSquared(camera) < 70 * 70)
      .sort((a, b) => a.distanceToSquared(camera) - b.distanceToSquared(camera));
    this.streetLights.forEach((light, i) => {
      light.intensity = nearest[i] && i < (low ? 2 : 6) ? night * 100 : 0;
      light.visible = light.intensity > 0;
      if (nearest[i]) light.position.copy(nearest[i]);
    });
  }
  sway(mat, amount) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = this.wind;
      shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float sway = sin(uWindTime * 1.3 + instanceMatrix[3].x * .17 + instanceMatrix[3].z * .11);
        transformed.x += sway * pow(max(0.0, position.y + .5), 2.0) * ${amount.toFixed(3)};
        #endif`,
      );
    };
    mat.customProgramCacheKey = () => `avesta-wind-${amount}`;
  }
  groundCover() {
    this.floor = buildForestFloor(this.view, this.wind);
  }
  update(time, p) {
    this.wind.value = time;
    this.floor.update(this.view.camera.position);
    const target = p && campaignTarget(p);
    this.marker.visible = Boolean(target);
    if (target) {
      this.marker.position.set(
        target.x,
        groundHeight(target.x, target.z) + 2.4 + Math.sin(time * 2) * 0.12,
        target.z,
      );
      this.marker.rotation.y = time * 0.7;
    }
    const restored = p?.campaign?.step >= 8;
    this.statusMaterial.emissive.set(restored ? '#8bd5b5' : '#f4bd76');
    this.view.s.water.normalMap?.offset.set(time * 0.006, time * 0.004);
  }
  quality(level) {
    this.floor.quality(level);
  }
}

export function waterNormals() {
  const size = 128,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        a = (x / size) * Math.PI * 2,
        b = (y / size) * Math.PI * 2;
      pixels[i] = 128 + Math.sin(a * 4 + Math.cos(b * 2)) * 28;
      pixels[i + 1] = 128 + Math.cos(b * 6 + Math.sin(a * 2)) * 22;
      pixels[i + 2] = 245;
      pixels[i + 3] = 255;
    }
  const map = new THREE.DataTexture(pixels, size, size);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}
