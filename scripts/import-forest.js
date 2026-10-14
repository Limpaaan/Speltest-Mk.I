import { writeFile } from 'node:fs/promises';
const bbox = [60.126, 16.133, 60.17, 16.222];
const query = `[out:json][timeout:30];(way[natural=wood](${bbox.join(',')});way[landuse=forest](${bbox.join(',')}););out tags geom;`;
const r = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    'User-Agent': 'AvestaPrototype/0.9 (OpenStreetMap forest import)',
  },
  body: new URLSearchParams({ data: query }),
  signal: AbortSignal.timeout(55000),
});
if (!r.ok) throw Error(`Forest import HTTP ${r.status}`);
const data = await r.json();
if (data.remark || !data.elements?.length) throw Error(data.remark || 'No complete forest records');
await writeFile(
  'data/avesta-forest-osm.json',
  JSON.stringify({
    ...data,
    source: 'OpenStreetMap contributors',
    license: 'ODbL-1.0',
    retrievedAt: new Date().toISOString(),
    bbox,
    query,
  }) + '\n',
);
console.log(`${data.elements.length} mapped woodland areas`);
