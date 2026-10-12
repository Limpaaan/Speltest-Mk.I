// Original SVG silhouettes. Text labels always accompany icons; colour is supplementary.
export const ICON_PATHS = {
  credits: 'M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26M12 9v14m7-14-7 7 8 7',
  scrap: 'm3 21 8-16 11 2 7 12-8 9-18-7m8-16 4 14 14-2m-14 2 6 9',
  bag: 'M9 9V5h14v4M6 9h20v20H6ZM11 16h10v7H11m-5-11h20',
  quest: 'M7 3h13l5 5v21H7ZM19 3v7h6M11 15h10m-10 5h7m-7 5h5',
  intel: 'M4 15h8v11H4ZM20 15h8v11h-8M12 18h8M7 15V7h5v8m13 0V7h-5v8',
  tools: 'm7 4 4 4-4 4-4-4a8 8 0 0 0 10 9l11 12 5-5-12-11A8 8 0 0 0 7 4',
  medkit: 'M4 10h24v19H4ZM10 10V5h12v5m-6 5v10m-5-5h10',
  filter: 'M9 4h14l4 7-5 17H10L5 11ZM5 11h22M12 16h8m-8 5h8',
  repair: 'M5 7h22v20H5ZM5 13h22m-12-6v6m-4 8 4-4 6 6m-6-6 4-3',
  grenade: 'M13 3h8v5h-8M17 8c-14 0-14 21 0 21s14-21 0-21M21 4h5v7m-18 4h18M8 23h18M13 9v19',
  armor: 'M16 3 5 8v10c0 6 11 11 11 11s11-5 11-11V8ZM16 3v26',
  paint: 'M11 3h10v5H11ZM8 8h16v21H8ZM12 17h8m-4-5v11',
  stone: 'm3 22 4-15 14-3 9 17-12 8-15-7m4-15 8 11 15 3m-15-3 3 11',
  wood: 'M6 4h20v24H6ZM12 4c9 9-7 16 3 24M21 4c-9 9 7 16-3 24',
  plastic: 'M12 3h8v6l5 6v14H7V15l5-6ZM7 18h18m-18 5h18',
  iron: 'm4 11 8-7h14v17l-8 7H4ZM4 11h14v17m0-17 8-7',
  glass: 'm7 3 19 3-4 23-9 1L7 3M11 8l9 13m-5-13 6 8',
  electronics:
    'M8 8h16v16H8ZM12 12h8v8h-8M4 11h4m-4 6h4m-4 6h4m16-12h4m-4 6h4m-4 6h4M11 4v4m6-4v4m6-4v4m-12 16v4m6-4v4m6-4v4',
  cloth: 'm5 4 9 3 11-3 3 24-11-3-13 3 1-24m9 3 3 18M6 12l19 1',
  rubber:
    'M16 3c-17 0-17 26 0 26s17-26 0-26m0 6c-8 0-8 14 0 14s8-14 0-14M5 8l4 4m14 8 4 4M8 26l4-5m8-10 4-6',
  chemicals: 'M12 3h8m-6 0v9L4 26q-1 3 3 3h18q4 0 3-3L18 12V3M9 19h14m-11 5h2m6 1h2',
  copper:
    'M16 5c-18 0-18 22 0 22s18-22 0-22m0 5c-10 0-10 12 0 12s10-12 0-12m0 5c-3 0-3 2 0 2s3-2 0-2m13 1 1 12',
  springs: 'm8 3 16 4L8 11l16 4-16 4 16 4-16 4m0-24h8m-8 24 8 2',
  adhesive: 'M12 8V4h8v4m-10 0h12l3 7v14H7V15ZM10 19h12m-12 5h12',
  rifle: 'M3 13h21v5H10l-4 7H2l3-7m19-4h6m-17 4 2 9h5l-1-9m2-9h5',
  shotgun: 'M2 12h28v3H10l-5 9H2l4-9m6-3v7h9v-7m-6 0v7m3-7v7',
  scout: 'M2 16h28m-26 0v9h4l4-8h11v-4H11l-7 3m8-10h11v4H12m4 0v3',
  pistol: 'M4 5h24v7H17l-4 15H5l4-15H4Zm13 7 7 0v7h-9',
  smg: 'M3 10h27v5H14l-3 11H6l3-11H3Zm15 5v14h5V15m-2-9v4',
  lmg: 'M3 10h27v6H13l-7 8H2l5-8m7 0v12h10V16m1 0 4 12m-4-12-4 12M12 7h10v3',
  flashlight: 'M4 11h15l8-5v20l-8-5H4Zm15 0v10m10-9 2-1m-2 10 2 1',
  suppressor: 'M3 11h25v10H3Zm5 0v10m5-10v10m5-10v10m5-10v10m5-5h3',
  bipod: 'M13 3h6v8h-6Zm3 8L3 29m13-18 13 18M2 29h5m18 0h5',
  vertical_grip: 'M7 3h18v5H7Zm5 5h8v21h-8m0-7h8m-8-5h8m-8-5h8',
  angled_grip: 'M4 4h24v5H4Zm3 5 7 20h7L16 9m-7 7h9m-7 6h9',
  extended_mag: 'M8 3h15v8l4 18H12L8 11Zm5 4 4 19m2-19 4 19',
  quick_mag: 'M8 3h14v22H8Zm-3 22h20v5H5ZM12 7h6m-6 5h6m-6 5h6',
  light_stock: 'M4 7h10l14 6v14l-14-9H4Zm10 0v11m14-5-14 5',
  stable_stock: 'M3 7h8l18 2v20H18l-7-13H3ZM25 9v20M18 13h3',
  red_dot: 'M7 7h18v18H7ZM16 11v10m-5-5h10m-11 9v4h12v-4',
  holographic: 'M4 5h24v20H4ZM16 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10m-6 15v4h12v-4',
  scope_2: 'M3 11h26v10H3ZM10 11v10m12-10v10m-8 10v7h7v-7m-6-14h5',
  scope_4: 'M2 9h6v14H2ZM8 12h16v8H8Zm16-3h6v14h-6M13 20v8h6v-8m-2-9V6',
  scope_6: 'M2 6h8v20H2Zm8 8h12v5H10m12-12h8v18h-8M14 19v9h6v-9M14 7h6v7',
  icecream: 'M7 14 16 30l9-16ZM8 14a5 5 0 0 1 0-10 5 5 0 0 1 8 0 5 5 0 0 1 8 0 5 5 0 0 1 0 10',
  skull: 'M7 21a13 13 0 1 1 18 0v9H7Zm4 1v7m5-7v7m5-7v7M10 11h3v4h-3m9-4h3v4h-3m-6 6 3-4 3 4',
};
export function icon(key, color) {
  const n = document.createElement('span');
  n.className = 'item-icon';
  n.dataset.icon = key;
  n.setAttribute('aria-hidden', 'true');
  if (color) n.style.color = color;
  n.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[key] || ICON_PATHS.bag}"/></svg>`;
  return n;
}
export function iconLabel(key, text, tag = 'span', color) {
  const n = document.createElement(tag);
  n.append(icon(key, color), document.createTextNode(text));
  return n;
}
