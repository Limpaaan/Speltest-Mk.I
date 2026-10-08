import { createScenery } from './scenery.js';
import { terrainHeight } from './terrain.js';
import geography from './geography.json' with { type: 'json' };
const aalto = geography.places.find((p) => p.id === 'aalto'),
  skogsbo = geography.places.find((p) => p.id === 'skogsbo');
export const MAP = {
  version: 3,
  extent: 570,
  spawn: { x: aalto.x + aalto.w / 2 + 10, z: aalto.z + 10 },
  notice:
    'OSM-karta • Copernicus-höjder • omgivande bebyggelse och arkitektur tolkade • ~ = ungefärlig plats',
  places: geography.places,
  roads: geography.roads,
  rivers: geography.rivers,
  waters: geography.waters,
  bridges: geography.roads.filter((r) => r.bridge),
  cover: [
    { id: 'rally-crates', type: 'crate', x: 15, z: 120, w: 1.2, d: 0.85, h: 1.1 },
    { id: 'rally-barricade', type: 'barricade', x: 25, z: 120, w: 3, d: 0.6, h: 1.1 },
    { id: 'street-wreck', type: 'wreck', x: 40, z: 105, w: 1.85, d: 4.3, h: 1.35 },
  ],
  arena: { x: skogsbo.x, z: skogsbo.z, radius: 75 },
  source: geography.source,
  scale: geography.scale,
};
export function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function inside(x, z, points) {
  let yes = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i],
      [c, d] = points[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) yes = !yes;
  }
  return yes;
}
export function waterAt(x, z) {
  return (
    MAP.waters.some((w) => inside(x, z, w.points)) ||
    MAP.rivers.some((r) => segmentDistance(x, z, ...r.points) < r.width / 2)
  );
}
export function onBridge(x, z) {
  return MAP.bridges.some((b) => segmentDistance(x, z, ...b.points) < 4.65);
}
// A bridge deck interpolates between surveyed endpoint surroundings. Deck clearance is a gameplay adaptation.
export function groundHeight(x, z) {
  let height = terrainHeight(x, z);
  for (const b of MAP.bridges) {
    const [a, c] = b.points;
    if (segmentDistance(x, z, a, c) > 5) continue;
    const dx = c[0] - a[0],
      dz = c[1] - a[1],
      length2 = dx * dx + dz * dz;
    const t = length2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length2)) : 0;
    height = Math.max(height, terrainHeight(...a) * (1 - t) + terrainHeight(...c) * t + 0.2);
  }
  return height;
}
export const actorHeight = (actor) =>
  actor.type === 'grenade' ? actor.y : groundHeight(actor.x, actor.z);
export function canStand(x, z) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > MAP.extent ||
    Math.abs(z) > MAP.extent
  )
    return false;
  if (
    [...MAP.places, ...MAP.buildings, ...MAP.cover].some(
      (p) =>
        p.w > 0 &&
        p.d > 0 &&
        Math.abs(x - p.x) < p.w / 2 + 0.35 &&
        Math.abs(z - p.z) < p.d / 2 + 0.35,
    )
  )
    return false;
  if (obstaclesNear(x, z).some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 0.35)) return false;
  return !waterAt(x, z) || onBridge(x, z);
}
export function walkableNear(x, z) {
  if (canStand(x, z)) return { x, z };
  for (let radius = 5; radius < 80; radius += 5)
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        px = x + Math.cos(a) * radius,
        pz = z + Math.sin(a) * radius;
      if (canStand(px, pz)) return { x: px, z: pz };
    }
  return { ...MAP.spawn };
}
export function inSanctuary(p) {
  return Math.hypot(p.x - MAP.spawn.x, p.z - MAP.spawn.z) < 18;
}
export function inArena(p) {
  return Math.hypot(p.x - MAP.arena.x, p.z - MAP.arena.z) < MAP.arena.radius;
}
export function clearShot(a, b) {
  const origin = { x: a.x, y: actorHeight(a) + eyeHeight(a), z: a.z };
  const dx = b.x - a.x,
    dy = actorHeight(b) + eyeHeight(b) - origin.y,
    dz = b.z - a.z;
  const distance = Math.hypot(dx, dy, dz);
  if (!distance) return true;
  const hit = raycastWorld(
    origin,
    { x: dx / distance, y: dy / distance, z: dz / distance },
    distance,
  );
  return !hit || hit.distance >= distance - 1e-6;
}

export const eyeHeight = (actor) =>
  actor.type === 'grenade' ? 0.1 : actor.type === 'boss' ? 2.75 : actor.crouch ? 1.05 : 1.65;
export const bodyHeight = (actor) => (actor.type === 'boss' ? 3.1 : actor.crouch ? 1.2 : 1.85);
export function rayBoxDistance(origin, direction, min, max, range = Infinity) {
  let near = 0,
    far = range;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-9) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    const a = (min[axis] - origin[axis]) / direction[axis],
      b = (max[axis] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}
export function raycastWorld(origin, direction, range) {
  let distance = range,
    hit = null;
  for (const p of [...MAP.places, ...MAP.buildings, ...MAP.cover]) {
    if (!p.w || !p.d) continue;
    const t = rayBoxDistance(
      origin,
      direction,
      { x: p.x - p.w / 2, y: groundHeight(p.x, p.z) - 3, z: p.z - p.d / 2 },
      {
        x: p.x + p.w / 2,
        y:
          groundHeight(p.x, p.z) +
          p.h +
          (['cottage', 'school', 'warehouse'].includes(p.type) ? 2.2 : 0),
        z: p.z + p.d / 2,
      },
      distance,
    );
    if (t !== null && t < distance) {
      distance = t;
      hit = { id: p.id, kind: p.type };
    }
  }
  const end = [origin.x + direction.x * distance, origin.z + direction.z * distance];
  for (const p of [...MAP.trees, ...MAP.rocks]) {
    if (segmentDistance(p.x, p.z, [origin.x, origin.z], end) > p.radius + 0.1) continue;
    const base = groundHeight(p.x, p.z);
    const t = rayBoxDistance(
      origin,
      direction,
      { x: p.x - p.radius, y: base, z: p.z - p.radius },
      { x: p.x + p.radius, y: base + p.h, z: p.z + p.radius },
      distance,
    );
    if (t !== null && t < distance) {
      distance = t;
      hit = { id: 'scenery', kind: 'cover' };
    }
  }
  // Sample at <=1 unit then bisect: catches hills even for horizontal/uphill fire.
  const clearance = (t) =>
    origin.y +
    direction.y * t -
    groundHeight(origin.x + direction.x * t, origin.z + direction.z * t);
  let previous = 0;
  for (let t = 0; t <= distance; t = Math.min(distance, t + 1)) {
    if (clearance(t) < 0) {
      let low = previous,
        high = t;
      for (let i = 0; i < 12; i++) {
        const mid = (low + high) / 2;
        if (clearance(mid) < 0) high = mid;
        else low = mid;
      }
      distance = (low + high) / 2;
      hit = { id: 'ground', kind: 'ground' };
      break;
    }
    if (t === distance) break;
    previous = t;
  }
  return hit
    ? {
        ...hit,
        distance,
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance,
        z: origin.z + direction.z * distance,
      }
    : null;
}

Object.assign(MAP, createScenery(MAP, waterAt, segmentDistance, terrainHeight));
const obstacleCells = new Map();
for (const obstacle of [...MAP.trees, ...MAP.rocks]) {
  const key = `${Math.floor(obstacle.x / 10)},${Math.floor(obstacle.z / 10)}`;
  if (!obstacleCells.has(key)) obstacleCells.set(key, []);
  obstacleCells.get(key).push(obstacle);
}
function obstaclesNear(x, z) {
  const found = [],
    cx = Math.floor(x / 10),
    cz = Math.floor(z / 10);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      found.push(...(obstacleCells.get(`${cx + dx},${cz + dz}`) || []));
  return found;
}
export function travelFactor(x, z, dx, dz) {
  const road = MAP.roads.some((r) => segmentDistance(x, z, ...r.points) < 3.5);
  const slope = Math.abs(groundHeight(x + dx, z + dz) - groundHeight(x, z));
  return (road ? 1 : 0.78) * Math.max(0.4, 1 - slope * 0.65);
}
