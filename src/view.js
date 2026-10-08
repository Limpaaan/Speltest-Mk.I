import { ENEMY_TYPES } from '../shared/enemies.js';
import { weaponModel } from './weapons.js';
import { WEAPONS } from '../shared/weapons.js';
import { terrain, terrainHeight } from '../shared/terrain.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAP, waterAt, segmentDistance, eyeHeight, groundHeight } from '../shared/map.js';
import { CLASSES, RARITY_COLORS } from '../shared/game.js';
import { surfaces, spruceMaterial } from './surfaces.js';
import { CAMP, NPCS } from '../shared/progression.js';
export class WorldView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = this.renderer.getContext(),
      debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.softwareRenderer = Boolean(
      debug &&
      /swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
    );
    this.renderer.setPixelRatio(this.softwareRenderer ? 0.65 : Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !this.softwareRenderer;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#96a6a3');
    this.scene.fog = new THREE.FogExp2('#96a6a3', 0.003);
    this.camera = new THREE.PerspectiveCamera(78, 1, 0.04, 1300);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(new THREE.HemisphereLight('#d3dfdd', '#605f43', 2.4));
    this.sun = new THREE.DirectionalLight('#f6deba', 2.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -80,
      right: 80,
      top: 80,
      bottom: -80,
      near: 1,
      far: 350,
    });
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.s = surfaces();
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.batches = new Map();
    this.entities = new Map();
    this.shots = new THREE.Group();
    this.scene.add(this.shots);
    this.seenShots = new Set();
    this.recoil = 0;
    this.ads = 0;
    this.buildSky();
    this.buildMap();
    this.flush();
    this.buildWeapon();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  static(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, yaw = 0) {
    let clone = geo.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y + (this.baseY || 0), z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(sx, sy, sz),
    );
    if (geo === this.boxGeo && mat.map) {
      const uv = clone.attributes.uv,
        dimensions = [
          [sz, sy],
          [sz, sy],
          [sx, sz],
          [sx, sz],
          [sx, sy],
          [sx, sy],
        ];
      for (let face = 0; face < 6; face++)
        for (let j = 0; j < 4; j++) {
          const i = face * 4 + j;
          uv.setXY(
            i,
            (uv.getX(i) * dimensions[face][0]) / 3,
            (uv.getY(i) * dimensions[face][1]) / 3,
          );
        }
    }
    if (clone.index) {
      const old = clone;
      clone = old.toNonIndexed();
      old.dispose();
    }
    clone.applyMatrix4(matrix);
    if (!this.batches.has(mat)) this.batches.set(mat, []);
    this.batches.get(mat).push(clone);
  }
  box(x, y, z, w, h, d, mat = this.s.concrete, yaw = 0) {
    this.static(this.boxGeo, mat, x, y, z, w, h, d, yaw);
  }
  flush() {
    for (const [mat, geos] of this.batches)
      for (let i = 0; i < geos.length; i += 300) {
        const chunk = geos.slice(i, i + 300),
          geo = mergeGeometries(chunk);
        chunk.forEach((g) => g.dispose());
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = mat !== this.s.water && mat !== this.s.glass;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    this.batches.clear();
  }
  sign(text, x, y, z, width = 7, yaw = 0) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#203a30';
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = '#b6ae86';
    ctx.strokeRect(5, 5, 502, 86);
    ctx.fillStyle = '#ddd4b3';
    ctx.font = 'bold 27px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase(), 256, 59, 485);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, (width * 96) / 512),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
    );
    mesh.position.set(x, y + (this.baseY || 0), z);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);
  }
  buildSky() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d'),
      gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#627d8b');
    gradient.addColorStop(1, '#b1b9b0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 45; i++) {
      const x = (Math.sin(i * 9) + 1) * 512,
        y = (Math.cos(i * 13) + 1) * 190;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 120);
      g.addColorStop(0, '#d0d3ca50');
      g.addColorStop(1, '#d0d3ca00');
      ctx.fillStyle = g;
      ctx.fillRect(x - 150, y - 150, 300, 300);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(950, 32, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false }),
    );
    this.scene.add(this.sky);
  }
  buildMap() {
    const s = this.s;
    const ground = new THREE.PlaneGeometry(1200, 1200, terrain.width - 1, terrain.height - 1);
    ground.rotateX(-Math.PI / 2);
    const points = ground.attributes.position;
    for (let i = 0; i < points.count; i++)
      points.setY(i, terrainHeight(points.getX(i), points.getZ(i)));
    ground.computeVertexNormals();
    const uv = ground.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 120, uv.getY(i) * 120);
    this.static(ground, s.soil, 0, 0, 0);
    ground.dispose();
    const strip = (segments, mat, offset, width) => {
      const vertices = [];
      for (const r of segments) {
        const [a, b] = r.points,
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz);
        if (!length) continue;
        const steps = Math.ceil(length / 2),
          half = (width || r.width || (r.name ? 5.6 : 3.1)) / 2;
        const ox = (dz / length) * half,
          oz = (-dx / length) * half;
        const point = (t, side) => {
          const x = a[0] + dx * t + ox * side,
            z = a[1] + dz * t + oz * side;
          return [x, groundHeight(x, z) + offset, z];
        };
        for (let i = 0; i < steps; i++) {
          const a1 = point(i / steps, -1),
            a2 = point(i / steps, 1),
            b1 = point((i + 1) / steps, -1),
            b2 = point((i + 1) / steps, 1);
          vertices.push(...a1, ...b1, ...a2, ...a2, ...b1, ...b2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          vertices.flatMap((v, i) => (i % 3 === 1 ? [] : [v / 3])),
          2,
        ),
      );
      geo.computeVertexNormals();
      this.static(geo, mat, 0, 0, 0);
      geo.dispose();
    };
    strip(MAP.roads, s.asphalt, 0.04);
    strip(MAP.rivers, s.water, 0.065);
    for (const water of MAP.waters) {
      // Dense masked tiles avoid giant flat triangles covering river valleys.
      const xs = water.points.map((p) => p[0]),
        zs = water.points.map((p) => p[1]);
      const minX = Math.max(-600, Math.floor(Math.min(...xs) / 5) * 5),
        maxX = Math.min(600, Math.max(...xs));
      const minZ = Math.max(-600, Math.floor(Math.min(...zs) / 5) * 5),
        maxZ = Math.min(600, Math.max(...zs));
      const vertices = [];
      for (let x = minX; x < maxX; x += 5)
        for (let z = minZ; z < maxZ; z += 5) {
          if (!waterAt(x + 2.5, z + 2.5)) continue;
          for (const [dx, dz] of [
            [0, 0],
            [0, 5],
            [5, 0],
            [5, 0],
            [0, 5],
            [5, 5],
          ])
            vertices.push(x + dx, terrainHeight(x + dx, z + dz) + 0.08, z + dz);
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          vertices.flatMap((v, i) => (i % 3 === 1 ? [] : [v / 3])),
          2,
        ),
      );
      geo.computeVertexNormals();
      this.static(geo, s.water, 0, 0, 0);
      geo.dispose();
    }
    strip(MAP.bridges, s.concrete, 0.08, 10);
    for (const bridge of MAP.bridges) {
      const [a, b] = bridge.points,
        length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (const side of [-1, 1])
        for (let i = 0; i < length; i += 2) {
          const x = a[0] + ((b[0] - a[0]) * i) / length + Math.cos(yaw) * side * 4.6,
            z = a[1] + ((b[1] - a[1]) * i) / length - Math.sin(yaw) * side * 4.6;
          this.box(x, groundHeight(x, z) + 0.6, z, 0.07, 1.2, 0.07, s.metal);
          this.box(
            x,
            groundHeight(x, z) + 1.15,
            z,
            0.08,
            0.08,
            Math.min(2.1, length - i),
            s.metal,
            yaw,
          );
        }
    }
    for (const p of [...MAP.places, ...(MAP.buildings || [])]) {
      this.baseY = groundHeight(p.x, p.z);
      if (p.type === 'horse') this.horse(p);
      else if (p.w && p.d) this.building(p);
    }
    this.baseY = 0;
    for (const p of MAP.cover) {
      this.baseY = groundHeight(p.x, p.z);
      this.box(p.x, p.h / 2, p.z, p.w, p.h, p.d, p.type === 'crate' ? s.wood : s.rust);
      if (p.type === 'wreck') {
        this.box(p.x, p.h + 0.22, p.z, 1.5, 0.45, 1.8, s.metal);
      }
    }
    this.baseY = 0;
    this.vegetation();
    this.buildCamp();
    for (const npc of NPCS) {
      const actor = this.soldier(npc);
      actor.position.set(npc.x, groundHeight(npc.x, npc.z), npc.z);
      this.scene.add(actor);
      this.sign(npc.name, npc.x, groundHeight(npc.x, npc.z) + 2.6, npc.z, 4);
      this.box(npc.x + 1.5, groundHeight(npc.x + 1.5, npc.z) + 0.6, npc.z, 1, 1.2, 1, this.s.wood);
    }
    for (const p of MAP.places.filter((p) => p.type === 'viewpoint'))
      this.sign(p.name, p.x, groundHeight(p.x, p.z) + 2, p.z, 6);

    const p = MAP.places.find((p) => p.id === 'aalto');
    this.sign(
      'AVESTA / VI STÅR KVAR',
      p.x + p.w / 2 + 0.12,
      groundHeight(p.x, p.z) + 3.5,
      p.z + 1,
      8,
      Math.PI / 2,
    );
  }
  building(p) {
    const s = this.s,
      works = p.type === 'works',
      mat =
        works || p.type === 'warehouse'
          ? s.brick
          : p.type === 'cottage'
            ? s.wood
            : p.type === 'mall'
              ? s.brick
              : s.plaster,
      h = works ? p.h - 6 : p.h;
    this.box(p.x, h / 2, p.z, p.w, h, p.d, mat);
    this.box(p.x, -1, p.z, p.w + 0.7, 3, p.d + 0.7, s.concrete);
    this.box(p.x, h + 0.12, p.z, p.w + 0.5, 0.24, p.d + 0.5, s.roof);
    for (let side = 0; side < 4; side++) {
      const yaw = (side * Math.PI) / 2,
        nx = Math.sin(yaw),
        nz = Math.cos(yaw),
        ax = Math.cos(yaw),
        az = -Math.sin(yaw),
        width = side % 2 ? p.d : p.w,
        depth = (side % 2 ? p.w : p.d) / 2;
      const box = (u, y, offset, w, hh, d, m) =>
        this.box(
          p.x + nx * (depth + offset) + ax * u,
          y,
          p.z + nz * (depth + offset) + az * u,
          w,
          hh,
          d,
          m,
          yaw,
        );
      const columns = Math.floor((width - 2) / 3.7),
        floors = Math.floor((h - 1) / 3.2);
      for (let row = 0; row < floors; row++)
        for (let col = 0; col < columns; col++) {
          const u = ((col - (columns - 1) / 2) * (width - 2)) / columns,
            y = 2.4 + row * 3.2,
            w = works ? 2.1 : 1.7;
          box(u, y, 0.03, w + 0.2, 1.85, 0.08, s.concrete);
          box(u, y, 0.085, w, 1.65, 0.03, s.glass);
          box(u, y - 0.9, 0.18, w + 0.3, 0.12, 0.35, s.concrete);
          for (const d of [-w / 2, 0, w / 2]) box(u + d, y, 0.12, 0.05, 1.65, 0.04, s.metal);
          box(u, y + 0.15, 0.12, w, 0.045, 0.05, s.metal);
          if (p.type === 'aalto' && col % 3 === 0 && row > 0) {
            box(u, y - 0.88, 0.64, w + 0.3, 0.12, 1, s.concrete);
            box(u, y - 0.35, 1.13, w + 0.3, 0.05, 0.06, s.metal);
            for (let b = -2; b <= 2; b++)
              box(u + b * 0.37, y - 0.6, 1.13, 0.03, 0.55, 0.03, s.metal);
          }
        }
      for (const u of [-width / 2 + 0.2, width / 2 - 0.2])
        box(u, h / 2, 0.14, 0.12, h, 0.12, s.metal);
      box(0, 1.25, 0.14, 1.6, 2.5, 0.07, s.metal);
      box(0, 2.7, 0.65, 2.6, 0.14, 1.3, s.roof);
      if (works)
        for (let u = -width / 2 + 1; u < width / 2; u += 5)
          box(u, h / 2, 0.22, 0.4, h, 0.45, s.brick);
    }
    if (works || p.type === 'cottage' || p.type === 'warehouse' || p.type === 'school') {
      const shape = new THREE.Shape();
      shape.moveTo(-p.w / 2, 0);
      shape.lineTo(0, works ? 5.5 : 2.2);
      shape.lineTo(p.w / 2, 0);
      shape.closePath();
      const roof = new THREE.ExtrudeGeometry(shape, { depth: p.d, bevelEnabled: false });
      this.static(roof, s.roof, p.x, h, p.z - p.d / 2);
      roof.dispose();
      if (works) {
        const chimney = new THREE.CylinderGeometry(1, 1.6, 24, 12);
        this.static(chimney, s.brick, p.x - p.w / 3, 18, p.z - 3);
        chimney.dispose();
      }
    }
    this.box(p.x + p.w / 4, h + 0.6, p.z, 2, 1.2, 3, s.metal);
    if (p.name)
      this.sign(
        (p.verified ? '' : '~ ') + p.name,
        p.x,
        3.8,
        p.z + p.d / 2 + 0.2,
        Math.min(10, p.w / 2),
      );
  }
  horse(p) {
    // Original model based on the inspected municipal photograph; no photo textures are embedded.
    const red = this.s.plaster.clone();
    red.color.set('#e25f36');
    const black = new THREE.MeshStandardMaterial({ color: '#272e29', roughness: 0.9 });
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    this.static(sphere, red, p.x, 6.4, p.z, 4.4, 2.8, 1.65);
    const leg = new THREE.CylinderGeometry(0.77, 0.52, 5.2, 14);
    for (const x of [-2.8, 2.5])
      for (const z of [-1.05, 1.05]) {
        this.static(leg, red, p.x + x, 2.65, p.z + z);
        const hoof = new THREE.CylinderGeometry(0.55, 0.57, 0.25, 14);
        this.static(hoof, black, p.x + x, 0.2, p.z + z);
        hoof.dispose();
      }
    leg.dispose();
    this.static(sphere, red, p.x + 2.6, 9, p.z, 1.5, 3.6, 1.25);
    this.static(sphere, red, p.x + 3.6, 11.2, p.z, 1.8, 1.1, 1.2);
    this.box(p.x + 2.1, 12.8, p.z - 0.68, 0.45, 1, 0.5, red);
    this.box(p.x + 2.1, 12.8, p.z + 0.68, 0.45, 1, 0.5, red);
    sphere.dispose();
    for (const side of [-1, 1]) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 256);
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 62;
        for (const [radius, color] of [
          [43, '#e8e3c9'],
          [34, '#317a65'],
          [23, '#c4cb76'],
        ]) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(x, 125, 29, radius, Math.sin(i) * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#92603b';
        ctx.beginPath();
        ctx.arc(x, 125, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 2.8),
        new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          roughness: 1,
        }),
      );
      m.position.set(p.x, groundHeight(p.x, p.z) + 7, p.z + side * 1.67);
      this.scene.add(m);
    }
    this.sign('DALAHÄSTEN / AVESTA', p.x, 1, p.z + 3.5, 7);
  }
  vegetation() {
    const dummy = new THREE.Object3D();
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.32, 0.48, 1, 8),
      this.s.bark,
      MAP.trees.length,
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      spruceMaterial(),
      MAP.trees.length * 3,
    );
    let count = 0;
    for (const { x, z, h } of MAP.trees) {
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x, groundHeight(x, z) + h / 2, z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      trunks.setMatrixAt(count, dummy.matrix);
      for (let j = 0; j < 3; j++) {
        dummy.position.set(x, groundHeight(x, z) + h * 0.5, z);
        dummy.rotation.y = (j * Math.PI) / 3 + count;
        dummy.scale.set(h * 0.48, h, 1);
        dummy.updateMatrix();
        crowns.setMatrixAt(count * 3 + j, dummy.matrix);
      }
      count++;
    }
    const rocks = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      this.s.concrete,
      MAP.rocks.length,
    );
    MAP.rocks.forEach((p, i) => {
      dummy.position.set(p.x, groundHeight(p.x, p.z) + p.h * 0.4, p.z);
      dummy.rotation.set(0.12, i, 0.25);
      dummy.scale.set(p.radius, p.h * 0.6, p.radius);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.scene.add(rocks);
    trunks.count = count;
    crowns.count = count * 3;
    trunks.castShadow = crowns.castShadow = true;
    this.scene.add(trunks, crowns);
  }
  buildCamp() {
    const { x, z } = CAMP;
    this.baseY = groundHeight(x, z);
    const maja = this.soldier({ classId: 'kopparslagare' });
    maja.position.set(x, this.baseY, z);
    maja.rotation.y = -0.9;
    this.scene.add(maja);
    this.box(x + 2, 0.85, z - 2, 3.2, 0.18, 1.1, this.s.wood);
    for (const dx of [0.6, 3.4])
      for (const dz of [-2.4, -1.6]) this.box(x + dx, 0.4, z + dz, 0.1, 0.8, 0.1, this.s.metal);
    this.box(x + 2, 1.05, z - 2, 0.75, 0.25, 0.6, this.s.rust);
    for (const dx of [-1, 4])
      for (const dz of [-3.5, 0.5]) this.box(x + dx, 1.6, z + dz, 0.09, 3.2, 0.09, this.s.wood);
    this.box(x + 1.5, 3.2, z - 1.5, 5.6, 0.08, 4.6, this.s.roof);
    this.sign('MAJAS SKIFTBOD / UPPDRAG & VERKSTAD', x + 1.5, 2.7, z + 0.65, 5);
    this.sign('VI LÄMNAR INGEN BAKOM OSS', x + 1.5, 1.7, z - 3.4, 4);
    this.baseY = 0;
  }
  part(parent, geo, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  rifle(kind = 'rifle') {
    return weaponModel(kind, this.s, this.boxGeo);
  }
  soldier(entity) {
    const group = new THREE.Group(),
      uniform = new THREE.MeshStandardMaterial({
        color: entity.classId
          ? CLASSES[entity.classId].color
          : entity.landmark === 'horse'
            ? '#614d86'
            : ENEMY_TYPES[entity.type]?.color || '#62674e',
        roughness: 1,
      });
    group.userData.ownMaterial = uniform;
    const capsule = new THREE.CapsuleGeometry(0.12, 0.4, 4, 8),
      sphere = new THREE.SphereGeometry(1, 12, 8);
    this.part(group, capsule, uniform, 0, 1.13, 0, 1.7, 0.65, 1);
    this.part(group, sphere, this.s.metal, 0, 1.69, 0, 0.16, 0.17, 0.15);
    group.userData.legs = [];
    for (const side of [-1, 1]) {
      group.userData.legs.push(
        this.part(group, capsule, uniform, side * 0.13, 0.47, 0, 0.72, 1.05, 0.8),
      );
      this.part(group, capsule, uniform, side * 0.25, 1.1, 0.13, 0.5, 0.7, 0.5).rotation.x = -0.4;
      this.part(group, this.boxGeo, this.s.metal, side * 0.13, 0.08, 0.055, 0.18, 0.14, 0.28);
    }
    const rifle = this.rifle(entity.weapon?.kind || ENEMY_TYPES[entity.type]?.weapon || 'rifle');
    rifle.position.set(0.1, 1.13, 0.35);
    rifle.rotation.y = Math.PI;
    group.add(rifle);
    group.userData.geometries = [capsule, sphere];
    const armor = entity.type === 'heavy' || entity.type === 'boss';
    if (armor) {
      this.part(group, this.boxGeo, this.s.metal, 0, 1.18, 0.13, 0.48, 0.48, 0.16);
      for (const side of [-1, 1])
        this.part(group, sphere, this.s.rust, side * 0.28, 1.43, 0, 0.17, 0.14, 0.16);
      this.part(group, this.boxGeo, this.s.metal, 0, 1.69, 0.14, 0.28, 0.12, 0.06);
    }
    if (entity.type === 'marksman') {
      this.part(group, sphere, uniform, 0, 1.7, -0.03, 0.23, 0.21, 0.23);
      this.part(group, this.boxGeo, uniform, 0, 1.17, -0.15, 0.55, 0.68, 0.13);
    }
    if (entity.type === 'rusher') {
      this.part(group, this.boxGeo, this.s.wood, 0, 1.12, -0.18, 0.3, 0.43, 0.22);
      this.part(group, this.boxGeo, this.s.rust, 0, 1.69, 0.15, 0.25, 0.06, 0.03);
    }
    if (entity.classId === 'faltvardare') {
      this.part(group, this.boxGeo, this.s.plaster, 0, 1.15, 0.13, 0.27, 0.27, 0.08);
      this.part(group, this.boxGeo, this.s.rust, 0, 1.15, 0.18, 0.18, 0.06, 0.01);
      this.part(group, this.boxGeo, this.s.rust, 0, 1.15, 0.18, 0.06, 0.18, 0.01);
    }
    if (entity.landmark === 'horse') {
      this.part(group, this.boxGeo, uniform, 0, 1.22, -0.21, 0.48, 0.8, 0.06);
      const crest = new THREE.ConeGeometry(0.11, 0.4, 8);
      this.part(group, crest, this.s.rust, 0, 1.97, 0);
      group.userData.geometries.push(crest);
    }
    if (entity.landmark === 'verket')
      for (const side of [-1, 1])
        this.part(group, this.boxGeo, this.s.rust, side * 0.2, 1.3, -0.23, 0.17, 0.6, 0.18);

    if (entity.type === 'boss') {
      const scale = 3.1 / 1.85;
      group.scale.setScalar(scale);
      const rider = entity.landmark === 'horse';
      const geo = rider
        ? new THREE.RingGeometry(0, 38 / scale, 40, 1, -Math.PI / 2 - 0.4, 0.8)
        : new THREE.RingGeometry(22.8 / scale, 24 / scale, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: '#ef873d',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035;
      ring.visible = false;
      group.add(ring);
      group.userData.warning = ring;
      group.userData.geometries.push(geo);
      group.userData.warningMaterial = mat;
    }
    return group;
  }
  buildWeapon() {
    this.weaponScene = new THREE.Scene();
    this.weaponScene.add(new THREE.HemisphereLight('#e4e9d9', '#454e35', 3));
    this.weaponCamera = new THREE.PerspectiveCamera(65, 1, 0.025, 8);
    this.weaponCache = new Map();
    this.weapon = this.rifle();
    this.weaponCache.set('rifle', this.weapon);
    this.weaponScene.add(this.weapon);
    const glove = new THREE.MeshStandardMaterial({ color: '#43513d', roughness: 1 });
    const arm = new THREE.CapsuleGeometry(0.035, 0.25, 4, 8);
    this.hands = new THREE.Group();
    this.weapon.add(this.hands);
    for (const side of [-1, 1]) {
      const mesh = this.part(this.hands, arm, glove, side * 0.1, -0.18, 0.1);
      mesh.rotation.x = -1.1;
    }
    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 4),
      new THREE.MeshBasicMaterial({ color: '#ffe6ad' }),
    );
    this.flash.position.set(0, 0.01, -0.6);
    this.weapon.add(this.flash);
  }
  render(state, myId, dt, active, time, controls = {}) {
    const player = state.players[myId],
      seen = new Set();
    for (const e of [
      ...Object.values(state.players),
      ...state.enemies,
      ...state.loot.map((e) => ({ ...e, loot: true })),
    ]) {
      seen.add(e.id);
      let mesh = this.entities.get(e.id);
      if (!mesh) {
        if (e.loot) {
          mesh = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial({
            color: RARITY_COLORS[e.weapon.rarity],
            emissive: RARITY_COLORS[e.weapon.rarity],
            emissiveIntensity: 0.25,
          });
          this.part(mesh, this.boxGeo, mat, 0, 0.2, 0, 0.65, 0.4, 0.45);
          mesh.userData.ownMaterial = mat;
          mesh.userData.geometries = [];
        } else mesh = this.soldier(e);
        mesh.position.set(e.x, groundHeight(e.x, e.z), e.z);
        this.entities.set(e.id, mesh);
        this.scene.add(mesh);
      }
      const moving = Math.hypot(mesh.position.x - e.x, mesh.position.z - e.z) > 0.015;
      mesh.userData.legs?.forEach(
        (leg, i) => (leg.rotation.x = moving ? Math.sin(time * 8 + i * Math.PI) * 0.42 : 0),
      );
      if (mesh.userData.warning) {
        mesh.userData.warning.visible = e.windup > 0;
        mesh.userData.warning.material.opacity = 0.4 + Math.sin(time * 14) * 0.2;
      }
      mesh.position.lerp(new THREE.Vector3(e.x, groundHeight(e.x, e.z), e.z), Math.min(1, dt * 20));
      mesh.visible =
        (e.loot ? e.owner === myId : e.hp > 0) &&
        !(active && e.id === myId) &&
        Math.hypot(e.x - this.camera.position.x, e.z - this.camera.position.z) < 180;
      mesh.rotation.y =
        (e.windup > 0 ? e.attackAim : e.aim) ??
        (player ? Math.atan2(player.x - e.x, player.z - e.z) : 0);
      mesh.scale.y = (e.type === 'boss' ? 3.1 / 1.85 : 1) * (e.crouch ? 0.65 : 1);
    }
    for (const [id, mesh] of this.entities)
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        mesh.userData.ownMaterial.dispose();
        mesh.userData.warningMaterial?.dispose();
        mesh.traverse((child) => child.userData.geometries?.forEach((g) => g.dispose()));
        this.entities.delete(id);
      }
    for (const line of [...this.shots.children]) {
      line.geometry.dispose();
      line.material.dispose();
      this.shots.remove(line);
    }
    let fired = false;
    for (const shot of state.shots) {
      if (shot.owner === myId && !this.seenShots.has(shot.id)) {
        this.seenShots.add(shot.id);
        fired = true;
        this.recoil = WEAPONS[shot.kind]?.recoil || 0.06;
      }
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(shot.x, shot.y ?? 1.4, shot.z),
        new THREE.Vector3(shot.endX, shot.endY ?? 1.4, shot.endZ),
      ]);
      this.shots.add(
        new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: shot.enemy ? '#e8ad7c' : '#eed9a5' }),
        ),
      );
    }
    for (const g of state.grenades || []) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#687852', roughness: 0.7 }),
      );
      mesh.position.set(g.x, g.y, g.z);
      this.shots.add(mesh);
    }
    for (const b of state.blasts || []) {
      const age = Math.max(0, state.time - b.time),
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 16, 8),
          new THREE.MeshBasicMaterial({
            color: '#f0b45c',
            transparent: true,
            opacity: Math.max(0, 0.45 - age * 0.65),
            wireframe: true,
          }),
        );
      mesh.position.set(b.x, b.y, b.z);
      mesh.scale.setScalar(Math.max(0.2, age * b.radius * 2));
      this.shots.add(mesh);
    }
    if (this.seenShots.size > 300) this.seenShots.clear();
    this.recoil *= Math.exp(-dt * 12);
    this.ads = THREE.MathUtils.lerp(this.ads, controls.ads ? 1 : 0, Math.min(1, dt * 12));
    if (active && player) {
      this.camera.position.set(
        player.x,
        groundHeight(player.x, player.z) + eyeHeight({ ...player, crouch: controls.crouch }),
        player.z,
      );
      this.camera.rotation.set(controls.pitch ?? 0, (controls.yaw ?? Math.PI) + Math.PI, 0, 'YXZ');
      const stats = WEAPONS[player.weapon.kind];
      if (this.weapon.userData.kind !== player.weapon.kind) {
        this.weaponScene.remove(this.weapon);
        if (!this.weaponCache.has(player.weapon.kind))
          this.weaponCache.set(player.weapon.kind, this.rifle(player.weapon.kind));
        this.weapon = this.weaponCache.get(player.weapon.kind);
        this.weaponScene.add(this.weapon);
        this.weapon.add(this.flash, this.hands);
      }
      this.flash.position.z = this.weapon.userData.muzzle;
      const baseFov = this.settings?.fov || 78;
      this.camera.fov = THREE.MathUtils.lerp(baseFov, baseFov / stats.zoom, this.ads);

      const bob =
        controls.moving && this.settings?.weaponBob !== false
          ? Math.sin(time * (player.sprinting ? 13 : 8)) * 0.013
          : 0;
      const reload = player.reload > 0 ? Math.sin(Math.PI * (1 - player.reload / stats.reload)) : 0;
      const rig = this.weapon.userData;
      this.weapon.position.set(
        0.24 * (1 - this.ads),
        THREE.MathUtils.lerp(-0.25, -rig.sightY, this.ads) + bob * (1 - this.ads) - reload * 0.2,
        -0.43 + this.ads * 0.15 + this.recoil,
      );
      this.weapon.rotation.set(reload * 0.35, 0, -reload * 0.65);
      rig.magazine.position.y = rig.magazineY - reload * (stats.pellets ? 0.04 : 0.22);
      this.hands.children[0].position.y = -0.18 - reload * 0.12;
      rig.action.position.z = this.recoil * 0.4;
      if (rig.pump) rig.pump.position.z = -0.43 + Math.min(0.13, this.recoil);
      document
        .getElementById('scope-overlay')
        ?.classList.toggle(
          'visible',
          stats.sight === 'scope' && this.ads > 0.92 && reload < 0.05 && player.hp > 0,
        );
      this.flash.visible = fired;
      this.weapon.visible = player.hp > 0;
      this.sun.position.set(player.x - 70, 160, player.z + 70);
      this.sun.target.position.set(player.x, 0, player.z);
    } else {
      document.getElementById('scope-overlay')?.classList.remove('visible');
      this.camera.position.set(23 + Math.sin(time * 0.04) * 3, groundHeight(23, 117) + 2, 117);
      this.camera.lookAt(-5, groundHeight(-5, 85) + 5, 85);
      this.camera.fov = 62;
      this.sun.position.set(-70, 160, 170);
      this.sun.target.position.set(0, 0, 95);
    }
    this.camera.updateProjectionMatrix();
    this.sky.position.copy(this.camera.position);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (active) {
      this.renderer.clearDepth();
      this.renderer.render(this.weaponScene, this.weaponCamera);
    }
  }
  applySettings(settings) {
    this.settings = settings;
    const quality = { low: 0.65, medium: 1, high: 1.5 }[settings.graphics];
    this.renderer.setPixelRatio(
      this.softwareRenderer ? Math.min(0.75, quality) : Math.min(devicePixelRatio, quality),
    );
    this.renderer.shadowMap.enabled = settings.graphics !== 'low' && !this.softwareRenderer;
    this.resize();
  }
  resize() {
    const width = innerWidth,
      height = innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.weaponCamera) {
      this.weaponCamera.aspect = width / height;
      this.weaponCamera.updateProjectionMatrix();
    }
  }
}
const mapBackgrounds = new Map();
function mapBackground(size, expanded) {
  if (mapBackgrounds.has(size)) return mapBackgrounds.get(size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'),
    scale = size / (MAP.extent * 2 + 40),
    pos = (v) => size / 2 + v * scale;
  ctx.fillStyle = '#142c25';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#264036';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < size; i += size / 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.fillStyle = '#3b6b69';
  for (const water of MAP.waters) {
    ctx.beginPath();
    water.points.forEach(([x, z], i) => {
      if (!i) ctx.moveTo(pos(x), pos(z));
      else ctx.lineTo(pos(x), pos(z));
    });
    ctx.closePath();
    ctx.fill();
  }
  for (const r of MAP.rivers) {
    ctx.strokeStyle = '#3b6b69';
    ctx.lineWidth = Math.max(1, r.width * scale);
    ctx.beginPath();
    ctx.moveTo(pos(r.points[0][0]), pos(r.points[0][1]));
    ctx.lineTo(pos(r.points[1][0]), pos(r.points[1][1]));
    ctx.stroke();
  }
  for (const r of MAP.roads) {
    ctx.strokeStyle = r.bridge ? '#d4c7a1' : '#627060';
    ctx.lineWidth = r.bridge ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(pos(r.points[0][0]), pos(r.points[0][1]));
    ctx.lineTo(pos(r.points[1][0]), pos(r.points[1][1]));
    ctx.stroke();
  }
  ctx.strokeStyle = '#d3a45b77';
  ctx.beginPath();
  ctx.arc(pos(MAP.arena.x), pos(MAP.arena.z), MAP.arena.radius * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#5e6753';
  for (const b of MAP.buildings)
    ctx.fillRect(
      pos(b.x) - (b.w * scale) / 2,
      pos(b.z) - (b.d * scale) / 2,
      b.w * scale,
      b.d * scale,
    );
  ctx.fillStyle = '#90c8b1';
  for (const n of [CAMP, ...NPCS]) ctx.fillRect(pos(n.x) - 2, pos(n.z) - 2, 4, 4);
  ctx.font = `${expanded ? 10 : 8}px Arial`;
  ctx.textAlign = 'center';
  for (const p of MAP.places) {
    ctx.fillStyle = '#c5b887';
    ctx.fillRect(pos(p.x) - 3, pos(p.z) - 3, 6, 6);
    ctx.fillStyle = '#d8d9bd';
    if (expanded || !['skogsbo-gym', 'skogsbo-dining'].includes(p.id))
      ctx.fillText(`${p.verified ? '' : '~'}${p.name}`, pos(p.x), pos(p.z) - 7);
  }
  mapBackgrounds.set(size, canvas);
  return canvas;
}
export function drawMap(canvas, state, myId, expanded = false) {
  const ctx = canvas.getContext('2d'),
    size = canvas.width,
    scale = size / (MAP.extent * 2 + 40),
    pos = (v) => size / 2 + v * scale;
  ctx.drawImage(mapBackground(size, expanded), 0, 0);
  for (const e of state.enemies) {
    const me = state.players[myId];
    if (me && !me.intel && Math.hypot(e.x - me.x, e.z - me.z) > 55) continue;
    ctx.fillStyle = e.type === 'boss' ? '#ff975c' : '#c5694d';
    ctx.beginPath();
    ctx.arc(pos(e.x), pos(e.z), e.type === 'boss' ? 3.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const l of state.loot)
    if (l.owner === myId) {
      ctx.fillStyle = RARITY_COLORS[l.weapon.rarity];
      ctx.fillRect(pos(l.x) - 1, pos(l.z) - 1, 2, 2);
    }
  for (const p of Object.values(state.players)) {
    ctx.fillStyle = p.id === myId ? '#fbe4a2' : '#93cfb0';
    ctx.beginPath();
    ctx.arc(pos(p.x), pos(p.z), 3, 0, Math.PI * 2);
    ctx.fill();
    if (p.id === myId) {
      ctx.strokeStyle = '#fbe4a2';
      ctx.beginPath();
      ctx.moveTo(pos(p.x), pos(p.z));
      ctx.lineTo(pos(p.x) + Math.sin(p.aim) * 8, pos(p.z) + Math.cos(p.aim) * 8);
      ctx.stroke();
    }
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b0baa0';
  ctx.font = '10px Arial';
  ctx.fillText('N ↑', 10, 16);
}
