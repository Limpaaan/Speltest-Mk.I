import * as THREE from 'three';
export function spruceMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = 181;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  ctx.strokeStyle = '#554c37';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 15);
  ctx.lineTo(128, 507);
  ctx.stroke();
  // Original needle/branch drawing, cut out with alpha; no external image assets.
  for (let y = 26; y < 450; y += 13) {
    const reach = 10 + (y / 450) * 104;
    for (const side of [-1, 1]) {
      const endX = 128 + side * reach * (0.75 + random() * 0.25);
      const endY = y + 27 + random() * 15;
      ctx.strokeStyle = '#454b32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      for (let i = 0; i < 42; i++) {
        const t = random(),
          x = 128 + (endX - 128) * t,
          py = y + (endY - y) * t;
        ctx.strokeStyle = ['#374a33', '#506345', '#71805a', '#475c3e'][Math.floor(random() * 4)];
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + side * (2 + random() * 10), py - 7 - random() * 19);
        ctx.stroke();
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 1,
  });
}
export function surfaces() {
  let seed = 7919;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const make = (base, kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 13000; i++) {
      const shade = random() > 0.6 ? 220 : 15;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${random() * 0.14})`;
      ctx.fillRect(random() * 256, random() * 256, random() * 3 + 0.4, random() * 3 + 0.4);
    }
    if (kind === 'soil') {
      for (let i = 0; i < 180; i++) {
        const x = random() * 256,
          y = random() * 256;
        ctx.fillStyle = ['#9b94723a', '#3a4c353d', '#bdac8333', '#202b2338'][i % 4];
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + random() * 12, 2 + random() * 8, random() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3b34284a';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + random() * 14, y + random() * 12);
        ctx.stroke();
      }
    }
    if (kind === 'asphalt') {
      ctx.strokeStyle = '#171d1c';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        let x = random() * 256,
          y = 0;
        ctx.moveTo(x, y);
        while (y < 256) {
          x += (random() - 0.5) * 24;
          y += 9 + random() * 22;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    if (kind === 'birch')
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = i % 3 ? '#434940' : '#83847b';
        ctx.fillRect(random() * 256, random() * 256, 4 + random() * 30, 1 + random() * 4);
      }
    if (kind === 'brick')
      for (let y = 0; y < 256; y += 32) {
        ctx.fillStyle = '#484a41';
        ctx.fillRect(0, y, 256, 2);
        for (let x = y % 64 ? 32 : 0; x < 256; x += 64) ctx.fillRect(x, y, 2, 32);
      }
    if (kind === 'wall')
      for (let i = 0; i < 25; i++) {
        ctx.fillStyle = '#31352c18';
        ctx.fillRect(random() * 256, random() * 256, 1 + random() * 4, 30 + random() * 100);
      }
    if (kind === 'slag') {
      ctx.fillStyle = '#8b8976';
      ctx.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 12; row++)
        for (let col = -1; col < 7; col++) {
          const x = col * 43 + (row % 2) * 21,
            y = row * 22;
          const n = Math.floor(45 + random() * 37);
          ctx.fillStyle = `rgb(${n + 9},${n + 7},${n})`;
          ctx.fillRect(x + 1, y + 1, 40 + random() * 2, 19 + random());
          ctx.fillStyle = '#c0b99d25';
          ctx.fillRect(x + 3, y + 2, 33, 2);
          for (let k = 0; k < 8; k++) {
            ctx.fillStyle = random() > 0.5 ? '#d1bb8930' : '#1a221f40';
            ctx.fillRect(x + random() * 40, y + random() * 19, 2 + random() * 4, 2);
          }
        }
    }
    if (kind === 'ribbed') {
      for (let x = 0; x < 256; x += 7) {
        ctx.fillStyle = '#171e2a';
        ctx.fillRect(x, 0, 2, 256);
        ctx.fillStyle = '#808791';
        ctx.fillRect(x + 2, 0, 1, 256);
      }
      for (let y = 0; y < 256; y += 43) {
        ctx.fillStyle = '#212932';
        ctx.fillRect(0, y, 256, 1);
      }
    }
    if (kind === 'wood')
      for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = '#222920';
        ctx.fillRect(x, 0, 2, 256);
      }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    const relief = texture.clone();
    relief.colorSpace = THREE.NoColorSpace;
    return new THREE.MeshStandardMaterial({
      map: texture,
      // Terrain already has geometric relief. Bump derivatives on its large,
      // batched triangles can produce black patches on software WebGL drivers.
      bumpMap: kind === 'soil' ? null : relief,
      bumpScale: ['brick', 'slag'].includes(kind) ? 0.1 : 0.035,
      roughness: kind === 'asphalt' ? 0.72 : 0.94,
    });
  };
  return {
    slagStone: make('#59574b', 'slag'),
    archBrick: make('#8a7057', 'brick'),
    aaltoBlue: make('#313e55', 'ribbed'),
    ivory: make('#d4d3c9', 'wall'),
    zinc: new THREE.MeshStandardMaterial({ color: '#939f9f', roughness: 0.62, metalness: 0.35 }),
    worksGlass: new THREE.MeshStandardMaterial({
      color: '#86938b',
      roughness: 0.65,
      metalness: 0.15,
    }),
    windowLight: new THREE.MeshStandardMaterial({
      color: '#96aaaf',
      roughness: 0.3,
      metalness: 0.35,
    }),
    soil: make('#64604b', 'soil'),
    asphalt: make('#414744', 'asphalt'),
    concrete: make('#9d9b85', 'wall'),
    plaster: make('#c4c3af', 'wall'),
    brick: make('#895b45', 'brick'),
    wood: make('#625342', 'wood'),
    metal: make('#454c48', 'wall'),
    rust: make('#8b5a3a', 'wall'),
    roof: make('#424943', 'wall'),
    glass: new THREE.MeshStandardMaterial({ color: '#253f3e', roughness: 0.33, metalness: 0.45 }),
    water: new THREE.MeshStandardMaterial({ color: '#456768', roughness: 0.24, metalness: 0.35 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4d5c40', roughness: 1 }),
    birch: make('#b9b9a8', 'birch'),
    bark: make('#5f5746', 'wood'),
  };
}
