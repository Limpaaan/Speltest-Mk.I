// Interpreted from the user's annotated overview (2048 × 1011 display coordinates).
// Two existing OSM anchors (Verket and Dalahästen) register this local plan.
// These are approximate centres and original schematic models, NOT surveyed footprints.
const pin = (x, z) => ({
  x: 4 * (-86.94 + (x - 494) * (397.05 / 1199)),
  z: 4 * (-25.44 + (z - 467) * (100.81 / 287)),
});
const place = (id, name, px, pz, w, d, h, type, district) => ({
  id,
  name,
  ...pin(px, pz),
  w: w * 4,
  d: d * 4,
  h,
  type,
  district,
  verified: false,
  architecture: 'user-map-approximation',
  source: 'User annotated Avesta overview, 2026-10-09',
});
export const DISTRICTS = [
  {
    id: 'koppardalen',
    name: 'Koppardalen',
    ...pin(800, 555),
    radius: 640,
    description: 'Slaggsten, tegel, verkstäder och kraftstationer längs älven.',
  },
  {
    id: 'gamla-byn',
    name: 'Gamla Byn',
    ...pin(270, 438),
    radius: 180,
    description: 'Röda timmerhus, smala gränder och trädgårdar vid kyrkan.',
  },
  {
    id: 'holmen',
    name: 'Holmen',
    ...pin(105, 457),
    radius: 140,
    description: 'Grön strandmiljö med stigar och utsikt mot Gamla Byn.',
  },
  {
    id: 'asbo-handel',
    name: 'Åsbo handelsområde',
    ...pin(1715, 295),
    radius: 352,
    description: 'Dalahästen, stora butikshallar, parkeringar och snabbmat.',
  },
];
export const DISTRICT_BUILDINGS = [
  place('avesta-kyrka', 'Avesta kyrka', 365, 449, 8, 13, 13, 'church', 'koppardalen'),
  place('storfors', 'Storfors kraftstation', 469, 370, 13, 8, 9, 'powerstation', 'koppardalen'),
  place('lillfors', 'Lillfors kraftstation', 1210, 566, 19, 9, 8, 'powerstation', 'koppardalen'),
  place(
    'koppar-restaurang',
    'Restaurang Koppardalen',
    570,
    450,
    13,
    7,
    5,
    'industrial',
    'koppardalen',
  ),
  place(
    'jernverk-forskning',
    'Avesta Jernverk · forskningsenhet',
    660,
    520,
    23,
    10,
    8,
    'industrial',
    'koppardalen',
  ),
  place('valsverket', 'Valsverket', 785, 569, 25, 12, 7, 'industrial', 'koppardalen'),
  place(
    'koppar-verkstad',
    'Verkstad · Koppardalen',
    1015,
    620,
    27,
    12,
    6,
    'industrial',
    'koppardalen',
  ),
  // User clarification: the smaller left hall is Rusta; Willys occupies the right hall.
  {
    ...place('rusta', 'Rusta', 1543, 201, 8, 13, 5.5, 'retail', 'asbo-handel'),
    x: pin(1543, 201).x - 38,
    gabled: true,
  },
  {
    ...place('willys', 'Willys', 1543, 201, 19, 15, 6, 'retail', 'asbo-handel'),
    x: pin(1543, 201).x + 16,
    gabled: true,
  },
  place('oob', 'ÖoB', 1498, 263, 17, 19, 6, 'retail', 'asbo-handel'),
  place('biltema', 'Biltema', 1807, 330, 27, 17, 7, 'retail', 'asbo-handel'),
  place('jula', 'Jula', 1820, 392, 25, 13, 6, 'retail', 'asbo-handel'),
  place('asbo-snabbmat', 'Snabbmat · Åsbo', 1664, 147, 9, 7, 4, 'diner', 'asbo-handel'),
  ...[
    [248, 381],
    [287, 393],
    [254, 421],
    [285, 439],
    [273, 469],
    [301, 492],
    [245, 518],
    [305, 540],
  ].map(([x, z], i) =>
    place(`gamla-hus-${i}`, '', x, z, 5 + (i % 2), 4.5, 3.3, 'historic', 'gamla-byn'),
  ),
];

// Local connecting routes traced approximately from the same annotated overview.
// Existing OSM through-roads retain priority; these fill missing internal access streets.
const route = (id, name, points, width = 3.1, surface = 'asphalt') =>
  points.slice(1).map((p, i) => ({
    id: `district-${id}`,
    name,
    width,
    surface,
    bridge: false,
    approximate: true,
    points: [Object.values(pin(...points[i])), Object.values(pin(...p))],
  }));
export const DISTRICT_ROADS = [
  ...route(
    'koppar',
    'Koppardalen · lokal tillfart',
    [
      [365, 586],
      [530, 611],
      [785, 656],
      [1052, 702],
      [1274, 750],
    ],
    3.5,
  ),
  ...route(
    'verket',
    'Verket · gårdsväg',
    [
      [530, 611],
      [506, 550],
      [512, 508],
    ],
    2.5,
    'gravel',
  ),
  ...route(
    'holmen',
    'Holmen · strandstig',
    [
      [242, 560],
      [175, 518],
      [94, 478],
      [53, 455],
      [107, 426],
      [170, 439],
    ],
    1.8,
    'gravel',
  ),
  ...route(
    'handel',
    'Åsbo · butikstillfart',
    [
      [1640, 267],
      [1565, 242],
      [1555, 303],
      [1643, 329],
    ],
    3.1,
  ),
];
