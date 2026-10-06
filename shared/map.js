import geography from './geography.json' with { type: 'json' };
const aalto = geography.places.find((p) => p.id === 'aalto'),
  skogsbo = geography.places.find((p) => p.id === 'skogsbo');
export const MAP = {
  version: 2,
  extent: 570,
  spawn: { x: aalto.x + aalto.w / 2 + 10, z: aalto.z + 10 },
  notice: 'OSM-baserad karta • byggnader och vattenbredder förenklade • ~ = ungefärlig plats',
  places: geography.places,
  roads: geography.roads,
  rivers: geography.rivers,
  waters: geography.waters,
  bridges: geography.roads.filter((r) => r.bridge),
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
  return MAP.bridges.some((b) => segmentDistance(x, z, ...b.points) < 6);
}
export function canStand(x, z) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > MAP.extent ||
    Math.abs(z) > MAP.extent
  )
    return false;
  if (MAP.places.some((p) => Math.abs(x - p.x) < p.w / 2 + 2 && Math.abs(z - p.z) < p.d / 2 + 2))
    return false;
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
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  for (let n = 3; n < distance - 3; n += 2) {
    const x = a.x + ((b.x - a.x) * n) / distance,
      z = a.z + ((b.z - a.z) * n) / distance;
    if (MAP.places.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2))
      return false;
  }
  return true;
}
