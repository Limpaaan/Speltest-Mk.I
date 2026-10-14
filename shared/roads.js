import { buildingLocal, buildingWorld } from './buildings.js';
export const roadWidth = (r) => r.width || (r.bridge ? 10 : r.name ? 5.6 : 3.1);
// Slab clipping of the centreline against a rectangle enlarged by the road shoulder.
export function crossing(a, b, p, margin = 0) {
  if (p.yaw) {
    const u = buildingLocal(p, ...a),
      v = buildingLocal(p, ...b);
    return crossing([u.x, u.z], [v.x, v.z], { x: 0, z: 0, w: p.w, d: p.d }, margin);
  }
  let lo = 0,
    hi = 1;
  for (const [axis, c, size] of [
    [0, p.x, p.w],
    [1, p.z, p.d],
  ]) {
    const min = c - size / 2 - margin,
      max = c + size / 2 + margin,
      delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) {
      if (a[axis] <= min || a[axis] >= max) return null;
      continue;
    }
    const u = (min - a[axis]) / delta,
      v = (max - a[axis]) / delta;
    lo = Math.max(lo, Math.min(u, v));
    hi = Math.min(hi, Math.max(u, v));
    if (lo >= hi - 1e-9) return null;
  }
  return [lo, hi];
}
// Schematic landmarks can exceed their real footprints in this compressed map.
// Clip access stubs at the facade; route through streets around the enlarged rectangle.
export function fitRoads(roads, buildings) {
  let result = roads;
  for (const p of buildings.filter((p) => p.w > 0 && p.d > 0)) {
    const next = [];
    for (const r of result) {
      const [a, b] = r.points,
        m = roadWidth(r) / 2 + 0.8,
        hit = crossing(a, b, p, m);
      if (!hit || r.bridge) {
        next.push(r);
        continue;
      }
      const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const add = (u, v) => {
        if (Math.hypot(v[0] - u[0], v[1] - u[1]) > 0.05)
          next.push({ ...r, points: [u, v], adjusted: true });
      };
      if (hit[0] <= 1e-8 || hit[1] >= 1 - 1e-8) {
        if (hit[0] > 0) add(a, at(hit[0]));
        if (hit[1] < 1) add(at(hit[1]), b);
        continue;
      }
      const nodes = [
        a,
        b,
        ...[
          [-1, -1],
          [-1, 1],
          [1, 1],
          [1, -1],
        ].map(([x, z]) => {
          const q = buildingWorld(p, x * (p.w / 2 + m + 0.02), z * (p.d / 2 + m + 0.02));
          return [q.x, q.z];
        }),
      ];
      const costs = [0, ...Array(5).fill(Infinity)],
        prev = [],
        done = new Set();
      for (let step = 0; step < 6; step++) {
        let u = -1;
        for (let i = 0; i < 6; i++) if (!done.has(i) && (u < 0 || costs[i] < costs[u])) u = i;
        if (u < 0 || !Number.isFinite(costs[u])) break;
        done.add(u);
        for (let v = 0; v < 6; v++)
          if (v !== u && !crossing(nodes[u], nodes[v], p, m)) {
            const cost =
              costs[u] + Math.hypot(nodes[u][0] - nodes[v][0], nodes[u][1] - nodes[v][1]);
            if (cost < costs[v]) {
              costs[v] = cost;
              prev[v] = u;
            }
          }
      }
      let path = [1];
      while (path[0] !== 0 && prev[path[0]] !== undefined) path.unshift(prev[path[0]]);
      if (path[0] === 0)
        for (let i = 1; i < path.length; i++) add(nodes[path[i - 1]], nodes[path[i]]);
    }
    result = next;
  }
  // Later detours may approach an earlier facade: clip only these residual overlaps.
  return result.flatMap((r) => {
    let pieces = [r];
    for (const p of buildings)
      if (p.w && p.d && !r.bridge)
        pieces = pieces.flatMap((s) => {
          const [a, b] = s.points,
            h = crossing(a, b, p, roadWidth(s) / 2 + 0.6);
          if (!h) return [s];
          const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
            out = [];
          if (h[0] > 0.001) out.push({ ...s, points: [a, at(h[0])], adjusted: true });
          if (h[1] < 0.999) out.push({ ...s, points: [at(h[1]), b], adjusted: true });
          return out;
        });
    return pieces;
  });
}
export function roadIndex(roads, padding = 1) {
  const cells = new Map();
  for (const r of roads) {
    const [a, b] = r.points,
      pad = roadWidth(r) / 2 + padding;
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - pad) / 20);
      x <= Math.floor((Math.max(a[0], b[0]) + pad) / 20);
      x++
    )
      for (
        let z = Math.floor((Math.min(a[1], b[1]) - pad) / 20);
        z <= Math.floor((Math.max(a[1], b[1]) + pad) / 20);
        z++
      ) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(r);
      }
  }
  return (x, z) => cells.get(`${Math.floor(x / 20)},${Math.floor(z / 20)}`) || [];
}
export function roadLift(x, z, near, distance) {
  let lift = 0;
  for (const r of near(x, z))
    if (!r.bridge) {
      const d = distance(x, z, ...r.points),
        half = roadWidth(r) / 2;
      // Asphalt surface and a 0.8 m graded gravel shoulder share this with physics.
      lift = Math.max(
        lift,
        d <= half ? 0.16 + 0.025 * (1 - d / half) : 0.16 * Math.max(0, 1 - (d - half) / 0.8),
      );
    }
  return lift;
}
