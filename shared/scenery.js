// Deterministic fictional infill around real OSM streets, never asserted as real footprints.
export function createScenery(map, waterAt, distance, heightAt) {
  const buildings = [],
    trees = [],
    rocks = [];
  let seed = 90817;
  const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const overlaps = (x, z, w, d, list, margin = 3) =>
    list.some(
      (p) =>
        Math.abs(x - p.x) < (w + p.w) / 2 + margin && Math.abs(z - p.z) < (d + p.d) / 2 + margin,
    );
  const safe = (x, z, r) =>
    Math.abs(x) < 540 &&
    Math.abs(z) < 540 &&
    Math.hypot(x - map.spawn.x, z - map.spawn.z) > 35 &&
    !waterAt(x, z) &&
    !overlaps(x, z, r * 2, r * 2, map.places, 12) &&
    !overlaps(x, z, r * 2, r * 2, map.cover, 3);
  for (const road of map.roads) {
    if (!road.name || road.bridge) continue;
    const [a, b] = road.points,
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    if (length < 8) continue;
    for (const side of [-1, 1]) {
      const w = 7 + rng() * 7,
        d = 7 + rng() * 8,
        offset = 14 + rng() * 5;
      const x = (a[0] + b[0]) / 2 + (dz / length) * offset * side,
        z = (a[1] + b[1]) / 2 - (dx / length) * offset * side;
      const radius = Math.hypot(w, d) / 2;
      if (
        !safe(x, z, radius) ||
        overlaps(x, z, w, d, buildings, 5) ||
        map.roads.some((r) => distance(x, z, ...r.points) < radius + 4)
      )
        continue;
      if (waterAt(x - w / 2, z - d / 2) || waterAt(x + w / 2, z + d / 2)) continue;
      const variation =
        Math.max(
          ...[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => heightAt(x + (sx * w) / 2, z + (sz * d) / 2)),
          ),
        ) - heightAt(x, z);
      if (variation > 2) continue;
      const type = rng() < 0.5 ? 'cottage' : rng() < 0.6 ? 'apartment' : 'warehouse';
      buildings.push({
        id: `infill-${buildings.length}`,
        x,
        z,
        w,
        d,
        h: type === 'cottage' ? 4.5 : type === 'apartment' ? 10 : 6,
        type,
        procedural: true,
      });
    }
    if (buildings.length >= 180) break;
  }
  for (let i = 0; i < 8000 && trees.length < 950; i++) {
    const x = (rng() - 0.5) * 1100,
      z = (rng() - 0.5) * 1100;
    // Groves leave clearings; southern/western areas are denser.
    if (
      Math.sin(x * 0.031) * Math.cos(z * 0.025) < -0.25 ||
      !safe(x, z, 1) ||
      overlaps(x, z, 2, 2, buildings, 4) ||
      map.roads.some((r) => distance(x, z, ...r.points) < 6)
    )
      continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    trees.push({ x, z, h: 6 + rng() * 8, radius: 0.48 });
  }
  for (let i = 0; i < 900 && rocks.length < 90; i++) {
    const x = (rng() - 0.5) * 1060,
      z = (rng() - 0.5) * 1060,
      radius = 0.7 + rng() * 1.2;
    if (
      !safe(x, z, radius) ||
      overlaps(x, z, radius * 2, radius * 2, buildings, 4) ||
      map.roads.some((r) => distance(x, z, ...r.points) < 8) ||
      trees.some((t) => Math.hypot(t.x - x, t.z - z) < radius + 2)
    )
      continue;
    rocks.push({ x, z, radius, h: 0.7 + rng() * 1.3 });
  }
  return { buildings, trees, rocks };
}
