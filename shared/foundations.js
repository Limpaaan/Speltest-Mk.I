import { buildingWorld, buildingLocal } from './buildings.js';
import { terrain, terrainHeight } from './terrain.js';
import { architectureSpec } from './architecture.js';
import { industrialSupportFootprints } from './industry.js';

export function insideFootprint(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i],
      [c, d] = points[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) inside = !inside;
  }
  return inside;
}

// Every possible minimum of the piecewise planar terrain occurs at a polygon corner,
// a grid vertex, or where a footprint edge crosses a terrain triangle edge.
export function terrainContacts(points, heightAt = terrainHeight, grid = terrain) {
  const contacts = points.map(([x, z]) => ({ x, z, y: heightAt(x, z) }));
  const minX = Math.min(...points.map((p) => p[0])),
    maxX = Math.max(...points.map((p) => p[0]));
  const minZ = Math.min(...points.map((p) => p[1])),
    maxZ = Math.max(...points.map((p) => p[1]));
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    for (const project of [(p) => p[0], (p) => p[1], (p) => p[0] + p[1]]) {
      const start = project(a),
        end = project(b),
        delta = end - start;
      if (Math.abs(delta) < 1e-9) continue;
      const offset = project([-grid.extent, -grid.extent]);
      for (
        let k = Math.ceil((Math.min(start, end) - offset) / grid.step);
        k <= Math.floor((Math.max(start, end) - offset) / grid.step);
        k++
      ) {
        const t = (offset + k * grid.step - start) / delta;
        const x = a[0] + (b[0] - a[0]) * t,
          z = a[1] + (b[1] - a[1]) * t;
        contacts.push({ x, z, y: heightAt(x, z) });
      }
    }
  }
  for (
    let ix = Math.ceil((minX + grid.extent) / grid.step);
    ix <= Math.floor((maxX + grid.extent) / grid.step);
    ix++
  )
    for (
      let iz = Math.ceil((minZ + grid.extent) / grid.step);
      iz <= Math.floor((maxZ + grid.extent) / grid.step);
      iz++
    ) {
      const x = ix * grid.step - grid.extent,
        z = iz * grid.step - grid.extent;
      if (insideFootprint(x, z, points)) contacts.push({ x, z, y: heightAt(x, z) });
    }
  return contacts;
}

export function supportFootprints(p) {
  const industrial = industrialSupportFootprints(p);
  if (industrial) return industrial;
  const part = (id, x, z, w, d, shape = 'box') => ({
    ...p,
    ...buildingWorld(p, x, z),
    id: `${p.id}-foundation-${id}`,
    w,
    d,
    shape,
  });
  if (p.id === 'verket') {
    const sx = p.w / 38,
      sz = p.d / 24,
      worksPart = (id, x, z, w, d) => part(id, x * sx, z * sz, w * sx, d * sz);
    return [
      worksPart('hall', -6, 4.5, 26.6, 15.4),
      worksPart('rear', 6, -7, 24, 10),
      worksPart('annex-0', 10.1, 5, 6.2, 14),
      worksPart('annex-1', 16.5, 5, 5.8, 14),
    ];
  }
  if (p.type === 'watertower') {
    const diameter = Math.min(p.w, p.d) * 0.84;
    return [part('shaft', 0, 0, diameter, diameter, 'round')];
  }
  const feet = [part('body', 0, 0, p.w, p.d)];
  const a = architectureSpec(p);
  if (p.id === 'avesta-kyrka') feet.push(part('tower', 0, a.towerZ, a.towerW, a.towerW));
  if (p.id === 'krylbo-station')
    feet.push(part('tower', a.towerX, a.towerZ, a.towerR * 2, a.towerR * 2, 'round'));
  return feet;
}

export function foundationPlan(p, base, heightAt = terrainHeight) {
  return supportFootprints(p).map((foot) => {
    const local =
      foot.shape === 'round'
        ? Array.from({ length: 32 }, (_, i) => [
            (Math.sin((i * Math.PI) / 16) * foot.w) / 2,
            (Math.cos((i * Math.PI) / 16) * foot.d) / 2,
          ])
        : [
            [-foot.w / 2, -foot.d / 2],
            [foot.w / 2, -foot.d / 2],
            [foot.w / 2, foot.d / 2],
            [-foot.w / 2, foot.d / 2],
          ];
    const outline =
      foot.outline ||
      local.map(([x, z]) => {
        const q = buildingWorld(foot, x, z);
        return [q.x, q.z];
      });
    const top = base + (p.id === 'aalto' ? -0.12 : 0.1);
    const bottom =
      Math.min(top - 0.25, ...terrainContacts(outline, heightAt).map((c) => c.y)) - 0.25;
    return {
      ...foot,
      parentId: p.id,
      city: p.id.startsWith('osm-building-'),
      top,
      bottom,
      base: bottom,
      h: top - bottom,
      y: (top + bottom) / 2,
      outline,
      localOutline: outline.map(([x, z]) => buildingLocal(foot, x, z)),
      type: 'foundation',
    };
  });
}
