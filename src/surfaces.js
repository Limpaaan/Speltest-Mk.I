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
    if (kind === 'wood')
      for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = '#222920';
        ctx.fillRect(x, 0, 2, 256);
      }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.94 });
  };
  return {
    soil: make('#64604b', 'soil'),
    asphalt: make('#454b45', 'soil'),
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
    bark: make('#5f5746', 'wood'),
  };
}
