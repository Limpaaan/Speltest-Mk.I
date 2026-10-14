import { planSites, inParking } from './sites.js';
import { createVehicles } from './ambience.js';
import { hubLayout } from './hub.js';
import { architectureVolumes } from './architecture.js';
import { foundationPlan } from './foundations.js';
import { DISTRICT_BUILDINGS, DISTRICTS, DISTRICT_ROADS } from './districts.js';
import { fitRoads, roadIndex, roadLift } from './roads.js';
import {
  AALTO_WALLS,
  AALTO_FURNITURE,
  AALTO_UPPER,
  AALTO_FLOOR,
  inAalto,
  aaltoRamp,
} from './interiors.js';
import { createScenery } from './scenery.js';
import { terrainHeight } from './terrain.js';
import { TRANSPORT, railwayDeckHeight } from './transport.js';
import {
  INDUSTRY_PLACES,
  INDUSTRY_DISTRICTS,
  industrialVolumes,
  industrialEquipment,
} from './industry.js';
import geography from './geography.json' with { type: 'json' };
import { cityPlaces, streetWidths, city } from './city-layout.js';
import {
  buildingContains,
  buildingLocal,
  buildingWorld,
  buildingBounds,
  spatialIndex,
} from './buildings.js';
const aalto = geography.places.find((p) => p.id === 'aalto'),
  skogsbo = geography.places.find((p) => p.id === 'skogsbo');
const spawn = buildingWorld(aalto, aalto.w / 2 + 12, 10);
export const MAP = {
  version: 6,
  extent: 2280,
  spawn,
  notice:
    'OSM-gator & byggnadsfotavtryck • utjämnade Copernicus-höjder • fasader tolkade • ~ = ungefärlig plats',
  places: [...cityPlaces([...geography.places, ...DISTRICT_BUILDINGS]), ...INDUSTRY_PLACES],
  districts: [
    ...DISTRICTS,
    ...INDUSTRY_DISTRICTS,
    {
      ...geography.places.find((p) => p.id === 'prast'),
      id: 'prastjorden',
      name: 'Prästjorden',
      radius: 430,
    },
  ],
  roads: streetWidths(
    [...TRANSPORT.roads, ...DISTRICT_ROADS.filter((r) => r.id === 'district-holmen')],
    city.roadClasses,
  ),
  railways: TRANSPORT.railways,
  rivers: geography.rivers,
  waters: geography.waters,
  bridges: TRANSPORT.roads.filter((r) => r.bridge),
  cover: [
    { id: 'rally-crates', type: 'crate', x: spawn.x + 6, z: spawn.z + 17, w: 1.2, d: 0.85, h: 1.1 },
    {
      id: 'rally-barricade',
      type: 'barricade',
      x: spawn.x + 16,
      z: spawn.z + 17,
      w: 3,
      d: 0.6,
      h: 1.1,
    },
    {
      id: 'street-wreck',
      type: 'wreck',
      x: spawn.x + 31,
      z: spawn.z + 2,
      w: 1.85,
      d: 4.3,
      h: 1.35,
    },
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
  return (
    MAP.bridges.some((b) => segmentDistance(x, z, ...b.points) < (b.width || 10) / 2) ||
    railwayDeckHeight(x, z) !== null
  );
}
// A bridge deck interpolates between surveyed endpoint surroundings. Deck clearance is a gameplay adaptation.
export function groundHeight(x, z) {
  if (inAalto(x, z)) return AALTO_FLOOR;
  const ramp = aaltoRamp(x, z);
  if (ramp !== null) return ramp;
  let height =
    terrainHeight(x, z) +
    Math.max(
      inParking(MAP.parking || [], x, z) ? 0.12 : 0,
      roadLift(x, z, nearbyRoads, segmentDistance),
    );
  for (const b of MAP.bridges) {
    const [a, c] = b.points;
    if (segmentDistance(x, z, a, c) > (b.width || 10) / 2) continue;
    const dx = c[0] - a[0],
      dz = c[1] - a[1],
      length2 = dx * dx + dz * dz;
    const t = length2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length2)) : 0;
    height = Math.max(height, terrainHeight(...a) * (1 - t) + terrainHeight(...c) * t + 0.2);
  }
  return Math.max(height, railwayDeckHeight(x, z) ?? -Infinity);
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
  if (solidIndex.point(x, z).some((p) => buildingContains(p, x, z, 0.35))) return false;
  if (obstaclesNear(x, z).some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 0.35)) return false;
  return !waterAt(x, z) || onBridge(x, z);
}
export function walkableNear(x, z) {
  if (canStand(x, z)) return { x, z };
  for (let radius = 5; radius < 300; radius += 5)
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        px = x + Math.cos(a) * radius,
        pz = z + Math.sin(a) * radius;
      if (canStand(px, pz)) return { x: px, z: pz };
    }
  return { ...MAP.spawn };
}
export function inSanctuary(p) {
  return HUB.inSafeArea(p.x, p.z) || Math.hypot(p.x - MAP.spawn.x, p.z - MAP.spawn.z) < 18;
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
  const endX = origin.x + direction.x * range,
    endZ = origin.z + direction.z * range;
  for (const p of shotIndex.box(
    Math.min(origin.x, endX),
    Math.min(origin.z, endZ),
    Math.max(origin.x, endX),
    Math.max(origin.z, endZ),
  )) {
    if (!p.w || !p.d) continue;
    const q = buildingLocal(p, origin.x, origin.z),
      c = Math.cos(p.yaw || 0),
      s = Math.sin(p.yaw || 0);
    const t = rayBoxDistance(
      { ...origin, x: q.x, z: q.z },
      { ...direction, x: c * direction.x - s * direction.z, z: s * direction.x + c * direction.z },
      { x: -p.w / 2, y: p.base ?? groundHeight(p.x, p.z) - 3, z: -p.d / 2 },
      {
        x: p.w / 2,
        y:
          (p.base ?? groundHeight(p.x, p.z)) +
          p.h +
          (p.roofRise ?? (['cottage', 'school', 'warehouse'].includes(p.type) ? 2.2 : 0)),
        z: p.d / 2,
      },
      distance,
    );
    if (t !== null && t < distance) {
      distance = t;
      hit = { id: p.id, kind: p.type };
    }
  }
  const end = [origin.x + direction.x * distance, origin.z + direction.z * distance];
  for (const p of sceneryShotIndex.box(
    Math.min(origin.x, endX),
    Math.min(origin.z, endZ),
    Math.max(origin.x, endX),
    Math.max(origin.z, endZ),
  )) {
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

const industrialBodies = MAP.places.flatMap((p) => industrialVolumes(p));
MAP.roads = fitRoads(MAP.roads, [...MAP.places.filter((p) => !p.industry), ...industrialBodies]);
const sites = planSites(MAP.places, MAP.roads, waterAt);
MAP.parking = sites.parking;
MAP.entrances = sites.entrances;
MAP.roads.push(...sites.access);
Object.assign(MAP, createScenery(MAP, waterAt, segmentDistance, terrainHeight));
const nearbyRoads = roadIndex(MAP.roads);
export const roadsNear = roadIndex(MAP.roads, 10);
MAP.cover.push(...createVehicles(MAP, waterAt, segmentDistance));
export const HUB = hubLayout(MAP.spawn);
for (const [i, dx, dz] of [
  [0, 43, -9],
  [1, 43, 34],
  [2, -3, 34],
  [3, 12, 34],
]) {
  const p = {
    id: `hub-barricade-${i}`,
    type: 'barricade',
    hub: true,
    x: MAP.spawn.x + dx,
    z: MAP.spawn.z + dz,
    w: 3.2,
    d: 0.7,
    h: 1.05,
  };
  if (
    !waterAt(p.x, p.z) &&
    !MAP.roads.some((r) => segmentDistance(p.x, p.z, ...r.points) < (r.width || 5.6) / 2 + 2)
  )
    MAP.cover.push(p);
}
const architectureDetails = MAP.places.flatMap((p) =>
  architectureVolumes(p).map((v) => ({ ...v, base: groundHeight(p.x, p.z) + v.baseOffset })),
);
const industrialDetails = MAP.places.flatMap((p) =>
  industrialEquipment(p).map((q) => ({ ...q, base: groundHeight(p.x, p.z) })),
);
MAP.foundations = [
  ...MAP.places.filter((p) => p.w && p.d && p.type !== 'horse'),
  ...MAP.buildings,
  ...industrialDetails,
].flatMap((p) => foundationPlan(p, p.base ?? groundHeight(p.x, p.z)));
const solids = [
  ...MAP.places.filter((p) => p.id !== 'aalto' && !p.industry && p.w && p.d),
  ...industrialBodies.map((p) => ({
    ...p,
    base: groundHeight(
      MAP.places.find((q) => q.id === p.parentId)?.x ?? p.x,
      MAP.places.find((q) => q.id === p.parentId)?.z ?? p.z,
    ),
  })),
  ...industrialDetails,
  ...AALTO_WALLS,
  ...AALTO_FURNITURE,
  ...MAP.buildings,
  ...MAP.cover,
  ...architectureDetails.filter((p) => !p.overhead),
];
const solidIndex = spatialIndex(solids, (p) => buildingBounds(p, 0.35));
const shotIndex = spatialIndex([
  ...solids,
  ...MAP.foundations.flatMap((f) => (f.shape === 'polygon' ? industrialVolumes(f) : [f])),
  ...AALTO_UPPER,
  ...architectureDetails.filter((p) => p.overhead),
]);
const obstacleCells = new Map();
const sceneryShotIndex = spatialIndex(
  [...MAP.trees, ...MAP.rocks],
  (p) => ({ x: p.x, z: p.z, w: p.radius * 2 + 0.2, d: p.radius * 2 + 0.2 }),
  40,
);
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
  const road = roadsNear(x, z).some(
    (r) => segmentDistance(x, z, ...r.points) < (r.width || 5.6) / 2 + 0.4,
  );
  const length = Math.hypot(dx, dz);
  if (!length) return road ? 1 : 0.92;
  const nx = dx / length,
    nz = dz / length;
  const grade =
    Math.abs(groundHeight(x + nx * 2, z + nz * 2) - groundHeight(x - nx * 2, z - nz * 2)) / 4;
  return (road ? 1 : 0.92) * Math.max(0.72, 1 - grade * 0.25);
}
