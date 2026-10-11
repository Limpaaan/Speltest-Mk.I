import { WEAPONS } from './weapons.js';
export const MATERIALS = {
  stone: { name: 'Sten', price: 3 },
  wood: { name: 'Trä', price: 3 },
  plastic: { name: 'Plast', price: 6 },
  iron: { name: 'Järn', price: 8 },
  glass: { name: 'Glas', price: 6 },
  electronics: { name: 'Elektronik', price: 18 },
  cloth: { name: 'Textil', price: 5 },
  rubber: { name: 'Gummi', price: 7 },
  chemicals: { name: 'Kemikalier', price: 12 },
  copper: { name: 'Koppartråd', price: 12 },
  springs: { name: 'Fjädrar', price: 14 },
  adhesive: { name: 'Lim', price: 9 },
};
export const ATTACHMENTS = {
  flashlight: {
    name: 'Brukslampa',
    slot: 'utility',
    price: 90,
    recipe: { electronics: 2, plastic: 3, glass: 1 },
    description: 'L: tänd/släck en riktad ficklampa.',
  },
  suppressor: {
    name: 'Ljuddämpare',
    slot: 'muzzle',
    price: 140,
    recipe: { iron: 6, rubber: 2 },
    except: ['shotgun'],
    description: 'Kortare upptäcktsavstånd vid skott, −5% skada.',
  },
  bipod: {
    name: 'Stativben',
    slot: 'underbarrel',
    price: 110,
    recipe: { iron: 4, springs: 2 },
    only: ['rifle', 'scout', 'lmg'],
    description: '−55% spridning/rekyl när du siktar hukande och står still.',
  },
  vertical_grip: {
    name: 'Vertikalt grepp',
    slot: 'underbarrel',
    price: 75,
    recipe: { plastic: 3, rubber: 2 },
    except: ['pistol', 'scout'],
    description: '−25% rekyl.',
  },
  angled_grip: {
    name: 'Vinklat grepp',
    slot: 'underbarrel',
    price: 75,
    recipe: { plastic: 3, iron: 1 },
    except: ['pistol'],
    description: '−30% spridning.',
  },
  extended_mag: {
    name: 'Större magasin',
    slot: 'magazine',
    price: 120,
    recipe: { iron: 4, springs: 3, plastic: 2 },
    description: '+50% patroner, +20% omladdningstid.',
  },
  quick_mag: {
    name: 'Snabbmagasin',
    slot: 'magazine',
    price: 100,
    recipe: { plastic: 3, springs: 2, rubber: 1 },
    description: '−30% omladdningstid.',
  },
  light_stock: {
    name: 'Lätt kolv',
    slot: 'stock',
    price: 90,
    recipe: { wood: 4, plastic: 2, adhesive: 2 },
    except: ['pistol'],
    description: '+8% rörelsehastighet, +15% rekyl.',
  },
  stable_stock: {
    name: 'Stabil kolv',
    slot: 'stock',
    price: 100,
    recipe: { wood: 4, rubber: 3, iron: 2 },
    except: ['pistol'],
    description: '−28% rekyl, −6% rörelsehastighet.',
  },
  red_dot: {
    name: 'Rödpunkt 1×',
    slot: 'optic',
    price: 90,
    recipe: { glass: 2, electronics: 2, plastic: 2 },
    zoom: 1.25,
    sight: 'red_dot',
    description: 'Öppet sikte med röd punkt.',
  },
  holographic: {
    name: 'Holografiskt 1,5×',
    slot: 'optic',
    price: 120,
    recipe: { glass: 3, electronics: 3 },
    zoom: 1.5,
    sight: 'holographic',
    description: 'Öppet ring-/punktsikte.',
  },
  scope_2: {
    name: 'Prismasikte 2×',
    slot: 'optic',
    price: 145,
    recipe: { glass: 3, iron: 2, electronics: 1 },
    zoom: 2,
    sight: 'scope',
    description: 'Kikarsikte för medeldistans.',
  },
  scope_4: {
    name: 'Kikarsikte 4×',
    slot: 'optic',
    price: 190,
    recipe: { glass: 4, iron: 3, electronics: 2 },
    except: ['pistol', 'shotgun'],
    zoom: 4,
    sight: 'scope',
    description: 'Korshår och fyra gångers förstoring.',
  },
  scope_6: {
    name: 'Kikarsikte 6×',
    slot: 'optic',
    price: 240,
    recipe: { glass: 6, iron: 3, electronics: 3 },
    only: ['rifle', 'scout', 'lmg'],
    zoom: 6,
    sight: 'scope',
    description: 'Hög förstoring för långa avstånd.',
  },
};
export const SLOTS = {
  muzzle: 'Mynning',
  underbarrel: 'Undergrepp / benstöd',
  magazine: 'Magasin',
  stock: 'Kolv',
  optic: 'Optik',
  utility: 'Lampa',
};
export const compatible = (kind, key) =>
  Boolean(
    typeof kind === 'string' &&
    typeof key === 'string' &&
    Object.hasOwn(ATTACHMENTS, key) &&
    Object.hasOwn(WEAPONS, kind) &&
    (!ATTACHMENTS[key].only || ATTACHMENTS[key].only.includes(kind)) &&
    !ATTACHMENTS[key].except?.includes(kind),
  );
export function validMods(kind, raw = {}) {
  const mods = {};
  for (const [slot, key] of Object.entries(raw || {}))
    if (
      Object.hasOwn(SLOTS, slot) &&
      typeof key === 'string' &&
      Object.hasOwn(ATTACHMENTS, key) &&
      ATTACHMENTS[key].slot === slot &&
      compatible(kind, key)
    )
      mods[slot] = key;
  return mods;
}
export const lootName = (l) =>
  l.weapon
    ? l.weapon.name
    : l.attachment
      ? ATTACHMENTS[l.attachment]?.name
      : `${l.quantity} × ${MATERIALS[l.material]?.name || 'Material'}`;
export const lootColor = (l) =>
  l.weapon
    ? ['#c6cacc', '#91ce84', '#74b6f5', '#ffc866'][l.weapon.rarity]
    : l.attachment
      ? '#9bb9dd'
      : '#bfaa76';
export const attachmentCount = (p) => Object.values(p.attachments || {}).reduce((a, b) => a + b, 0);
export function applyMods(stats, p) {
  const mods = validMods(p.weapon.kind, p.weapon.mods),
    s = { ...stats, move: 1, noise: 80, suppressed: false };
  for (const key of Object.values(mods)) {
    const a = ATTACHMENTS[key];
    if (a.zoom) {
      s.zoom = a.zoom;
      s.sight = a.sight;
    }
    if (key === 'suppressor') {
      s.damage *= 0.95;
      s.noise = 25;
      s.suppressed = true;
    }
    if (key === 'extended_mag') {
      s.mag = Math.ceil(s.mag * 1.5);
      s.reload *= 1.2;
    }
    if (key === 'quick_mag') s.reload *= 0.7;
    if (key === 'vertical_grip') s.recoil *= 0.75;
    if (key === 'angled_grip') s.spread = (s.spread || 0) * 0.7;
    if (key === 'light_stock') {
      s.move *= 1.08;
      s.recoil *= 1.15;
    }
    if (key === 'stable_stock') {
      s.move *= 0.94;
      s.recoil *= 0.72;
    }
    if (key === 'bipod' && p.crouch && p.ads && !p.moving) {
      s.recoil *= 0.45;
      s.spread = (s.spread || 0) * 0.45;
    }
  }
  return s;
}
export const WEAPON_RECIPES = {
  rifle: { iron: 10, wood: 5, springs: 3 },
  shotgun: { iron: 8, wood: 5, springs: 2 },
  scout: { iron: 10, wood: 7, glass: 3 },
  pistol: { iron: 5, plastic: 3, springs: 2 },
  smg: { iron: 8, plastic: 4, springs: 4 },
  lmg: { iron: 16, wood: 5, springs: 6 },
};
export const SUPPLY_RECIPES = {
  medkit: {
    name: 'Fältförband',
    description: 'Återställer 70 hälsa.',
    materials: { cloth: 4, chemicals: 2 },
    price: 35,
  },
  grenade: {
    name: 'Spränghandgranat',
    materials: { iron: 3, chemicals: 3, springs: 1 },
    price: 50,
  },
  electronics: {
    name: 'Återvunnen elektronik',
    materials: { copper: 3, plastic: 2, glass: 1 },
    price: 18,
  },
  filter: {
    name: 'Skyddsfilter',
    description: 'Tillfällig skyddsförstärkning: 30% mindre skada i 25 sekunder.',
    materials: { cloth: 3, chemicals: 2, plastic: 2 },
    price: 45,
  },
  repair: {
    name: 'Verktygssats',
    description: 'Tillfällig skyddsförstärkning: 30% mindre skada i 40 sekunder.',
    materials: { iron: 3, wood: 2, stone: 2 },
    price: 40,
  },
};
export const newMaterials = () => Object.fromEntries(Object.keys(MATERIALS).map((k) => [k, 0]));
export const hasMaterials = (p, recipe) =>
  Object.entries(recipe).every(([k, n]) => (p.materials[k] || 0) >= n);
export const spendMaterials = (p, recipe) => {
  for (const [k, n] of Object.entries(recipe)) p.materials[k] -= n;
};
