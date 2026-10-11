import { MAP, walkableNear, canStand, clearShot } from './map.js';
// Street vertex from OSM way/56226492. This is NOT a verified house-number position.
const temporary = { lat: 60.1426193, lon: 16.1567755 };
export const ARTIST_LOCATION = {
  address: 'Axel Johnsons väg 117B, Avesta',
  verified: false,
  source: 'OSM way/56226492 (street only)',
  ...temporary,
};
const x = (temporary.lon - 16.178) * 111320 * Math.cos((60.148 * Math.PI) / 180) * MAP.scale;
const z = -(temporary.lat - 60.148) * 111320 * MAP.scale;
export const ARTIST = {
  id: 'anders',
  name: 'Anders Delbom – konstnär',
  ...walkableNear(x + 4, z),
  service: 'paint',
  text: 'Glass eller döskalle? Jag ritar båda. En burk kostar 25 brukskronor och räcker till ett motiv. Min tillfälliga ateljé ligger på Axel Johnsons väg.',
  label: 'VÄLJ FÄRG',
  classId: 'bruksingenjor',
};
export const PROPERTY = {
  address: 'Odlargränd 16, Avesta',
  url: 'https://www.booli.se/sok?query=Odlargr%C3%A4nd%2016%20Avesta',
  estimate: null,
  checkedAt: null,
};
export const PAINTS = {
  red: { name: 'Faluröd', color: '#d94b38' },
  blue: { name: 'Dalablå', color: '#478fdb' },
  yellow: { name: 'Kurbitsgul', color: '#e5c149' },
  green: { name: 'Skogsgrön', color: '#4a9967' },
  white: { name: 'Kritvit', color: '#eee9db' },
  black: { name: 'Kolsvart', color: '#222526' },
};
export const PAINT_PRICE = 25;
export const MOTIFS = { icecream: 'Glass', skull: 'Döskalle' };
export const atArtist = (p) => Math.hypot(p.x - ARTIST.x, p.z - ARTIST.z) <= 5;
export const newArt = () => ({
  paint: Object.fromEntries(Object.keys(PAINTS).map((k) => [k, 0])),
  paintings: [],
  paintColor: 'red',
  paintMotif: 'skull',
  paintCooldown: 0,
});
export function artistAction(w, p, a, notice) {
  if (!['buy_paint', 'select_paint', 'spray'].includes(a.type)) return false;
  if (a.type === 'buy_paint') {
    if (!atArtist(p)) {
      notice(w, p, 'Besök Anders Delbom för att köpa sprayfärg.');
      return true;
    }
    if (!Object.hasOwn(PAINTS, a.color)) return true;
    if (p.credits < PAINT_PRICE || p.paint[a.color] >= 10) {
      notice(w, p, 'Du behöver 25 brukskronor och plats för färgen (högst 10 per färg).');
      return true;
    }
    p.credits -= PAINT_PRICE;
    p.paint[a.color]++;
    notice(
      w,
      p,
      `Anders: ${PAINTS[a.color].name}! Välj färg och motiv i packningen, spraya på marken med B.`,
    );
    return true;
  }
  if (a.type === 'select_paint') {
    if (Object.hasOwn(PAINTS, a.color)) p.paintColor = a.color;
    if (Object.hasOwn(MOTIFS, a.motif)) p.paintMotif = a.motif;
    return true;
  }
  if (p.paintCooldown > 0) return true;
  if (p.paint[p.paintColor] <= 0) {
    notice(w, p, 'Färgen är slut. Köp sprayburkar hos Anders.');
    return true;
  }
  const x = p.x + Math.sin(p.aim) * 1.8,
    z = p.z + Math.cos(p.aim) * 1.8;
  if (!canStand(x, z) || !clearShot(p, { x, z })) {
    notice(w, p, 'Sikta mot fri mark framför dig.');
    return true;
  }
  p.paint[p.paintColor]--;
  p.paintCooldown = 1;
  p.paintings.push({
    id: `paint${w.nextId++}`,
    x,
    z,
    color: p.paintColor,
    motif: p.paintMotif,
    yaw: p.aim,
  });
  if (p.paintings.length > 24) p.paintings.shift();
  notice(w, p, `${MOTIFS[p.paintMotif]} i ${PAINTS[p.paintColor].name.toLowerCase()}.`);
  return true;
}
export function restoreArt(w, p, save) {
  Object.assign(p, newArt());
  for (const key of Object.keys(PAINTS))
    if (Number.isInteger(save.paint?.[key]))
      p.paint[key] = Math.max(0, Math.min(10, save.paint[key]));
  if (typeof save.paintColor === 'string' && Object.hasOwn(PAINTS, save.paintColor))
    p.paintColor = save.paintColor;
  if (typeof save.paintMotif === 'string' && Object.hasOwn(MOTIFS, save.paintMotif))
    p.paintMotif = save.paintMotif;
  if (Array.isArray(save.paintings))
    p.paintings = save.paintings
      .filter(
        (o) =>
          o &&
          Number.isFinite(o.x) &&
          Number.isFinite(o.z) &&
          canStand(o.x, o.z) &&
          typeof o.color === 'string' &&
          Object.hasOwn(PAINTS, o.color) &&
          typeof o.motif === 'string' &&
          Object.hasOwn(MOTIFS, o.motif),
      )
      .slice(-24)
      .map((o) => ({
        id: `paint${w.nextId++}`,
        x: o.x,
        z: o.z,
        color: o.color,
        motif: o.motif,
        yaw: Number.isFinite(o.yaw) ? o.yaw % (Math.PI * 2) : 0,
      }));
}
