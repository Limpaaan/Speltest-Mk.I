import { readFile, writeFile } from 'node:fs/promises';
// Retain the same geographic crop and original elevations when changing world units.
const geography = JSON.parse(await readFile('shared/geography.json', 'utf8'));
const terrain = JSON.parse(await readFile('shared/terrain.json', 'utf8'));
if (JSON.stringify(terrain.origin) !== JSON.stringify(geography.origin))
  throw new Error('Terrain and geography must share their origin');
terrain.extent = 2400 * geography.scale;
terrain.step = (terrain.extent * 2) / (terrain.width - 1);
terrain.horizontalScale = geography.scale;
terrain.verticalScale = geography.scale;
terrain.worldUnits = 'metres at scale 1; original altitude samples retained';
await writeFile('shared/terrain.json', JSON.stringify(terrain) + '\n');
console.log(`Terrain: ${terrain.extent * 2} m across, ${terrain.step} m grid`);
