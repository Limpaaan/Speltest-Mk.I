import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTransport } from '../shared/transport-layout.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({
  options: {
    input: { type: 'string', default: path.join(root, 'data/avesta-transport-osm.json') },
    output: { type: 'string', default: path.join(root, 'shared/transport.json') },
    scale: { type: 'string', default: '1' },
    extent: { type: 'string', default: '2280' },
  },
});
const raw = await readFile(values.input),
  source = JSON.parse(raw),
  geography = JSON.parse(await readFile(path.join(root, 'shared/geography.json'), 'utf8')),
  scale = Number(values.scale),
  extent = Number(values.extent);
if (!(scale > 0) || !(extent > 0)) throw new Error('Scale and extent must be positive');
const transport = buildTransport(source, { origin: geography.origin, scale, extent });
transport.sourceSnapshot = path.relative(root, values.input).replaceAll('\\', '/');
transport.sourceSnapshotSha256 = createHash('sha256').update(raw).digest('hex');
await writeFile(values.output, JSON.stringify(transport) + '\n');
console.log(
  `Built ${transport.roads.length} road segments and ${transport.railways.length} railway ways at scale ${scale}`,
);
