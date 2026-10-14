// Roadside scenery is deterministic and authoritative cover in both modes.
import { buildingBounds, spatialIndex } from './buildings.js';
import { roadIndex, roadWidth } from './roads.js';

export function createVehicles(map, waterAt, distance) {
  const vehicles = [];
  const boundary = map.extent - 20,
    obstacles = spatialIndex(
      [...map.places, ...map.buildings, ...map.cover].filter((p) => p.w && p.d),
      (p) => buildingBounds(p, 3),
    ),
    nearRoads = roadIndex(map.roads, 4),
    railSegments = (map.railways || []).flatMap((r) =>
      r.points
        .slice(1)
        .map((point, i) => ({ ...r, width: r.width || 5, points: [r.points[i], point] })),
    ),
    nearRails = roadIndex(railSegments, 3);
  for (const r of map.roads) {
    if (!r.name || r.bridge) continue;
    const [a, b] = r.points,
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 13) continue;
    const shoulder = Math.max(7.2, roadWidth(r) / 2 + 3.2),
      x = (a[0] + b[0]) / 2 + (dz / len) * shoulder,
      z = (a[1] + b[1]) / 2 - (dx / len) * shoulder;
    const near = map.places.some((p) => {
      const b = p.w && p.d ? buildingBounds(p) : { ...p, w: 0, d: 0 };
      return (
        Math.hypot(
          Math.max(0, Math.abs(x - b.x) - b.w / 2),
          Math.max(0, Math.abs(z - b.z) - b.d / 2),
        ) < 90
      );
    });
    if (
      !near ||
      Math.abs(x) > boundary ||
      Math.abs(z) > boundary ||
      waterAt(x, z) ||
      Math.hypot(x - map.spawn.x, z - map.spawn.z) < 42
    )
      continue;
    const yaw = Math.atan2(dx, dz),
      w = Math.abs(Math.cos(yaw)) * 1.9 + Math.abs(Math.sin(yaw)) * 4.4,
      d = Math.abs(Math.sin(yaw)) * 1.9 + Math.abs(Math.cos(yaw)) * 4.4;
    if (
      obstacles
        .box(x - w / 2, z - d / 2, x + w / 2, z + d / 2)
        .some(
          (p) =>
            p.w && Math.abs(x - p.x) < (p.w + w) / 2 + 3 && Math.abs(z - p.z) < (p.d + d) / 2 + 3,
        )
    )
      continue;
    if (
      nearRoads(x, z).some((r) => distance(x, z, ...r.points) < roadWidth(r) / 2 + 1.4) ||
      nearRails(x, z).some((r) => distance(x, z, ...r.points) < (r.width || 5) / 2 + 3) ||
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
