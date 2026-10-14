import { MAP, canStand, inSanctuary } from './map.js';
import { buildingWorld } from './buildings.js';
const zone = (id, name, landmark, dx, dz, radius, count) => {
  const p = MAP.places.find((p) => p.id === landmark);
  const q = buildingWorld(
    p,
    Math.sign(dx) * (p.w / 2 + Math.abs(dx)),
    Math.sign(dz) * (p.d / 2 + Math.abs(dz)),
  );
  return { id, name, landmark, ...q, radius, count };
};
export const ENCOUNTER_ZONES = [
  zone('verket-yard', 'Verkets bevakade gård', 'verket', 34, 30, 45, 8),
  zone('koppar-depot', 'Koppardalens förråd', 'koppar', 30, 22, 38, 6),
  zone('asbo-checkpoint', 'Åsbo vägspärr', 'horse', 28, 28, 45, 8),
  zone('skogsbo-post', 'Skogsbos radiopost', 'skogsbo', 34, 25, 38, 6),
  zone('south-rail', 'Södra järnvägsposteringen', 'krylbo-station', -35, -30, 40, 6),
];
export function encounterSpawns(zone) {
  const positions = [];
  for (let radius = 7; radius <= zone.radius && positions.length < zone.count; radius += 7)
    for (let i = 0; i < 16 && positions.length < zone.count; i++) {
      const a = (i * Math.PI) / 8,
        x = zone.x + Math.cos(a) * radius,
        z = zone.z + Math.sin(a) * radius;
      if (
        canStand(x, z) &&
        !inSanctuary({ x, z }) &&
        positions.every((p) => Math.hypot(p.x - x, p.z - z) > 5)
      )
        positions.push({ x, z });
    }
  return positions;
}
