import { inParking } from './sites.js';
import { buildingBounds, spatialIndex } from './buildings.js';
import { cityInfill } from './city-layout.js';
import { roadIndex, roadWidth } from './roads.js';
import { FOREST, forestAt } from './forest.js';
// Dated OSM building footprints with deterministic vegetation in clear space.
export function createScenery(map, waterAt, distance, heightAt) {
  const city = cityInfill(map, waterAt);
  const buildings = city.buildings,
    trees = [],
    rocks = [];
  const extent = map.extent - 30;
  // Expand coverage with the geographic map while keeping a bounded instance budget.
  const coverage = Math.max(1, map.extent / 570),
    treeLimit = Math.min(4000, Math.round(950 * coverage)),
    rockLimit = Math.min(180, Math.round(90 * Math.sqrt(coverage)));
  let seed = 90817;
  const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const overlapIndex = (list, margin) => spatialIndex(list, (p) => buildingBounds(p, margin));
  const placeIndex = overlapIndex(
      map.places.filter((p) => p.w && p.d),
      12,
    ),
    coverIndex = overlapIndex(map.cover, 3),
    buildingIndex = overlapIndex(buildings, 4);
  const overlaps = (x, z, w, d, index, margin = 3) =>
    index.box(x - w / 2, z - d / 2, x + w / 2, z + d / 2).some((p) => {
      const b = buildingBounds(p);
      return (
        Math.abs(x - b.x) < (w + b.w) / 2 + margin && Math.abs(z - b.z) < (d + b.d) / 2 + margin
      );
    });
  const treeCells = new Map(),
    cellKey = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  const nearTrees = (x, z, radius) => {
    const nearby = [];
    for (let cx = Math.floor((x - radius) / 8); cx <= Math.floor((x + radius) / 8); cx++)
      for (let cz = Math.floor((z - radius) / 8); cz <= Math.floor((z + radius) / 8); cz++)
        nearby.push(...(treeCells.get(`${cx},${cz}`) || []));
    return nearby;
  };
  const safe = (x, z, r) =>
    Math.abs(x) < extent &&
    Math.abs(z) < extent &&
    Math.hypot(x - map.spawn.x, z - map.spawn.z) > 35 &&
    !waterAt(x, z) &&
    !inParking(map.parking || [], x, z, r + 2) &&
    !overlaps(x, z, r * 2, r * 2, placeIndex, 12) &&
    !overlaps(x, z, r * 2, r * 2, coverIndex, 3);
  map.entrances.push(...city.entrances);
  map.roads.push(...city.access);
  const nearRoads = roadIndex(map.roads, 8),
    railSegments = (map.railways || []).flatMap((r) =>
      r.points
        .slice(1)
        .map((point, i) => ({ ...r, width: r.width || 5, points: [r.points[i], point] })),
    ),
    nearRails = roadIndex(railSegments, 5);
  const clearTransport = (x, z, margin) =>
    !nearRoads(x, z).some(
      (r) => distance(x, z, ...r.points) < Math.max(margin, roadWidth(r) / 2 + 2),
    ) && !nearRails(x, z).some((r) => distance(x, z, ...r.points) < (r.width || 5) / 2 + margin);
  for (let i = 0; i < treeLimit * 12 && trees.length < treeLimit; i++) {
    const x = (rng() - 0.5) * extent * 2,
      z = (rng() - 0.5) * extent * 2;
    // Groves leave clearings; southern/western areas are denser.
    if (
      Math.sin((x * 0.031) / coverage) * Math.cos((z * 0.025) / coverage) < -0.25 ||
      !safe(x, z, 1) ||
      overlaps(x, z, 2, 2, buildingIndex, 4) ||
      !clearTransport(x, z, 6)
    )
      continue;
    if (nearTrees(x, z, 3).some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const tree = { x, z, h: 8 + rng() * 9, radius: 0.48 };
    trees.push(tree);
    const cell = cellKey(x, z);
    if (!treeCells.has(cell)) treeCells.set(cell, []);
    treeCells.get(cell).push(tree);
  }
  const areas = FOREST.polygons,
    totalArea = areas.reduce((n, p) => n + p.area, 0),
    woodlandBudget = Math.min(14000, Math.floor(totalArea / 100)),
    initialTrees = trees.length;
  for (let i = 0; i < woodlandBudget * 24 && trees.length < initialTrees + woodlandBudget; i++) {
    let pick = rng() * totalArea,
      area = areas[0];
    for (const p of areas) {
      pick -= p.area;
      if (pick <= 0) {
        area = p;
        break;
      }
    }
    if (!area) break;
    const b = area.bounds,
      x = b.x + (rng() - 0.5) * b.w,
      z = b.z + (rng() - 0.5) * b.d;
    if (
      !forestAt(x, z) ||
      !safe(x, z, 1) ||
      overlaps(x, z, 2, 2, buildingIndex, 4) ||
      !clearTransport(x, z, 6) ||
      nearTrees(x, z, 4).some((t) => Math.hypot(t.x - x, t.z - z) < 4)
    )
      continue;
    const tree = {
      x,
      z,
      h: 13 + rng() * 13,
      radius: 0.48,
      forestSourced: true,
      species: rng() < 0.65 ? 1 : rng() < 0.75 ? 2 : 0,
    };
    trees.push(tree);
    const cell = cellKey(x, z);
    if (!treeCells.has(cell)) treeCells.set(cell, []);
    treeCells.get(cell).push(tree);
  }
  for (let i = 0; i < rockLimit * 12 && rocks.length < rockLimit; i++) {
    const x = (rng() - 0.5) * (extent - 10) * 2,
      z = (rng() - 0.5) * (extent - 10) * 2,
      radius = 0.7 + rng() * 1.2;
    if (
      !safe(x, z, radius) ||
      overlaps(x, z, radius * 2, radius * 2, buildingIndex, 4) ||
      !clearTransport(x, z, 8) ||
      nearTrees(x, z, radius + 2).some((t) => Math.hypot(t.x - x, t.z - z) < radius + 2)
    )
      continue;
    rocks.push({ x, z, radius, h: 0.7 + rng() * 1.3 });
  }
  return { buildings, trees, rocks };
}
