import data from './forest.json' with { type: 'json' };
import { spatialIndex } from './buildings.js';
import { insideFootprint } from './foundations.js';
export const FOREST = data;
const index = spatialIndex(data.polygons, (p) => p.bounds, 160);
export const forestAt = (x, z) =>
  index.point(x, z).find((p) => insideFootprint(x, z, p.points)) || null;
