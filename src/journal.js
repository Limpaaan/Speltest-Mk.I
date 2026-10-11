import { CONTRACTS, PROLOGUE, EPILOGUE, campaignTarget } from '../shared/story.js';
import { campaignStatus } from '../shared/progression.js';
const el = (tag, text) => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
export function renderJournal(root, p) {
  const status = campaignStatus(p),
    step = p.campaign.step;
  const signature = JSON.stringify([step, p.campaign.active, status.ready, p.campaign.visited]);
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.replaceChildren(el('p', PROLOGUE));
  root.append(
    el(
      'p',
      'Kopparhjärta · åtta kapitel. Guldmarkeringen på kartan visar ditt aktuella mål. E används vid apparater. Återvänd till Maja mellan kapitlen.',
    ),
  );
  for (let i = 0; i <= Math.min(step, CONTRACTS.length - 1); i++) {
    const q = CONTRACTS[i],
      done = i < step;
    const section = document.createElement('details');
    section.open = i === Math.min(step, CONTRACTS.length - 1);
    section.className = 'story-chapter';
    section.append(
      el('summary', `${done ? '✓' : '◆'} ${i + 1}. ${q.title}`),
      el('small', q.act),
      el('p', q.text),
    );
    if (done || status.ready) section.append(el('h4', 'Fynd i fält'), el('p', q.discovery));
    if (done) section.append(el('h4', 'Tillbaka vid skiftboden'), el('p', q.debrief));
    else
      section.append(
        el(
          'p',
          p.campaign.active
            ? 'Uppdraget pågår. Nästa steg visas i spelvyn.'
            : 'Prata med Maja för att börja detta kapitel.',
        ),
      );
    root.append(section);
  }
  if (status.complete) root.append(el('h3', 'Avesta står kvar'), el('p', EPILOGUE));
}
export function objectiveText(p) {
  const target = campaignTarget(p);
  if (!target) return '';
  return ` · ${target.name} ${Math.round(Math.hypot(target.x - p.x, target.z - p.z))} m · J journal`;
}
