import geography from './geography.json' with { type: 'json' };
import { terrainHeight } from './terrain.js';
import { buildingWorld, buildingLocal } from './buildings.js';
import { terrainContacts } from './foundations.js';
export const AALTO = geography.places.find((p) => p.id === 'aalto');
// The original room layout uses a 24 by 14 reference envelope. Only the horizontal
// architecture expands to the mapped footprint; people, furniture and heights stay in metres.
export const AALTO_SCALE = { x: AALTO.w / 24, z: AALTO.d / 14 };
export const aaltoWorld = (x, z) => buildingWorld(AALTO, x * AALTO_SCALE.x, z * AALTO_SCALE.z);
export function aaltoLocal(x, z) {
  const q = buildingLocal(AALTO, x, z);
  return { x: q.x / AALTO_SCALE.x, z: q.z / AALTO_SCALE.z };
}
const footprint = [
  [-12, -7],
  [12, -7],
  [12, 7],
  [-12, 7],
].map(([x, z]) => {
  const q = aaltoWorld(x, z);
  return [q.x, q.z];
});
export const AALTO_FLOOR = Math.max(...terrainContacts(footprint).map((p) => p.y)) + 0.3;
export function aaltoRamp(x, z) {
  const q = aaltoLocal(x, z);
  if (q.x < 12 - 1e-4 || q.x > 18 + 1e-4 || Math.abs(q.z - 3.5) > 2 + 1e-4) return null;
  const end = aaltoWorld(18, q.z),
    t = Math.max(0, Math.min(1, (q.x - 12) / 6));
  return AALTO_FLOOR + (terrainHeight(end.x, end.z) - AALTO_FLOOR) * t;
}
// Fictional accessible ground floor; exterior photos do not establish the real floor plan.
export const AALTO_WALLS = [
  [-12, 0, 0.3, 14],
  [0, -7, 24, 0.3],
  [0, 7, 24, 0.3],
  [12, -2.75, 0.3, 8.5],
  [12, 6.25, 0.3, 1.5],
  [-2, -4.5, 0.25, 5],
  [-2, 5, 0.25, 4],
].map(([x, z, w, d], i) => ({
  id: `aalto-wall-${i}`,
  type: 'wall',
  ...aaltoWorld(x, z),
  w: w * AALTO_SCALE.x,
  d: d * AALTO_SCALE.z,
  yaw: AALTO.yaw || 0,
  prototype: { x, z, w, d },
  h: 3.3,
  base: AALTO_FLOOR,
}));
export const AALTO_UPPER = [
  { x: 0, z: 0, w: 24, d: 14, h: 0.1 },
  { x: -7, z: 0, w: 10, d: 13, h: 20.7 },
  { x: 3, z: 4, w: 18, d: 6, h: 4.9 },
  { x: 7, z: -3.5, w: 10, d: 7, h: 4.1 },
].map((p, i) => ({
  ...p,
  id: `aalto-upper-${i}`,
  type: 'wall',
  ...aaltoWorld(p.x, p.z),
  w: p.w * AALTO_SCALE.x,
  d: p.d * AALTO_SCALE.z,
  yaw: AALTO.yaw || 0,
  prototype: { x: p.x, z: p.z, w: p.w, d: p.d },
  base: AALTO_FLOOR + 3.3,
}));
export const inAalto = (x, z) => {
  const q = aaltoLocal(x, z);
  return Math.abs(q.x) <= 12 + 0.3 / AALTO_SCALE.x && Math.abs(q.z) <= 7 + 0.3 / AALTO_SCALE.z;
};
export const INTERIOR_CACHES = [
  {
    id: 'aalto-archive',
    name: 'Arkivskåp · evakueringsplan',
    ...aaltoWorld(-9, -4),
    archive: true,
  },
  { id: 'aalto-workshop', name: 'Reservdelslåda', ...aaltoWorld(-8, 4) },
  { id: 'aalto-reception', name: 'Receptionens förråd', ...aaltoWorld(6, -4) },
];

export const AALTO_FURNITURE = [
  { x: -9, z: -5.8, w: 3, d: 0.8, h: 1, type: 'desk' },
  { x: 5, z: -5.8, w: 3, d: 0.8, h: 1, type: 'desk' },
  { x: -11.2, z: -0.5, w: 0.7, d: 4, h: 2.6, type: 'shelf' },
  { x: -7, z: 6.1, w: 4, d: 0.7, h: 2.6, type: 'shelf' },
  { x: 8.8, z: -5.9, w: 1.3, d: 0.7, h: 2.2, type: 'cabinet' },
].map((o, i) => ({
  ...o,
  id: `aalto-furniture-${i}`,
  ...aaltoWorld(o.x, o.z),
  yaw: AALTO.yaw || 0,
  base: AALTO_FLOOR,
}));
