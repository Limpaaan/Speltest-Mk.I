import { crossing } from './roads.js';
import { buildingWorld, buildingBounds } from './buildings.js';
import { aaltoWorld } from './interiors.js';

export const inParking = (lots, x, z, margin = 0) =>
  lots.some((p) => Math.abs(x - p.x) < p.w / 2 + margin && Math.abs(z - p.z) < p.d / 2 + margin);
const overlap = (a, b, pad = 0) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + pad;
const projection = (point, r) => {
  const [a, b] = r.points,
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = dx * dx + dz * dz;
  const t = length
    ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length))
    : 0;
  return [a[0] + dx * t, a[1] + dz * t];
};
// A small visibility graph routes real connections around all nearby footprints.
// Unlike clipping a line, it cannot leave a disconnected entrance stub behind.
export function accessRoute(start, targets, buildings, waterAt, width = 1.4) {
  const radius = 105,
    margin = width / 2 + 0.85;
  const near = buildings.filter((p) => {
    if (!p.w || !p.d) return false;
    const b = buildingBounds(p, margin);
    return (
      Math.hypot(
        Math.max(0, Math.abs(b.x - start[0]) - b.w / 2),
        Math.max(0, Math.abs(b.z - start[1]) - b.d / 2),
      ) < radius
    );
  });
  const ends = targets.filter((p) => Math.hypot(p[0] - start[0], p[1] - start[1]) < radius);
  if (!ends.length) return null;
  const nodes = [
    start,
    ...ends,
    ...near.flatMap((p) =>
      [-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => {
          const q = buildingWorld(
            p,
            sx * (p.w / 2 + margin + 0.04),
            sz * (p.d / 2 + margin + 0.04),
          );
          return [q.x, q.z];
        }),
      ),
    ),
  ];
  const clear = (a, b) => {
    if (near.some((p) => crossing(a, b, p, margin))) return false;
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let i = 0; i <= steps; i++)
      if (
        waterAt(
          a[0] + ((b[0] - a[0]) * i) / (steps || 1),
          a[1] + ((b[1] - a[1]) * i) / (steps || 1),
        )
      )
        return false;
    return true;
  };
  const cost = nodes.map(() => Infinity),
    prev = [],
    done = new Set();
  cost[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || !Number.isFinite(cost[u])) return null;
    if (u > 0 && u <= ends.length) {
      const path = [u];
      while (path[0]) path.unshift(prev[path[0]]);
      return path.map((i) => nodes[i]);
    }
    done.add(u);
    for (let v = 1; v < nodes.length; v++)
      if (!done.has(v)) {
        const c = cost[u] + Math.hypot(nodes[u][0] - nodes[v][0], nodes[u][1] - nodes[v][1]);
        if (c < cost[v] && clear(nodes[u], nodes[v])) {
          cost[v] = c;
          prev[v] = u;
        }
      }
  }
  return null;
}
export function planSites(buildings, roads, waterAt, requested = buildings) {
  const parking = [],
    access = [],
    entrances = [];
  const nearest = (point) =>
    roads
      .filter((r) => !r.bridge && !r.pedestrian)
      .map((r) => projection(point, r))
      .sort(
        (a, b) =>
          Math.hypot(a[0] - point[0], a[1] - point[1]) -
          Math.hypot(b[0] - point[0], b[1] - point[1]),
      )
      .slice(0, 12);
  const append = (path, p, drive = false) => {
    if (!path) return false;
    path.slice(1).forEach((point, i) =>
      access.push({
        id: `access-${p.id}`,
        buildingId: p.id,
        name: drive ? `${p.name} · infart` : '',
        points: [path[i], point],
        width: drive ? 3.4 : 1.4,
        pedestrian: !drive,
        surface: drive ? 'asphalt' : 'gravel',
        approximate: true,
        bridge: false,
      }),
    );
    return true;
  };
  for (const p of requested.filter((p) => p.w && p.d && p.type !== 'horse')) {
    // Existing Aalto has a real playable east doorway and a six-metre ramp.
    const entry = buildingWorld(p, 0, p.d / 2 + 1.6);
    const door = p.id === 'aalto' ? Object.values(aaltoWorld(18, 3.5)) : [entry.x, entry.z];
    const path = accessRoute(door, nearest(door), buildings, waterAt);
    if (append(path, p)) entrances.push({ buildingId: p.id, point: door, path });
    if (p.type !== 'retail' && p.type !== 'mall') continue;
    const w = Math.max(12, Math.min(26, p.w)),
      d = 13;
    const candidates = [];
    for (const extra of [0, 8, 18])
      for (const side of [0, 1, -1])
        candidates.push({
          x: p.x + side * (p.w / 2 + w / 2 + 3 + extra),
          z: side ? p.z : p.z + p.d / 2 + d / 2 + 3 + extra,
          w,
          d,
        });
    for (const lot of candidates) {
      if ([...buildings, ...parking].some((b) => b.w && overlap(lot, b, 1.5))) continue;
      let wet = false;
      for (let x = -lot.w / 2; x <= lot.w / 2; x += 2)
        for (let z = -lot.d / 2; z <= lot.d / 2; z += 2) wet ||= waterAt(lot.x + x, lot.z + z);
      if (wet) continue;
      const entry = [lot.x, lot.z + 1.8],
        drive = accessRoute(entry, nearest(entry), buildings, waterAt, 3.4),
        walk = path && accessRoute(door, [entry], buildings, waterAt);
      if (!drive || !walk) continue;
      append(drive, p, true);
      append(walk, p);
      parking.push({ ...lot, id: `parking-${p.id}`, buildingId: p.id, entry, entrance: door });
      break;
    }
  }
  return { parking, entrances, access };
}
