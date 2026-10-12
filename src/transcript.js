// Audio-derived word boundaries, shared by the quest and NPC dialogue readers.
export function transcriptSegments(text, cues) {
  const segments = [];
  let cursor = 0;
  for (const cue of cues || []) {
    const at = text.toLocaleLowerCase().indexOf(cue.text.toLocaleLowerCase(), cursor);
    if (at < 0) continue;
    if (at > cursor) segments.push({ text: text.slice(cursor, at) });
    segments.push({ text: text.slice(at, at + cue.text.length), start: cue.start, end: cue.end });
    cursor = at + cue.text.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
export class VoiceTranscript {
  constructor(roots) {
    this.roots = roots;
    this.words = [];
  }
  begin(line, profile, cues) {
    this.line = line;
    this.profile = profile;
    this.words = [];
    this.current = -1;
    for (const root of this.roots) {
      root.replaceChildren();
      const heading = document.createElement('strong');
      heading.textContent = `${profile.name} · uppläsning`;
      const text = document.createElement('p');
      text.className = 'transcript-text';
      for (const segment of transcriptSegments(line.text, cues)) {
        const span = document.createElement('span');
        span.textContent = segment.text;
        if (segment.start !== undefined) {
          span.dataset.start = segment.start;
          span.dataset.end = segment.end;
          this.words.push(span);
        }
        text.append(span);
      }
      root.append(heading, text);
      root.dataset.state = 'playing';
      root.hidden = false;
    }
  }
  update(seconds) {
    for (const span of this.words) {
      const active =
        seconds >= Number(span.dataset.start) && seconds < Number(span.dataset.end) + 0.08;
      if (span.classList.contains('reading') !== active) {
        span.classList.toggle('reading', active);
        if (
          active &&
          span.closest('dialog[open]') &&
          span.getBoundingClientRect().top > innerHeight * 0.78
        )
          span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      span.classList.toggle('read', seconds >= Number(span.dataset.end));
    }
  }
  finish() {
    for (const span of this.words) span.classList.remove('reading');
    for (const root of this.roots) {
      root.dataset.state = 'stopped';
      if (root.firstChild && this.line)
        root.firstChild.textContent = `Transkript · ${this.profile.name}`;
    }
    this.words = [];
  }
}
