import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const raw = await readFile('data/avesta-buildings-osm.json');
const source = JSON.parse(raw);
const origin = { lat: 60.148, lon: 16.178 },
  scale = 1;
const project = ({ lat, lon }) => [
  (lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180) * scale,
  -(lat - origin.lat) * 111320 * scale,
];
const round = (n) => Number(n.toFixed(3));
const buildings = [];
for (const e of source.elements) {
  if (
    !e.geometry?.length ||
    ['garage', 'garages', 'shed', 'roof', 'carport'].includes(e.tags.building)
  )
    continue;
  const points = e.geometry.map(project);
  const lat = e.geometry.reduce((n, p) => n + p.lat, 0) / e.geometry.length;
  const lon = e.geometry.reduce((n, p) => n + p.lon, 0) / e.geometry.length;
  let edge = [0, 0],
    longest = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0],
      dz = points[i][1] - points[i - 1][1];
    if (dx * dx + dz * dz > longest) {
      longest = dx * dx + dz * dz;
      edge = [dx, dz];
    }
  }
  const yaw = Math.atan2(-edge[1], edge[0]),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const local = points.map(([x, z]) => [c * x - s * z, s * x + c * z]);
  const minU = Math.min(...local.map((p) => p[0])),
    maxU = Math.max(...local.map((p) => p[0]));
  const minV = Math.min(...local.map((p) => p[1])),
    maxV = Math.max(...local.map((p) => p[1]));
  const u = (minU + maxU) / 2,
    v = (minV + maxV) / 2,
    w = maxU - minU,
    d = maxV - minV;
  const x = c * u + s * v,
    z = -s * u + c * v;
  if (Math.abs(x) > 2220 || Math.abs(z) > 2220 || w * d < 12 || w < 2.6 || d < 2.6) continue;
  const tag = e.tags.building;
  const type = ['industrial', 'warehouse', 'retail', 'commercial'].includes(tag)
    ? 'warehouse'
    : ['apartments', 'office', 'hospital', 'public', 'school'].includes(tag)
      ? 'apartment'
      : 'cottage';
  const levels = Math.max(
    1,
    Math.min(
      6,
      Number(e.tags['building:levels']) || (type === 'apartment' ? 3 : type === 'cottage' ? 2 : 1),
    ),
  );
  buildings.push({
    id: `osm-building-${e.id}`,
    sourceId: `way/${e.id}`,
    name: e.tags.name || '',
    lat: Number(lat.toFixed(7)),
    lon: Number(lon.toFixed(7)),
    x: round(x),
    z: round(z),
    w: round(w),
    d: round(d),
    yaw: round(yaw),
    h: round(
      type === 'warehouse'
        ? Math.max(4, Math.min(35, Number.parseFloat(e.tags.height) || 7))
        : Number.parseFloat(e.tags.height) || 2.8 * levels,
    ),
    type,
    levels,
    footprint: points.map((p) => p.map(round)),
    architecture: 'OSM-footprint-interpreted-elevation',
  });
}
const definitions = [
  ['stadshuset', 'Stadshuset', 132486167, 'townhall', 7],
  ['myntmuseet', 'Myntmuseet', 132486193, 'museum', 5],
  ['gamla-vattentornet', 'Gamla vattentornet', 132486268, 'watertower', 16],
  ['nya-vattentornet', 'Nya vattentornet', 132492726, 'watertower', 18],
  ['avesta-lasarett', 'Avesta lasarett', 132486137, 'hospital', 11],
  ['avesta-ishall', 'Avesta ishall', 132486257, 'sports', 7],
  ['avesta-busstation', 'Avesta busstation', 224892918, 'station', 4],
  ['krylbo-station', 'Avesta Krylbo station', 121994913, 'station', 8],
];
const landmarks = definitions.flatMap(([id, name, sourceId, type, h]) => {
  const b = buildings.find((b) => b.sourceId === `way/${sourceId}`);
  return b
    ? [
        {
          ...b,
          id,
          name,
          type,
          h,
          verified: true,
          source: 'OpenStreetMap building footprint, 2026-10-12',
        },
      ]
    : [];
});
const corrections = [
  ['aalto', 132486267],
  ['verket', 132486135],
  ['avesta-kyrka', 132486130],
  ['storfors', 103452796],
  ['lillfors', 132486171],
  ['biltema', 969579646],
  ['jula', 132515439],
].flatMap(([id, sourceId]) => {
  const b = buildings.find((b) => b.sourceId === `way/${sourceId}`);
  return b ? [{ ...b, id, verified: true }] : [];
});
const result = {
  source: 'OpenStreetMap contributors',
  license: 'ODbL-1.0',
  date: '2026-10-12',
  query: 'way[building](60.128,16.135,60.170,16.219); out tags center geom;',
  sourceSha256: createHash('sha256').update(raw).digest('hex'),
  origin,
  scale,
  roadClasses: Object.fromEntries(
    JSON.parse(await readFile('data/avesta-osm.json', 'utf8'))
      .elements.filter((e) => e.tags?.highway)
      .map((e) => [e.type + '/' + e.id, e.tags.highway]),
  ),
  buildings,
  landmarks,
  corrections,
};
await writeFile('shared/city.json', JSON.stringify(result) + '\n');
console.log(
  `${buildings.length} building footprints, ${landmarks.length} landmarks, ${corrections.length} corrections`,
);
