// A fictional resistance courtyard beside Aalto, expressed relative to the spawn.
export function hubLayout(spawn) {
  const at = (x, z) => ({ x: spawn.x + x, z: spawn.z + z });
  return {
    name: 'Skiftgården',
    center: at(20, 13),
    w: 52,
    d: 46,
    stations: [
      {
        id: 'maja',
        name: 'Maja',
        title: 'Samband & uppdrag',
        icon: 'quest',
        color: '#d9b66b',
        ...at(4, -2),
      },
      {
        id: 'torsten',
        name: 'Torsten',
        title: 'Rustmästarens verkstad',
        icon: 'tools',
        color: '#bca57e',
        ...at(24, 4),
      },
      {
        id: 'liv',
        name: 'Liv',
        title: 'Skyddad sjukstuga',
        icon: 'medkit',
        color: '#b8d3c2',
        ...at(3, 25),
      },
      {
        id: 'einar',
        name: 'Einar',
        title: 'Spaning & kartbord',
        icon: 'intel',
        color: '#92b69f',
        ...at(24, 26),
      },
      {
        id: 'anders',
        name: 'Anders',
        title: 'Fältateljé & färgförråd',
        icon: 'paint',
        color: '#b7a5c7',
        ...at(35, 16),
      },
    ],
    guards: [
      { id: 'north', ...at(44, -6), aim: -Math.PI / 2 },
      { id: 'south', ...at(44, 31), aim: -Math.PI / 2 },
    ],
    inSafeArea(x, z) {
      return Math.abs(x - this.center.x) < this.w / 2 && Math.abs(z - this.center.z) < this.d / 2;
    },
  };
}
