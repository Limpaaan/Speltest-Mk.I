import data from './industry.json' with { type: 'json' };
import { buildingWorld } from './buildings.js';

export const industry = data;
export const INDUSTRY_PLACES = data.places;
export const INDUSTRY_SOURCE_IDS = new Set(data.places.map((p) => p.sourceId).filter(Boolean));
// Public entrance seen from Bergsnäsgatan in Google Street View, May 2023.
export const INDUSTRY_GATE = { x: 405.144, z: 1091.737, yaw: -0.69 };
export const INDUSTRY_DISTRICTS = [
  {
    id: 'kallhagen',
    name: 'Källhagen',
    x: -624,
    z: 1080,
    radius: 330,
    source: 'mapped-Industrigatan-and-Källhagsgatan-industrial-footprints',
    approximate: true,
  },
  {
    id: 'avesta-works-area',
    name: 'Outokumpu · Avesta Jernverk',
    x: 530,
    z: 1450,
    radius: 740,
    source: 'mapped-Avesta-Works-production-buildings',
    approximate: true,
  },
];

function contains(x, z, outline) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [a, b] = outline[i],
      [c, d] = outline[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) inside = !inside;
  }
  return inside;
}
export function industrialSupportFootprints(p) {
  if (!p.industry) return null;
  if (!p.footprint) return [{ ...p, id: `${p.id}-foundation-body`, shape: 'box' }];
  return [{ ...p, id: `${p.id}-foundation-body`, shape: 'polygon', outline: p.footprint }];
}

// Scan strips preserve the concave loading-yard recesses. Rectangle collisions are
// deliberately a few centimetres conservative at nearly orthogonal OSM edges.
export function industrialVolumes(p) {
  if (!p.industry) return [];
  if (!p.localFootprint) return [{ ...p, id: `${p.id}-body`, baseOffset: 0 }];
  const points = p.localFootprint;
  const levels = [];
  for (const z of points.map((q) => q[1]).sort((a, b) => a - b)) {
    if (!levels.length || z - levels.at(-1) > 0.35) levels.push(z);
    else levels[levels.length - 1] = (levels.at(-1) + z) / 2;
  }
  const strips = [];
  for (let i = 1; i < levels.length; i++) {
    const low = levels[i - 1],
      high = levels[i],
      mid = (low + high) / 2;
    if (high - low < 0.08) continue;
    const cuts = [];
    for (let a = 0, b = points.length - 1; a < points.length; b = a++) {
      const q = points[a],
        r = points[b];
      if (q[1] > mid !== r[1] > mid)
        cuts.push(q[0] + ((r[0] - q[0]) * (mid - q[1])) / (r[1] - q[1]));
    }
    cuts.sort((a, b) => a - b);
    for (let c = 1; c < cuts.length; c += 2) {
      const min = cuts[c - 1],
        max = cuts[c];
      if (max - min < 0.1 || !contains((min + max) / 2, mid, points)) continue;
      strips.push({ x: (min + max) / 2, z: mid, w: max - min + 0.16, d: high - low + 0.16 });
    }
  }
  return strips.map((q, i) => ({
    ...p,
    ...buildingWorld(p, q.x, q.z),
    w: q.w,
    d: q.d,
    id: `${p.id}-body-${i}`,
    baseOffset: 0,
    parentId: p.id,
    footprint: undefined,
  }));
}

// Equipment is kept at physical metre sizes. Locations are an exterior gameplay
// interpretation within the observed gas-factory yard, rather than an engineering plan.
export function industrialEquipment(p) {
  if (p.id !== 'linde-gas') return [];
  return [
    { id: 'linde-main-tank-0', x: 35, z: -4, w: 17, d: 17, h: 17, shape: 'round', kind: 'tank' },
    { id: 'linde-main-tank-1', x: 56, z: -4, w: 16, d: 16, h: 16, shape: 'round', kind: 'tank' },
    { id: 'linde-buffer-tank-0', x: 36, z: 22, w: 6, d: 6, h: 11, shape: 'round', kind: 'tank' },
    { id: 'linde-buffer-tank-1', x: 47, z: 22, w: 6, d: 6, h: 11, shape: 'round', kind: 'tank' },
    { id: 'linde-cooling-0', x: -27, z: -14, w: 6, d: 6, h: 8, kind: 'cooler' },
    { id: 'linde-cooling-1', x: -35, z: -14, w: 6, d: 6, h: 8, kind: 'cooler' },
    { id: 'linde-cooling-2', x: -43, z: -14, w: 6, d: 6, h: 8, kind: 'cooler' },
  ].map((q) => ({
    ...q,
    ...buildingWorld(p, q.x, q.z),
    type: 'industrial-equipment',
    yaw: p.yaw,
    parentId: p.id,
  }));
}
