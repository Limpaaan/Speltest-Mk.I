import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const raw = await readFile('data/avesta-forest-osm.json'),
  source = JSON.parse(raw),
  geo = JSON.parse(await readFile('shared/geography.json', 'utf8'));
const project = (p) => [
  (p.lon - geo.origin.lon) * 111320 * Math.cos((geo.origin.lat * Math.PI) / 180),
  -(p.lat - geo.origin.lat) * 111320,
];
const polygons = source.elements
  .filter((e) => e.geometry?.length >= 4)
  .flatMap((e) => {
    const first = e.geometry[0],
      last = e.geometry.at(-1);
    if (first.lat !== last.lat || first.lon !== last.lon) return [];
    const points = e.geometry.map(project).map((q) => q.map((n) => Number(n.toFixed(3))));
    const xs = points.map((q) => q[0]),
      zs = points.map((q) => q[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const area =
      Math.abs(
        points.slice(1).reduce((sum, p, i) => sum + points[i][0] * p[1] - p[0] * points[i][1], 0),
      ) / 2;
    if (area < 400 || maxX < -2280 || minX > 2280 || maxZ < -2280 || minZ > 2280) return [];
    return [
      {
        sourceId: `${e.type}/${e.id}`,
        points,
        area,
        bounds: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ },
      },
    ];
  });
await writeFile(
  'shared/forest.json',
  JSON.stringify({
    source: 'OpenStreetMap contributors',
    license: 'ODbL-1.0',
    date: source.retrievedAt,
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    origin: geo.origin,
    scale: 1,
    polygons,
  }) + '\n',
);
console.log(`${polygons.length} closed mapped forest polygons`);
