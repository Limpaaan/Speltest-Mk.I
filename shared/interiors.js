import geography from './geography.json' with { type: 'json' };
import { terrainHeight } from './terrain.js';
export const AALTO = geography.places.find((p) => p.id === 'aalto');
export const AALTO_FLOOR =
  Math.max(
    ...[-12, -6, 0, 6, 12].flatMap((x) =>
      [-7, 0, 7].map((z) => terrainHeight(AALTO.x + x, AALTO.z + z)),
    ),
  ) + 0.3;
export function aaltoRamp(x, z) {
  if (x < AALTO.x + 12 || x > AALTO.x + 18 || Math.abs(z - AALTO.z - 3.5) > 2) return null;
  return AALTO_FLOOR + ((terrainHeight(AALTO.x + 18, z) - AALTO_FLOOR) * (x - AALTO.x - 12)) / 6;
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
  x: AALTO.x + x,
  z: AALTO.z + z,
  w,
  d,
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
  x: p.x + AALTO.x,
  z: p.z + AALTO.z,
  base: AALTO_FLOOR + 3.3,
}));
export const inAalto = (x, z) => Math.abs(x - AALTO.x) <= 12.3 && Math.abs(z - AALTO.z) <= 7.3;
export const INTERIOR_CACHES = [
  {
    id: 'aalto-archive',
    name: 'Arkivskåp · evakueringsplan',
    x: AALTO.x - 9,
    z: AALTO.z - 4,
    archive: true,
  },
  { id: 'aalto-workshop', name: 'Reservdelslåda', x: AALTO.x - 8, z: AALTO.z + 4 },
  { id: 'aalto-reception', name: 'Receptionens förråd', x: AALTO.x + 6, z: AALTO.z - 4 },
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
  x: AALTO.x + o.x,
  z: AALTO.z + o.z,
  base: AALTO_FLOOR,
}));
