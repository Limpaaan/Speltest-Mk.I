import transport from './transport.json' with { type: 'json' };
import { terrainHeight } from './terrain.js';
export { transport as TRANSPORT };

function project(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    lengthSquared = dx * dx + dz * dz,
    t = lengthSquared
      ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSquared))
      : 0;
  return { t, distance: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) };
}

// Source coordinates and gauge are measured; deck elevation is an interpretation
// of the terrain at the two abutments because OSM does not supply survey heights.
export function railwayBridgeProfile(track, heightAt = terrainHeight) {
  const lengths = [0];
  for (let i = 1; i < track.points.length; i++)
    lengths.push(
      lengths.at(-1) +
        Math.hypot(
          track.points[i][0] - track.points[i - 1][0],
          track.points[i][1] - track.points[i - 1][1],
        ),
    );
  const start = heightAt(...track.points[0]) + 0.185,
    end = heightAt(...track.points.at(-1)) + 0.185,
    length = lengths.at(-1);
  return {
    lengths,
    length,
    at: (distance) => start + (end - start) * Math.max(0, Math.min(1, distance / (length || 1))),
  };
}

const segments = [],
  cells = new Map();
for (const track of transport.railways) {
  const profile = track.bridge ? railwayBridgeProfile(track) : null;
  for (let i = 1; i < track.points.length; i++) {
    const a = track.points[i - 1],
      b = track.points[i],
      segment = {
        track,
        a,
        b,
        profile,
        start: profile?.lengths[i - 1] || 0,
        length: Math.hypot(b[0] - a[0], b[1] - a[1]),
      };
    segments.push(segment);
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - 5) / 80);
      x <= Math.floor((Math.max(a[0], b[0]) + 5) / 80);
      x++
    )
      for (
        let z = Math.floor((Math.min(a[1], b[1]) - 5) / 80);
        z <= Math.floor((Math.max(a[1], b[1]) + 5) / 80);
        z++
      ) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(segment);
      }
  }
}
export function railwayNear(x, z, range = 0) {
  if (!range) return cells.get(`${Math.floor(x / 80)},${Math.floor(z / 80)}`) || [];
  const found = new Set();
  for (let cx = Math.floor((x - range) / 80); cx <= Math.floor((x + range) / 80); cx++)
    for (let cz = Math.floor((z - range) / 80); cz <= Math.floor((z + range) / 80); cz++)
      for (const segment of cells.get(`${cx},${cz}`) || []) found.add(segment);
  return [...found];
}

export function railwayExclusion(x, z, margin = 0) {
  return railwayNear(x, z, margin).some((s) => project(x, z, s.a, s.b).distance <= 2.1 + margin);
}

// Only continuous bridge decks affect walking. Rails and individual sleepers do
// not become collision steps, avoiding the repeated bumps while sprinting.
export function railwayDeckHeight(x, z) {
  let height = null;
  for (const s of railwayNear(x, z)) {
    if (!s.profile) continue;
    const p = project(x, z, s.a, s.b);
    if (p.distance <= 1.7) {
      const y = s.profile.at(s.start + p.t * s.length);
      height = height === null ? y : Math.max(height, y);
    }
  }
  return height;
}
