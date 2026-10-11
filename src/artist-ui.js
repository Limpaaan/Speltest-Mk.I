import { PAINTS, MOTIFS, PAINT_PRICE, PROPERTY, atArtist } from '../shared/artist.js';
const node = (tag, text) => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
const button = (text, disabled, click) => {
  const b = node('button', text);
  b.className = 'small-button';
  b.disabled = disabled;
  b.onclick = click;
  return b;
};
export function artistPanel(root, p, action) {
  const signature = JSON.stringify([p.credits, p.paint, atArtist(p)]);
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.replaceChildren();
  root.append(node('h3', `Sprayfärg · ${p.credits} brukskronor`));
  for (const [color, item] of Object.entries(PAINTS))
    root.append(
      button(
        `${item.name} · ${PAINT_PRICE} kr · äger ${p.paint[color]}`,
        p.credits < PAINT_PRICE || p.paint[color] >= 10 || !atArtist(p),
        () => action({ type: 'buy_paint', color }),
      ),
    );
  root.append(
    node(
      'p',
      'Välj färg och motiv i packningen (I). B sprayar en glass eller döskalle på marken framför dig. En burk förbrukas per motiv.',
    ),
  );
  const link = node('a', `Öppna Booli · ${PROPERTY.address}`);
  link.href = PROPERTY.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  root.append(
    node('h3', 'Bostadskoll'),
    node(
      'p',
      'Aktuellt uppskattat värde har inte verifierats. Öppna Booli för att kontrollera rätt bostad, värde och datum.',
    ),
    link,
  );
}
export function paintPanel(root, p, action) {
  root.append(
    node('h3', 'Sprayburkar från Anders Delbom'),
    node(
      'p',
      'B · Spraya valt motiv på fri mark. Anders tillfälliga ateljé är markerad på den stora kartan (M).',
    ),
  );
  for (const [color, item] of Object.entries(PAINTS))
    root.append(
      button(
        `${p.paintColor === color ? '✓ ' : ''}${item.name} ×${p.paint[color]}`,
        !p.paint[color],
        () => action({ type: 'select_paint', color }),
      ),
    );
  for (const [motif, name] of Object.entries(MOTIFS))
    root.append(
      button(`${p.paintMotif === motif ? '✓ ' : ''}${name}`, false, () =>
        action({ type: 'select_paint', motif }),
      ),
    );
}
