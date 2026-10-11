// Roadside scenery is deterministic and authoritative cover in both modes.
export function createVehicles(map, waterAt, distance) {
  const vehicles = [];
  for (const r of map.roads) {
    if (!r.name || r.bridge) continue;
    const [a, b] = r.points,
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 13) continue;
    const x = (a[0] + b[0]) / 2 + (dz / len) * 7.2,
      z = (a[1] + b[1]) / 2 - (dx / len) * 7.2;
    const near = map.places.some((p) => Math.hypot(x - p.x, z - p.z) < 90);
    if (
      !near ||
      Math.abs(x) > 500 ||
      Math.abs(z) > 500 ||
      waterAt(x, z) ||
      Math.hypot(x - map.spawn.x, z - map.spawn.z) < 42
    )
      continue;
    const yaw = Math.atan2(dx, dz),
      w = Math.abs(Math.cos(yaw)) * 1.9 + Math.abs(Math.sin(yaw)) * 4.4,
      d = Math.abs(Math.sin(yaw)) * 1.9 + Math.abs(Math.cos(yaw)) * 4.4;
    if (
      [...map.places, ...map.buildings, ...map.cover].some(
        (p) =>
          p.w && Math.abs(x - p.x) < (p.w + w) / 2 + 3 && Math.abs(z - p.z) < (p.d + d) / 2 + 3,
      )
    )
      continue;
    if (
      map.roads.some((r) => distance(x, z, ...r.points) < 3.9) ||
      vehicles.some((p) => Math.hypot(x - p.x, z - p.z) < 32)
    )
      continue;
    if (
      [...map.trees, ...map.rocks].some(
        (p) => Math.abs(x - p.x) < w / 2 + p.radius + 1 && Math.abs(z - p.z) < d / 2 + p.radius + 1,
      )
    )
      continue;
    const i = vehicles.length;
    vehicles.push({
      id: `police-${i}`,
      type: 'police',
      x,
      z,
      w,
      d,
      h: 1.6,
      yaw,
      overturned: i % 3 === 1,
      burning: i % 4 === 1,
    });
    if (vehicles.length === 12) break;
  }
  return vehicles;
}
