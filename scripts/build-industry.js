import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const raw = await readFile('data/avesta-buildings-osm.json');
const source = JSON.parse(raw);
const areasRaw = await readFile('data/avesta-industrial-osm.json');
const areasSource = JSON.parse(areasRaw);
const origin = { lat: 60.148, lon: 16.178 };
const scale = 1;
const project = ({ lat, lon }) => [
  (lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180),
  -(lat - origin.lat) * 111320,
];
const round = (n) => Number(n.toFixed(3));
const definitions = [
  [132492531, 'ostberg', 'H Östberg AB', 'ostberg', 8.2],
  [202587943, 'outokumpu', 'Outokumpu Avesta Works · Stålverk', 'steel', 22],
  [202587944, 'varmbandverk', 'Avesta Works · Varmbandverk', 'steel', 14],
  [202587939, 'fardigstallning', 'Avesta Works · Färdigställning', 'steel', 11],
  [202587947, 'bredbandverk', 'Avesta Works · Bredbandverk', 'steel', 13],
  [202587925, 'pressplate', 'Avesta Works · PressPlate', 'steel', 9],
  [202587935, 'lagringshall', 'Avesta Works · Lagringshall', 'steel', 10],
  ...[
    202587920, 202587921, 202587922, 202587924, 202587926, 202587927, 202587928, 202587930,
    202587931, 202587932, 202587933, 202587934, 202587936, 202587937, 202587938, 202587940,
    202587941, 202587942, 202587945,
  ].map((id) => [id, `avesta-works-${id}`, 'Avesta Works', 'steel', id === 202587937 ? 17 : 9]),
  [202587923, 'linde-control', 'Linde Gas · kontrollbyggnad', 'linde-office', 7],
];
const places = definitions.map(([way, id, name, industry, h]) => {
  const record = source.elements.find((e) => e.id === way);
  if (!record?.geometry?.length) throw new Error(`Missing industrial footprint way/${way}`);
  const points = record.geometry.map(project);
  let edge = [0, 0],
    longest = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].map((v, j) => v - points[i - 1][j]);
    if (delta[0] ** 2 + delta[1] ** 2 > longest) {
      edge = delta;
      longest = delta[0] ** 2 + delta[1] ** 2;
    }
  }
  let yaw = Math.atan2(-edge[1], edge[0]);
  while (yaw > Math.PI / 2) yaw -= Math.PI;
  while (yaw < -Math.PI / 2) yaw += Math.PI;
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  const rotated = points.map(([x, z]) => [c * x - s * z, s * x + c * z]);
  const minX = Math.min(...rotated.map((q) => q[0])),
    maxX = Math.max(...rotated.map((q) => q[0]));
  const minZ = Math.min(...rotated.map((q) => q[1])),
    maxZ = Math.max(...rotated.map((q) => q[1]));
  const u = (minX + maxX) / 2,
    v = (minZ + maxZ) / 2;
  const lat = record.geometry.reduce((n, p) => n + p.lat, 0) / record.geometry.length;
  const lon = record.geometry.reduce((n, p) => n + p.lon, 0) / record.geometry.length;
  return {
    id,
    name,
    sourceId: `way/${way}`,
    industry,
    type: 'industrial',
    x: round(c * u + s * v),
    z: round(-s * u + c * v),
    w: round(maxX - minX),
    d: round(maxZ - minZ),
    yaw: round(yaw),
    h,
    lat,
    lon,
    verified: true,
    footprint: points.map((q) => q.map(round)),
    localFootprint: rotated.map(([x, z]) => [round(x - u), round(z - v)]),
    architecture: 'OSM-footprint-public-exterior-interpreted-height',
    visualSource:
      id === 'ostberg'
        ? 'Google-Street-View-Aug-2023-and-company-aerial-Sep-2018'
        : industry === 'linde-office'
          ? 'Google-Street-View-Aug-2023'
          : 'public-Avesta-Works-exterior-reference',
  };
});
const pin = { lat: 60.1312666, lon: 16.1865725 };
const [x, z] = project(pin);
places.push({
  id: 'linde-gas',
  name: 'Linde Gas · AGA-tornet',
  type: 'industrial',
  industry: 'linde',
  ...pin,
  x: round(x),
  z: round(z),
  w: 11,
  d: 10,
  h: 46,
  yaw: 0.405,
  sourceId: null,
  verified: false,
  architecture: 'Google-Maps-place-pin-interpreted-tower-position-and-height',
  visualSource: 'Google-Street-View-Aug-2023-and-public-photo-May-2023',
});
await writeFile(
  'shared/industry.json',
  JSON.stringify(
    {
      source: 'OpenStreetMap contributors',
      license: 'ODbL-1.0',
      sourceSha256: createHash('sha256').update(raw).digest('hex'),
      origin,
      scale,
      places,
      areasSourceSha256: createHash('sha256').update(areasRaw).digest('hex'),
      areas: areasSource.elements
        .filter((e) => e.tags?.landuse === 'industrial' && e.geometry?.length > 3)
        .map((e) => ({
          sourceId: `${e.type}/${e.id}`,
          name: e.tags.name || 'Industrimark',
          points: e.geometry.map(project).map((q) => q.map(round)),
        })),
    },
    null,
    2,
  ) + '\n',
);
console.log(`${places.length} industrial places at one world metre per real metre.`);
