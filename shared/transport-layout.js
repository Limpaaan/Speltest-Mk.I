// Source geometry stays in the same east/south metre projection as the terrain.
export function transportPoint(lat, lon, origin, scale = 1) {
  return [
    (lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180) * scale,
    (origin.lat - lat) * 111320 * scale,
  ];
}

export function clipTransportSegment(a, b, extent) {
  let low = 0,
    high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {
      if (Math.abs(a[axis]) > extent) return null;
      continue;
    }
    const first = (-extent - a[axis]) / delta,
      last = (extent - a[axis]) / delta;
    low = Math.max(low, Math.min(first, last));
    high = Math.min(high, Math.max(first, last));
    if (low >= high) return null;
  }
  const at = (t) => a.map((v, axis) => v + (b[axis] - v) * t);
  return [at(low), at(high)];
}

export function transportRoadWidth(tags) {
  const width = Number.parseFloat(tags.width);
  if (Number.isFinite(width) && width >= 1 && width <= 30) return width;
  const lanes = Number.parseInt(tags.lanes, 10);
  if (Number.isFinite(lanes) && lanes >= 1 && lanes <= 8) return lanes * 3.1;
  const kind = tags.highway?.replace(/_link$/, '');
  return (
    {
      motorway: 8,
      trunk: 7.2,
      primary: 7,
      secondary: 6.8,
      tertiary: 6.4,
      unclassified: 5.8,
      residential: 5.6,
      living_street: 4.4,
      service: tags.service === 'parking_aisle' ? 4 : 4.8,
      cycleway: 2.8,
      track: 3.2,
    }[kind] || 4.8
  );
}

// A way entering and leaving the map can produce separate fragments. Do not join
// the two clipped ends across the excluded area or connect different OSM ways.
function clipPolyline(points, extent) {
  const fragments = [];
  let current = null;
  for (let i = 1; i < points.length; i++) {
    const segment = clipTransportSegment(points[i - 1], points[i], extent);
    if (!segment) {
      current = null;
      continue;
    }
    const [a, b] = segment,
      tail = current?.at(-1);
    if (!tail || Math.hypot(tail[0] - a[0], tail[1] - a[1]) > 0.001) {
      current = [a];
      fragments.push(current);
    }
    current.push(b);
  }
  return fragments;
}

export function buildTransport(source, { origin, scale = 1, extent = 2280 }) {
  const roads = [],
    railways = [];
  for (const way of source.elements) {
    if (way.type !== 'way' || !way.geometry?.length) continue;
    const tags = way.tags || {},
      sourceId = `way/${way.id}`,
      bridge = Boolean(tags.bridge && tags.bridge !== 'no'),
      tunnel = Boolean(tags.tunnel && tags.tunnel !== 'no'),
      points = way.geometry.map((p) => transportPoint(p.lat, p.lon, origin, scale));
    const fragments = clipPolyline(points, extent);
    if (tags.highway && !tunnel) {
      let segmentIndex = 0;
      for (const fragment of fragments)
        for (let i = 1; i < fragment.length; i++) {
          const [a, b] = [fragment[i - 1], fragment[i]];
          if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) continue;
          roads.push({
            id: sourceId,
            sourceId,
            segmentId: `${sourceId}/${segmentIndex++}`,
            name: tags.name || '',
            highway: tags.highway,
            service: tags.service || null,
            access: tags.access || null,
            bridge,
            layer: Number(tags.layer) || 0,
            width: transportRoadWidth(tags),
            widthSource: tags.width
              ? 'osm-width'
              : tags.lanes
                ? 'osm-lanes'
                : 'road-class-estimate',
            surface: /gravel|unpaved|dirt|ground|compacted/.test(tags.surface || '')
              ? 'gravel'
              : 'asphalt',
            points: [a, b],
          });
        }
    }
    // Abandoned lines are often today's cycle paths. Retain them as roads when
    // tagged accordingly; do not invent rails over the former track alignment.
    if (!['rail', 'disused', 'construction'].includes(tags.railway) || tunnel) continue;
    for (let i = 0; i < fragments.length; i++) {
      const gauge = Number.parseFloat(tags.gauge?.split(';')[0]) / 1000;
      railways.push({
        id: `${sourceId}${i ? `/fragment-${i}` : ''}`,
        sourceId,
        name: tags.name || '',
        status: tags.railway,
        usage: tags.usage || null,
        service: tags.service || null,
        bridge,
        layer: Number(tags.layer) || 0,
        gauge: Number.isFinite(gauge) && gauge > 0.5 && gauge < 2.5 ? gauge : 1.435,
        gaugeSource: tags.gauge ? 'osm-gauge' : 'standard-gauge-estimate',
        electrified: tags.electrified === 'contact_line',
        points: fragments[i],
      });
    }
  }
  return {
    source: source.source,
    license: source.license,
    attributionUrl: source.attributionUrl,
    retrievedAt: source.retrievedAt,
    osmTimestamp: source.osmTimestamp,
    bbox: source.bbox,
    origin,
    scale,
    extent,
    roads,
    railways,
  };
}

export function trackLength(track) {
  let length = 0;
  for (let i = 1; i < track.points.length; i++)
    length += Math.hypot(
      track.points[i][0] - track.points[i - 1][0],
      track.points[i][1] - track.points[i - 1][1],
    );
  return length;
}

// Arc-length sampling carries its spacing across bends instead of restarting at
// every source node. Sleepers remain evenly spaced through curves and switches.
export function trackSamples(track, spacing, includeEnd = false) {
  if (!(spacing > 0)) throw new Error('Track sampling spacing must be positive');
  const result = [];
  let travelled = 0,
    next = 0;
  for (let i = 1; i < track.points.length; i++) {
    const a = track.points[i - 1],
      b = track.points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    if (!length) continue;
    while (next < travelled + length - 1e-8) {
      const t = (next - travelled) / length;
      result.push({ x: a[0] + dx * t, z: a[1] + dz * t, yaw: Math.atan2(dx, dz), distance: next });
      next += spacing;
    }
    travelled += length;
  }
  if (includeEnd && track.points.length > 1) {
    const a = track.points.at(-2),
      b = track.points.at(-1);
    result.push({
      x: b[0],
      z: b[1],
      yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
      distance: travelled,
    });
  }
  return result;
}
