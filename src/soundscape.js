import { MAP, segmentDistance } from '../shared/map.js';
import { forestAt } from '../shared/forest.js';
import { environmentAt } from '../shared/environment.js';
import { buildingLocal } from '../shared/buildings.js';

// Original procedural sound textures, not recordings or assets from another game.
export function ambientWave(kind, rate = 22050, seconds = 12) {
  const data = new Float32Array(Math.floor(rate * seconds));
  let seed = kind === 'water' ? 191 : kind === 'needles' ? 887 : 331,
    low = 0,
    previous = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate,
      n = ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    low += (n - low) * (kind === 'needles' ? 0.13 : kind === 'water' ? 0.065 : 0.012);
    const gust =
      0.65 +
      0.22 * Math.sin((t / seconds) * Math.PI * 2) +
      0.13 * Math.sin((t / seconds) * Math.PI * 6);
    const edge = Math.min(1, t / 0.08, (seconds - t) / 0.08);
    data[i] =
      (kind === 'needles'
        ? (n - previous) * 0.018 + low * 0.09
        : kind === 'water'
          ? low * 0.28 + n * 0.018
          : low * 0.48) *
      gust *
      Math.max(0, edge);
    previous = n;
  }
  return data;
}

export class NordicSoundscape {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.layers = {};
    this.nextBird = 0;
    for (const kind of ['wind', 'needles', 'water']) {
      const data = ambientWave(kind, context.sampleRate),
        buffer = context.createBuffer(1, data.length, context.sampleRate);
      buffer.copyToChannel(data, 0);
      const source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(output);
      source.start();
      this.layers[kind] = gain;
    }
    this.hum = context.createOscillator();
    this.hum.type = 'sine';
    this.hum.frequency.value = 49;
    this.humGain = context.createGain();
    this.humGain.gain.value = 0;
    this.hum.connect(this.humGain);
    this.humGain.connect(output);
    this.hum.start();
    this.factories = MAP.places.filter((p) => p.industry === 'steel' || p.industry === 'linde');
  }
  update(p, clock, { active, paused, voicePlaying }) {
    const c = this.context,
      t = c.currentTime;
    if (t < (this.nextUpdate || 0)) return;
    this.nextUpdate = t + 0.25;
    const mood = environmentAt(clock),
      audible = active && !paused ? 1 : 0,
      wood = Boolean(forestAt(p.x, p.z));
    const river = Math.min(...MAP.rivers.map((r) => segmentDistance(p.x, p.z, ...r.points))),
      water = Math.max(0, 1 - river / 95);
    let industry = 0;
    for (const f of this.factories) {
      const q = buildingLocal(f, p.x, p.z),
        distance = Math.hypot(
          Math.max(0, Math.abs(q.x) - f.w / 2),
          Math.max(0, Math.abs(q.z) - f.d / 2),
        );
      industry = Math.max(industry, Math.max(0, 1 - distance / 140));
    }
    const gain = (node, value) => node.gain.setTargetAtTime(value * audible, t, 1.1);
    gain(this.layers.wind, 0.5 + mood.gust * 0.6);
    gain(this.layers.needles, wood ? 0.6 + mood.gust * 0.7 : 0.09);
    gain(this.layers.water, water * 0.85);
    gain(this.humGain, industry * 0.026);
    if (audible && wood && mood.day > 0.35 && !voicePlaying && t > this.nextBird) {
      this.nextBird = t + 13 + (Math.sin(clock * 0.71) + 1) * 9;
      this.bird(Math.sin(clock * 0.37) * 0.85, clock);
    }
  }
  bird(pan, seed) {
    const c = this.context,
      base = c.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator(),
        gain = c.createGain(),
        panner = c.createStereoPanner(),
        t = base + i * 0.23,
        duration = 0.13 + i * 0.018;
      osc.type = 'sine';
      const f = 2100 + Math.sin(seed + i * 2.4) * 570;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.055);
      osc.frequency.exponentialRampToValueAtTime(f * 0.82, t + duration);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.018, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      panner.pan.value = pan;
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);
      osc.start(t);
      osc.stop(t + duration + 0.03);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        panner.disconnect();
      };
    }
  }
}
