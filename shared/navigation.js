import { canStand } from './map.js';

// Static map cache is shared across rooms. Per-enemy routes live outside snapshots.
const STEP = 4;
const edges = new Map();
const nodes = new Map();
const routes = new WeakMap();
const key = (x, z) => `${x},${z}`;
export function walkableSegment(a, b, stand = canStand) {
  const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.65));
  for (let i = 0; i <= count; i++)
    if (!stand(a.x + ((b.x - a.x) * i) / count, a.z + ((b.z - a.z) * i) / count)) return false;
  return true;
}
class Heap {
  items = [];
  push(value) {
    let i = this.items.length;
    this.items.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f <= value.f) break;
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.items[i] = value;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop();
    if (!this.items.length) return first;
    let i = 0;
    while (i * 2 + 1 < this.items.length) {
      let child = i * 2 + 1;
      if (child + 1 < this.items.length && this.items[child + 1].f < this.items[child].f) child++;
      if (last.f <= this.items[child].f) break;
      this.items[i] = this.items[child];
      i = child;
    }
    this.items[i] = last;
    return first;
  }
}
export function findPath(start, goal, { stand = canStand, maxNodes = 2200 } = {}) {
  if (!stand(start.x, start.z) || !stand(goal.x, goal.z)) return [];
  if (walkableSegment(start, goal, stand)) return [{ ...goal }];
  const cache = stand === canStand;
  const point = (x, z) => ({ x: x * STEP, z: z * STEP });
  const passable = (x, z) => {
    const id = key(x, z);
    if (cache && nodes.has(id)) return nodes.get(id);
    const result = stand(x * STEP, z * STEP);
    if (cache) nodes.set(id, result);
    return result;
  };
  const connected = (a, b) => {
    const ids = [key(a.x, a.z), key(b.x, b.z)].sort();
    const id = ids.join(':');
    if (cache && edges.has(id)) return edges.get(id);
    const result = walkableSegment(point(a.x, a.z), point(b.x, b.z), stand);
    if (cache) edges.set(id, result);
    return result;
  };
  const attach = (p) => {
    const list = [];
    const x = Math.round(p.x / STEP),
      z = Math.round(p.z / STEP);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const node = { x: x + dx, z: z + dz };
        if (passable(node.x, node.z) && walkableSegment(p, point(node.x, node.z), stand))
          list.push(node);
      }
    return list;
  };
  const ends = new Set(attach(goal).map((p) => key(p.x, p.z)));
  if (!ends.size) return [];
  const open = new Heap(),
    best = new Map();
  const heuristic = (x, z) => Math.hypot(x * STEP - goal.x, z * STEP - goal.z);
  for (const p of attach(start)) {
    const g = Math.hypot(p.x * STEP - start.x, p.z * STEP - start.z);
    const node = { ...p, g, f: g + heuristic(p.x, p.z), parent: null };
    best.set(key(p.x, p.z), g);
    open.push(node);
  }
  let expanded = 0;
  while (open.items.length && expanded++ < maxNodes) {
    const current = open.pop(),
      id = key(current.x, current.z);
    if (current.g !== best.get(id)) continue;
    if (ends.has(id)) {
      const path = [{ ...goal }];
      for (let node = current; node; node = node.parent) path.push(point(node.x, node.z));
      return path.reverse();
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = current.x + dx,
          z = current.z + dz,
          nextId = key(x, z);
        const g = current.g + Math.hypot(dx, dz) * STEP;
        if (g >= (best.get(nextId) ?? Infinity) || !passable(x, z) || !connected(current, { x, z }))
          continue;
        best.set(nextId, g);
        open.push({ x, z, g, f: g + heuristic(x, z), parent: current });
      }
  }
  return []; // Never substitute a straight line through an obstacle when search is exhausted.
}

export function navigate(entity, goal, time, budget) {
  let route = routes.get(entity);
  if (
    !route ||
    (time >= route.expires && Math.hypot(goal.x - route.goal.x, goal.z - route.goal.z) > 5) ||
    time >= route.retry
  ) {
    if (budget.remaining <= 0) return null;
    budget.remaining--;
    const path = findPath(entity, goal);
    route = { goal: { ...goal }, path, expires: time + 0.8, retry: time + (path.length ? 4 : 2) };
    routes.set(entity, route);
  }
  while (
    route.path.length &&
    Math.hypot(route.path[0].x - entity.x, route.path[0].z - entity.z) < 0.35
  )
    route.path.shift();
  const next = route.path[0];
  if (!next && Math.hypot(goal.x - entity.x, goal.z - entity.z) > 1) route.retry = 0;
  return next || null;
}
