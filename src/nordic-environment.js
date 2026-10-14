import * as THREE from 'three';
import { forestAt } from '../shared/forest.js';
import { MAP, groundHeight, canStand, roadsNear, segmentDistance, waterAt } from '../shared/map.js';
import { roadWidth } from '../shared/roads.js';
import { inParking } from '../shared/sites.js';

export function groundDetail(material) {
  const size = 256,
    pixels = new Uint8Array(size * size * 4);
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const i = (z * size + x) * 4,
        value = forestAt(((x + 0.5) / size) * 4800 - 2400, ((z + 0.5) / size) * 4800 - 2400)
          ? 255
          : 0;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
  const map = new THREE.DataTexture(pixels, size, size);
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWoodland = { value: map };
    shader.vertexShader = 'varying vec3 vNordicGround;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvNordicGround=(modelMatrix*vec4(transformed,1.0)).xyz;',
    );
    shader.fragmentShader =
      `varying vec3 vNordicGround; uniform sampler2D uWoodland;
      float nordicNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);vec2 k=vec2(127.1,311.7);return mix(mix(fract(sin(dot(i,k))*43758.5453),fract(sin(dot(i+vec2(1,0),k))*43758.5453),f.x),mix(fract(sin(dot(i+vec2(0,1),k))*43758.5453),fract(sin(dot(i+vec2(1,1),k))*43758.5453),f.x),f.y);}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float woodland=texture2D(uWoodland,(vNordicGround.xz+2400.0)/4800.0).r;
      float floorVariation=nordicNoise(vNordicGround.xz*.075);
      float grain=nordicNoise(vNordicGround.xz*5.2);
      vec3 floorTint=mix(vec3(.76,.78,.66),mix(vec3(.43,.50,.33),vec3(.64,.56,.40),floorVariation),woodland*.84);
      diffuseColor.rgb*=floorTint*(.9+grain*.16);
    `,
    );
  };
  material.customProgramCacheKey = () => 'avesta-nordic-ground-1';
}

function floorMaterial(fern) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  let seed = fern ? 6331 : 7219;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (fern)
    for (let j = 0; j < 9; j++) {
      const angle = (j - 4) * 0.19,
        reach = 140 + random() * 220;
      for (let t = 0.12; t < 1; t += 0.055) {
        const x = 128 + Math.sin(angle) * reach * t,
          y = 505 - Math.cos(angle) * reach * t,
          w = Math.sin(Math.PI * t) * (16 + reach * 0.08);
        ctx.strokeStyle = ['#344b2c', '#50633a', '#657447', '#495a31'][j % 4];
        ctx.lineWidth = 2.6;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + side * w * 0.6, y + 4, x + side * w, y + 11);
          ctx.stroke();
        }
      }
    }
  else
    for (let j = 0; j < 90; j++) {
      const x = 20 + random() * 216,
        y = 80 + random() * 340;
      ctx.strokeStyle = ['#8a8159', '#b2a075', '#6d7750', '#737146'][j % 4];
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 512);
      ctx.quadraticCurveTo(x + random() * 35 - 17, y + 80, x + random() * 70 - 35, y);
      ctx.stroke();
    }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.48,
    side: THREE.DoubleSide,
    roughness: 1,
  });
}

export function buildForestFloor(v, wind) {
  const mats = [floorMaterial(false), floorMaterial(true)],
    cells = new Map(),
    dummy = new THREE.Object3D();
  mats.forEach((m, i) => {
    m.onBeforeCompile = (s) => {
      s.uniforms.uFloorWind = wind;
      s.vertexShader = 'uniform float uFloorWind;\n' + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\ntransformed.x+=sin(uFloorWind*1.4+instanceMatrix[3].x*.23+instanceMatrix[3].z*.13)*pow(position.y+.5,2.0)*.16;`,
      );
    };
    m.customProgramCacheKey = () => `nordic-understory-${i}`;
  });
  for (let i = 0; i < 68000; i++) {
    const tree = MAP.trees[(i * 719) % MAP.trees.length],
      a = i * 2.39996,
      x = tree.x + Math.sin(a) * (2 + (i % 7)),
      z = tree.z + Math.cos(a) * (2 + (i % 7));
    if (
      !canStand(x, z) ||
      waterAt(x, z) ||
      inParking(MAP.parking, x, z, 1) ||
      roadsNear(x, z).some((r) => segmentDistance(x, z, ...r.points) < roadWidth(r) / 2 + 1.1)
    )
      continue;
    const kind = tree.forestSourced && i % 3 ? 1 : 0,
      key = `${Math.floor(x / 100)},${Math.floor(z / 100)}:${kind}`;
    if (!cells.has(key))
      cells.set(key, {
        kind,
        points: [],
        x: Math.floor(x / 100) * 100 + 50,
        z: Math.floor(z / 100) * 100 + 50,
      });
    cells
      .get(key)
      .points.push({ x, z, h: kind ? 0.45 + (i % 5) * 0.09 : 0.25 + (i % 7) * 0.035, yaw: a });
  }
  const groups = [];
  for (const cell of cells.values()) {
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      mats[cell.kind],
      cell.points.length * 2,
    );
    cell.points.forEach((p, i) => {
      for (let j = 0; j < 2; j++) {
        dummy.position.set(p.x, groundHeight(p.x, p.z) + p.h / 2 - 0.025, p.z);
        dummy.scale.set(p.h * (cell.kind ? 1.8 : 1.3), p.h, 1);
        dummy.rotation.set(0, p.yaw + (j * Math.PI) / 2, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i * 2 + j, dummy.matrix);
      }
    });
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    v.scene.add(mesh);
    groups.push({ ...cell, mesh });
  }
  let quality = 'medium';
  return {
    quality: (q) => {
      quality = q;
    },
    update(camera) {
      const radius = quality === 'high' ? 155 : quality === 'low' ? 0 : 100;
      for (const g of groups) g.mesh.visible = Math.hypot(camera.x - g.x, camera.z - g.z) < radius;
    },
  };
}

export function buildRoadDetails(v) {
  const paint = new THREE.MeshStandardMaterial({ color: '#c3c2ab', roughness: 1 }),
    post = new THREE.MeshStandardMaterial({ color: '#d2d0bd', roughness: 0.95 });
  let count = 0;
  for (const r of MAP.roads) {
    if (!['trunk', 'primary', 'secondary', 'tertiary'].includes(r.highway) || r.adjusted) continue;
    const [a, b] = r.points,
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz),
      yaw = Math.atan2(dx, dz);
    if (length < 5) continue;
    if (roadWidth(r) >= 6)
      for (let d = 2; d < length - 1; d += 12) {
        const x = a[0] + (dx * d) / length,
          z = a[1] + (dz * d) / length;
        v.box(x, groundHeight(x, z) + 0.028, z, 0.1, 0.012, Math.min(2.8, length - d), paint, yaw);
      }
    if (++count % 3) continue;
    for (const side of [-1, 1]) {
      const x = (a[0] + b[0]) / 2 + (dz / length) * side * (roadWidth(r) / 2 + 1),
        z = (a[1] + b[1]) / 2 - (dx / length) * side * (roadWidth(r) / 2 + 1);
      if (!canStand(x, z)) continue;
      const y = groundHeight(x, z);
      v.box(x, y + 0.47, z, 0.12, 0.94, 0.1, post, yaw);
      v.box(x, y + 0.74, z, 0.13, 0.18, 0.11, v.s.metal, yaw);
    }
  }
}

export class WoodlandMist {
  constructor(view) {
    this.view = view;
    this.uniforms = {
      uTime: { value: 0 },
      uDensity: { value: 0 },
      uColor: { value: new THREE.Color('#a6b4b1') },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'varying vec2 vUv;uniform float uTime,uDensity;uniform vec3 uColor;void main(){vec2 q=(vUv-.5)*2.0;float edge=pow(max(0.0,1.0-dot(q,q)),2.0);float strand=.6+.4*sin(vUv.x*17.0+sin(vUv.y*9.0+uTime*.07)*2.0+uTime*.035);gl_FragColor=vec4(uColor,edge*strand*uDensity);}',
    });
    const points = [
      ...MAP.rivers
        .filter((_, i) => i % 11 === 0)
        .map((r) => ({ x: r.points[0][0], z: r.points[0][1] })),
      ...MAP.trees.filter((t, i) => t.forestSourced && i % 1103 === 0),
    ];
    this.cards = points.map((p, i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(65 + (i % 4) * 12, 7 + (i % 3) * 2),
        this.material,
      );
      mesh.position.set(p.x, groundHeight(p.x, p.z) + 2.7, p.z);
      view.scene.add(mesh);
      return mesh;
    });
  }
  update(t, mood, camera, quality, software) {
    this.uniforms.uTime.value = t;
    this.uniforms.uDensity.value = mood.mist * (0.045 + mood.night * 0.025);
    this.uniforms.uColor.value.copy(this.view.scene.fog.color);
    for (const mesh of this.cards) {
      mesh.visible =
        !software &&
        quality !== 'low' &&
        Math.hypot(mesh.position.x - camera.x, mesh.position.z - camera.z) < 450;
      mesh.rotation.y = this.view.camera.rotation.y;
    }
  }
}
