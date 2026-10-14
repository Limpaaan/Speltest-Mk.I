import { readFile, writeFile, rename } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({
  options: {
    input: { type: 'string' },
    output: { type: 'string', default: path.join(root, 'data/avesta-transport-osm.json') },
  },
});
const bbox = [60.126, 16.133, 60.17, 16.222];
const query = `[out:json][timeout:45];(way["railway"~"^(rail|disused|abandoned|construction)$"](${bbox.join(',')});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)(_link)?$"](${bbox.join(',')}););out tags geom;`;
let data;
if (values.input) data = JSON.parse(await readFile(values.input, 'utf8'));
else {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'AvestaPrototype/0.9 (OpenStreetMap map import)',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(65000),
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
  data = await response.json();
}
if (data.remark || !data.elements?.length) throw new Error(data.remark || 'Empty transport data');
if (!data.elements.some((e) => e.type === 'way' && e.tags?.railway && e.geometry?.length > 1))
  throw new Error('Transport snapshot has no railway geometry');
const source = {
  source: 'OpenStreetMap contributors',
  license: 'ODbL-1.0',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  retrievedAt: data.retrievedAt || new Date().toISOString(),
  osmTimestamp: data.osmTimestamp || data.osm3s?.timestamp_osm_base,
  bbox,
  query,
  elements: data.elements,
};
// Validate the entire reply before replacing a usable source snapshot.
await writeFile(values.output + '.tmp', JSON.stringify(source, null, 2) + '\n');
await rename(values.output + '.tmp', values.output);
console.log(`Saved ${source.elements.length} transport ways`);
