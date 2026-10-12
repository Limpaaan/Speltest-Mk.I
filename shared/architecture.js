import { buildingWorld } from './buildings.js';
// Visual envelopes interpreted from the dated Street View references, not surveyed dimensions.
export function architectureSpec(p) {
  if (p.id === 'stadshuset') return { body: 5, roofRise: 1.35, bays: 7 };
  if (p.id === 'avesta-kyrka')
    return { body: 6, roofRise: 1.9, towerH: 10, spire: 7, towerW: p.w * 0.45, towerZ: p.d * 0.34 };
  if (p.id === 'krylbo-station')
    return {
      body: 4.2,
      roofRise: 1.4,
      centerH: 6.5,
      centerW: p.w * 0.28,
      towerH: 6.3,
      topRise: 4,
      towerR: p.d * 0.33,
      towerX: -p.w * 0.36,
      towerZ: p.d / 2 - p.w * 0.45 * 0.34,
    };
  return null;
}
export function architectureVolumes(p) {
  const a = architectureSpec(p);
  if (!a) return [];
  const volume = (id, x, z, w, d, h, baseOffset = 0, overhead = false) => ({
    ...buildingWorld(p, x, z),
    id: p.id + '-' + id,
    type: 'landmark-detail',
    w,
    d,
    h,
    baseOffset,
    yaw: p.yaw || 0,
    overhead,
  });
  if (p.id === 'avesta-kyrka')
    return [volume('tower', 0, a.towerZ, a.towerW, a.towerW, a.towerH + a.spire)];
  if (p.id === 'krylbo-station')
    return [
      volume('tower', a.towerX, a.towerZ, a.towerR * 2, a.towerR * 2, a.towerH + a.topRise),
      volume('hall-roof', 0, 0, a.centerW, p.d, a.centerH + a.roofRise - a.body, a.body, true),
    ];
  return [];
}
