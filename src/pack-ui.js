import { icon, iconLabel } from './icons.js';
import { MATERIALS } from '../shared/items.js';
export function materialCards(root, p) {
  const grid = document.createElement('div');
  grid.className = 'material-grid';
  grid.id = 'pack-materials';
  for (const [key, item] of Object.entries(MATERIALS)) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.dataset.material = key;
    if (!p.materials[key]) card.classList.add('empty');
    const label = iconLabel(key, item.name, 'span'),
      count = document.createElement('strong');
    count.textContent = p.materials[key];
    card.append(label, count);
    grid.append(card);
  }
  root.append(grid);
}
export function wallet(root, p, compact = false) {
  const rows = [
    ['credits', 'Brukskronor', p.credits],
    ['scrap', 'Skrot', p.scrap],
    ['bag', 'Vapen', `${p.inventory.length}/16`],
    ['medkit', 'Förband', p.supplies.medkit],
  ];
  const signature = JSON.stringify(rows);
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.classList.add('wallet');
  root.replaceChildren();
  for (const [key, label, count] of rows) {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    card.dataset.resource = key;
    const body = document.createElement('span'),
      name = document.createElement('small'),
      value = document.createElement('strong');
    name.textContent = label;
    value.textContent = count;
    body.append(name, value);
    card.append(icon(key), body);
    root.append(card);
  }
}
export const NPC_SERVICES = {
  maja: {
    icon: 'quest',
    role: 'Skiftledare',
    summary: 'Uppdrag, vapenverkstad, belöningar och handel',
    place: 'Sambandsboden',
  },
  torsten: {
    icon: 'tools',
    role: 'Rustmästare',
    summary: 'Granater, vapendelar och handel',
    place: 'Verkstaden',
  },
  liv: {
    icon: 'medkit',
    role: 'Fältvårdare',
    summary: 'Full behandling för 10 skrot',
    place: 'Sjukstugan',
  },
  einar: {
    icon: 'intel',
    role: 'Älvspanare',
    summary: 'Markera fiender på kartan i 120 sekunder',
    place: 'Kartbordet',
  },
  anders: {
    icon: 'paint',
    role: 'Konstnär',
    summary: 'Sprayfärg för 25 brukskronor per burk',
    place: 'Fältateljén',
  },
};
export function directory(root, stations, p, guide) {
  const signature = JSON.stringify(
    stations.map((n) => [n.id, Math.round(Math.hypot(n.x - p.x, n.z - p.z))]),
  );
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.replaceChildren();
  for (const station of stations) {
    const service = NPC_SERVICES[station.id],
      card = document.createElement('article');
    card.className = 'station-card';
    card.dataset.station = station.id;
    const title = iconLabel(service.icon, `${station.name} · ${service.role}`, 'h4', station.color),
      text = document.createElement('p'),
      button = document.createElement('button');
    text.textContent = service.summary;
    button.className = 'small-button';
    button.textContent = `${service.place} · ${Math.round(Math.hypot(station.x - p.x, station.z - p.z))} m →`;
    button.onclick = () => guide(station);
    card.append(title, text, button);
    root.append(card);
  }
}
