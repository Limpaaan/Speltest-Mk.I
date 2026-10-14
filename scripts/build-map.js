import { readFile, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('data/avesta-osm.json', 'utf8'));
const origin = { lat: 60.148, lon: 16.178 },
  scale = 1;
const project = (p) => [
  Number(
    ((p.lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180) * scale).toFixed(2),
  ),
  Number((-(p.lat - origin.lat) * 111320 * scale).toFixed(2)),
];
const roads = [],
  rivers = [],
  waters = [];
for (const e of data.elements) {
  if (!e.geometry?.length) continue;
  const points = e.geometry.map(project);
  const id = `${e.type}/${e.id}`,
    name = e.tags.name || '';
  if (e.tags.highway) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if ([a, b].some((p) => Math.abs(p[0]) < 2600 && Math.abs(p[1]) < 2600))
        roads.push({ id, name, bridge: e.tags.bridge === 'yes', points: [a, b] });
    }
  }
  if (e.tags.waterway === 'river') {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if ([a, b].some((p) => Math.abs(p[0]) < 2800 && Math.abs(p[1]) < 2800))
        rivers.push({ id, name, width: name === 'Dalälven' ? 108 : 16, points: [a, b] });
    }
  }
  if (
    e.tags.natural === 'water' &&
    points.length > 3 &&
    points.some((p) => Math.abs(p[0]) < 2600 && Math.abs(p[1]) < 2600)
  )
    waters.push({ id, name, points });
}
const definitions = [
  ['aalto', 'Aalto-huset', 'way/132486267', 24, 14, 24, 'aalto'],
  ['plus', 'Plushuset', null, 32, 25, 13, 'mall', { lat: 60.1456, lon: 16.1672 }],
  ['verket', 'Verket', 'way/132486135', 38, 24, 26, 'works'],
  ['koppar', 'Koppardalen', 'way/132515278', 0, 0, 3, 'area'],
  ['horse', 'Dalahästen', 'node/3222383605', 12, 4, 14, 'horse'],
  ['prast', 'Prästjorden', 'node/4577465252', 0, 0, 0, 'area'],
  ['asbo', 'Åsbo', null, 0, 0, 0, 'area', { lat: 60.1535, lon: 16.193 }],
  ['skogsbo', 'Skogsbo', 'node/1896051103', 0, 0, 0, 'area'],
  ['skogsbo-school', 'Skogsbo skola', 'way/165548511', 20, 12, 6, 'school'],
  ['skogsbo-gym', 'Skogsbo skola idrottssal', 'way/165548549', 16, 10, 7, 'school'],
  ['skogsbo-dining', 'Skogsbo Skola Matsal', 'way/1019516058', 14, 10, 5, 'school'],
  ['asbobacken', 'Åsbobacken', 'node/2665372581', 0, 0, 0, 'viewpoint'],
];
const city = JSON.parse(await readFile('shared/city.json', 'utf8'));
const places = definitions.map(([id, name, sourceId, w, d, h, type, fallback]) => {
  const e =
    data.elements.find((e) => `${e.type}/${e.id}` === sourceId) ||
    city.buildings.find((b) => b.sourceId === sourceId);
  if (sourceId && !e) throw new Error(`Missing ${sourceId}`);
  const geographic = e ? e.center || e : fallback;
  const [x, z] = project(geographic);
  const footprint = w && d ? city.buildings.find((b) => b.sourceId === sourceId) : null;
  const yaw = footprint ? ((footprint.yaw + Math.PI / 2 + Math.PI * 2) % Math.PI) - Math.PI / 2 : 0;
  return {
    id,
    name,
    sourceId,
    verified: Boolean(e),
    lat: geographic.lat,
    lon: geographic.lon,
    x: footprint?.x ?? x,
    z: footprint?.z ?? z,
    w: footprint?.w ?? w,
    d: footprint?.d ?? d,
    yaw,
    h,
    type,
    architecture: 'interpreted-not-surveyed',
  };
});
const result = {
  source: data.source,
  license: data.license,
  date: data.retrievedAt,
  origin,
  scale,
  roads,
  rivers,
  waters,
  places,
};
await writeFile('shared/geography.json', JSON.stringify(result) + '\n');
console.log(
  `Geographic map: ${roads.length} road segments, ${rivers.length} river segments, ${waters.length} water polygons, ${places.filter((p) => p.verified).length} sourced landmarks; 2 approximate places.`,
);
