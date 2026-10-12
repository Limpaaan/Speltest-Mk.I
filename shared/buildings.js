export function buildingLocal(p, x, z) {
  const c = Math.cos(p.yaw || 0),
    s = Math.sin(p.yaw || 0),
    dx = x - p.x,
    dz = z - p.z;
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
export function buildingWorld(p, x, z) {
  const c = Math.cos(p.yaw || 0),
    s = Math.sin(p.yaw || 0);
  return { x: p.x + c * x + s * z, z: p.z - s * x + c * z };
}
export function buildingContains(p, x, z, pad = 0) {
  const q = buildingLocal(p, x, z);
  return p.w > 0 && p.d > 0 && Math.abs(q.x) < p.w / 2 + pad && Math.abs(q.z) < p.d / 2 + pad;
}
export function buildingBounds(p, pad = 0) {
  const c = Math.abs(Math.cos(p.yaw || 0)),
    s = Math.abs(Math.sin(p.yaw || 0));
  return { x: p.x, z: p.z, w: c * p.w + s * p.d + pad * 2, d: s * p.w + c * p.d + pad * 2 };
}
export function spatialIndex(objects, bounds = buildingBounds, size = 20) {
  const cells = new Map();
  for (const p of objects) {
    const b = bounds(p);
    for (let x = Math.floor((b.x - b.w / 2) / size); x <= Math.floor((b.x + b.w / 2) / size); x++)
      for (
        let z = Math.floor((b.z - b.d / 2) / size);
        z <= Math.floor((b.z + b.d / 2) / size);
        z++
      ) {
        const k = `${x},${z}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(p);
      }
  }
  return {
    point: (x, z) => cells.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) || [],
    box: (minX, minZ, maxX, maxZ) => {
      const found = new Set();
      for (let x = Math.floor(minX / size); x <= Math.floor(maxX / size); x++)
        for (let z = Math.floor(minZ / size); z <= Math.floor(maxZ / size); z++)
          for (const p of cells.get(`${x},${z}`) || []) found.add(p);
      return [...found];
    },
  };
}
