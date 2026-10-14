import { readFile, writeFile } from 'node:fs/promises';

const bbox = [60.126, 16.133, 60.151, 16.199];
const query = `[out:json][timeout:25];(way[landuse=industrial](${bbox.join(',')});node[man_made](60.130,16.184,60.133,16.190);way[man_made](60.130,16.184,60.133,16.190););out tags center geom;`;
const input = process.argv.indexOf('--input');
let data;
if (input >= 0) data = JSON.parse(await readFile(process.argv[input + 1], 'utf8'));
else {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'AvestaPrototype/0.9 (OpenStreetMap industrial import)',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
  data = await response.json();
}
if (data.remark || !Array.isArray(data.elements) || !data.elements.length)
  throw new Error(data.remark || 'The industrial import returned no complete records.');
await writeFile(
  'data/avesta-industrial-osm.json',
  JSON.stringify(
    {
      source: 'OpenStreetMap contributors',
      license: 'ODbL-1.0',
      retrievedAt: new Date().toISOString(),
      bbox,
      query,
      ...data,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${data.elements.length} industrial records imported.`);
