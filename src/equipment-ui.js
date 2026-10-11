import { paintPanel } from './artist-ui.js';
import {
  MATERIALS,
  ATTACHMENTS,
  SUPPLY_RECIPES,
  SLOTS,
  compatible,
  hasMaterials,
} from '../shared/items.js';
import { talentTree, skillFailure, SPECIALTIES, armorLimit } from '../shared/talents.js';
import { atTrader, recipeText } from '../shared/economy.js';
import { WEAPONS } from '../shared/weapons.js';
const node = (tag, text) => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
function button(text, disabled, click) {
  const b = node('button', text);
  b.className = 'small-button';
  b.disabled = disabled;
  b.onclick = click;
  return b;
}
export function equipmentPanel(root, p, action) {
  root.replaceChildren();
  root.append(
    node('h3', 'Material & förbrukningsvaror'),
    node(
      'p',
      Object.entries(MATERIALS)
        .map(([k, m]) => `${m.name}: ${p.materials[k]}`)
        .join(' · '),
    ),
  );
  for (const [key, n] of Object.entries(p.supplies))
    root.append(
      button(`${SUPPLY_RECIPES[key].name} ×${n} · ANVÄND`, !n, () =>
        action({ type: 'use_supply', key }),
      ),
    );
  paintPanel(root, p, action);
  root.append(
    node('h3', `Vapendelar · ${p.weapon.name}`),
    node('p', 'Montera på utrustat vapen. Högst en del per plats. L tänder brukslampan.'),
  );
  for (const [slot, key] of Object.entries(p.weapon.mods || {}))
    root.append(
      button(`${SLOTS[slot]}: ${ATTACHMENTS[key].name} · DEMONTERA`, p.reload > 0, () =>
        action({ type: 'detach', id: p.weapon.id, slot }),
      ),
    );
  for (const [key, count] of Object.entries(p.attachments).filter(([, n]) => n > 0)) {
    const a = ATTACHMENTS[key],
      row = node('div', '');
    row.className = 'equipment-row';
    row.append(
      node('p', `${a.name} ×${count} · ${a.description}`),
      button(
        compatible(p.weapon.kind, key) ? 'MONTERA' : 'PASSAR INTE',
        p.reload > 0 || !compatible(p.weapon.kind, key),
        () => action({ type: 'mount', key, id: p.weapon.id }),
      ),
    );
    root.append(row);
  }
  root.append(
    node('h3', 'Talangträd'),
    node(
      'p',
      `Specialvapen: ${SPECIALTIES[p.classId].map((k) => WEAPONS[k].name).join(', ')} (10% snabbare omladdning). Rustningsgräns: ${armorLimit(p)}. Välj stöd ELLER anfall; grenen låses. Z använder den upplåsta specialförmågan.`,
    ),
  );
  for (const t of talentTree(p.classId)) {
    const error = skillFailure(p, t.id),
      row = node('div', '');
    row.className = 'equipment-row';
    row.append(
      node(
        'p',
        `${t.name} · ${t.text} Nivå ${t.level}, ${t.cost} poäng.${t.parent ? ` Kräver ${talentTree(p.classId).find((n) => n.id === t.parent).name}.` : ''}`,
      ),
      button(p.skills.includes(t.id) ? 'UPPLÅST' : error || 'LÅS UPP', Boolean(error), () =>
        action({ type: 'learn', id: t.id }),
      ),
    );
    root.append(row);
  }
}
export function marketPanel(root, p, action) {
  const signature = JSON.stringify([
    p.credits,
    p.materials,
    p.attachments,
    p.supplies,
    p.grenades,
    p.inventory,
    p.weapon.id,
    atTrader(p),
  ]);
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.replaceChildren();
  root.append(
    node('h3', `Handel & tillverkning · ${p.credits} brukskronor`),
    node(
      'p',
      'Köp och sälj hos Maja eller Torsten. Bärgningslådor och besegrade fiender ger valuta. Priser gäller per styck.',
    ),
  );
  for (const [category, catalog] of Object.entries({
    material: MATERIALS,
    attachment: ATTACHMENTS,
    supply: SUPPLY_RECIPES,
    weapon: WEAPONS,
  })) {
    const section = node('details', ''),
      summary = node(
        'summary',
        {
          material: 'Råmaterial',
          attachment: 'Vapendelar',
          supply: 'Förbrukningsvaror',
          weapon: 'Vapen',
        }[category],
      );
    section.append(summary);
    for (const [key, a] of Object.entries(catalog)) {
      const row = node('div', '');
      row.className = 'equipment-row';
      const price = a.price || 220,
        recipe = a.recipe || a.materials;
      row.append(
        node(
          'p',
          `${a.name} · ${price} kr${a.description ? ' · ' + a.description : ''}${recipe ? ' · Recept: ' + recipeText(recipe) : ''}`,
        ),
        button('KÖP', p.credits < price || !atTrader(p), () =>
          action({ type: 'buy', category, key }),
        ),
      );
      if (recipe)
        row.append(
          button('TILLVERKA', !hasMaterials(p, recipe) || !atTrader(p), () =>
            action({ type: 'fabricate', category, key }),
          ),
        );
      if (['material', 'attachment'].includes(category))
        row.append(
          button(
            `SÄLJ · ${Math.max(1, Math.floor(price * 0.35))} kr`,
            !(category === 'material' ? p.materials[key] : p.attachments[key]) || !atTrader(p),
            () => action({ type: 'sell', category, key }),
          ),
        );
      section.append(row);
    }
    root.append(section);
  }
  for (const item of p.inventory.filter((i) => i.id !== p.weapon.id))
    root.append(
      button(
        `SÄLJ ${item.name} · ${77 * (item.rarity + 1)} kr`,
        !atTrader(p) || Object.keys(item.mods || {}).length > 0,
        () => action({ type: 'sell', category: 'weapon', key: item.kind, id: item.id }),
      ),
    );
}
