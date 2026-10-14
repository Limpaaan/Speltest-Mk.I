import city from './city.json' with { type: 'json' };
import { architectureSpec } from './architecture.js';
import { buildingBounds, buildingWorld, spatialIndex } from './buildings.js';
import { crossing, roadIndex, roadWidth } from './roads.js';
import { inParking } from './sites.js';
export { city };
export function cityPlaces(original) {
  return [
    ...original.map((p) => {
      const correction = city.corrections.find((c) => c.id === p.id);
      return correction
        ? {
            ...p,
            w: p.d > p.w && correction.w > correction.d ? correction.d : correction.w,
            d: p.d > p.w && correction.w > correction.d ? correction.w : correction.d,
            footprint: correction.footprint,
            x: correction.x,
            z: correction.z,
            yaw:
              ((correction.yaw + Math.PI / 2 + Math.PI * 2) % Math.PI) -
              Math.PI / 2 +
              (p.d > p.w && correction.w > correction.d ? Math.PI / 2 : 0) +
              (p.id === 'avesta-kyrka' && Math.sin(correction.yaw + Math.PI / 2) > 0 ? Math.PI : 0),
            lat: correction.lat,
            lon: correction.lon,
            sourceId: correction.sourceId,
            verified: true,
            architecture: 'OSM-footprint-interpreted-elevation',
          }
        : p;
    }),
    ...city.landmarks,
  ].map((p) => {
    const a = architectureSpec(p);
    return a
      ? { ...p, h: a.body, roofRise: a.roofRise, visualSource: 'dated-streetview-reference' }
      : p;
  });
}
export function streetWidths(roads, classes) {
  const widths = {
    motorway: 8,
    trunk: 8,
    primary: 7,
    secondary: 7,
    tertiary: 6,
    residential: 5.5,
    unclassified: 5.5,
    service: 4,
  };
  return roads.map((r) => ({ ...r, width: r.width || widths[classes[r.id]] || 2.9 }));
}
export function cityInfill(map, waterAt) {
  const nearRoads = roadIndex(map.roads, 100);
  const exclusions = spatialIndex([...map.places.filter((p) => p.w && p.d), ...map.cover], (p) =>
    buildingBounds(p, 2),
  );
  const sources = new Set(map.places.filter((p) => p.w && p.d).map((p) => p.sourceId));
  const buildings = city.buildings
    .filter((p) => {
      if (
        sources.has(p.sourceId) ||
        Math.hypot(p.x - map.spawn.x, p.z - map.spawn.z) < 55 ||
        inParking(map.parking || [], p.x, p.z, Math.hypot(p.w, p.d) / 2 + 1)
      )
        return false;
      const bounds = buildingBounds(p);
      if (
        exclusions
          .box(
            bounds.x - bounds.w / 2,
            bounds.z - bounds.d / 2,
            bounds.x + bounds.w / 2,
            bounds.z + bounds.d / 2,
          )
          .some((q) => {
            const b = buildingBounds(q, 1.2);
            return (
              Math.abs(bounds.x - b.x) < (bounds.w + b.w) / 2 &&
              Math.abs(bounds.z - b.z) < (bounds.d + b.d) / 2
            );
          })
      )
        return false;
      if (
        waterAt(p.x, p.z) ||
        nearRoads(p.x, p.z).some((r) => crossing(...r.points, p, roadWidth(r) / 2 + 0.45))
      )
        return false;
      return true;
    })
    .map((p) => {
      const prast = map.places.find((q) => q.id === 'prast'),
        ostberg = map.places.find((q) => q.id === 'ostberg');
      const residential =
        prast && Math.hypot(p.x - prast.x, p.z - prast.z) < 430 && p.type === 'cottage';
      const factory =
        ostberg && Math.hypot(p.x - ostberg.x, p.z - ostberg.z) < 360 && p.type === 'warehouse';
      const myrgatan =
        p.lat > 60.1413 &&
        p.lat < 60.1438 &&
        p.lon > 16.1638 &&
        p.lon < 16.1678 &&
        p.w > 28 &&
        p.d > 9 &&
        p.type !== 'warehouse';
      return {
        ...p,
        procedural: false,
        mapped: true,
        ...(residential
          ? {
              district: 'prastjorden',
              facadeColor: '#9f4b3e',
              whiteBand: true,
              visualSource: 'Rotegatan-StreetView-Jul-2026-neighbourhood-typology',
            }
          : {}),
        ...(factory
          ? {
              district: 'kallhagen',
              facadeColor: '#914b3c',
              gabled: true,
              visualSource: 'Kallhagsgatan-StreetView-Jul-2026-neighbourhood-typology',
            }
          : {}),
        ...(myrgatan
          ? {
              type: 'apartment',
              h: Math.max(p.h, 11.2),
              levels: Math.max(p.levels, 4),
              facadeColor: '#b3ad8b',
              visualSource: 'Myrgatan-StreetView-Aug-2023-neighbourhood-typology',
            }
          : {}),
      };
    });
  const obstacles = spatialIndex([...map.places.filter((p) => p.w && p.d), ...buildings], (p) =>
    buildingBounds(p, 1),
  );
  const entrances = [],
    access = [];
  for (const p of buildings) {
    let best = null;
    for (const r of nearRoads(p.x, p.z)) {
      if (r.pedestrian || r.bridge) continue;
      const [a, b] = r.points,
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len2 = dx * dx + dz * dz;
      const t = len2 ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / len2)) : 0;
      const point = [a[0] + t * dx, a[1] + t * dz],
        distance = Math.hypot(point[0] - p.x, point[1] - p.z);
      if (!best || distance < best.distance) best = { point, distance };
    }
    if (!best || best.distance > Math.hypot(p.w, p.d) / 2 + 40) continue;
    const sides = [
      [0, p.d / 2 + 0.95],
      [0, -p.d / 2 - 0.95],
      [p.w / 2 + 0.95, 0],
      [-p.w / 2 - 0.95, 0],
    ];
    const doors = sides
      .map(([x, z]) => buildingWorld(p, x, z))
      .sort(
        (a, b) =>
          Math.hypot(a.x - best.point[0], a.z - best.point[1]) -
          Math.hypot(b.x - best.point[0], b.z - best.point[1]),
      );
    for (const door of doors) {
      const start = [door.x, door.z],
        end = best.point;
      if (
        [start, end].some(
          ([x, z]) => Math.abs(x) > map.extent - 1 || Math.abs(z) > map.extent - 1,
        ) ||
        obstacles
          .box(
            Math.min(start[0], end[0]) - 1,
            Math.min(start[1], end[1]) - 1,
            Math.max(start[0], end[0]) + 1,
            Math.max(start[1], end[1]) + 1,
          )
          .some((b) => crossing(start, end, b, 0.65))
      )
        continue;
      const steps = Math.max(1, Math.ceil(Math.hypot(start[0] - end[0], start[1] - end[1])));
      if (
        Array.from({ length: steps + 1 }, (_, i) => i / steps).some((t) =>
          waterAt(start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t),
        )
      )
        continue;
      entrances.push({ buildingId: p.id, point: start, path: [start, end] });
      access.push({
        id: `access-${p.id}`,
        buildingId: p.id,
        points: [start, end],
        width: 1.2,
        pedestrian: true,
        surface: 'gravel',
        approximate: true,
      });
      break;
    }
  }
  return { buildings, entrances, access };
}
