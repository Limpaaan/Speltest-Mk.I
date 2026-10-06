import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const BBOX = [60.115, 16.1, 60.19, 16.26]; // south, west, north, east; Avesta and surrounding districts
export function normalizeOSM(data) {
  if (!data || !Array.isArray(data.elements))
    throw new Error('Expected an Overpass JSON response with elements.');
  const origin = { lat: 60.145, lon: 16.17 };
  const project = (point) => ({
    x: (point.lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180),
    z: -(point.lat - origin.lat) * 111320,
  });
  const features = data.elements
    .filter((e) => e.tags)
    .map((e) => {
      const geometry =
        e.geometry ||
        (e.type === 'node'
          ? [{ lat: e.lat, lon: e.lon }]
          : e.center
            ? [e.center]
            : e.members?.flatMap((m) => m.geometry || []) || []);
      const valid = geometry.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          p.lat >= BBOX[0] - 0.02 &&
          p.lat <= BBOX[2] + 0.02 &&
          p.lon >= BBOX[1] - 0.02 &&
          p.lon <= BBOX[3] + 0.02,
      );
      return {
        id: `${e.type}/${e.id}`,
        tags: e.tags,
        coordinates: valid,
        projected: valid.map(project),
      };
    })
    .filter((f) => f.coordinates.length);
  if (!features.length)
    throw new Error(
      'No usable geometry within Avesta bounds. Existing files have not been replaced.',
    );
  return {
    source: 'OpenStreetMap contributors',
    license: 'ODbL-1.0',
    attributionUrl: 'https://www.openstreetmap.org/copyright',
    origin,
    units: 'metres',
    note: 'Candidate data only. Building names, relation topology and positions require review before integrating into gameplay.',
    features,
  };
}
async function main() {
  const input = process.argv.indexOf('--input');
  let raw;
  if (input >= 0) {
    if (!process.argv[input + 1]) throw new Error('--input requires a local JSON file');
    raw = await readFile(process.argv[input + 1], 'utf8');
  } else {
    const box = '60.13,16.13,60.175,16.23';
    const queries = [
      `[out:json][timeout:25];(way["waterway"="river"](${box});way["natural"="water"](${box});way["highway"~"primary|secondary|tertiary|trunk|residential"](${box}););out geom;`,
      `[out:json][timeout:20];nwr["name"~"Aalto|Plushuset|Verket|Koppardalen|Dalahäst|Prästjorden|Åsbo|Skogsbo",i](${BBOX.join(',')});out center;`,
    ];
    const elements = [];
    for (const query of queries) {
      let response;
      try {
        response = execFileSync(
          'curl',
          [
            '--fail',
            '--silent',
            '--show-error',
            '--location',
            '--max-time',
            '50',
            '--header',
            'Accept: application/json',
            '--user-agent',
            'AvestaPrototype/0.1 (OpenStreetMap map import)',
            '--data-urlencode',
            `data=${query}`,
            'https://overpass-api.de/api/interpreter',
          ],
          { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
        );
      } catch {
        throw new Error(
          'Could not fetch Overpass data. Check access to overpass-api.de; HTTP 429/504 may mean the public service is busy. You can also supply a licensed local export with --input. No game map was modified.',
        );
      }
      const parsed = JSON.parse(response);
      if (parsed.remark) throw new Error(`Overpass returned incomplete data: ${parsed.remark}`);
      elements.push(...parsed.elements);
    }
    raw = JSON.stringify({ elements });
  }
  const output = normalizeOSM(JSON.parse(raw));
  output.fetchedAt = new Date().toISOString();
  await mkdir('.local', { recursive: true });
  await writeFile('.local/avesta-osm-candidate.json', JSON.stringify(output, null, 2) + '\n');
  console.log(
    `Saved ${output.features.length} features to .local/avesta-osm-candidate.json. Review against docs/MAP.md before integration. The checked-in game map was not modified.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
