import terrain from './terrain.json' with { type: 'json' };
export { terrain };
// Same triangle surface as PlaneGeometry: no renderer/server height disagreement.
export function terrainHeight(x, z) {
  const u = Math.max(0, Math.min(terrain.width - 1.000001, (x + terrain.extent) / terrain.step));
  const v = Math.max(0, Math.min(terrain.height - 1.000001, (z + terrain.extent) / terrain.step));
  const col = Math.floor(u),
    row = Math.floor(v),
    fx = u - col,
    fz = v - row;
  const at = (dx, dz) => terrain.elevationsMetres[(row + dz) * terrain.width + col + dx];
  const height =
    fx + fz <= 1
      ? at(0, 0) + (at(1, 0) - at(0, 0)) * fx + (at(0, 1) - at(0, 0)) * fz
      : at(1, 1) + (at(0, 1) - at(1, 1)) * (1 - fx) + (at(1, 0) - at(1, 1)) * (1 - fz);
  return (height - terrain.baseAltitudeMetres) * terrain.verticalScale;
}
