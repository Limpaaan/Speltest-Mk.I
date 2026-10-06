import * as THREE from 'three';
import { MAP, waterAt, segmentDistance } from '../shared/map.js';
import { CLASSES, RARITY_COLORS, maxHp } from '../shared/game.js';

export class WorldView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#728a7d');
    this.scene.fog = new THREE.FogExp2('#728a7d', 0.0017);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1600);
    this.camera.position.set(-160, 170, 290);
    this.target = new THREE.Vector3(-20, 0, 35);
    this.scene.add(new THREE.HemisphereLight('#fff0ca', '#344e44', 2.7));
    this.sun = new THREE.DirectionalLight('#ffe3ac', 3.2);
    this.sun.position.set(-130, 210, 90);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -200,
      right: 200,
      top: 200,
      bottom: -200,
      near: 1,
      far: 600,
    });
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun, this.sun.target);
    this.materials = new Map();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.entities = new Map();
    this.raycaster = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.shotLines = new THREE.Group();
    this.scene.add(this.shotLines);
    this.buildMap();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  material(color, extra = {}) {
    const key = color + JSON.stringify(extra);
    if (!this.materials.has(key))
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...extra }));
    return this.materials.get(key);
  }
  box(parent, x, y, z, w, h, d, color, extra) {
    const m = new THREE.Mesh(this.boxGeometry, this.material(color, extra));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = h > 2;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  label(text, x, y, z, color = '#eee4c9', size = 17) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#10211dd9';
    ctx.fillRect(0, 8, 512, 72);
    ctx.fillStyle = color;
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase(), 256, 55);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0.9 }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(size * 3, size * 0.56, 1);
    this.scene.add(sprite);
    return sprite;
  }
  buildMap() {
    const scene = this.scene;
    this.box(scene, 0, -2, 0, 1600, 3, 1600, '#62735c');
    // Patches of slag, dried grass and concrete keep the low-poly terrain legible.
    for (let i = 0; i < 65; i++) {
      const x = Math.sin(i * 38.1) * 420,
        z = Math.cos(i * 21.5) * 420;
      if (waterAt(x, z)) continue;
      this.box(
        scene,
        x,
        -0.42,
        z,
        18 + (i % 6) * 9,
        0.12,
        12 + (i % 5) * 14,
        i % 3 ? '#68765c' : '#77816b',
      );
    }
    const strips = (entries, color, y) => {
      const meshes = new THREE.InstancedMesh(
        this.boxGeometry,
        this.material(color),
        entries.length,
      );
      const dummy = new THREE.Object3D();
      entries.forEach((r, i) => {
        const [[x1, z1], [x2, z2]] = r.points;
        dummy.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        dummy.rotation.y = Math.atan2(x2 - x1, z2 - z1);
        dummy.scale.set(r.width || 7, 0.18, Math.hypot(x2 - x1, z2 - z1) + 0.5);
        dummy.updateMatrix();
        meshes.setMatrixAt(i, dummy.matrix);
      });
      meshes.receiveShadow = true;
      scene.add(meshes);
      return meshes;
    };
    strips(MAP.roads, '#48534b', -0.15);
    this.water = strips(MAP.rivers, '#3b7276', 0.02);
    for (const water of MAP.waters) {
      const shape = new THREE.Shape();
      water.points.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();
      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        this.material('#3b7276', { roughness: 0.4, metalness: 0.2 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.14;
      scene.add(mesh);
    }
    strips(
      MAP.bridges.map((b) => ({ ...b, width: 11 })),
      '#959783',
      0.5,
    );
    for (const bridge of MAP.bridges) {
      const [[x1, z1], [x2, z2]] = bridge.points;
      const length = Math.hypot(x2 - x1, z2 - z1);
      for (const side of [-1, 1]) {
        const dx = ((z2 - z1) / length) * side * 5,
          dz = (-(x2 - x1) / length) * side * 5;
        const rail = this.box(
          scene,
          (x1 + x2) / 2 + dx,
          1.8,
          (z1 + z2) / 2 + dz,
          0.4,
          0.5,
          length,
          '#3b4a43',
        );
        rail.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      }
    }
    for (const p of MAP.places) {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      scene.add(g);
      if (p.type === 'horse') this.horse(g, p);
      else if (p.type !== 'area') {
        const color =
          p.type === 'aalto'
            ? '#c4c8af'
            : p.type === 'works'
              ? '#945b41'
              : p.type === 'mall'
                ? '#7b8580'
                : '#905b48';
        this.box(g, 0, p.h / 2, 0, p.w, p.h, p.d, color);
        this.box(g, 0, p.h + 0.5, 0, p.w + 1, 1.4, p.d + 1, '#3c4944');
        for (let y = 4; y < p.h - 1; y += 4)
          for (let x = -p.w / 2 + 3; x < p.w / 2 - 2; x += 5) {
            this.box(g, x, y, p.d / 2 + 0.1, 2, 2, 0.3, '#263e39', {
              emissive: '#536b42',
              emissiveIntensity: (x + y) % 3 === 0 ? 0.7 : 0.08,
            });
            this.box(g, x, y, -p.d / 2 - 0.1, 2, 2, 0.3, '#263e39');
          }
        if (p.type === 'works') {
          this.box(g, p.w / 3, p.h + 11, -p.d / 3, 4, 23, 4, '#7b5140');
          this.box(g, -p.w / 3, 5, p.d / 2 + 0.2, 6, 10, 0.5, '#313b32');
          for (let i = 0; i < 3; i++)
            this.box(g, -p.w / 2 + 4 + i * 10, p.h + 2, 0, 2, 4, p.d * 0.8, '#4c5548');
        }
        if (p.type === 'aalto')
          for (let i = 0; i < 5; i++)
            this.box(g, -p.w / 2 + i * 5, p.h / 2, p.d / 2 + 0.4, 0.7, p.h, 1, '#e0ddc3');
        if (p.type === 'mall') this.box(g, 0, p.h + 3, 0, p.w * 0.7, 5, 3, '#acaa7e');
      }
      this.label(`${p.verified ? '' : '~ '}${p.name}`, p.x, p.h + 12, p.z, '#eee5cc', 11);
    }
    this.label('Dalälven', -80, 3, -145, '#b5d4cc', 9);
    const arena = new THREE.Mesh(
      new THREE.RingGeometry(MAP.arena.radius - 0.7, MAP.arena.radius, 96),
      new THREE.MeshBasicMaterial({
        color: '#e2ae63',
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    arena.rotation.x = -Math.PI / 2;
    arena.position.set(MAP.arena.x, 0.08, MAP.arena.z);
    scene.add(arena);
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.8, 1.2, 8, 5),
      this.material('#514f3a'),
      220,
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.ConeGeometry(5, 17, 5),
      this.material('#344f40'),
      220,
    );
    const matrix = new THREE.Matrix4();
    let count = 0;
    for (let i = 0; i < 700 && count < 220; i++) {
      const x = Math.sin(i * 73.13) * 440,
        z = Math.cos(i * 47.71) * 440;
      if (
        waterAt(x, z) ||
        MAP.places.some((p) => Math.hypot(x - p.x, z - p.z) < 45) ||
        MAP.roads.some((r) => segmentDistance(x, z, ...r.points) < 9)
      )
        continue;
      matrix.makeTranslation(x, 3, z);
      trunks.setMatrixAt(count, matrix);
      matrix.makeTranslation(x, 13 + (i % 3), z);
      crowns.setMatrixAt(count, matrix);
      count++;
    }
    trunks.count = crowns.count = count;
    trunks.castShadow = crowns.castShadow = true;
    scene.add(trunks, crowns);
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      positions[i * 3] = Math.sin(i * 12.4) * 400;
      positions[i * 3 + 1] = (i % 70) + 10;
      positions[i * 3 + 2] = Math.cos(i * 17.3) * 400;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.ash = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: '#e9dbb2', size: 0.4, transparent: true, opacity: 0.55 }),
    );
    scene.add(this.ash);
    const sanctuary = new THREE.Mesh(
      new THREE.RingGeometry(17.5, 18, 64),
      new THREE.MeshBasicMaterial({
        color: '#c9db9c',
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    sanctuary.rotation.x = -Math.PI / 2;
    sanctuary.position.set(MAP.spawn.x, 0.13, MAP.spawn.z);
    scene.add(sanctuary);
    // The rally point is a visible copper beacon next to Aalto-huset.
    this.box(scene, MAP.spawn.x - 5, 1, MAP.spawn.z + 5, 1, 2, 1, '#d4b468', {
      emissive: '#ffad40',
      emissiveIntensity: 1,
    });
  }
  horse(g) {
    this.box(g, 0, 1, 0, 22, 2, 12, '#999b84');
    this.box(g, 0, 13, 0, 15, 7, 6, '#b65435');
    for (const x of [-5, 5]) for (const z of [-2, 2]) this.box(g, x, 6, z, 2.3, 10, 2, '#ba5738');
    const neck = this.box(g, 6.5, 19, 0, 5, 12, 5, '#b65435');
    neck.rotation.z = -0.25;
    this.box(g, 9, 24, 0, 8, 4, 5, '#ba5738');
    this.box(g, 7, 27, 0, 1.5, 3, 4, '#b65435');
    this.box(g, -1, 17, 0, 9, 1, 6.5, '#d8bd68');
    for (const z of [-3.1, 3.1]) this.box(g, -1, 13, z, 6, 3, 0.2, '#809c87');
  }
  actor(entity, player) {
    const group = new THREE.Group(),
      boss = entity.type === 'boss',
      color = player ? CLASSES[entity.classId].color : boss ? '#9e6642' : '#3a4555';
    this.box(group, 0, 4, 0, boss ? 7 : 3.2, boss ? 6 : 4, boss ? 5 : 2.2, color);
    this.box(
      group,
      0,
      boss ? 9 : 7,
      0,
      boss ? 3.5 : 2,
      2,
      boss ? 3.5 : 2,
      player ? '#c4b997' : '#b6aa8a',
    );
    this.box(group, 0, boss ? 9 : 7.4, 0.9, boss ? 4 : 2.4, 0.7, 1, player ? '#424e3e' : '#744f42');
    for (const x of [-1, 1])
      this.box(group, x * (boss ? 2.1 : 0.9), 1.4, 0, boss ? 2 : 1, 2.8, boss ? 3 : 1.2, '#303d34');
    this.box(group, 2.2, 4.5, 2.2, 1, 1.2, 5, '#252f2b');
    if (boss) for (const x of [-1, 1]) this.box(group, x * 4, 5, 0, 2.5, 5, 4, '#5d6960');
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(boss ? 5 : 2.8, boss ? 5.5 : 3.1, 32),
      new THREE.MeshBasicMaterial({
        color: player ? color : '#e29368',
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);
    const bar = this.box(group, 0, boss ? 12 : 10, 0, boss ? 10 : 5, 0.5, 0.5, '#be7154');
    group.userData.bar = bar;
    if (boss) {
      const warning = new THREE.Mesh(
        new THREE.RingGeometry(22, 24, 48),
        new THREE.MeshBasicMaterial({
          color: '#ec7d41',
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        }),
      );
      warning.rotation.x = -Math.PI / 2;
      warning.position.y = 0.2;
      group.add(warning);
      group.userData.warning = warning;
    }
    group.position.set(entity.x, 0, entity.z);
    this.scene.add(group);
    return group;
  }
  render(state, myId, dt, active, elapsed) {
    const seen = new Set(),
      entities = [
        ...Object.values(state.players).map((e) => ({ ...e, player: true })),
        ...state.enemies,
        ...state.loot.map((e) => ({ ...e, loot: true })),
      ];
    for (const entity of entities) {
      seen.add(entity.id);
      let mesh = this.entities.get(entity.id);
      if (!mesh) {
        if (entity.loot) {
          mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(2.5),
            this.material(RARITY_COLORS[entity.weapon.rarity], {
              emissive: RARITY_COLORS[entity.weapon.rarity],
              emissiveIntensity: 0.5,
            }),
          );
          mesh.position.set(entity.x, 4, entity.z);
          this.scene.add(mesh);
        } else mesh = this.actor(entity, entity.player);
        this.entities.set(entity.id, mesh);
      }
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, entity.x, Math.min(1, dt * 18));
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, entity.z, Math.min(1, dt * 18));
      if (entity.loot) {
        mesh.rotation.y = elapsed;
        mesh.position.y = 4 + Math.sin(elapsed * 3) * 0.7;
        mesh.visible = entity.owner === myId;
      } else {
        mesh.visible = entity.hp > 0;
        mesh.rotation.y = entity.player
          ? entity.aim
          : state.players[myId]
            ? Math.atan2(state.players[myId].x - entity.x, state.players[myId].z - entity.z)
            : 0;
        if (mesh.userData.bar)
          mesh.userData.bar.scale.x =
            (entity.type === 'boss' ? 10 : 5) *
            Math.max(0.01, entity.hp / (entity.maxHp || (entity.player ? maxHp(entity) : 70)));
        if (mesh.userData.warning) mesh.userData.warning.visible = entity.windup > 0;
      }
    }
    for (const [id, mesh] of this.entities)
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        this.entities.delete(id);
      }
    for (const line of [...this.shotLines.children]) {
      line.geometry.dispose();
      line.material.dispose();
      this.shotLines.remove(line);
    }
    for (const s of state.shots) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(s.x, 4.5, s.z),
        new THREE.Vector3(s.endX, 4.5, s.endZ),
      ]);
      this.shotLines.add(
        new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: s.enemy ? '#e28958' : '#ffe4a0',
            transparent: true,
            opacity: 0.85,
          }),
        ),
      );
    }
    const player = state.players[myId];
    if (active && player) {
      const wanted = new THREE.Vector3(player.x, 105, player.z + 86);
      this.camera.position.lerp(wanted, Math.min(1, dt * 5));
      this.target.lerp(new THREE.Vector3(player.x, 0, player.z - 5), Math.min(1, dt * 5));
      this.sun.position.set(player.x - 130, 210, player.z + 90);
      this.sun.target.position.set(player.x, 0, player.z);
    } else {
      this.camera.position.lerp(
        new THREE.Vector3(-175 + Math.sin(elapsed * 0.045) * 35, 175, 285),
        Math.min(1, dt * 2),
      );
      this.target.lerp(new THREE.Vector3(10, 0, 20), Math.min(1, dt * 2));
    }
    this.camera.lookAt(this.target);
    this.ash.rotation.y = elapsed * 0.006;
    this.renderer.render(this.scene, this.camera);
  }
  aim(clientX, clientY, p) {
    this.raycaster.setFromCamera(
      new THREE.Vector2((clientX / innerWidth) * 2 - 1, (-clientY / innerHeight) * 2 + 1),
      this.camera,
    );
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return p.aim;
    return Math.atan2(hit.x - p.x, hit.z - p.z);
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
export function drawMap(canvas, state, myId, expanded = false) {
  const ctx = canvas.getContext('2d'),
    size = canvas.width,
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
  ctx.font = `${expanded ? 10 : 8}px Arial`;
  ctx.textAlign = 'center';
  for (const p of MAP.places) {
    ctx.fillStyle = '#c5b887';
    ctx.fillRect(pos(p.x) - 3, pos(p.z) - 3, 6, 6);
    ctx.fillStyle = '#d8d9bd';
    ctx.fillText(`${p.verified ? '' : '~'}${p.name}`, pos(p.x), pos(p.z) - 7);
  }
  for (const e of state.enemies) {
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
