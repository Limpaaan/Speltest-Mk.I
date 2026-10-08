import { readFile, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('data/avesta-osm.json', 'utf8'));
const origin = { lat: 60.148, lon: 16.178 },
  scale = 0.25;
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
      if ([a, b].some((p) => Math.abs(p[0]) < 650 && Math.abs(p[1]) < 650))
        roads.push({ id, name, bridge: e.tags.bridge === 'yes', points: [a, b] });
    }
  }
  if (e.tags.waterway === 'river') {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if ([a, b].some((p) => Math.abs(p[0]) < 700 && Math.abs(p[1]) < 700))
        rivers.push({ id, name, width: name === 'Dalälven' ? 27 : 4, points: [a, b] });
    }
  }
  if (
    e.tags.natural === 'water' &&
    points.length > 3 &&
    points.some((p) => Math.abs(p[0]) < 650 && Math.abs(p[1]) < 650)
  )
    waters.push({ id, name, points });
}
const definitions = [
  ['aalto', 'Aalto-huset', 'way/132486267', 24, 14, 24, 'aalto'],
  ['plus', 'Plushuset', null, 32, 25, 13, 'mall', { lat: 60.1456, lon: 16.1672 }],
  ['verket', 'Verket', 'node/9868272526', 38, 24, 26, 'works'],
  ['koppar', 'Koppardalen', 'way/132515278', 0, 0, 3, 'area'],
  ['horse', 'Dalahästen', 'node/3222383605', 12, 4, 14, 'horse'],
  ['prast', 'Prästjorden', 'node/4577465252', 20, 18, 12, 'district'],
  ['asbo', 'Åsbo', null, 20, 20, 12, 'district', { lat: 60.1535, lon: 16.193 }],
  ['skogsbo', 'Skogsbo', 'node/1896051103', 25, 20, 15, 'district'],
  ['skogsbo-school', 'Skogsbo skola', 'way/165548511', 20, 12, 6, 'school'],
  ['skogsbo-gym', 'Skogsbo skola idrottssal', 'way/165548549', 16, 10, 7, 'school'],
  ['skogsbo-dining', 'Skogsbo Skola Matsal', 'way/1019516058', 14, 10, 5, 'school'],
  ['asbobacken', 'Åsbobacken', 'node/2665372581', 0, 0, 0, 'viewpoint'],
];
const places = definitions.map(([id, name, sourceId, w, d, h, type, fallback]) => {
  const e = data.elements.find((e) => `${e.type}/${e.id}` === sourceId);
  if (sourceId && !e) throw new Error(`Missing ${sourceId}`);
  const geographic = e ? e.center || e : fallback;
  const [x, z] = project(geographic);
  return {
    id,
    name,
    sourceId,
    verified: Boolean(e),
    lat: geographic.lat,
    lon: geographic.lon,
    x,
    z,
    w,
    d,
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
