import { inParking } from './sites.js';
import { buildingBounds } from './buildings.js';
import { cityInfill } from './city-layout.js';
// Dated OSM building footprints with deterministic vegetation in clear space.
export function createScenery(map, waterAt, distance, heightAt) {
  const city = cityInfill(map, waterAt);
  const buildings = city.buildings,
    trees = [],
    rocks = [];
  let seed = 90817;
  const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const overlaps = (x, z, w, d, list, margin = 3) =>
    list.some((p) => {
      const b = buildingBounds(p);
      return (
        Math.abs(x - b.x) < (w + b.w) / 2 + margin && Math.abs(z - b.z) < (d + b.d) / 2 + margin
      );
    });
  const safe = (x, z, r) =>
    Math.abs(x) < 540 &&
    Math.abs(z) < 540 &&
    Math.hypot(x - map.spawn.x, z - map.spawn.z) > 35 &&
    !waterAt(x, z) &&
    !inParking(map.parking || [], x, z, r + 2) &&
    !overlaps(x, z, r * 2, r * 2, map.places, 12) &&
    !overlaps(x, z, r * 2, r * 2, map.cover, 3);
  map.entrances.push(...city.entrances);
  map.roads.push(...city.access);
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
