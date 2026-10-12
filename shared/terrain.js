import terrain from './terrain.json' with { type: 'json' };
export { terrain };
// Remove short DSM roof/tree bumps while preserving the source grid and large hills.
// The same filtered grid is used for geometry, walking and authoritative ray tests.
export const surfaceElevations = smoothSurface(
  terrain.elevationsMetres,
  terrain.width,
  terrain.height,
);
export function smoothSurface(values, width, height, passes = 2) {
  let grid = Float64Array.from(values);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(grid.length);
    for (let z = 0; z < height; z++)
      for (let x = 0; x < width; x++) {
        let sum = 0,
          weight = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            const k = (dx === 0 ? 2 : 1) * (dz === 0 ? 2 : 1);
            sum +=
              grid[
                Math.max(0, Math.min(height - 1, z + dz)) * width +
                  Math.max(0, Math.min(width - 1, x + dx))
              ] * k;
            weight += k;
          }
        next[z * width + x] = sum / weight;
      }
    grid = next;
  }
  return grid;
}
// Same triangle surface as PlaneGeometry: no renderer/server height disagreement.
export function terrainHeight(x, z) {
  const u = Math.max(0, Math.min(terrain.width - 1.000001, (x + terrain.extent) / terrain.step));
  const v = Math.max(0, Math.min(terrain.height - 1.000001, (z + terrain.extent) / terrain.step));
  const col = Math.floor(u),
    row = Math.floor(v),
    fx = u - col,
    fz = v - row;
  const at = (dx, dz) => surfaceElevations[(row + dz) * terrain.width + col + dx];
  const height =
    fx + fz <= 1
      ? at(0, 0) + (at(1, 0) - at(0, 0)) * fx + (at(0, 1) - at(0, 0)) * fz
      : at(1, 1) + (at(0, 1) - at(1, 1)) * (1 - fx) + (at(1, 0) - at(1, 1)) * (1 - fz);
  return (height - terrain.baseAltitudeMetres) * terrain.verticalScale;
}
